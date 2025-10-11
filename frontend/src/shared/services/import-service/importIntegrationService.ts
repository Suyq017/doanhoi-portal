import { ExcelParserService } from './excelParserService';
import { ImportValidationService } from './importValidationService';
import { UserImportData, ProgressInfo, BatchInfo } from '../../types/userImport';
import { ImportModalConfig, ClientValidationResult, ClientImportResult } from '../../types/import';

/**
 * Integration service to connect ExcelParser and ValidationService with ImportModal
 */
export class ImportIntegrationService {
  private parserService: ExcelParserService;
  private validationService: ImportValidationService;

  constructor() {
    this.parserService = new ExcelParserService();
    this.validationService = new ImportValidationService();
  }

  /**
   * Create ImportModalConfig for User imports with client-side processing
   */
  static createUserImportConfig(): Omit<ImportModalConfig, 'onSuccess' | 'onError'> {
    const integrationService = new ImportIntegrationService();

    return {
      useClientSideProcessing: true,
      enableBatchProcessing: true,
      batchSize: 200,
      acceptedFileTypes: ['.xlsx', '.xls'],
      maxFileSize: 50 * 1024 * 1024, // 50MB
      entityName: 'users',

      // Required columns configuration for ImportModal
      columns: [
        { key: 'code', label: 'Mã số sinh viên', type: 'text', required: true },
        { key: 'familyName', label: 'Họ và tên đệm', type: 'text', required: true },
        { key: 'givenName', label: 'Tên', type: 'text', required: true },
        { key: 'email', label: 'Email', type: 'email', required: false },
        { key: 'phone', label: 'Số điện thoại', type: 'text', required: false }
      ],

      // Client-side processing functions
      parseFile: async (file: File, onProgress?: (progress: number) => void) => {
        return await integrationService.parseUserFile(file, onProgress);
      },

      validateClientData: async (data: UserImportData[]) => {
        return await integrationService.validateUserData(data);
      },

      submitClientData: async (data: UserImportData[], onProgress?: (progress: ProgressInfo) => void) => {
        return await integrationService.submitUserDataInBatches(data, onProgress);
      }
    };
  }

  /**
   * Parse user import file using ExcelParserService
   */
  async parseUserFile(file: File, onProgress?: (progress: number) => void): Promise<UserImportData[]> {
    try {
      const data = await this.parserService.parseUserImportFile(file);
      
      // Simulate progress for large files
      if (onProgress) {
        for (let i = 0; i <= 100; i += 10) {
          onProgress(i);
          await new Promise(resolve => setTimeout(resolve, 50)); // Small delay
        }
      }

      return data;
    } catch (error) {
      throw new Error(`Failed to parse Excel file: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Validate user data using ImportValidationService
   */
  async validateUserData(data: UserImportData[]): Promise<ClientValidationResult> {
    try {
      const validationResult = await this.validationService.validateUserImportData(data);
      
      // Convert ValidationResult to ClientValidationResult format
      return {
        isValid: validationResult.isValid,
        data: validationResult.data,
        errors: validationResult.errors.map(err => ({
          row: err.row,
          column: err.field,
          message: err.message,
          severity: err.type === 'validation' ? 'error' as const : 'warning' as const
        })),
        warnings: validationResult.warnings.map(warn => ({
          row: warn.row,
          column: warn.field,
          message: warn.message,
          severity: 'warning' as const
        })),
        summary: {
          total: validationResult.summary.total,
          valid: validationResult.summary.valid,
          invalid: validationResult.summary.invalid,
          duplicates: validationResult.summary.duplicates
        }
      };
    } catch (error) {
      throw new Error(`Failed to validate data: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Submit user data in batches to backend API
   */
  async submitUserDataInBatches(
    data: UserImportData[], 
    onProgress?: (progress: ProgressInfo) => void
  ): Promise<ClientImportResult> {
    const batchSize = 200;
    const batches = ExcelParserService.chunkArray(data, batchSize);
    const sessionId = `import_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    let totalProcessed = 0;
    let totalSuccessful = 0;
    let totalFailed = 0;
    const allErrors: string[] = [];

    try {
      for (let i = 0; i < batches.length; i++) {
        const batch = batches[i];
        const batchInfo: BatchInfo = {
          batchNumber: i + 1,
          totalBatches: batches.length,
          sessionId
        };

        // Update progress
        const progress: ProgressInfo = {
          currentBatch: i + 1,
          totalBatches: batches.length,
          processedRecords: totalProcessed,
          totalRecords: data.length,
          percentage: Math.round(((i + 1) / batches.length) * 100),
          currentOperation: 'importing'
        };

        onProgress?.(progress);

        try {
          // Call backend API
          const batchResult = await this.submitBatch(batch, batchInfo);
          
          totalProcessed += batchResult.processed;
          totalSuccessful += batchResult.successful;
          totalFailed += batchResult.failed;
          allErrors.push(...batchResult.errors);

          // Small delay to prevent server overload
          await new Promise(resolve => setTimeout(resolve, 100));

        } catch (error) {
          console.error(`Batch ${i + 1} failed:`, error);
          totalFailed += batch.length;
          allErrors.push(`Batch ${i + 1}: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
      }

      return {
        success: totalFailed === 0,
        sessionSummary: {
          totalProcessed,
          totalSuccessful,
          totalFailed,
          isComplete: true
        },
        errors: allErrors
      };

    } catch (error) {
      throw new Error(`Batch import failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Submit single batch to backend API
   */
  private async submitBatch(batch: UserImportData[], batchInfo: BatchInfo) {
    const response = await fetch('/api/users/import/batch', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        users: batch,
        batchInfo,
        options: {
          skipDuplicates: true,
          updateExisting: false,
          dryRun: false
        }
      })
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || `HTTP ${response.status}: ${response.statusText}`);
    }

    const result = await response.json();
    return result.batchResult;
  }

  /**
   * Create export template for users
   */
  static createExportTemplate(): void {
    // Use existing ExcelExportService
    const { ExcelExportService } = require('./excelExportService');
    ExcelExportService.createUserImportTemplate({
      filename: 'Template_Import_Users.xlsx'
    });
  }
}