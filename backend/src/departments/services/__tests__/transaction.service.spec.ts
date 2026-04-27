import { beforeEach, describe, expect, it, jest } from "@jest/globals";
import { DepartmentTransactionService } from "../transaction.service";

describe("DepartmentTransactionService", () => {
  const createQueryRunner = () => ({
    connect: jest.fn(async () => undefined),
    startTransaction: jest.fn(async () => undefined),
    commitTransaction: jest.fn(async () => undefined),
    rollbackTransaction: jest.fn(async () => undefined),
    release: jest.fn(async () => undefined),
    query: jest.fn(async () => undefined),
    manager: {
      getRepository: jest.fn(),
    },
  });

  let dataSource: {
    createQueryRunner: jest.Mock;
    isInitialized: boolean;
    query: jest.Mock;
  };
  let service: DepartmentTransactionService;

  beforeEach(() => {
    dataSource = {
      createQueryRunner: jest.fn(),
      isInitialized: true,
      query: jest.fn(async () => [{ one: 1 }]),
    };
    service = new DepartmentTransactionService(dataSource as never);
  });

  it("should execute transaction successfully", async () => {
    const queryRunner = createQueryRunner();
    dataSource.createQueryRunner.mockImplementation(() => queryRunner);

    const result = await service.executeTransaction(async () => "ok", {
      timeout: 50,
    });

    expect(result.success).toBe(true);
    expect(result.data).toBe("ok");
    expect(queryRunner.startTransaction).toHaveBeenCalled();
    expect(queryRunner.commitTransaction).toHaveBeenCalled();
  });

  it("should retry retryable errors and eventually fail with constraint", async () => {
    const queryRunner = createQueryRunner();
    dataSource.createQueryRunner.mockImplementation(() => queryRunner);

    const result = await service.executeTransaction(
      async () => {
        throw new Error("duplicate key constraint violation");
      },
      { maxRetries: 2, retryDelay: 0, timeout: 50 },
    );

    expect(result.success).toBe(false);
    expect(result.errorType).toBe("constraint");
    expect(result.retryCount).toBe(0);
    expect(service.getTransactionStats().failedTransactions).toBe(1);
  });

  it("should retry deadlock and succeed on second attempt", async () => {
    const queryRunner1 = createQueryRunner();
    const queryRunner2 = createQueryRunner();

    dataSource.createQueryRunner
      .mockImplementationOnce(() => queryRunner1)
      .mockImplementationOnce(() => queryRunner2);

    let attempts = 0;
    const result = await service.executeTransaction(
      async () => {
        attempts += 1;
        if (attempts === 1) {
          throw new Error("deadlock found");
        }
        return "done";
      },
      { maxRetries: 1, retryDelay: 0, timeout: 50 },
    );

    expect(result.success).toBe(true);
    expect(result.retryCount).toBe(1);
    expect(service.getTransactionStats().deadlockCount).toBe(1);
  });

  it("should report healthy connection in health check", async () => {
    const result = await service.healthCheck();
    expect(result.isHealthy).toBe(true);
    expect(result.connectionStatus).toBe("connected");
  });
});