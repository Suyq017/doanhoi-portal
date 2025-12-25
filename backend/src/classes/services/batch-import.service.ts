import { Injectable, Logger, BadRequestException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository, DataSource } from "typeorm";
import { Class } from "../../entities/class.entity";
import { Department } from "../../entities/department.entity";
import { ClassDataDto } from "../dto/batch-import-classes.dto";

export interface BatchInfo {
  batchNumber: number;
  totalBatches: number;
  sessionId: string;
}

export interface ImportOptions {
  skipDuplicates?: boolean;
  validateDepartments?: boolean;
}

export interface BatchResult {
  processed: number;
  successful: number;
  failed: number;
  errors: string[];
}

export interface SessionData {
  sessionId: string;
  totalProcessed: number;
  totalSuccessful: number;
  totalFailed: number;
  errors: string[];
  startTime: Date;
  lastUpdateTime: Date;
  isComplete: boolean;
}

export interface BatchImportResult {
  success: boolean;
  batchResult: BatchResult;
  sessionSummary: SessionData;
}

/**
 * Service for handling batch import of classes with client-side processing
 */
@Injectable()
export class ClassBatchImportService {
  private readonly logger = new Logger(ClassBatchImportService.name);
  private readonly sessionCache = new Map<string, SessionData>();
  private readonly SESSION_EXPIRY_MS = 24 * 60 * 60 * 1000; // 24 hours

  constructor(
    @InjectRepository(Class)
    private classesRepository: Repository<Class>,
    @InjectRepository(Department)
    private departmentsRepository: Repository<Department>,
    private dataSource: DataSource,
  ) {
    // Start cleanup job for expired sessions
    this.startSessionCleanup();
  }

  /**
   * Process a batch of classes
   */
  async processBatch(
    classes: ClassDataDto[],
    batchInfo: BatchInfo,
    options: ImportOptions,
  ): Promise<BatchImportResult> {
    this.logger.log(
      `Processing batch ${batchInfo.batchNumber}/${batchInfo.totalBatches} ` +
        `for session ${batchInfo.sessionId} (${classes.length} classes)`,
    );

    try {
      let successful = 0;
      let failed = 0;
      const errors: string[] = [];

      // Process each class in the batch
      for (const classData of classes) {
        try {
          await this.processClass(classData, options);
          successful++;
        } catch (error) {
          failed++;
          const errorMessage =
            error instanceof Error ? error.message : "Unknown error";
          errors.push(`${classData.name}: ${errorMessage}`);
          this.logger.warn(
            `Failed to import class '${classData.name}': ${errorMessage}`,
          );
        }
      }

      // Update session progress
      this.updateSessionProgress(batchInfo.sessionId, {
        processed: classes.length,
        successful,
        failed,
        errors,
      });

      // Mark session as complete if this is the last batch
      if (batchInfo.batchNumber === batchInfo.totalBatches) {
        this.markSessionComplete(batchInfo.sessionId);
      }

      const sessionSummary = this.getSessionSummary(batchInfo.sessionId);

      this.logger.log(
        `Batch ${batchInfo.batchNumber}/${batchInfo.totalBatches} completed: ` +
          `${successful} successful, ${failed} failed`,
      );

      return {
        success: failed === 0,
        batchResult: {
          processed: classes.length,
          successful,
          failed,
          errors,
        },
        sessionSummary,
      };
    } catch (error) {
      this.logger.error(
        `Error processing batch: ${error.message}`,
        error.stack,
      );
      throw new BadRequestException(`Lỗi xử lý batch: ${error.message}`);
    }
  }

  /**
   * Process a single class
   */
  private async processClass(
    classData: ClassDataDto,
    options: ImportOptions,
  ): Promise<void> {
    // Check if class with same name exists
    const existingClass = await this.classesRepository.findOne({
      where: { name: classData.name },
    });

    if (existingClass) {
      if (options.skipDuplicates) {
        throw new Error("Lớp đã tồn tại (bỏ qua)");
      } else {
        throw new Error("Lớp đã tồn tại trong hệ thống");
      }
    }

    // Find department by code if provided
    let departmentId: string | undefined;
    if (classData.departmentCode) {
      if (options.validateDepartments) {
        const department = await this.departmentsRepository.findOne({
          where: { code: classData.departmentCode },
        });

        if (!department) {
          throw new Error(
            `Không tìm thấy khoa với mã: ${classData.departmentCode}`,
          );
        }

        departmentId = department.id;
      }
    }

    // Create class entity
    const newClass = this.classesRepository.create({
      name: classData.name,
      year: classData.year,
      departmentId,
      isActive: true, // Default to active
    });

    // Save to database
    await this.classesRepository.save(newClass);

    this.logger.debug(`Successfully imported class: ${classData.name}`);
  }

  /**
   * Update session progress with batch results
   */
  private updateSessionProgress(
    sessionId: string,
    batchResult: BatchResult,
  ): void {
    let sessionData = this.sessionCache.get(sessionId);

    if (!sessionData) {
      // Initialize new session
      sessionData = {
        sessionId,
        totalProcessed: 0,
        totalSuccessful: 0,
        totalFailed: 0,
        errors: [],
        startTime: new Date(),
        lastUpdateTime: new Date(),
        isComplete: false,
      };
    }

    // Accumulate results
    sessionData.totalProcessed += batchResult.processed;
    sessionData.totalSuccessful += batchResult.successful;
    sessionData.totalFailed += batchResult.failed;
    sessionData.errors.push(...batchResult.errors);
    sessionData.lastUpdateTime = new Date();

    this.sessionCache.set(sessionId, sessionData);
  }

  /**
   * Mark session as complete
   */
  private markSessionComplete(sessionId: string): void {
    const sessionData = this.sessionCache.get(sessionId);
    if (sessionData) {
      sessionData.isComplete = true;
      sessionData.lastUpdateTime = new Date();
      this.sessionCache.set(sessionId, sessionData);

      this.logger.log(
        `Session ${sessionId} completed: ` +
          `${sessionData.totalSuccessful} successful, ` +
          `${sessionData.totalFailed} failed`,
      );
    }
  }

  /**
   * Get session summary
   */
  getSessionSummary(sessionId: string): SessionData {
    const sessionData = this.sessionCache.get(sessionId);

    if (!sessionData) {
      // Return empty session data if not found
      return {
        sessionId,
        totalProcessed: 0,
        totalSuccessful: 0,
        totalFailed: 0,
        errors: [],
        startTime: new Date(),
        lastUpdateTime: new Date(),
        isComplete: false,
      };
    }

    return { ...sessionData };
  }

  /**
   * Clean up expired sessions
   */
  private startSessionCleanup(): void {
    // Run cleanup every hour
    setInterval(
      () => {
        this.cleanupExpiredSessions();
      },
      60 * 60 * 1000,
    );
  }

  /**
   * Remove expired sessions from cache
   */
  private cleanupExpiredSessions(): void {
    const now = new Date();
    let cleanedCount = 0;

    for (const [sessionId, sessionData] of this.sessionCache.entries()) {
      const age = now.getTime() - sessionData.lastUpdateTime.getTime();

      if (age > this.SESSION_EXPIRY_MS) {
        this.sessionCache.delete(sessionId);
        cleanedCount++;
      }
    }

    if (cleanedCount > 0) {
      this.logger.log(`Cleaned up ${cleanedCount} expired sessions`);
    }
  }

  /**
   * Get active sessions count (for monitoring)
   */
  getActiveSessionsCount(): number {
    return this.sessionCache.size;
  }

  /**
   * Clear all sessions (for testing/debugging)
   */
  clearAllSessions(): void {
    this.sessionCache.clear();
    this.logger.log("Cleared all import sessions");
  }
}
