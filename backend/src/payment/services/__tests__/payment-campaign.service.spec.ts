import { beforeEach, describe, expect, it, jest } from "@jest/globals";
import { PaymentCampaignService } from "../payment-campaign.service";
import { PaymentAssignmentStatus } from "../../../entities/payment-assignment.entity";
import { PaymentCampaignStatus } from "../../../entities/payment-campaign.entity";

describe("PaymentCampaignService", () => {
  const createRepositoryMock = () => ({
    findOne: jest.fn() as any,
    create: jest.fn((value) => value) as any,
    save: jest.fn(async (value) => value) as any,
    find: jest.fn() as any,
    update: jest.fn() as any,
    remove: jest.fn() as any,
    createQueryBuilder: jest.fn() as any,
  });

  const createRolesServiceMock = () => ({
    getUserRoles: jest.fn() as any,
  });

  let campaignRepository: ReturnType<typeof createRepositoryMock>;
  let assignmentRepository: ReturnType<typeof createRepositoryMock>;
  let paymentHistoryRepository: ReturnType<typeof createRepositoryMock>;
  let payosConfigRepository: ReturnType<typeof createRepositoryMock>;
  let userRepository: ReturnType<typeof createRepositoryMock>;
  let organizationRepository: ReturnType<typeof createRepositoryMock>;
  let rolesService: ReturnType<typeof createRolesServiceMock>;
  let service: PaymentCampaignService;

  beforeEach(() => {
    campaignRepository = createRepositoryMock();
    assignmentRepository = createRepositoryMock();
    paymentHistoryRepository = createRepositoryMock();
    payosConfigRepository = createRepositoryMock();
    userRepository = createRepositoryMock();
    organizationRepository = createRepositoryMock();
    rolesService = createRolesServiceMock();
    service = new PaymentCampaignService(
      campaignRepository as never,
      assignmentRepository as never,
      paymentHistoryRepository as never,
      payosConfigRepository as never,
      userRepository as never,
      organizationRepository as never,
      rolesService as never,
    );

    jest.spyOn((service as any).logger, "log").mockImplementation(() => undefined);
    jest.spyOn((service as any).logger, "error").mockImplementation(() => undefined);
    jest.spyOn(console, "log").mockImplementation(() => undefined);
    jest.spyOn(console, "error").mockImplementation(() => undefined);
  });

  it("should create a payment campaign when user and organization exist", async () => {
    organizationRepository.findOne.mockResolvedValue({ id: "org-1" });
    userRepository.findOne.mockResolvedValue({ id: "user-1", familyName: "A", givenName: "B", code: "SV001" });
    campaignRepository.save.mockImplementation(async (value: any) => ({ ...value, id: "camp-1" }));

    const result = await service.create({ organizationId: "org-1", name: "Campaign" } as any, "user-1");

    expect(result.id).toBe("camp-1");
  });

  it("should find campaigns with filters and accessible organization scope", async () => {
    const queryBuilder = {
      leftJoinAndSelect: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      skip: jest.fn().mockReturnThis(),
      take: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      getManyAndCount: jest.fn(async () => [[], 0] as any),
    } as any;
    campaignRepository.createQueryBuilder.mockReturnValue(queryBuilder);

    await service.findAll({
      organizationId: "org-1",
      status: PaymentCampaignStatus.DRAFT,
      search: "camp",
      startDate: "2026-01-01",
      endDate: "2026-12-31",
      page: 3,
      limit: 5,
      accessibleOrgIds: ["org-1", "org-2"],
    });

    expect(queryBuilder.andWhere).toHaveBeenCalledWith(
      "campaign.organizationId IN (:...accessibleOrgIds)",
      { accessibleOrgIds: ["org-1", "org-2"] },
    );
    expect(queryBuilder.skip).toHaveBeenCalledWith(10);
    expect(queryBuilder.take).toHaveBeenCalledWith(5);
  });

  it("should return accessible organization ids for org-scoped payment permission", async () => {
    rolesService.getUserRoles.mockResolvedValue([
      {
        organizationId: "org-1",
        role: {
          name: "admin",
          permissions: [{ code: "payment-campaigns.create", isActive: true }],
        },
      },
    ]);

    await expect(service.getAccessibleOrganizations("user-1")).resolves.toEqual(["org-1"]);
  });

  it("should treat global system admin permission as unrestricted access", async () => {
    rolesService.getUserRoles.mockResolvedValue([
      {
        organizationId: null,
        role: {
          name: "admin",
          permissions: [{ code: "system.access_admin", isActive: true }],
        },
      },
    ]);
    organizationRepository.find.mockResolvedValue([{ id: "org-1", name: "Org 1" }]);

    await expect(service.getAccessibleOrganizations("user-1")).resolves.toEqual([]);
    await expect(service.getAccessibleOrganizationsWithDetails("user-1")).resolves.toEqual([
      { id: "org-1", name: "Org 1" },
    ]);
  });

  it("should skip organization filter when accessible organization list is empty", async () => {
    const queryBuilder = {
      leftJoinAndSelect: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      skip: jest.fn().mockReturnThis(),
      take: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      getManyAndCount: jest.fn(async () => [[], 0] as any),
    } as any;
    campaignRepository.createQueryBuilder.mockReturnValue(queryBuilder);

    await service.findAll({
      accessibleOrgIds: [],
      page: 1,
      limit: 10,
    });

    expect(queryBuilder.andWhere).not.toHaveBeenCalledWith(
      "campaign.organizationId IN (:...accessibleOrgIds)",
      expect.anything(),
    );
  });

  it("should return all organizations for super admin users", async () => {
    rolesService.getUserRoles.mockResolvedValue([
      {
        organizationId: null,
        role: { name: "super_admin", permissions: [] },
      },
    ]);
    organizationRepository.find.mockResolvedValue([{ id: "org-1" }]);

    await expect(service.getAccessibleOrganizationsWithDetails("user-1")).resolves.toEqual([{ id: "org-1" }]);
  });

  it("should block restricted updates on active campaigns", async () => {
    campaignRepository.findOne.mockResolvedValue({ id: "camp-1", status: PaymentCampaignStatus.ACTIVE });

    await expect(service.update("camp-1", { organizationId: "org-2" } as any)).rejects.toThrow();
  });

  it("should activate a draft campaign and complete it later", async () => {
    campaignRepository.findOne.mockResolvedValueOnce({
      id: "camp-1",
      status: PaymentCampaignStatus.DRAFT,
      feeLevels: [{ id: "fee-1" }],
    });
    campaignRepository.save.mockResolvedValue({ id: "camp-1", status: PaymentCampaignStatus.ACTIVE } as any);

    const activated = await service.activate("camp-1");

    expect(activated.status).toBe(PaymentCampaignStatus.ACTIVE);

    campaignRepository.findOne.mockResolvedValueOnce({
      id: "camp-1",
      status: PaymentCampaignStatus.ACTIVE,
      feeLevels: [{ id: "fee-1" }],
    });
    assignmentRepository.find.mockResolvedValue([{ id: "assign-1" }]);
    campaignRepository.save.mockResolvedValue({ id: "camp-1", status: PaymentCampaignStatus.COMPLETED } as any);

    const completed = await service.complete("camp-1");

    expect(completed.status).toBe(PaymentCampaignStatus.COMPLETED);
    expect(assignmentRepository.update).toHaveBeenCalledWith(
      { campaignId: "camp-1", status: PaymentAssignmentStatus.PENDING },
      { status: PaymentAssignmentStatus.OVERDUE },
    );
  });

  it("should compute canDelete details for a completed campaign", async () => {
    campaignRepository.findOne.mockResolvedValue({ id: "camp-1", status: PaymentCampaignStatus.COMPLETED });
    assignmentRepository.find.mockResolvedValue([{ id: "assign-1" }, { id: "assign-2" }]);
    paymentHistoryRepository.find
      .mockResolvedValueOnce([
        { status: "PAID" },
        { status: "PENDING" },
      ])
      .mockResolvedValueOnce([{ status: "PAID" }]);

    const result = await service.canDelete("camp-1");

    expect(result.canDelete).toBe(true);
    expect(result.relatedData.assignmentCount).toBe(2);
    expect(result.relatedData.totalPaymentHistories).toBe(3);
    expect(result.relatedData.paidHistoryCount).toBe(2);
  });

  // ===== NEW TESTS BELOW =====

  it("should find campaign by id with all relations", async () => {
    campaignRepository.findOne.mockResolvedValue({
      id: "camp-1",
      name: "Test Campaign",
      organization: { id: "org-1" },
      createdByUser: { id: "user-1" },
      feeLevels: [{ id: "fee-1" }],
      assignments: [],
    });

    const result = await service.findOne("camp-1");

    expect(result.id).toBe("camp-1");
    expect(campaignRepository.findOne).toHaveBeenCalledWith({
      where: { id: "camp-1" },
      relations: expect.arrayContaining(["organization", "createdByUser", "feeLevels"]),
    });
  });

  it("should throw NotFoundException when campaign not found", async () => {
    campaignRepository.findOne.mockResolvedValue(null);

    await expect(service.findOne("missing-id")).rejects.toThrow("Payment campaign not found");
  });

  it("should throw NotFoundException when organization not found during create", async () => {
    organizationRepository.findOne.mockResolvedValue(null);

    await expect(
      service.create({ organizationId: "missing-org", name: "Test" } as any, "user-1")
    ).rejects.toThrow("Organization with ID missing-org not found");
  });

  it("should throw NotFoundException when user not found during create", async () => {
    organizationRepository.findOne.mockResolvedValue({ id: "org-1" });
    userRepository.findOne.mockResolvedValue(null);

    await expect(
      service.create({ organizationId: "org-1", name: "Test" } as any, "missing-user")
    ).rejects.toThrow("User with ID missing-user not found");
  });

  it("should find campaigns by organization", async () => {
    campaignRepository.find.mockResolvedValue([
      { id: "camp-1", organizationId: "org-1", name: "Camp 1" },
      { id: "camp-2", organizationId: "org-1", name: "Camp 2" },
    ]);

    const result = await service.findByOrganization("org-1");

    expect(result).toHaveLength(2);
    expect(campaignRepository.find).toHaveBeenCalledWith({
      where: { organizationId: "org-1" },
      relations: expect.arrayContaining(["organization", "createdByUser", "feeLevels"]),
      order: { createdAt: "DESC" },
    });
  });

  it("should return empty accessible organizations when user has no payment permissions", async () => {
    rolesService.getUserRoles.mockResolvedValue([
      {
        organizationId: "org-1",
        role: { name: "viewer", permissions: [{ code: "other.permission", isActive: true }] },
      },
    ]);

    const result = await service.getAccessibleOrganizations("user-1");

    expect(result).toEqual([]);
  });

  it("should return empty array on error in getAccessibleOrganizations", async () => {
    rolesService.getUserRoles.mockRejectedValue(new Error("DB error"));

    const result = await service.getAccessibleOrganizations("user-1");

    expect(result).toEqual([]);
  });

  it("should return empty array on error in getAccessibleOrganizationsWithDetails", async () => {
    rolesService.getUserRoles.mockRejectedValue(new Error("DB error"));

    const result = await service.getAccessibleOrganizationsWithDetails("user-1");

    expect(result).toEqual([]);
  });

  it("should filter campaigns by accessibleOrgIds empty array (super admin no-filter case)", async () => {
    const queryBuilder = {
      leftJoinAndSelect: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      skip: jest.fn().mockReturnThis(),
      take: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      getManyAndCount: jest.fn(async () => [[{ id: "camp-1" }], 1] as any),
    } as any;
    campaignRepository.createQueryBuilder.mockReturnValue(queryBuilder);

    await service.findAll({ accessibleOrgIds: [] }); // empty array = super admin

    // Should NOT call andWhere for org filter when accessibleOrgIds is empty
    const orgs_filter_calls = (queryBuilder.andWhere as jest.Mock).mock.calls.filter(
      (call: any) => call[0] && call[0].includes("accessibleOrgIds")
    );
    expect(orgs_filter_calls).toHaveLength(0);
  });

  it("should return empty campaigns when no accessible organizations", async () => {
    const queryBuilder = {
      leftJoinAndSelect: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      skip: jest.fn().mockReturnThis(),
      take: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      getManyAndCount: jest.fn(async () => [[], 0] as any),
    } as any;
    campaignRepository.createQueryBuilder.mockReturnValue(queryBuilder);

    const result = await service.findAll({ accessibleOrgIds: [] });

    expect(result.campaigns).toEqual([]);
    expect(result.total).toBe(0);
  });

  it("should throw BadRequestException when activating non-draft campaign", async () => {
    campaignRepository.findOne.mockResolvedValue({
      id: "camp-1",
      status: PaymentCampaignStatus.ACTIVE,
      feeLevels: [{ id: "fee-1" }],
    });

    await expect(service.activate("camp-1")).rejects.toThrow("Only draft campaigns can be activated");
  });

  it("should throw BadRequestException when activating campaign with no fee levels", async () => {
    campaignRepository.findOne.mockResolvedValue({
      id: "camp-1",
      status: PaymentCampaignStatus.DRAFT,
      feeLevels: [],
    });

    await expect(service.activate("camp-1")).rejects.toThrow("Campaign must have at least one fee level");
  });

  it("should throw BadRequestException when completing non-active campaign", async () => {
    campaignRepository.findOne.mockResolvedValue({
      id: "camp-1",
      status: PaymentCampaignStatus.DRAFT,
      feeLevels: [{ id: "fee-1" }],
    });

    await expect(service.complete("camp-1")).rejects.toThrow("Only active campaigns can be completed");
  });

  it("should throw BadRequestException when cancelling completed campaign", async () => {
    campaignRepository.findOne.mockResolvedValue({
      id: "camp-1",
      status: PaymentCampaignStatus.COMPLETED,
    });

    await expect(service.cancel("camp-1")).rejects.toThrow("Cannot cancel completed campaign");
  });

  it("should cancel active campaign and update pending assignments", async () => {
    campaignRepository.findOne.mockResolvedValue({
      id: "camp-1",
      status: PaymentCampaignStatus.ACTIVE,
    });
    campaignRepository.save.mockResolvedValue({ id: "camp-1", status: PaymentCampaignStatus.CANCELLED });
    assignmentRepository.find.mockResolvedValue([{ id: "assign-1" }]);

    const result = await service.cancel("camp-1");

    expect(result.status).toBe(PaymentCampaignStatus.CANCELLED);
    expect(assignmentRepository.update).toHaveBeenCalledWith(
      { campaignId: "camp-1", status: PaymentAssignmentStatus.PENDING },
      { status: PaymentAssignmentStatus.OVERDUE },
    );
  });

  it("should return canDelete false for active campaign", async () => {
    campaignRepository.findOne.mockResolvedValue({
      id: "camp-1",
      status: PaymentCampaignStatus.ACTIVE,
    });

    const result = await service.canDelete("camp-1");

    expect(result.canDelete).toBe(false);
    expect(result.reason).toBe("Cannot delete active campaign");
  });

  it("should throw BadRequestException when removing active campaign", async () => {
    campaignRepository.findOne.mockResolvedValue({
      id: "camp-1",
      status: PaymentCampaignStatus.ACTIVE,
    });

    await expect(service.remove("camp-1")).rejects.toThrow("Cannot delete active campaign");
  });

  it("should remove campaign with cascade delete", async () => {
    campaignRepository.findOne.mockResolvedValue({
      id: "camp-1",
      status: PaymentCampaignStatus.CANCELLED,
    });
    assignmentRepository.find
      .mockResolvedValueOnce([{ id: "assign-1" }]) // initial find
      .mockResolvedValueOnce([{ id: "assign-1" }]); // cascadeDelete assignments
    paymentHistoryRepository.find
      .mockResolvedValueOnce([{ id: "hist-1", status: "PAID" }]); // cascadeDelete payment histories
    payosConfigRepository.find.mockResolvedValue([{ id: "payos-1" }]); // cascadeDelete payos configs
    paymentHistoryRepository.remove.mockResolvedValue([]);
    assignmentRepository.remove.mockResolvedValue([]);
    payosConfigRepository.remove.mockResolvedValue([]);
    campaignRepository.remove.mockResolvedValue({});

    await service.remove("camp-1");

    expect(paymentHistoryRepository.remove).toHaveBeenCalled();
    expect(assignmentRepository.remove).toHaveBeenCalled();
    expect(payosConfigRepository.remove).toHaveBeenCalled();
    expect(campaignRepository.remove).toHaveBeenCalled();
  });

  it("should compute statistics for campaign", async () => {
    campaignRepository.findOne.mockResolvedValue({ id: "camp-1" });
    const queryBuilder = {
      leftJoin: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      getRawOne: jest.fn(async () => ({
        totalAssignments: "10",
        paidCount: "7",
        pendingCount: "2",
        overdueCount: "1",
        totalPaid: "70000000",
        totalAmount: "100000000",
      })),
    } as any;
    campaignRepository.createQueryBuilder.mockReturnValue(queryBuilder);

    const result = await service.getStatistics("camp-1");

    expect(result.totalAssignments).toBe(10);
    expect(result.paidCount).toBe(7);
    expect(result.pendingCount).toBe(2);
    expect(result.overdueCount).toBe(1);
    expect(result.totalPaid).toBe(70000000);
    expect(result.totalAmount).toBe(100000000);
    expect(result.completionRate).toBe(70); // 7/10 * 100
  });

  it("should handle statistics with zero assignments", async () => {
    campaignRepository.findOne.mockResolvedValue({ id: "camp-1" });
    const queryBuilder = {
      leftJoin: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      getRawOne: jest.fn(async () => ({
        totalAssignments: "0",
        paidCount: "0",
        pendingCount: "0",
        overdueCount: "0",
        totalPaid: null,
        totalAmount: null,
      })),
    } as any;
    campaignRepository.createQueryBuilder.mockReturnValue(queryBuilder);

    const result = await service.getStatistics("camp-1");

    expect(result.totalAssignments).toBe(0);
    expect(result.completionRate).toBe(0);
    expect(result.totalPaid).toBe(0);
    expect(result.totalAmount).toBe(0);
  });

  it("should handle update status change to COMPLETED and update pending assignments", async () => {
    campaignRepository.findOne.mockResolvedValue({
      id: "camp-1",
      status: PaymentCampaignStatus.ACTIVE,
    });
    campaignRepository.save.mockResolvedValue({ id: "camp-1", status: PaymentCampaignStatus.COMPLETED });
    assignmentRepository.find.mockResolvedValue([{ id: "assign-1", status: PaymentAssignmentStatus.PENDING }]);

    await service.update("camp-1", { status: PaymentCampaignStatus.COMPLETED } as any);

    expect(assignmentRepository.update).toHaveBeenCalledWith(
      { campaignId: "camp-1", status: PaymentAssignmentStatus.PENDING },
      { status: PaymentAssignmentStatus.OVERDUE },
    );
  });

  it("should handle update with no status change", async () => {
    campaignRepository.findOne.mockResolvedValue({
      id: "camp-1",
      status: PaymentCampaignStatus.DRAFT,
      name: "Old Name",
    });
    campaignRepository.save.mockResolvedValue({ id: "camp-1", name: "New Name" });

    await service.update("camp-1", { name: "New Name" } as any);

    expect(assignmentRepository.update).not.toHaveBeenCalled();
  });

  it("should return accessible organizations when has inactive permissions", async () => {
    rolesService.getUserRoles.mockResolvedValue([
      {
        organizationId: "org-1",
        role: {
          name: "admin",
          permissions: [{ code: "payment-campaigns.view", isActive: false }], // inactive
        },
      },
    ]);

    const result = await service.getAccessibleOrganizations("user-1");

    expect(result).toEqual([]);
  });

  it("should remove duplicate accessible organization ids", async () => {
    rolesService.getUserRoles.mockResolvedValue([
      {
        organizationId: "org-1",
        role: {
          name: "admin",
          permissions: [{ code: "payment-campaigns.create", isActive: true }],
        },
      },
      {
        organizationId: "org-1", // duplicate
        role: {
          name: "viewer",
          permissions: [{ code: "payment-campaigns.view", isActive: true }],
        },
      },
    ]);

    const result = await service.getAccessibleOrganizations("user-1");

    expect(result).toEqual(["org-1"]); // only one org-1, not duplicated
  });
});