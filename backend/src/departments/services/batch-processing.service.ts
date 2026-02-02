import { Injectable, Logger } from "@nestjs/common";

export interface BatchData {
  batchId: string;
  batchIndex: number;
  data: any[];
  startIndex: number;
  endIndex: number;
  status: "pending" | "processing" | "success" | "failed";
  retryCount: number;
  error?: string;
  processingTime?: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface BatchProcessingStats {
  totalBatches: number;
  processedBatches: number;
  successBatches: number;
  failedBatches: number;
  currentBatch: number;
  progressPercent: number;
  estimatedTimeRemaining: number;
  averageProcessingTime: number;
  totalProcessingTime: number;
  errorCount: number;
  retryCount: number;
  startTime: Date;
  endTime?: Date;
}

export interface BatchProcessingConfig {
  batchSize: number;
  maxRetries: number;
  retryDelay: number;
  fallbackBatchSize: number;
  enableFallback: boolean;
  enableOptimizedBatchSize: boolean;
}

@Injectable()
export class DepartmentBatchProcessingService {
  private readonly logger = new Logger(DepartmentBatchProcessingService.name);
  private readonly DEFAULT_CONFIG: BatchProcessingConfig = {
    batchSize: 200,
    maxRetries: 3,
    retryDelay: 1000,
    fallbackBatchSize: 50,
    enableFallback: true,
    enableOptimizedBatchSize: true,
  };

  /**
   * Chia dữ liệu thành các batch với size được tối ưu
   */
  createBatches(
    data: any[],
    config: Partial<BatchProcessingConfig> = {},
  ): BatchData[] {
    const finalConfig = { ...this.DEFAULT_CONFIG, ...config };
    const batchSize = this.getOptimizedBatchSize(data.length, finalConfig);

    const batches: BatchData[] = [];
    const totalBatches = Math.ceil(data.length / batchSize);

    for (let i = 0; i < totalBatches; i++) {
      const startIndex = i * batchSize;
      const endIndex = Math.min(startIndex + batchSize, data.length);
      const batchData = data.slice(startIndex, endIndex);

      batches.push({
        batchId: `batch_${i + 1}_${Date.now()}`,
        batchIndex: i + 1,
        data: batchData,
        startIndex,
        endIndex,
        status: "pending",
        retryCount: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
    }

    this.logger.log(
      `Created ${batches.length} batches with optimized batch size: ${batchSize}`,
    );
    return batches;
  }

  /**
   * Tối ưu batch size dựa trên data size
   */
  private getOptimizedBatchSize(
    dataSize: number,
    config: BatchProcessingConfig,
  ): number {
    if (!config.enableOptimizedBatchSize) {
      return config.batchSize;
    }

    // Tối ưu batch size dựa trên data size
    if (dataSize <= 1000) {
      return 100;
    } else if (dataSize <= 5000) {
      return 200;
    } else if (dataSize <= 10000) {
      return 300;
    } else {
      return 400;
    }
  }

  /**
   * Tính toán progress và thống kê batch processing
   */
  calculateStats(batches: BatchData[]): BatchProcessingStats {
    const totalBatches = batches.length;
    const processedBatches = batches.filter(
      (b) => b.status === "success" || b.status === "failed",
    ).length;
    const successBatches = batches.filter((b) => b.status === "success").length;
    const failedBatches = batches.filter((b) => b.status === "failed").length;
    const currentBatch =
      batches.findIndex((b) => b.status === "processing") + 1 ||
      processedBatches + 1;

    const progressPercent =
      totalBatches > 0 ? (processedBatches / totalBatches) * 100 : 0;

    const completedBatches = batches.filter(
      (b) => b.status === "success" && b.processingTime,
    );
    const averageProcessingTime =
      completedBatches.length > 0
        ? completedBatches.reduce(
          (sum, b) => sum + (b.processingTime || 0),
          0,
        ) / completedBatches.length
        : 0;

    const remainingBatches = totalBatches - processedBatches;
    const estimatedTimeRemaining = remainingBatches * averageProcessingTime;

    const totalProcessingTime = batches.reduce(
      (sum, b) => sum + (b.processingTime || 0),
      0,
    );
    const errorCount = batches.reduce((sum, b) => sum + (b.error ? 1 : 0), 0);
    const retryCount = batches.reduce((sum, b) => sum + b.retryCount, 0);

    const startTime = batches.length > 0 ? batches[0].createdAt : new Date();
    const endTime = processedBatches === totalBatches ? new Date() : undefined;

    return {
      totalBatches,
      processedBatches,
      successBatches,
      failedBatches,
      currentBatch,
      progressPercent,
      estimatedTimeRemaining,
      averageProcessingTime,
      totalProcessingTime,
      errorCount,
      retryCount,
      startTime,
      endTime,
    };
  }

  /**
   * Lấy batch tiếp theo cần xử lý
   */
  getNextPendingBatch(batches: BatchData[]): BatchData | null {
    return batches.find((b) => b.status === "pending") || null;
  }

  /**
   * Lấy batch đang xử lý
   */
  getCurrentProcessingBatch(batches: BatchData[]): BatchData | null {
    return batches.find((b) => b.status === "processing") || null;
  }

  /**
   * Cập nhật trạng thái batch
   */
  updateBatchStatus(
    batches: BatchData[],
    batchId: string,
    status: BatchData["status"],
    error?: string,
    processingTime?: number,
  ): boolean {
    const batch = batches.find((b) => b.batchId === batchId);
    if (!batch) {
      this.logger.warn(`Batch not found: ${batchId}`);
      return false;
    }

    batch.status = status;
    batch.updatedAt = new Date();

    if (error) {
      batch.error = error;
    }

    if (processingTime) {
      batch.processingTime = processingTime;
    }

    this.logger.log(`Updated batch ${batchId} status to ${status}`);
    return true;
  }

  /**
   * Retry logic cho batch thất bại
   */
  canRetryBatch(batch: BatchData, config: BatchProcessingConfig): boolean {
    return batch.status === "failed" && batch.retryCount < config.maxRetries;
  }

  /**
   * Tạo batch retry
   */
  createRetryBatch(
    batch: BatchData,
    _config: BatchProcessingConfig,
  ): BatchData {
    const retryBatch: BatchData = {
      ...batch,
      batchId: `${batch.batchId}_retry_${batch.retryCount + 1}`,
      status: "pending",
      retryCount: batch.retryCount + 1,
      error: undefined,
      processingTime: undefined,
      updatedAt: new Date(),
    };

    this.logger.log(
      `Created retry batch ${retryBatch.batchId} (retry ${retryBatch.retryCount})`,
    );
    return retryBatch;
  }

  /**
   * Fallback mechanism - tạo batch nhỏ hơn khi batch lớn thất bại
   */
  createFallbackBatches(
    failedBatch: BatchData,
    config: BatchProcessingConfig,
  ): BatchData[] {
    if (!config.enableFallback) {
      return [];
    }

    const fallbackBatches: BatchData[] = [];
    const fallbackBatchSize = config.fallbackBatchSize;
    const totalFallbackBatches = Math.ceil(
      failedBatch.data.length / fallbackBatchSize,
    );

    for (let i = 0; i < totalFallbackBatches; i++) {
      const startIndex = i * fallbackBatchSize;
      const endIndex = Math.min(
        startIndex + fallbackBatchSize,
        failedBatch.data.length,
      );
      const fallbackData = failedBatch.data.slice(startIndex, endIndex);

      fallbackBatches.push({
        batchId: `${failedBatch.batchId}_fallback_${i + 1}`,
        batchIndex: failedBatch.batchIndex,
        data: fallbackData,
        startIndex: failedBatch.startIndex + startIndex,
        endIndex: failedBatch.startIndex + endIndex,
        status: "pending",
        retryCount: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
    }

    this.logger.log(
      `Created ${fallbackBatches.length} fallback batches from failed batch ${failedBatch.batchId}`,
    );
    return fallbackBatches;
  }

  /**
   * Validate batch data integrity
   */
  validateBatchData(batch: BatchData): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!batch.data || !Array.isArray(batch.data)) {
      errors.push("Batch data is not an array");
    }

    if (batch.data.length === 0) {
      errors.push("Batch data is empty");
    }

    if (batch.startIndex < 0) {
      errors.push("Invalid start index");
    }

    if (batch.endIndex <= batch.startIndex) {
      errors.push("Invalid end index");
    }

    if (batch.data.length !== batch.endIndex - batch.startIndex) {
      errors.push("Data length does not match index range");
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  /**
   * Tính toán retry delay với exponential backoff
   */
  calculateRetryDelay(retryCount: number, baseDelay: number): number {
    return baseDelay * Math.pow(2, retryCount);
  }

  /**
   * Lấy tổng quan batch processing
   */
  getBatchingSummary(batches: BatchData[]): {
    totalRows: number;
    totalBatches: number;
    averageBatchSize: number;
    largestBatchSize: number;
    smallestBatchSize: number;
  } {
    const totalRows = batches.reduce((sum, b) => sum + b.data.length, 0);
    const totalBatches = batches.length;
    const averageBatchSize = totalBatches > 0 ? totalRows / totalBatches : 0;
    const batchSizes = batches.map((b) => b.data.length);
    const largestBatchSize = Math.max(...batchSizes);
    const smallestBatchSize = Math.min(...batchSizes);

    return {
      totalRows,
      totalBatches,
      averageBatchSize,
      largestBatchSize,
      smallestBatchSize,
    };
  }
}
