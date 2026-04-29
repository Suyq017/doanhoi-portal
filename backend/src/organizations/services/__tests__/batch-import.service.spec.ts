import { afterEach, beforeEach, describe, expect, it, jest } from "@jest/globals";
import { NotFoundException } from "@nestjs/common";
import { OrganizationBatchImportService } from "../batch-import.service";
import { User } from "../../../entities/user.entity";
import { Organization } from "../../../entities/organization.entity";
import { UserOrganization } from "../../../entities/user-organization.entity";

describe("OrganizationBatchImportService", () => {
  const createRepoMock = () => ({
    find: jest.fn(),
    create: jest.fn((v) => v),
    createQueryBuilder: jest.fn(() => ({
      insert: jest.fn().mockReturnThis(),
      into: jest.fn().mockReturnThis(),
      values: jest.fn().mockReturnThis(),
      execute: jest.fn(async () => undefined),
    })),
  });

  const createDataSourceMock = () => ({
    createQueryRunner: jest.fn(() => ({
      connect: jest.fn(async () => undefined),
      startTransaction: jest.fn(async () => undefined),
      commitTransaction: jest.fn(async () => undefined),
      rollbackTransaction: jest.fn(async () => undefined),
      release: jest.fn(async () => undefined),
      isTransactionActive: true,
      manager: {
        find: jest.fn(async () => []),
        findOne: jest.fn(async () => null),
        insert: jest.fn(async () => undefined),
        update: jest.fn(async () => undefined),
        create: jest.fn((_e: any, v: any) => v),
        save: jest.fn(async () => undefined),
      },
    })),
  });

  let service: OrganizationBatchImportService;
  let metricsService: { startImportSession: jest.Mock; setOrgImportBatchSize: jest.Mock; endImportSession: jest.Mock; recordImportSession: jest.Mock };

  beforeEach(() => {
    jest.spyOn(global, "setInterval").mockImplementation(() => 1 as any);

    metricsService = {
      startImportSession: jest.fn(),
      setOrgImportBatchSize: jest.fn(),
      endImportSession: jest.fn(),
      recordImportSession: jest.fn(),
    };

    service = new OrganizationBatchImportService(
      createRepoMock() as never,
      createRepoMock() as never,
      createRepoMock() as never,
      {} as never,
      createDataSourceMock() as never,
      metricsService as never,
    );
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("should reject invalid import options", async () => {
    await expect(
      service.processBatch([], { batchNumber: 1, totalBatches: 1, sessionId: "s1" }, { level: 5 as never }),
    ).rejects.toThrow();
  });

  it("should create session and complete empty final batch", async () => {
    const result = await service.processBatch(
      [],
      { batchNumber: 1, totalBatches: 1, sessionId: "s2" },
      { level: 2, skipDuplicates: true },
    );

    expect(result.sessionSummary.isComplete).toBe(true);
    expect(metricsService.startImportSession).toHaveBeenCalledWith("organization");
    expect(metricsService.endImportSession).toHaveBeenCalledWith("organization");
  });

  it("should throw for unknown session summary", () => {
    expect(() => service.getSessionSummary("missing")).toThrow(NotFoundException);
  });

  it("should reject Level 3 imports without organizationId", async () => {
    await expect(
      service.processBatch(
        [],
        { batchNumber: 1, totalBatches: 1, sessionId: "s3" },
        { level: 3 } as never,
      ),
    ).rejects.toThrow("organizationId là bắt buộc cho Level 3");
  });

  it("should validate member data and clear old sessions", () => {
    const validateMemberData = (service as any).validateMemberData.bind(service);

    expect(() => validateMemberData({ studentCode: "" }, { level: 2 })).toThrow(
      "Mã số sinh viên không được để trống",
    );
    expect(() => validateMemberData({ studentCode: "12" }, { level: 3, organizationId: "org-1" })).toThrow(
      "Mã số sinh viên phải có độ dài từ 3-20 ký tự",
    );
    expect(() => validateMemberData({ studentCode: "123" }, { level: 2 })).toThrow(
      "Mã lớp/đơn vị không được để trống cho Level 2",
    );

    (service as any).sessionCache.set("old", {
      sessionId: "old",
      totalProcessed: 0,
      totalSuccessful: 0,
      totalFailed: 0,
      errors: [],
      isComplete: false,
      startedAt: new Date(Date.now() - 25 * 60 * 60 * 1000),
    });
    (service as any).sessionCache.set("new", {
      sessionId: "new",
      totalProcessed: 0,
      totalSuccessful: 0,
      totalFailed: 0,
      errors: [],
      isComplete: false,
      startedAt: new Date(),
    });

    expect(service.clearOldSessions(24)).toBe(1);
    expect((service as any).sessionCache.has("old")).toBe(false);
    expect((service as any).sessionCache.has("new")).toBe(true);
  });

  it("should skip duplicate active memberships and reactivate inactive ones", async () => {
    const queryRunner = createDataSourceMock().createQueryRunner();

    queryRunner.manager.findOne
      .mockResolvedValueOnce({ id: "user-1", code: "S123" })
      .mockResolvedValueOnce({ id: "org-1", code: "ORG" })
      .mockResolvedValueOnce({ id: "membership-1", isActive: true });

    await expect(
      (service as any).processMember(
        { studentCode: "S123" },
        { level: 3, organizationId: "org-1", skipDuplicates: true },
        queryRunner,
      ),
    ).resolves.toBeUndefined();

    expect(queryRunner.manager.save).not.toHaveBeenCalled();

    queryRunner.manager.findOne.mockReset();
    queryRunner.manager.findOne
      .mockResolvedValueOnce({ id: "user-2", code: "S456" })
      .mockResolvedValueOnce({ id: "org-2", code: "ORG2" })
      .mockResolvedValueOnce({ id: "membership-2", isActive: false });

    await expect(
      (service as any).processMember(
        { studentCode: "S456" },
        { level: 3, organizationId: "org-2" },
        queryRunner,
      ),
    ).resolves.toBeUndefined();

    expect(queryRunner.manager.save).toHaveBeenCalledWith(
      UserOrganization,
      expect.objectContaining({ isActive: true }),
    );
  });

  it("should bulk add only new memberships", async () => {
    const repo = service as any;
    const execute = jest.fn(async () => undefined);
    const queryBuilder = {
      insert: jest.fn().mockReturnThis(),
      into: jest.fn().mockReturnThis(),
      values: jest.fn().mockReturnThis(),
      execute,
    };

    repo.userOrganizationsRepository.find.mockResolvedValue([
      { userId: "u1", organizationId: "o1" },
    ]);
    repo.userOrganizationsRepository.createQueryBuilder.mockReturnValue(queryBuilder);

    await service.bulkAddMembers([
      { userId: "u1", organizationId: "o1", role: "MEMBER" as never, isActive: true },
      { userId: "u2", organizationId: "o2", role: "MEMBER" as never, isActive: true },
    ]);

    expect(repo.userOrganizationsRepository.create).toHaveBeenCalledWith({
      userId: "u2",
      organizationId: "o2",
      role: "MEMBER",
      isActive: true,
    });
    expect(queryBuilder.insert).toHaveBeenCalled();
    expect(execute).toHaveBeenCalled();
  });

  it("should record batch error and rollback transaction on sub-batch failure", async () => {
    const dataSource = createDataSourceMock();
    const queryRunner = dataSource.createQueryRunner();
    queryRunner.rollbackTransaction = jest.fn(async () => undefined);
    dataSource.createQueryRunner.mockReturnValue(queryRunner);

    service = new OrganizationBatchImportService(
      createRepoMock() as never,
      createRepoMock() as never,
      createRepoMock() as never,
      {} as never,
      dataSource as never,
      metricsService as never,
    );

    // Mock processSubBatch to throw on first call
    const processSubBatchSpy = jest.spyOn(service as any, "processSubBatch");
    processSubBatchSpy.mockRejectedValue(new Error("Database connection lost"));

    const batchInfo = { batchNumber: 1, totalBatches: 1, sessionId: "s-err" };
    const options = { level: 2 as never };
    const members = [{ studentCode: "S123", classOrUnitCode: "KTPM01" }];

    await expect(
      service.processBatch(members, batchInfo, options),
    ).rejects.toThrow("Database connection lost");

    expect(queryRunner.rollbackTransaction).toHaveBeenCalled();
    expect(queryRunner.release).toHaveBeenCalled();

    // Verify error was recorded in session
    const session = service.getSessionSummary("s-err");
    expect(session.errors.length).toBeGreaterThan(0);
    expect(session.errors[0]).toContain("Database connection lost");
  });
});