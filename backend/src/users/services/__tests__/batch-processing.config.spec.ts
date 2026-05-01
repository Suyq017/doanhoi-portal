import { describe, expect, it } from "@jest/globals";
import {
  getBatchProcessingConfig,
  getOptimalBatchSize,
  shouldUseBatchProcessing,
} from "../batch-processing.config";

describe("users batch-processing.config", () => {
  it("should return config with defaults", () => {
    const config = getBatchProcessingConfig();
    expect(config.defaultBatchSize).toBeGreaterThan(0);
    expect(config.maxBatchSize).toBeGreaterThanOrEqual(config.defaultBatchSize);
  });

  it("should calculate optimal batch size", () => {
    const config = {
      defaultBatchSize: 200,
      maxBatchSize: 500,
      minBatchSize: 50,
      maxRetries: 3,
      retryDelay: 1000,
      enableFallback: true,
      fallbackBatchSize: 50,
      sessionTimeout: 7200000,
      maxConcurrentBatches: 3,
      memoryThreshold: 512,
    };

    expect(getOptimalBatchSize(50, config)).toBe(50);
    expect(getOptimalBatchSize(500, config)).toBe(200);
    expect(getOptimalBatchSize(5000, config)).toBe(300);
    expect(getOptimalBatchSize(20000, config)).toBe(500);
  });

  it("should decide when to use batch processing", () => {
    const previous = process.env.USER_IMPORT_BATCH_THRESHOLD;
    process.env.USER_IMPORT_BATCH_THRESHOLD = "100";

    expect(shouldUseBatchProcessing(100)).toBe(false);
    expect(shouldUseBatchProcessing(101)).toBe(true);

    process.env.USER_IMPORT_BATCH_THRESHOLD = previous;
  });
});