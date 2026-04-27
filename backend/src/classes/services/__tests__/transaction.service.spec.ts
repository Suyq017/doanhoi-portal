import { beforeEach, describe, expect, it, jest } from "@jest/globals";
import { TransactionService } from "../transaction.service";

describe("Classes TransactionService", () => {
  const createQueryRunner = () => ({
    connect: jest.fn(async () => undefined),
    startTransaction: jest.fn(async () => undefined),
    commitTransaction: jest.fn(async () => undefined),
    rollbackTransaction: jest.fn(async () => undefined),
    release: jest.fn(async () => undefined),
  });

  let dataSource: { createQueryRunner: jest.Mock };
  let service: TransactionService;

  beforeEach(() => {
    dataSource = { createQueryRunner: jest.fn() };
    service = new TransactionService(dataSource as never);
  });

  it("should execute transaction successfully", async () => {
    const queryRunner = createQueryRunner();
    dataSource.createQueryRunner.mockImplementation(() => queryRunner);

    const result = await service.executeWithTransaction(async () => "ok", {
      timeout: 50,
    });

    expect(result.success).toBe(true);
    expect(result.result).toBe("ok");
    expect(queryRunner.commitTransaction).toHaveBeenCalled();
  });

  it("should retry deadlock and eventually succeed", async () => {
    const queryRunner1 = createQueryRunner();
    const queryRunner2 = createQueryRunner();
    dataSource.createQueryRunner
      .mockImplementationOnce(() => queryRunner1)
      .mockImplementationOnce(() => queryRunner2);

    let attempts = 0;
    const result = await service.executeWithTransaction(
      async () => {
        attempts += 1;
        if (attempts === 1) {
          throw new Error("deadlock detected");
        }
        return "done";
      },
      { retryCount: 1, retryDelay: 0, timeout: 50 },
    );

    expect(result.success).toBe(true);
    expect(result.retryCount).toBe(1);
    expect(service.getStats().deadlockCount).toBe(1);
  });

  it("should fail on non-retryable error", async () => {
    const queryRunner = createQueryRunner();
    dataSource.createQueryRunner.mockImplementation(() => queryRunner);

    const result = await service.executeWithTransaction(
      async () => {
        throw new Error("constraint violation");
      },
      { retryCount: 2, retryDelay: 0, timeout: 50 },
    );

    expect(result.success).toBe(false);
    expect(result.error?.message).toContain("constraint violation");
    expect(service.getStats().failedTransactions).toBe(1);
  });

  it("should execute batch operations in one transaction", async () => {
    const queryRunner = createQueryRunner();
    dataSource.createQueryRunner.mockImplementation(() => queryRunner);

    const result = await service.executeBatchTransaction(
      [
        async () => "a",
        async () => "b",
      ],
      { timeout: 50 },
    );

    expect(result.success).toBe(true);
    expect(result.result).toEqual(["a", "b"]);
  });
});