import { beforeEach, describe, expect, it, jest } from "@jest/globals";
import { BadRequestException, NotFoundException } from "@nestjs/common";
import { ImportService as DepartmentsImportService } from "../import.service";

describe("Departments ImportService", () => {
  const createRepositoryMock = () => ({
    findOne: jest.fn() as any,
    save: jest.fn() as any,
    create: jest.fn((v) => v) as any,
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
    pauseImport: jest.fn() as any,
    resumeImport: jest.fn() as any,
    updateSessionStatus: jest.fn() as any,
  });

  const createBatchProcessingMock = () => ({
    calculateStats: jest.fn() as any,
  });

  const createConfigMock = () => ({
    shouldUseBatchProcessing: jest.fn() as any,
  });

  const createMonitoringMock = () => ({
    initializeSessionMonitoring: jest.fn() as any,
    finalizeSessionMonitoring: jest.fn() as any,
  });

  let service: DepartmentsImportService;
  let excelParserService: ReturnType<typeof createExcelParserMock>;
  let validationService: ReturnType<typeof createValidationMock>;
  let sessionService: ReturnType<typeof createSessionMock>;
  let batchProcessingService: ReturnType<typeof createBatchProcessingMock>;
  let configService: ReturnType<typeof createConfigMock>;

  beforeEach(() => {
    excelParserService = createExcelParserMock();
    validationService = createValidationMock();
    sessionService = createSessionMock();
    batchProcessingService = createBatchProcessingMock();
    configService = createConfigMock();

    service = new DepartmentsImportService(
      createRepositoryMock() as never,
      excelParserService as never,
      validationService as never,
      sessionService as never,
      batchProcessingService as never,
      {} as never,
      configService as never,
      createMonitoringMock() as never,
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
});