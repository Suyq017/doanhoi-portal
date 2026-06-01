import { beforeEach, describe, expect, it, jest } from "@jest/globals";
import { BadRequestException, ConflictException, NotFoundException } from "@nestjs/common";
import { CategoryService } from "../category.service";

describe("CategoryService", () => {
  const createCategoryRepositoryMock = () => ({
    findOne: jest.fn() as any,
    create: jest.fn((value) => value) as any,
    save: jest.fn(async (value: any) => ({ ...value, id: value.id || "cat-1" })) as any,
    update: jest.fn() as any,
    recover: jest.fn() as any,
    createQueryBuilder: jest.fn() as any,
    manager: {
      createQueryBuilder: jest.fn() as any,
    },
  });

  let categoryRepository: ReturnType<typeof createCategoryRepositoryMock>;
  let service: CategoryService;

  beforeEach(() => {
    categoryRepository = createCategoryRepositoryMock();
    service = new CategoryService(categoryRepository as never);
  });

  it("should find categories with search and pagination metadata", async () => {
    const queryBuilder = {
      leftJoin: jest.fn().mockReturnThis(),
      addSelect: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      groupBy: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      getCount: jest.fn(async () => 2),
      skip: jest.fn().mockReturnThis(),
      take: jest.fn().mockReturnThis(),
      getRawAndEntities: jest.fn(async () => ({
        entities: [{ id: "cat-1", name: "Hiến máu" }, { id: "cat-2", name: "Tình nguyện" }],
        raw: [{ activities_count: "3" }, { activities_count: "0" }],
      })),
    } as any;
    categoryRepository.createQueryBuilder.mockReturnValue(queryBuilder);

    const result = await service.findAll({ page: 1, limit: 10, search: "máu" });

    expect(result.total).toBe(2);
    expect(result.hasNextPage).toBe(false);
    expect(result.data[0].activities_count).toBe(3);
  });

  it("should return an empty result safely when no categories exist", async () => {
    const queryBuilder = {
      leftJoin: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      addSelect: jest.fn().mockReturnThis(),
      groupBy: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      getCount: jest.fn(async () => 0),
      skip: jest.fn().mockReturnThis(),
      take: jest.fn().mockReturnThis(),
      getRawAndEntities: jest.fn(),
    } as any;

    categoryRepository.createQueryBuilder.mockReturnValue(queryBuilder);

    const result = await service.findAll({ page: 1, limit: 10 });

    expect(result).toEqual({
      data: [],
      total: 0,
      page: 1,
      limit: 10,
      totalPages: 0,
      hasNextPage: false,
      hasPrevPage: false,
    });
    expect(queryBuilder.getRawAndEntities).not.toHaveBeenCalled();
  });

  it("should throw not found when category detail is missing", async () => {
    categoryRepository.createQueryBuilder.mockReturnValue({
      leftJoin: jest.fn().mockReturnThis(),
      addSelect: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      groupBy: jest.fn().mockReturnThis(),
      getRawAndEntities: jest.fn(async () => ({ entities: [], raw: [] })),
    });

    await expect(service.findOne("missing")).rejects.toThrow(NotFoundException);
  });

  it("should create category and reject duplicate names", async () => {
    categoryRepository.findOne.mockResolvedValueOnce(null);
    const findOneSpy = jest.spyOn(service, "findOne").mockResolvedValue({ id: "cat-1" } as never);

    const created = await service.create({ name: "Hiến máu" } as never, "user-1");

    expect(created.id).toBe("cat-1");
    expect(findOneSpy).toHaveBeenCalledWith("cat-1");

    categoryRepository.findOne.mockResolvedValueOnce({ id: "cat-2", name: "Hiến máu" });
    await expect(service.create({ name: "Hiến máu" } as never, "user-1")).rejects.toThrow(ConflictException);
  });

  it("should update category and enforce unique name", async () => {
    categoryRepository.findOne
      .mockResolvedValueOnce({ id: "cat-1", name: "A" })
      .mockResolvedValueOnce(null);
    jest.spyOn(service, "findOne").mockResolvedValue({ id: "cat-1", name: "B" } as never);

    const updated = await service.update("cat-1", { name: "B" } as never, "user-1");
    expect(updated.name).toBe("B");

    categoryRepository.findOne
      .mockResolvedValueOnce({ id: "cat-1", name: "A" })
      .mockResolvedValueOnce({ id: "cat-2", name: "B" });

    await expect(service.update("cat-1", { name: "B" } as never, "user-1")).rejects.toThrow(ConflictException);
  });

  it("should block softDelete when active activities exist", async () => {
    categoryRepository.findOne.mockResolvedValue({ id: "cat-1" });
    categoryRepository.manager.createQueryBuilder.mockReturnValue({
      from: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      getCount: jest.fn(async () => 2),
    });

    await expect(service.softDelete("cat-1", "user-1")).rejects.toThrow(BadRequestException);
  });

  it("should restore soft-deleted category and reset deleted_by", async () => {
    categoryRepository.createQueryBuilder.mockReturnValue({
      withDeleted: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      getOne: jest.fn(async () => ({ id: "cat-1", name: "Hiến máu", deleted_at: new Date() })),
    });
    categoryRepository.findOne.mockResolvedValue(null);
    jest.spyOn(service, "findOne").mockResolvedValue({ id: "cat-1" } as never);

    const result = await service.restore("cat-1");

    expect(result.id).toBe("cat-1");
    expect(categoryRepository.recover).toHaveBeenCalledWith({ id: "cat-1" });
    expect(categoryRepository.update).toHaveBeenCalledWith("cat-1", { deleted_by: null });
  });
});