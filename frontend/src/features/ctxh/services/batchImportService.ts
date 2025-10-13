import { authService } from '../../auth/services/authService';
import { 
  ParticipantValidationData, 
  GradingValidationData
} from './importValidationService';

export interface BatchSubmissionResult {
  success: boolean;
  sessionId: string;
  batchResults: BatchResult[];
  sessionSummary: {
    totalProcessed: number;
    totalSuccessful: number;
    totalFailed: number;
    totalSkipped: number;
    isComplete: boolean;
  };
  errors: string[];
  message: string;
}

export interface BatchResult {
  batchNumber: number;
  processed: number;
  successful: number;
  failed: number;
  errors: string[];
}

export interface ProgressInfo {
  currentBatch: number;
  totalBatches: number;
  processedRecords: number;
  totalRecords: number;
  percentage: number;
  currentOperation: 'parsing' | 'validating' | 'importing';
}

export class BatchImportService {
  private readonly DEFAULT_BATCH_SIZE = 50; // Smaller batches for CTXH

  /**
   * Submit participant data in batches
   */
  async submitParticipantBatches(
    activityId: string,  // Changed from number to string for UUID
    validData: ParticipantValidationData[],
    onProgress?: (progress: ProgressInfo) => void
  ): Promise<BatchSubmissionResult> {
    const sessionId = `participant_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const totalBatches = Math.ceil(validData.length / this.DEFAULT_BATCH_SIZE);
    const batchResults: BatchResult[] = [];
    
    let totalSuccessful = 0;
    let totalFailed = 0;
    let totalSkipped = 0;

    try {
      for (let i = 0; i < totalBatches; i++) {
        const batch = validData.slice(i * this.DEFAULT_BATCH_SIZE, (i + 1) * this.DEFAULT_BATCH_SIZE);
        
        // Update progress
        const progress: ProgressInfo = {
          currentBatch: i + 1,
          totalBatches,
          processedRecords: i * this.DEFAULT_BATCH_SIZE,
          totalRecords: validData.length,
          percentage: Math.round(((i + 1) / totalBatches) * 100),
          currentOperation: 'importing'
        };
        onProgress?.(progress);

        try {
          const batchResult = await this.submitParticipantBatch(activityId, batch, i + 1);
          batchResults.push(batchResult);
          
          totalSuccessful += batchResult.successful;
          totalFailed += batchResult.failed;
          
          // Small delay between batches
          if (i < totalBatches - 1) {
            await new Promise(resolve => setTimeout(resolve, 200));
          }
        } catch (error) {
          console.error(`Batch ${i + 1} failed:`, error);
          const failedBatch: BatchResult = {
            batchNumber: i + 1,
            processed: batch.length,
            successful: 0,
            failed: batch.length,
            errors: [`Batch ${i + 1} failed: ${error instanceof Error ? error.message : 'Unknown error'}`]
          };
          batchResults.push(failedBatch);
          totalFailed += batch.length;
        }
      }

      return {
        success: totalSuccessful > 0,
        sessionId,
        batchResults,
        sessionSummary: {
          totalProcessed: validData.length,
          totalSuccessful,
          totalFailed,
          totalSkipped,
          isComplete: true
        },
        errors: batchResults.flatMap(r => r.errors),
        message: `Import completed: ${totalSuccessful} successful, ${totalFailed} failed`
      };

    } catch (error) {
      console.error('Batch submission failed:', error);
      throw new Error(`Batch import failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Submit grading data in batches
   */
  async submitGradingBatches(
    activityId: string,  // Changed from number to string for UUID
    validData: GradingValidationData[],
    onProgress?: (progress: ProgressInfo) => void
  ): Promise<BatchSubmissionResult> {
    const sessionId = `grading_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const totalBatches = Math.ceil(validData.length / this.DEFAULT_BATCH_SIZE);
    const batchResults: BatchResult[] = [];
    
    let totalSuccessful = 0;
    let totalFailed = 0;
    let totalSkipped = 0;

    try {
      for (let i = 0; i < totalBatches; i++) {
        const batch = validData.slice(i * this.DEFAULT_BATCH_SIZE, (i + 1) * this.DEFAULT_BATCH_SIZE);
        
        // Update progress
        const progress: ProgressInfo = {
          currentBatch: i + 1,
          totalBatches,
          processedRecords: i * this.DEFAULT_BATCH_SIZE,
          totalRecords: validData.length,
          percentage: Math.round(((i + 1) / totalBatches) * 100),
          currentOperation: 'importing'
        };
        onProgress?.(progress);

        try {
          const batchResult = await this.submitGradingBatch(activityId, batch, i + 1);
          batchResults.push(batchResult);
          
          totalSuccessful += batchResult.successful;
          totalFailed += batchResult.failed;
          
          // Small delay between batches
          if (i < totalBatches - 1) {
            await new Promise(resolve => setTimeout(resolve, 200));
          }
        } catch (error) {
          console.error(`Grading batch ${i + 1} failed:`, error);
          const failedBatch: BatchResult = {
            batchNumber: i + 1,
            processed: batch.length,
            successful: 0,
            failed: batch.length,
            errors: [`Batch ${i + 1} failed: ${error instanceof Error ? error.message : 'Unknown error'}`]
          };
          batchResults.push(failedBatch);
          totalFailed += batch.length;
        }
      }

      return {
        success: totalSuccessful > 0,
        sessionId,
        batchResults,
        sessionSummary: {
          totalProcessed: validData.length,
          totalSuccessful,
          totalFailed,
          totalSkipped,
          isComplete: true
        },
        errors: batchResults.flatMap(r => r.errors),
        message: `Grading completed: ${totalSuccessful} successful, ${totalFailed} failed`
      };

    } catch (error) {
      console.error('Grading batch submission failed:', error);
      throw new Error(`Grading batch import failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Submit single participant batch
   */
  private async submitParticipantBatch(
    activityId: string,  // Changed from number to string for UUID
    batch: ParticipantValidationData[],
    batchNumber: number
  ): Promise<BatchResult> {
    const token = authService.getAccessToken();
    
    // Prepare batch data for new batch endpoint
    const batchData = {
      students: batch.map(participant => ({
        student_code: participant.studentCode
      }))
    };

    try {
      const response = await fetch(`/api/ctxh/activities/${activityId}/participants/batch`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token && { 'Authorization': `Bearer ${token}` })
        },
        body: JSON.stringify(batchData)
      });

      if (response.ok) {
        const result = await response.json();
        return {
          batchNumber,
          processed: result.total,
          successful: result.successful?.length || 0,
          failed: result.failed?.length || 0,
          errors: result.failed?.map((f: any) => `${f.student_code}: ${f.error}`) || []
        };
      } else {
        const errorText = await response.text();
        throw new Error(errorText);
      }
    } catch (error) {
      throw new Error(`Participant batch ${batchNumber} failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Submit single grading batch
   */
  private async submitGradingBatch(
    activityId: string,  // Changed from number to string for UUID
    batch: GradingValidationData[],
    batchNumber: number
  ): Promise<BatchResult> {
    const token = authService.getAccessToken();
    
    // Prepare grading data for new batch endpoint
    const batchData = {
      participants: batch.map(grading => ({
        participation_id: grading._participantId!,
        actual_days: grading.actualDays,
        note: grading.note || ''
      }))
    };

    try {
      const response = await fetch(`/api/ctxh/activities/${activityId}/participants/grade-batch`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token && { 'Authorization': `Bearer ${token}` })
        },
        body: JSON.stringify(batchData)
      });

      if (response.ok) {
        const result = await response.json();
        return {
          batchNumber,
          processed: result.total,
          successful: result.successful?.length || 0,
          failed: result.failed?.length || 0,
          errors: result.failed?.map((f: any) => `Participant ${f.participation_id}: ${f.error}`) || []
        };
      } else {
        const errorText = await response.text();
        throw new Error(errorText);
      }
    } catch (error) {
      throw new Error(`Grading batch ${batchNumber} failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Create a simple client-side validation result for ImportModal compatibility
   */
  createValidationResult<T extends ParticipantValidationData | GradingValidationData>(
    allData: T[],
    validationResult?: any,
    parseErrors: any[] = []
  ): any {
    // Use validData for submission, but show all data in preview
    const validData = validationResult?.validData || allData.filter((item: T) => !item._hasError);
    const invalidData = allData.filter((item: T) => item._hasError);
    
    // Create errors array with proper row numbering matching UI display
    const errors = invalidData.map((item) => {
      // Find the original index in the full data array
      const originalIndex = allData.findIndex(d => d === item);
      return {
        row: originalIndex + 1, // +1 for UI row numbering (starts from 1)
        column: 'studentCode',
        message: item._errorMessage || 'Unknown error',
        severity: 'error' as const
      };
    });

    // Extract warnings from validation result if available
    const warnings = validationResult?.warnings?.map((warning: any) => ({
      row: warning.row,
      column: warning.field || 'studentCode',
      message: warning.message,
      severity: 'warning' as const
    })) || [];

    // Mark data with proper hasErrors flag for ImportModal display
    const previewData = allData.map(item => {
      const hasErrors = Boolean(item._hasError);
      return {
        ...item,
        hasErrors: hasErrors, // This will determine red X vs green checkmark
        hasWarnings: false, 
        _hasError: item._hasError   
      };
    });

    return {
      data: validData, // Only valid data will be submitted
      previewData: previewData, // Show all data in preview with proper error flags
      summary: {
        total: allData.length,
        valid: validData.length,
        invalid: invalidData.length
      },
      errors: [...parseErrors, ...errors],
      warnings: warnings
    };
  }
}

export const batchImportService = new BatchImportService();