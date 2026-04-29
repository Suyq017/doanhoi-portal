import { beforeEach, describe, expect, it, jest } from "@jest/globals";
import { BadRequestException, NotFoundException } from "@nestjs/common";
import { ImportService as UsersImportService } from "../import.service";

describe("Users ImportService", () => {
  const createRepositoryMock = () => ({
    findOne: jest.fn() as any,
    save: jest.fn() as any,
    create: jest.fn((v) => v) as any,
  });

  const createExcelParserMock = () => ({
    parseExcelFile: jest.fn() as any,
  });

  const createValidationMock = () => ({
    validateImportData: jest.fn() as any,
  });

  const createSessionMock = () => ({
    createSession: jest.fn() as any,
    getSession: jest.fn() as any,
    updateSessionValidation: jest.fn() as any,
    getValidatedData: jest.fn() as any,
    initializeBatchProcessing: jest.fn() as any,
    finalizeBatchProcessing: jest.fn() as any,
    updateImportResult: jest.fn() as any,
    getBatchProgress: jest.fn() as any,
    updateBatchProgress: jest.fn() as any,
    pauseImport: jest.fn() as any,
    resumeImport: jest.fn() as any,
    cleanupExpiredSessions: jest.fn() as any,
  });

  const createBatchProcessingMock = () => ({
    getOptimizedBatchSize: jest.fn() as any,
    mergeOptions: jest.fn() as any,
    divideToBatches: jest.fn() as any,
    createFallbackBatches: jest.fn() as any,
    getDefaultOptions: jest.fn() as any,
  });

  const createTransactionMock = () => ({
    executeWithTransaction: jest.fn() as any,
  });

  const createMonitoringMock = () => ({
    startSession: jest.fn() as any,
    endSession: jest.fn() as any,
    updateBatchStats: jest.fn() as any,
    updateProgress: jest.fn() as any,
    getSystemHealth: jest.fn() as any,
  });

  const createBackgroundJobMock = () => ({
    createJob: jest.fn() as any,
    getJob: jest.fn() as any,
    cancelJob: jest.fn() as any,
    getQueueStatus: jest.fn() as any,
  });

  let service: UsersImportService;
  let excelParserService: ReturnType<typeof createExcelParserMock>;
  let validationService: ReturnType<typeof createValidationMock>;
  let sessionService: ReturnType<typeof createSessionMock>;
  let batchProcessingService: ReturnType<typeof createBatchProcessingMock>;
  let transactionService: ReturnType<typeof createTransactionMock>;
  let monitoringService: ReturnType<typeof createMonitoringMock>;
  let backgroundJobService: ReturnType<typeof createBackgroundJobMock>;

  beforeEach(() => {
    excelParserService = createExcelParserMock();
    validationService = createValidationMock();
    sessionService = createSessionMock();
    batchProcessingService = createBatchProcessingMock();
    transactionService = createTransactionMock();
    monitoringService = createMonitoringMock();
    backgroundJobService = createBackgroundJobMock();

    service = new UsersImportService(
      createRepositoryMock() as never,
      createRepositoryMock() as never,
      createRepositoryMock() as never,
      createRepositoryMock() as never,
      createRepositoryMock() as never,
      excelParserService as never,
      validationService as never,
      sessionService as never,
      batchProcessingService as never,
      transactionService as never,
      monitoringService as never,
      backgroundJobService as never,
      {} as never,
    );
  });

  it("should reject upload when file is missing", async () => {
    await expect(service.uploadFile(undefined as never)).rejects.toThrow(BadRequestException);
  });

  it("should reject upload when file is too large", async () => {
    await expect(
      service.uploadFile({
        mimetype: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        size: 5 * 1024 * 1024 + 1,
        originalname: "users.xlsx",
      } as never),
    ).rejects.toThrow("File size too large. Maximum size is 5MB");
  });

  it("should reject upload with invalid file type", async () => {
    await expect(
      service.uploadFile({ mimetype: "text/plain", size: 100, originalname: "a.txt" } as never),
    ).rejects.toThrow("Invalid file type. Please upload an Excel file (.xlsx or .xls)");
  });

  it("should upload valid file and create session", async () => {
    excelParserService.parseExcelFile.mockResolvedValue([{ code: "SV001" }]);
    sessionService.createSession.mockReturnValue({ id: "session-1" });

    const result = await service.uploadFile({
      mimetype: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      size: 1024,
      originalname: "users.xlsx",
      buffer: Buffer.from("x"),
    } as never);

    expect(result.sessionId).toBe("session-1");
    expect(result.totalRows).toBe(1);
  });

  it("should reject upload when parsing fails", async () => {
    excelParserService.parseExcelFile.mockRejectedValue(new Error("boom"));

    await expect(
      service.uploadFile({
        mimetype: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        size: 1024,
        originalname: "users.xlsx",
        buffer: Buffer.from("x"),
      } as never),
    ).rejects.toThrow("Failed to parse Excel file: boom");
  });

  it("should reject upload when parsed Excel has no valid rows", async () => {
    excelParserService.parseExcelFile.mockResolvedValue([]);

    await expect(
      service.uploadFile({
        mimetype: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        size: 1024,
        originalname: "users.xlsx",
        buffer: Buffer.from("x"),
      } as never),
    ).rejects.toThrow("No valid data found in the Excel file");
  });

  it("should reject validation when session is missing", async () => {
    sessionService.getSession.mockReturnValue(null);

    await expect(service.validateData("missing")).rejects.toThrow("Import session not found");
  });

  it("should reject validation when session has no data", async () => {
    sessionService.getSession.mockReturnValue({ data: null });

    await expect(service.validateData("session-1")).rejects.toThrow("No data found in session");
  });

  it("should validate data and aggregate errors/warnings", async () => {
    sessionService.getSession.mockReturnValue({ metadata: { totalRows: 2 }, data: [{}] });
    validationService.validateImportData.mockResolvedValue([
      { validation: { isValid: true }, _errors: [], _warnings: [{ message: "warn" }] },
      { validation: { isValid: false }, _errors: [{ message: "err" }], _warnings: [] },
    ]);

    const result = await service.validateData("session-1");

    expect(result.canProceed).toBe(true);
    expect(result.errors).toHaveLength(1);
    expect(result.warnings).toHaveLength(1);
    expect(sessionService.updateSessionValidation).toHaveBeenCalled();
  });

  it("should reject validation when validation service throws", async () => {
    sessionService.getSession.mockReturnValue({ metadata: { totalRows: 1 }, data: [{}] });
    validationService.validateImportData.mockRejectedValue(new Error("validation failed"));

    await expect(service.validateData("session-1")).rejects.toThrow("Validation failed: validation failed");
  });

  it("should reject executeImport when session is not validated", async () => {
    sessionService.getSession.mockReturnValue({ status: "uploaded" });

    await expect(service.executeImport("session-1")).rejects.toThrow("Session data must be validated before import");
  });

  it("should reject executeImport when session is missing", async () => {
    sessionService.getSession.mockReturnValue(null);

    await expect(service.executeImport("missing")).rejects.toThrow("Import session not found");
  });

  it("should reject executeImport when no valid data", async () => {
    sessionService.getSession.mockReturnValue({ status: "validated" });
    sessionService.getValidatedData.mockReturnValue([]);

    await expect(service.executeImport("session-1")).rejects.toThrow("No valid data found to import");
  });

  it("should execute import and return summary", async () => {
    sessionService.getSession.mockReturnValue({ status: "validated" });
    sessionService.getValidatedData.mockReturnValue([{ code: "SV001" }]);
    batchProcessingService.getOptimizedBatchSize.mockReturnValue(100);
    batchProcessingService.mergeOptions.mockReturnValue({ batchSize: 100, enableFallback: true });
    jest.spyOn(service as any, "performBatchImport").mockResolvedValue({
      success: true,
      importedCount: 1,
      skippedCount: 0,
      failedCount: 0,
      errors: [],
      importedIds: ["u-1"],
    });

    const result = await service.executeImport("session-1");

    expect(result.success).toBe(true);
    expect(result.importedCount).toBe(1);
    expect(monitoringService.startSession).toHaveBeenCalled();
    expect(monitoringService.endSession).toHaveBeenCalled();
  });

  it("should execute import using provided batch size and finalize success", async () => {
    sessionService.getSession.mockReturnValue({ status: "validated" });
    sessionService.getValidatedData.mockReturnValue([{ code: "SV001" }, { code: "SV002" }]);
    batchProcessingService.mergeOptions.mockReturnValue({ batchSize: 2, enableFallback: true });
    jest.spyOn(service as any, "performBatchImport").mockResolvedValue({
      success: true,
      importedCount: 2,
      skippedCount: 0,
      failedCount: 0,
      errors: [],
      importedIds: ["u-1", "u-2"],
    });

    const result = await service.executeImport("session-1", { batchSize: 2 });

    expect(batchProcessingService.getOptimizedBatchSize).not.toHaveBeenCalled();
    expect(batchProcessingService.mergeOptions).toHaveBeenCalledWith(
      expect.objectContaining({ batchSize: 2, enableFallback: true }),
    );
    expect(sessionService.initializeBatchProcessing).toHaveBeenCalledWith("session-1", 2, 2);
    expect(result.message).toContain("2 users imported");
  });

  it("should finalize failed import when batch processing throws", async () => {
    sessionService.getSession.mockReturnValue({ status: "validated" });
    sessionService.getValidatedData.mockReturnValue([{ code: "SV001" }]);
    batchProcessingService.getOptimizedBatchSize.mockReturnValue(1);
    batchProcessingService.mergeOptions.mockReturnValue({ batchSize: 1, enableFallback: true });
    jest.spyOn(service as any, "performBatchImport").mockRejectedValue(new Error("deadlock"));

    await expect(service.executeImport("session-1")).rejects.toThrow("Import failed: deadlock");
    expect(sessionService.finalizeBatchProcessing).toHaveBeenCalledWith("session-1", false);
    expect(sessionService.updateImportResult).toHaveBeenCalled();
  });

  it("should return failed summary message when import result is unsuccessful", async () => {
    sessionService.getSession.mockReturnValue({ status: "validated" });
    sessionService.getValidatedData.mockReturnValue([{ code: "SV001" }]);
    batchProcessingService.getOptimizedBatchSize.mockReturnValue(50);
    batchProcessingService.mergeOptions.mockReturnValue({ batchSize: 50, enableFallback: true });
    jest.spyOn(service as any, "performBatchImport").mockResolvedValue({
      success: false,
      importedCount: 0,
      skippedCount: 0,
      failedCount: 1,
      errors: ["conflict"],
      importedIds: [],
    });

    const result = await service.executeImport("session-1");

    expect(result.success).toBe(false);
    expect(result.message).toContain("Import failed: conflict");
  });

  it("should create async background job for large import", async () => {
    sessionService.getSession.mockReturnValue({ status: "validated" });
    sessionService.getValidatedData.mockReturnValue(Array.from({ length: 1001 }, (_, i) => ({ code: `SV${i}` })));
    backgroundJobService.createJob.mockReturnValue("job-1");

    const result = await service.executeImportAsync("session-1");

    expect(result.jobId).toBe("job-1");
    expect(backgroundJobService.createJob).toHaveBeenCalled();
  });

  it("should execute import synchronously for small async import", async () => {
    sessionService.getSession.mockReturnValue({ status: "validated" });
    sessionService.getValidatedData.mockReturnValue([{ code: "SV001" }]);
    jest.spyOn(service as any, "executeImport").mockResolvedValue({ message: "ok" });

    const result = await service.executeImportAsync("session-1");

    expect(result.jobId).toBe("");
    expect(result.message).toBe("ok");
  });

  it("should reject async import when session is missing", async () => {
    sessionService.getSession.mockReturnValue(null);

    await expect(service.executeImportAsync("missing")).rejects.toThrow("Import session not found");
  });

  it("should reject async import when session is not validated", async () => {
    sessionService.getSession.mockReturnValue({ status: "uploaded" });

    await expect(service.executeImportAsync("session-1")).rejects.toThrow("Session data must be validated before import");
  });

  it("should reject async import when no valid data exists", async () => {
    sessionService.getSession.mockReturnValue({ status: "validated" });
    sessionService.getValidatedData.mockReturnValue([]);

    await expect(service.executeImportAsync("session-1")).rejects.toThrow("No valid data found to import");
  });

  it("should throw when background job not found", async () => {
    backgroundJobService.getJob.mockReturnValue(null);

    await expect(service.getBackgroundJobStatus("missing-job")).rejects.toThrow(NotFoundException);
  });

  it("should return background job status and queue status", async () => {
    backgroundJobService.getJob.mockReturnValue({
      id: "job-1",
      sessionId: "session-1",
      status: "running",
      progress: 50,
      result: null,
      error: null,
      createdAt: new Date("2026-01-01T00:00:00Z"),
      startedAt: new Date("2026-01-01T00:01:00Z"),
      completedAt: null,
    });
    backgroundJobService.getQueueStatus.mockReturnValue({ pending: 1, running: 1 });

    await expect(service.getBackgroundJobStatus("job-1")).resolves.toMatchObject({ jobId: "job-1", status: "running" });
    await expect(service.getQueueStatus()).resolves.toEqual({ pending: 1, running: 1 });
  });

  it("should support cancel background job success and failure", async () => {
    backgroundJobService.cancelJob.mockReturnValueOnce(true).mockReturnValueOnce(false);

    await expect(service.cancelBackgroundJob("job-1")).resolves.toEqual({
      success: true,
      message: "Background job cancelled successfully",
    });
    await expect(service.cancelBackgroundJob("job-2")).resolves.toEqual({
      success: false,
      message: "Failed to cancel background job",
    });
  });

  it("should return null progress when no batch progress exists", async () => {
    sessionService.getSession.mockReturnValue({ status: "validated" });
    sessionService.getBatchProgress.mockReturnValue(null);

    await expect(service.getImportProgress("session-1")).resolves.toEqual({
      sessionId: "session-1",
      status: "validated",
      progress: null,
    });
  });

  it("should reject progress request when session is missing", async () => {
    sessionService.getSession.mockReturnValue(null);

    await expect(service.getImportProgress("missing")).rejects.toThrow("Import session not found or expired");
  });

  it("should return detailed batch progress when available", async () => {
    sessionService.getSession.mockReturnValue({ status: "importing" });
    sessionService.getBatchProgress.mockReturnValue({
      currentBatch: 2,
      totalBatches: 4,
      processedRows: 40,
      totalRows: 100,
      batchSize: 25,
      canPause: true,
      canResume: false,
      isPaused: false,
      batchResults: [
        {
          batchNumber: 1,
          status: "success",
          processedRows: 25,
          successfulRows: 25,
          failedRows: 0,
          errors: [],
          retryCount: 0,
        },
        {
          batchNumber: 2,
          status: "failed",
          processedRows: 15,
          successfulRows: 10,
          failedRows: 5,
          errors: ["e1", "e2", "e3", "e4", "e5", "e6"],
          retryCount: 1,
        },
      ],
    });

    const result = await service.getImportProgress("session-1");

    expect(result.progress.completedBatches).toBe(1);
    expect(result.progress.failedBatches).toBe(1);
    expect(result.progress.progressPercent).toBe(40);
    expect(result.batches[1].errors).toHaveLength(5);
  });

  it("should return session status when found and throw when missing", async () => {
    sessionService.getSession.mockReturnValueOnce({ id: "session-1", status: "validated" });
    await expect(service.getSessionStatus("session-1")).resolves.toMatchObject({ id: "session-1" });

    sessionService.getSession.mockReturnValueOnce(null);
    await expect(service.getSessionStatus("missing")).rejects.toThrow("Import session not found");
  });

  it("should generate template buffer and expose system health", async () => {
    monitoringService.getSystemHealth.mockReturnValue({ status: "healthy", users: 10 });

    const buffer = await service.generateTemplate();

    expect(Buffer.isBuffer(buffer)).toBe(true);
    expect(buffer.length).toBeGreaterThan(0);
    expect(await service.getSystemHealth()).toEqual({ status: "healthy", users: 10 });
  });

  it("should support pause, resume and cancel import responses", async () => {
    sessionService.pauseImport.mockReturnValueOnce(true).mockReturnValueOnce(false);
    sessionService.resumeImport.mockReturnValueOnce(true).mockReturnValueOnce(false);
    sessionService.finalizeBatchProcessing.mockReturnValueOnce(true).mockReturnValueOnce(false);

    await expect(service.pauseImport("session-1")).resolves.toEqual({ success: true, message: "Import paused successfully" });
    await expect(service.pauseImport("session-1")).resolves.toEqual({ success: false, message: "Failed to pause import" });
    await expect(service.resumeImport("session-1")).resolves.toEqual({ success: true, message: "Import resumed successfully" });
    await expect(service.resumeImport("session-1")).resolves.toEqual({ success: false, message: "Failed to resume import" });
    await expect(service.cancelImport("session-1")).resolves.toEqual({ success: true, message: "Import cancelled successfully" });
    await expect(service.cancelImport("session-1")).resolves.toEqual({ success: false, message: "Failed to cancel import" });
  });

  it("should return system health and cleanup sessions", async () => {
    monitoringService.getSystemHealth.mockReturnValue({ status: "healthy" });

    await expect(service.getSystemHealth()).resolves.toEqual({ status: "healthy" });

    service.cleanupSessions();
    expect(sessionService.cleanupExpiredSessions).toHaveBeenCalled();
  });

  it("should stop batch import early when session is paused", async () => {
    batchProcessingService.divideToBatches.mockReturnValue([
      { batchNumber: 1, data: [{ rowIndex: 1, data: { code: "SV001" } }] },
    ]);
    sessionService.getBatchProgress.mockReturnValue({ isPaused: true });

    const result = await (service as any).performBatchImport(
      "session-1",
      [{ rowIndex: 1, data: { code: "SV001" } }],
      { batchSize: 100 },
      { skipConflicts: true },
    );

    expect(result).toMatchObject({
      importedCount: 0,
      failedCount: 0,
      skippedCount: 0,
      errors: [],
    });
    expect(sessionService.updateBatchProgress).not.toHaveBeenCalled();
  });

  it("should aggregate successful batch results in performBatchImport", async () => {
    const batch = { batchNumber: 1, data: [{ rowIndex: 1, data: { code: "SV001" } }] };
    batchProcessingService.divideToBatches.mockReturnValue([batch]);
    sessionService.getBatchProgress.mockReturnValue({ isPaused: false });
    jest.spyOn(service as any, "processBatchWithTransaction").mockResolvedValue({
      success: true,
      importedCount: 1,
      skippedCount: 0,
      failedCount: 0,
      errors: [],
      importedIds: ["u-1"],
    });

    const result = await (service as any).performBatchImport(
      "session-1",
      [{ rowIndex: 1, data: { code: "SV001" } }],
      { batchSize: 100 },
      { skipConflicts: true },
    );

    expect(result).toMatchObject({ importedCount: 1, failedCount: 0, success: true });
    expect(monitoringService.updateBatchStats).toHaveBeenCalledWith("session-1", 1, expect.any(Number), true);
    expect(monitoringService.updateProgress).toHaveBeenCalledWith("session-1", 1, 1, 0);
    expect(sessionService.updateBatchProgress).toHaveBeenCalledWith(
      "session-1",
      1,
      expect.objectContaining({ status: "processing" }),
    );
    expect(sessionService.updateBatchProgress).toHaveBeenCalledWith(
      "session-1",
      1,
      expect.objectContaining({ status: "success" }),
    );
  });

  it("should mark batch failed and stop when conflicts are not skipped", async () => {
    batchProcessingService.divideToBatches.mockReturnValue([
      { batchNumber: 1, data: [{ rowIndex: 1, data: { code: "SV001" } }] },
      { batchNumber: 2, data: [{ rowIndex: 2, data: { code: "SV002" } }] },
    ]);
    sessionService.getBatchProgress.mockReturnValue({ isPaused: false });
    const processSpy = jest
      .spyOn(service as any, "processBatchWithTransaction")
      .mockRejectedValue(new Error("tx fail"));

    const result = await (service as any).performBatchImport(
      "session-1",
      [
        { rowIndex: 1, data: { code: "SV001" } },
        { rowIndex: 2, data: { code: "SV002" } },
      ],
      { batchSize: 1 },
      { skipConflicts: false },
    );

    expect(result.success).toBe(false);
    expect(result.failedCount).toBe(1);
    expect(result.errors).toContain("Batch 1: tx fail");
    expect(processSpy).toHaveBeenCalledTimes(1);
    expect(sessionService.updateBatchProgress).toHaveBeenCalledWith(
      "session-1",
      1,
      expect.objectContaining({ status: "failed" }),
    );
  });

  it("should fallback when transaction result is unsuccessful", async () => {
    const batch = { batchNumber: 1, data: [{ rowIndex: 1, data: { code: "SV001" } }] };
    transactionService.executeWithTransaction.mockResolvedValue({
      success: false,
      result: null,
      error: new Error("transaction failed"),
    });
    const fallbackResult = {
      success: true,
      importedCount: 1,
      skippedCount: 0,
      failedCount: 0,
      errors: [],
      importedIds: ["u-1"],
    };
    const fallbackSpy = jest
      .spyOn(service as any, "processBatchWithFallback")
      .mockResolvedValue(fallbackResult);

    const result = await (service as any).processBatchWithTransaction(batch, { skipConflicts: true });

    expect(result).toEqual(fallbackResult);
    expect(fallbackSpy).toHaveBeenCalledWith(batch, { skipConflicts: true });
  });

  it("should aggregate fallback batches and single-row fallback results", async () => {
    const batch = {
      batchNumber: 1,
      data: [
        { rowIndex: 1, data: { code: "SV001" } },
        { rowIndex: 2, data: { code: "SV002" } },
      ],
    };
    const fallbackBatch = {
      batchNumber: 101,
      data: [
        { rowIndex: 1, data: { code: "SV001" } },
        { rowIndex: 2, data: { code: "SV002" } },
      ],
    };
    batchProcessingService.getDefaultOptions.mockReturnValue({ fallbackBatchSize: 1 });
    batchProcessingService.createFallbackBatches.mockReturnValue([fallbackBatch]);

    jest.spyOn(service as any, "processBatchWithTransaction").mockRejectedValue(new Error("still fails"));
    const singleRowSpy = jest.spyOn(service as any, "processSingleRowFallback").mockResolvedValue({
      success: true,
      importedCount: 1,
      skippedCount: 0,
      failedCount: 1,
      errors: ["Row 2: invalid"],
      importedIds: ["u-1"],
    });

    const result = await (service as any).processBatchWithFallback(batch, { skipConflicts: true });

    expect(result).toMatchObject({ importedCount: 1, failedCount: 1 });
    expect(result.errors).toContain("Row 2: invalid");
    expect(singleRowSpy).toHaveBeenCalledWith(fallbackBatch.data, { skipConflicts: true });
  });

  it("should process single-row fallback with mixed success and failure", async () => {
    transactionService.executeWithTransaction
      .mockResolvedValueOnce({ success: true, result: { id: "u-1" } })
      .mockResolvedValueOnce({ success: false, error: new Error("duplicate code") });

    const result = await (service as any).processSingleRowFallback([
      { rowIndex: 1, data: { code: "SV001" } },
      { rowIndex: 2, data: { code: "SV002" } },
    ]);

    expect(result).toMatchObject({ importedCount: 1, failedCount: 1 });
    expect(result.errors).toContain("Row 2: duplicate code");
  });

  it("should throw when level-1 organizations are missing", async () => {
    const queryRunner = {
      manager: {
        findOne: jest.fn().mockResolvedValue(null),
        create: jest.fn((_: any, value: any) => value),
        save: jest.fn(async (_: any, value: any) => value),
      },
    } as any;

    await expect(
      (service as any).getOrCreateParentOrganizationsWithTransaction(queryRunner, "MT22KH02", "MT"),
    ).rejects.toThrow("Không tìm thấy tổ chức cấp 1");
  });

  it("should create parent organizations for international classes", async () => {
    const doanTruong = { id: "org-doan" };
    const hoiSinhVien = { id: "org-hoi" };
    const saves: any[] = [];

    const queryRunner = {
      manager: {
        findOne: jest
          .fn()
          .mockResolvedValueOnce(doanTruong)
          .mockResolvedValueOnce(hoiSinhVien)
          .mockResolvedValueOnce(null)
          .mockResolvedValueOnce(null),
        create: jest.fn((_entity: any, value: any) => value),
        save: jest.fn(async (_entity: any, value: any) => {
          const saved = { ...value, id: `saved-${saves.length + 1}` };
          saves.push(saved);
          return saved;
        }),
      },
    } as any;

    const result = await (service as any).getOrCreateParentOrganizationsWithTransaction(
      queryRunner,
      "CC01",
      "MT",
    );

    expect(result.lienChiDoan).toBeDefined();
    expect(result.lienChiHoi).toBeDefined();
    expect(saves[0].code).toBe("LIEN_CHI_DOAN_QT");
    expect(saves[1].code).toBe("LIEN_CHI_HOI_QT");
  });

  it("should create class organizations when missing and reuse existing ones", async () => {
    jest.spyOn(service as any, "getOrCreateParentOrganizationsWithTransaction").mockResolvedValue({
      lienChiDoan: { id: "lien-chi-doan" },
      lienChiHoi: { id: "lien-chi-hoi" },
    });

    const queryRunner = {
      manager: {
        findOne: jest
          .fn()
          .mockResolvedValueOnce(null)
          .mockResolvedValueOnce({ id: "existing-chi-hoi", code: "CHI_HOI_MT22KH02" }),
        create: jest.fn((_entity: any, value: any) => value),
        save: jest.fn(async (_entity: any, value: any) => ({ ...value, id: "created-chi-doan" })),
      },
    } as any;

    const result = await (service as any).createClassOrganizationsWithTransaction(
      queryRunner,
      "MT22KH02",
      "MT",
    );

    expect(result.chiDoan.id).toBe("created-chi-doan");
    expect(result.chiHoi.id).toBe("existing-chi-hoi");
    expect(queryRunner.manager.create).toHaveBeenCalled();
  });

  it("should create memberships for chi doan/chi hoi when absent", async () => {
    const queryRunner = {
      manager: {
        findOne: jest
          .fn()
          .mockResolvedValueOnce(null)
          .mockResolvedValueOnce(null),
        create: jest.fn((_entity: any, value: any) => value),
        save: jest.fn(async (_entity: any, value: any) => ({ ...value, id: `m-${Math.random()}` })),
      },
    } as any;

    jest.spyOn(service as any, "createClassOrganizationsWithTransaction").mockResolvedValue({
      chiDoan: { id: "chi-doan-1" },
      chiHoi: { id: "chi-hoi-1" },
    });

    await (service as any).handleClassOrganizationWithTransaction(
      queryRunner,
      "MT22KH02",
      "MT",
      "user-1",
    );

    expect(queryRunner.manager.save).toHaveBeenCalledTimes(2);
  });

  it("should skip membership creation when already exists", async () => {
    const queryRunner = {
      manager: {
        findOne: jest.fn().mockResolvedValue({ id: "membership-existing" }),
        create: jest.fn((_entity: any, value: any) => value),
        save: jest.fn(async (_entity: any, value: any) => value),
      },
    } as any;

    jest.spyOn(service as any, "createClassOrganizationsWithTransaction").mockResolvedValue({
      chiDoan: { id: "chi-doan-1" },
      chiHoi: { id: "chi-hoi-1" },
    });

    await (service as any).handleClassOrganizationWithTransaction(
      queryRunner,
      "MT22KH02",
      "MT",
      "user-1",
    );

    expect(queryRunner.manager.save).not.toHaveBeenCalled();
  });
});