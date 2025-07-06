import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Department } from '../../entities/department.entity';
import { ExcelParserService, DepartmentImportData } from './excel-parser.service';
import { ImportValidationService, ValidationResult } from './import-validation.service';
import { ImportSessionService, ImportSession, ImportResult } from './import-session.service';
import { DepartmentBatchProcessingService, BatchData, BatchProcessingStats, BatchProcessingConfig } from './batch-processing.service';
import { DepartmentTransactionService, TransactionConfig } from './transaction.service';
import { DepartmentBatchImportConfigService } from './batch-import-config.service';
import { DepartmentBatchImportMonitoringService } from './batch-import-monitoring.service';

export interface ImportUploadResponse {
  sessionId: string;
  fileName: string;
  totalRows: number;
  message: string;
}

export interface ImportValidationResponse {
  sessionId: string;
  isValid: boolean;
  summary: ValidationResult['summary'];
  errors: ValidationResult['errors'];
  warnings: ValidationResult['warnings'];
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
  batchStats?: BatchProcessingStats;
  estimatedTimeRemaining?: number;
}

export interface ImportProgressResponse {
  sessionId: string;
  status: ImportSession['status'];
  progress: {
    currentBatch: number;
    totalBatches: number;
    processedRows: number;
    totalRows: number;
    progressPercent: number;
    estimatedTimeRemaining: number;
  };
  stats: BatchProcessingStats;
  errors: string[];
}

export interface ImportOptions {
  skipConflicts?: boolean;
  batchSize?: number;
  enableFallback?: boolean;
  maxRetries?: number;
  enableTransaction?: boolean;
}

@Injectable()
export class ImportService {
  constructor(
    @InjectRepository(Department)
    private departmentsRepository: Repository<Department>,
    private excelParserService: ExcelParserService,
    private validationService: ImportValidationService,
    private sessionService: ImportSessionService,
    private batchProcessingService: DepartmentBatchProcessingService,
    private transactionService: DepartmentTransactionService,
    private configService: DepartmentBatchImportConfigService,
    private monitoringService: DepartmentBatchImportMonitoringService,
  ) {}

  async uploadFile(file: Express.Multer.File): Promise<ImportUploadResponse> {
    if (!file) {
      throw new BadRequestException('No file uploaded');
    }

    if (!file.originalname.match(/\.(xlsx|xls)$/)) {
      throw new BadRequestException('Only Excel files (.xlsx, .xls) are allowed');
    }

    try {
      // Parse Excel file
      const data = await this.excelParserService.parseExcelFile(file.buffer);
      
      if (data.length === 0) {
        throw new BadRequestException('Excel file contains no data rows');
      }

      // Create session
      const session = this.sessionService.createSession(file.originalname, data);

      return {
        sessionId: session.id,
        fileName: file.originalname,
        totalRows: data.length,
        message: `File uploaded successfully. Found ${data.length} rows to import.`
      };
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new BadRequestException(`Failed to parse Excel file: ${error.message}`);
    }
  }

  async validateData(sessionId: string): Promise<ImportValidationResponse> {
    const session = this.sessionService.getSession(sessionId);
    if (!session) {
      throw new NotFoundException('Import session not found or expired');
    }

    if (!session.data) {
      throw new BadRequestException('No data found in session');
    }

    try {
      // Validate data
      const validationResult = await this.validationService.validateDepartmentData(session.data);
      
      // Update session with validation result
      this.sessionService.updateSessionValidation(sessionId, validationResult);

      // Create preview data (first 10 rows with validation info)
      const previewData = validationResult.data.slice(0, 10).map((item, index) => ({
        row: index + 2, // Excel row number
        name: item.name,
        code: item.code,
        description: item.description,
        hasErrors: item._errors.length > 0,
        hasWarnings: item._warnings.length > 0,
        errors: item._errors,
        warnings: item._warnings
      }));

      return {
        sessionId,
        isValid: validationResult.isValid,
        summary: validationResult.summary,
        errors: validationResult.errors,
        warnings: validationResult.warnings,
        previewData
      };
    } catch (error) {
      throw new BadRequestException(`Validation failed: ${error.message}`);
    }
  }

  async executeImport(sessionId: string, options?: ImportOptions): Promise<ImportExecuteResponse> {
    const session = this.sessionService.getSession(sessionId);
    if (!session) {
      throw new NotFoundException('Import session not found or expired');
    }

    if (session.status !== 'validated') {
      throw new BadRequestException('Data must be validated before import');
    }

    const validatedData = this.sessionService.getValidatedData(sessionId);
    if (!validatedData) {
      throw new BadRequestException('No validated data found');
    }

    try {
      // Initialize monitoring
      this.monitoringService.initializeSessionMonitoring(sessionId, session.fileName, validatedData.length);
      
      // Determine import method based on data size and configuration
      const shouldUseBatchProcessing = this.configService.shouldUseBatchProcessing(validatedData.length);
      
      let importResult: ImportResult;
      let batchStats: BatchProcessingStats | undefined;

      if (shouldUseBatchProcessing) {
        const result = await this.performBatchImport(sessionId, validatedData, options);
        importResult = result.importResult;
        batchStats = result.batchStats;
      } else {
        importResult = await this.performImport(validatedData, options);
      }
      
      // Finalize monitoring
      this.monitoringService.finalizeSessionMonitoring(sessionId, importResult.success);
      
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
          ? `Import completed successfully. ${importResult.importedCount} departments imported.`
          : `Import completed with errors. ${importResult.importedCount} imported, ${importResult.failedCount} failed.`,
        batchStats,
        estimatedTimeRemaining: batchStats?.estimatedTimeRemaining
      };
    } catch (error) {
      const importResult: ImportResult = {
        success: false,
        importedCount: 0,
        skippedCount: 0,
        failedCount: validatedData.length,
        errors: [error.message],
        importedIds: []
      };

      this.sessionService.updateSessionImport(sessionId, importResult);
      throw new BadRequestException(`Import failed: ${error.message}`);
    }
  }

  async getSessionStatus(sessionId: string): Promise<ImportSession> {
    const session = this.sessionService.getSession(sessionId);
    if (!session) {
      throw new NotFoundException('Import session not found or expired');
    }
    return session;
  }

  async generateTemplate(): Promise<Buffer> {
    return this.excelParserService.generateTemplate();
  }

  async getImportProgress(sessionId: string): Promise<ImportProgressResponse> {
    const session = this.sessionService.getSession(sessionId);
    if (!session) {
      throw new NotFoundException('Import session not found or expired');
    }

    const batchProgress = this.sessionService.getBatchProgress(sessionId);
    if (!batchProgress) {
      throw new NotFoundException('No batch progress found for this session');
    }

    const stats = this.batchProcessingService.calculateStats(batchProgress.batches);
    
    return {
      sessionId,
      status: session.status,
      progress: {
        currentBatch: batchProgress.currentBatch,
        totalBatches: batchProgress.totalBatches,
        processedRows: batchProgress.processedRows,
        totalRows: batchProgress.totalRows,
        progressPercent: (batchProgress.processedRows / batchProgress.totalRows) * 100,
        estimatedTimeRemaining: stats.estimatedTimeRemaining,
      },
      stats,
      errors: batchProgress.errors,
    };
  }

  async pauseImport(sessionId: string): Promise<{ success: boolean; message: string }> {
    const session = this.sessionService.getSession(sessionId);
    if (!session) {
      throw new NotFoundException('Import session not found or expired');
    }

    if (session.status !== 'importing') {
      throw new BadRequestException('Only importing sessions can be paused');
    }

    this.sessionService.pauseImport(sessionId);
    return {
      success: true,
      message: 'Import paused successfully'
    };
  }

  async resumeImport(sessionId: string): Promise<{ success: boolean; message: string }> {
    const session = this.sessionService.getSession(sessionId);
    if (!session) {
      throw new NotFoundException('Import session not found or expired');
    }

    if (session.status !== 'paused') {
      throw new BadRequestException('Only paused sessions can be resumed');
    }

    this.sessionService.resumeImport(sessionId);
    
    // Continue batch processing
    const validatedData = this.sessionService.getValidatedData(sessionId);
    if (validatedData) {
      // Continue from where we left off
      await this.continueBatchImport(sessionId, validatedData);
    }

    return {
      success: true,
      message: 'Import resumed successfully'
    };
  }

  async cancelImport(sessionId: string): Promise<{ success: boolean; message: string }> {
    const session = this.sessionService.getSession(sessionId);
    if (!session) {
      throw new NotFoundException('Import session not found or expired');
    }

    if (session.status !== 'importing' && session.status !== 'paused') {
      throw new BadRequestException('Only importing or paused sessions can be cancelled');
    }

    // Update session status to cancelled
    this.sessionService.updateSessionStatus(sessionId, 'cancelled');
    
    return {
      success: true,
      message: 'Import cancelled successfully'
    };
  }

  private async performImport(
    validatedData: any[],
    options?: { skipConflicts?: boolean }
  ): Promise<ImportResult> {
    const importResult: ImportResult = {
      success: true,
      importedCount: 0,
      skippedCount: 0,
      failedCount: 0,
      errors: [],
      importedIds: []
    };

    // Filter out rows with errors
    const validRows = validatedData.filter(item => item._errors.length === 0);
    
    // Handle conflicts if skipConflicts is true
    let rowsToImport = validRows;
    if (options?.skipConflicts) {
      rowsToImport = validRows.filter(item => item._warnings.length === 0);
      importResult.skippedCount = validRows.length - rowsToImport.length;
    }

    for (const rowData of rowsToImport) {
      try {
        // Check for existing department by name or code
        const existingByName = rowData.name ? 
          await this.departmentsRepository.findOne({ where: { name: rowData.name } }) : null;
        const existingByCode = rowData.code ? 
          await this.departmentsRepository.findOne({ where: { code: rowData.code } }) : null;

        if (existingByName || existingByCode) {
          if (!options?.skipConflicts) {
            importResult.errors.push(
              `Row with name "${rowData.name}" ${existingByCode ? `or code "${rowData.code}"` : ''} already exists`
            );
            importResult.failedCount++;
            continue;
          } else {
            importResult.skippedCount++;
            continue;
          }
        }

        // Create new department
        const department = this.departmentsRepository.create({
          name: rowData.name,
          code: rowData.code || null,
          description: rowData.description || null
        });

        const savedDepartment = await this.departmentsRepository.save(department);
        importResult.importedCount++;
        importResult.importedIds.push(savedDepartment.id);

      } catch (error) {
        importResult.errors.push(`Failed to import row: ${error.message}`);
        importResult.failedCount++;
        importResult.success = false;
      }
    }

    return importResult;
  }

  private async performBatchImport(
    sessionId: string,
    validatedData: any[],
    options?: ImportOptions
  ): Promise<{ importResult: ImportResult; batchStats: BatchProcessingStats }> {
    const importResult: ImportResult = {
      success: true,
      importedCount: 0,
      skippedCount: 0,
      failedCount: 0,
      errors: [],
      importedIds: []
    };

    // Filter out rows with errors
    const validRows = validatedData.filter(item => item._errors.length === 0);
    
    // Handle conflicts if skipConflicts is true
    let rowsToImport = validRows;
    if (options?.skipConflicts) {
      rowsToImport = validRows.filter(item => item._warnings.length === 0);
      importResult.skippedCount = validRows.length - rowsToImport.length;
    }

    // Configure batch processing with config service
    const batchConfig: BatchProcessingConfig = {
      batchSize: options?.batchSize || this.configService.getOptimizedBatchSize(rowsToImport.length),
      maxRetries: options?.maxRetries || this.configService.getBatchProcessingConfig().maxRetries,
      retryDelay: this.configService.getBatchProcessingConfig().retryDelay,
      fallbackBatchSize: this.configService.getBatchProcessingConfig().fallbackBatchSize,
      enableFallback: options?.enableFallback ?? this.configService.getBatchProcessingConfig().enableFallback,
      enableOptimizedBatchSize: this.configService.getBatchProcessingConfig().enableOptimizedBatchSize,
    };

    // Create batches
    const batches = this.batchProcessingService.createBatches(rowsToImport, batchConfig);
    
    // Initialize batch processing in session
    this.sessionService.initializeBatchProcessing(sessionId, batches.length, rowsToImport.length);
    
    // Update session status to importing
    this.sessionService.updateSessionStatus(sessionId, 'importing');

    // Process batches sequentially
    for (let i = 0; i < batches.length; i++) {
      const batch = batches[i];
      
      // Check if import was paused or cancelled
      const currentSession = this.sessionService.getSession(sessionId);
      if (currentSession?.status === 'paused') {
        break; // Exit batch processing loop
      }
      if (currentSession?.status === 'cancelled') {
        importResult.success = false;
        importResult.errors.push('Import was cancelled');
        break;
      }

      // Mark batch as processing
      this.batchProcessingService.updateBatchStatus(batches, batch.batchId, 'processing');
      
      try {
        const batchResult = await this.processBatch(batch, options);
        
        // Update batch status
        this.batchProcessingService.updateBatchStatus(
          batches, 
          batch.batchId, 
          batchResult.success ? 'success' : 'failed',
          batchResult.error,
          batchResult.processingTime
        );
        
        // Update import result
        importResult.importedCount += batchResult.importedCount;
        importResult.skippedCount += batchResult.skippedCount;
        importResult.failedCount += batchResult.failedCount;
        importResult.errors.push(...batchResult.errors);
        importResult.importedIds.push(...batchResult.importedIds);
        
        // Update session progress and monitoring
        this.sessionService.updateBatchProgress(sessionId, i + 1, importResult.importedCount);
        this.monitoringService.updateSessionProgress(
          sessionId,
          importResult.importedCount + importResult.skippedCount,
          importResult.importedCount,
          importResult.failedCount,
          batchResult.processingTime,
          batchResult.errors.length
        );
        
      } catch (error) {
        // Handle batch failure
        this.batchProcessingService.updateBatchStatus(batches, batch.batchId, 'failed', error.message);
        
        // Try fallback if enabled
        if (batchConfig.enableFallback) {
          const fallbackBatches = this.batchProcessingService.createFallbackBatches(batch, batchConfig);
          
          for (const fallbackBatch of fallbackBatches) {
            try {
              const fallbackResult = await this.processBatch(fallbackBatch, options);
              
              importResult.importedCount += fallbackResult.importedCount;
              importResult.skippedCount += fallbackResult.skippedCount;
              importResult.failedCount += fallbackResult.failedCount;
              importResult.errors.push(...fallbackResult.errors);
              importResult.importedIds.push(...fallbackResult.importedIds);
              
            } catch (fallbackError) {
              importResult.errors.push(`Fallback batch failed: ${fallbackError.message}`);
              importResult.failedCount += fallbackBatch.data.length;
            }
          }
        } else {
          importResult.errors.push(`Batch ${batch.batchId} failed: ${error.message}`);
          importResult.failedCount += batch.data.length;
        }
        
        importResult.success = false;
      }
    }

    const batchStats = this.batchProcessingService.calculateStats(batches);
    
    // Finalize batch processing
    this.sessionService.finalizeBatchProcessing(sessionId, importResult.success);
    
    return { importResult, batchStats };
  }

  private async continueBatchImport(sessionId: string, validatedData: any[]): Promise<void> {
    const batchProgress = this.sessionService.getBatchProgress(sessionId);
    if (!batchProgress) {
      throw new BadRequestException('No batch progress found');
    }

    // Find the next pending batch and continue from there
    const nextBatch = this.sessionService.getNextPendingBatch(sessionId);
    if (!nextBatch) {
      // All batches completed
      this.sessionService.updateSessionStatus(sessionId, 'imported');
      return;
    }

    // Resume batch processing from the next pending batch
    // This is a simplified implementation - in a real scenario, you'd reconstruct the batch processing state
    this.sessionService.updateSessionStatus(sessionId, 'importing');
  }

  private async processBatch(
    batch: BatchData,
    options?: ImportOptions
  ): Promise<{
    success: boolean;
    importedCount: number;
    skippedCount: number;
    failedCount: number;
    errors: string[];
    importedIds: string[];
    processingTime: number;
    error?: string;
  }> {
    const startTime = Date.now();
    const result = {
      success: true,
      importedCount: 0,
      skippedCount: 0,
      failedCount: 0,
      errors: [],
      importedIds: [],
      processingTime: 0,
    };

    try {
      // Use transaction if enabled
      if (options?.enableTransaction !== false) {
        const transactionConfig = this.configService.getTransactionConfig();
        const transactionResult = await this.transactionService.executeTransaction(
          async (queryRunner) => {
            return await this.processBatchData(batch.data, options, queryRunner);
          },
          transactionConfig
        );

        // Record transaction metrics
        this.monitoringService.recordDatabaseOperation(
          'batch_transaction',
          transactionResult.executionTime,
          transactionResult.success,
          transactionResult.executionTime > this.configService.getPerformanceConfig().slowQueryThreshold
        );

        if (transactionResult.success && transactionResult.data) {
          Object.assign(result, transactionResult.data);
        } else {
          result.success = false;
          result.errors.push(transactionResult.error || 'Transaction failed');
          result.failedCount = batch.data.length;
          
          // Record error
          this.monitoringService.recordError(
            `Transaction failed for batch ${batch.batchId}: ${transactionResult.error}`,
            transactionResult.errorType || 'transaction'
          );
        }
      } else {
        const batchResult = await this.processBatchData(batch.data, options);
        Object.assign(result, batchResult);
      }

      result.processingTime = Date.now() - startTime;
      return result;

    } catch (error) {
      result.success = false;
      result.errors.push(error.message);
      result.failedCount = batch.data.length;
      result.processingTime = Date.now() - startTime;
      
      return {
        ...result,
        error: error.message
      };
    }
  }

  private async processBatchData(
    data: any[],
    options?: ImportOptions,
    queryRunner?: any
  ): Promise<{
    importedCount: number;
    skippedCount: number;
    failedCount: number;
    errors: string[];
    importedIds: string[];
  }> {
    const result = {
      importedCount: 0,
      skippedCount: 0,
      failedCount: 0,
      errors: [],
      importedIds: [],
    };

    const repository = queryRunner 
      ? queryRunner.manager.getRepository(Department)
      : this.departmentsRepository;

    // Bulk operations for better performance
    const departmentsToCreate: Partial<Department>[] = [];
    const processedItems: any[] = [];

    for (const rowData of data) {
      try {
        // Check for existing department by name or code
        const existingByName = rowData.name ? 
          await repository.findOne({ where: { name: rowData.name } }) : null;
        const existingByCode = rowData.code ? 
          await repository.findOne({ where: { code: rowData.code } }) : null;

        if (existingByName || existingByCode) {
          if (!options?.skipConflicts) {
            result.errors.push(
              `Row with name "${rowData.name}" ${existingByCode ? `or code "${rowData.code}"` : ''} already exists`
            );
            result.failedCount++;
            continue;
          } else {
            result.skippedCount++;
            continue;
          }
        }

        // Prepare department for bulk creation
        departmentsToCreate.push({
          name: rowData.name,
          code: rowData.code || null,
          description: rowData.description || null
        });
        
        processedItems.push(rowData);

      } catch (error) {
        result.errors.push(`Failed to process row: ${error.message}`);
        result.failedCount++;
      }
    }

    // Bulk insert departments
    if (departmentsToCreate.length > 0) {
      try {
        const insertResult = await repository.insert(departmentsToCreate);
        result.importedCount = insertResult.identifiers.length;
        result.importedIds = insertResult.identifiers.map(id => id.id);
      } catch (error) {
        result.errors.push(`Bulk insert failed: ${error.message}`);
        result.failedCount += departmentsToCreate.length;
      }
    }

    return result;
  }
}
