import { PaymentHistoryService } from "../payment-history.service";
import { PaymentHistoryStatus } from "../../../entities/payment-history.entity";

describe("PaymentHistoryService", () => {
  const createRepositoryMock = () => ({
    create: jest.fn((value) => value),
    save: jest.fn(async (value) => value),
    findOne: jest.fn(),
    find: jest.fn(),
    createQueryBuilder: jest.fn(),
  });

  let repository: ReturnType<typeof createRepositoryMock>;
  let service: PaymentHistoryService;

  beforeEach(() => {
    repository = createRepositoryMock();
    service = new PaymentHistoryService(repository as never);
  });

  it("should create a pending payment record", async () => {
    repository.save.mockImplementation(async (value) => ({ ...value, id: "ph-1" }));

    const result = await service.createPaymentRecord({
      assignmentId: "assign-1",
      amount: 100000,
      orderCode: 12345,
    });

    expect(result.status).toBe(PaymentHistoryStatus.PENDING);
    expect(result.order_code).toBe(12345);
  });

  it("should update payment status and paid time", async () => {
    repository.findOne.mockResolvedValue({ id: "ph-1", status: PaymentHistoryStatus.PENDING });

    const result = await service.updatePaymentStatus(12345, PaymentHistoryStatus.PAID, new Date("2024-01-01"));

    expect(result.status).toBe(PaymentHistoryStatus.PAID);
    expect(result.paid_at).toEqual(new Date("2024-01-01"));
  });
});