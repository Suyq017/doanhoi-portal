import { ExcelParserService } from './excelParserService';
import { ImportValidationService } from './importValidationService';
import { userService } from '../userService';
import { 
  UserImportDto, 
  BatchImportRequest, 
  ImportOptionsDto,
  BatchInfoDto,
  SessionSummaryDto
} from '../../types/user';
import { 
  ClientValidationResult, 
  ClientImportResult, 
  ProgressInfo,
  ValidationError as ImportValidationError
} from '../../types/import';
import { 
  UserImportData, 
  ValidationError as UserValidationError 
} from '../../types/userImport';

export class BatchImportService {
  private readonly BATCH_SIZE = 200;
  private excelParser = new ExcelParserService();
  private validationService = new ImportValidationService();

  /**
   * Parse Excel file to UserImportData array
   */
  async parseUserFile(file: File, onProgress?: (progress: number) => void): Promise<UserImportData[]> {
    if (onProgress) {
      onProgress(0);
    }

    try {
      const data = await this.excelParser.parseUserImportFile(file);
      
      if (onProgress) {
        onProgress(100);
      }

      return data;
    } catch (error) {
      throw new Error(`Failed to parse file: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Validate client-side data
   */
  async validateClientData(data: UserImportData[]): Promise<ClientValidationResult> {
    try {
      const validationResult = await this.validationService.validateUserImportData(data);
      
      // Convert UserValidationError to ImportValidationError format
      const convertErrors = (errors: UserValidationError[]): ImportValidationError[] => {
        return errors.map(error => ({
          row: error.row,
          column: error.field,
          message: error.message,
          severity: error.type === 'validation' ? 'error' : 'warning' as 'error' | 'warning'
        }));
      };
      
      return {
        isValid: validationResult.isValid,
        data: validationResult.data,
        errors: convertErrors(validationResult.errors),
        warnings: convertErrors(validationResult.warnings),
        summary: {
          total: data.length,
          valid: validationResult.data.length,
          invalid: validationResult.errors.length,
          duplicates: validationResult.errors.filter(e => 
            e.message.toLowerCase().includes('duplicate') || 
            e.message.toLowerCase().includes('trùng')
          ).length
        }
      };
    } catch (error) {
      throw new Error(`Validation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Submit client data with batch processing
   */
  async submitClientData(
    data: UserImportData[], 
    onProgress?: (progress: ProgressInfo) => void
  ): Promise<ClientImportResult> {
    const sessionId = this.generateSessionId();
    const batches = ExcelParserService.chunkArray(data, this.BATCH_SIZE);
    const totalBatches = batches.length;
    const totalRecords = data.length;

    let totalProcessed = 0;
    let totalSuccessful = 0;
    let totalFailed = 0;
    const allErrors: string[] = [];

    // Import options with defaults from Phase 3
    const options: ImportOptionsDto = {
      skipDuplicates: true,
      updateExisting: true
    };

    try {
      for (let i = 0; i < batches.length; i++) {
        const currentBatch = i + 1;
        const batchData = batches[i];

        // Update progress
        if (onProgress) {
          onProgress({
            currentBatch,
            totalBatches,
            processedRecords: totalProcessed,
            totalRecords,
            percentage: Math.round((totalProcessed / totalRecords) * 100),
            currentOperation: 'importing'
          });
        }

        // Convert to DTO format
        const userDtos: UserImportDto[] = batchData.map(user => ({
          code: user.code,
          familyName: user.familyName,
          givenName: user.givenName,
          email: user.email || undefined,
          phone: user.phone || undefined,
          gender: user.gender || undefined,
          birthDate: user.birthDate instanceof Date 
            ? user.birthDate.toISOString().split('T')[0] 
            : user.birthDate || undefined,
          identityCard: user.identityCard || undefined,
          admissionYear: user.admissionYear || undefined,
          curriculumYear: user.curriculumYear || undefined,
          facultyCode: user.facultyCode || undefined,
          trainingSystem: user.trainingSystem || undefined,
          trainingLevel: user.trainingLevel || undefined,
          departmentCode: user.managementDepartmentCode || user.trainingDepartmentCode || undefined,
          className: user.className || undefined
        }));

        const batchInfo: BatchInfoDto = {
          sessionId,
          batchNumber: currentBatch,
          totalBatches
        };

        const request: BatchImportRequest = {
          users: userDtos,
          options,
          batchInfo
        };

        // Submit batch
        const response = await userService.batchImport(request);

        // Check if batch failed completely
        if (!response.success && response.batchResult.failed === response.batchResult.processed) {
          // If all records in batch failed, log warning but continue
          console.warn(`Batch ${currentBatch} failed completely:`, response.batchResult.errors);
        }

        // Update totals
        totalProcessed += response.batchResult.processed;
        totalSuccessful += response.batchResult.successful;
        totalFailed += response.batchResult.failed;
        allErrors.push(...response.batchResult.errors);
      }

      // Final progress update
      if (onProgress) {
        onProgress({
          currentBatch: totalBatches,
          totalBatches,
          processedRecords: totalProcessed,
          totalRecords,
          percentage: 100,
          currentOperation: 'importing'
        });
      }

      // Determine overall success - successful if at least some records were processed successfully
      const overallSuccess = totalSuccessful > 0;

      return {
        success: overallSuccess,
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
   * Get batch processing summary
   */
  async getBatchSummary(sessionId: string): Promise<SessionSummaryDto> {
    return userService.getBatchSummary(sessionId);
  }

  /**
   * Cancel batch import session
   */
  async cancelBatchImport(sessionId: string): Promise<void> {
    return userService.cancelBatchImport(sessionId);
  }

  /**
   * Generate unique session ID
   */
  private generateSessionId(): string {
    return `batch_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}

export const batchImportService = new BatchImportService();