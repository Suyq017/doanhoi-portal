import { afterEach, beforeEach, describe, expect, it, jest } from "@jest/globals";
import { ClassBatchImportService } from "../batch-import.service";

describe("ClassBatchImportService", () => {
  const createClassRepo = () => ({
    findOne: jest.fn(),
    create: jest.fn((v) => v),
    save: jest.fn(async (v) => ({ ...v, id: "class-1" })),
  });

  const createDepartmentRepo = () => ({
    findOne: jest.fn(),
  });

  let classesRepository: ReturnType<typeof createClassRepo>;
  let departmentsRepository: ReturnType<typeof createDepartmentRepo>;
  let service: ClassBatchImportService;

  beforeEach(() => {
    jest.spyOn(global, "setInterval").mockImplementation(() => 1 as any);
    classesRepository = createClassRepo();
    departmentsRepository = createDepartmentRepo();
    service = new ClassBatchImportService(
      classesRepository as never,
      departmentsRepository as never,
      {} as never,
    );
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("should process batch successfully", async () => {
    classesRepository.findOne.mockResolvedValue(null);
    departmentsRepository.findOne.mockResolvedValue({ id: "dept-1" });

    const result = await service.processBatch(
      [{ name: "KTPM01", year: 2024, departmentCode: "CNTT" } as never],
      { batchNumber: 1, totalBatches: 1, sessionId: "s1" },
      { skipDuplicates: false, validateDepartments: true },
    );

    expect(result.batchResult.successful).toBe(1);
    expect(result.sessionSummary.isComplete).toBe(true);
  });

  it("should mark duplicate as failed when skipDuplicates is false", async () => {
    classesRepository.findOne.mockResolvedValue({ id: "existing" });

    const result = await service.processBatch(
      [{ name: "KTPM01", year: 2024 } as never],
      { batchNumber: 1, totalBatches: 1, sessionId: "s2" },
      { skipDuplicates: false, validateDepartments: false },
    );

    expect(result.batchResult.failed).toBe(1);
    expect(result.batchResult.errors[0]).toContain("đã tồn tại");
  });

  it("should clear session cache", () => {
    expect(service.getActiveSessionsCount()).toBe(0);
    service.clearAllSessions();
    expect(service.getActiveSessionsCount()).toBe(0);
  });
});