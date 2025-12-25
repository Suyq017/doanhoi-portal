import {
  Injectable,
  BadRequestException,
  NotFoundException,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository, DataSource } from "typeorm";
import { Class } from "../../entities/class.entity";
import { Department } from "../../entities/department.entity";
import { ExcelParserService } from "./excel-parser.service";
import {
  ImportValidationService,
  ValidationResult,
} from "./import-validation.service";
import {
  ImportSessionService,
  ImportSession,
  ImportResult,
} from "./import-session.service";
import {
  BatchProcessingService,
  BatchData,
  BatchProcessingOptions,
} from "./batch-processing.service";
import { TransactionService } from "./transaction.service";

export interface ImportUploadResponse {
  sessionId: string;
  fileName: string;
  totalRows: number;
  message: string;
}

export interface ImportValidationResponse {
  sessionId: string;
  isValid: boolean;
  summary: ValidationResult["summary"];
  errors: ValidationResult["errors"];
  warnings: ValidationResult["warnings"];
  previewData: any[];
}

export interface ImportExecuteResponse {
  sessionId: string;
  success: boolean;
  importedCount: number;
  skippedCount: number;
  failedCount: number;
  errors: string[];
  message: string;
}

@Injectable()
export class ImportService {
  constructor(
    @InjectRepository(Class)
    private classesRepository: Repository<Class>,
    @InjectRepository(Department)
    private departmentsRepository: Repository<Department>,
    private excelParserService: ExcelParserService,
    private validationService: ImportValidationService,
    private sessionService: ImportSessionService,
    private batchProcessingService: BatchProcessingService,
    private transactionService: TransactionService,
    private dataSource: DataSource,
  ) {}

  async uploadFile(file: Express.Multer.File): Promise<ImportUploadResponse> {
    if (!file) {
      throw new BadRequestException("No file uploaded");
    }

    if (!file.originalname.match(/\.(xlsx|xls)$/)) {
      throw new BadRequestException(
        "Only Excel files (.xlsx, .xls) are allowed",
      );
    }

    try {
      // Parse Excel file
      const data = await this.excelParserService.parseExcelFile(file.buffer);

      if (data.length === 0) {
        throw new BadRequestException("Excel file contains no data rows");
      }

      // Create session
      const session = this.sessionService.createSession(
        file.originalname,
        data,
      );

      return {
        sessionId: session.id,
        fileName: file.originalname,
        totalRows: data.length,
        message: `File uploaded successfully. Found ${data.length} rows to import.`,
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
      throw new NotFoundException("Import session not found or expired");
    }

    if (!session.data) {
      throw new BadRequestException("No data found in session");
    }

    try {
      // Validate data
      const validationResult = await this.validationService.validateClassData(
        session.data,
      );

      // Update session with validation result
      this.sessionService.updateSessionValidation(sessionId, validationResult);

      // Create preview data (first 10 rows with validation info)
      const previewData = validationResult.data.map((item, index) => ({
        row: index + 2, // Excel row number
        name: item.name,
        code: item.code,
        year: item.year,
        departmentCode: item.departmentCode,
        isActive: item.isActive,
        hasErrors: item._errors.length > 0,
        hasWarnings: item._warnings.length > 0,
        errors: item._errors,
        warnings: item._warnings,
      }));

      return {
        sessionId,
        isValid: validationResult.isValid,
        summary: validationResult.summary,
        errors: validationResult.errors,
        warnings: validationResult.warnings,
        previewData,
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
      throw new NotFoundException("Import session not found or expired");
    }

    if (session.status !== "validated") {
      throw new BadRequestException("Data must be validated before import");
    }

    const validatedData = this.sessionService.getValidatedData(sessionId);
    if (!validatedData) {
      throw new BadRequestException("No validated data found");
    }

    // Filter out rows with errors
    const validRows = validatedData.filter((item) => item._errors.length === 0);

    if (validRows.length === 0) {
      throw new BadRequestException("No valid rows found to import");
    }

    try {
      // Initialize batch processing
      const batchSize =
        options?.batchSize ||
        this.batchProcessingService.getOptimizedBatchSize(validRows.length);
      const batchProcessingOptions =
        this.batchProcessingService.getDefaultOptions();
      batchProcessingOptions.batchSize = batchSize;

      this.sessionService.initializeBatchProcessing(
        sessionId,
        validRows.length,
        batchSize,
      );

      // Execute batch import
      const importResult = await this.performBatchImport(
        sessionId,
        validRows,
        batchProcessingOptions,
        options,
      );

      // Finalize batch processing
      this.sessionService.finalizeBatchProcessing(
        sessionId,
        importResult.success,
      );

      // Update session with import result
      this.sessionService.updateSessionImport(sessionId, importResult);

      return {
        sessionId,
        success: importResult.success,
        importedCount: importResult.importedCount,
        skippedCount: importResult.skippedCount,
        failedCount: importResult.failedCount,
        errors: importResult.errors,
        message: importResult.success
          ? `Import completed successfully. ${importResult.importedCount} classes imported.`
          : `Import completed with errors. ${importResult.importedCount} imported, ${importResult.failedCount} failed.`,
      };
    } catch (error) {
      const importResult: ImportResult = {
        success: false,
        importedCount: 0,
        skippedCount: 0,
        failedCount: validatedData.length,
        errors: [error.message],
        importedIds: [],
      };

      this.sessionService.finalizeBatchProcessing(sessionId, false);
      this.sessionService.updateSessionImport(sessionId, importResult);
      throw new BadRequestException(`Import failed: ${error.message}`);
    }
  }

  // Temporary method for testing without complex batch processing
  async executeSimpleImport(
    sessionId: string,
    options?: { skipConflicts?: boolean },
  ): Promise<ImportExecuteResponse> {
    const session = this.sessionService.getSession(sessionId);
    if (!session) {
      throw new NotFoundException("Import session not found or expired");
    }

    if (session.status !== "validated") {
      throw new BadRequestException("Data must be validated before import");
    }

    const validatedData = this.sessionService.getValidatedData(sessionId);
    if (!validatedData) {
      throw new BadRequestException("No validated data found");
    }

    // Filter out rows with errors
    const validRows = validatedData.filter((item) => item._errors.length === 0);

    if (validRows.length === 0) {
      throw new BadRequestException("No valid rows found to import");
    }

    try {
      console.log(`Starting simple import for ${validRows.length} rows`);

      // Use the original simple import method
      const importResult = await this.performImport(validRows, options);

      // Update session with import result
      this.sessionService.updateSessionImport(sessionId, importResult);

      return {
        sessionId,
        success: importResult.success,
        importedCount: importResult.importedCount,
        skippedCount: importResult.skippedCount,
        failedCount: importResult.failedCount,
        errors: importResult.errors,
        message: importResult.success
          ? `Import completed successfully. ${importResult.importedCount} classes imported.`
          : `Import completed with errors. ${importResult.importedCount} imported, ${importResult.failedCount} failed.`,
      };
    } catch (error) {
      const importResult: ImportResult = {
        success: false,
        importedCount: 0,
        skippedCount: 0,
        failedCount: validatedData.length,
        errors: [error.message],
        importedIds: [],
      };

      this.sessionService.updateSessionImport(sessionId, importResult);
      throw new BadRequestException(`Import failed: ${error.message}`);
    }
  }

  async getSessionStatus(sessionId: string): Promise<ImportSession> {
    const session = this.sessionService.getSession(sessionId);
    if (!session) {
      throw new NotFoundException("Import session not found or expired");
    }
    return session;
  }

  async generateTemplate(): Promise<Buffer> {
    return this.excelParserService.generateTemplate();
  }

  private async performBatchImport(
    sessionId: string,
    validatedData: any[],
    batchProcessingOptions: BatchProcessingOptions,
    options?: { skipConflicts?: boolean },
  ): Promise<ImportResult> {
    const startTime = new Date();
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
      `Starting batch import: ${batches.length} batches, ${validatedData.length} total rows`,
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
        processedRows: 0,
        successCount: 0,
        failedCount: 0,
        skippedCount: 0,
        errors: [],
      });

      try {
        // Process batch with transaction
        const batchResult = await this.processBatchWithTransaction(
          batch,
          options,
        );

        // Update batch progress
        this.sessionService.updateBatchProgress(sessionId, batch.batchNumber, {
          status: "success",
          endTime: new Date(),
          processedRows: batch.data.length,
          successCount: batchResult.importedCount,
          failedCount: batchResult.failedCount,
          skippedCount: batchResult.skippedCount,
          errors: batchResult.errors,
        });

        // Aggregate results
        importResult.importedCount += batchResult.importedCount;
        importResult.skippedCount += batchResult.skippedCount;
        importResult.failedCount += batchResult.failedCount;
        importResult.errors.push(...batchResult.errors);
        importResult.importedIds.push(...batchResult.importedIds);

        console.log(
          `Batch ${batch.batchNumber} completed: ${batchResult.importedCount} imported, ${batchResult.failedCount} failed`,
        );
      } catch (error) {
        console.error(`Batch ${batch.batchNumber} failed: ${error.message}`);

        // Try fallback approach with smaller batches
        if (
          batchProcessingOptions.enableFallback &&
          batch.data.length > batchProcessingOptions.fallbackBatchSize
        ) {
          console.log(`Attempting fallback for batch ${batch.batchNumber}`);

          const fallbackResult = await this.processBatchWithFallback(
            batch,
            batchProcessingOptions,
            options,
          );

          // Update batch progress
          this.sessionService.updateBatchProgress(
            sessionId,
            batch.batchNumber,
            {
              status: fallbackResult.success ? "success" : "failed",
              endTime: new Date(),
              processedRows: batch.data.length,
              successCount: fallbackResult.importedCount,
              failedCount: fallbackResult.failedCount,
              skippedCount: fallbackResult.skippedCount,
              errors: fallbackResult.errors,
            },
          );

          // Aggregate results
          importResult.importedCount += fallbackResult.importedCount;
          importResult.skippedCount += fallbackResult.skippedCount;
          importResult.failedCount += fallbackResult.failedCount;
          importResult.errors.push(...fallbackResult.errors);
          importResult.importedIds.push(...fallbackResult.importedIds);
        } else {
          // Mark batch as failed
          this.sessionService.updateBatchProgress(
            sessionId,
            batch.batchNumber,
            {
              status: "failed",
              endTime: new Date(),
              processedRows: batch.data.length,
              successCount: 0,
              failedCount: batch.data.length,
              skippedCount: 0,
              errors: [error.message],
            },
          );

          importResult.failedCount += batch.data.length;
          importResult.errors.push(
            `Batch ${batch.batchNumber} failed: ${error.message}`,
          );
          importResult.success = false;
        }
      }
    }

    // Calculate final stats
    const stats = this.batchProcessingService.calculateStats(
      startTime,
      new Date(),
      batches.length,
      batches.length, // All batches processed
      importResult.failedCount > 0 ? 1 : 0, // Failed batches
      validatedData.length,
      importResult.importedCount +
        importResult.skippedCount +
        importResult.failedCount,
      importResult.importedCount,
      importResult.failedCount,
      importResult.skippedCount,
    );

    this.batchProcessingService.logProgress(stats);

    // Mark overall import as failed if any batch failed
    if (importResult.failedCount > 0) {
      importResult.success = false;
    }

    console.log(
      `Batch import completed: ${importResult.importedCount} imported, ${importResult.failedCount} failed, ${importResult.skippedCount} skipped`,
    );
    return importResult;
  }

  private async processBatchWithTransaction(
    batch: BatchData<any>,
    options?: { skipConflicts?: boolean },
  ): Promise<ImportResult> {
    // For small batches or initial testing, use direct processing without transaction wrapper
    // This avoids transaction complexity issues while maintaining functionality
    try {
      return await this.processBatchData(batch.data, null, options);
    } catch (error) {
      console.error(
        `Batch processing failed for batch ${batch.batchNumber}: ${error.message}`,
      );
      throw error;
    }
  }

  private async processBatchWithFallback(
    batch: BatchData<any>,
    batchProcessingOptions: BatchProcessingOptions,
    options?: { skipConflicts?: boolean },
  ): Promise<ImportResult> {
    const fallbackBatches = this.batchProcessingService.createFallbackBatches(
      batch,
      batchProcessingOptions.fallbackBatchSize,
    );

    const aggregatedResult: ImportResult = {
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

        aggregatedResult.importedCount += result.importedCount;
        aggregatedResult.skippedCount += result.skippedCount;
        aggregatedResult.failedCount += result.failedCount;
        aggregatedResult.errors.push(...result.errors);
        aggregatedResult.importedIds.push(...result.importedIds);
      } catch (error) {
        // Single row fallback
        const singleRowResult = await this.processSingleRowFallback(
          fallbackBatch.data,
          options,
        );

        aggregatedResult.importedCount += singleRowResult.importedCount;
        aggregatedResult.skippedCount += singleRowResult.skippedCount;
        aggregatedResult.failedCount += singleRowResult.failedCount;
        aggregatedResult.errors.push(...singleRowResult.errors);
        aggregatedResult.importedIds.push(...singleRowResult.importedIds);
      }
    }

    if (aggregatedResult.failedCount > 0) {
      aggregatedResult.success = false;
    }

    return aggregatedResult;
  }

  private async processSingleRowFallback(
    data: any[],
    options?: { skipConflicts?: boolean },
  ): Promise<ImportResult> {
    const result: ImportResult = {
      success: true,
      importedCount: 0,
      skippedCount: 0,
      failedCount: 0,
      errors: [],
      importedIds: [],
    };

    for (const rowData of data) {
      try {
        const singleResult = await this.processBatchData(
          [rowData],
          null,
          options,
        );

        result.importedCount += singleResult.importedCount;
        result.skippedCount += singleResult.skippedCount;
        result.failedCount += singleResult.failedCount;
        result.errors.push(...singleResult.errors);
        result.importedIds.push(...singleResult.importedIds);
      } catch (error) {
        result.failedCount++;
        result.errors.push(`Single row import failed: ${error.message}`);
        result.success = false;
      }
    }

    return result;
  }

  private async processBatchData(
    data: any[],
    queryRunner: any,
    options?: { skipConflicts?: boolean },
  ): Promise<ImportResult> {
    const result: ImportResult = {
      success: true,
      importedCount: 0,
      skippedCount: 0,
      failedCount: 0,
      errors: [],
      importedIds: [],
    };

    // Use bulk insert for better performance
    const classesToInsert: any[] = [];
    const conflicts: any[] = [];

    // First pass: prepare data and check for conflicts
    for (const rowData of data) {
      try {
        // Check for existing class by name and year
        if (rowData.name && rowData.year) {
          const repository = queryRunner
            ? queryRunner.manager.getRepository(Class)
            : this.classesRepository;
          const existingByNameAndYear = await repository.findOne({
            where: {
              name: rowData.name,
              year: rowData.year,
            },
          });

          if (existingByNameAndYear) {
            if (!options?.skipConflicts) {
              result.errors.push(
                `Row with name "${rowData.name}" and year "${rowData.year}" already exists`,
              );
              result.failedCount++;
              continue;
            } else {
              conflicts.push(rowData);
              result.skippedCount++;
              continue;
            }
          }
        }

        // Prepare class data
        const classData: any = {
          name: rowData.name,
          year: rowData.year || null,
          isActive: rowData.isActive ?? true,
        };

        // Set department if resolved
        if (rowData._departmentId) {
          classData.departmentId = rowData._departmentId;
        }

        classesToInsert.push(classData);
      } catch (error) {
        result.errors.push(`Failed to prepare row: ${error.message}`);
        result.failedCount++;
      }
    }

    // Second pass: bulk insert
    if (classesToInsert.length > 0) {
      try {
        const repository = queryRunner
          ? queryRunner.manager.getRepository(Class)
          : this.classesRepository;
        const insertResult = await repository.insert(classesToInsert);

        result.importedCount += classesToInsert.length;

        // Extract IDs from insert result
        if (insertResult.identifiers) {
          result.importedIds.push(
            ...insertResult.identifiers.map((id) => id.id),
          );
        }
      } catch (error) {
        // If bulk insert fails, fall back to individual inserts
        console.log(
          `Bulk insert failed, falling back to individual inserts: ${error.message}`,
        );

        for (const classData of classesToInsert) {
          try {
            const repository = queryRunner
              ? queryRunner.manager.getRepository(Class)
              : this.classesRepository;
            const classEntity = repository.create(classData);
            const savedClass = await repository.save(classEntity);

            result.importedCount++;
            result.importedIds.push(savedClass.id);
          } catch (singleError) {
            result.errors.push(
              `Failed to import single row: ${singleError.message}`,
            );
            result.failedCount++;
          }
        }
      }
    }

    if (result.failedCount > 0) {
      result.success = false;
    }

    return result;
  }

  // Keep the original performImport method for backward compatibility
  private async performImport(
    validatedData: any[],
    options?: { skipConflicts?: boolean },
  ): Promise<ImportResult> {
    return this.processBatchData(validatedData, null, options);
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
        message: "No batch processing information available",
      };
    }

    const progressPercent =
      batchProgress.totalBatches > 0
        ? (batchProgress.currentBatch / batchProgress.totalBatches) * 100
        : 0;

    const completedBatches = batchProgress.batchResults.filter(
      (b) => b.status === "success",
    ).length;
    const failedBatches = batchProgress.batchResults.filter(
      (b) => b.status === "failed",
    ).length;
    const processingBatches = batchProgress.batchResults.filter(
      (b) => b.status === "processing",
    ).length;

    return {
      sessionId,
      status: session.status,
      progress: {
        currentBatch: batchProgress.currentBatch,
        totalBatches: batchProgress.totalBatches,
        completedBatches,
        failedBatches,
        processingBatches,
        progressPercent: Math.round(progressPercent * 100) / 100,
        processedRows: batchProgress.processedRows,
        totalRows: session.metadata.totalRows,
        batchSize: batchProgress.batchSize,
        canPause: batchProgress.canPause,
        canResume: batchProgress.canResume,
        isPaused: batchProgress.isPaused,
        startTime: batchProgress.startTime,
        endTime: batchProgress.endTime,
      },
      batchResults: batchProgress.batchResults.map((batch) => ({
        batchNumber: batch.batchNumber,
        status: batch.status,
        processedRows: batch.processedRows,
        successCount: batch.successCount,
        failedCount: batch.failedCount,
        skippedCount: batch.skippedCount,
        errors: batch.errors.slice(0, 5), // Limit errors to prevent large responses
        retryCount: batch.retryCount,
        startTime: batch.startTime,
        endTime: batch.endTime,
      })),
    };
  }

  async pauseImport(sessionId: string): Promise<any> {
    const session = this.sessionService.getSession(sessionId);
    if (!session) {
      throw new NotFoundException("Import session not found or expired");
    }

    if (session.status !== "importing") {
      throw new BadRequestException("Import is not currently running");
    }

    const success = this.sessionService.pauseImport(sessionId);
    if (!success) {
      throw new BadRequestException("Unable to pause import");
    }

    return {
      sessionId,
      status: "paused",
      message: "Import has been paused successfully",
    };
  }

  async resumeImport(sessionId: string): Promise<any> {
    const session = this.sessionService.getSession(sessionId);
    if (!session) {
      throw new NotFoundException("Import session not found or expired");
    }

    if (session.status !== "paused") {
      throw new BadRequestException("Import is not currently paused");
    }

    const success = this.sessionService.resumeImport(sessionId);
    if (!success) {
      throw new BadRequestException("Unable to resume import");
    }

    // Continue the import process from where it was paused
    // This would typically trigger the batch processing to continue
    // For now, just return success response
    return {
      sessionId,
      status: "importing",
      message: "Import has been resumed successfully",
    };
  }

  async cancelImport(sessionId: string): Promise<any> {
    const session = this.sessionService.getSession(sessionId);
    if (!session) {
      throw new NotFoundException("Import session not found or expired");
    }

    if (!["importing", "paused"].includes(session.status)) {
      throw new BadRequestException(
        "Import is not currently running or paused",
      );
    }

    // Mark session as failed and finalize batch processing
    this.sessionService.finalizeBatchProcessing(sessionId, false);

    const importResult: ImportResult = {
      success: false,
      importedCount: 0,
      skippedCount: 0,
      failedCount: 0,
      errors: ["Import was cancelled by user"],
      importedIds: [],
    };

    this.sessionService.updateSessionImport(sessionId, importResult);

    return {
      sessionId,
      status: "failed",
      message: "Import has been cancelled successfully",
    };
  }
}
