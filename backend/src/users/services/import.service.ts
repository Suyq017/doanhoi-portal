import {
  Injectable,
  BadRequestException,
  NotFoundException,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository, DataSource } from "typeorm";
// Native bcrypt (C++): băm chạy trên thread pool, không chặn event loop khi import hàng loạt
import * as bcrypt from "bcrypt";
import * as XLSX from "xlsx";
import {
  User,
  UserType,
  MembershipStatus,
  AuthProvider,
} from "../../entities/user.entity";
import { Class } from "../../entities/class.entity";
import { Department } from "../../entities/department.entity";
import {
  Organization,
  OrganizationType,
} from "../../entities/organization.entity";
import {
  UserOrganization,
  UserOrgRole,
} from "../../entities/user-organization.entity";
import { ExcelParserService } from "./excel-parser.service";
import {
  ImportValidationService,
  ResolvedUserData,
  ValidationError,
} from "./import-validation.service";
import {
  ImportSessionService,
  ImportSession,
  ImportResult,
} from "./import-session.service";
import {
  UserBatchProcessingService,
  BatchData,
  BatchProcessingOptions,
} from "./batch-processing.service";
import { UserTransactionService } from "./transaction.service";
import { UserImportMonitoringService } from "./monitoring.service";
import { UserBackgroundJobService } from "./background-job.service";
import {
  getBatchProcessingConfig,
  shouldUseBatchProcessing,
} from "./batch-processing.config";

export interface ImportUploadResponse {
  sessionId: string;
  fileName: string;
  totalRows: number;
  message: string;
}

export interface ImportValidationResponse {
  sessionId: string;
  isValid: boolean;
  summary: {
    total: number;
    valid: number;
    invalid: number;
    duplicates: number;
    conflicts: number;
  };
  errors: ValidationError[];
  warnings: ValidationError[];
  validationResults: any[];
  canProceed: boolean;
}

export interface ImportExecuteResponse {
  sessionId: string;
  success: boolean;
  message: string;
  importedCount: number;
  skippedCount: number;
  failedCount: number;
  errors: string[];
  usersWithDefaultPassword?: string[]; // List of emails that received default password
  defaultPassword?: string; // The default password used
}

@Injectable()
export class ImportService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(Class)
    private readonly classRepository: Repository<Class>,
    @InjectRepository(Department)
    private readonly departmentRepository: Repository<Department>,
    @InjectRepository(Organization)
    private readonly organizationRepository: Repository<Organization>,
    @InjectRepository(UserOrganization)
    private readonly userOrganizationRepository: Repository<UserOrganization>,
    private readonly excelParserService: ExcelParserService,
    private readonly validationService: ImportValidationService,
    private readonly sessionService: ImportSessionService,
    private readonly batchProcessingService: UserBatchProcessingService,
    private readonly transactionService: UserTransactionService,
    private readonly monitoringService: UserImportMonitoringService,
    private readonly backgroundJobService: UserBackgroundJobService,
    private readonly dataSource: DataSource,
  ) { }

  async uploadFile(file: Express.Multer.File): Promise<ImportUploadResponse> {
    if (!file) {
      throw new BadRequestException("No file uploaded");
    }

    // Validate file type
    const allowedTypes = [
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "application/vnd.ms-excel",
    ];

    if (!allowedTypes.includes(file.mimetype)) {
      throw new BadRequestException(
        "Invalid file type. Please upload an Excel file (.xlsx or .xls)",
      );
    }

    // Validate file size (5MB limit)
    const maxSize = 5 * 1024 * 1024;
    if (file.size > maxSize) {
      throw new BadRequestException("File size too large. Maximum size is 5MB");
    }

    try {
      // Parse Excel file
      const parsedData = await this.excelParserService.parseExcelFile(
        file.buffer,
      );

      if (parsedData.length === 0) {
        throw new BadRequestException("No valid data found in the Excel file");
      }

      // Create import session (without validation)
      const session = this.sessionService.createSession(
        file.originalname,
        parsedData,
      );

      return {
        sessionId: session.id,
        fileName: file.originalname,
        totalRows: parsedData.length,
        message: `File uploaded successfully. Found ${parsedData.length} rows to import.`,
      };
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new BadRequestException(
        `Failed to parse Excel file: ${error.message}`,
      );
    }
  }

  async validateData(sessionId: string): Promise<ImportValidationResponse> {
    const session = this.sessionService.getSession(sessionId);

    if (!session) {
      throw new NotFoundException("Import session not found");
    }

    if (!session.data) {
      throw new BadRequestException("No data found in session");
    }

    try {
      // Validate data
      const validationResults = await this.validationService.validateImportData(
        session.data,
      );

      // Update session with validation result
      this.sessionService.updateSessionValidation(sessionId, validationResults);

      // Extract all errors and warnings for UI
      const allErrors: ValidationError[] = [];
      const allWarnings: ValidationError[] = [];

      validationResults.forEach((result) => {
        if (result._errors) allErrors.push(...result._errors);
        if (result._warnings) allWarnings.push(...result._warnings);
      });

      return {
        sessionId,
        isValid: validationResults.some((r) => r.validation.isValid),
        summary: {
          total: session.metadata.totalRows,
          valid: validationResults.filter((r) => r.validation.isValid).length,
          invalid: validationResults.filter((r) => !r.validation.isValid)
            .length,
          duplicates: 0, // Not tracked separately, included in invalid count
          conflicts: 0, // Not tracked separately, included in warnings
        },
        errors: allErrors,
        warnings: allWarnings,
        validationResults: validationResults,
        canProceed: validationResults.some((r) => r.validation.isValid),
      };
    } catch (error) {
      throw new BadRequestException(`Validation failed: ${error.message}`);
    }
  }

  async executeImport(
    sessionId: string,
    options?: { skipConflicts?: boolean; batchSize?: number },
  ): Promise<ImportExecuteResponse> {
    const session = this.sessionService.getSession(sessionId);

    if (!session) {
      throw new NotFoundException("Import session not found");
    }

    if (session.status !== "validated") {
      throw new BadRequestException(
        "Session data must be validated before import",
      );
    }

    const validData = this.sessionService.getValidatedData(sessionId);
    if (validData.length === 0) {
      throw new BadRequestException("No valid data found to import");
    }

    try {
      // Initialize batch processing
      const batchSize =
        options?.batchSize ||
        this.batchProcessingService.getOptimizedBatchSize(validData.length);
      const batchProcessingOptions: BatchProcessingOptions =
        this.batchProcessingService.mergeOptions({
          batchSize,
          enableFallback: true,
        });

      // Initialize batch processing in session
      this.sessionService.initializeBatchProcessing(
        sessionId,
        validData.length,
        batchSize,
      );

      // Start monitoring
      this.monitoringService.startSession(sessionId, validData.length);

      // Execute batch import
      const importResult = await this.performBatchImport(
        sessionId,
        validData,
        batchProcessingOptions,
        options,
      );

      // End monitoring
      this.monitoringService.endSession(sessionId);

      // Finalize batch processing
      this.sessionService.finalizeBatchProcessing(
        sessionId,
        importResult.success,
      );

      return {
        sessionId,
        success: importResult.success,
        message: importResult.success
          ? `Import completed successfully. ${importResult.importedCount} users imported.`
          : `Import failed: ${importResult.errors.join(", ")}`,
        importedCount: importResult.importedCount,
        skippedCount: importResult.skippedCount,
        failedCount: importResult.failedCount,
        errors: importResult.errors,
      };
    } catch (error) {
      // Finalize batch processing on error
      this.sessionService.finalizeBatchProcessing(sessionId, false);

      const failureResult: ImportResult = {
        success: false,
        importedCount: 0,
        skippedCount: 0,
        failedCount: validData.length,
        errors: [error.message],
        importedIds: [],
      };

      this.sessionService.updateImportResult(sessionId, failureResult);

      throw new BadRequestException(`Import failed: ${error.message}`);
    }
  }

  async executeImportAsync(
    sessionId: string,
    options?: { skipConflicts?: boolean; batchSize?: number },
  ): Promise<{ jobId: string; message: string }> {
    const session = this.sessionService.getSession(sessionId);

    if (!session) {
      throw new NotFoundException("Import session not found");
    }

    if (session.status !== "validated") {
      throw new BadRequestException(
        "Session data must be validated before import",
      );
    }

    const validData = this.sessionService.getValidatedData(sessionId);
    if (validData.length === 0) {
      throw new BadRequestException("No valid data found to import");
    }

    // Check if should use background processing
    const _config = getBatchProcessingConfig();
    const useBackground =
      shouldUseBatchProcessing(validData.length) || validData.length > 1000;

    if (useBackground) {
      // Create background job for large imports
      const jobId = this.backgroundJobService.createJob(
        sessionId,
        "import",
        {
          sessionId,
          validData: validData.slice(0, 100), // Only pass metadata, not full data
          options,
          totalRows: validData.length,
        },
        1, // High priority
      );

      return {
        jobId,
        message: `Large import queued for background processing. Job ID: ${jobId}`,
      };
    } else {
      // Execute synchronously for small imports
      const result = await this.executeImport(sessionId, options);
      return {
        jobId: "",
        message: result.message,
      };
    }
  }

  async getBackgroundJobStatus(jobId: string): Promise<any> {
    const job = this.backgroundJobService.getJob(jobId);
    if (!job) {
      throw new NotFoundException("Background job not found");
    }

    return {
      jobId: job.id,
      sessionId: job.sessionId,
      status: job.status,
      progress: job.progress,
      result: job.result,
      error: job.error,
      createdAt: job.createdAt,
      startedAt: job.startedAt,
      completedAt: job.completedAt,
    };
  }

  async cancelBackgroundJob(
    jobId: string,
  ): Promise<{ success: boolean; message: string }> {
    const success = this.backgroundJobService.cancelJob(jobId);
    return {
      success,
      message: success
        ? "Background job cancelled successfully"
        : "Failed to cancel background job",
    };
  }

  async getQueueStatus(): Promise<any> {
    return this.backgroundJobService.getQueueStatus();
  }

  private async importSingleUser(
    queryRunner: any,
    userData: ResolvedUserData,
  ): Promise<User> {
    // Create user entity
    const user = new User();
    user.familyName = userData.familyName;
    user.givenName = userData.givenName;
    user.email = userData.email || null; // Handle null email from "*" values
    user.code = userData.code;
    user.phone = userData.phone || "";

    // Handle password
    if (userData.password && userData.password.trim()) {
      // Use provided password
      const userPassword = userData.password.trim();
      user.password = await bcrypt.hash(userPassword, 10);
    } else if (userData.email) {
      // No password provided but has email - generate from email
      const userPassword = this.generatePasswordFromEmail(userData.email);
      user.password = await bcrypt.hash(userPassword, 10);
    } else {
      // No password and no email - leave password empty (null)
      user.password = null;
    }

    // Set user type - Enhanced: use SINH_VIEN instead of STUDENT
    user.userType = (userData.userType as UserType) || UserType.STUDENT;

    // Set membership status
    user.membershipStatus =
      (userData.membershipStatus as MembershipStatus) || MembershipStatus.NONE;

    // Set authentication fields
    user.authProvider = AuthProvider.LOCAL;
    user.isActive = true;

    // Set class reference
    if (userData.classId) {
      const classEntity = await queryRunner.manager.findOne(Class, {
        where: { id: userData.classId },
      });
      if (classEntity) {
        user.class = classEntity;
      }
    }

    // Set management department reference
    if (userData.managementDepartmentId) {
      const managementDept = await queryRunner.manager.findOne(Department, {
        where: { id: userData.managementDepartmentId },
      });
      if (managementDept) {
        user.managementDepartment = managementDept;
      }
    }

    // Set training department reference
    if (userData.trainingDepartmentId) {
      const trainingDept = await queryRunner.manager.findOne(Department, {
        where: { id: userData.trainingDepartmentId },
      });
      if (trainingDept) {
        user.trainingDepartment = trainingDept;
      }
    }

    // Save user
    const savedUser = await queryRunner.manager.save(User, user);

    // Enhanced: Handle class organization creation and assignment
    if (userData.className) {
      await this.handleClassOrganizationWithTransaction(
        queryRunner,
        userData.className,
        userData.managementDepartmentCode,
        savedUser.id,
      );
    }

    // Handle other organization assignments
    if (userData.organizationIds && userData.organizationIds.length > 0) {
      for (const orgId of userData.organizationIds) {
        const organization = await queryRunner.manager.findOne(Organization, {
          where: { id: orgId },
        });

        if (organization) {
          const userOrg = new UserOrganization();
          userOrg.user = savedUser;
          userOrg.organization = organization;
          userOrg.joinedAt = new Date();

          await queryRunner.manager.save(UserOrganization, userOrg);
        }
      }
    }

    return savedUser;
  }

  private generatePasswordFromEmail(email: string | null): string {
    // Generate password from email: take username part before @
    // Example: "nguyen.van.a@example.com" → "nguyenvana"
    // Example: "test@example.com" → "test"
    const username = email.split("@")[0];

    const password = username.replace(/\./g, "");

    return password;
  }

  async getSessionStatus(sessionId: string): Promise<ImportSession> {
    const session = this.sessionService.getSession(sessionId);

    if (!session) {
      throw new NotFoundException("Import session not found");
    }

    return session;
  }

  async generateTemplate(): Promise<Buffer> {
    // Enhanced template with 18 columns
    const headers = [
      "Mã số sinh viên", // A - required
      "Email", // B - optional
      "CMND", // C
      "Họ", // D - required
      "Tên", // E - required
      "Ngày sinh", // F (DD/MM/YYYY)
      "Giới tính", // G (NAM/NU)
      "Mật khẩu", // H
      "Điện thoại", // I - optional
      "Năm vào", // J
      "Năm CTDT", // K
      "Tên lớp", // L
      "Mã Khoa", // M
      "Mã đơn vị quản lý", // N
      "Mã ngành",
      "Hệ đào tạo", // O (VLVH/CQ/QT/DTTX)
      "Bậc đào tạo", // P (DH)
      "Loại người dùng", // Q (SINH_VIEN/CAN_BO)
      "Tình trạng thành viên", // R (ACTIVE/INACTIVE/GRADUATED)
    ];

    const sampleData = [
      [
        "2200000", // Mã số sinh viên
        "a.nguyen@hcmut.edu.vn", // Email
        "123456789", // CMND
        "Nguyễn", // Họ
        "Văn A", // Tên
        "01/01/2004", // Ngày sinh
        "NAM", // Giới tính
        "password123", // Mật khẩu
        "0901234567", // Điện thoại
        "20222", // Năm vào
        "2022", // Năm CTDT
        "MT22KH02", // Tên lớp
        "MT - Khoa Khoa học và Kỹ thuật Máy tính", // Mã Khoa
        "MT - Khoa Khoa học và Kỹ thuật Máy tính", // Mã đơn vị quản lý
        "CN_KHM - Khoa học Máy tính",
        "CQ - Chính quy", // Hệ đào tạo
        "DH - Đại học", // Bậc đào tạo
        "Sinh viên", // Loại người dùng
        "ACTIVE", // Tình trạng thành viên
      ],
    ];

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet([headers, ...sampleData]);

    // Set column widths
    ws["!cols"] = [
      { width: 15 },
      { width: 25 },
      { width: 12 },
      { width: 15 },
      { width: 15 },
      { width: 12 },
      { width: 10 },
      { width: 12 },
      { width: 15 },
      { width: 10 },
      { width: 10 },
      { width: 15 },
      { width: 10 },
      { width: 15 },
      { width: 10 },
      { width: 10 },
      { width: 15 },
      { width: 20 },
    ];

    XLSX.utils.book_append_sheet(wb, ws, "Users");
    return XLSX.write(wb, { type: "buffer", bookType: "xlsx" });
  }

  async getSystemHealth(): Promise<any> {
    return this.monitoringService.getSystemHealth();
  }

  // Cleanup old sessions periodically
  cleanupSessions(): void {
    this.sessionService.cleanupExpiredSessions();
  }

  private async performBatchImport(
    sessionId: string,
    validatedData: any[],
    batchProcessingOptions: BatchProcessingOptions,
    options?: { skipConflicts?: boolean },
  ): Promise<ImportResult> {
    const importResult: ImportResult = {
      success: true,
      importedCount: 0,
      skippedCount: 0,
      failedCount: 0,
      errors: [],
      importedIds: [],
    };

    // Divide data into batches
    const batches = this.batchProcessingService.divideToBatches(
      validatedData,
      batchProcessingOptions.batchSize,
    );

    console.log(
      `Starting user batch import: ${batches.length} batches, ${validatedData.length} total rows`,
    );

    for (const batch of batches) {
      // Check if import is paused
      if (this.sessionService.getBatchProgress(sessionId)?.isPaused) {
        console.log(`Import paused at batch ${batch.batchNumber}`);
        break;
      }

      // Update batch status to processing
      this.sessionService.updateBatchProgress(sessionId, batch.batchNumber, {
        status: "processing",
        startTime: new Date(),
      });

      try {
        // Process batch with transaction and fallback
        const batchStartTime = Date.now();
        const batchResult = await this.processBatchWithTransaction(
          batch,
          options,
        );
        const batchTime = Date.now() - batchStartTime;

        // Update monitoring
        this.monitoringService.updateBatchStats(
          sessionId,
          batch.batchNumber,
          batchTime,
          true,
        );
        this.monitoringService.updateProgress(
          sessionId,
          importResult.importedCount +
          importResult.failedCount +
          batchResult.importedCount +
          batchResult.failedCount,
          importResult.importedCount + batchResult.importedCount,
          importResult.failedCount + batchResult.failedCount,
        );

        // Update batch progress
        this.sessionService.updateBatchProgress(sessionId, batch.batchNumber, {
          status: "success",
          processedRows: batch.data.length,
          successfulRows: batchResult.importedCount,
          failedRows: batchResult.failedCount,
          errors: batchResult.errors,
          endTime: new Date(),
        });

        // Aggregate results
        importResult.importedCount += batchResult.importedCount;
        importResult.skippedCount += batchResult.skippedCount;
        importResult.failedCount += batchResult.failedCount;
        importResult.errors.push(...batchResult.errors);
        importResult.importedIds.push(...batchResult.importedIds);
      } catch (error) {
        console.error(`Batch ${batch.batchNumber} processing failed:`, error);

        // Update monitoring
        this.monitoringService.updateBatchStats(
          sessionId,
          batch.batchNumber,
          0,
          false,
        );

        // Update batch progress with error
        this.sessionService.updateBatchProgress(sessionId, batch.batchNumber, {
          status: "failed",
          processedRows: batch.data.length,
          failedRows: batch.data.length,
          errors: [error.message],
          endTime: new Date(),
        });

        // Handle batch failure
        importResult.failedCount += batch.data.length;
        importResult.errors.push(
          `Batch ${batch.batchNumber}: ${error.message}`,
        );

        // If not skipping conflicts, stop processing
        if (!options?.skipConflicts) {
          importResult.success = false;
          break;
        }
      }
    }

    console.log(
      `User batch import completed: ${importResult.importedCount} imported, ${importResult.failedCount} failed, ${importResult.skippedCount} skipped`,
    );
    return importResult;
  }

  private async processBatchWithTransaction(
    batch: BatchData<any>,
    options?: { skipConflicts?: boolean },
  ): Promise<ImportResult> {
    const transactionResult =
      await this.transactionService.executeWithTransaction(
        async (queryRunner) => {
          const batchResult: ImportResult = {
            success: true,
            importedCount: 0,
            skippedCount: 0,
            failedCount: 0,
            errors: [],
            importedIds: [],
          };

          for (const validationResult of batch.data) {
            const userData = validationResult.data;

            try {
              const importedUser = await this.importSingleUser(
                queryRunner,
                userData,
              );
              batchResult.importedCount++;
              batchResult.importedIds.push(importedUser.id);
            } catch (error) {
              batchResult.failedCount++;
              batchResult.errors.push(
                `Row ${validationResult.rowIndex}: ${error.message}`,
              );

              // If not skipping conflicts, throw error to rollback transaction
              if (!options?.skipConflicts) {
                throw error;
              }
            }
          }

          return batchResult;
        },
        {
          timeout: 60000, // 1 minute timeout per batch
          retryCount: 2,
        },
      );

    if (!transactionResult.success) {
      // Try fallback with smaller batches
      return this.processBatchWithFallback(batch, options);
    }

    return transactionResult.result!;
  }

  private async processBatchWithFallback(
    batch: BatchData<any>,
    options?: { skipConflicts?: boolean },
  ): Promise<ImportResult> {
    console.log(
      `Attempting fallback processing for batch ${batch.batchNumber}`,
    );

    // Create smaller fallback batches
    const fallbackBatches = this.batchProcessingService.createFallbackBatches(
      batch,
      this.batchProcessingService.getDefaultOptions().fallbackBatchSize,
    );

    const fallbackResult: ImportResult = {
      success: true,
      importedCount: 0,
      skippedCount: 0,
      failedCount: 0,
      errors: [],
      importedIds: [],
    };

    for (const fallbackBatch of fallbackBatches) {
      try {
        const result = await this.processBatchWithTransaction(
          fallbackBatch,
          options,
        );

        fallbackResult.importedCount += result.importedCount;
        fallbackResult.skippedCount += result.skippedCount;
        fallbackResult.failedCount += result.failedCount;
        fallbackResult.errors.push(...result.errors);
        fallbackResult.importedIds.push(...result.importedIds);
      } catch (error) {
        // If fallback also fails, try single row processing
        const singleRowResult = await this.processSingleRowFallback(
          fallbackBatch.data,
          options,
        );

        fallbackResult.importedCount += singleRowResult.importedCount;
        fallbackResult.skippedCount += singleRowResult.skippedCount;
        fallbackResult.failedCount += singleRowResult.failedCount;
        fallbackResult.errors.push(...singleRowResult.errors);
        fallbackResult.importedIds.push(...singleRowResult.importedIds);
      }
    }

    return fallbackResult;
  }

  private async processSingleRowFallback(
    data: any[],
    _options?: { skipConflicts?: boolean },
  ): Promise<ImportResult> {
    console.log(
      `Processing ${data.length} rows individually as final fallback`,
    );

    const result: ImportResult = {
      success: true,
      importedCount: 0,
      skippedCount: 0,
      failedCount: 0,
      errors: [],
      importedIds: [],
    };

    for (const validationResult of data) {
      const singleRowResult =
        await this.transactionService.executeWithTransaction(
          async (queryRunner) => {
            const userData = validationResult.data;
            const importedUser = await this.importSingleUser(
              queryRunner,
              userData,
            );
            return importedUser;
          },
          {
            timeout: 10000, // 10 seconds per row
            retryCount: 1,
          },
        );

      if (singleRowResult.success) {
        result.importedCount++;
        result.importedIds.push(singleRowResult.result!.id);
      } else {
        result.failedCount++;
        result.errors.push(
          `Row ${validationResult.rowIndex}: ${singleRowResult.error?.message}`,
        );
      }
    }

    return result;
  }

  async pauseImport(
    sessionId: string,
  ): Promise<{ success: boolean; message: string }> {
    const success = this.sessionService.pauseImport(sessionId);
    return {
      success,
      message: success
        ? "Import paused successfully"
        : "Failed to pause import",
    };
  }

  async resumeImport(
    sessionId: string,
  ): Promise<{ success: boolean; message: string }> {
    const success = this.sessionService.resumeImport(sessionId);
    return {
      success,
      message: success
        ? "Import resumed successfully"
        : "Failed to resume import",
    };
  }

  async cancelImport(
    sessionId: string,
  ): Promise<{ success: boolean; message: string }> {
    const success = this.sessionService.finalizeBatchProcessing(
      sessionId,
      false,
    );
    return {
      success,
      message: success
        ? "Import cancelled successfully"
        : "Failed to cancel import",
    };
  }

  async getImportProgress(sessionId: string): Promise<any> {
    const session = this.sessionService.getSession(sessionId);
    if (!session) {
      throw new NotFoundException("Import session not found or expired");
    }

    const batchProgress = this.sessionService.getBatchProgress(sessionId);
    if (!batchProgress) {
      return {
        sessionId,
        status: session.status,
        progress: null,
      };
    }

    return {
      sessionId,
      status: session.status,
      progress: {
        currentBatch: batchProgress.currentBatch,
        totalBatches: batchProgress.totalBatches,
        processedRows: batchProgress.processedRows,
        totalRows: batchProgress.totalRows,
        batchSize: batchProgress.batchSize,
        canPause: batchProgress.canPause,
        canResume: batchProgress.canResume,
        isPaused: batchProgress.isPaused,
        completedBatches: batchProgress.batchResults.filter(
          (b) => b.status === "success",
        ).length,
        failedBatches: batchProgress.batchResults.filter(
          (b) => b.status === "failed",
        ).length,
        progressPercent: Math.round(
          (batchProgress.processedRows / batchProgress.totalRows) * 100,
        ),
      },
      batches: batchProgress.batchResults.map((batch) => ({
        batchNumber: batch.batchNumber,
        status: batch.status,
        processedRows: batch.processedRows,
        successfulRows: batch.successfulRows,
        failedRows: batch.failedRows,
        errors: batch.errors.slice(0, 5), // Limit errors to prevent large responses
        retryCount: batch.retryCount,
        startTime: batch.startTime,
        endTime: batch.endTime,
      })),
    };
  }

  // Enhanced organization handling methods
  private async handleClassOrganizationWithTransaction(
    queryRunner: any,
    className: string,
    facultyCode: string,
    userId: string,
  ): Promise<void> {
    // Create both Chi đoàn and Chi hội organizations for the class
    const { chiDoan, chiHoi } =
      await this.createClassOrganizationsWithTransaction(
        queryRunner,
        className,
        facultyCode,
      );

    // Add user to both organizations
    for (const org of [chiDoan, chiHoi]) {
      const existingMembership = await queryRunner.manager.findOne(
        UserOrganization,
        {
          where: { userId, organizationId: org.id },
        },
      );

      if (!existingMembership) {
        const membership = queryRunner.manager.create(UserOrganization, {
          userId,
          organizationId: org.id,
          role: UserOrgRole.MEMBER,
        });
        await queryRunner.manager.save(UserOrganization, membership);
      }
    }
  }

  private async createClassOrganizationsWithTransaction(
    queryRunner: any,
    className: string,
    facultyCode: string,
  ): Promise<{ chiDoan: Organization; chiHoi: Organization }> {
    // Get or create parent organizations (level 2)
    const { lienChiDoan, lienChiHoi } =
      await this.getOrCreateParentOrganizationsWithTransaction(
        queryRunner,
        className,
        facultyCode,
      );

    // Check if class organizations already exist
    let chiDoan = await queryRunner.manager.findOne(Organization, {
      where: { code: `CHI_DOAN_${className}`, type: OrganizationType.CHI_DOAN },
    });

    let chiHoi = await queryRunner.manager.findOne(Organization, {
      where: { code: `CHI_HOI_${className}`, type: OrganizationType.CHI_HOI },
    });

    // Create Chi đoàn if not exists
    if (!chiDoan) {
      chiDoan = queryRunner.manager.create(Organization, {
        name: `Chi đoàn ${className}`,
        code: `CHI_DOAN_${className}`,
        type: OrganizationType.CHI_DOAN,
        parent: lienChiDoan,
      });
      chiDoan = await queryRunner.manager.save(Organization, chiDoan);
    }

    // Create Chi hội if not exists
    if (!chiHoi) {
      chiHoi = queryRunner.manager.create(Organization, {
        name: `Chi hội ${className}`,
        code: `CHI_HOI_${className}`,
        type: OrganizationType.CHI_HOI,
        parent: lienChiHoi,
      });
      chiHoi = await queryRunner.manager.save(Organization, chiHoi);
    }

    return { chiDoan, chiHoi };
  }

  private async getOrCreateParentOrganizationsWithTransaction(
    queryRunner: any,
    className: string,
    facultyCode: string,
  ): Promise<{ lienChiDoan: Organization; lienChiHoi: Organization }> {
    let departmentName = "Unknown Department";
    let departmentCode = facultyCode || "UNKNOWN";

    // Check if class name starts with international prefixes
    const internationalPrefixes = ["CC", "CN", "CT", "TT"];
    const isInternational = internationalPrefixes.some((prefix) =>
      className.toUpperCase().startsWith(prefix),
    );

    if (isInternational) {
      departmentName = "Văn phòng Đào tạo quốc tế";
      departmentCode = "QT";
    } else if (facultyCode) {
      // Try to get department name from database
      const department = await queryRunner.manager.findOne(Department, {
        where: { code: facultyCode },
      });
      if (department) {
        departmentName = department.name;
        departmentCode = department.code;
      }
    }

    // Get level 1 parent organizations
    const doanTruong = await queryRunner.manager.findOne(Organization, {
      where: { type: OrganizationType.DOAN_TRUONG },
    });

    const hoiSinhVien = await queryRunner.manager.findOne(Organization, {
      where: { type: OrganizationType.HOI_SINH_VIEN_TRUONG },
    });

    if (!doanTruong || !hoiSinhVien) {
      throw new Error(
        "Không tìm thấy tổ chức cấp 1 (Đoàn Trường hoặc Hội Sinh viên)",
      );
    }

    // Get or create Liên chi đoàn (level 2) - Đoàn cơ sở
    let lienChiDoan = await queryRunner.manager.findOne(Organization, {
      where: {
        name: `Liên chi đoàn ${departmentName}`,
        type: OrganizationType.DOAN_CO_SO,
      },
    });

    if (!lienChiDoan) {
      lienChiDoan = queryRunner.manager.create(Organization, {
        name: `Liên chi đoàn ${departmentName}`,
        code: `LIEN_CHI_DOAN_${departmentCode}`,
        type: OrganizationType.DOAN_CO_SO,
        description: `Đoàn cơ sở của ${departmentName}`,
        parent: doanTruong,
      });
      lienChiDoan = await queryRunner.manager.save(Organization, lienChiDoan);
    }

    // Get or create Liên chi hội (level 2)
    let lienChiHoi = await queryRunner.manager.findOne(Organization, {
      where: {
        name: `Liên chi hội ${departmentName}`,
        type: OrganizationType.LIEN_CHI_HOI,
      },
    });

    if (!lienChiHoi) {
      lienChiHoi = queryRunner.manager.create(Organization, {
        name: `Liên chi hội ${departmentName}`,
        code: `LIEN_CHI_HOI_${departmentCode}`,
        type: OrganizationType.LIEN_CHI_HOI,
        description: `Hội sinh viên cơ sở của ${departmentName}`,
        parent: hoiSinhVien,
      });
      lienChiHoi = await queryRunner.manager.save(Organization, lienChiHoi);
    }

    return { lienChiDoan, lienChiHoi };
  }
}
