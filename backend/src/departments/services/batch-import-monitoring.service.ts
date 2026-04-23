import { Injectable, Logger } from "@nestjs/common";
import { DepartmentBatchImportConfigService } from "./batch-import-config.service";

export interface PerformanceMetrics {
  // Memory Metrics
  memoryUsage: {
    heapUsed: number;
    heapTotal: number;
    external: number;
    rss: number;
    arrayBuffers: number;
  };

  // Processing Metrics
  processingStats: {
    totalSessions: number;
    activeSessions: number;
    completedSessions: number;
    failedSessions: number;
    averageProcessingTime: number;
    throughput: number; // rows per second
  };

  // Database Metrics
  databaseStats: {
    activeConnections: number;
    idleConnections: number;
    totalQueries: number;
    slowQueries: number;
    averageQueryTime: number;
    deadlocks: number;
  };

  // Error Metrics
  errorStats: {
    totalErrors: number;
    errorRate: number;
    errorsByType: Record<string, number>;
    recentErrors: string[];
  };

  // System Metrics
  systemStats: {
    cpuUsage: number;
    uptime: number;
    loadAverage: number[];
    timestamp: Date;
  };
}

export interface SessionMetrics {
  sessionId: string;
  fileName: string;
  startTime: Date;
  endTime?: Date;
  duration: number;
  totalRows: number;
  processedRows: number;
  successRows: number;
  failedRows: number;
  memoryUsage: number;
  averageBatchTime: number;
  errorCount: number;
  status: string;
}

@Injectable()
export class DepartmentBatchImportMonitoringService {
  private readonly logger = new Logger(
    DepartmentBatchImportMonitoringService.name,
  );

  private sessionMetrics: Map<string, SessionMetrics> = new Map();
  private performanceHistory: PerformanceMetrics[] = [];
  private readonly maxHistorySize = 100;

  private processingStats = {
    totalSessions: 0,
    activeSessions: 0,
    completedSessions: 0,
    failedSessions: 0,
    totalProcessingTime: 0,
    totalRowsProcessed: 0,
  };

  private databaseStats = {
    activeConnections: 0,
    idleConnections: 0,
    totalQueries: 0,
    slowQueries: 0,
    totalQueryTime: 0,
    deadlocks: 0,
  };

  private errorStats = {
    totalErrors: 0,
    errorsByType: new Map<string, number>(),
    recentErrors: [] as string[],
  };

  constructor(
    private readonly configService: DepartmentBatchImportConfigService,
  ) {
    this.startMonitoring();
  }

  /**
   * Start monitoring process
   */
  private startMonitoring(): void {
    const config = this.configService.getPerformanceConfig();

    if (config.enablePerformanceMonitoring) {
      setInterval(() => {
        this.collectMetrics();
      }, config.performanceLoggingInterval);

      this.logger.log("Performance monitoring started");
    }
  }

  /**
   * Initialize session monitoring
   */
  initializeSessionMonitoring(
    sessionId: string,
    fileName: string,
    totalRows: number,
  ): void {
    const sessionMetrics: SessionMetrics = {
      sessionId,
      fileName,
      startTime: new Date(),
      duration: 0,
      totalRows,
      processedRows: 0,
      successRows: 0,
      failedRows: 0,
      memoryUsage: 0,
      averageBatchTime: 0,
      errorCount: 0,
      status: "initialized",
    };

    this.sessionMetrics.set(sessionId, sessionMetrics);
    this.processingStats.totalSessions++;
    this.processingStats.activeSessions++;
  }

  /**
   * Update session progress
   */
  updateSessionProgress(
    sessionId: string,
    processedRows: number,
    successRows: number,
    failedRows: number,
    batchTime: number,
    errorCount: number = 0,
  ): void {
    const metrics = this.sessionMetrics.get(sessionId);
    if (!metrics) return;

    metrics.processedRows = processedRows;
    metrics.successRows = successRows;
    metrics.failedRows = failedRows;
    metrics.errorCount = errorCount;
    metrics.duration = Date.now() - metrics.startTime.getTime();

    // Update average batch time
    if (batchTime > 0) {
      const currentAvg = metrics.averageBatchTime;
      const totalBatches = Math.ceil(processedRows / 200); // Assuming 200 rows per batch
      metrics.averageBatchTime =
        totalBatches === 1 ? batchTime : (currentAvg + batchTime) / 2;
    }

    // Update memory usage
    metrics.memoryUsage = this.getCurrentMemoryUsage();

    this.sessionMetrics.set(sessionId, metrics);
  }

  /**
   * Finalize session monitoring
   */
  finalizeSessionMonitoring(sessionId: string, success: boolean): void {
    const metrics = this.sessionMetrics.get(sessionId);
    if (!metrics) return;

    metrics.endTime = new Date();
    metrics.duration = metrics.endTime.getTime() - metrics.startTime.getTime();
    metrics.status = success ? "completed" : "failed";

    // Update global stats
    this.processingStats.activeSessions--;
    if (success) {
      this.processingStats.completedSessions++;
    } else {
      this.processingStats.failedSessions++;
    }

    this.processingStats.totalProcessingTime += metrics.duration;
    this.processingStats.totalRowsProcessed += metrics.processedRows;

    this.logger.log(
      `Session ${sessionId} finalized: ${success ? "success" : "failed"}, Duration: ${metrics.duration}ms`,
    );
  }

  /**
   * Record database operation
   */
  recordDatabaseOperation(
    operationType: string,
    queryTime: number,
    success: boolean,
    isSlowQuery: boolean = false,
  ): void {
    this.databaseStats.totalQueries++;
    this.databaseStats.totalQueryTime += queryTime;

    if (isSlowQuery) {
      this.databaseStats.slowQueries++;
      this.logger.warn(
        `Slow query detected: ${operationType} took ${queryTime}ms`,
      );
    }

    if (!success) {
      this.recordError(
        `Database operation failed: ${operationType}`,
        "database",
      );
    }
  }

  /**
   * Record deadlock
   */
  recordDeadlock(sessionId: string, batchId: string): void {
    this.databaseStats.deadlocks++;
    this.recordError(
      `Deadlock detected in session ${sessionId}, batch ${batchId}`,
      "deadlock",
    );
  }

  /**
   * Record error
   */
  recordError(error: string, type: string = "general"): void {
    this.errorStats.totalErrors++;

    const currentCount = this.errorStats.errorsByType.get(type) || 0;
    this.errorStats.errorsByType.set(type, currentCount + 1);

    this.errorStats.recentErrors.push(error);
    if (this.errorStats.recentErrors.length > 50) {
      this.errorStats.recentErrors.shift();
    }

    this.logger.error(`Error recorded [${type}]: ${error}`);
  }

  /**
   * Get current performance metrics
   */
  getCurrentMetrics(): PerformanceMetrics {
    const memoryUsage = process.memoryUsage();
    const cpuUsage = process.cpuUsage();

    // loadavg is not available on Windows, so we use a fallback
    let loadAverage: number[];
    try {
      loadAverage = (process as any).loadavg
        ? (process as any).loadavg()
        : [0, 0, 0];
    } catch {
      loadAverage = [0, 0, 0];
    }

    return {
      memoryUsage: {
        heapUsed: memoryUsage.heapUsed,
        heapTotal: memoryUsage.heapTotal,
        external: memoryUsage.external,
        rss: memoryUsage.rss,
        arrayBuffers: memoryUsage.arrayBuffers,
      },
      processingStats: {
        totalSessions: this.processingStats.totalSessions,
        activeSessions: this.processingStats.activeSessions,
        completedSessions: this.processingStats.completedSessions,
        failedSessions: this.processingStats.failedSessions,
        averageProcessingTime:
          this.processingStats.totalSessions > 0
            ? this.processingStats.totalProcessingTime /
              this.processingStats.totalSessions
            : 0,
        throughput: this.calculateThroughput(),
      },
      databaseStats: {
        activeConnections: this.databaseStats.activeConnections,
        idleConnections: this.databaseStats.idleConnections,
        totalQueries: this.databaseStats.totalQueries,
        slowQueries: this.databaseStats.slowQueries,
        averageQueryTime:
          this.databaseStats.totalQueries > 0
            ? this.databaseStats.totalQueryTime /
              this.databaseStats.totalQueries
            : 0,
        deadlocks: this.databaseStats.deadlocks,
      },
      errorStats: {
        totalErrors: this.errorStats.totalErrors,
        errorRate: this.calculateErrorRate(),
        errorsByType: Object.fromEntries(this.errorStats.errorsByType),
        recentErrors: [...this.errorStats.recentErrors],
      },
      systemStats: {
        cpuUsage: (cpuUsage.user + cpuUsage.system) / 1000000, // Convert to seconds
        uptime: process.uptime(),
        loadAverage,
        timestamp: new Date(),
      },
    };
  }

  /**
   * Get session metrics
   */
  getSessionMetrics(sessionId: string): SessionMetrics | null {
    return this.sessionMetrics.get(sessionId) || null;
  }

  /**
   * Get all active sessions
   */
  getActiveSessionsMetrics(): SessionMetrics[] {
    return Array.from(this.sessionMetrics.values()).filter(
      (metrics) => !metrics.endTime,
    );
  }

  /**
   * Get performance history
   */
  getPerformanceHistory(): PerformanceMetrics[] {
    return [...this.performanceHistory];
  }

  /**
   * Check memory usage warning
   */
  checkMemoryWarning(): { warning: boolean; message?: string } {
    const memoryConfig = this.configService.getMemoryConfig();
    const currentMemory = this.getCurrentMemoryUsage();

    if (currentMemory > memoryConfig.memoryWarningThreshold) {
      return {
        warning: true,
        message: `Memory usage (${Math.round(currentMemory / 1024 / 1024)}MB) exceeds warning threshold (${Math.round(memoryConfig.memoryWarningThreshold / 1024 / 1024)}MB)`,
      };
    }

    return { warning: false };
  }

  /**
   * Get system health status
   */
  getSystemHealth(): {
    status: "healthy" | "warning" | "critical";
    issues: string[];
    metrics: PerformanceMetrics;
  } {
    const metrics = this.getCurrentMetrics();
    const issues: string[] = [];
    let status: "healthy" | "warning" | "critical" = "healthy";

    // Check memory usage
    const memoryWarning = this.checkMemoryWarning();
    if (memoryWarning.warning) {
      issues.push(memoryWarning.message!);
      status = "warning";
    }

    // Check error rate
    if (metrics.errorStats.errorRate > 10) {
      issues.push(
        `High error rate: ${metrics.errorStats.errorRate.toFixed(2)}%`,
      );
      status = status === "healthy" ? "warning" : "critical";
    }

    // Check slow queries
    if (metrics.databaseStats.slowQueries > 10) {
      issues.push(
        `High number of slow queries: ${metrics.databaseStats.slowQueries}`,
      );
      status = status === "healthy" ? "warning" : status;
    }

    // Check active sessions
    const maxSessions =
      this.configService.getSessionConfig().maxConcurrentSessions;
    if (metrics.processingStats.activeSessions > maxSessions * 0.8) {
      issues.push(
        `High number of active sessions: ${metrics.processingStats.activeSessions}/${maxSessions}`,
      );
      status = status === "healthy" ? "warning" : status;
    }

    return { status, issues, metrics };
  }

  /**
   * Collect metrics and store in history
   */
  private collectMetrics(): void {
    const metrics = this.getCurrentMetrics();

    this.performanceHistory.push(metrics);
    if (this.performanceHistory.length > this.maxHistorySize) {
      this.performanceHistory.shift();
    }

    // Log system health
    const health = this.getSystemHealth();
    if (health.status !== "healthy") {
      this.logger.warn(`System health: ${health.status}`, health.issues);
    }
  }

  /**
   * Calculate throughput (rows per second)
   */
  private calculateThroughput(): number {
    const totalTime = this.processingStats.totalProcessingTime / 1000; // Convert to seconds
    return totalTime > 0
      ? this.processingStats.totalRowsProcessed / totalTime
      : 0;
  }

  /**
   * Calculate error rate
   */
  private calculateErrorRate(): number {
    const totalOperations =
      this.processingStats.totalSessions + this.databaseStats.totalQueries;
    return totalOperations > 0
      ? (this.errorStats.totalErrors / totalOperations) * 100
      : 0;
  }

  /**
   * Get current memory usage
   */
  private getCurrentMemoryUsage(): number {
    return process.memoryUsage().heapUsed;
  }

  /**
   * Clean up old session metrics
   */
  cleanupOldMetrics(): void {
    const cutoffTime = Date.now() - 24 * 60 * 60 * 1000; // 24 hours ago

    for (const [sessionId, metrics] of this.sessionMetrics.entries()) {
      if (metrics.endTime && metrics.endTime.getTime() < cutoffTime) {
        this.sessionMetrics.delete(sessionId);
      }
    }

    this.logger.log("Old session metrics cleaned up");
  }
}
