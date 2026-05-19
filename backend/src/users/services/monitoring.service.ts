import { Injectable, Logger } from "@nestjs/common";

export interface PerformanceMetrics {
  sessionId: string;
  startTime: Date;
  endTime?: Date;
  totalRows: number;
  processedRows: number;
  successfulRows: number;
  failedRows: number;
  averageRowsPerSecond: number;
  peakMemoryUsage: number; // MB
  currentMemoryUsage: number; // MB
  cpuUsage?: number; // Percentage
  batchStats: {
    totalBatches: number;
    completedBatches: number;
    failedBatches: number;
    averageBatchTime: number; // milliseconds
    slowestBatchTime: number; // milliseconds
    fastestBatchTime: number; // milliseconds
  };
}

@Injectable()
export class UserImportMonitoringService {
  private readonly logger = new Logger(UserImportMonitoringService.name);
  private metrics = new Map<string, PerformanceMetrics>();
  private intervalId: NodeJS.Timeout | null = null;

  constructor() {
    this.startMonitoring();
  }

  private startMonitoring(): void {
    // Monitor every 5 seconds
    this.intervalId = setInterval(() => {
      this.collectSystemMetrics();
    }, 5000);
    if (typeof (this.intervalId as any).unref === "function") {
      (this.intervalId as any).unref();
    }
  }

  private collectSystemMetrics(): void {
    const memoryUsage = process.memoryUsage();
    const currentMemoryMB = memoryUsage.heapUsed / (1024 * 1024);

    // Update current memory usage for all active sessions
    for (const [_sessionId, metric] of this.metrics.entries()) {
      if (!metric.endTime) {
        metric.currentMemoryUsage = currentMemoryMB;
        metric.peakMemoryUsage = Math.max(
          metric.peakMemoryUsage,
          currentMemoryMB,
        );
      }
    }

    // Log warning if memory usage is high
    if (currentMemoryMB > 512) {
      this.logger.warn(
        `High memory usage detected: ${currentMemoryMB.toFixed(2)}MB`,
      );
    }
  }

  startSession(sessionId: string, totalRows: number): void {
    const metric: PerformanceMetrics = {
      sessionId,
      startTime: new Date(),
      totalRows,
      processedRows: 0,
      successfulRows: 0,
      failedRows: 0,
      averageRowsPerSecond: 0,
      peakMemoryUsage: 0,
      currentMemoryUsage: 0,
      batchStats: {
        totalBatches: 0,
        completedBatches: 0,
        failedBatches: 0,
        averageBatchTime: 0,
        slowestBatchTime: 0,
        fastestBatchTime: Number.MAX_VALUE,
      },
    };

    this.metrics.set(sessionId, metric);
    this.logger.log(
      `Started monitoring session ${sessionId} with ${totalRows} rows`,
    );
  }

  updateProgress(
    sessionId: string,
    processedRows: number,
    successfulRows: number,
    failedRows: number,
  ): void {
    const metric = this.metrics.get(sessionId);
    if (!metric) return;

    metric.processedRows = processedRows;
    metric.successfulRows = successfulRows;
    metric.failedRows = failedRows;

    // Calculate processing speed
    const elapsedSeconds = (Date.now() - metric.startTime.getTime()) / 1000;
    if (elapsedSeconds > 0) {
      metric.averageRowsPerSecond = processedRows / elapsedSeconds;
    }
  }

  updateBatchStats(
    sessionId: string,
    batchNumber: number,
    batchTime: number,
    success: boolean,
  ): void {
    const metric = this.metrics.get(sessionId);
    if (!metric) return;

    metric.batchStats.totalBatches = Math.max(
      metric.batchStats.totalBatches,
      batchNumber,
    );

    if (success) {
      metric.batchStats.completedBatches++;
      metric.batchStats.fastestBatchTime = Math.min(
        metric.batchStats.fastestBatchTime,
        batchTime,
      );
      metric.batchStats.slowestBatchTime = Math.max(
        metric.batchStats.slowestBatchTime,
        batchTime,
      );

      // Calculate average batch time
      const totalCompletedTime =
        metric.batchStats.averageBatchTime *
        (metric.batchStats.completedBatches - 1) +
        batchTime;
      metric.batchStats.averageBatchTime =
        totalCompletedTime / metric.batchStats.completedBatches;
    } else {
      metric.batchStats.failedBatches++;
    }
  }

  endSession(sessionId: string): PerformanceMetrics | null {
    const metric = this.metrics.get(sessionId);
    if (!metric) return null;

    metric.endTime = new Date();

    // Log final statistics
    const totalTimeSeconds =
      (metric.endTime.getTime() - metric.startTime.getTime()) / 1000;
    this.logger.log(
      `Session ${sessionId} completed in ${totalTimeSeconds.toFixed(2)}s`,
    );
    this.logger.log(
      `Processed ${metric.processedRows}/${metric.totalRows} rows`,
    );
    this.logger.log(
      `Success rate: ${((metric.successfulRows / metric.processedRows) * 100).toFixed(1)}%`,
    );
    this.logger.log(
      `Average speed: ${metric.averageRowsPerSecond.toFixed(2)} rows/second`,
    );
    this.logger.log(
      `Peak memory usage: ${metric.peakMemoryUsage.toFixed(2)}MB`,
    );

    return metric;
  }

  getMetrics(sessionId: string): PerformanceMetrics | null {
    return this.metrics.get(sessionId) || null;
  }

  getAllActiveMetrics(): PerformanceMetrics[] {
    return Array.from(this.metrics.values()).filter(
      (metric) => !metric.endTime,
    );
  }

  cleanupOldMetrics(): void {
    const cutoffTime = Date.now() - 24 * 60 * 60 * 1000; // 24 hours ago

    for (const [sessionId, metric] of this.metrics.entries()) {
      if (metric.endTime && metric.endTime.getTime() < cutoffTime) {
        this.metrics.delete(sessionId);
        this.logger.log(`Cleaned up metrics for session ${sessionId}`);
      }
    }
  }

  getSystemHealth(): {
    memoryUsage: number;
    activeSessions: number;
    totalProcessedRows: number;
    averageProcessingSpeed: number;
  } {
    const memoryUsage = process.memoryUsage().heapUsed / (1024 * 1024);
    const activeMetrics = this.getAllActiveMetrics();

    const totalProcessedRows = activeMetrics.reduce(
      (sum, metric) => sum + metric.processedRows,
      0,
    );
    const averageSpeed =
      activeMetrics.length > 0
        ? activeMetrics.reduce(
          (sum, metric) => sum + metric.averageRowsPerSecond,
          0,
        ) / activeMetrics.length
        : 0;

    return {
      memoryUsage: parseFloat(memoryUsage.toFixed(2)),
      activeSessions: activeMetrics.length,
      totalProcessedRows,
      averageProcessingSpeed: parseFloat(averageSpeed.toFixed(2)),
    };
  }

  onModuleDestroy(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
    }
  }
}
