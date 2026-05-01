import { HttpException, HttpStatus } from "@nestjs/common";
import { beforeEach, describe, expect, it, jest } from "@jest/globals";
import { ExportController } from "../export.controller";

const createResponseMock = () => ({
  setHeader: jest.fn(),
  send: jest.fn(),
});

describe("ExportController", () => {
  let exportService: any;
  let controller: ExportController;

  beforeEach(() => {
    exportService = {
      exportUsers: jest.fn(),
      exportOrganizationMembers: jest.fn(),
      exportPaymentAssignments: jest.fn(),
      generateFileName: jest.fn(),
    };
    controller = new ExportController(exportService as never);
  });

  it("exports users and writes the excel response headers", async () => {
    const buffer = Buffer.from("users-report");
    const res = createResponseMock();
    exportService.exportUsers.mockResolvedValue(buffer);
    exportService.generateFileName.mockReturnValue("danh_sach_nguoi_dung_2026-04-29.xlsx");

    await controller.exportUsers({ fields: ["code"], format: "xlsx" } as never, res as never);

    expect(exportService.exportUsers).toHaveBeenCalledWith({ fields: ["code"], format: "xlsx" });
    expect(exportService.generateFileName).toHaveBeenCalledWith("danh_sach_nguoi_dung");
    expect(res.setHeader).toHaveBeenCalledWith(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    );
    expect(res.setHeader).toHaveBeenCalledWith(
      "Content-Disposition",
      'attachment; filename="danh_sach_nguoi_dung_2026-04-29.xlsx"',
    );
    expect(res.setHeader).toHaveBeenCalledWith("Content-Length", buffer.length);
    expect(res.send).toHaveBeenCalledWith(buffer);
  });

  it("wraps export users errors as bad request", async () => {
    const res = createResponseMock();
    exportService.exportUsers.mockRejectedValue(new Error("boom"));

    await expect(
      controller.exportUsers({ fields: ["code"], format: "xlsx" } as never, res as never),
    ).rejects.toBeInstanceOf(HttpException);

    try {
      await controller.exportUsers({ fields: ["code"], format: "xlsx" } as never, res as never);
    } catch (error) {
      const exception = error as HttpException;
      expect(exception.getStatus()).toBe(HttpStatus.BAD_REQUEST);
      expect(exception.getResponse()).toEqual({
        success: false,
        error: "boom",
      });
    }
  });

  it("returns not found when organization export reports a missing organization", async () => {
    const res = createResponseMock();
    exportService.exportOrganizationMembers.mockRejectedValue(new Error("Không tìm thấy tổ chức"));

    try {
      await controller.exportOrganizationMembers(
        "org-1",
        { fields: ["memberCode"], format: "xlsx" } as never,
        res as never,
      );
      throw new Error("Expected HttpException to be thrown");
    } catch (error) {
      const exception = error as HttpException;
      expect(exception.getStatus()).toBe(HttpStatus.NOT_FOUND);
      expect(exception.getResponse()).toEqual({
        success: false,
        error: "Không tìm thấy tổ chức",
      });
    }
  });

  it("returns bad request for payment assignment export errors that are not missing data", async () => {
    const res = createResponseMock();
    exportService.exportPaymentAssignments.mockRejectedValue(new Error("invalid request"));

    try {
      await controller.exportPaymentAssignments(
        "camp-1",
        { fields: ["memberCode"], format: "xlsx" } as never,
        res as never,
      );
      throw new Error("Expected HttpException to be thrown");
    } catch (error) {
      const exception = error as HttpException;
      expect(exception.getStatus()).toBe(HttpStatus.BAD_REQUEST);
      expect(exception.getResponse()).toEqual({
        success: false,
        error: "invalid request",
      });
    }
  });
});
