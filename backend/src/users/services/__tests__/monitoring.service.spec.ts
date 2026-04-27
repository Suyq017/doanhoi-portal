import { afterEach, beforeEach, describe, expect, it, jest } from "@jest/globals";
import { UserImportMonitoringService } from "../monitoring.service";

describe("UserImportMonitoringService", () => {
  let service: UserImportMonitoringService;

  beforeEach(() => {
    jest.spyOn(global, "setInterval").mockImplementation(() => 1 as any);
    service = new UserImportMonitoringService();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("should start session and update progress", () => {
    service.startSession("s1", 100);
    service.updateProgress("s1", 40, 35, 5);

    const metric = service.getMetrics("s1");
    expect(metric?.processedRows).toBe(40);
    expect(metric?.successfulRows).toBe(35);
  });

  it("should update batch stats for success and failure", () => {
    service.startSession("s1", 100);
    service.updateBatchStats("s1", 1, 1200, true);
    service.updateBatchStats("s1", 2, 2000, false);

    const metric = service.getMetrics("s1");
    expect(metric?.batchStats.totalBatches).toBe(2);
    expect(metric?.batchStats.completedBatches).toBe(1);
    expect(metric?.batchStats.failedBatches).toBe(1);
  });

  it("should end session and move out of active metrics", () => {
    service.startSession("s1", 100);
    service.updateProgress("s1", 100, 90, 10);
    const ended = service.endSession("s1");

    expect(ended?.endTime).toBeDefined();
    expect(service.getAllActiveMetrics()).toHaveLength(0);
  });

  it("should report system health", () => {
    service.startSession("s1", 100);
    service.updateProgress("s1", 50, 45, 5);

    const health = service.getSystemHealth();
    expect(health.activeSessions).toBe(1);
    expect(health.totalProcessedRows).toBe(50);
  });

  it("should ignore update calls for unknown sessions", () => {
    expect(() => service.updateProgress("missing", 1, 1, 0)).not.toThrow();
    expect(() => service.updateBatchStats("missing", 1, 100, true)).not.toThrow();
    expect(service.endSession("missing")).toBeNull();
  });

  it("should collect memory metrics and warn when memory usage is high", () => {
    service.startSession("s1", 100);
    const warnSpy = jest.spyOn((service as any).logger, "warn").mockImplementation(() => undefined);
    jest.spyOn(process, "memoryUsage").mockReturnValue({
      rss: 0,
      heapTotal: 0,
      heapUsed: 600 * 1024 * 1024,
      external: 0,
      arrayBuffers: 0,
    } as any);

    (service as any).collectSystemMetrics();

    const metric = service.getMetrics("s1");
    expect(metric?.currentMemoryUsage).toBeCloseTo(600, 1);
    expect(metric?.peakMemoryUsage).toBeCloseTo(600, 1);
    expect(warnSpy).toHaveBeenCalled();
  });

  it("should not update memory for ended sessions", () => {
    service.startSession("s1", 100);
    service.endSession("s1");
    const before = service.getMetrics("s1")?.currentMemoryUsage;

    jest.spyOn(process, "memoryUsage").mockReturnValue({
      rss: 0,
      heapTotal: 0,
      heapUsed: 300 * 1024 * 1024,
      external: 0,
      arrayBuffers: 0,
    } as any);

    (service as any).collectSystemMetrics();

    const after = service.getMetrics("s1")?.currentMemoryUsage;
    expect(after).toBe(before);
  });

  it("should cleanup only metrics older than cutoff", () => {
    service.startSession("old", 10);
    service.startSession("new", 10);
    service.endSession("old");
    service.endSession("new");

    const oldMetric = service.getMetrics("old")!;
    const newMetric = service.getMetrics("new")!;
    oldMetric.endTime = new Date(Date.now() - 25 * 60 * 60 * 1000);
    newMetric.endTime = new Date(Date.now() - 1 * 60 * 60 * 1000);

    service.cleanupOldMetrics();

    expect(service.getMetrics("old")).toBeNull();
    expect(service.getMetrics("new")).not.toBeNull();
  });

  it("should clear interval on module destroy", () => {
    const clearSpy = jest.spyOn(global, "clearInterval").mockImplementation(() => undefined as any);

    service.onModuleDestroy();

    expect(clearSpy).toHaveBeenCalledWith(1 as any);
  });
});