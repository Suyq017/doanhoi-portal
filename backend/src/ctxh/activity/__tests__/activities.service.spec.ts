import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from "@nestjs/common";
import { beforeEach, describe, expect, it, jest } from "@jest/globals";
import { ActivitiesService } from "../activities.service";
import { LimitConfigStatus } from "../../../entities/ctxh-limit-config.entity";

describe("ActivitiesService", () => {
  const createRepoMock = () => ({
    findOne: jest.fn(),
    create: jest.fn((v) => v),
    save: jest.fn(async (v) => ({ ...v, id: "a1" })),
    update: jest.fn(async () => undefined),
    query: jest.fn(),
    createQueryBuilder: jest.fn(() => ({
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      getCount: jest.fn(async () => 0),
      leftJoinAndSelect: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      getManyAndCount: jest.fn(async () => [[], 0]),
      getOne: jest.fn(async () => null),
      skip: jest.fn().mockReturnThis(),
      take: jest.fn().mockReturnThis(),
    })),
  });

  let activityRepository: ReturnType<typeof createRepoMock>;
  let categoryRepository: ReturnType<typeof createRepoMock>;
  let limitConfigRepository: ReturnType<typeof createRepoMock>;
  let participationRepository: ReturnType<typeof createRepoMock>;
  let organizationRepository: ReturnType<typeof createRepoMock>;
  let organizationsService: any;
  let eventEmitter: { emit: jest.Mock };
  let service: ActivitiesService;

  beforeEach(() => {
    activityRepository = createRepoMock();
    categoryRepository = createRepoMock();
    limitConfigRepository = createRepoMock();
    participationRepository = createRepoMock();
    organizationRepository = createRepoMock();
    organizationsService = {
      getCtxhActivityViewableOrganizations: jest.fn(),
    };
    eventEmitter = { emit: jest.fn() };

    service = new ActivitiesService(
      activityRepository as never,
      categoryRepository as never,
      limitConfigRepository as never,
      participationRepository as never,
      organizationRepository as never,
      organizationsService as never,
      eventEmitter as never,
    );
  });

  it("should reject create when user has no organization access", async () => {
    activityRepository.query.mockResolvedValue([]);

    await expect(
      service.create(
        {
          name: "A",
          category_id: "cat-1",
          organization_id: "org-1",
        } as never,
        "user-1",
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it("should reject create when category does not exist", async () => {
    activityRepository.query.mockResolvedValue([{ id: "perm" }]);
    categoryRepository.findOne.mockResolvedValue(null);

    await expect(
      service.create(
        {
          name: "A",
          category_id: "cat-1",
          organization_id: "org-1",
        } as never,
        "user-1",
      ),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it("should reject create when total days exceed the organization limit", async () => {
    activityRepository.query.mockResolvedValue([{ id: "perm" }]);
    categoryRepository.findOne.mockResolvedValue({ id: "cat-1" });
    activityRepository.findOne.mockResolvedValue(null);
    limitConfigRepository.findOne.mockResolvedValue({
      status: LimitConfigStatus.ACTIVE,
      max_days: 5,
    });

    await expect(
      service.create(
        {
          name: "A",
          category_id: "cat-1",
          organization_id: "org-1",
          total_days: 10,
          status: "ACTIVE",
        } as never,
        "user-1",
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it("should reject create when max participants is negative", async () => {
    activityRepository.query.mockResolvedValue([{ id: "perm" }]);
    categoryRepository.findOne.mockResolvedValue({ id: "cat-1" });
    activityRepository.findOne.mockResolvedValue(null);

    await expect(
      service.create(
        {
          name: "A",
          category_id: "cat-1",
          organization_id: "org-1",
          max_participants: -1,
        } as never,
        "user-1",
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it("should reject create on duplicate name in category", async () => {
    activityRepository.query.mockResolvedValue([{ id: "perm" }]);
    categoryRepository.findOne.mockResolvedValue({ id: "cat-1" });
    activityRepository.findOne.mockResolvedValueOnce({ id: "dup" });

    await expect(
      service.create(
        {
          name: "A",
          category_id: "cat-1",
          organization_id: "org-1",
        } as never,
        "user-1",
      ),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it("should create activity and emit CREATED event", async () => {
    activityRepository.query.mockResolvedValue([{ id: "perm" }]);
    categoryRepository.findOne.mockResolvedValue({ id: "cat-1" });
    activityRepository.findOne.mockResolvedValue(null);
    limitConfigRepository.findOne.mockResolvedValue({
      status: LimitConfigStatus.ACTIVE,
      max_days: 20,
    });
    jest.spyOn(service, "findOne").mockResolvedValue({ id: "a1" } as never);

    const result = await service.create(
      {
        name: "A",
        category_id: "cat-1",
        organization_id: "org-1",
        total_days: 10,
        status: "ACTIVE",
      } as never,
      "user-1",
    );

    expect(result.id).toBe("a1");
    expect(eventEmitter.emit).toHaveBeenCalled();
  });

  it("should reject update when max participants is negative", async () => {
    activityRepository.findOne.mockResolvedValue({
      id: "a1",
      name: "A",
      category_id: "cat-1",
      organization_id: "org-1",
      total_days: 5,
      status: "ACTIVE",
      requires_approval: false,
    });

    await expect(
      service.update("a1", { max_participants: -1 } as never, "user-1"),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it("should reject update when activity does not exist", async () => {
    activityRepository.findOne.mockResolvedValue(null);

    await expect(
      service.update("missing", { name: "B" } as never, "user-1"),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it("should reject update when category does not exist", async () => {
    activityRepository.findOne.mockResolvedValue({
      id: "a1",
      name: "A",
      category_id: "cat-1",
      organization_id: "org-1",
      total_days: 5,
      status: "ACTIVE",
      requires_approval: false,
    });
    categoryRepository.findOne.mockResolvedValue(null);

    await expect(
      service.update("a1", { category_id: "cat-missing" } as never, "user-1"),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it("should reject update when duplicate name exists", async () => {
    activityRepository.findOne
      .mockResolvedValueOnce({
        id: "a1",
        name: "A",
        category_id: "cat-1",
        organization_id: "org-1",
        total_days: 5,
        status: "ACTIVE",
        requires_approval: false,
      })
      .mockResolvedValueOnce({ id: "a2", name: "B" });

    await expect(
      service.update("a1", { name: "B" } as never, "user-1"),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it("should reject update when total days exceed organization limit", async () => {
    activityRepository.findOne
      .mockResolvedValueOnce({
        id: "a1",
        name: "A",
        category_id: "cat-1",
        organization_id: "org-1",
        total_days: 5,
        status: "ACTIVE",
        requires_approval: false,
      })
      .mockResolvedValueOnce(null);
    limitConfigRepository.findOne.mockResolvedValue({
      status: LimitConfigStatus.ACTIVE,
      max_days: 10,
    });

    await expect(
      service.update("a1", { total_days: 20 } as never, "user-1"),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it("should reject update when max participants lower than approved count", async () => {
    activityRepository.findOne
      .mockResolvedValueOnce({
        id: "a1",
        name: "A",
        category_id: "cat-1",
        organization_id: "org-1",
        total_days: 5,
        status: "ACTIVE",
        requires_approval: false,
      })
      .mockResolvedValueOnce(null);
    participationRepository.createQueryBuilder.mockReturnValue({
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      getCount: jest.fn(async () => 5),
    });

    await expect(
      service.update("a1", { max_participants: 2 } as never, "user-1"),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it("should block remove when activity has active participations", async () => {
    activityRepository.findOne.mockResolvedValue({
      id: "a1",
      participations: [{ id: "p1", deleted_at: null }],
    });

    await expect(service.remove("a1", "user-1")).rejects.toBeInstanceOf(
      ConflictException,
    );
  });

  it("should update activity and emit status change and updated events", async () => {
    activityRepository.findOne.mockResolvedValue({
      id: "a1",
      name: "A",
      category_id: "cat-1",
      organization_id: "org-1",
      total_days: 5,
      status: "ACTIVE",
      requires_approval: false,
    });
    jest.spyOn(service, "findOne").mockResolvedValue({ id: "a1" } as never);

    const result = await service.update(
      "a1",
      { status: "CANCELLED" } as never,
      "user-1",
    );

    expect(result.id).toBe("a1");
    expect(activityRepository.update).toHaveBeenCalled();
    expect(eventEmitter.emit).toHaveBeenCalledTimes(2);
  });

  it("should remove activity successfully and emit deleted event", async () => {
    activityRepository.findOne.mockResolvedValue({
      id: "a1",
      name: "A",
      participations: [],
    });

    const result = await service.remove("a1", "user-1");

    expect(result.message).toContain("thành công");
    expect(activityRepository.update).toHaveBeenCalled();
    expect(eventEmitter.emit).toHaveBeenCalled();
  });

  it("should reject remove when activity does not exist", async () => {
    activityRepository.findOne.mockResolvedValue(null);

    await expect(service.remove("missing", "user-1")).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it("should reject restore when activity is not deleted", async () => {
    activityRepository.findOne.mockResolvedValue({ id: "a1", deleted_at: null });

    await expect(service.restore("a1", "user-1")).rejects.toBeInstanceOf(
      ConflictException,
    );
  });

  it("should restore deleted activity successfully", async () => {
    activityRepository.findOne
      .mockResolvedValueOnce({
        id: "a1",
        name: "A",
        organization_id: "org-1",
        deleted_at: new Date(),
      })
      .mockResolvedValueOnce(null);
    jest.spyOn(service, "findOne").mockResolvedValue({ id: "a1" } as never);

    const result = await service.restore("a1", "user-1");

    expect(result.id).toBe("a1");
    expect(activityRepository.update).toHaveBeenCalled();
    expect(eventEmitter.emit).toHaveBeenCalled();
  });

  it("should reject restore when activity does not exist", async () => {
    activityRepository.findOne.mockResolvedValue(null);

    await expect(service.restore("missing", "user-1")).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it("should reject restore when duplicate active activity exists", async () => {
    activityRepository.findOne
      .mockResolvedValueOnce({
        id: "a1",
        name: "A",
        organization_id: "org-1",
        deleted_at: new Date(),
      })
      .mockResolvedValueOnce({ id: "a2", name: "A" });

    await expect(service.restore("a1", "user-1")).rejects.toBeInstanceOf(
      ConflictException,
    );
  });

  describe("findOne", () => {
    it("should return activity when found", async () => {
      const activity = {
        id: "a1",
        name: "Activity",
        organization_id: "org-1",
        category_id: "cat-1",
        organization: { id: "org-1", name: "Org" },
        category: { id: "cat-1", name: "Cat" },
      };
      const qb = {
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getOne: jest.fn(async () => activity),
      };
      activityRepository.createQueryBuilder.mockReturnValue(qb);

      const res = await service.findOne("a1");
      expect(res.id).toBe("a1");
      expect(res.name).toBe("Activity");
    });

    it("should throw NotFoundException when activity not found", async () => {
      const qb = {
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getOne: jest.fn(async () => null),
      };
      activityRepository.createQueryBuilder.mockReturnValue(qb);

      await expect(service.findOne("missing")).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });

    it("should manually fetch organization when join returns empty object", async () => {
      const activity = {
        id: "a1",
        name: "Activity",
        organization_id: "org-1",
        category_id: "cat-1",
        organization: {},
        category: { id: "cat-1", name: "Cat" },
      };
      const qb = {
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getOne: jest.fn(async () => activity),
      };
      activityRepository.createQueryBuilder.mockReturnValue(qb);
      organizationRepository.findOne.mockResolvedValue({
        id: "org-1",
        name: "Org",
      });

      const res = await service.findOne("a1");
      expect(res.organization.name).toBe("Org");
    });

    it("should manually fetch category when join returns empty object", async () => {
      const activity = {
        id: "a1",
        name: "Activity",
        organization_id: "org-1",
        category_id: "cat-1",
        organization: { id: "org-1", name: "Org" },
        category: {},
      };
      const qb = {
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getOne: jest.fn(async () => activity),
      };
      activityRepository.createQueryBuilder.mockReturnValue(qb);
      categoryRepository.findOne.mockResolvedValue({ id: "cat-1", name: "Cat" });

      const res = await service.findOne("a1");
      expect(res.category.name).toBe("Cat");
    });
  });

  describe("findAll", () => {
    it("should return paginated activities with default pagination", async () => {
      const activity = {
        id: "a1",
        name: "Activity",
        organization_id: "org-1",
        category_id: "cat-1",
        organization: { id: "org-1", name: "Org" },
        category: { id: "cat-1", name: "Cat" },
      };
      const qb = {
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        take: jest.fn().mockReturnThis(),
        getManyAndCount: jest.fn(async () => [[activity], 1]),
      };
      activityRepository.createQueryBuilder.mockReturnValue(qb);

      const res = await service.findAll({});
      expect(res.data).toHaveLength(1);
      expect(res.total).toBe(1);
      expect(res.page).toBe(1);
      expect(res.limit).toBe(10);
    });

    it("should filter by category_id", async () => {
      const qb = {
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        take: jest.fn().mockReturnThis(),
        getManyAndCount: jest.fn(async () => [[], 0]),
      };
      activityRepository.createQueryBuilder.mockReturnValue(qb);

      await service.findAll({ category_id: "cat-1" });
      expect(qb.andWhere).toHaveBeenCalledWith(
        "activity.category_id = :category_id",
        expect.objectContaining({ category_id: "cat-1" }),
      );
    });

    it("should filter by organization_id", async () => {
      const qb = {
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        take: jest.fn().mockReturnThis(),
        getManyAndCount: jest.fn(async () => [[], 0]),
      };
      activityRepository.createQueryBuilder.mockReturnValue(qb);

      await service.findAll({ organization_id: "org-1" });
      expect(qb.andWhere).toHaveBeenCalledWith(
        "activity.organization_id = :organization_id",
        expect.objectContaining({ organization_id: "org-1" }),
      );
    });

    it("should filter by status", async () => {
      const qb = {
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        take: jest.fn().mockReturnThis(),
        getManyAndCount: jest.fn(async () => [[], 0]),
      };
      activityRepository.createQueryBuilder.mockReturnValue(qb);

      await service.findAll({ status: "ACTIVE" });
      expect(qb.andWhere).toHaveBeenCalledWith(
        "activity.status = :status",
        expect.objectContaining({ status: "ACTIVE" }),
      );
    });

    it("should filter by search term", async () => {
      const qb = {
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        take: jest.fn().mockReturnThis(),
        getManyAndCount: jest.fn(async () => [[], 0]),
      };
      activityRepository.createQueryBuilder.mockReturnValue(qb);

      await service.findAll({ search: "test" });
      expect(qb.andWhere).toHaveBeenCalledWith(
        expect.stringContaining("LOWER(activity.name) LIKE"),
        expect.objectContaining({ search: "%test%" }),
      );
    });

    it("should filter by date range", async () => {
      const qb = {
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        take: jest.fn().mockReturnThis(),
        getManyAndCount: jest.fn(async () => [[], 0]),
      };
      activityRepository.createQueryBuilder.mockReturnValue(qb);
      const start = new Date("2024-01-01");
      const end = new Date("2024-12-31");

      await service.findAll({ start_date: start, end_date: end });
      expect(qb.andWhere).toHaveBeenCalledWith(
        expect.stringContaining("activity.start_date"),
        expect.objectContaining({ start_date: start, end_date: end }),
      );
    });

    it("should filter by start_date only", async () => {
      const qb = {
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        take: jest.fn().mockReturnThis(),
        getManyAndCount: jest.fn(async () => [[], 0]),
      };
      activityRepository.createQueryBuilder.mockReturnValue(qb);
      const start = new Date("2024-01-01");

      await service.findAll({ start_date: start });
      expect(qb.andWhere).toHaveBeenCalledWith(
        expect.stringContaining("activity.end_date"),
        expect.objectContaining({ start_date: start }),
      );
    });

    it("should filter by end_date only", async () => {
      const qb = {
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        take: jest.fn().mockReturnThis(),
        getManyAndCount: jest.fn(async () => [[], 0]),
      };
      activityRepository.createQueryBuilder.mockReturnValue(qb);
      const end = new Date("2024-12-31");

      await service.findAll({ end_date: end });
      expect(qb.andWhere).toHaveBeenCalledWith(
        "activity.start_date <= :end_date",
        expect.objectContaining({ end_date: end }),
      );
    });

    it("should apply permission-based filtering for non-global users", async () => {
      const activity = {
        id: "a1",
        name: "Activity",
        organization_id: "org-1",
        category_id: "cat-1",
        organization: { id: "org-1", name: "Org" },
        category: { id: "cat-1", name: "Cat" },
      };
      const qb = {
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        take: jest.fn().mockReturnThis(),
        getManyAndCount: jest.fn(async () => [[activity], 1]),
      };
      activityRepository.createQueryBuilder.mockReturnValue(qb);
      // Mock global permission check to return no global permission
      organizationRepository.query
        .mockResolvedValueOnce([]) // Global permission check returns empty
        .mockResolvedValueOnce([{ id: "org-1" }, { id: "org-2" }]); // Children query
      organizationsService.getCtxhActivityViewableOrganizations.mockResolvedValue(
        [{ id: "org-1" }],
      );

      await service.findAll({ user_id: "user-1" });
      expect(organizationsService.getCtxhActivityViewableOrganizations).toHaveBeenCalledWith(
        "user-1",
      );
      expect(qb.andWhere).toHaveBeenCalledWith(
        "activity.organization_id IN (:...orgIds)",
        expect.any(Object),
      );
    });

    it("should skip org filtering for users with global permission", async () => {
      const qb = {
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        take: jest.fn().mockReturnThis(),
        getManyAndCount: jest.fn(async () => [[], 0]),
      };
      activityRepository.createQueryBuilder.mockReturnValue(qb);
      organizationRepository.query.mockResolvedValueOnce([{ id: "role-1" }]);

      await service.findAll({ user_id: "user-1" });

      expect(organizationsService.getCtxhActivityViewableOrganizations).not.toHaveBeenCalled();
      expect(qb.andWhere).not.toHaveBeenCalledWith("1 = 0");
    });

    it("should manually enrich organization and category when join returns empty objects", async () => {
      const activity = {
        id: "a1",
        name: "Activity",
        organization_id: "org-1",
        category_id: "cat-1",
        organization: {},
        category: {},
      };
      const qb = {
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        take: jest.fn().mockReturnThis(),
        getManyAndCount: jest.fn(async () => [[activity], 1]),
      };
      activityRepository.createQueryBuilder.mockReturnValue(qb);
      organizationRepository.findOne.mockResolvedValue({ id: "org-1", name: "Org" });
      categoryRepository.findOne.mockResolvedValue({ id: "cat-1", name: "Cat" });

      const res = await service.findAll({});

      expect(res.data[0].organization.name).toBe("Org");
      expect(res.data[0].category.name).toBe("Cat");
    });

    it("should return empty when user has no accessible organizations", async () => {
      const qb = {
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        take: jest.fn().mockReturnThis(),
        getManyAndCount: jest.fn(async () => [[], 0]),
      };
      activityRepository.createQueryBuilder.mockReturnValue(qb);
      // Mock global permission check to return no global permission
      organizationRepository.query.mockResolvedValueOnce([]); // Global permission check returns empty
      organizationsService.getCtxhActivityViewableOrganizations.mockResolvedValue(
        [],
      );

      await service.findAll({ user_id: "user-1" });
      expect(qb.andWhere).toHaveBeenCalledWith("1 = 0");
    });

    it("should calculate pagination correctly", async () => {
      const qb = {
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        take: jest.fn().mockReturnThis(),
        getManyAndCount: jest.fn(async () => [[], 100]),
      };
      activityRepository.createQueryBuilder.mockReturnValue(qb);

      const res = await service.findAll({ page: 2, limit: 20 });
      expect(res.totalPages).toBe(5);
      expect(res.hasNextPage).toBe(true);
      expect(res.hasPrevPage).toBe(true);
      expect(qb.skip).toHaveBeenCalledWith(20);
      expect(qb.take).toHaveBeenCalledWith(20);
    });
  });
});