import { beforeEach, describe, expect, it, jest } from "@jest/globals";
import { BadRequestException, NotFoundException } from "@nestjs/common";
import { ImportService } from "../import.service";

describe("Classes ImportService", () => {
  const createRepoMock = () => ({
    findOne: jest.fn(),
    save: jest.fn(),
    create: jest.fn((v) => v),
    insert: jest.fn(),
  });

  const createExcelParserMock = () => ({
    parseExcelFile: jest.fn(),
    generateTemplate: jest.fn(),
  });

  const createValidationMock = () => ({
    validateClassData: jest.fn(),
  });

  const createSessionMock = () => ({
    createSession: jest.fn(),
    getSession: jest.fn(),
    updateSessionValidation: jest.fn(),
    getValidatedData: jest.fn(),
    initializeBatchProcessing: jest.fn(),
    finalizeBatchProcessing: jest.fn(),
    updateSessionImport: jest.fn(),
    getBatchProgress: jest.fn(),
    pauseImport: jest.fn(),
    resumeImport: jest.fn(),
  });

  const createBatchProcessingMock = () => ({
    getOptimizedBatchSize: jest.fn(),
    getDefaultOptions: jest.fn(),
    divideToBatches: jest.fn(),
    calculateStats: jest.fn(),
    logProgress: jest.fn(),
    createFallbackBatches: jest.fn(),
  });

  let excelParserService: ReturnType<typeof createExcelParserMock>;
  let validationService: ReturnType<typeof createValidationMock>;
  let sessionService: ReturnType<typeof createSessionMock>;
  let batchProcessingService: ReturnType<typeof createBatchProcessingMock>;
  let service: ImportService;

  beforeEach(() => {
    excelParserService = createExcelParserMock();
    validationService = createValidationMock();
    sessionService = createSessionMock();
    batchProcessingService = createBatchProcessingMock();

    service = new ImportService(
      createRepoMock() as never,
      createRepoMock() as never,
      excelParserService as never,
      validationService as never,
      sessionService as never,
      batchProcessingService as never,
      {} as never,
      {} as never,
    );
  });

  it("should reject upload when file is missing", async () => {
    await expect(service.uploadFile(undefined as never)).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });

  it("should upload valid excel and create session", async () => {
    excelParserService.parseExcelFile.mockResolvedValue([{ name: "KTPM01" }]);
    sessionService.createSession.mockReturnValue({ id: "s1" });

    const result = await service.uploadFile({
      originalname: "classes.xlsx",
      buffer: Buffer.from("x"),
    } as never);

    expect(result.sessionId).toBe("s1");
    expect(result.totalRows).toBe(1);
  });

  it("should validate data from session", async () => {
    sessionService.getSession.mockReturnValue({ data: [{ name: "KTPM01" }] });
    validationService.validateClassData.mockResolvedValue({
      isValid: true,
      summary: { total: 1, valid: 1, invalid: 0, duplicates: 0, conflicts: 0 },
      errors: [],
      warnings: [],
      data: [{ name: "KTPM01", _errors: [], _warnings: [] }],
    });

    const result = await service.validateData("s1");

    expect(result.isValid).toBe(true);
    expect(result.previewData).toHaveLength(1);
  });

  it("should reject executeImport when no valid data", async () => {
    sessionService.getSession.mockReturnValue({ status: "validated" });
    sessionService.getValidatedData.mockReturnValue([]);

    await expect(service.executeImport("s1")).rejects.toThrow(
      "No valid rows found to import",
    );
  });

  it("should throw not found when session does not exist", async () => {
    sessionService.getSession.mockReturnValue(null);

    await expect(service.getSessionStatus("missing")).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });
});