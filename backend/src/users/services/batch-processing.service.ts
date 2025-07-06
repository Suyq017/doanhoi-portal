import { Injectable, Logger } from '@nestjs/common';
import { UserValidationResult } from './import-validation.service';

export interface BatchData<T> {
  batchNumber: number;
  data: T[];
  startIndex: number;
  endIndex: number;
  totalRows: number;
}

export interface BatchProcessingOptions {
  batchSize: number;
  maxRetries: number;
  retryDelay: number; // in milliseconds
  enableFallback: boolean;
  fallbackBatchSize: number;
}

export interface BatchProcessingStats {
  totalBatches: number;
  completedBatches: number;
  failedBatches: number;
  totalRows: number;
  processedRows: number;
  successfulRows: number;
  failedRows: number;
  skippedRows: number;
  processingTime: number; // in milliseconds
  averageTimePerBatch: number; // in milliseconds
  estimatedRemainingTime: number; // in milliseconds
}

@Injectable()
export class UserBatchProcessingService {
  private readonly logger = new Logger(UserBatchProcessingService.name);
  
  private readonly DEFAULT_OPTIONS: BatchProcessingOptions = {
    batchSize: 200,
    maxRetries: 3,
    retryDelay: 1000,
    enableFallback: true,
    fallbackBatchSize: 50
  };

  /**
   * Divide data into batches
   */
  divideToBatches<T>(data: T[], batchSize: number): BatchData<T>[] {
    const batches: BatchData<T>[] = [];
    const totalRows = data.length;
    
    for (let i = 0; i < totalRows; i += batchSize) {
      const endIndex = Math.min(i + batchSize, totalRows);
      const batchData = data.slice(i, endIndex);
      
      batches.push({
        batchNumber: Math.floor(i / batchSize) + 1,
        data: batchData,
        startIndex: i,
        endIndex: endIndex - 1,
        totalRows
      });
    }
    
    return batches;
  }

  /**
   * Get optimized batch size based on data characteristics
   */
  getOptimizedBatchSize(dataSize: number, options: Partial<BatchProcessingOptions> = {}): number {
    const opts = { ...this.DEFAULT_OPTIONS, ...options };
    
    // For large datasets, use larger batch sizes
    if (dataSize > 10000) {
      return Math.min(opts.batchSize * 2, 500);
    }
    
    if (dataSize > 1000) {
      return opts.batchSize;
    }
    
    // For small datasets, use smaller batch sizes
    return Math.max(opts.batchSize / 2, 50);
  }

  /**
   * Calculate processing statistics
   */
  calculateStats(
    startTime: Date,
    endTime: Date,
    totalBatches: number,
    completedBatches: number,
    failedBatches: number,
    totalRows: number,
    processedRows: number,
    successfulRows: number,
    failedRows: number,
    skippedRows: number
  ): BatchProcessingStats {
    const processingTime = endTime.getTime() - startTime.getTime();
    const averageTimePerBatch = completedBatches > 0 ? processingTime / completedBatches : 0;
    const remainingBatches = totalBatches - completedBatches;
    const estimatedRemainingTime = remainingBatches * averageTimePerBatch;

    return {
      totalBatches,
      completedBatches,
      failedBatches,
      totalRows,
      processedRows,
      successfulRows,
      failedRows,
      skippedRows,
      processingTime,
      averageTimePerBatch,
      estimatedRemainingTime
    };
  }

  /**
   * Handle batch retry logic
   */
  async handleRetry<T>(
    batch: BatchData<T>,
    error: Error,
    retryCount: number,
    maxRetries: number,
    retryDelay: number
  ): Promise<boolean> {
    if (retryCount >= maxRetries) {
      this.logger.error(`Batch ${batch.batchNumber} failed after ${maxRetries} retries: ${error.message}`);
      return false;
    }

    this.logger.warn(`Batch ${batch.batchNumber} failed, retrying ${retryCount + 1}/${maxRetries} in ${retryDelay}ms`);
    
    // Wait before retry
    await new Promise(resolve => setTimeout(resolve, retryDelay));
    
    return true;
  }

  /**
   * Create fallback batches with smaller size
   */
  createFallbackBatches<T>(
    originalBatch: BatchData<T>,
    fallbackBatchSize: number
  ): BatchData<T>[] {
    this.logger.log(`Creating fallback batches for batch ${originalBatch.batchNumber} with size ${fallbackBatchSize}`);
    
    const fallbackBatches: BatchData<T>[] = [];
    const data = originalBatch.data;
    
    for (let i = 0; i < data.length; i += fallbackBatchSize) {
      const endIndex = Math.min(i + fallbackBatchSize, data.length);
      const batchData = data.slice(i, endIndex);
      
      fallbackBatches.push({
        batchNumber: originalBatch.batchNumber + (i / fallbackBatchSize) * 0.1, // Sub-batch numbering
        data: batchData,
        startIndex: originalBatch.startIndex + i,
        endIndex: originalBatch.startIndex + endIndex - 1,
        totalRows: originalBatch.totalRows
      });
    }
    
    return fallbackBatches;
  }

  /**
   * Validate batch data integrity
   */
  validateBatchData<T>(batch: BatchData<T>): boolean {
    if (!batch || !batch.data || !Array.isArray(batch.data)) {
      this.logger.error(`Invalid batch data for batch ${batch?.batchNumber}`);
      return false;
    }

    if (batch.data.length === 0) {
      this.logger.warn(`Empty batch data for batch ${batch.batchNumber}`);
      return false;
    }

    if (batch.startIndex < 0 || batch.endIndex < batch.startIndex) {
      this.logger.error(`Invalid batch indices for batch ${batch.batchNumber}`);
      return false;
    }

    return true;
  }

  /**
   * Log batch processing progress
   */
  logProgress(stats: BatchProcessingStats): void {
    const progressPercent = (stats.processedRows / stats.totalRows * 100).toFixed(1);
    const elapsedSeconds = (stats.processingTime / 1000).toFixed(1);
    const estimatedRemainingSeconds = (stats.estimatedRemainingTime / 1000).toFixed(1);

    this.logger.log(
      `User Import Progress: ${stats.completedBatches}/${stats.totalBatches} batches ` +
      `(${progressPercent}%) | ${stats.processedRows}/${stats.totalRows} rows | ` +
      `Elapsed: ${elapsedSeconds}s | ETA: ${estimatedRemainingSeconds}s`
    );
  }

  /**
   * Get default processing options
   */
  getDefaultOptions(): BatchProcessingOptions {
    return { ...this.DEFAULT_OPTIONS };
  }

  /**
   * Merge options with defaults
   */
  mergeOptions(options: Partial<BatchProcessingOptions>): BatchProcessingOptions {
    return { ...this.DEFAULT_OPTIONS, ...options };
  }
}
