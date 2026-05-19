export interface BatchProcessingConfig {
  defaultBatchSize: number;
  maxBatchSize: number;
  minBatchSize: number;
  maxRetries: number;
  retryDelay: number;
  sessionTimeout: number;
  enableFallback: boolean;
  fallbackBatchSize: number;
  transactionTimeout: number;
  memoryLimitMB: number;
  maxConcurrentBatches: number;
}

export const DEFAULT_BATCH_PROCESSING_CONFIG: BatchProcessingConfig = {
  defaultBatchSize: 200,
  maxBatchSize: 1000,
  minBatchSize: 10,
  maxRetries: 3,
  retryDelay: 1000,
  sessionTimeout: 2 * 60 * 60 * 1000, // 2 hours
  enableFallback: true,
  fallbackBatchSize: 50,
  transactionTimeout: 60000, // 1 minute
  memoryLimitMB: 512,
  maxConcurrentBatches: 3,
};

export const getBatchProcessingConfig = (): BatchProcessingConfig => {
  return {
    defaultBatchSize: parseInt(process.env.BATCH_DEFAULT_SIZE || "200"),
    maxBatchSize: parseInt(process.env.BATCH_MAX_SIZE || "1000"),
    minBatchSize: parseInt(process.env.BATCH_MIN_SIZE || "10"),
    maxRetries: parseInt(process.env.BATCH_MAX_RETRIES || "3"),
    retryDelay: parseInt(process.env.BATCH_RETRY_DELAY || "1000"),
    sessionTimeout: parseInt(process.env.BATCH_SESSION_TIMEOUT || "7200000"), // 2 hours
    enableFallback: process.env.BATCH_ENABLE_FALLBACK !== "false",
    fallbackBatchSize: parseInt(process.env.BATCH_FALLBACK_SIZE || "50"),
    transactionTimeout: parseInt(
      process.env.BATCH_TRANSACTION_TIMEOUT || "60000",
    ),
    memoryLimitMB: parseInt(process.env.BATCH_MEMORY_LIMIT_MB || "512"),
    maxConcurrentBatches: parseInt(process.env.BATCH_MAX_CONCURRENT || "3"),
  };
};
