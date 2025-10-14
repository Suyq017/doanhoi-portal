import { ExcelParserService } from './excelParserService';
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
  ProgressInfo
} from '../../types/import';
import { UserImportData } from '../../types/userImport';

export class BatchImportService {
  private readonly BATCH_SIZE = 200;
  private excelParser = new ExcelParserService();

  /**
   * Parse Excel file to UserImportData array with enhanced validation
   */
  async parseUserFile(file: File, onProgress?: (progress: number) => void): Promise<UserImportData[]> {
    if (onProgress) {
      onProgress(0);
    }

    try {
      // Use simple parsing without client-side validation
      const result = await this.excelParser.parseWithProgress(file, (progress) => {
        // Map detailed progress to simple percentage
        let percentage = 0;
        switch (progress.phase) {
          case 'parsing':
            percentage = progress.percentage * 0.6; // 60% for parsing
            break;
          case 'processing':
            percentage = 60 + (progress.percentage * 0.4); // 40% for processing
            break;
        }
        onProgress?.(percentage);
      });
      
      if (onProgress) {
        onProgress(100);
      }

      return result;
    } catch (error) {
      throw new Error(`Failed to parse file: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Validate client-side data using optimized backend validation with pagination
   */
  async validateClientData(
    data: UserImportData[],
    onProgress?: (progress: { current: number; total: number; percentage: number }) => void
  ): Promise<ClientValidationResult> {
    const VALIDATION_CHUNK_SIZE = 50; // Validate 50 rows at a time
    
    try {
      console.log(`Starting validation for ${data.length} rows in chunks of ${VALIDATION_CHUNK_SIZE}`);
      
      // If data is small enough, send in one request with retry
      if (data.length <= VALIDATION_CHUNK_SIZE) {
        const MAX_RETRIES = 3;
        const RETRY_DELAY = 2000;
        
        // Update progress for single chunk
        onProgress?.({
          current: 0,
          total: 1,
          percentage: 0
        });

        const result = await this.validateSingleChunkWithRetry(data, {
          errorPage: 1,
          errorLimit: 50,
          warningPage: 1,
          warningLimit: 50
        }, MAX_RETRIES, RETRY_DELAY);

        // Update progress completion
        onProgress?.({
          current: 1,
          total: 1,
          percentage: 100
        });

        return result;
      }

      // Split data into chunks
      const chunks = ExcelParserService.chunkArray(data, VALIDATION_CHUNK_SIZE);
      console.log(`Split into ${chunks.length} validation chunks`);

      // Validate each chunk and merge results
      const allValidData: any[] = [];
      const allErrors: any[] = [];
      const allWarnings: any[] = [];
      let totalValid = 0;
      let totalInvalid = 0;
      let totalDuplicates = 0;

      const MAX_RETRIES = 3;
      const RETRY_DELAY = 2000; // 2 seconds between retries

      for (let i = 0; i < chunks.length; i++) {
        const chunk = chunks[i];
        const chunkStartIndex = i * VALIDATION_CHUNK_SIZE;
        const currentBatch = i + 1;
        
        // Update progress - fix currentBatch display
        const progressPercentage = Math.round((currentBatch / chunks.length) * 100);
        onProgress?.({
          current: currentBatch,
          total: chunks.length,
          percentage: progressPercentage
        });
        
        try {
          const chunkResult = await this.validateSingleChunkWithRetry(chunk, {
            errorPage: 1,
            errorLimit: 50,
            warningPage: 1,
            warningLimit: 50
          }, MAX_RETRIES, RETRY_DELAY);
          
          // Merge results
          allValidData.push(...(chunkResult.data || []));
          
          // Adjust row numbers in errors/warnings to match original data indices
          // Backend returns row numbers starting from 2 (Excel row), so adjust for chunk offset
          const adjustedErrors = (chunkResult.errors || []).map((error: any) => {
            if (typeof error === 'object' && error.row) {
              // Convert back to 0-based index, add chunk offset, then convert back to Excel row
              const originalRowIndex = (error.row - 2); // Backend row to 0-based index
              const globalRowIndex = chunkStartIndex + originalRowIndex; // Add chunk offset
              return {
                ...error,
                row: globalRowIndex + 2 // Convert back to Excel row number
              };
            }
            return error;
          });
          
          const adjustedWarnings = (chunkResult.warnings || []).map((warning: any) => {
            if (typeof warning === 'object' && warning.row) {
              const originalRowIndex = (warning.row - 2);
              const globalRowIndex = chunkStartIndex + originalRowIndex;
              return {
                ...warning,
                row: globalRowIndex + 2
              };
            }
            return warning;
          });
          
          allErrors.push(...adjustedErrors);
          allWarnings.push(...adjustedWarnings);
          
          // Accumulate summary stats
          totalValid += chunkResult.summary?.valid || 0;
          totalInvalid += chunkResult.summary?.invalid || 0;
          totalDuplicates += chunkResult.summary?.duplicates || 0;
        } catch (chunkError) {
          console.error(`Validation failed for chunk ${currentBatch} after all retries:`, chunkError);
          // Continue with other chunks, but mark this chunk as all invalid
          totalInvalid += chunk.length;
          
          // Add generic errors for this chunk
          for (let j = 0; j < chunk.length; j++) {
            allErrors.push({
              row: chunkStartIndex + j + 2, // +2 for Excel row number
              column: 'general',
              message: `Validation failed for chunk ${currentBatch}: ${chunkError instanceof Error ? chunkError.message : 'Unknown error'}`,
              severity: 'error'
            });
          }
        }
      }

      console.log(`Validation completed: ${totalValid} valid, ${totalInvalid} invalid, ${allErrors.length} errors, ${allWarnings.length} warnings`);

      // Return merged results
      return {
        isValid: totalValid > 0,
        data: allValidData,
        errors: allErrors,
        warnings: allWarnings,
        summary: {
          total: data.length,
          valid: totalValid,
          invalid: totalInvalid,
          duplicates: totalDuplicates
        }
      };

    } catch (error) {
      throw new Error(`Batch validation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Validate a single chunk of data
   */
  private async validateSingleChunk(
    data: UserImportData[], 
    paginationOptions?: {
      errorPage?: number;
      errorLimit?: number;
      warningPage?: number;
      warningLimit?: number;
    }
  ): Promise<ClientValidationResult> {
    const response = await fetch('/api/users/validate-batch', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ 
        users: data,
        pagination: paginationOptions 
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Backend validation failed: ${response.status} ${response.statusText} - ${errorText}`);
    }

    const validationResult = await response.json();
    
    return {
      isValid: validationResult.isValid,
      data: validationResult.data || [],
      errors: validationResult.errors || [],
      warnings: validationResult.warnings || [],
      summary: validationResult.summary || {
        total: data.length,
        valid: 0,
        invalid: data.length,
        duplicates: 0
      }
    };
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

        // Submit batch with retry mechanism
        const MAX_RETRIES = 3;
        const RETRY_DELAY = 2000; // 2 seconds between retries
        
        try {
          const response = await this.submitSingleBatchWithRetry(request, MAX_RETRIES, RETRY_DELAY);

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
        } catch (batchError) {
          console.error(`Batch ${currentBatch} failed after all retries:`, batchError);
          // Continue with other batches, but mark this batch as all failed
          const batchSize = batchData.length;
          totalProcessed += batchSize;
          totalFailed += batchSize;
          
          // Add generic error for this batch
          allErrors.push(`Batch ${currentBatch} failed after ${MAX_RETRIES} attempts: ${batchError instanceof Error ? batchError.message : 'Unknown error'}`);
        }
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
   * Validate single chunk with retry mechanism
   */
  private async validateSingleChunkWithRetry(
    data: UserImportData[], 
    paginationOptions: {
      errorPage?: number;
      errorLimit?: number;
      warningPage?: number;
      warningLimit?: number;
    },
    maxRetries: number = 3,
    retryDelay: number = 2000
  ): Promise<ClientValidationResult> {
    let lastError: Error | null = null;
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        const result = await this.validateSingleChunk(data, paginationOptions);
        
        // Success - return immediately
        if (attempt > 1) {
          console.log(`Validation succeeded on attempt ${attempt}`);
        }
        return result;
        
      } catch (error) {
        lastError = error as Error;
        console.warn(`Validation attempt ${attempt}/${maxRetries} failed:`, error);
        
        // If this is the last attempt, don't wait
        if (attempt === maxRetries) {
          break;
        }
        
        // Wait before retrying with exponential backoff
        const delay = retryDelay * Math.pow(1.5, attempt - 1);
        console.log(`Waiting ${delay}ms before retry...`);
        await this.delay(delay);
      }
    }
    
    // All attempts failed
    throw new Error(`Validation failed after ${maxRetries} attempts: ${lastError?.message}`);
  }

  /**
   * Submit single batch with retry mechanism
   */
  private async submitSingleBatchWithRetry(
    request: BatchImportRequest,
    maxRetries: number = 3,
    retryDelay: number = 2000
  ): Promise<any> {
    let lastError: Error | null = null;
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        const response = await userService.batchImport(request);
        
        // Success - return immediately
        if (attempt > 1) {
          console.log(`Batch import succeeded on attempt ${attempt}`);
        }
        return response;
        
      } catch (error) {
        lastError = error as Error;
        console.warn(`Batch import attempt ${attempt}/${maxRetries} failed:`, error);
        
        // If this is the last attempt, don't wait
        if (attempt === maxRetries) {
          break;
        }
        
        // Wait before retrying with exponential backoff
        const delay = retryDelay * Math.pow(1.5, attempt - 1);
        console.log(`Waiting ${delay}ms before retry...`);
        await this.delay(delay);
      }
    }
    
    // All attempts failed
    throw new Error(`Batch import failed after ${maxRetries} attempts: ${lastError?.message}`);
  }

  /**
   * Helper method for delays
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Generate unique session ID
   */
  private generateSessionId(): string {
    return `batch_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}

export const batchImportService = new BatchImportService();