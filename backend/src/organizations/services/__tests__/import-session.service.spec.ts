import { beforeEach, describe, expect, it } from "@jest/globals";
import { OrganizationImportSessionService } from "../import-session.service";

describe("OrganizationImportSessionService", () => {
  let service: OrganizationImportSessionService;

  beforeEach(() => {
    service = new OrganizationImportSessionService();
  });

  it("should create and fetch session", () => {
    const session = service.createSession(
      "members.xlsx",
      "org-1",
      2,
      [{ studentCode: "2052001" }],
    );

    const fetched = service.getSession(session.id);
    expect(fetched).toBeDefined();
    expect(fetched?.status).toBe("uploaded");
    expect(fetched?.metadata.totalRows).toBe(1);
  });

  it("should update validation and import statuses", () => {
    const session = service.createSession("members.xlsx", "org-1", 2, [
      { studentCode: "2052001" },
    ]);

    service.updateSessionValidation(session.id, {
      isValid: true,
      data: [{ studentCode: "2052001", _errors: [], _warnings: [] }],
      errors: [],
      warnings: [],
      summary: { total: 1, valid: 1, invalid: 0, duplicates: 0, conflicts: 0 },
    } as never);

    expect(service.getSession(session.id)?.status).toBe("validated");

    service.updateSessionImport(session.id, {
      success: true,
      importedCount: 1,
      skippedCount: 0,
      failedCount: 0,
      errors: [],
      importedIds: ["u1"],
    });

    expect(service.getSession(session.id)?.status).toBe("imported");
  });

  it("should extend and delete sessions", () => {
    const session = service.createSession("members.xlsx", "org-1", 2, [
      { studentCode: "2052001" },
    ]);

    expect(service.extendSession(session.id)).toBe(true);
    service.deleteSession(session.id);
    expect(service.getSession(session.id)).toBeUndefined();
  });
});