import { BadRequestException, NotFoundException } from "@nestjs/common";
import { ImportService } from "../import.service";

describe("ImportService", () => {
  let svc: ImportService;
  const classesRepository: any = { insert: jest.fn(), save: jest.fn(), create: jest.fn(), findOne: jest.fn() };
  const departmentsRepository: any = {};
  const excelParserService: any = { parseExcelFile: jest.fn(), generateTemplate: jest.fn() };
  const validationService: any = { validateClassData: jest.fn() };
  const sessionService: any = {
    createSession: jest.fn(),
    getSession: jest.fn(),
    updateSessionValidation: jest.fn(),
    getValidatedData: jest.fn(),
    initializeBatchProcessing: jest.fn(),
    finalizeBatchProcessing: jest.fn(),
    updateSessionImport: jest.fn(),
    getBatchProgress: jest.fn(),
    updateBatchProgress: jest.fn(),
    pauseImport: jest.fn(),
    resumeImport: jest.fn(),
  };
  const batchProcessingService: any = {
    getOptimizedBatchSize: jest.fn().mockReturnValue(10),
    getDefaultOptions: jest.fn().mockReturnValue({ batchSize: 10, enableFallback: false, fallbackBatchSize: 1 }),
    divideToBatches: jest.fn(),
    calculateStats: jest.fn(),
    logProgress: jest.fn(),
    createFallbackBatches: jest.fn(),
  };
  const transactionService: any = {};
  const dataSource: any = {};

  beforeEach(() => {
    jest.clearAllMocks();
    svc = new ImportService(
      classesRepository,
      departmentsRepository,
      excelParserService,
      validationService,
      sessionService,
      batchProcessingService,
      transactionService,
      dataSource,
    );
  });

  describe("uploadFile", () => {
    it("throws when no file provided", async () => {
      await expect(svc.uploadFile(undefined as any)).rejects.toThrow(BadRequestException);
    });

    it("throws when invalid extension", async () => {
      const file: any = { originalname: "students.csv", buffer: Buffer.from("a") };
      await expect(svc.uploadFile(file)).rejects.toThrow(BadRequestException);
    });

    it("wraps parse errors in BadRequestException", async () => {
      const file: any = { originalname: "payload.xlsx", buffer: Buffer.from("a") };
      excelParserService.parseExcelFile.mockRejectedValue(new Error("parse fail"));
      await expect(svc.uploadFile(file)).rejects.toThrow(BadRequestException);
    });

    it("returns session info when parse succeeds", async () => {
      const file: any = { originalname: "payload.xlsx", buffer: Buffer.from("a") };
      excelParserService.parseExcelFile.mockResolvedValue([{ name: "A" }]);
      sessionService.createSession.mockReturnValue({ id: "s1" });

      const res = await svc.uploadFile(file);
      expect(res).toHaveProperty("sessionId", "s1");
      expect(res).toHaveProperty("totalRows", 1);
    });
  
      it("should reject upload when excel file contains no data rows", async () => {
        excelParserService.parseExcelFile.mockResolvedValue([]);

        await expect(
          svc.uploadFile({
            originalname: "classes.xlsx",
            buffer: Buffer.from("x"),
          } as never),
        ).rejects.toThrow("Excel file contains no data rows");
      });
  });

  describe("validateData", () => {
    it("throws NotFoundException when session missing", async () => {
      sessionService.getSession.mockReturnValue(undefined);
      await expect(svc.validateData("nope")).rejects.toThrow(NotFoundException);
    });

    it("throws BadRequestException when session has no data", async () => {
      sessionService.getSession.mockReturnValue({ id: "s1", data: null });
      await expect(svc.validateData("s1")).rejects.toThrow(BadRequestException);
    });

    it("returns validation response when valid", async () => {
      const session = { id: "s2", data: [{ name: "C" }] };
      sessionService.getSession.mockReturnValue(session);
      const validationResult: any = {
        isValid: true,
        summary: { total: 1 },
        errors: [],
        warnings: [],
        data: [{ name: "C", _errors: [], _warnings: [] }],
      };
      validationService.validateClassData.mockResolvedValue(validationResult);

      const res = await svc.validateData("s2");
      expect(res).toMatchObject({ sessionId: "s2", isValid: true, summary: { total: 1 } });
      expect(sessionService.updateSessionValidation).toHaveBeenCalledWith("s2", validationResult);
    });
  });

  describe("executeImport", () => {
    it("throws NotFoundException when session missing", async () => {
      sessionService.getSession.mockReturnValue(undefined);
      await expect(svc.executeImport("missing")).rejects.toThrow(NotFoundException);
    });

    it("throws BadRequestException when session not validated", async () => {
      sessionService.getSession.mockReturnValue({ id: "s1", status: "uploading" });
      await expect(svc.executeImport("s1")).rejects.toThrow(BadRequestException);
    });

    it("throws BadRequestException when no valid rows to import", async () => {
      sessionService.getSession.mockReturnValue({ id: "s1", status: "validated" });
      sessionService.getValidatedData.mockReturnValue([{ _errors: ["error"] }]);
      await expect(svc.executeImport("s1")).rejects.toThrow(BadRequestException);
    });

    it("executes import with batch processing", async () => {
      const validRow = { name: "A", year: 2020, _errors: [] };
      sessionService.getSession.mockReturnValue({ id: "s1", status: "validated" });
      sessionService.getValidatedData.mockReturnValue([validRow]);
      const batch = { batchNumber: 1, data: [validRow] };
      batchProcessingService.divideToBatches.mockReturnValue([batch]);
      batchProcessingService.calculateStats.mockReturnValue({});
      
      const spy = jest.spyOn(svc, "executeSimpleImport").mockResolvedValue({
        sessionId: "s1",
        success: true,
        importedCount: 1,
        skippedCount: 0,
        failedCount: 0,
        errors: [],
        message: "OK",
      } as any);

      await svc.executeImport("s1");
      expect(sessionService.finalizeBatchProcessing).toHaveBeenCalled();
    });
  
      it("should execute import with explicit batch size and finish the session", async () => {
        sessionService.getSession.mockReturnValue({ id: "s1", status: "validated" });
        sessionService.getValidatedData.mockReturnValue([
          { name: "KTPM01", year: 2025, _errors: [] },
          { name: "KTPM02", year: 2025, _errors: [] },
        ]);
        batchProcessingService.getDefaultOptions.mockReturnValue({ batchSize: 10, enableFallback: false, fallbackBatchSize: 1 });
        jest.spyOn(svc as any, "performBatchImport").mockResolvedValue({
          success: true,
          importedCount: 2,
          skippedCount: 0,
          failedCount: 0,
          errors: [],
        });

        const result = await svc.executeImport("s1", { batchSize: 2 });

        expect(batchProcessingService.getOptimizedBatchSize).not.toHaveBeenCalled();
        expect(sessionService.initializeBatchProcessing).toHaveBeenCalledWith("s1", 2, 2);
        expect(sessionService.finalizeBatchProcessing).toHaveBeenCalledWith("s1", true);
        expect(result.message).toContain("2 classes imported");
      });

      it("should wrap simple import errors and update the session result", async () => {
        sessionService.getSession.mockReturnValue({ id: "s1", status: "validated" });
        sessionService.getValidatedData.mockReturnValue([
          { name: "KTPM01", year: 2025, _errors: [] },
        ]);
        jest.spyOn(svc as any, "performImport").mockRejectedValue(new Error("insert failed"));

        await expect(svc.executeSimpleImport("s1")).rejects.toThrow("Import failed: insert failed");
        expect(sessionService.updateSessionImport).toHaveBeenCalledWith(
          "s1",
          expect.objectContaining({
            success: false,
            failedCount: 1,
            errors: ["insert failed"],
          }),
        );
      });
  });

  describe("executeSimpleImport", () => {
    it("throws NotFoundException when session missing", async () => {
      sessionService.getSession.mockReturnValue(undefined);
      await expect(svc.executeSimpleImport("missing")).rejects.toThrow(NotFoundException);
    });

    it("throws BadRequestException when session not validated", async () => {
      sessionService.getSession.mockReturnValue({ id: "s1", status: "uploading" });
      await expect(svc.executeSimpleImport("s1")).rejects.toThrow(BadRequestException);
    });

    it("processes and imports valid rows", async () => {
      sessionService.getSession.mockReturnValue({ id: "s1", status: "validated" });
      sessionService.getValidatedData.mockReturnValue([{ name: "A", year: 2020, _errors: [] }]);
      classesRepository.findOne.mockResolvedValue(null);
      classesRepository.insert.mockResolvedValue({ identifiers: [{ id: "c1" }] });

      const res = await svc.executeSimpleImport("s1");
      expect(res.importedCount).toBeGreaterThan(0);
      expect(sessionService.updateSessionImport).toHaveBeenCalled();
    });
  });

  describe("getSessionStatus", () => {
    it("returns session when found", async () => {
      const sess = { id: "s1", status: "importing" };
      sessionService.getSession.mockReturnValue(sess);
      const res = await svc.getSessionStatus("s1");
      expect(res).toEqual(sess);
    });

    it("throws NotFoundException when session missing", async () => {
      sessionService.getSession.mockReturnValue(undefined);
      await expect(svc.getSessionStatus("nope")).rejects.toThrow(NotFoundException);
    });
  });

  describe("generateTemplate", () => {
    it("returns buffer from excelParserService", async () => {
      const buf = Buffer.from("template");
      excelParserService.generateTemplate.mockResolvedValue(buf);
      const res = await svc.generateTemplate();
      expect(res).toEqual(buf);
    });
  });

  describe("getImportProgress", () => {
    it("returns progress info when batch processing active", async () => {
      sessionService.getSession.mockReturnValue({ id: "s1", status: "importing", metadata: { totalRows: 100 } });
      sessionService.getBatchProgress.mockReturnValue({
        currentBatch: 1,
        totalBatches: 5,
        batchResults: [{ status: "success", batchNumber: 1, successCount: 10, failedCount: 0, skippedCount: 0, errors: [] }],
        processedRows: 10,
        batchSize: 20,
        canPause: true,
        canResume: false,
        isPaused: false,
        startTime: new Date(),
      });

      const res = await svc.getImportProgress("s1");
      expect(res).toHaveProperty("sessionId", "s1");
      expect(res.progress).toHaveProperty("currentBatch", 1);
    });
  
    it("returns a fallback message when progress is unavailable", async () => {
        sessionService.getSession.mockReturnValue({ id: "s1", status: "importing" });
        sessionService.getBatchProgress.mockReturnValue(null);

      await expect(svc.getImportProgress("s1")).resolves.toEqual({
        sessionId: "s1",
        status: "importing",
        message: "No batch processing information available",
      });
      });
  });

  describe("performBatchImport", () => {
    it("should stop batch processing when the session is paused", async () => {
      sessionService.getBatchProgress.mockReturnValue({ isPaused: true });
      batchProcessingService.divideToBatches.mockReturnValue([
        { batchNumber: 1, data: [{ name: "KTPM01", _errors: [] }] },
      ]);

      const result = await (svc as any).performBatchImport(
        "s1",
        [{ name: "KTPM01", _errors: [] }],
        { batchSize: 10, enableFallback: false, fallbackBatchSize: 1 },
      );

      expect(result.success).toBe(true);
      expect(result.importedCount).toBe(0);
      expect(sessionService.updateBatchProgress).not.toHaveBeenCalled();
    });
  });

  describe("pauseImport", () => {
    it("pauses import when running", async () => {
      sessionService.getSession.mockReturnValue({ id: "s1", status: "importing" });
      sessionService.pauseImport.mockReturnValue(true);
      const res = await svc.pauseImport("s1");
      expect(res.status).toBe("paused");
    });

    it("throws BadRequestException when not importing", async () => {
      sessionService.getSession.mockReturnValue({ id: "s1", status: "validated" });
      await expect(svc.pauseImport("s1")).rejects.toThrow(BadRequestException);
    });
  });

  describe("resumeImport", () => {
    it("resumes import when paused", async () => {
      sessionService.getSession.mockReturnValue({ id: "s1", status: "paused" });
      sessionService.resumeImport.mockReturnValue(true);
      const res = await svc.resumeImport("s1");
      expect(res.status).toBe("importing");
    });

    it("throws BadRequestException when not paused", async () => {
      sessionService.getSession.mockReturnValue({ id: "s1", status: "importing" });
      await expect(svc.resumeImport("s1")).rejects.toThrow(BadRequestException);
    });
  });

  describe("cancelImport", () => {
    it("cancels importing import", async () => {
      sessionService.getSession.mockReturnValue({ id: "s1", status: "importing" });
      const res = await svc.cancelImport("s1");
      expect(res.status).toBe("failed");
      expect(sessionService.finalizeBatchProcessing).toHaveBeenCalledWith("s1", false);
    });

    it("cancels paused import", async () => {
      sessionService.getSession.mockReturnValue({ id: "s1", status: "paused" });
      const res = await svc.cancelImport("s1");
      expect(res.status).toBe("failed");
    });

    it("throws BadRequestException when import not running or paused", async () => {
      sessionService.getSession.mockReturnValue({ id: "s1", status: "completed" });
      await expect(svc.cancelImport("s1")).rejects.toThrow(BadRequestException);
    });
  });
});