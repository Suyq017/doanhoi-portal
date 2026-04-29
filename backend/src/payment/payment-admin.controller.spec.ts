import { PaymentAdminController } from "./payment-admin.controller";

describe("PaymentAdminController", () => {
  const paymentHistoryService = {
    getPaymentHistoryByCampaign: jest.fn(),
    findByOrderCode: jest.fn(),
  };
  const paymentAssignmentService = {
    markAsPaid: jest.fn(),
    canDelete: jest.fn(),
  };

  let controller: PaymentAdminController;

  beforeEach(() => {
    jest.clearAllMocks();
    controller = new PaymentAdminController(paymentHistoryService as never, paymentAssignmentService as never);
    jest.spyOn(console, "error").mockImplementation(() => undefined);
  });

  it("covers payment history pagination and validation branches", async () => {
    paymentHistoryService.getPaymentHistoryByCampaign.mockResolvedValue({ data: [] });

    await expect(controller.getPaymentHistory("camp-1", "2", "20", " search ", "all")).resolves.toEqual({ success: true, data: { data: [] } });
    expect(paymentHistoryService.getPaymentHistoryByCampaign).toHaveBeenCalledWith("camp-1", {
      page: 2,
      limit: 20,
      search: "search",
      status: undefined,
    });

    await expect(controller.getPaymentHistory("camp-1", "0")).rejects.toThrow("Invalid page number");
    await expect(controller.getPaymentHistory("camp-1", "1", "101")).rejects.toThrow("Invalid limit (must be 1-100)");
  });

  it("covers sync and delete-check flows", async () => {
    paymentHistoryService.findByOrderCode.mockResolvedValue({ status: "PAID", paid_at: new Date("2024-01-01"), assignment_id: "a1", assignment: { status: "PENDING", paidAt: null } });
    paymentAssignmentService.markAsPaid.mockResolvedValue(undefined);
    paymentAssignmentService.canDelete.mockResolvedValue({ canDelete: true });

    await expect(controller.syncAssignmentStatus("123")).resolves.toEqual(expect.objectContaining({ success: true, data: expect.objectContaining({ assignmentId: "a1" }) }));
    await expect(controller.checkSyncStatus("123")).resolves.toEqual(expect.objectContaining({ success: true }));
    await expect(controller.checkCanDeleteAssignment("a1")).resolves.toEqual({ success: true, data: { canDelete: true } });

    paymentHistoryService.findByOrderCode.mockResolvedValue(null);
    await expect(controller.syncAssignmentStatus("123")).rejects.toThrow("Payment history not found");
    await expect(controller.checkSyncStatus("abc")).rejects.toThrow("Invalid Order Code");
  });

  // ===== NEW DETAILED TESTS BELOW =====

  it("should throw BAD_REQUEST for non-numeric page parameter", async () => {
    await expect(controller.getPaymentHistory("camp-1", "invalid-page")).rejects.toThrow("Invalid page number");
  });

  it("should throw BAD_REQUEST for page < 1", async () => {
    await expect(controller.getPaymentHistory("camp-1", "-5")).rejects.toThrow("Invalid page number");
  });

  it("should throw BAD_REQUEST for non-numeric limit parameter", async () => {
    await expect(controller.getPaymentHistory("camp-1", "1", "invalid-limit")).rejects.toThrow("Invalid limit");
  });

  it("should throw BAD_REQUEST for limit < 1", async () => {
    await expect(controller.getPaymentHistory("camp-1", "1", "0")).rejects.toThrow("Invalid limit");
  });

  it("should throw BAD_REQUEST for limit > 100", async () => {
    await expect(controller.getPaymentHistory("camp-1", "1", "101")).rejects.toThrow("Invalid limit (must be 1-100)");
  });

  it("should pass specific status filter when not 'all'", async () => {
    paymentHistoryService.getPaymentHistoryByCampaign.mockResolvedValue({ data: [] });

    await controller.getPaymentHistory("camp-1", "1", "10", "search", "PENDING");

    expect(paymentHistoryService.getPaymentHistoryByCampaign).toHaveBeenCalledWith("camp-1", {
      page: 1,
      limit: 10,
      search: "search",
      status: "PENDING",
    });
  });

  it("should handle error in getPaymentHistory", async () => {
    paymentHistoryService.getPaymentHistoryByCampaign.mockRejectedValue(new Error("DB connection error"));

    await expect(controller.getPaymentHistory("camp-1", "1", "10")).rejects.toThrow("DB connection error");
  });

  it("should throw error when syncAssignmentStatus gets invalid order code", async () => {
    await expect(controller.syncAssignmentStatus("not-a-number")).rejects.toThrow("Invalid Order Code");
  });

  it("should return not-synced message when payment is not PAID", async () => {
    paymentHistoryService.findByOrderCode.mockResolvedValue({
      status: "PENDING",
      paid_at: null,
      assignment_id: "a1",
    });

    const result = await controller.syncAssignmentStatus("123");

    expect(result.success).toBe(false);
    expect(result.message).toContain("not in PAID status");
  });

  it("should return not-synced when paid_at is null despite PAID status", async () => {
    paymentHistoryService.findByOrderCode.mockResolvedValue({
      status: "PAID",
      paid_at: null, // no paid date
      assignment_id: "a1",
    });

    const result = await controller.syncAssignmentStatus("123");

    expect(result.success).toBe(false);
  });

  it("should handle error in syncAssignmentStatus service call", async () => {
    paymentHistoryService.findByOrderCode.mockResolvedValue({
      status: "PAID",
      paid_at: new Date(),
      assignment_id: "a1",
    });
    paymentAssignmentService.markAsPaid.mockRejectedValue(new Error("Service error"));

    await expect(controller.syncAssignmentStatus("123")).rejects.toThrow("Service error");
  });

  it("should handle missing assignment in checkSyncStatus", async () => {
    paymentHistoryService.findByOrderCode.mockResolvedValue({
      status: "PAID",
      paid_at: new Date(),
      assignment_id: "a1",
      assignment: null, // missing
    });

    const result = await controller.checkSyncStatus("123");

      expect(result.data.assignment.status).toBeUndefined();
      expect(result.data.assignment.paidAt).toBeUndefined();
  });

  it("should return isInSync true when payment is not PAID", async () => {
    paymentHistoryService.findByOrderCode.mockResolvedValue({
      status: "CANCELLED",
      paid_at: null,
      assignment_id: "a1",
      assignment: { status: "PENDING", paidAt: null },
    });

    const result = await controller.checkSyncStatus("123");

    expect(result.data.isInSync).toBe(true);
  });

  it("should return isInSync false when payment PAID but assignment not PAID", async () => {
    paymentHistoryService.findByOrderCode.mockResolvedValue({
      status: "PAID",
      paid_at: new Date(),
      assignment_id: "a1",
      assignment: { status: "PENDING", paidAt: null },
    });

    const result = await controller.checkSyncStatus("123");

    expect(result.data.isInSync).toBe(false);
  });

  it("should handle error in checkSyncStatus", async () => {
    paymentHistoryService.findByOrderCode.mockRejectedValue(new Error("Query error"));

    await expect(controller.checkSyncStatus("123")).rejects.toThrow("Query error");
  });

  it("should handle error in checkCanDeleteAssignment", async () => {
    paymentAssignmentService.canDelete.mockRejectedValue(new Error("Delete check error"));

    await expect(controller.checkCanDeleteAssignment("a1")).rejects.toThrow("Delete check error");
  });
});