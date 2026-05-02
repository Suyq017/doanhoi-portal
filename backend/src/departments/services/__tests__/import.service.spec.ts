import { beforeEach, describe, expect, it, jest } from "@jest/globals";
import { BadRequestException, NotFoundException } from "@nestjs/common";
import { ImportService as DepartmentsImportService } from "../import.service";

describe("Departments ImportService", () => {
  const createRepositoryMock = () => ({
    findOne: jest.fn() as any,
    save: jest.fn() as any,
    create: jest.fn((v) => v) as any,
    insert: jest.fn() as any,
  });

  const createExcelParserMock = () => ({
    parseExcelFile: jest.fn() as any,
    generateTemplate: jest.fn() as any,
  });

  const createValidationMock = () => ({
    validateDepartmentData: jest.fn() as any,
  });

  const createSessionMock = () => ({
    createSession: jest.fn() as any,
    getSession: jest.fn() as any,
    updateSessionValidation: jest.fn() as any,
    getValidatedData: jest.fn() as any,
    updateSessionImport: jest.fn() as any,
    getBatchProgress: jest.fn() as any,
    getNextPendingBatch: jest.fn() as any,
    initializeBatchProcessing: jest.fn() as any,
    finalizeBatchProcessing: jest.fn() as any,
    updateBatchProgress: jest.fn() as any,
    pauseImport: jest.fn() as any,
    resumeImport: jest.fn() as any,
    updateSessionStatus: jest.fn() as any,
  });

  const createBatchProcessingMock = () => ({
    createBatches: jest.fn() as any,
    updateBatchStatus: jest.fn() as any,
    createFallbackBatches: jest.fn() as any,
    calculateStats: jest.fn() as any,
  });

  const createConfigMock = () => ({
    shouldUseBatchProcessing: jest.fn() as any,
    getOptimizedBatchSize: jest.fn() as any,
    getBatchProcessingConfig: jest.fn() as any,
    getTransactionConfig: jest.fn() as any,
    getPerformanceConfig: jest.fn() as any,
  });

  const createMonitoringMock = () => ({
    initializeSessionMonitoring: jest.fn() as any,
    finalizeSessionMonitoring: jest.fn() as any,
    updateSessionProgress: jest.fn() as any,
    recordDatabaseOperation: jest.fn() as any,
    recordError: jest.fn() as any,
  });

  const createTransactionMock = () => ({
    executeTransaction: jest.fn() as any,
  });

  let service: DepartmentsImportService;
  let excelParserService: ReturnType<typeof createExcelParserMock>;
  let validationService: ReturnType<typeof createValidationMock>;
  let sessionService: ReturnType<typeof createSessionMock>;
  let batchProcessingService: ReturnType<typeof createBatchProcessingMock>;
  let configService: ReturnType<typeof createConfigMock>;
  let transactionService: ReturnType<typeof createTransactionMock>;
  let monitoringService: ReturnType<typeof createMonitoringMock>;
  let repositoryMock: ReturnType<typeof createRepositoryMock>;

  beforeEach(() => {
    repositoryMock = createRepositoryMock();
    excelParserService = createExcelParserMock();
    validationService = createValidationMock();
    sessionService = createSessionMock();
    batchProcessingService = createBatchProcessingMock();
    configService = createConfigMock();
    transactionService = createTransactionMock();
    monitoringService = createMonitoringMock();

    service = new DepartmentsImportService(
      repositoryMock as never,
      excelParserService as never,
      validationService as never,
      sessionService as never,
      batchProcessingService as never,
      transactionService as never,
      configService as never,
      monitoringService as never,
    );
  });

  it("should reject upload when file is missing", async () => {
    await expect(service.uploadFile(undefined as never)).rejects.toThrow(BadRequestException);
  });

  it("should reject non-excel upload", async () => {
    await expect(
      service.uploadFile({ originalname: "departments.txt" } as never),
    ).rejects.toThrow("Only Excel files (.xlsx, .xls) are allowed");
  });

  it("should upload and create department import session", async () => {
    excelParserService.parseExcelFile.mockResolvedValue([{ name: "Finance" }]);
    sessionService.createSession.mockReturnValue({ id: "session-1" });

    const result = await service.uploadFile({
      originalname: "departments.xlsx",
      buffer: Buffer.from("x"),
    } as never);

    expect(result.sessionId).toBe("session-1");
    expect(result.totalRows).toBe(1);
  });

  it("should reject upload when parsed excel has no rows", async () => {
    excelParserService.parseExcelFile.mockResolvedValue([]);

    await expect(
      service.uploadFile({ originalname: "departments.xlsx", buffer: Buffer.from("x") } as never),
    ).rejects.toThrow("Excel file contains no data rows");
  });

  it("should wrap upload parser errors", async () => {
    excelParserService.parseExcelFile.mockRejectedValue(new Error("bad excel"));

    await expect(
      service.uploadFile({ originalname: "departments.xlsx", buffer: Buffer.from("x") } as never),
    ).rejects.toThrow("Failed to parse Excel file: bad excel");
  });

  it("should reject validateData when session is missing", async () => {
    sessionService.getSession.mockReturnValue(null);

    await expect(service.validateData("missing")).rejects.toThrow("Import session not found or expired");
  });

  it("should reject validateData when session has no data", async () => {
    sessionService.getSession.mockReturnValue({ data: null });

    await expect(service.validateData("session-1")).rejects.toThrow("No data found in session");
  });

  it("should validate department data from session", async () => {
    sessionService.getSession.mockReturnValue({ data: [{ name: "Finance" }] });
    validationService.validateDepartmentData.mockResolvedValue({
      isValid: true,
      summary: { total: 1, valid: 1, invalid: 0, duplicates: 0, conflicts: 0 },
      errors: [],
      warnings: [],
      data: [{ name: "Finance", _errors: [], _warnings: [] }],
    });

    const result = await service.validateData("session-1");

    expect(result.isValid).toBe(true);
    expect(result.previewData).toHaveLength(1);
  });

  it("should reject validateData when validation throws", async () => {
    sessionService.getSession.mockReturnValue({ data: [{ name: "Finance" }] });
    validationService.validateDepartmentData.mockRejectedValue(new Error("validate boom"));

    await expect(service.validateData("session-1")).rejects.toThrow("Validation failed: validate boom");
  });

  it("should reject executeImport when session is missing", async () => {
    sessionService.getSession.mockReturnValue(null);

    await expect(service.executeImport("missing")).rejects.toThrow("Import session not found or expired");
  });

  it("should reject executeImport when validated data is missing", async () => {
    sessionService.getSession.mockReturnValue({ status: "validated" });
    sessionService.getValidatedData.mockReturnValue(null);

    await expect(service.executeImport("session-1")).rejects.toThrow("No validated data found");
  });

  it("should reject executeImport when session is not validated", async () => {
    sessionService.getSession.mockReturnValue({ status: "uploaded" });

    await expect(service.executeImport("session-1")).rejects.toThrow(
      "Data must be validated before import",
    );
  });

  it("should execute normal import path when batch processing is disabled", async () => {
    sessionService.getSession.mockReturnValue({ status: "validated", fileName: "departments.xlsx" });
    sessionService.getValidatedData.mockReturnValue([{ name: "Finance", _errors: [], _warnings: [] }]);
    configService.shouldUseBatchProcessing.mockReturnValue(false);
    jest.spyOn(service as any, "performImport").mockResolvedValue({
      success: true,
      importedCount: 1,
      skippedCount: 0,
      failedCount: 0,
      errors: [],
      importedIds: ["d-1"],
    });

    const result = await service.executeImport("session-1");

    expect(result.success).toBe(true);
    expect(result.importedCount).toBe(1);
  });

  it("should execute batch import path when enabled", async () => {
    sessionService.getSession.mockReturnValue({ status: "validated", fileName: "departments.xlsx" });
    sessionService.getValidatedData.mockReturnValue([{ name: "Finance", _errors: [], _warnings: [] }]);
    configService.shouldUseBatchProcessing.mockReturnValue(true);
    jest.spyOn(service as any, "performBatchImport").mockResolvedValue({
      importResult: {
        success: true,
        importedCount: 1,
        skippedCount: 0,
        failedCount: 0,
        errors: [],
        importedIds: ["d-1"],
      },
      batchStats: { estimatedTimeRemaining: 0 },
    });

    const result = await service.executeImport("session-1");

    expect(result.success).toBe(true);
    expect(result.batchStats).toBeDefined();
  });

  it("should return failed result when executeImport throws", async () => {
    sessionService.getSession.mockReturnValue({ status: "validated", fileName: "departments.xlsx" });
    sessionService.getValidatedData.mockReturnValue([{ name: "Finance", _errors: [], _warnings: [] }]);
    configService.shouldUseBatchProcessing.mockReturnValue(false);
    jest.spyOn(service as any, "performImport").mockRejectedValue(new Error("db down"));

    await expect(service.executeImport("session-1")).rejects.toThrow("Import failed: db down");
    expect(sessionService.updateSessionImport).toHaveBeenCalledWith(
      "session-1",
      expect.objectContaining({ success: false, failedCount: 1 }),
    );
  });

  it("should get import progress and compute percent", async () => {
    sessionService.getSession.mockReturnValue({ status: "importing" });
    sessionService.getBatchProgress.mockReturnValue({
      currentBatch: 1,
      totalBatches: 2,
      processedRows: 50,
      totalRows: 100,
      batches: [],
      errors: [],
    });
    batchProcessingService.calculateStats.mockReturnValue({ estimatedTimeRemaining: 120 });

    const result = await service.getImportProgress("session-1");

    expect(result.progress.progressPercent).toBe(50);
    expect(result.progress.estimatedTimeRemaining).toBe(120);
  });

  it("should reject pause when session is not importing", async () => {
    sessionService.getSession.mockReturnValue({ status: "validated" });

    await expect(service.pauseImport("session-1")).rejects.toThrow(
      "Only importing sessions can be paused",
    );
  });

  it("should pause successfully when session is importing", async () => {
    sessionService.getSession.mockReturnValue({ status: "importing" });

    await expect(service.pauseImport("session-1")).resolves.toEqual({
      success: true,
      message: "Import paused successfully",
    });
    expect(sessionService.pauseImport).toHaveBeenCalledWith("session-1");
  });

  it("should reject resume when session is not paused", async () => {
    sessionService.getSession.mockReturnValue({ status: "importing" });

    await expect(service.resumeImport("session-1")).rejects.toThrow(
      "Only paused sessions can be resumed",
    );
  });

  it("should resume successfully for paused session", async () => {
    sessionService.getSession.mockReturnValue({ status: "paused" });
    sessionService.getValidatedData.mockReturnValue(null);

    await expect(service.resumeImport("session-1")).resolves.toEqual({
      success: true,
      message: "Import resumed successfully",
    });
    expect(sessionService.resumeImport).toHaveBeenCalledWith("session-1");
  });

  it("should cancel import only for importing or paused sessions", async () => {
    sessionService.getSession.mockReturnValueOnce({ status: "validated" });
    await expect(service.cancelImport("session-1")).rejects.toThrow(
      "Only importing or paused sessions can be cancelled",
    );

    sessionService.getSession.mockReturnValueOnce({ status: "paused" });
    await expect(service.cancelImport("session-1")).resolves.toEqual({
      success: true,
      message: "Import cancelled successfully",
    });
    expect(sessionService.updateSessionStatus).toHaveBeenCalledWith("session-1", "cancelled");
  });

  it("should resume a paused session and mark it imported when no batches remain", async () => {
    sessionService.getSession.mockReturnValue({ status: "paused" });
    sessionService.getValidatedData.mockReturnValue([{ name: "Finance", _errors: [], _warnings: [] }]);
    sessionService.getBatchProgress.mockReturnValue({ batches: [] });
    sessionService.getNextPendingBatch.mockReturnValue(null);

    await expect(service.resumeImport("session-1")).resolves.toEqual({
      success: true,
      message: "Import resumed successfully",
    });

    expect(sessionService.resumeImport).toHaveBeenCalledWith("session-1");
    expect(sessionService.updateSessionStatus).toHaveBeenCalledWith("session-1", "imported");
  });

  it("should retry failed batches through fallback batches when enabled", async () => {
    const validatedData = [
      { name: "Finance", _errors: [], _warnings: [] },
      { name: "HR", _errors: [], _warnings: [] },
    ];

    sessionService.getSession.mockReturnValue({ status: "validated", fileName: "departments.xlsx" });
    sessionService.getValidatedData.mockReturnValue(validatedData);
    configService.getBatchProcessingConfig.mockReturnValue({
      maxRetries: 2,
      retryDelay: 0,
      fallbackBatchSize: 1,
      enableFallback: true,
      enableOptimizedBatchSize: false,
    });
    configService.getOptimizedBatchSize.mockReturnValue(1);
    batchProcessingService.createBatches.mockReturnValue([{ batchId: "batch-1", data: [{ name: "Finance" }] }]);
    batchProcessingService.createFallbackBatches.mockReturnValue([
      { batchId: "batch-1-fallback", data: [{ name: "Finance" }] },
    ]);
    batchProcessingService.calculateStats.mockReturnValue({ estimatedTimeRemaining: 0 });
    const processBatchSpy = jest.spyOn(service as any, "processBatch")
      .mockRejectedValueOnce(new Error("batch failed"))
      .mockResolvedValueOnce({
        success: true,
        importedCount: 1,
        skippedCount: 0,
        failedCount: 0,
        errors: [],
        importedIds: ["dept-1"],
        processingTime: 5,
      });

    const result = await (service as any).performBatchImport(
      "session-1",
      validatedData,
      { enableFallback: true },
    );

    expect(processBatchSpy).toHaveBeenCalledTimes(2);
    expect(batchProcessingService.createFallbackBatches).toHaveBeenCalledWith(
      { batchId: "batch-1", data: [{ name: "Finance" }] },
      expect.objectContaining({ enableFallback: true }),
    );
    expect(result.importResult.success).toBe(false);
    expect(result.importResult.importedCount).toBe(1);
    expect(sessionService.initializeBatchProcessing).toHaveBeenCalledWith("session-1", 1, 2);
    expect(sessionService.finalizeBatchProcessing).toHaveBeenCalledWith("session-1", false);
  });

  it("should throw not found when no batch progress exists", async () => {
    sessionService.getSession.mockReturnValue({ status: "importing" });
    sessionService.getBatchProgress.mockReturnValue(null);

    await expect(service.getImportProgress("session-1")).rejects.toThrow(
      "No batch progress found for this session",
    );
  });

  it("should throw not found when session does not exist", async () => {
    sessionService.getSession.mockReturnValue(null);

    await expect(service.getSessionStatus("missing")).rejects.toThrow(NotFoundException);
  });

  it("should return template buffer", async () => {
    const buffer = Buffer.from("template");
    excelParserService.generateTemplate.mockReturnValue(buffer);

    await expect(service.generateTemplate()).resolves.toBe(buffer);
  });

  describe("private import flow branches", () => {
    it("should import valid rows and normalize empty fields", async () => {
      repositoryMock.findOne.mockResolvedValue(null);
      repositoryMock.save.mockResolvedValue({ id: "dept-1" });

      const result = await (service as any).performImport([
        {
          name: "Finance",
          code: "",
          description: "",
          _errors: [],
          _warnings: [],
        },
      ]);

      expect(repositoryMock.create).toHaveBeenCalledWith({
        name: "Finance",
        code: null,
        description: null,
      });
      expect(repositoryMock.save).toHaveBeenCalledWith({
        name: "Finance",
        code: null,
        description: null,
      });
      expect(result).toEqual(
        expect.objectContaining({
          success: true,
          importedCount: 1,
          skippedCount: 0,
          failedCount: 0,
          importedIds: ["dept-1"],
        }),
      );
    });

    it("should skip conflicting rows when skipConflicts is enabled", async () => {
      repositoryMock.findOne.mockResolvedValue({ id: "existing" });

      const result = await (service as any).performImport(
        [
          {
            name: "Finance",
            code: "FIN",
            description: "Budget",
            _errors: [],
            _warnings: [],
          },
        ],
        { skipConflicts: true },
      );

      expect(result.importedCount).toBe(0);
      expect(result.skippedCount).toBe(1);
      expect(result.errors).toHaveLength(0);
      expect(repositoryMock.save).not.toHaveBeenCalled();
    });

    it("should report duplicate conflict with code information", async () => {
      repositoryMock.findOne.mockImplementation(({ where }: any) => {
        if (where.name) {
          return Promise.resolve(null);
        }
        if (where.code) {
          return Promise.resolve({ id: "existing-code" });
        }
        return Promise.resolve(null);
      });

      const result = await (service as any).performImport([
        {
          name: "Finance",
          code: "FIN",
          description: "Budget",
          _errors: [],
          _warnings: [],
        },
      ]);

      expect(result.success).toBe(true);
      expect(result.importedCount).toBe(0);
      expect(result.failedCount).toBe(1);
      expect(result.errors[0]).toContain('or code "FIN" already exists');
    });

    it("should mark a row failed when repository save throws", async () => {
      repositoryMock.findOne.mockResolvedValue(null);
      repositoryMock.save.mockRejectedValue(new Error("db down"));

      const result = await (service as any).performImport([
        {
          name: "Finance",
          code: "FIN",
          description: "Budget",
          _errors: [],
          _warnings: [],
        },
      ]);

      expect(result.success).toBe(false);
      expect(result.importedCount).toBe(0);
      expect(result.failedCount).toBe(1);
      expect(result.errors[0]).toBe("Failed to import row: db down");
    });
  });

  describe("private batch flow branches", () => {
    it("should process batch data through a query runner repository", async () => {
      const queryRunnerRepository = {
        findOne: (jest.fn() as any).mockResolvedValue(null),
        insert: (jest.fn() as any).mockResolvedValue({ identifiers: [{ id: "d-1" }, { id: "d-2" }] }),
      };
      const queryRunner = {
        manager: {
          getRepository: jest.fn().mockReturnValue(queryRunnerRepository),
        },
      };

      const result = await (service as any).processBatchData(
        [
          { name: "Finance", code: "FIN", description: "Budget", _errors: [], _warnings: [] },
          { name: "HR", code: "HR", description: "People", _errors: [], _warnings: [] },
        ],
        { skipConflicts: false },
        queryRunner,
      );

      expect(queryRunner.manager.getRepository).toHaveBeenCalled();
      expect(queryRunnerRepository.insert).toHaveBeenCalledWith([
        { name: "Finance", code: "FIN", description: "Budget" },
        { name: "HR", code: "HR", description: "People" },
      ]);
      expect(result).toEqual(
        expect.objectContaining({
          importedCount: 2,
          skippedCount: 0,
          failedCount: 0,
          importedIds: ["d-1", "d-2"],
        }),
      );
    });

    it("should accumulate failures when bulk insert throws", async () => {
      repositoryMock.findOne.mockResolvedValue(null);
      repositoryMock.insert.mockRejectedValue(new Error("insert failed"));

      const result = await (service as any).processBatchData([
        { name: "Finance", code: "FIN", description: "Budget", _errors: [], _warnings: [] },
        { name: "HR", code: "HR", description: "People", _errors: [], _warnings: [] },
      ]);

      expect(result.importedCount).toBe(0);
      expect(result.failedCount).toBe(2);
      expect(result.errors[0]).toBe("Bulk insert failed: insert failed");
    });

    it("should execute batch processing without transaction when disabled", async () => {
      const processBatchDataSpy = jest
        .spyOn(service as any, "processBatchData")
        .mockResolvedValue({
          importedCount: 1,
          skippedCount: 0,
          failedCount: 0,
          errors: [],
          importedIds: ["d-1"],
        });

      configService.getBatchProcessingConfig.mockReturnValue({
        maxRetries: 3,
        retryDelay: 0,
        fallbackBatchSize: 1,
        enableFallback: false,
        enableOptimizedBatchSize: false,
      });
      configService.getOptimizedBatchSize.mockReturnValue(50);
      configService.getTransactionConfig.mockReturnValue({});
      configService.getPerformanceConfig.mockReturnValue({ slowQueryThreshold: 1000 });

      const result = await (service as any).processBatch(
        { batchId: "batch-1", data: [{ name: "Finance" }] },
        { enableTransaction: false },
      );

      expect(processBatchDataSpy).toHaveBeenCalledWith(
        [{ name: "Finance" }],
        { enableTransaction: false },
      );
      expect(result).toEqual(
        expect.objectContaining({
          success: true,
          importedCount: 1,
          failedCount: 0,
          errors: [],
        }),
      );
    });

    it("should record transaction failure when transaction execution fails", async () => {
      transactionService.executeTransaction.mockResolvedValue({
        success: false,
        executionTime: 25,
        error: "deadlock",
        errorType: "transaction",
      });
      configService.getTransactionConfig.mockReturnValue({});
      configService.getPerformanceConfig.mockReturnValue({ slowQueryThreshold: 1000 });

      const processBatchDataSpy = jest.spyOn(service as any, "processBatchData");

      const result = await (service as any).processBatch(
        { batchId: "batch-9", data: [{ name: "Finance" }] },
        { enableTransaction: true },
      );

      expect(processBatchDataSpy).not.toHaveBeenCalled();
      expect(result.success).toBe(false);
      expect(result.failedCount).toBe(1);
      expect(result.errors).toContain("deadlock");
      expect(monitoringService.recordError).toHaveBeenCalledWith(
        "Transaction failed for batch batch-9: deadlock",
        "transaction",
      );
    });
  });
});