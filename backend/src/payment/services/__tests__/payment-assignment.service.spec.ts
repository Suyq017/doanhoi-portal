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

  it("should return canDelete false for paid assignments", async () => {
    assignmentRepository.findOne.mockResolvedValue({ id: "assign-1", status: PaymentAssignmentStatus.PAID });

    const result = await service.canDelete("assign-1");

    expect(result.canDelete).toBe(false);
  });

  it("should update overdue assignments", async () => {
    assignmentRepository.find.mockResolvedValue([{ id: "assign-1" }]);

    const count = await service.checkOverdueAssignments();

    expect(count).toBe(1);
    expect(assignmentRepository.update).toHaveBeenCalled();
  });
});