import { afterEach, beforeEach, describe, expect, it, jest } from "@jest/globals";
import { ImportSessionService } from "../import-session.service";

describe("Users ImportSessionService", () => {
  let service: ImportSessionService;

  beforeEach(() => {
    jest.spyOn(global, "setInterval").mockImplementation(() => 1 as any);
    service = new ImportSessionService();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("should create and fetch a session", () => {
    const session = service.createSession("users.xlsx", [{ code: "SV001" } as any]);
    const fetched = service.getSession(session.id);

    expect(fetched).not.toBeNull();
    expect(fetched?.status).toBe("uploaded");
    expect(fetched?.metadata.totalRows).toBe(1);
  });

  it("should update validation metadata and status", () => {
    const session = service.createSession("users.xlsx", [{ code: "SV001" } as any]);

    service.updateSessionValidation(session.id, [
      { validation: { isValid: true, errors: [], warnings: [] } },
      { validation: { isValid: false, errors: ["err"], warnings: ["warn"] } },
    ] as any);

    const updated = service.getSession(session.id);
    expect(updated?.status).toBe("validated");
    expect(updated?.metadata.validRows).toBe(1);
    expect(updated?.metadata.invalidRows).toBe(1);
  });

  it("should initialize and update batch processing", () => {
    const session = service.createSession("users.xlsx", [{ code: "SV001" } as any]);

    const init = service.initializeBatchProcessing(session.id, 10, 5);
    expect(init).toBe(true);

    const updated = service.updateBatchProgress(session.id, 1, {
      status: "success",
      processedRows: 5,
      successfulRows: 5,
    });

    expect(updated).toBe(true);
    const progress = service.getBatchProgress(session.id);
    expect(progress?.processedRows).toBe(5);
    expect(progress?.currentBatch).toBe(1);
  });

  it("should support pause/resume and finalize batch processing", () => {
    const session = service.createSession("users.xlsx", [{ code: "SV001" } as any]);
    service.initializeBatchProcessing(session.id, 10, 5);

    expect(service.pauseImport(session.id)).toBe(true);
    expect(service.getSession(session.id)?.status).toBe("paused");

    expect(service.resumeImport(session.id)).toBe(true);
    expect(service.getSession(session.id)?.status).toBe("importing");

    expect(service.finalizeBatchProcessing(session.id, true)).toBe(true);
    expect(service.getSession(session.id)?.status).toBe("imported");
  });

  it("should return only valid rows from validated data", () => {
    const session = service.createSession("users.xlsx", [{ code: "SV001" } as any]);
    service.updateSessionValidation(session.id, [
      { validation: { isValid: true, errors: [], warnings: [] }, data: { code: "SV001" } },
      { validation: { isValid: false, errors: ["x"], warnings: [] }, data: { code: "SV002" } },
    ] as any);

    const valid = service.getValidatedData(session.id);
    expect(valid).toHaveLength(1);
  });

  it("should return empty validated data when session or validation is missing", () => {
    expect(service.getValidatedData("missing")).toEqual([]);

    const session = service.createSession("users.xlsx", [{ code: "SV001" } as any]);
    expect(service.getValidatedData(session.id)).toEqual([]);
  });

  it("should return false for update/finalize/pause/resume without batch state", () => {
    const session = service.createSession("users.xlsx", [{ code: "SV001" } as any]);

    expect(service.updateBatchProgress(session.id, 1, { processedRows: 1 })).toBe(false);
    expect(service.pauseImport(session.id)).toBe(false);
    expect(service.resumeImport(session.id)).toBe(false);
    expect(service.finalizeBatchProcessing(session.id, true)).toBe(false);
    expect(service.getBatchProgress(session.id)).toBeNull();
  });

  it("should return false when updating invalid batch number", () => {
    const session = service.createSession("users.xlsx", [{ code: "SV001" } as any]);
    service.initializeBatchProcessing(session.id, 10, 5);

    expect(service.updateBatchProgress(session.id, 0, { processedRows: 1 })).toBe(false);
    expect(service.updateBatchProgress(session.id, 99, { processedRows: 1 })).toBe(false);
  });

  it("should get next pending batch and return null when none left", () => {
    const session = service.createSession("users.xlsx", [{ code: "SV001" } as any]);
    service.initializeBatchProcessing(session.id, 10, 5);

    expect(service.getNextPendingBatch(session.id)?.batchNumber).toBe(1);

    service.updateBatchProgress(session.id, 1, { status: "success", processedRows: 5 });
    service.updateBatchProgress(session.id, 2, { status: "failed", processedRows: 5 });

    expect(service.getNextPendingBatch(session.id)).toBeNull();
  });

  it("should cleanup expired sessions and hide expired session on getSession", () => {
    const active = service.createSession("active.xlsx", [{ code: "SV001" } as any]);
    const expired = service.createSession("expired.xlsx", [{ code: "SV002" } as any]);

    const expiredInternal = (service as any).sessions.get(expired.id);
    expiredInternal.expiresAt = new Date(Date.now() - 1000);

    expect(service.getSession(expired.id)).toBeNull();

    service.cleanupExpiredSessions();
    expect(service.getSession(active.id)).not.toBeNull();
    expect(service.getSession(expired.id)).toBeNull();
  });

  it("should sort sessions by upload time and support delete", () => {
    const older = service.createSession("older.xlsx", [{ code: "SV001" } as any]);
    const newer = service.createSession("newer.xlsx", [{ code: "SV002" } as any]);

    const olderRef = (service as any).sessions.get(older.id);
    const newerRef = (service as any).sessions.get(newer.id);
    olderRef.uploadedAt = new Date(Date.now() - 60_000);
    newerRef.uploadedAt = new Date();

    const sessions = service.getAllSessions();
    expect(sessions[0].id).toBe(newer.id);
    expect(sessions[1].id).toBe(older.id);

    expect(service.deleteSession(older.id)).toBe(true);
    expect(service.deleteSession("missing")).toBe(false);
  });

  it("should ignore validation update when session does not exist", () => {
    expect(() =>
      service.updateSessionValidation("missing", [
        { validation: { isValid: true, errors: [], warnings: [] } },
      ] as any),
    ).not.toThrow();
  });

  it("should update import result status for both success and failure", () => {
    const s1 = service.createSession("ok.xlsx", [{ code: "SV001" } as any]);
    const s2 = service.createSession("fail.xlsx", [{ code: "SV002" } as any]);

    service.updateImportResult(s1.id, {
      success: true,
      importedCount: 1,
      skippedCount: 0,
      failedCount: 0,
      errors: [],
      importedIds: ["u-1"],
    });
    service.updateImportResult(s2.id, {
      success: false,
      importedCount: 0,
      skippedCount: 0,
      failedCount: 1,
      errors: ["e"],
      importedIds: [],
    });

    expect(service.getSession(s1.id)?.status).toBe("imported");
    expect(service.getSession(s2.id)?.status).toBe("failed");
  });
});