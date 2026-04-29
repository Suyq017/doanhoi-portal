import { describe, expect, it, jest, beforeEach } from "@jest/globals";
import { PaymentCampaignService } from "../payment-campaign.service";
import { PaymentAssignmentStatus } from "../../../entities/payment-assignment.entity";
import { PaymentCampaignStatus } from "../../../entities/payment-campaign.entity";

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

describe("PaymentCampaignService extra tests", () => {
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

  it("activate should throw when no fee levels", async () => {
    campaignRepository.findOne.mockResolvedValue({ id: "c1", status: PaymentCampaignStatus.DRAFT, feeLevels: [] });
    await expect(service.activate("c1")).rejects.toThrow();
  });

  it("cancel should throw when campaign completed", async () => {
    campaignRepository.findOne.mockResolvedValue({ id: "c2", status: PaymentCampaignStatus.COMPLETED });
    await expect(service.cancel("c2")).rejects.toThrow();
  });

  it("cancel should update pending assignments to overdue", async () => {
    campaignRepository.findOne.mockResolvedValueOnce({ id: "c3", status: PaymentCampaignStatus.DRAFT, feeLevels: [{ id: "f1" }] });
    campaignRepository.save.mockResolvedValue({ id: "c3", status: PaymentCampaignStatus.CANCELLED } as any);
    assignmentRepository.find.mockResolvedValue([{ id: "as1" }]);

    const res = await service.cancel("c3");
    expect(res.status).toBe(PaymentCampaignStatus.CANCELLED);
    expect(assignmentRepository.update).toHaveBeenCalledWith(
      { campaignId: "c3", status: PaymentAssignmentStatus.PENDING },
      { status: PaymentAssignmentStatus.OVERDUE },
    );
  });

  it("create should throw when org not found", async () => {
    organizationRepository.findOne.mockResolvedValue(null);
    await expect(service.create({ organizationId: "no" } as any, "u1")).rejects.toThrow();
  });

  it("create should throw when user not found", async () => {
    organizationRepository.findOne.mockResolvedValue({ id: "org" });
    userRepository.findOne.mockResolvedValue(null);
    await expect(service.create({ organizationId: "org" } as any, "u1")).rejects.toThrow();
  });

  it("remove should cascade delete related records", async () => {
    campaignRepository.findOne
      .mockResolvedValueOnce({ id: "del-1", status: PaymentCampaignStatus.CANCELLED })
      .mockResolvedValueOnce({ id: "del-1" });

    assignmentRepository.find.mockResolvedValue([{ id: "ass-1" }]);
    paymentHistoryRepository.find.mockResolvedValueOnce([{ id: "ph-1" }]);
    payosConfigRepository.find.mockResolvedValue([{ id: "pc-1" }]);

    await service.remove("del-1");

    expect(paymentHistoryRepository.remove).toHaveBeenCalled();
    expect(assignmentRepository.remove).toHaveBeenCalled();
    expect(payosConfigRepository.remove).toHaveBeenCalled();
    expect(campaignRepository.remove).toHaveBeenCalled();
  });

  it("update should move finished campaigns and skip overdue update when no pending assignments exist", async () => {
    campaignRepository.findOne.mockResolvedValueOnce({
      id: "u1",
      status: PaymentCampaignStatus.DRAFT,
      organizationId: "org-1",
    });
    campaignRepository.save.mockResolvedValue({
      id: "u1",
      status: PaymentCampaignStatus.COMPLETED,
    } as any);
    assignmentRepository.find.mockResolvedValue([]);

    const result = await service.update("u1", { status: PaymentCampaignStatus.COMPLETED } as any);

    expect(result.status).toBe(PaymentCampaignStatus.COMPLETED);
    expect(assignmentRepository.update).not.toHaveBeenCalled();
  });

  it("update should reject restricted changes on active campaigns", async () => {
    campaignRepository.findOne.mockResolvedValue({
      id: "u2",
      status: PaymentCampaignStatus.ACTIVE,
      organizationId: "org-1",
    });

    await expect(
      service.update("u2", { organizationId: "org-2" } as any),
    ).rejects.toThrow("Cannot modify organization or start date of active campaign");
  });

  it("canDelete should block active campaigns and return reason", async () => {
    campaignRepository.findOne.mockResolvedValue({
      id: "d1",
      status: PaymentCampaignStatus.ACTIVE,
    });

    const result = await service.canDelete("d1");

    expect(result).toEqual({
      canDelete: false,
      reason: "Cannot delete active campaign",
    });
    expect(assignmentRepository.find).not.toHaveBeenCalled();
  });

  it("canDelete should return zero related data when there are no assignments", async () => {
    campaignRepository.findOne.mockResolvedValue({
      id: "d2",
      status: PaymentCampaignStatus.CANCELLED,
    });
    assignmentRepository.find.mockResolvedValue([]);

    const result = await service.canDelete("d2");

    expect(result.canDelete).toBe(true);
    expect(result.relatedData).toEqual({
      assignmentCount: 0,
      totalPaymentHistories: 0,
      paidHistoryCount: 0,
      campaignStatus: PaymentCampaignStatus.CANCELLED,
    });
  });

  it("getStatistics should aggregate totals and completion rate from raw query results", async () => {
    campaignRepository.findOne.mockResolvedValue({
      id: "s1",
      status: PaymentCampaignStatus.ACTIVE,
    });

    const queryBuilder = {
      leftJoin: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      leftJoinAndSelect: jest.fn().mockReturnThis(),
      getRawOne: jest.fn().mockResolvedValue({
        totalAssignments: "4",
        paidCount: "3",
        pendingCount: "1",
        overdueCount: "0",
        totalPaid: "150000",
        totalAmount: "200000",
      }),
    } as any;
    campaignRepository.createQueryBuilder.mockReturnValue(queryBuilder);

    const result = await service.getStatistics("s1");

    expect(queryBuilder.where).toHaveBeenCalledWith("campaign.id = :id", { id: "s1" });
    expect(result).toEqual({
      totalAssignments: 4,
      paidCount: 3,
      pendingCount: 1,
      overdueCount: 0,
      totalPaid: 150000,
      totalAmount: 200000,
      completionRate: 75,
    });
  });
});
