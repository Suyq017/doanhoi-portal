import { beforeEach, describe, expect, it, jest } from "@jest/globals";
import { PaymentAssignmentService } from "../payment-assignment.service";
import { PaymentAssignmentStatus } from "../../../entities/payment-assignment.entity";

describe("PaymentAssignmentService", () => {
  const createRepositoryMock = () => ({
    findOne: jest.fn() as any,
    find: jest.fn() as any,
    findAndCount: jest.fn() as any,
    create: jest.fn((value) => value) as any,
    save: jest.fn(async (value) => value) as any,
    remove: jest.fn() as any,
    update: jest.fn() as any,
  });

  let assignmentRepository: ReturnType<typeof createRepositoryMock>;
  let campaignRepository: ReturnType<typeof createRepositoryMock>;
  let feeLevelRepository: ReturnType<typeof createRepositoryMock>;
  let userRepository: ReturnType<typeof createRepositoryMock>;
  let paymentHistoryRepository: ReturnType<typeof createRepositoryMock>;
  let service: PaymentAssignmentService;

  beforeEach(() => {
    assignmentRepository = createRepositoryMock();
    campaignRepository = createRepositoryMock();
    feeLevelRepository = createRepositoryMock();
    userRepository = createRepositoryMock();
    paymentHistoryRepository = createRepositoryMock();
    service = new PaymentAssignmentService(
      assignmentRepository as never,
      campaignRepository as never,
      feeLevelRepository as never,
      userRepository as never,
      paymentHistoryRepository as never,
    );
    (service as any).logger = {
      log: jest.fn(),
      error: jest.fn(),
      warn: jest.fn(),
    };
  });

  it("should create an assignment when campaign, user, and fee level exist", async () => {
    campaignRepository.findOne.mockResolvedValue({ id: "camp-1", organization: { id: "org-1" } });
    userRepository.findOne.mockResolvedValue({ id: "user-1" });
    feeLevelRepository.findOne.mockResolvedValue({ id: "fee-1", amount: 100000 });
    assignmentRepository.findOne.mockResolvedValue(null);
    assignmentRepository.save.mockImplementation(async (value: any) => ({ ...value, id: "assign-1" }));

    const result = await service.create({
      campaignId: "camp-1",
      userId: "user-1",
      feeLevelId: "fee-1",
      notes: "note",
    } as any, "admin-1");

    expect(result.id).toBe("assign-1");
  });

  it("should reject duplicate assignments", async () => {
    campaignRepository.findOne.mockResolvedValue({ id: "camp-1", organization: { id: "org-1" } });
    userRepository.findOne.mockResolvedValue({ id: "user-1" });
    feeLevelRepository.findOne.mockResolvedValue({ id: "fee-1" });
    assignmentRepository.findOne.mockResolvedValue({ id: "existing" });

    await expect(service.create({ campaignId: "camp-1", userId: "user-1", feeLevelId: "fee-1" } as any, "admin-1")).rejects.toThrow(
      "Payment assignment already exists for user user-1 in campaign camp-1",
    );
  });

  it("should reject create when campaign, user, or fee level is missing", async () => {
    campaignRepository.findOne.mockResolvedValue(null);
    await expect(service.create({ campaignId: "missing", userId: "u1", feeLevelId: "f1" } as any, "admin")).rejects.toThrow(
      "Payment campaign not found",
    );

    campaignRepository.findOne.mockResolvedValue({ id: "camp-1", organization: { id: "org-1" } });
    userRepository.findOne.mockResolvedValue(null);
    await expect(service.create({ campaignId: "camp-1", userId: "missing", feeLevelId: "f1" } as any, "admin")).rejects.toThrow(
      "User not found",
    );

    userRepository.findOne.mockResolvedValue({ id: "u1" });
    feeLevelRepository.findOne.mockResolvedValue(null);
    await expect(service.create({ campaignId: "camp-1", userId: "u1", feeLevelId: "missing" } as any, "admin")).rejects.toThrow(
      "Fee level not found",
    );
  });

  it("should create bulk assignments and skip failures", async () => {
    campaignRepository.findOne.mockResolvedValue({ id: "camp-1", organization: { id: "org-1" } });
    userRepository.findOne.mockResolvedValue({ id: "user-1" });
    feeLevelRepository.findOne
      .mockResolvedValueOnce({ id: "fee-1", amount: 100000 })
      .mockRejectedValueOnce(new Error("Fee level lookup failed"));
    assignmentRepository.findOne.mockResolvedValue(null);
    assignmentRepository.save.mockImplementation(async (value: any) => value);

    const results = await service.createBulk([
      { campaignId: "camp-1", userId: "user-1", feeLevelId: "fee-1" } as any,
      { campaignId: "camp-1", userId: "user-1", feeLevelId: "fee-1" } as any,
    ], "admin-1");

    expect(results.length).toBe(1);
  });

  it("should reject invalid status transition", async () => {
    assignmentRepository.findOne.mockResolvedValue({ id: "assign-1", status: PaymentAssignmentStatus.PAID });

    await expect(service.updateStatus("assign-1", PaymentAssignmentStatus.PENDING)).rejects.toThrow();
  });

  it("should find assignments with pagination and filters", async () => {
    assignmentRepository.findAndCount.mockResolvedValue([[{ id: "a1" }], 1]);

    const result = await service.findAll("camp-1", "u1", PaymentAssignmentStatus.PENDING, 2, 5);

    expect(assignmentRepository.findAndCount).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { campaignId: "camp-1", userId: "u1", status: PaymentAssignmentStatus.PENDING },
        skip: 5,
        take: 5,
      }),
    );
    expect(result.pagination.total).toBe(1);
  });

  it("should rethrow findAll errors", async () => {
    assignmentRepository.findAndCount.mockRejectedValue(new Error("db fail"));

    await expect(service.findAll()).rejects.toThrow("db fail");
  });

  it("should throw when assignment is not found", async () => {
    assignmentRepository.findOne.mockResolvedValue(null);

    await expect(service.findOne("missing")).rejects.toThrow("Payment assignment not found");
  });

  it("should update assignment for valid status transition", async () => {
    assignmentRepository.findOne.mockResolvedValue({
      id: "assign-1",
      status: PaymentAssignmentStatus.PENDING,
      campaign: {},
      user: {},
      feeLevel: {},
    });
    assignmentRepository.save.mockImplementation(async (value: any) => value);

    const updated = await service.update("assign-1", { status: PaymentAssignmentStatus.OVERDUE } as any);
    expect(updated.status).toBe(PaymentAssignmentStatus.OVERDUE);
  });

  it("should mark assignment as paid and create history", async () => {
    assignmentRepository.findOne.mockResolvedValue({
      id: "assign-1",
      status: PaymentAssignmentStatus.PENDING,
      feeLevel: { amount: 100000 },
    });
    assignmentRepository.save.mockImplementation(async (value: any) => value);
    paymentHistoryRepository.create.mockImplementation((value: any) => value);
    paymentHistoryRepository.save.mockImplementation(async (value: any) => value);

    const result = await service.markAsPaid("assign-1", true);

    expect(result.status).toBe(PaymentAssignmentStatus.PAID);
    expect(paymentHistoryRepository.save).toHaveBeenCalled();
  });

  it("should reject markAsPaid when assignment already paid", async () => {
    assignmentRepository.findOne.mockResolvedValue({
      id: "assign-1",
      status: PaymentAssignmentStatus.PAID,
      campaign: {},
      user: {},
      feeLevel: { amount: 100000 },
    });

    await expect(service.markAsPaid("assign-1", false)).rejects.toThrow("Assignment is already marked as paid");
  });

  it("should mark pending assignment as overdue and reject non-pending assignment", async () => {
    assignmentRepository.findOne.mockResolvedValueOnce({
      id: "assign-1",
      status: PaymentAssignmentStatus.PENDING,
      campaign: {},
      user: {},
      feeLevel: {},
    });
    assignmentRepository.save.mockImplementation(async (value: any) => value);

    const overdue = await service.markAsOverdue("assign-1");
    expect(overdue.status).toBe(PaymentAssignmentStatus.OVERDUE);

    assignmentRepository.findOne.mockResolvedValueOnce({
      id: "assign-2",
      status: PaymentAssignmentStatus.PAID,
      campaign: {},
      user: {},
      feeLevel: {},
    });
    await expect(service.markAsOverdue("assign-2")).rejects.toThrow("Only pending assignments can be marked as overdue");
  });

  it("should return canDelete false for paid assignments", async () => {
    assignmentRepository.findOne.mockResolvedValue({ id: "assign-1", status: PaymentAssignmentStatus.PAID });

    const result = await service.canDelete("assign-1");

    expect(result.canDelete).toBe(false);
  });

  it("should return canDelete false when paid history exists", async () => {
    assignmentRepository.findOne.mockResolvedValue({
      id: "assign-1",
      status: PaymentAssignmentStatus.PENDING,
      campaign: {},
      user: {},
      feeLevel: {},
    });
    paymentHistoryRepository.find.mockResolvedValue([
      { status: "PAID" },
      { status: "PENDING" },
    ]);

    const result = await service.canDelete("assign-1");

    expect(result.canDelete).toBe(false);
    expect(result.relatedData.paymentHistoryCount).toBe(2);
    expect(result.relatedData.paidHistoryCount).toBe(1);
  });

  it("should return canDelete true when there is no paid history", async () => {
    assignmentRepository.findOne.mockResolvedValue({
      id: "assign-1",
      status: PaymentAssignmentStatus.PENDING,
      campaign: {},
      user: {},
      feeLevel: {},
    });
    paymentHistoryRepository.find.mockResolvedValue([{ status: "PENDING" }]);

    const result = await service.canDelete("assign-1");

    expect(result.canDelete).toBe(true);
    expect(result.relatedData).toEqual({ paymentHistoryCount: 1, paidHistoryCount: 0 });
  });

  it("should remove assignment with cascade payment history deletion", async () => {
    paymentHistoryRepository.find.mockResolvedValue([{ id: "h1" }]);
    assignmentRepository.findOne.mockResolvedValue({ id: "assign-1" });

    await expect(service.remove("assign-1")).resolves.toBeUndefined();
    expect(paymentHistoryRepository.remove).toHaveBeenCalledWith([{ id: "h1" }]);
    expect(assignmentRepository.remove).toHaveBeenCalledWith({ id: "assign-1" });
  });

  it("should skip assignment removal when assignment does not exist in cascade step", async () => {
    paymentHistoryRepository.find.mockResolvedValue([]);
    assignmentRepository.findOne.mockResolvedValue(null);

    await expect(service.remove("missing")).resolves.toBeUndefined();
    expect(paymentHistoryRepository.remove).not.toHaveBeenCalled();
    expect(assignmentRepository.remove).not.toHaveBeenCalled();
  });

  it("should calculate statistics for campaign and organization filters", async () => {
    assignmentRepository.find
      .mockResolvedValueOnce([
        { status: PaymentAssignmentStatus.PAID, feeLevel: { amount: 100 } },
        { status: PaymentAssignmentStatus.PENDING, feeLevel: { amount: 50 } },
      ])
      .mockResolvedValueOnce([
        { status: PaymentAssignmentStatus.OVERDUE, feeLevel: { amount: 70 } },
      ]);

    const byCampaign = await service.getStatistics("camp-1");
    const byOrg = await service.getStatistics(undefined, "org-1");

    expect(byCampaign.totalAssignments).toBe(2);
    expect(byCampaign.paidCount).toBe(1);
    expect(byCampaign.totalAmount).toBe(150);
    expect(byCampaign.paymentRate).toBe(50);

    expect(assignmentRepository.find).toHaveBeenCalledWith(
      expect.objectContaining({ where: { campaign: { organizationId: "org-1" } } }),
    );
    expect(byOrg.overdueCount).toBe(1);
  });

  it("should rethrow getStatistics errors", async () => {
    assignmentRepository.find.mockRejectedValue(new Error("stats fail"));

    await expect(service.getStatistics("camp-1")).rejects.toThrow("stats fail");
  });

  it("should update overdue assignments", async () => {
    assignmentRepository.find.mockResolvedValue([{ id: "assign-1" }]);

    const count = await service.checkOverdueAssignments();

    expect(count).toBe(1);
    expect(assignmentRepository.update).toHaveBeenCalled();
  });

  it("should return zero when no overdue assignments found", async () => {
    assignmentRepository.find.mockResolvedValue([]);

    const count = await service.checkOverdueAssignments();

    expect(count).toBe(0);
    expect(assignmentRepository.update).not.toHaveBeenCalled();
  });
});