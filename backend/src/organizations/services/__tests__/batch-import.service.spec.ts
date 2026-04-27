import { afterEach, beforeEach, describe, expect, it, jest } from "@jest/globals";
import { NotFoundException } from "@nestjs/common";
import { OrganizationBatchImportService } from "../batch-import.service";

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
});