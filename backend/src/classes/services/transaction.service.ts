import { Injectable, Logger } from '@nestjs/common';
import { DataSource, QueryRunner } from 'typeorm';

export type IsolationLevel = 'READ_UNCOMMITTED' | 'READ_COMMITTED' | 'REPEATABLE_READ' | 'SERIALIZABLE';

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
export class TransactionService {
  private readonly logger = new Logger(TransactionService.name);
  private readonly stats: TransactionStats = {
    totalTransactions: 0,
    successfulTransactions: 0,
    failedTransactions: 0,
    retriedTransactions: 0,
    averageExecutionTime: 0,
    totalExecutionTime: 0,
    deadlockCount: 0,
    timeoutCount: 0
  };

  private readonly DEFAULT_OPTIONS: TransactionOptions = {
    isolationLevel: 'READ_COMMITTED',
    timeout: 30000, // 30 seconds
    retryCount: 3,
    retryDelay: 1000 // 1 second
  };

  constructor(private readonly dataSource: DataSource) {}

  /**
   * Execute a function within a transaction with retry logic
   */
  async executeWithTransaction<T>(
    operation: (queryRunner: QueryRunner) => Promise<T>,
    options: TransactionOptions = {}
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
          this.createTimeoutPromise<T>(opts.timeout)
        ]);

        await queryRunner.commitTransaction();
        
        const executionTime = Date.now() - startTime;
        this.updateStats(true, executionTime, retryCount);

        this.logger.log(`Transaction completed successfully in ${executionTime}ms (retry: ${retryCount})`);
        
        return {
          success: true,
          result,
          executionTime,
          retryCount
        };

      } catch (error) {
        await queryRunner.rollbackTransaction();
        lastError = error as Error;
        
        this.logger.error(`Transaction failed (attempt ${retryCount + 1}): ${error.message}`);

        // Check if it's a retryable error
        if (this.isRetryableError(error as Error) && retryCount < opts.retryCount) {
          retryCount++;
          this.stats.retriedTransactions++;
          
          this.logger.warn(`Retrying transaction in ${opts.retryDelay}ms (attempt ${retryCount + 1}/${opts.retryCount + 1})`);
          await new Promise(resolve => setTimeout(resolve, opts.retryDelay));
          
          continue;
        }

        // Not retryable or max retries reached
        const executionTime = Date.now() - startTime;
        this.updateStats(false, executionTime, retryCount);
        
        break;

      } finally {
        await queryRunner.release();
      }
    }

    const executionTime = Date.now() - startTime;
    return {
      success: false,
      error: lastError,
      executionTime,
      retryCount
    };
  }

  /**
   * Execute multiple operations in a single transaction
   */
  async executeBatchTransaction<T>(
    operations: Array<(queryRunner: QueryRunner) => Promise<T>>,
    options: TransactionOptions = {}
  ): Promise<TransactionResult<T[]>> {
    return this.executeWithTransaction(async (queryRunner: QueryRunner) => {
      const results: T[] = [];
      
      for (const operation of operations) {
        const result = await operation(queryRunner);
        results.push(result);
      }
      
      return results;
    }, options);
  }

  /**
   * Create a timeout promise
   */
  private createTimeoutPromise<T>(timeout?: number): Promise<T> {
    if (!timeout) {
      return new Promise(() => {}); // Never resolves
    }

    return new Promise((_, reject) => {
      setTimeout(() => {
        this.stats.timeoutCount++;
        reject(new Error(`Transaction timeout after ${timeout}ms`));
      }, timeout);
    });
  }

  /**
   * Check if an error is retryable
   */
  private isRetryableError(error: Error): boolean {
    const message = error.message.toLowerCase();
    
    // Deadlock errors
    if (message.includes('deadlock') || message.includes('lock wait timeout')) {
      this.stats.deadlockCount++;
      return true;
    }
    
    // Connection errors
    if (message.includes('connection') || message.includes('timeout')) {
      return true;
    }
    
    // Temporary server errors
    if (message.includes('server has gone away') || message.includes('connection lost')) {
      return true;
    }
    
    // Database lock errors
    if (message.includes('lock') && message.includes('wait')) {
      return true;
    }
    
    return false;
  }

  /**
   * Update transaction statistics
   */
  private updateStats(success: boolean, executionTime: number, retryCount: number): void {
    if (success) {
      this.stats.successfulTransactions++;
    } else {
      this.stats.failedTransactions++;
    }
    
    this.stats.totalExecutionTime += executionTime;
    this.stats.averageExecutionTime = this.stats.totalExecutionTime / this.stats.totalTransactions;
    
    if (retryCount > 0) {
      this.stats.retriedTransactions++;
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
      timeoutCount: 0
    });
  }

  /**
   * Get health status of transaction processing
   */
  getHealthStatus(): { status: 'healthy' | 'warning' | 'critical'; details: any } {
    const successRate = this.stats.totalTransactions > 0 
      ? (this.stats.successfulTransactions / this.stats.totalTransactions) * 100 
      : 100;
    
    const deadlockRate = this.stats.totalTransactions > 0 
      ? (this.stats.deadlockCount / this.stats.totalTransactions) * 100 
      : 0;
    
    const timeoutRate = this.stats.totalTransactions > 0 
      ? (this.stats.timeoutCount / this.stats.totalTransactions) * 100 
      : 0;

    let status: 'healthy' | 'warning' | 'critical' = 'healthy';
    
    if (successRate < 50 || deadlockRate > 20 || timeoutRate > 10) {
      status = 'critical';
    } else if (successRate < 80 || deadlockRate > 10 || timeoutRate > 5) {
      status = 'warning';
    }

    return {
      status,
      details: {
        successRate: successRate.toFixed(1) + '%',
        deadlockRate: deadlockRate.toFixed(1) + '%',
        timeoutRate: timeoutRate.toFixed(1) + '%',
        averageExecutionTime: this.stats.averageExecutionTime.toFixed(1) + 'ms',
        totalTransactions: this.stats.totalTransactions
      }
    };
  }

  /**
   * Log transaction statistics
   */
  logStats(): void {
    const health = this.getHealthStatus();
    this.logger.log(`Transaction Stats: ${JSON.stringify(health.details)}`);
  }
}
