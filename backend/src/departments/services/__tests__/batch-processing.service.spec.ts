import { beforeEach, describe, expect, it } from "@jest/globals";
import {
  DepartmentBatchProcessingService,
  BatchData,
} from "../batch-processing.service";

describe("DepartmentBatchProcessingService", () => {
  let service: DepartmentBatchProcessingService;

  beforeEach(() => {
    service = new DepartmentBatchProcessingService();
  });

  it("should create batches with optimized size", () => {
    const data = Array.from({ length: 250 }, (_, i) => ({ i }));
    const batches = service.createBatches(data);

    expect(batches.length).toBeGreaterThanOrEqual(2);
    expect(batches[0].status).toBe("pending");
  });

  it("should update batch status and calculate stats", () => {
    const batches = service.createBatches(Array.from({ length: 100 }, (_, i) => ({ i })), {
      batchSize: 50,
      enableOptimizedBatchSize: false,
    });
    const target = batches[0];

    const ok = service.updateBatchStatus(batches, target.batchId, "success", undefined, 1000);
    expect(ok).toBe(true);

    const stats = service.calculateStats(batches);
    expect(stats.totalBatches).toBe(batches.length);
    expect(stats.successBatches).toBe(1);
  });

  it("should support retry and fallback batches", () => {
    const batch: BatchData = {
      batchId: "b1",
      batchIndex: 1,
      data: Array.from({ length: 120 }, (_, i) => ({ i })),
      startIndex: 0,
      endIndex: 120,
      status: "failed",
      retryCount: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    expect(
      service.canRetryBatch(batch, {
        batchSize: 200,
        maxRetries: 3,
        retryDelay: 1000,
        fallbackBatchSize: 50,
        enableFallback: true,
        enableOptimizedBatchSize: true,
      }),
    ).toBe(true);

    const retryBatch = service.createRetryBatch(batch, {
      batchSize: 200,
      maxRetries: 3,
      retryDelay: 1000,
      fallbackBatchSize: 50,
      enableFallback: true,
      enableOptimizedBatchSize: true,
    });
    expect(retryBatch.retryCount).toBe(1);

    const fallback = service.createFallbackBatches(batch, {
      batchSize: 200,
      maxRetries: 3,
      retryDelay: 1000,
      fallbackBatchSize: 50,
      enableFallback: true,
      enableOptimizedBatchSize: true,
    });
    expect(fallback.length).toBeGreaterThan(1);
  });

  it("should validate batch data integrity", () => {
    const valid = service.validateBatchData({
      batchId: "b1",
      batchIndex: 1,
      data: [{ i: 1 }, { i: 2 }],
      startIndex: 0,
      endIndex: 2,
      status: "pending",
      retryCount: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    expect(valid.isValid).toBe(true);

    const invalid = service.validateBatchData({
      batchId: "b2",
      batchIndex: 2,
      data: [],
      startIndex: 5,
      endIndex: 3,
      status: "pending",
      retryCount: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    expect(invalid.isValid).toBe(false);
    expect(invalid.errors.length).toBeGreaterThan(0);
  });

  it("should calculate exponential retry delay", () => {
    expect(service.calculateRetryDelay(0, 1000)).toBe(1000);
    expect(service.calculateRetryDelay(1, 1000)).toBe(2000);
    expect(service.calculateRetryDelay(2, 1000)).toBe(4000);
  });
});