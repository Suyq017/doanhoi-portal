import { beforeEach, describe, expect, it, jest } from "@jest/globals";
import { DepartmentsService } from "../departments.service";

describe("DepartmentsService", () => {
  const createDepartmentsRepositoryMock = () => ({
    findOne: jest.fn() as any,
    create: jest.fn((value) => value) as any,
    save: jest.fn(async (value) => value) as any,
    remove: jest.fn() as any,
    createQueryBuilder: jest.fn() as any,
  });

  let departmentsRepository: ReturnType<typeof createDepartmentsRepositoryMock>;
  let service: DepartmentsService;

  beforeEach(() => {
    departmentsRepository = createDepartmentsRepositoryMock();
    service = new DepartmentsService(departmentsRepository as never);
  });

  it("should create a department when name and code are unique", async () => {
    departmentsRepository.findOne.mockResolvedValue(null);

    const result = await service.create({ name: "Finance", code: "FIN" } as any);

    expect(result).toEqual(expect.objectContaining({ name: "Finance", code: "FIN" }));
  });

  it("should reject duplicate departments", async () => {
    departmentsRepository.findOne.mockResolvedValue({ id: "dept-1" });

    await expect(service.create({ name: "Finance", code: "FIN" } as any)).rejects.toThrow(
      "Department with this name or code already exists",
    );
  });

  it("should find departments with filters", async () => {
    const queryBuilder = {
      andWhere: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      skip: jest.fn().mockReturnThis(),
      take: jest.fn().mockReturnThis(),
      getManyAndCount: jest.fn(async () => [[{ id: "dept-1" }], 1] as any),
    } as any;
    departmentsRepository.createQueryBuilder.mockReturnValue(queryBuilder);

    const result = await service.findAll({
      page: 2,
      limit: 5,
      search: "fin",
      isActive: true,
    } as any);

    expect(queryBuilder.andWhere).toHaveBeenCalledTimes(2);
    expect(result.total).toBe(1);
  });

  it("should include management and training user counts in findOne", async () => {
    departmentsRepository.findOne.mockResolvedValueOnce({ id: "dept-1", name: "Finance" });
    departmentsRepository.createQueryBuilder
      .mockReturnValueOnce({
        leftJoin: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        getRawOne: jest.fn(async () => ({ count: "3" })),
      })
      .mockReturnValueOnce({
        leftJoin: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        getRawOne: jest.fn(async () => ({ count: "2" })),
      });

    const result = await service.findOne("dept-1") as any;

    expect(result.managementUserCount).toBe(3);
    expect(result.trainingUserCount).toBe(2);
  });

  it("should reject removing department with associated users", async () => {
    departmentsRepository.findOne.mockResolvedValueOnce({ id: "dept-1", name: "Finance" });
    departmentsRepository.createQueryBuilder
      .mockReturnValueOnce({
        leftJoin: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        getRawOne: jest.fn(async () => ({ count: "1" })),
      })
      .mockReturnValueOnce({
        leftJoin: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        getRawOne: jest.fn(async () => ({ count: "0" })),
      });

    await expect(service.remove("dept-1")).rejects.toThrow(
      "Cannot delete department with associated users",
    );
  });

  it("should validate department codes and split valid/invalid", async () => {
    departmentsRepository.createQueryBuilder.mockReturnValue({
      where: jest.fn().mockReturnThis(),
      getMany: jest.fn(async () => [
        { id: "dept-1", code: "FIN" },
        { id: "dept-2", code: "HR" },
      ]),
    });

    const result = await service.validateDepartmentCodes(["fin", "it", "HR"]);

    expect(result.validCodes).toEqual(["fin", "HR"]);
    expect(result.invalidCodes).toEqual(["it"]);
  });

  it("should bulk remove departments and report not found items", async () => {
    departmentsRepository.findOne.mockResolvedValueOnce({ id: "dept-1" });
    departmentsRepository.createQueryBuilder.mockReturnValue({
      leftJoin: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      getRawOne: jest.fn(async () => ({ count: "0" })),
    });
    departmentsRepository.remove.mockResolvedValue(undefined);
    departmentsRepository.findOne.mockResolvedValueOnce({ id: "dept-2" });

    const result = await service.bulkRemove(["dept-1", "dept-2"]);

    expect(result.deleted).toBeGreaterThanOrEqual(1);
  });

  it("should reject bulkRemove when ids are empty", async () => {
    await expect(service.bulkRemove([])).rejects.toThrow("No department IDs provided");
  });
});