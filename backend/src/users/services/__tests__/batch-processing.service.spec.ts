import { beforeEach, describe, expect, it, jest } from "@jest/globals";
import { UserBatchProcessingService } from "../batch-processing.service";

describe("UserBatchProcessingService", () => {
  let service: UserBatchProcessingService;

  beforeEach(() => {
    service = new UserBatchProcessingService();
  });

  it("should handle empty and oversized divide requests", () => {
    expect(service.divideToBatches([], 4)).toEqual([]);

    const tiny = service.divideToBatches([1, 2, 3], 10);
    expect(tiny).toHaveLength(1);
    expect(tiny[0]).toMatchObject({
      batchNumber: 1,
      startIndex: 0,
      endIndex: 2,
      totalRows: 3,
      data: [1, 2, 3],
    });
  });

  it("should divide data to batches", () => {
    const data = Array.from({ length: 10 }, (_, i) => i);
    const batches = service.divideToBatches(data, 4);

    expect(batches).toHaveLength(3);
    expect(batches[0].batchNumber).toBe(1);
    expect(batches[2].data).toEqual([8, 9]);
  });

  it("should optimize batch size by data size", () => {
    expect(service.getOptimizedBatchSize(50)).toBeGreaterThanOrEqual(50);
    expect(service.getOptimizedBatchSize(2000)).toBe(200);
    expect(service.getOptimizedBatchSize(20000)).toBeLessThanOrEqual(500);
  });

  it("should calculate stats correctly", () => {
    const start = new Date("2026-01-01T00:00:00.000Z");
    const end = new Date("2026-01-01T00:00:10.000Z");

    const stats = service.calculateStats(start, end, 10, 4, 1, 1000, 400, 350, 30, 20);

    expect(stats.processingTime).toBe(10000);
    expect(stats.averageTimePerBatch).toBe(2500);
    expect(stats.estimatedRemainingTime).toBe(15000);
  });

  it("should return zero estimated time when nothing is complete", () => {
    const start = new Date("2026-01-01T00:00:00.000Z");
    const end = new Date("2026-01-01T00:00:05.000Z");

    const stats = service.calculateStats(start, end, 4, 0, 4, 100, 0, 0, 0, 0);

    expect(stats.averageTimePerBatch).toBe(0);
    expect(stats.estimatedRemainingTime).toBe(0);
  });

  it("should validate and create fallback batches", () => {
    const batch = {
      batchNumber: 1,
      data: Array.from({ length: 120 }, (_, i) => ({ i })),
      startIndex: 0,
      endIndex: 119,
      totalRows: 120,
    } as any;

    expect(service.validateBatchData(batch)).toBe(true);

    const fallback = service.createFallbackBatches(batch, 50);
    expect(fallback.length).toBe(3);
    expect(fallback[0].batchNumber).toBe(1);
    expect(fallback[1].batchNumber).toBeCloseTo(1.1);
  });

  it("should reject invalid batch shapes", () => {
    const errorSpy = jest.spyOn((service as any).logger, "error").mockImplementation(() => undefined);
    const warnSpy = jest.spyOn((service as any).logger, "warn").mockImplementation(() => undefined);

    expect(service.validateBatchData(null as any)).toBe(false);
    expect(service.validateBatchData({ batchNumber: 1, data: [], startIndex: 0, endIndex: 0, totalRows: 0 } as any)).toBe(false);
    expect(service.validateBatchData({ batchNumber: 1, data: [1], startIndex: 3, endIndex: 2, totalRows: 1 } as any)).toBe(false);

    expect(errorSpy).toHaveBeenCalled();
    expect(warnSpy).toHaveBeenCalled();
  });

  it("should log progress output", () => {
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
      processingTime: 15000,
      averageTimePerBatch: 7500,
      estimatedRemainingTime: 15000,
    });

    expect(logSpy).toHaveBeenCalledWith(expect.stringContaining("User Import Progress: 2/4 batches (50.0%)"));
  });

  it("should return copies of default options and merge overrides", () => {
    const defaults = service.getDefaultOptions();
    defaults.batchSize = 999;

    expect(service.getDefaultOptions().batchSize).toBe(200);

    const merged = service.mergeOptions({ fallbackBatchSize: 25, enableFallback: false });
    expect(merged.fallbackBatchSize).toBe(25);
    expect(merged.enableFallback).toBe(false);
  });

  it("should handle retry allowed and retry denied paths", async () => {
    jest.spyOn(global, "setTimeout").mockImplementation((cb: any) => {
      cb();
      return 1 as any;
    });
    const warnSpy = jest.spyOn((service as any).logger, "warn").mockImplementation(() => undefined);
    const errorSpy = jest.spyOn((service as any).logger, "error").mockImplementation(() => undefined);

    const retryAllowed = await service.handleRetry(
      { batchNumber: 1, data: [1], startIndex: 0, endIndex: 0, totalRows: 1 },
      new Error("boom"),
      1,
      3,
      10,
    );
    const retryDenied = await service.handleRetry(
      { batchNumber: 2, data: [1], startIndex: 0, endIndex: 0, totalRows: 1 },
      new Error("boom"),
      3,
      3,
      10,
    );

    expect(retryAllowed).toBe(true);
    expect(retryDenied).toBe(false);
    expect(warnSpy).toHaveBeenCalled();
    expect(errorSpy).toHaveBeenCalled();
  });

  it("should merge options with defaults", () => {
    const options = service.mergeOptions({ batchSize: 300, maxRetries: 5 });
    expect(options.batchSize).toBe(300);
    expect(options.maxRetries).toBe(5);
    expect(options.enableFallback).toBe(true);
  });
});