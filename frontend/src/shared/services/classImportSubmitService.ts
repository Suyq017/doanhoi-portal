import { apiClient } from './apiClient';
import { ClassImportData } from './classExcelParserService';

export interface ProgressInfo {
    currentBatch: number;
    totalBatches: number;
    processedRecords: number;
    totalRecords: number;
    percentage: number;
    currentOperation: 'parsing' | 'validating' | 'importing';
    message?: string;
}

export interface ImportResult {
    sessionId: string;
    success: boolean;
    importedCount: number;
    skippedCount: number;
    failedCount: number;
    errors: string[];
    message: string;
}

export interface BatchInfo {
    batchNumber: number;
    totalBatches: number;
    sessionId: string;
}

export interface BatchImportResult {
    success: boolean;
    batchResult: {
        processed: number;
        successful: number;
        failed: number;
        errors: string[];
    };
    sessionSummary: {
        sessionId: string;
        totalProcessed: number;
        totalSuccessful: number;
        totalFailed: number;
        errors: string[];
        isComplete: boolean;
    };
}

/**
 * Service for submitting class import data in batches
 * Handles batch processing with progress tracking
 */
export class ClassImportSubmitService {
    private readonly BATCH_SIZE = 200;
    private readonly REQUEST_DELAY = 100; // ms between batches to avoid overwhelming server

    /**
     * Submit class import data in batches
     * @param data - Array of class import data
     * @param onProgress - Callback for progress updates
     * @returns Import result summary
     */
    async submitClassImport(
        data: ClassImportData[],
        onProgress?: (progress: ProgressInfo) => void
    ): Promise<ImportResult> {
        // Validate inputs
        this.validateInputs(data);

        const sessionId = this.generateSessionId();
        const totalBatches = Math.ceil(data.length / this.BATCH_SIZE);

        let totalSuccessful = 0;
        let totalFailed = 0;
        const allErrors: string[] = [];

        try {
            // Process each batch
            for (let i = 0; i < totalBatches; i++) {
                const startIndex = i * this.BATCH_SIZE;
                const endIndex = Math.min(startIndex + this.BATCH_SIZE, data.length);
                const batch = data.slice(startIndex, endIndex);

                // Report progress before processing
                if (onProgress) {
                    onProgress({
                        currentBatch: i + 1,
                        totalBatches,
                        processedRecords: startIndex,
                        totalRecords: data.length,
                        percentage: (startIndex / data.length) * 100,
                        currentOperation: 'importing',
                        message: `Đang xử lý batch ${i + 1}/${totalBatches} (${batch.length} lớp)...`
                    });
                }

                // Submit batch to backend
                const batchResult = await this.submitBatch(
                    batch,
                    {
                        batchNumber: i + 1,
                        totalBatches,
                        sessionId
                    }
                );

                // Accumulate results
                totalSuccessful += batchResult.batchResult.successful;
                totalFailed += batchResult.batchResult.failed;
                if (batchResult.batchResult.errors && batchResult.batchResult.errors.length > 0) {
                    allErrors.push(...batchResult.batchResult.errors);
                }

                // Small delay between batches to avoid overwhelming the server
                if (i < totalBatches - 1) {
                    await this.delay(this.REQUEST_DELAY);
                }
            }

            // Final progress update
            if (onProgress) {
                onProgress({
                    currentBatch: totalBatches,
                    totalBatches,
                    processedRecords: data.length,
                    totalRecords: data.length,
                    percentage: 100,
                    currentOperation: 'importing',
                    message: 'Hoàn thành import!'
                });
            }

            return {
                sessionId,
                success: totalFailed === 0,
                importedCount: totalSuccessful,
                skippedCount: 0,
                failedCount: totalFailed,
                errors: allErrors,
                message: this.generateResultMessage(totalSuccessful, totalFailed, data.length)
            };

        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            throw new Error(`Lỗi trong quá trình import: ${errorMessage}`);
        }
    }

    /**
     * Validate inputs before processing
     */
    private validateInputs(data: ClassImportData[]): void {
        if (!data || data.length === 0) {
            throw new Error('Không có dữ liệu để import');
        }
    }

    /**
     * Submit a single batch to the backend
     */
    private async submitBatch(
        batch: ClassImportData[],
        batchInfo: BatchInfo
    ): Promise<BatchImportResult> {
        try {
            const endpoint = '/classes/import/batch';

            const requestData = {
                classes: batch,
                batchInfo,
                options: {
                    skipDuplicates: false,  // Classes with duplicate names will error
                    validateDepartments: true
                }
            };

            const response = await apiClient.post<BatchImportResult>(endpoint, requestData);
            return response;

        } catch (error) {
            // Handle specific error cases
            if (error instanceof Error) {
                throw new Error(`Batch ${batchInfo.batchNumber} failed: ${error.message}`);
            }
            throw error;
        }
    }

    /**
     * Generate a unique session ID
     */
    private generateSessionId(): string {
        const timestamp = Date.now();
        const random = Math.random().toString(36).substring(2, 11);
        return `class_import_${timestamp}_${random}`;
    }

    /**
     * Generate result message based on import statistics
     */
    private generateResultMessage(
        successful: number,
        failed: number,
        total: number
    ): string {
        if (failed === 0) {
            return `✓ Import thành công ${successful}/${total} lớp học`;
        } else if (successful === 0) {
            return `✗ Import thất bại toàn bộ ${failed}/${total} lớp học`;
        } else {
            return `⚠ Import thành công ${successful}/${total} lớp học, thất bại ${failed} lớp học`;
        }
    }

    /**
     * Delay helper for rate limiting
     */
    private delay(ms: number): Promise<void> {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    /**
     * Calculate optimal batch size based on data characteristics
     */
    calculateOptimalBatchSize(dataSize: number): number {
        if (dataSize < 100) return dataSize; // Process all at once for small datasets
        if (dataSize < 500) return 100;
        if (dataSize < 2000) return 200;
        return 250; // Larger batches for very large datasets
    }

    /**
     * Estimate import duration based on data size
     */
    estimateDuration(dataSize: number): string {
        // Rough estimate: ~100 records per second with batch processing
        const estimatedSeconds = Math.ceil(dataSize / 100);

        if (estimatedSeconds < 60) {
            return `~${estimatedSeconds} giây`;
        }

        const minutes = Math.floor(estimatedSeconds / 60);
        const seconds = estimatedSeconds % 60;

        if (minutes < 60) {
            return seconds > 0 ? `~${minutes} phút ${seconds} giây` : `~${minutes} phút`;
        }

        const hours = Math.floor(minutes / 60);
        const remainingMinutes = minutes % 60;
        return `~${hours} giờ ${remainingMinutes} phút`;
    }
}

// Export singleton instance
export const classImportSubmitService = new ClassImportSubmitService();
