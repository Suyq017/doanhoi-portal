import { Injectable, Logger } from "@nestjs/common";
import { DataSource, QueryRunner } from "typeorm";

export type IsolationLevel =
  | "READ UNCOMMITTED"
  | "READ COMMITTED"
  | "REPEATABLE READ"
  | "SERIALIZABLE";

export interface TransactionConfig {
  isolationLevel: IsolationLevel;
  timeout: number;
  maxRetries: number;
  retryDelay: number;
  enableDeadlockDetection: boolean;
  connectionPoolSize: number;
}

export interface TransactionStats {
  totalTransactions: number;
  successfulTransactions: number;
  failedTransactions: number;
  rollbackCount: number;
  deadlockCount: number;
  timeoutCount: number;
  averageExecutionTime: number;
  successRate: number;
  totalExecutionTime: number;
  lastExecutionTime?: Date;
}

export interface TransactionResult {
  success: boolean;
  transactionId: string;
  executionTime: number;
  error?: string;
  errorType?: "deadlock" | "timeout" | "connection" | "constraint" | "other";
  retryCount: number;
  canRetry: boolean;
}

@Injectable()
export class DepartmentTransactionService {
  private readonly logger = new Logger(DepartmentTransactionService.name);
  private readonly stats: TransactionStats = {
    totalTransactions: 0,
    successfulTransactions: 0,
    failedTransactions: 0,
    rollbackCount: 0,
    deadlockCount: 0,
    timeoutCount: 0,
    averageExecutionTime: 0,
    successRate: 0,
    totalExecutionTime: 0,
  };

  private readonly DEFAULT_CONFIG: TransactionConfig = {
    isolationLevel: "READ COMMITTED",
    timeout: 60000, // 60 seconds
    maxRetries: 3,
    retryDelay: 1000,
    enableDeadlockDetection: true,
    connectionPoolSize: 10,
  };

  constructor(private readonly dataSource: DataSource) { }

  /**
   * Thực hiện transaction cho batch processing
   */
  async executeTransaction<T>(
    operation: (queryRunner: QueryRunner) => Promise<T>,
    config: Partial<TransactionConfig> = {},
  ): Promise<TransactionResult & { data?: T }> {
    const finalConfig = { ...this.DEFAULT_CONFIG, ...config };
    const transactionId = `txn_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const startTime = Date.now();

    let retryCount = 0;
    let lastError: Error | null = null;

    while (retryCount <= finalConfig.maxRetries) {
      const queryRunner = this.dataSource.createQueryRunner();

      try {
        await queryRunner.connect();
        await queryRunner.startTransaction(finalConfig.isolationLevel);

        this.logger.log(
          `Starting transaction ${transactionId} (attempt ${retryCount + 1})`,
        );

        // Set transaction timeout
        await queryRunner.query(
          `SET SESSION innodb_lock_wait_timeout = ${finalConfig.timeout / 1000}`,
        );

        const result = await Promise.race([
          operation(queryRunner),
          this.createTimeoutPromise(finalConfig.timeout),
        ]);

        await queryRunner.commitTransaction();

        const executionTime = Date.now() - startTime;
        this.updateStats(true, executionTime, null);

        this.logger.log(
          `Transaction ${transactionId} completed successfully in ${executionTime}ms`,
        );

        return {
          success: true,
          transactionId,
          executionTime,
          retryCount,
          canRetry: false,
          data: result,
        };
      } catch (error) {
        await queryRunner.rollbackTransaction();
        this.stats.rollbackCount++;
        lastError = error as Error;

        const errorType = this.classifyError(error as Error);
        const canRetry = this.canRetryError(errorType, retryCount, finalConfig);

        this.logger.error(
          `Transaction ${transactionId} failed (attempt ${retryCount + 1}): ${error.message}`,
        );

        if (canRetry && retryCount < finalConfig.maxRetries) {
          const delay = this.calculateRetryDelay(
            retryCount,
            finalConfig.retryDelay,
          );
          this.logger.log(
            `Retrying transaction ${transactionId} in ${delay}ms`,
          );
          await this.sleep(delay);
          retryCount++;
        } else {
          const executionTime = Date.now() - startTime;
          this.updateStats(false, executionTime, errorType);

          return {
            success: false,
            transactionId,
            executionTime,
            error: lastError.message,
            errorType,
            retryCount,
            canRetry: false,
          };
        }
      } finally {
        await queryRunner.release();
      }
    }

    // Should not reach here, but just in case
    const executionTime = Date.now() - startTime;
    this.updateStats(false, executionTime, "other");

    return {
      success: false,
      transactionId,
      executionTime,
      error: lastError?.message || "Unknown error",
      errorType: "other",
      retryCount,
      canRetry: false,
    };
  }

  /**
   * Bulk insert với transaction
   */
  async bulkInsert<T>(
    entity: any,
    data: T[],
    config: Partial<TransactionConfig> = {},
  ): Promise<TransactionResult & { insertedCount?: number }> {
    return this.executeTransaction(async (queryRunner) => {
      const repository = queryRunner.manager.getRepository(entity);
      const result = await repository.insert(data);
      return result.identifiers.length;
    }, config);
  }

  /**
   * Bulk update với transaction
   */
  async bulkUpdate<T>(
    entity: any,
    updates: { criteria: any; data: Partial<T> }[],
    config: Partial<TransactionConfig> = {},
  ): Promise<TransactionResult & { updatedCount?: number }> {
    return this.executeTransaction(async (queryRunner) => {
      const repository = queryRunner.manager.getRepository(entity);
      let updatedCount = 0;

      for (const update of updates) {
        const result = await repository.update(update.criteria, update.data);
        updatedCount += result.affected || 0;
      }

      return updatedCount;
    }, config);
  }

  /**
   * Phân loại lỗi để xác định có thể retry hay không
   */
  private classifyError(error: Error): TransactionResult["errorType"] {
    const errorMessage = error.message.toLowerCase();

    if (errorMessage.includes("deadlock")) {
      this.stats.deadlockCount++;
      return "deadlock";
    }

    if (
      errorMessage.includes("timeout") ||
      errorMessage.includes("lock wait timeout")
    ) {
      this.stats.timeoutCount++;
      return "timeout";
    }

    if (
      errorMessage.includes("connection") ||
      errorMessage.includes("connect")
    ) {
      return "connection";
    }

    if (
      errorMessage.includes("constraint") ||
      errorMessage.includes("duplicate") ||
      errorMessage.includes("foreign key")
    ) {
      return "constraint";
    }

    return "other";
  }

  /**
   * Xác định có thể retry lỗi hay không
   */
  private canRetryError(
    errorType: TransactionResult["errorType"],
    retryCount: number,
    config: TransactionConfig,
  ): boolean {
    if (retryCount >= config.maxRetries) {
      return false;
    }

    // Các lỗi có thể retry
    const retryableErrors = ["deadlock", "timeout", "connection"];
    return retryableErrors.includes(errorType);
  }

  /**
   * Tính toán retry delay với exponential backoff
   */
  private calculateRetryDelay(retryCount: number, baseDelay: number): number {
    return baseDelay * Math.pow(2, retryCount);
  }

  /**
   * Tạo timeout promise
   */
  private createTimeoutPromise(timeout: number): Promise<never> {
    return new Promise((_, reject) => {
      setTimeout(() => {
        reject(new Error(`Transaction timeout after ${timeout}ms`));
      }, timeout);
    });
  }

  /**
   * Sleep utility
   */
  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Cập nhật thống kê transaction
   */
  private updateStats(
    success: boolean,
    executionTime: number,
    _errorType?: TransactionResult["errorType"],
  ): void {
    this.stats.totalTransactions++;
    this.stats.totalExecutionTime += executionTime;
    this.stats.lastExecutionTime = new Date();

    if (success) {
      this.stats.successfulTransactions++;
    } else {
      this.stats.failedTransactions++;
    }

    this.stats.averageExecutionTime =
      this.stats.totalExecutionTime / this.stats.totalTransactions;
    this.stats.successRate =
      (this.stats.successfulTransactions / this.stats.totalTransactions) * 100;
  }

  /**
   * Lấy thống kê transaction
   */
  getTransactionStats(): TransactionStats {
    return { ...this.stats };
  }

  /**
   * Reset thống kê transaction
   */
  resetStats(): void {
    this.stats.totalTransactions = 0;
    this.stats.successfulTransactions = 0;
    this.stats.failedTransactions = 0;
    this.stats.rollbackCount = 0;
    this.stats.deadlockCount = 0;
    this.stats.timeoutCount = 0;
    this.stats.averageExecutionTime = 0;
    this.stats.successRate = 0;
    this.stats.totalExecutionTime = 0;
    this.stats.lastExecutionTime = undefined;
  }

  /**
   * Kiểm tra sức khỏe transaction service
   */
  async healthCheck(): Promise<{
    isHealthy: boolean;
    connectionStatus: "connected" | "disconnected";
    successRate: number;
    avgExecutionTime: number;
    issues: string[];
  }> {
    const issues: string[] = [];
    let connectionStatus: "connected" | "disconnected" = "disconnected";

    try {
      // Kiểm tra connection
      if (this.dataSource.isInitialized) {
        await this.dataSource.query("SELECT 1");
        connectionStatus = "connected";
      }
    } catch (error) {
      issues.push(`Database connection issue: ${error.message}`);
    }

    // Kiểm tra success rate
    if (this.stats.successRate < 90 && this.stats.totalTransactions > 10) {
      issues.push(`Low success rate: ${this.stats.successRate.toFixed(2)}%`);
    }

    // Kiểm tra average execution time
    if (this.stats.averageExecutionTime > 5000) {
      issues.push(
        `High average execution time: ${this.stats.averageExecutionTime}ms`,
      );
    }

    // Kiểm tra deadlock rate
    const deadlockRate =
      this.stats.totalTransactions > 0
        ? (this.stats.deadlockCount / this.stats.totalTransactions) * 100
        : 0;
    if (deadlockRate > 5) {
      issues.push(`High deadlock rate: ${deadlockRate.toFixed(2)}%`);
    }

    return {
      isHealthy: issues.length === 0,
      connectionStatus,
      successRate: this.stats.successRate,
      avgExecutionTime: this.stats.averageExecutionTime,
      issues,
    };
  }

  /**
   * Optimize connection pool
   */
  async optimizeConnectionPool(): Promise<void> {
    try {
      // Thực hiện các tối ưu connection pool
      await this.dataSource.query("SET SESSION wait_timeout = 600");
      await this.dataSource.query("SET SESSION interactive_timeout = 600");
      this.logger.log("Connection pool optimized");
    } catch (error) {
      this.logger.error(`Failed to optimize connection pool: ${error.message}`);
    }
  }
}
