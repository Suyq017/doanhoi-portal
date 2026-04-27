import { BadRequestException } from "@nestjs/common";
import { beforeEach, describe, expect, it, jest } from "@jest/globals";
import { BatchImportService } from "../batch-import.service";

describe("BatchImportService", () => {
  const createRepoMock = () => ({});

  const createQueryRunnerMock = () => ({
    connect: jest.fn(async () => undefined),
    startTransaction: jest.fn(async () => undefined),
    commitTransaction: jest.fn(async () => undefined),
    rollbackTransaction: jest.fn(async () => undefined),
    release: jest.fn(async () => undefined),
    isTransactionActive: false,
    manager: {
      insert: jest.fn(async () => ({ identifiers: [] })),
      findOne: jest.fn(async () => null),
      save: jest.fn(async (_entity: any, data: any) => data),
      create: jest.fn((_entity: any, data: any) => data),
    },
  });

  let validationService: { validateImportData: jest.Mock };
  let dataSource: { createQueryRunner: jest.Mock };
  let service: BatchImportService;

  beforeEach(() => {
    validationService = {
      validateImportData: jest.fn(),
    };

    dataSource = {
      createQueryRunner: jest.fn(() => createQueryRunnerMock()),
    };

    service = new BatchImportService(
      createRepoMock() as never,
      createRepoMock() as never,
      createRepoMock() as never,
      createRepoMock() as never,
      createRepoMock() as never,
      dataSource as never,
      validationService as never,
    );
  });

  it("should reject oversized batch", async () => {
    const users = Array.from({ length: 201 }, (_, i) => ({
      code: `U${i}`,
      familyName: "Family",
      givenName: "Given",
    }));

    await expect(
      service.processBatch({
        users,
        batchInfo: { sessionId: "s1", batchNumber: 1, totalBatches: 1 },
        options: {},
      } as never),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it("should process an empty batch and expose session summary", async () => {
    const result = await service.processBatch({
      users: [],
      batchInfo: { sessionId: "s-empty", batchNumber: 1, totalBatches: 1 },
      options: {},
    } as never);

    expect(result.success).toBe(false);
    expect(result.batchResult.processed).toBe(0);

    const summary = service.getSessionSummary("s-empty");
    expect(summary.isComplete).toBe(true);

    service.clearSession("s-empty");
    expect(() => service.getSessionSummary("s-empty")).toThrow(
      BadRequestException,
    );
  });

  it("should process batch successfully and mark session complete", async () => {
    const queryRunner = createQueryRunnerMock();
    dataSource.createQueryRunner.mockReturnValue(queryRunner as never);
    jest.spyOn(service as any, "processSubBatch").mockResolvedValue({
      processed: 2,
      successful: 2,
      failed: 0,
      errors: [],
    });

    const result = await service.processBatch({
      users: [
        { code: "SV001", familyName: "A", givenName: "B" },
        { code: "SV002", familyName: "C", givenName: "D" },
      ],
      batchInfo: { sessionId: "s-ok", batchNumber: 1, totalBatches: 1 },
      options: {},
    } as never);

    expect(result.success).toBe(true);
    expect(result.message).toContain("completed successfully");
    expect(result.sessionSummary.isComplete).toBe(true);
    expect(queryRunner.commitTransaction).toHaveBeenCalled();
  });

  it("should report mixed result when both success and failures exist", async () => {
    const queryRunner = createQueryRunnerMock();
    dataSource.createQueryRunner.mockReturnValue(queryRunner as never);
    jest.spyOn(service as any, "processSubBatch").mockResolvedValue({
      processed: 2,
      successful: 1,
      failed: 1,
      errors: ["Row 2: duplicate"],
    });

    const result = await service.processBatch({
      users: [
        { code: "SV001", familyName: "A", givenName: "B" },
        { code: "SV002", familyName: "C", givenName: "D" },
      ],
      batchInfo: { sessionId: "s-mixed", batchNumber: 1, totalBatches: 1 },
      options: {},
    } as never);

    expect(result.success).toBe(true);
    expect(result.message).toContain("mixed results");
    expect(result.batchResult.failed).toBe(1);
  });

  it("should report failed result when no user is imported", async () => {
    const queryRunner = createQueryRunnerMock();
    dataSource.createQueryRunner.mockReturnValue(queryRunner as never);
    jest.spyOn(service as any, "processSubBatch").mockResolvedValue({
      processed: 2,
      successful: 0,
      failed: 2,
      errors: ["e1", "e2"],
    });

    const result = await service.processBatch({
      users: [
        { code: "SV001", familyName: "A", givenName: "B" },
        { code: "SV002", familyName: "C", givenName: "D" },
      ],
      batchInfo: { sessionId: "s-fail", batchNumber: 1, totalBatches: 1 },
      options: {},
    } as never);

    expect(result.success).toBe(false);
    expect(result.message).toContain("failed. No users were imported successfully");
    expect(result.message).toContain("Session completed with failures");
  });

  it("should rollback transaction when sub-batch processing throws", async () => {
    const queryRunner = createQueryRunnerMock();
    dataSource.createQueryRunner.mockReturnValue(queryRunner as never);
    jest.spyOn(service as any, "processSubBatch").mockRejectedValue(new Error("db timeout"));

    await expect(
      service.processBatch({
        users: [{ code: "SV001", familyName: "A", givenName: "B" }],
        batchInfo: { sessionId: "s-err", batchNumber: 1, totalBatches: 1 },
        options: {},
      } as never),
    ).rejects.toThrow("db timeout");

    expect(queryRunner.rollbackTransaction).toHaveBeenCalled();
    expect(queryRunner.release).toHaveBeenCalled();
  });

  it("should keep session incomplete until final batch", async () => {
    const queryRunner1 = createQueryRunnerMock();
    const queryRunner2 = createQueryRunnerMock();
    dataSource.createQueryRunner
      .mockReturnValueOnce(queryRunner1 as never)
      .mockReturnValueOnce(queryRunner2 as never);
    const subBatchSpy = jest.spyOn(service as any, "processSubBatch");
    subBatchSpy
      .mockResolvedValueOnce({ processed: 1, successful: 1, failed: 0, errors: [] })
      .mockResolvedValueOnce({ processed: 1, successful: 1, failed: 0, errors: [] });

    const batch1 = await service.processBatch({
      users: [{ code: "SV001", familyName: "A", givenName: "B" }],
      batchInfo: { sessionId: "s-2b", batchNumber: 1, totalBatches: 2 },
      options: {},
    } as never);
    const summaryAfterBatch1 = service.getSessionSummary("s-2b");

    const batch2 = await service.processBatch({
      users: [{ code: "SV002", familyName: "C", givenName: "D" }],
      batchInfo: { sessionId: "s-2b", batchNumber: 2, totalBatches: 2 },
      options: {},
    } as never);
    const summaryAfterBatch2 = service.getSessionSummary("s-2b");

    expect(batch1.message).not.toContain("Session completed");
    expect(summaryAfterBatch1.isComplete).toBe(false);
    expect(batch2.message).toContain("Session completed successfully");
    expect(summaryAfterBatch2.isComplete).toBe(true);
  });

  it("should reject empty parsed data", async () => {
    await expect(service.validateParsedData([])).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });

  it("should validate parsed data and paginate errors/warnings", async () => {
    validationService.validateImportData.mockImplementation(async () => [
      {
        data: { code: "SV001" },
        validation: { isValid: true },
        _errors: [],
        _warnings: [{ message: "warning 1" }],
      },
      {
        data: { code: "SV002" },
        validation: { isValid: false },
        _errors: [
          { message: "duplicate code" },
          { message: "already exists" },
        ],
        _warnings: [],
      },
    ]);

    const result = await service.validateParsedData(
      [
        { code: "SV001", familyName: "A", givenName: "B" },
        { code: "SV002", familyName: "C", givenName: "D" },
      ],
      { errorPage: 1, errorLimit: 1, warningPage: 1, warningLimit: 10 },
    );

    expect(result.data).toHaveLength(1);
    expect(result.errors).toHaveLength(1);
    expect(result.warnings).toHaveLength(1);
    expect(result.summary.duplicates).toBe(2);
    expect(result.pagination.errors.total).toBe(2);
  });

  it("should wrap validation service errors", async () => {
    validationService.validateImportData.mockImplementation(async () => {
      throw new Error("validation engine failure");
    });

    await expect(
      service.validateParsedData([{ code: "SV001" }]),
    ).rejects.toThrow("Validation failed");
  });

  it("should use default pagination and transform input payload", async () => {
    validationService.validateImportData.mockResolvedValue([
      {
        data: { code: "SV001", familyName: "A", givenName: "B" },
        validation: { isValid: true },
        _errors: [],
        _warnings: [],
      },
    ]);

    const result = await service.validateParsedData([
      { code: "SV001", familyName: "A", givenName: "B" },
    ]);

    expect(validationService.validateImportData).toHaveBeenCalledWith(
      expect.arrayContaining([
        expect.objectContaining({
          code: "SV001",
          userType: "student",
          membershipStatus: "none",
        }),
      ]),
    );
    expect(result.pagination.errors.page).toBe(1);
    expect(result.pagination.warnings.limit).toBe(50);
    expect(result.summary.valid).toBe(1);
  });

  it("should reset transaction safely when transaction is active", async () => {
    const queryRunner = {
      isTransactionActive: true,
      rollbackTransaction: jest.fn(async () => undefined),
      startTransaction: jest.fn(async () => undefined),
    };

    await (service as any).resetTransactionSafely(queryRunner);

    expect(queryRunner.rollbackTransaction).toHaveBeenCalled();
    expect(queryRunner.startTransaction).toHaveBeenCalled();
  });

  it("should ignore rollback errors and still restart transaction", async () => {
    const queryRunner = {
      isTransactionActive: true,
      rollbackTransaction: jest.fn(async () => {
        throw new Error("already rolled back");
      }),
      startTransaction: jest.fn(async () => undefined),
    };

    await (service as any).resetTransactionSafely(queryRunner);

    expect(queryRunner.rollbackTransaction).toHaveBeenCalled();
    expect(queryRunner.startTransaction).toHaveBeenCalled();
  });

  it("should fail invalid users in processSubBatch before bulk insert", async () => {
    const queryRunner = createQueryRunnerMock();

    const result = await (service as any).processSubBatch(
      [
        { code: "", familyName: "A", givenName: "B" },
        { code: "SV001", familyName: "A", givenName: "B", email: "a@test.com" },
        { code: "SV001", familyName: "C", givenName: "D", email: "a@test.com" },
      ],
      queryRunner,
      {},
      1,
    );

    expect(result.processed).toBe(3);
    expect(result.failed).toBeGreaterThanOrEqual(2);
    expect(result.errors.length).toBeGreaterThanOrEqual(2);
  });

  it("should bulk insert valid users in processSubBatch", async () => {
    const queryRunner = createQueryRunnerMock();
    queryRunner.manager.insert = jest.fn(async () => ({
      identifiers: [{ id: "u1" }, { id: "u2" }],
    }));
    jest.spyOn(service as any, "createUserEntitiesDirectly").mockResolvedValue([
      { code: "SV001" },
      { code: "SV002" },
    ]);
    jest.spyOn(service as any, "handleClassOrganizationCreation").mockResolvedValue(undefined);

    const result = await (service as any).processSubBatch(
      [
        { code: "SV001", familyName: "A", givenName: "B", className: "KTPM01", trainingDepartment: "CNTT" },
        { code: "SV002", familyName: "C", givenName: "D" },
      ],
      queryRunner,
      {},
      1,
    );

    expect(queryRunner.manager.insert).toHaveBeenCalled();
    expect(result.successful).toBe(2);
    expect(result.failed).toBe(0);
  });

  it("should fallback to individual mode on duplicate bulk error", async () => {
    const queryRunner = createQueryRunnerMock();
    queryRunner.isTransactionActive = true;
    queryRunner.manager.insert = jest.fn(async () => {
      throw new Error("duplicate key value violates unique constraint");
    });
    queryRunner.manager.findOne = jest
      .fn()
      .mockResolvedValueOnce({ id: "existing" })
      .mockResolvedValueOnce(null);

    jest.spyOn(service as any, "createUserEntitiesDirectly").mockResolvedValue([
      { code: "SV001" },
      { code: "SV002" },
    ]);
    jest.spyOn(service as any, "processUser").mockResolvedValue({ id: "u2" });

    const result = await (service as any).processSubBatch(
      [
        { code: "SV001", familyName: "A", givenName: "B", email: "a@test.com" },
        { code: "SV002", familyName: "C", givenName: "D", email: "b@test.com" },
      ],
      queryRunner,
      {},
      1,
    );

    expect(queryRunner.rollbackTransaction).toHaveBeenCalled();
    expect(queryRunner.startTransaction).toHaveBeenCalled();
    expect(result.successful).toBe(1);
    expect(result.failed).toBe(1);
  });

  it("should fallback to individual mode on non-duplicate bulk error", async () => {
    const queryRunner = createQueryRunnerMock();
    queryRunner.isTransactionActive = true;
    queryRunner.manager.insert = jest.fn(async () => {
      throw new Error("connection lost");
    });

    jest.spyOn(service as any, "createUserEntitiesDirectly").mockResolvedValue([
      { code: "SV001" },
      { code: "SV002" },
    ]);
    jest
      .spyOn(service as any, "processUser")
      .mockResolvedValueOnce({ id: "u1" })
      .mockRejectedValueOnce(new Error("invalid class"));

    const result = await (service as any).processSubBatch(
      [
        { code: "SV001", familyName: "A", givenName: "B", email: "a@test.com" },
        { code: "SV002", familyName: "C", givenName: "D", email: "b@test.com" },
      ],
      queryRunner,
      {},
      1,
    );

    expect(queryRunner.rollbackTransaction).toHaveBeenCalled();
    expect(queryRunner.startTransaction).toHaveBeenCalled();
    expect(result.successful).toBe(1);
    expect(result.failed).toBe(1);
  });

  it("should create user entities and skip rows that throw", async () => {
    const queryRunner = createQueryRunnerMock();
    queryRunner.manager.findOne = jest
      .fn()
      .mockResolvedValueOnce({ id: "class-1" })
      .mockResolvedValueOnce({ id: "dept-1" })
      .mockResolvedValueOnce({ id: "dept-2" });

    const entities = await (service as any).createUserEntitiesDirectly(
      [
        {
          userData: {
            code: "SV001",
            familyName: "Nguyen",
            givenName: "An",
            email: "nguyen.an@test.com",
            className: "KTPM01",
            managementDepartment: "CNTT",
            trainingDepartment: "CNTT",
            gender: "NAM",
          },
          originalIndex: 0,
          rowNumber: 1,
        },
        {
          userData: {
            code: "SV002",
            familyName: "Tran",
            givenName: "Binh",
            gender: 123,
          },
          originalIndex: 1,
          rowNumber: 2,
        },
      ],
      queryRunner,
    );

    expect(entities).toHaveLength(1);
    expect(entities[0].code).toBe("SV001");
    expect(entities[0].class?.id).toBe("class-1");
  });

  it("should resolve references and import a single user through helper methods", async () => {
    const queryRunner = createQueryRunnerMock();
    queryRunner.manager.findOne = jest
      .fn()
      .mockResolvedValueOnce({ id: "dept-1" })
      .mockResolvedValueOnce({ id: "class-1" })
      .mockResolvedValueOnce({ id: "class-1" })
      .mockResolvedValueOnce({ id: "dept-1" })
      .mockResolvedValueOnce({ id: "dept-1" });
    queryRunner.manager.save = jest.fn(async (_entity: any, data: any) => ({ ...data, id: "u1" }));
    jest.spyOn(service as any, "handleClassOrganizationCreation").mockResolvedValue(undefined);

    const resolved = await (service as any).convertToResolvedUserData(
      {
        code: "SV001",
        familyName: "Nguyen",
        givenName: "An",
        email: "nguyen.an@test.com",
        className: "KTPM01",
        managementDepartment: "CNTT",
        trainingDepartment: "CNTT",
      },
      queryRunner,
    );
    const imported = await (service as any).importUserWithImportService(queryRunner, {
      ...resolved,
      facultyCode: "CNTT",
    });

    expect(resolved.managementDepartmentId).toBe("dept-1");
    expect(resolved.classId).toBe("class-1");
    expect(imported.id).toBe("u1");
  });

  it("should return null in resolve helpers when input is empty or not found", async () => {
    const queryRunner = createQueryRunnerMock();
    queryRunner.manager.findOne = jest.fn(async () => null);

    await expect((service as any).resolveDepartment("", queryRunner)).resolves.toBeNull();
    await expect((service as any).resolveClass("", queryRunner)).resolves.toBeNull();
    await expect((service as any).resolveDepartment("UNKNOWN", queryRunner)).resolves.toBeNull();
    await expect((service as any).resolveClass("UNKNOWN", queryRunner)).resolves.toBeNull();
  });

  it("should throw when level-1 organizations are missing", async () => {
    const queryRunner = createQueryRunnerMock();
    queryRunner.manager.findOne = jest.fn(async (_entity: any, opts: any) => {
      if (opts?.where?.type) {
        return null;
      }
      return null;
    });

    await expect(
      (service as any).getOrCreateParentOrganizationsWithTransaction(
        queryRunner,
        "KTPM01",
        "CNTT",
      ),
    ).rejects.toThrow("Không tìm thấy tổ chức cấp 1");
  });
});