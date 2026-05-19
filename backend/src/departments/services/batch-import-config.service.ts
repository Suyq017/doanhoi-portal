import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";

export interface BatchImportConfig {
  // Batch Processing
  defaultBatchSize: number;
  maxBatchSize: number;
  minBatchSize: number;
  enableOptimizedBatchSize: boolean;

  // Retry Configuration
  maxRetries: number;
  retryDelay: number;
  retryBackoffFactor: number;

  // Fallback Configuration
  enableFallback: boolean;
  fallbackBatchSize: number;
  fallbackMaxRetries: number;

  // Transaction Configuration
  enableTransaction: boolean;
  transactionTimeout: number;
  transactionIsolationLevel: string;

  // Session Configuration
  sessionTimeout: number;
  maxConcurrentSessions: number;
  cleanupInterval: number;

  // Memory Management
  maxMemoryPerSession: number;
  memoryWarningThreshold: number;
  enableMemoryMonitoring: boolean;

  // Database Configuration
  connectionPoolSize: number;
  connectionTimeout: number;
  idleTimeout: number;
  maxConnections: number;

  // Performance Configuration
  enablePerformanceMonitoring: boolean;
  performanceLoggingInterval: number;
  slowQueryThreshold: number;

  // Error Handling
  enableDetailedErrorLogging: boolean;
  errorAggregationEnabled: boolean;
  maxErrorsPerBatch: number;
}

@Injectable()
export class DepartmentBatchImportConfigService {
  private readonly config: BatchImportConfig;

  constructor(private configService: ConfigService) {
    this.config = {
      // Batch Processing
      defaultBatchSize: this.configService.get<number>(
        "BATCH_IMPORT_DEFAULT_BATCH_SIZE",
        200,
      ),
      maxBatchSize: this.configService.get<number>(
        "BATCH_IMPORT_MAX_BATCH_SIZE",
        500,
      ),
      minBatchSize: this.configService.get<number>(
        "BATCH_IMPORT_MIN_BATCH_SIZE",
        50,
      ),
      enableOptimizedBatchSize: this.configService.get<boolean>(
        "BATCH_IMPORT_ENABLE_OPTIMIZED_BATCH_SIZE",
        true,
      ),

      // Retry Configuration
      maxRetries: this.configService.get<number>("BATCH_IMPORT_MAX_RETRIES", 3),
      retryDelay: this.configService.get<number>(
        "BATCH_IMPORT_RETRY_DELAY",
        1000,
      ),
      retryBackoffFactor: this.configService.get<number>(
        "BATCH_IMPORT_RETRY_BACKOFF_FACTOR",
        2,
      ),

      // Fallback Configuration
      enableFallback: this.configService.get<boolean>(
        "BATCH_IMPORT_ENABLE_FALLBACK",
        true,
      ),
      fallbackBatchSize: this.configService.get<number>(
        "BATCH_IMPORT_FALLBACK_BATCH_SIZE",
        50,
      ),
      fallbackMaxRetries: this.configService.get<number>(
        "BATCH_IMPORT_FALLBACK_MAX_RETRIES",
        2,
      ),

      // Transaction Configuration
      enableTransaction: this.configService.get<boolean>(
        "BATCH_IMPORT_ENABLE_TRANSACTION",
        true,
      ),
      transactionTimeout: this.configService.get<number>(
        "BATCH_IMPORT_TRANSACTION_TIMEOUT",
        60000,
      ),
      transactionIsolationLevel: this.configService.get<string>(
        "BATCH_IMPORT_TRANSACTION_ISOLATION",
        "READ COMMITTED",
      ),

      // Session Configuration
      sessionTimeout: this.configService.get<number>(
        "BATCH_IMPORT_SESSION_TIMEOUT",
        2 * 60 * 60 * 1000,
      ), // 2 hours
      maxConcurrentSessions: this.configService.get<number>(
        "BATCH_IMPORT_MAX_CONCURRENT_SESSIONS",
        10,
      ),
      cleanupInterval: this.configService.get<number>(
        "BATCH_IMPORT_CLEANUP_INTERVAL",
        60 * 60 * 1000,
      ), // 1 hour

      // Memory Management
      maxMemoryPerSession: this.configService.get<number>(
        "BATCH_IMPORT_MAX_MEMORY_PER_SESSION",
        512 * 1024 * 1024,
      ), // 512MB
      memoryWarningThreshold: this.configService.get<number>(
        "BATCH_IMPORT_MEMORY_WARNING_THRESHOLD",
        400 * 1024 * 1024,
      ), // 400MB
      enableMemoryMonitoring: this.configService.get<boolean>(
        "BATCH_IMPORT_ENABLE_MEMORY_MONITORING",
        true,
      ),

      // Database Configuration
      connectionPoolSize: this.configService.get<number>(
        "BATCH_IMPORT_CONNECTION_POOL_SIZE",
        20,
      ),
      connectionTimeout: this.configService.get<number>(
        "BATCH_IMPORT_CONNECTION_TIMEOUT",
        30000,
      ),
      idleTimeout: this.configService.get<number>(
        "BATCH_IMPORT_IDLE_TIMEOUT",
        300000,
      ),
      maxConnections: this.configService.get<number>(
        "BATCH_IMPORT_MAX_CONNECTIONS",
        50,
      ),

      // Performance Configuration
      enablePerformanceMonitoring: this.configService.get<boolean>(
        "BATCH_IMPORT_ENABLE_PERFORMANCE_MONITORING",
        true,
      ),
      performanceLoggingInterval: this.configService.get<number>(
        "BATCH_IMPORT_PERFORMANCE_LOGGING_INTERVAL",
        30000,
      ),
      slowQueryThreshold: this.configService.get<number>(
        "BATCH_IMPORT_SLOW_QUERY_THRESHOLD",
        5000,
      ),

      // Error Handling
      enableDetailedErrorLogging: this.configService.get<boolean>(
        "BATCH_IMPORT_ENABLE_DETAILED_ERROR_LOGGING",
        true,
      ),
      errorAggregationEnabled: this.configService.get<boolean>(
        "BATCH_IMPORT_ERROR_AGGREGATION_ENABLED",
        true,
      ),
      maxErrorsPerBatch: this.configService.get<number>(
        "BATCH_IMPORT_MAX_ERRORS_PER_BATCH",
        100,
      ),
    };
  }

  getConfig(): BatchImportConfig {
    return { ...this.config };
  }

  getBatchProcessingConfig() {
    return {
      defaultBatchSize: this.config.defaultBatchSize,
      maxBatchSize: this.config.maxBatchSize,
      minBatchSize: this.config.minBatchSize,
      enableOptimizedBatchSize: this.config.enableOptimizedBatchSize,
      maxRetries: this.config.maxRetries,
      retryDelay: this.config.retryDelay,
      retryBackoffFactor: this.config.retryBackoffFactor,
      enableFallback: this.config.enableFallback,
      fallbackBatchSize: this.config.fallbackBatchSize,
    };
  }

  getTransactionConfig() {
    return {
      enableTransaction: this.config.enableTransaction,
      transactionTimeout: this.config.transactionTimeout,
      transactionIsolationLevel: this.config.transactionIsolationLevel,
      maxRetries: this.config.maxRetries,
      retryDelay: this.config.retryDelay,
      retryBackoffFactor: this.config.retryBackoffFactor,
    };
  }

  getSessionConfig() {
    return {
      sessionTimeout: this.config.sessionTimeout,
      maxConcurrentSessions: this.config.maxConcurrentSessions,
      cleanupInterval: this.config.cleanupInterval,
    };
  }

  getMemoryConfig() {
    return {
      maxMemoryPerSession: this.config.maxMemoryPerSession,
      memoryWarningThreshold: this.config.memoryWarningThreshold,
      enableMemoryMonitoring: this.config.enableMemoryMonitoring,
    };
  }

  getDatabaseConfig() {
    return {
      connectionPoolSize: this.config.connectionPoolSize,
      connectionTimeout: this.config.connectionTimeout,
      idleTimeout: this.config.idleTimeout,
      maxConnections: this.config.maxConnections,
    };
  }

  getPerformanceConfig() {
    return {
      enablePerformanceMonitoring: this.config.enablePerformanceMonitoring,
      performanceLoggingInterval: this.config.performanceLoggingInterval,
      slowQueryThreshold: this.config.slowQueryThreshold,
    };
  }

  getErrorHandlingConfig() {
    return {
      enableDetailedErrorLogging: this.config.enableDetailedErrorLogging,
      errorAggregationEnabled: this.config.errorAggregationEnabled,
      maxErrorsPerBatch: this.config.maxErrorsPerBatch,
    };
  }

  /**
   * Get optimized batch size based on data size
   */
  getOptimizedBatchSize(dataSize: number): number {
    if (!this.config.enableOptimizedBatchSize) {
      return this.config.defaultBatchSize;
    }

    if (dataSize <= 1000) {
      return Math.max(100, this.config.minBatchSize);
    } else if (dataSize <= 5000) {
      return Math.max(200, this.config.minBatchSize);
    } else if (dataSize <= 10000) {
      return Math.max(300, this.config.minBatchSize);
    } else {
      return Math.min(400, this.config.maxBatchSize);
    }
  }

  /**
   * Check if batch processing should be enabled for given data size
   */
  shouldUseBatchProcessing(dataSize: number): boolean {
    return dataSize > 100; // Use batch processing for more than 100 rows
  }

  /**
   * Get environment-specific configuration
   */
  getEnvironmentConfig(): {
    isDevelopment: boolean;
    isProduction: boolean;
    logLevel: string;
  } {
    const nodeEnv = this.configService.get<string>("NODE_ENV", "development");

    return {
      isDevelopment: nodeEnv === "development",
      isProduction: nodeEnv === "production",
      logLevel: this.configService.get<string>("LOG_LEVEL", "info"),
    };
  }

  /**
   * Validate configuration
   */
  validateConfig(): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (this.config.defaultBatchSize < this.config.minBatchSize) {
      errors.push("Default batch size cannot be less than minimum batch size");
    }

    if (this.config.defaultBatchSize > this.config.maxBatchSize) {
      errors.push(
        "Default batch size cannot be greater than maximum batch size",
      );
    }

    if (this.config.maxRetries < 0) {
      errors.push("Max retries cannot be negative");
    }

    if (this.config.retryDelay < 0) {
      errors.push("Retry delay cannot be negative");
    }

    if (this.config.sessionTimeout < 60000) {
      errors.push("Session timeout cannot be less than 1 minute");
    }

    if (this.config.maxConcurrentSessions < 1) {
      errors.push("Max concurrent sessions must be at least 1");
    }

    if (this.config.connectionPoolSize < 1) {
      errors.push("Connection pool size must be at least 1");
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  /**
   * Log current configuration
   */
  logConfiguration(): void {
    const validation = this.validateConfig();

    if (!validation.isValid) {
      console.error(
        "Department Batch Import Configuration Errors:",
        validation.errors,
      );
      return;
    }

    console.log("Department Batch Import Configuration:", {
      batchProcessing: this.getBatchProcessingConfig(),
      transaction: this.getTransactionConfig(),
      session: this.getSessionConfig(),
      memory: this.getMemoryConfig(),
      database: this.getDatabaseConfig(),
      performance: this.getPerformanceConfig(),
      errorHandling: this.getErrorHandlingConfig(),
      environment: this.getEnvironmentConfig(),
    });
  }
}
