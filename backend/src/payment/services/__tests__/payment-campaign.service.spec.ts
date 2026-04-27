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
});