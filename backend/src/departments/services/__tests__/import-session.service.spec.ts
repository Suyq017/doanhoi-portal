import { afterEach, beforeEach, describe, expect, it, jest } from "@jest/globals";
import { ImportSessionService } from "../import-session.service";

describe("Departments ImportSessionService", () => {
  let service: ImportSessionService;

  beforeEach(() => {
    jest.spyOn(global, "setInterval").mockImplementation(() => 1 as any);
    service = new ImportSessionService();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("should create and update validation result", () => {
    const session = service.createSession("departments.xlsx", [{ name: "Finance" } as any]);

    const ok = service.updateSessionValidation(session.id, {
      isValid: true,
      data: [{ name: "Finance", _errors: [], _warnings: [] }],
      errors: [],
      warnings: [],
      summary: { total: 1, valid: 1, invalid: 0, duplicates: 0, conflicts: 0 },
    } as any);

    expect(ok).toBe(true);
    const fetched = service.getSession(session.id);
    expect(fetched?.status).toBe("validated");
    expect(fetched?.metadata.validRows).toBe(1);
  });

  it("should initialize batch processing and track progress", () => {
    const session = service.createSession("departments.xlsx", [{ name: "Finance" } as any]);
    const init = service.initializeBatchProcessing(session.id, 2, 10, 5);
    expect(init).toBe(true);

    const updated = service.updateBatchProgress(session.id, 1, {
      status: "success",
      processedRows: 5,
      successCount: 5,
    });

    expect(updated).toBe(true);
    const progress = service.getBatchProgress(session.id);
    expect(progress?.currentBatch).toBe(1);
    expect(progress?.processedRows).toBe(5);
  });

  it("should mark failed batch as pending when retries remain", () => {
    const session = service.createSession("departments.xlsx", [{ name: "Finance" } as any]);
    service.initializeBatchProcessing(session.id, 1, 5, 5);

    service.updateBatchProgress(session.id, 1, {
      status: "failed",
      processedRows: 1,
      failedCount: 1,
    });

    const next = service.getNextPendingBatch(session.id);
    expect(next?.batchNumber).toBe(1);
    expect(next?.retryCount).toBe(1);
  });

  it("should support pause/resume/finalize transitions", () => {
    const session = service.createSession("departments.xlsx", [{ name: "Finance" } as any]);
    service.initializeBatchProcessing(session.id, 1, 5, 5);

    expect(service.pauseImport(session.id)).toBe(true);
    expect(service.getSession(session.id)?.status).toBe("paused");

    expect(service.resumeImport(session.id)).toBe(true);
    expect(service.getSession(session.id)?.status).toBe("importing");

    expect(service.finalizeBatchProcessing(session.id, false)).toBe(true);
    expect(service.getSession(session.id)?.status).toBe("failed");
  });

  it("should return null for missing session", () => {
    expect(service.getSession("missing")).toBeNull();
    expect(service.getValidatedData("missing")).toBeNull();
  });
});