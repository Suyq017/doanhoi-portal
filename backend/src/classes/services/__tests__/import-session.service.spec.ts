import { beforeEach, describe, expect, it } from "@jest/globals";
import { ImportSessionService } from "../import-session.service";

describe("Classes ImportSessionService", () => {
  let service: ImportSessionService;

  beforeEach(() => {
    service = new ImportSessionService();
  });

  it("should create session and update validation metadata", () => {
    const session = service.createSession("classes.xlsx", [{ name: "KTPM01" } as never]);

    const updated = service.updateSessionValidation(session.id, {
      isValid: true,
      data: [{ name: "KTPM01", _errors: [], _warnings: [] }],
      errors: [],
      warnings: [],
      summary: { total: 1, valid: 1, invalid: 0, duplicates: 0, conflicts: 0 },
    } as never);

    expect(updated?.status).toBe("validated");
    expect(updated?.metadata.validRows).toBe(1);
  });

  it("should return null when session is missing or expired", () => {
    expect(service.getSession("missing")).toBeNull();

    const session = service.createSession("classes.xlsx", [{ name: "KTPM01" } as never]);
    const stored = (service as any).sessions.get(session.id);
    stored.expiresAt = new Date(Date.now() - 1000);

    expect(service.getSession(session.id)).toBeNull();
  });

  it("should return null metadata and validated data when session data is absent", () => {
    expect(service.getSessionMetadata("missing")).toBeNull();
    expect(service.getValidatedData("missing")).toBeNull();
  });

  it("should return null or false for invalid batch operations before initialization", () => {
    const session = service.createSession("classes.xlsx", [{ name: "KTPM01" } as never]);

    expect(service.updateBatchProgress(session.id, 1, { processedRows: 1 })).toBe(false);
    expect(service.pauseImport(session.id)).toBe(false);
    expect(service.resumeImport(session.id)).toBe(false);
    expect(service.finalizeBatchProcessing(session.id, true)).toBe(false);
    expect(service.getBatchProgress(session.id)).toBeNull();
    expect(service.getNextPendingBatch(session.id)).toBeNull();
  });

  it("should handle invalid batch indexes and retryable failed batches", () => {
    const session = service.createSession("classes.xlsx", [{ name: "KTPM01" } as never]);
    service.initializeBatchProcessing(session.id, 10, 5);

    expect(service.updateBatchProgress(session.id, 0, { processedRows: 1 })).toBe(false);
    expect(service.updateBatchProgress(session.id, 99, { processedRows: 1 })).toBe(false);

    expect(service.getNextPendingBatch(session.id)?.batchNumber).toBe(1);

    service.updateBatchProgress(session.id, 1, {
      status: "failed",
      processedRows: 5,
      failedCount: 1,
      retryCount: 0,
      maxRetries: 3,
    });

    expect(service.getNextPendingBatch(session.id)?.batchNumber).toBe(1);
  });

  it("should mark successful and failed batches with retry handling", () => {
    const session = service.createSession("classes.xlsx", [{ name: "KTPM01" } as never]);
    service.initializeBatchProcessing(session.id, 10, 5);

    expect(
      service.updateBatchProgress(session.id, 1, {
        status: "success",
        processedRows: 5,
        successCount: 5,
      }),
    ).toBe(true);

    const afterSuccess = service.getBatchProgress(session.id);
    expect(afterSuccess?.batchResults[0].endTime).toBeDefined();

    expect(
      service.updateBatchProgress(session.id, 2, {
        status: "failed",
        processedRows: 5,
        failedCount: 2,
        retryCount: 0,
        maxRetries: 2,
      }),
    ).toBe(true);

    const afterFail = service.getBatchProgress(session.id);
    expect(afterFail?.batchResults[1].status).toBe("pending");
    expect(afterFail?.batchResults[1].retryCount).toBe(1);
    expect(afterFail?.batchResults[1].endTime).toBeDefined();
  });

  it("should stop retrying once max retries are reached", () => {
    const session = service.createSession("classes.xlsx", [{ name: "KTPM01" } as never]);
    service.initializeBatchProcessing(session.id, 5, 5);

    expect(
      service.updateBatchProgress(session.id, 1, {
        status: "failed",
        processedRows: 5,
        retryCount: 3,
        maxRetries: 3,
      }),
    ).toBe(true);

    const progress = service.getBatchProgress(session.id);
    expect(progress?.batchResults[0].status).toBe("failed");
    expect(progress?.batchResults[0].retryCount).toBe(3);
  });

  it("should reject pause/resume when batch processing state does not allow it", () => {
    const session = service.createSession("classes.xlsx", [{ name: "KTPM01" } as never]);
    service.initializeBatchProcessing(session.id, 10, 5);

    expect(service.pauseImport(session.id)).toBe(true);
    expect(service.pauseImport(session.id)).toBe(false);
    expect(service.resumeImport(session.id)).toBe(true);
    expect(service.resumeImport(session.id)).toBe(false);
  });

  it("should update import result and cleanup expired sessions", () => {
    const session = service.createSession("classes.xlsx", [{ name: "KTPM01" } as never]);
    expect(service.updateSessionImport(session.id, { success: true, importedCount: 1, skippedCount: 0, failedCount: 0, errors: [], importedIds: [] } as never)?.status).toBe("imported");
    expect(service.updateSessionImport(session.id, { success: false, importedCount: 0, skippedCount: 0, failedCount: 1, errors: ["e"], importedIds: [] } as never)?.status).toBe("failed");

    const oldSession = service.createSession("old.xlsx", [] as never[]);
    const stored = (service as any).sessions.get(oldSession.id);
    stored.expiresAt = new Date(Date.now() - 1000);

    service.cleanupExpiredSessions();
    expect(service.getSession(oldSession.id)).toBeNull();
    expect(service.deleteSession(session.id)).toBe(true);
  });

  it("should return false or null when session mutations target missing sessions", () => {
    expect(service.updateSessionValidation("missing", { summary: { valid: 0, invalid: 0 } } as never)).toBeNull();
    expect(service.updateSessionImport("missing", { success: true } as never)).toBeNull();
    expect(service.initializeBatchProcessing("missing", 10)).toBe(false);
    expect(service.updateBatchProgress("missing", 1, { processedRows: 1 })).toBe(false);
    expect(service.pauseImport("missing")).toBe(false);
    expect(service.resumeImport("missing")).toBe(false);
    expect(service.finalizeBatchProcessing("missing", true)).toBe(false);
    expect(service.getBatchProgress("missing")).toBeNull();
    expect(service.getNextPendingBatch("missing")).toBeNull();
  });

  it("should initialize and update batch progress", () => {
    const session = service.createSession("classes.xlsx", [{ name: "KTPM01" } as never]);

    expect(service.initializeBatchProcessing(session.id, 10, 5)).toBe(true);
    expect(
      service.updateBatchProgress(session.id, 1, {
        status: "success",
        processedRows: 5,
        successCount: 5,
      }),
    ).toBe(true);

    const progress = service.getBatchProgress(session.id);
    expect(progress?.currentBatch).toBe(1);
    expect(progress?.processedRows).toBe(5);
  });

  it("should support pause, resume and finalize", () => {
    const session = service.createSession("classes.xlsx", [{ name: "KTPM01" } as never]);
    service.initializeBatchProcessing(session.id, 10, 5);

    expect(service.pauseImport(session.id)).toBe(true);
    expect(service.getSession(session.id)?.status).toBe("paused");

    expect(service.resumeImport(session.id)).toBe(true);
    expect(service.getSession(session.id)?.status).toBe("importing");

    expect(service.finalizeBatchProcessing(session.id, true)).toBe(true);
    expect(service.getSession(session.id)?.status).toBe("imported");
  });
});