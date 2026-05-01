import { afterEach, beforeEach, describe, expect, it, jest } from "@jest/globals";
import { DepartmentBatchImportMonitoringService } from "../batch-import-monitoring.service";

describe("DepartmentBatchImportMonitoringService", () => {
  const createConfigServiceMock = (enabled = true) => ({
    getPerformanceConfig: jest.fn(() => ({
      enablePerformanceMonitoring: enabled,
      performanceLoggingInterval: 1000,
      slowQueryThreshold: 5000,
    })),
    getMemoryConfig: jest.fn(() => ({
      maxMemoryPerSession: 512 * 1024 * 1024,
      memoryWarningThreshold: 1,
      enableMemoryMonitoring: true,
    })),
  });

  beforeEach(() => {
    jest.spyOn(global, "setInterval").mockImplementation(() => 1 as any);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("should initialize, update and finalize session monitoring", () => {
    const service = new DepartmentBatchImportMonitoringService(
      createConfigServiceMock(true) as never,
    );

    service.initializeSessionMonitoring("s1", "file.xlsx", 100);
    service.updateSessionProgress("s1", 50, 45, 5, 1200, 1);
    service.finalizeSessionMonitoring("s1", true);

    const session = service.getSessionMetrics("s1");
    expect(session?.processedRows).toBe(50);
    expect(session?.status).toBe("completed");
  });

  it("should record db operations, errors and deadlocks", () => {
    const service = new DepartmentBatchImportMonitoringService(
      createConfigServiceMock(true) as never,
    );

    service.recordDatabaseOperation("insert", 6000, true, true);
    service.recordDatabaseOperation("update", 1000, false, false);
    service.recordDeadlock("s1", "b1");

    const metrics = service.getCurrentMetrics();
    expect(metrics.databaseStats.totalQueries).toBe(2);
    expect(metrics.databaseStats.slowQueries).toBe(1);
    expect(metrics.errorStats.totalErrors).toBeGreaterThanOrEqual(2);
  });

  it("should keep performance history and detect memory warning", () => {
    const service = new DepartmentBatchImportMonitoringService(
      createConfigServiceMock(true) as never,
    );

    const warning = service.checkMemoryWarning();
    expect(warning.warning).toBe(true);

    const history = service.getPerformanceHistory();
    expect(Array.isArray(history)).toBe(true);
    expect(service.getActiveSessionsMetrics()).toEqual([]);
  });
});