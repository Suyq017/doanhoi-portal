import { beforeEach, describe, expect, it, jest } from "@jest/globals";
import { UserTransactionService } from "../transaction.service";

describe("UserTransactionService", () => {
  const createQueryRunner = () => ({
    connect: jest.fn(async () => undefined),
    startTransaction: jest.fn(async () => undefined),
    commitTransaction: jest.fn(async () => undefined),
    rollbackTransaction: jest.fn(async () => undefined),
    release: jest.fn(async () => undefined),
    query: jest.fn(async () => undefined),
  });

  let dataSource: { createQueryRunner: jest.Mock };
  let service: UserTransactionService;

  beforeEach(() => {
    dataSource = {
      createQueryRunner: jest.fn(),
    };
    service = new UserTransactionService(dataSource as never);
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
    expect(service.getStats().successfulTransactions).toBe(1);
  });

  it("should retry on retryable error and then succeed", async () => {
    const queryRunner1 = createQueryRunner();
    const queryRunner2 = createQueryRunner();
    dataSource.createQueryRunner
      .mockImplementationOnce(() => queryRunner1)
      .mockImplementationOnce(() => queryRunner2);

    let callCount = 0;
    const result = await service.executeWithTransaction(
      async () => {
        callCount += 1;
        if (callCount === 1) {
          throw new Error("deadlock detected");
        }
        return "recovered";
      },
      { retryCount: 1, retryDelay: 0, timeout: 50 },
    );

    expect(result.success).toBe(true);
    expect(result.result).toBe("recovered");
    expect(result.retryCount).toBe(1);
    expect(service.getStats().retriedTransactions).toBe(1);
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

  it("should execute with savepoint and rollback on failure", async () => {
    const queryRunner = createQueryRunner();

    await expect(
      service.executeWithSavepoint(queryRunner as never, "sp1", async () => {
        throw new Error("savepoint failure");
      }),
    ).rejects.toThrow("savepoint failure");

    expect(queryRunner.query).toHaveBeenCalledWith("SAVEPOINT sp1");
    expect(queryRunner.query).toHaveBeenCalledWith("ROLLBACK TO SAVEPOINT sp1");
  });
});