import { PaymentAssignmentController } from "./payment-assignment.controller";

describe("PaymentAssignmentController", () => {
  const assignmentService = {
    createBulk: jest.fn(),
    getStatistics: jest.fn(),
    checkOverdueAssignments: jest.fn(),
    findAll: jest.fn(),
    findOne: jest.fn(),
    update: jest.fn(),
    markAsPaid: jest.fn(),
    markAsOverdue: jest.fn(),
    remove: jest.fn(),
  };

  let controller: PaymentAssignmentController;

  beforeEach(() => {
    jest.clearAllMocks();
    controller = new PaymentAssignmentController(assignmentService as never);
    jest.spyOn(console, "log").mockImplementation(() => undefined);
  });

  it("covers bulk creation, stats, listing, and lookup", async () => {
    assignmentService.createBulk.mockResolvedValue([{ id: "a1" }]);
    assignmentService.getStatistics.mockResolvedValue({ total: 1 });
    assignmentService.checkOverdueAssignments.mockResolvedValue(0);
    assignmentService.findAll.mockResolvedValue({ items: [] });
    assignmentService.findOne.mockResolvedValue({ id: "a1" });

    await expect(controller.createBulk({ assignments: [{ userId: "u1" }], userId: "admin" } as any)).resolves.toEqual({ success: true, message: "Created 1 payment assignments", data: [{ id: "a1" }] });
    await expect(controller.getStatistics("camp-1", "org-1")).resolves.toEqual({ success: true, data: { total: 1 } });
    await expect(controller.findAll("camp-1", "u1", "PENDING" as any, "2", "5")).resolves.toEqual({ success: true, data: { items: [] } });
    await expect(controller.findOne("a1")).resolves.toEqual({ success: true, data: { id: "a1" } });
    expect(assignmentService.checkOverdueAssignments).toHaveBeenCalled();
    expect(assignmentService.findAll).toHaveBeenCalledWith("camp-1", "u1", "PENDING", 2, 5);
  });

  it("covers update, paid/overdue, delete, and overdue check flows", async () => {
    assignmentService.update.mockResolvedValue({ id: "a1" });
    assignmentService.markAsPaid.mockResolvedValue({ id: "a1", status: "PAID" });
    assignmentService.markAsOverdue.mockResolvedValue({ id: "a1", status: "OVERDUE" });
    assignmentService.remove.mockResolvedValue(undefined);
    assignmentService.checkOverdueAssignments.mockResolvedValue(3);

    await expect(controller.update("a1", { note: "x" } as any)).resolves.toEqual({ success: true, message: "Payment assignment updated successfully", data: { id: "a1" } });
    await expect(controller.markAsPaid("a1")).resolves.toEqual({ success: true, message: "Assignment marked as paid", data: { id: "a1", status: "PAID" } });
    await expect(controller.markAsOverdue("a1")).resolves.toEqual({ success: true, message: "Assignment marked as overdue", data: { id: "a1", status: "OVERDUE" } });
    await expect(controller.remove("a1")).resolves.toEqual({ success: true, message: "Payment assignment deleted successfully" });
    await expect(controller.checkOverdue()).resolves.toEqual({ success: true, message: "Updated 3 assignments to overdue status", data: { updatedCount: 3 } });
  });

  it("should handle service error in createBulk", async () => {
    assignmentService.createBulk.mockRejectedValue(new Error("DB error"));

    await expect(
      controller.createBulk({ assignments: [{ userId: "u1" }], userId: "admin" } as any),
    ).rejects.toThrow("DB error");
  });

  it("should handle empty assignments array in createBulk", async () => {
    assignmentService.createBulk.mockResolvedValue([]);

    const result = await controller.createBulk({ assignments: [], userId: "admin" } as any);

    expect(result.success).toBe(true);
    expect(result.data).toEqual([]);
  });

  it("should call getStatistics with only campaignId", async () => {
    assignmentService.getStatistics.mockResolvedValue({ total: 5 });

    const result = await controller.getStatistics("camp-1");

    expect(assignmentService.getStatistics).toHaveBeenCalledWith("camp-1", undefined);
    expect(result.data.total).toBe(5);
  });

  it("should default pagination to page 1 and limit 10", async () => {
    assignmentService.checkOverdueAssignments.mockResolvedValue(0);
    assignmentService.findAll.mockResolvedValue({ data: [] });

    await controller.findAll();

    expect(assignmentService.findAll).toHaveBeenCalledWith(undefined, undefined, undefined, 1, 10);
  });

  it("should parse pagination params from strings", async () => {
    assignmentService.checkOverdueAssignments.mockResolvedValue(0);
    assignmentService.findAll.mockResolvedValue({ data: [] });

    await controller.findAll("camp-1", "user-1", "PAID" as any, "3", "25");

    expect(assignmentService.findAll).toHaveBeenCalledWith("camp-1", "user-1", "PAID", 3, 25);
  });

  it("should handle service error in findOne", async () => {
    assignmentService.findOne.mockRejectedValue(new Error("Not found"));

    await expect(controller.findOne("missing-id")).rejects.toThrow("Not found");
  });

  it("should handle service error in update", async () => {
    assignmentService.update.mockRejectedValue(new Error("Update failed"));

    await expect(controller.update("a1", {} as any)).rejects.toThrow("Update failed");
  });

  it("should handle service error in markAsPaid", async () => {
    assignmentService.markAsPaid.mockRejectedValue(new Error("Mark failed"));

    await expect(controller.markAsPaid("a1")).rejects.toThrow("Mark failed");
  });

  it("should handle service error in markAsOverdue", async () => {
    assignmentService.markAsOverdue.mockRejectedValue(new Error("Mark failed"));

    await expect(controller.markAsOverdue("a1")).rejects.toThrow("Mark failed");
  });

  it("should handle service error in remove", async () => {
    assignmentService.remove.mockRejectedValue(new Error("Delete failed"));

    await expect(controller.remove("a1")).rejects.toThrow("Delete failed");
  });

  it("should handle service error in checkOverdue", async () => {
    assignmentService.checkOverdueAssignments.mockRejectedValue(new Error("Check failed"));

    await expect(controller.checkOverdue()).rejects.toThrow("Check failed");
  });
});