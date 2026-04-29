import { beforeEach, describe, expect, it, jest } from "@jest/globals";
import { DepartmentBatchImportConfigService } from "../batch-import-config.service";

describe("DepartmentBatchImportConfigService", () => {
  const createConfigServiceMock = (overrides: Record<string, any> = {}) => ({
    get: jest.fn((key: string, defaultValue?: any) => {
      if (Object.prototype.hasOwnProperty.call(overrides, key)) {
        return overrides[key];
      }
      return defaultValue;
    }),
  });

  let configService: ReturnType<typeof createConfigServiceMock>;
  let service: DepartmentBatchImportConfigService;

  beforeEach(() => {
    configService = createConfigServiceMock();
    service = new DepartmentBatchImportConfigService(configService as never);
  });

  it("should provide default config sections", () => {
    expect(service.getBatchProcessingConfig().defaultBatchSize).toBe(200);
    expect(service.getTransactionConfig().enableTransaction).toBe(true);
    expect(service.getSessionConfig().sessionTimeout).toBe(2 * 60 * 60 * 1000);
  });

  it("should optimize batch size by data size", () => {
    expect(service.getOptimizedBatchSize(500)).toBeGreaterThanOrEqual(100);
    expect(service.getOptimizedBatchSize(3000)).toBeGreaterThanOrEqual(200);
    expect(service.getOptimizedBatchSize(8000)).toBeGreaterThanOrEqual(300);
    expect(service.getOptimizedBatchSize(20000)).toBeLessThanOrEqual(400);
  });

  it("should disable optimized batch size when config is off", () => {
    const disabledService = new DepartmentBatchImportConfigService(
      createConfigServiceMock({ BATCH_IMPORT_ENABLE_OPTIMIZED_BATCH_SIZE: false }) as never,
    );

    expect(disabledService.getOptimizedBatchSize(10000)).toBe(200);
  });

  it("should validate config and detect invalid batch size bounds", () => {
    const invalidService = new DepartmentBatchImportConfigService(
      createConfigServiceMock({
        BATCH_IMPORT_DEFAULT_BATCH_SIZE: 10,
        BATCH_IMPORT_MIN_BATCH_SIZE: 50,
        BATCH_IMPORT_MAX_BATCH_SIZE: 20,
      }) as never,
    );

    const result = invalidService.validateConfig();

    expect(result.isValid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });

  it("should determine when to use batch processing", () => {
    expect(service.shouldUseBatchProcessing(50)).toBe(false);
    expect(service.shouldUseBatchProcessing(101)).toBe(true);
  });
});