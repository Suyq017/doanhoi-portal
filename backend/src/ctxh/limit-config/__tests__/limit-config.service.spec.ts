import { beforeEach, describe, expect, it, jest } from "@jest/globals";
import { ConflictException, NotFoundException } from "@nestjs/common";
import { LimitConfigService } from "../limit-config.service";
import { LimitConfigStatus } from "../../../entities/ctxh-limit-config.entity";

describe("LimitConfigService", () => {
  const createLimitConfigRepositoryMock = () => ({
    findOne: jest.fn() as any,
    create: jest.fn((value) => value) as any,
    save: jest.fn(async (value) => value) as any,
    update: jest.fn() as any,
    createQueryBuilder: jest.fn() as any,
  });

  const createOrganizationRepositoryMock = () => ({
    findOne: jest.fn() as any,
    manager: {
      getTreeRepository: jest.fn() as any,
    },
  });

  let limitConfigRepository: ReturnType<typeof createLimitConfigRepositoryMock>;
  let organizationRepository: ReturnType<typeof createOrganizationRepositoryMock>;
  let service: LimitConfigService;

  beforeEach(() => {
    jest.spyOn(console, "log").mockImplementation(() => undefined);
    limitConfigRepository = createLimitConfigRepositoryMock();
    organizationRepository = createOrganizationRepositoryMock();
    service = new LimitConfigService(limitConfigRepository as never, organizationRepository as never);
  });

  it("should create config and propagate to active descendants", async () => {
    organizationRepository.findOne.mockResolvedValue({ id: "org-parent" });
    limitConfigRepository.findOne
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({ id: "cfg-child-2", status: LimitConfigStatus.ACTIVE });
    limitConfigRepository.save.mockImplementation(async (value: any) => {
      if (!Array.isArray(value)) {
        return { ...value, id: "cfg-parent" };
      }
      return value;
    });
    organizationRepository.manager.getTreeRepository.mockReturnValue({
      findDescendants: jest.fn(async () => [
        { id: "org-parent", type: "khoa" },
        { id: "org-child-1", type: "khoa" },
        { id: "org-child-2", type: "lien_chi_doan" },
        { id: "org-level3", type: "chi_doan" },
      ]),
    });
    const findOneSpy = jest
      .spyOn(service, "findOne")
      .mockResolvedValue({ id: "cfg-parent" } as any);

    const result = await service.create(
      {
        organization_id: "org-parent",
        max_days: 50,
        status: LimitConfigStatus.ACTIVE,
        description: "desc",
      } as any,
      "user-1",
    );

    expect(result.id).toBe("cfg-parent");
    expect(limitConfigRepository.update).toHaveBeenCalledWith(
      "cfg-child-2",
      expect.objectContaining({ max_days: 50, updated_by: "user-1" }),
    );
    expect(limitConfigRepository.save).toHaveBeenCalledWith(
      expect.arrayContaining([
        expect.objectContaining({ organization_id: "org-child-1", created_by: "user-1" }),
      ]),
    );
    expect(findOneSpy).toHaveBeenCalledWith("cfg-parent");
  });

  it("should throw not found when creating config for missing organization", async () => {
    organizationRepository.findOne.mockResolvedValue(null);

    await expect(
      service.create(
        {
          organization_id: "missing-org",
          max_days: 40,
        } as any,
        "user-1",
      ),
    ).rejects.toThrow(NotFoundException);
  });

  it("should throw conflict when config already exists for organization", async () => {
    organizationRepository.findOne.mockResolvedValue({ id: "org-1" });
    limitConfigRepository.findOne.mockResolvedValue({ id: "cfg-existing" });

    await expect(
      service.create(
        {
          organization_id: "org-1",
          max_days: 40,
        } as any,
        "user-1",
      ),
    ).rejects.toThrow(ConflictException);
  });

  it("should find all configs with filters and pagination", async () => {
    const queryBuilder = {
      leftJoinAndSelect: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      getSql: jest.fn(() => "SELECT 1"),
      getParameters: jest.fn(() => ({})),
      skip: jest.fn().mockReturnThis(),
      take: jest.fn().mockReturnThis(),
      getManyAndCount: jest.fn(async () => [[{ id: "cfg-1" }], 1] as any),
    } as any;
    limitConfigRepository.createQueryBuilder.mockReturnValue(queryBuilder);

    const result = await service.findAll({
      page: 1,
      limit: 10,
      organization_id: "org-1",
      status: LimitConfigStatus.ACTIVE,
      search: "CNTT",
    });

    expect(queryBuilder.andWhere).toHaveBeenCalledTimes(3);
    expect(result.total).toBe(1);
    expect(result.totalPages).toBe(1);
  });

  it("should throw when findOne does not find config", async () => {
    limitConfigRepository.createQueryBuilder.mockReturnValue({
      leftJoinAndSelect: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      getOne: jest.fn(async () => null),
    });

    await expect(service.findOne("missing")).rejects.toThrow(NotFoundException);
  });

  it("should update config and descendants when max_days changes", async () => {
    limitConfigRepository.findOne
      .mockResolvedValueOnce({ id: "cfg-1", organization_id: "org-parent" })
      .mockResolvedValueOnce({ id: "cfg-child", status: LimitConfigStatus.ACTIVE });
    organizationRepository.findOne.mockResolvedValue({ id: "org-parent" });
    organizationRepository.manager.getTreeRepository.mockReturnValue({
      findDescendants: jest.fn(async () => [
        { id: "org-parent", type: "khoa" },
        { id: "org-child", type: "khoa" },
      ]),
    });
    jest.spyOn(service, "findOne").mockResolvedValue({ id: "cfg-1" } as any);

    await service.update("cfg-1", { max_days: 60 } as any, "user-2");

    expect(limitConfigRepository.update).toHaveBeenCalledWith(
      "cfg-1",
      expect.objectContaining({ max_days: 60, updated_by: "user-2" }),
    );
    expect(limitConfigRepository.update).toHaveBeenCalledWith(
      "cfg-child",
      expect.objectContaining({ max_days: 60, updated_by: "user-2" }),
    );
  });

  it("should throw conflict when activating config and another active exists", async () => {
    limitConfigRepository.findOne
      .mockResolvedValueOnce({ id: "cfg-1", organization_id: "org-1" })
      .mockResolvedValueOnce({ id: "cfg-2", organization_id: "org-1", status: LimitConfigStatus.ACTIVE });

    await expect(
      service.update("cfg-1", { status: LimitConfigStatus.ACTIVE } as any, "user-1"),
    ).rejects.toThrow(ConflictException);
  });

  it("should remove config by soft-delete fields", async () => {
    limitConfigRepository.findOne.mockResolvedValue({ id: "cfg-1" });

    await service.remove("cfg-1", "user-3");

    expect(limitConfigRepository.update).toHaveBeenCalledWith(
      "cfg-1",
      expect.objectContaining({ deleted_by: "user-3" }),
    );
  });

  it("should restore deleted config", async () => {
    limitConfigRepository.findOne
      .mockResolvedValueOnce({
        id: "cfg-1",
        organization_id: "org-1",
        status: LimitConfigStatus.INACTIVE,
        deleted_at: new Date(),
      })
      .mockResolvedValueOnce(null);
    jest.spyOn(service, "findOne").mockResolvedValue({ id: "cfg-1" } as any);

    const result = await service.restore("cfg-1", "user-4");

    expect(result.id).toBe("cfg-1");
    expect(limitConfigRepository.update).toHaveBeenCalledWith(
      "cfg-1",
      expect.objectContaining({ deleted_at: null, updated_by: "user-4" }),
    );
  });
});