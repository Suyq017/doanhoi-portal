import { beforeEach, describe, expect, it, jest } from "@jest/globals";
import { BatchProcessingService } from "../batch-processing.service";

describe("Classes BatchProcessingService", () => {
  let service: BatchProcessingService;

  beforeEach(() => {
    service = new BatchProcessingService();
  });

  it("should handle empty and small batch divisions", () => {
    expect(service.divideToBatches([], 4)).toEqual([]);

    const tiny = service.divideToBatches([1, 2, 3], 10);
    expect(tiny).toHaveLength(1);
    expect(tiny[0]).toMatchObject({ batchNumber: 1, startIndex: 0, endIndex: 2, totalRows: 3, data: [1, 2, 3] });
  });

  it("should divide data into batches", () => {
    const data = Array.from({ length: 9 }, (_, i) => i);
    const batches = service.divideToBatches(data, 4);

    expect(batches).toHaveLength(3);
    expect(batches[0].startIndex).toBe(0);
    expect(batches[2].data).toEqual([8]);
  });

  it("should calculate processing stats", () => {
    const start = new Date("2026-01-01T00:00:00.000Z");
    const end = new Date("2026-01-01T00:00:20.000Z");

    const stats = service.calculateStats(start, end, 10, 5, 1, 1000, 500, 450, 30, 20);

    expect(stats.processingTime).toBe(20000);
    expect(stats.averageTimePerBatch).toBe(4000);
    expect(stats.estimatedRemainingTime).toBe(20000);
  });

  it("should return zero average time when no batch completed", () => {
    const start = new Date("2026-01-01T00:00:00.000Z");
    const end = new Date("2026-01-01T00:00:05.000Z");

    const stats = service.calculateStats(start, end, 2, 0, 2, 100, 0, 0, 0, 0);
    expect(stats.averageTimePerBatch).toBe(0);
    expect(stats.estimatedRemainingTime).toBe(0);
  });

  it("should optimize batch size by data size", () => {
    expect(service.getOptimizedBatchSize(50)).toBeGreaterThanOrEqual(50);
    expect(service.getOptimizedBatchSize(500)).toBeGreaterThanOrEqual(50);
    expect(service.getOptimizedBatchSize(3000)).toBeGreaterThan(0);
    expect(service.getOptimizedBatchSize(30000)).toBeGreaterThan(0);
  });

  it("should use custom options in optimized batch size", () => {
    expect(service.getOptimizedBatchSize(20000, { batchSize: 20 })).toBeGreaterThanOrEqual(40);
  });

  it("should validate batch data and create fallback batches", () => {
    const batch = {
      batchNumber: 1,
      data: Array.from({ length: 120 }, (_, i) => ({ i })),
      startIndex: 0,
      endIndex: 119,
      totalRows: 120,
    } as any;

    expect(service.validateBatchData(batch)).toBe(true);

    const fallback = service.createFallbackBatches(batch, 50);
    expect(fallback).toHaveLength(3);
    expect(fallback[1].batchNumber).toBeCloseTo(1.1);
  });

  it("should reject invalid batch data shapes", () => {
    const errorSpy = jest.spyOn((service as any).logger, "error").mockImplementation(() => undefined);
    const warnSpy = jest.spyOn((service as any).logger, "warn").mockImplementation(() => undefined);

    expect(service.validateBatchData(null as any)).toBe(false);
    expect(service.validateBatchData({ batchNumber: 1, data: [], startIndex: 0, endIndex: 0, totalRows: 0 } as any)).toBe(false);
    expect(service.validateBatchData({ batchNumber: 1, data: [1], startIndex: 5, endIndex: 4, totalRows: 1 } as any)).toBe(false);
    expect(errorSpy).toHaveBeenCalled();
    expect(warnSpy).toHaveBeenCalled();
  });

  it("should log progress and return default options copy", () => {
    const logSpy = jest.spyOn((service as any).logger, "log").mockImplementation(() => undefined);

    service.logProgress({
      totalBatches: 4,
      completedBatches: 2,
      failedBatches: 1,
      totalRows: 100,
      processedRows: 50,
      successfulRows: 40,
      failedRows: 10,
      skippedRows: 0,
      processingTime: 12000,
      averageTimePerBatch: 6000,
      estimatedRemainingTime: 12000,
    });
    expect(logSpy).toHaveBeenCalledWith(expect.stringContaining("Batch Progress: 2/4 batches (50.0%)"));

    const defaults = service.getDefaultOptions();
    defaults.batchSize = 999;
    expect(service.getDefaultOptions().batchSize).not.toBe(999);
  });

  it("should handle retry allowed and denied branches", async () => {
    jest.spyOn(global, "setTimeout").mockImplementation((cb: any) => {
      cb();
      return 1 as any;
    });
    const warnSpy = jest.spyOn((service as any).logger, "warn").mockImplementation(() => undefined);
    const errorSpy = jest.spyOn((service as any).logger, "error").mockImplementation(() => undefined);

    const allowed = await service.handleRetry({ batchNumber: 1, data: [1], startIndex: 0, endIndex: 0, totalRows: 1 }, new Error("boom"), 1, 3, 10);
    const denied = await service.handleRetry({ batchNumber: 2, data: [1], startIndex: 0, endIndex: 0, totalRows: 1 }, new Error("boom"), 3, 3, 10);

    expect(allowed).toBe(true);
    expect(denied).toBe(false);
    expect(warnSpy).toHaveBeenCalled();
    expect(errorSpy).toHaveBeenCalled();
  });

  it("should merge custom options with defaults", () => {
    const options = service.mergeOptions({ batchSize: 250, maxRetries: 4 });

    expect(options.batchSize).toBe(250);
    expect(options.maxRetries).toBe(4);
    expect(options.enableFallback).toBeDefined();
  });
});