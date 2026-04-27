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
});