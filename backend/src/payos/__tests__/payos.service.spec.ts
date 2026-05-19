import { beforeEach, describe, expect, it, jest } from "@jest/globals";
import { SimplePayosService } from "../payos.service";

const mockPayOSInstance = {
  createPaymentLink: jest.fn(),
  getPaymentLinkInformation: jest.fn(),
};

jest.mock("@payos/node", () => {
  return jest.fn().mockImplementation(() => mockPayOSInstance);
});

describe("SimplePayosService", () => {
  const createPayosConfigServiceMock = () => ({
    getEffectiveConfig: jest.fn() as any,
  });

  const createPaymentHistoryServiceMock = () => ({
    findByOrderCode: jest.fn() as any,
    updatePaymentStatus: jest.fn() as any,
  });

  const createPaymentAssignmentServiceMock = () => ({
    markAsPaid: jest.fn() as any,
  });

  let payosConfigService: ReturnType<typeof createPayosConfigServiceMock>;
  let paymentHistoryService: ReturnType<typeof createPaymentHistoryServiceMock>;
  let paymentAssignmentService: ReturnType<typeof createPaymentAssignmentServiceMock>;
  let service: SimplePayosService;

  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(console, "error").mockImplementation(() => undefined);
    payosConfigService = createPayosConfigServiceMock();
    paymentHistoryService = createPaymentHistoryServiceMock();
    paymentAssignmentService = createPaymentAssignmentServiceMock();
    service = new SimplePayosService(
      payosConfigService as never,
      paymentHistoryService as never,
      paymentAssignmentService as never,
    );
  });

  it("should create a payment link using campaign config", async () => {
    payosConfigService.getEffectiveConfig.mockResolvedValue({
      clientId: "client",
      apiKey: "api",
      checksumKey: "checksum",
    });
    mockPayOSInstance.createPaymentLink.mockImplementation(async () => ({ checkoutUrl: "https://payos.test" }));

    const result = await service.createPaymentLink({ campaignId: "camp-1", amount: 1000 } as any);

    expect(result.checkoutUrl).toBe("https://payos.test");
    expect(mockPayOSInstance.createPaymentLink).toHaveBeenCalledWith({ amount: 1000 });
  });

  it("should update payment history and assignment when link becomes paid", async () => {
    payosConfigService.getEffectiveConfig.mockResolvedValue({
      clientId: "client",
      apiKey: "api",
      checksumKey: "checksum",
    });
    mockPayOSInstance.getPaymentLinkInformation.mockImplementation(async () => ({
      status: "PAID",
      transactions: [{ transactionDateTime: "2026-04-27T10:00:00.000Z" }],
    }));
    paymentHistoryService.findByOrderCode.mockResolvedValue({
      id: "history-1",
      assignment_id: "assign-1",
      status: "PENDING",
    });

    const result = await service.getPaymentLinkInformation(123456, "camp-1");

    expect(result.success).toBe(true);
    expect(paymentAssignmentService.markAsPaid).toHaveBeenCalledWith("assign-1", true);
    expect(paymentHistoryService.updatePaymentStatus).toHaveBeenCalled();
  });

  it("should return failure response when history is missing", async () => {
    payosConfigService.getEffectiveConfig.mockResolvedValue({
      clientId: "client",
      apiKey: "api",
      checksumKey: "checksum",
    });
    mockPayOSInstance.getPaymentLinkInformation.mockImplementation(async () => ({ status: "PAID", transactions: [] }));
    paymentHistoryService.findByOrderCode.mockResolvedValue(null);

    const result = await service.getPaymentLinkInformation(123456, "camp-1");

    expect(result.success).toBe(false);
    expect(result.message).toContain("Payment history not found");
  });
});