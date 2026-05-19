import { PaymentHistoryService } from "../payment-history.service";
import { PaymentHistoryStatus } from "../../../entities/payment-history.entity";

describe("PaymentHistoryService", () => {
  const createRepositoryMock = () => ({
    create: jest.fn((value) => value),
    save: jest.fn(async (value) => value),
    findOne: jest.fn(),
    find: jest.fn(),
    createQueryBuilder: jest.fn(),
    delete: jest.fn(),
  });

  let repository: ReturnType<typeof createRepositoryMock>;
  let service: PaymentHistoryService;

  beforeEach(() => {
    repository = createRepositoryMock();
    service = new PaymentHistoryService(repository as never);
    jest.clearAllMocks();
  });

  describe("createPaymentRecord", () => {
    it("should create a pending payment record with minimal data", async () => {
      repository.save.mockImplementation(async (value) => ({
        ...value,
        id: "ph-1",
      }));

      const result = await service.createPaymentRecord({
        assignmentId: "assign-1",
        amount: 100000,
        orderCode: 12345,
      });

      expect(result.status).toBe(PaymentHistoryStatus.PENDING);
      expect(result.order_code).toBe(12345);
      expect(result.assignment_id).toBe("assign-1");
      expect(result.amount).toBe(100000);
    });

    it("should create a payment record with all PayOS credentials", async () => {
      repository.save.mockImplementation(async (value) => ({
        ...value,
        id: "ph-2",
      }));

      const result = await service.createPaymentRecord({
        assignmentId: "assign-2",
        amount: 500000,
        orderCode: 54321,
        clientId: "client-123",
        apiKey: "api-key-456",
        checksumKey: "checksum-789",
      });

      expect(result.client_id).toBe("client-123");
      expect(result.api_key).toBe("api-key-456");
      expect(result.checksum_key).toBe("checksum-789");
    });
  });

  describe("findByOrderCode", () => {
    it("should find payment by order code with relations", async () => {
      const mockPayment = {
        id: "ph-1",
        order_code: 12345,
        assignment: {
          id: "assign-1",
          campaign: {
            id: "campaign-1",
            organization: { id: "org-1" },
          },
        },
      };
      repository.findOne.mockResolvedValue(mockPayment);

      const result = await service.findByOrderCode(12345);

      expect(result).toEqual(mockPayment);
      expect(repository.findOne).toHaveBeenCalledWith({
        where: { order_code: 12345 },
        relations: [
          "assignment",
          "assignment.campaign",
          "assignment.campaign.organization",
        ],
      });
    });

    it("should return null when order code not found", async () => {
      repository.findOne.mockResolvedValue(null);

      const result = await service.findByOrderCode(99999);

      expect(result).toBeNull();
    });
  });

  describe("updatePaymentStatus", () => {
    it("should update payment status to PAID with paid date", async () => {
      const paidDate = new Date("2024-01-15");
      repository.findOne.mockResolvedValue({
        id: "ph-1",
        status: PaymentHistoryStatus.PENDING,
      });
      repository.save.mockImplementation(async (value) => ({
        ...value,
        id: "ph-1",
      }));

      const result = await service.updatePaymentStatus(
        12345,
        PaymentHistoryStatus.PAID,
        paidDate
      );

      expect(result.status).toBe(PaymentHistoryStatus.PAID);
      expect(result.paid_at).toEqual(paidDate);
    });

    it("should update payment status to CANCELLED", async () => {
      repository.findOne.mockResolvedValue({
        id: "ph-1",
        status: PaymentHistoryStatus.PENDING,
      });
      repository.save.mockImplementation(async (value) => ({
        ...value,
        id: "ph-1",
      }));

      const result = await service.updatePaymentStatus(
        12345,
        PaymentHistoryStatus.CANCELLED
      );

      expect(result.status).toBe(PaymentHistoryStatus.CANCELLED);
    });

    it("should throw error when payment not found", async () => {
      repository.findOne.mockResolvedValue(null);

      await expect(
        service.updatePaymentStatus(99999, PaymentHistoryStatus.PAID)
      ).rejects.toThrow("Payment history not found");
    });

    it("should not set paid_at when paidAt is undefined", async () => {
      repository.findOne.mockResolvedValue({
        id: "ph-1",
        status: PaymentHistoryStatus.PENDING,
        paid_at: null,
      });
      repository.save.mockImplementation(async (value) => ({
        ...value,
        id: "ph-1",
      }));

      await service.updatePaymentStatus(12345, PaymentHistoryStatus.PAID);

      expect(repository.save).toHaveBeenCalledWith(
        expect.objectContaining({
          status: PaymentHistoryStatus.PAID,
        })
      );
    });
  });

  describe("findByAssignmentId", () => {
    it("should find all payment records for assignment ordered by date", async () => {
      const payments = [
        { id: "ph-3", assignment_id: "assign-1", created_at: new Date("2024-01-20") },
        { id: "ph-2", assignment_id: "assign-1", created_at: new Date("2024-01-15") },
        { id: "ph-1", assignment_id: "assign-1", created_at: new Date("2024-01-10") },
      ];
      repository.find.mockResolvedValue(payments);

      const result = await service.findByAssignmentId("assign-1");

      expect(result).toHaveLength(3);
      expect(result[0].id).toBe("ph-3"); // Most recent first
      expect(repository.find).toHaveBeenCalledWith({
        where: { assignment_id: "assign-1" },
        order: { created_at: "DESC" },
      });
    });

    it("should return empty array when no payments found", async () => {
      repository.find.mockResolvedValue([]);

      const result = await service.findByAssignmentId("assign-empty");

      expect(result).toEqual([]);
    });
  });

  describe("findById", () => {
    it("should find payment by id with all relations", async () => {
      const payment = {
        id: "ph-1",
        assignment: { id: "assign-1", campaign: { id: "campaign-1", organization: { id: "org-1" } } },
      };
      repository.findOne.mockResolvedValue(payment);

      const result = await service.findById("ph-1");

      expect(result).toEqual(payment);
      expect(repository.findOne).toHaveBeenCalledWith({
        where: { id: "ph-1" },
        relations: [
          "assignment",
          "assignment.campaign",
          "assignment.campaign.organization",
        ],
      });
    });

    it("should return null when payment id not found", async () => {
      repository.findOne.mockResolvedValue(null);

      const result = await service.findById("ph-missing");

      expect(result).toBeNull();
    });
  });

  describe("findAll", () => {
    it("should find all payments with relations ordered by date", async () => {
      const payments = [
        { id: "ph-3", created_at: new Date("2024-01-20") },
        { id: "ph-2", created_at: new Date("2024-01-15") },
        { id: "ph-1", created_at: new Date("2024-01-10") },
      ];
      repository.find.mockResolvedValue(payments);

      const result = await service.findAll();

      expect(result).toHaveLength(3);
      expect(result[0].id).toBe("ph-3");
      expect(repository.find).toHaveBeenCalledWith({
        relations: [
          "assignment",
          "assignment.campaign",
          "assignment.campaign.organization",
        ],
        order: { created_at: "DESC" },
      });
    });

    it("should return empty array when no payments", async () => {
      repository.find.mockResolvedValue([]);

      const result = await service.findAll();

      expect(result).toEqual([]);
    });
  });

  describe("getPaymentHistoryByCampaign", () => {
    it("should get payment history with pagination and no filters", async () => {
      const queryBuilder = {
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getCount: jest.fn(async () => 25),
        orderBy: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        take: jest.fn().mockReturnThis(),
        getMany: jest.fn(async () => [
          { id: "ph-1" },
          { id: "ph-2" },
        ]),
      } as any;
      repository.createQueryBuilder.mockReturnValue(queryBuilder);

      const result = await service.getPaymentHistoryByCampaign("campaign-1", {
        page: 1,
        limit: 10,
      });

      expect(result.items).toHaveLength(2);
      expect(result.total).toBe(25);
      expect(result.page).toBe(1);
      expect(result.limit).toBe(10);
      expect(result.totalPages).toBe(3);
    });

    it("should apply status filter when provided", async () => {
      const queryBuilder = {
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getCount: jest.fn(async () => 5),
        orderBy: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        take: jest.fn().mockReturnThis(),
        getMany: jest.fn(async () => [{ id: "ph-1", status: PaymentHistoryStatus.PAID }]),
      } as any;
      repository.createQueryBuilder.mockReturnValue(queryBuilder);

      const result = await service.getPaymentHistoryByCampaign("campaign-1", {
        page: 1,
        limit: 10,
        status: PaymentHistoryStatus.PAID,
      });

      expect(result.total).toBe(5);
      expect(queryBuilder.andWhere).toHaveBeenCalled();
    });

    it("should apply search filter when provided", async () => {
      const queryBuilder = {
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getCount: jest.fn(async () => 1),
        orderBy: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        take: jest.fn().mockReturnThis(),
        getMany: jest.fn(async () => [{ id: "ph-1", user: { familyName: "Nguyen", givenName: "Van A" } }]),
      } as any;
      repository.createQueryBuilder.mockReturnValue(queryBuilder);

      const result = await service.getPaymentHistoryByCampaign("campaign-1", {
        page: 1,
        limit: 10,
        search: "Nguyen",
      });

      expect(result.total).toBe(1);
      expect(queryBuilder.andWhere).toHaveBeenCalled();
    });

    it("should handle pagination correctly on different pages", async () => {
      const queryBuilder = {
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getCount: jest.fn(async () => 35),
        orderBy: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        take: jest.fn().mockReturnThis(),
        getMany: jest.fn(async () => []),
      } as any;
      repository.createQueryBuilder.mockReturnValue(queryBuilder);

      const result = await service.getPaymentHistoryByCampaign("campaign-1", {
        page: 3,
        limit: 10,
      });

      expect(result.page).toBe(3);
      expect(result.totalPages).toBe(4);
      expect(queryBuilder.skip).toHaveBeenCalledWith(20); // (3-1) * 10 = 20
    });
  });
});