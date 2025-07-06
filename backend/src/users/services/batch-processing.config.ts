export interface BatchProcessingConfig {
  defaultBatchSize: number;
  maxBatchSize: number;
  minBatchSize: number;
  maxRetries: number;
  retryDelay: number;
  enableFallback: boolean;
  fallbackBatchSize: number;
  sessionTimeout: number;
  maxConcurrentBatches: number;
  memoryThreshold: number; // MB
}

export const getBatchProcessingConfig = (): BatchProcessingConfig => ({
  defaultBatchSize: parseInt(process.env.USER_IMPORT_DEFAULT_BATCH_SIZE || '200'),
  maxBatchSize: parseInt(process.env.USER_IMPORT_MAX_BATCH_SIZE || '500'),
  minBatchSize: parseInt(process.env.USER_IMPORT_MIN_BATCH_SIZE || '50'),
  maxRetries: parseInt(process.env.USER_IMPORT_MAX_RETRIES || '3'),
  retryDelay: parseInt(process.env.USER_IMPORT_RETRY_DELAY || '1000'),
  enableFallback: process.env.USER_IMPORT_ENABLE_FALLBACK !== 'false',
  fallbackBatchSize: parseInt(process.env.USER_IMPORT_FALLBACK_BATCH_SIZE || '50'),
  sessionTimeout: parseInt(process.env.USER_IMPORT_SESSION_TIMEOUT || '7200000'), // 2 hours
  maxConcurrentBatches: parseInt(process.env.USER_IMPORT_MAX_CONCURRENT_BATCHES || '3'),
  memoryThreshold: parseInt(process.env.USER_IMPORT_MEMORY_THRESHOLD || '512') // MB
});

export const getOptimalBatchSize = (dataSize: number, config: BatchProcessingConfig): number => {
  if (dataSize <= 100) return config.minBatchSize;
  if (dataSize <= 1000) return config.defaultBatchSize;
  if (dataSize <= 10000) return Math.min(config.defaultBatchSize * 1.5, config.maxBatchSize);
  return config.maxBatchSize;
};

export const shouldUseBatchProcessing = (dataSize: number): boolean => {
  const threshold = parseInt(process.env.USER_IMPORT_BATCH_THRESHOLD || '100');
  return dataSize > threshold;
};
