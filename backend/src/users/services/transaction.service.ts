import { Injectable, Logger } from "@nestjs/common";
import { DataSource, QueryRunner } from "typeorm";

export type IsolationLevel =
  | "READ_UNCOMMITTED"
  | "READ_COMMITTED"
  | "REPEATABLE_READ"
  | "SERIALIZABLE";

export interface TransactionOptions {
  isolationLevel?: IsolationLevel;
  timeout?: number; // in milliseconds
  retryCount?: number;
  retryDelay?: number; // in milliseconds
}

export interface TransactionResult<T> {
  success: boolean;
  result?: T;
  error?: Error;
  executionTime: number; // in milliseconds
  retryCount: number;
}

export interface TransactionStats {
  totalTransactions: number;
  successfulTransactions: number;
  failedTransactions: number;
  retriedTransactions: number;
  averageExecutionTime: number; // in milliseconds
  totalExecutionTime: number; // in milliseconds
  deadlockCount: number;
  timeoutCount: number;
}

@Injectable()
export class UserTransactionService {
  private readonly logger = new Logger(UserTransactionService.name);
  private readonly stats: TransactionStats = {
    totalTransactions: 0,
    successfulTransactions: 0,
    failedTransactions: 0,
    retriedTransactions: 0,
    averageExecutionTime: 0,
    totalExecutionTime: 0,
    deadlockCount: 0,
    timeoutCount: 0,
  };

  private readonly DEFAULT_OPTIONS: TransactionOptions = {
    isolationLevel: "READ_COMMITTED",
    timeout: 30000, // 30 seconds
    retryCount: 3,
    retryDelay: 1000, // 1 second
  };

  constructor(private readonly dataSource: DataSource) { }

  /**
   * Execute a function within a transaction with retry logic
   */
  async executeWithTransaction<T>(
    operation: (queryRunner: QueryRunner) => Promise<T>,
    options: TransactionOptions = {},
  ): Promise<TransactionResult<T>> {
    const opts = { ...this.DEFAULT_OPTIONS, ...options };
    const startTime = Date.now();
    let retryCount = 0;
    let lastError: Error | undefined;

    this.stats.totalTransactions++;

    while (retryCount <= opts.retryCount) {
      const queryRunner = this.dataSource.createQueryRunner();

      try {
        await queryRunner.connect();
        await queryRunner.startTransaction();

        // Execute the operation
        const result = await Promise.race([
          operation(queryRunner),
          this.createTimeoutPromise<T>(opts.timeout),
        ]);

        await queryRunner.commitTransaction();

        const executionTime = Date.now() - startTime;
        this.updateStats(true, executionTime, retryCount);

        this.logger.log(
          `User transaction completed successfully in ${executionTime}ms (retry: ${retryCount})`,
        );

        return {
          success: true,
          result,
          executionTime,
          retryCount,
        };
      } catch (error) {
        await queryRunner.rollbackTransaction();
        lastError = error as Error;

        this.logger.error(
          `User transaction failed (attempt ${retryCount + 1}): ${error.message}`,
        );

        // Check if error is retryable
        if (
          this.isRetryableError(error as Error) &&
          retryCount < opts.retryCount
        ) {
          retryCount++;
          this.stats.retriedTransactions++;

          // Wait before retry
          await new Promise((resolve) => setTimeout(resolve, opts.retryDelay));
          continue;
        }

        break;
      } finally {
        await queryRunner.release();
      }
    }

    const executionTime = Date.now() - startTime;
    this.updateStats(false, executionTime, retryCount);

    return {
      success: false,
      error: lastError,
      executionTime,
      retryCount,
    };
  }

  /**
   * Create a timeout promise
   */
  private createTimeoutPromise<T>(timeout?: number): Promise<T> {
    if (!timeout) {
      return new Promise(() => { }); // Never resolves
    }

    return new Promise((_, reject) => {
      setTimeout(() => {
        reject(new Error(`Transaction timeout after ${timeout}ms`));
      }, timeout);
    });
  }

  /**
   * Check if an error is retryable
   */
  private isRetryableError(error: Error): boolean {
    const message = error.message.toLowerCase();

    // Deadlock detection
    if (message.includes("deadlock") || message.includes("lock wait timeout")) {
      this.stats.deadlockCount++;
      return true;
    }

    // Timeout detection
    if (message.includes("timeout")) {
      this.stats.timeoutCount++;
      return true;
    }

    // Connection issues
    if (message.includes("connection") || message.includes("network")) {
      return true;
    }

    // Temporary database issues
    if (message.includes("temporary") || message.includes("busy")) {
      return true;
    }

    return false;
  }

  /**
   * Update transaction statistics
   */
  private updateStats(
    success: boolean,
    executionTime: number,
    _retryCount: number,
  ): void {
    this.stats.totalExecutionTime += executionTime;
    this.stats.averageExecutionTime =
      this.stats.totalExecutionTime / this.stats.totalTransactions;

    if (success) {
      this.stats.successfulTransactions++;
    } else {
      this.stats.failedTransactions++;
    }
  }

  /**
   * Get transaction statistics
   */
  getStats(): TransactionStats {
    return { ...this.stats };
  }

  /**
   * Reset transaction statistics
   */
  resetStats(): void {
    Object.assign(this.stats, {
      totalTransactions: 0,
      successfulTransactions: 0,
      failedTransactions: 0,
      retriedTransactions: 0,
      averageExecutionTime: 0,
      totalExecutionTime: 0,
      deadlockCount: 0,
      timeoutCount: 0,
    });
  }

  /**
   * Execute multiple operations in a single transaction
   */
  async executeMultipleOperations<T>(
    operations: Array<(queryRunner: QueryRunner) => Promise<T>>,
    options: TransactionOptions = {},
  ): Promise<TransactionResult<T[]>> {
    return this.executeWithTransaction(async (queryRunner) => {
      const results: T[] = [];

      for (const operation of operations) {
        const result = await operation(queryRunner);
        results.push(result);
      }

      return results;
    }, options);
  }

  /**
   * Execute with savepoint for nested transactions
   */
  async executeWithSavepoint<T>(
    queryRunner: QueryRunner,
    savepointName: string,
    operation: (queryRunner: QueryRunner) => Promise<T>,
  ): Promise<T> {
    try {
      await queryRunner.query(`SAVEPOINT ${savepointName}`);
      const result = await operation(queryRunner);
      await queryRunner.query(`RELEASE SAVEPOINT ${savepointName}`);
      return result;
    } catch (error) {
      await queryRunner.query(`ROLLBACK TO SAVEPOINT ${savepointName}`);
      throw error;
    }
  }
}
