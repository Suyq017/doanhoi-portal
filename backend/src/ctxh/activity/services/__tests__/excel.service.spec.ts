import { BadRequestException } from "@nestjs/common";
import { beforeEach, describe, expect, it, jest } from "@jest/globals";
import * as XLSX from "xlsx";
import { ExcelService } from "../excel.service";

describe("CTXH ExcelService", () => {
  const createUserRepoMock = () => ({
    findOne: jest.fn() as any,
  });

  const createParticipationServiceMock = () => ({
    findByActivity: jest.fn() as any,
  });

  let userRepository: any;
  let participationService: any;
  let service: ExcelService;

  beforeEach(() => {
    userRepository = createUserRepoMock();
    participationService = createParticipationServiceMock();
    service = new ExcelService(
      userRepository as never,
      {} as never,
      participationService as never,
    );
  });

  const createExcelBuffer = (rows: any[][]) => {
    const ws = XLSX.utils.aoa_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Participants");
    return XLSX.write(wb, { type: "buffer", bookType: "xlsx" });
  };

  it("should parse participants excel and return unique student codes", async () => {
    const file = {
      buffer: createExcelBuffer([
        ["Mã số sinh viên"],
        ["2150001"],
        ["2150002"],
      ]),
    } as never;

    const result = await service.processParticipantsExcel(file);
    expect(result).toEqual(["2150001", "2150002"]);
  });

  it("should reject duplicate student codes", async () => {
    const file = {
      buffer: createExcelBuffer([
        ["Mã số sinh viên"],
        ["2150001"],
        ["2150001"],
      ]),
    } as never;

    await expect(service.processParticipantsExcel(file)).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });

  it("should reject invalid student code format", async () => {
    const file = {
      buffer: createExcelBuffer([
        ["Mã số sinh viên"],
        ["SV001"],
      ]),
    } as never;

    await expect(service.processParticipantsExcel(file)).rejects.toThrow(
      "phải là số",
    );
  });

  it("should validate student codes against repository", async () => {
    userRepository.findOne
      .mockResolvedValueOnce({ id: "u1", code: "2150001" })
      .mockResolvedValueOnce(null);

    const result = await service.validateStudentCodes(["2150001", "2150999"]);

    expect(result.validUsers).toHaveLength(1);
    expect(result.invalidCodes).toEqual(["2150999"]);
  });

  it("should generate participants template", async () => {
    const buffer = await service.generateParticipantsTemplate();
    expect(buffer.length).toBeGreaterThan(0);
  });

  it("should reject participants excel when student-code header is missing", async () => {
    const file = {
      buffer: createExcelBuffer([
        ["Email"],
        ["a@test.com"],
      ]),
    } as never;

    await expect(service.processParticipantsExcel(file)).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });

  it("should parse grading excel and mark non-participant rows with errors", async () => {
    participationService.findByActivity.mockResolvedValue([
      { student_code: "2150001" },
    ]);

    const file = {
      buffer: createExcelBuffer([
        ["Mã số sinh viên", "Số ngày CTXH", "Ghi chú"],
        ["2150001", "3", "ok"],
        ["2150999", "2", "not joined"],
      ]),
    } as never;

    const result = await service.processGradingExcel(file, 10, "a1");

    expect(result).toHaveLength(2);
    expect(result[0].errors).toBeUndefined();
    expect(result[1].errors?.[0]).toContain("không tham gia hoạt động");
  });

  it("should reject grading excel when required columns are missing", async () => {
    participationService.findByActivity.mockResolvedValue([]);

    const file = {
      buffer: createExcelBuffer([
        ["Mã số sinh viên", "Ghi chú"],
        ["2150001", "note"],
      ]),
    } as never;

    await expect(service.processGradingExcel(file, 10, "a1")).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });

  it("should flag grading row when actual days exceeds max", async () => {
    participationService.findByActivity.mockResolvedValue([
      { student_code: "2150001" },
    ]);

    const file = {
      buffer: createExcelBuffer([
        ["Mã số sinh viên", "Số ngày CTXH", "Ghi chú"],
        ["2150001", "20", "too high"],
      ]),
    } as never;

    const result = await service.processGradingExcel(file, 10, "a1");
    expect(result[0].errors?.[0]).toContain("vượt quá giới hạn");
  });

  it("should keep row with blank actual days as 0", async () => {
    participationService.findByActivity.mockResolvedValue([
      { student_code: "2150001" },
    ]);

    const file = {
      buffer: createExcelBuffer([
        ["Mã số sinh viên", "Số ngày CTXH", "Ghi chú"],
        ["2150001", "", "no update"],
      ]),
    } as never;

    const result = await service.processGradingExcel(file, 10, "a1");
    expect(result[0].actualDays).toBe(0);
    expect(result[0].errors).toBeUndefined();
  });

  it("should generate grading template buffer", async () => {
    const buffer = await service.generateGradingTemplate(
      { id: "a1", name: "CTXH A" },
      [
        { student_code: "2150001", status: "REGISTERED", student: { full_name: "A" } },
        { student_code: "2150002", status: "CANCELLED", student: { full_name: "B" } },
      ],
    );

    expect(buffer.length).toBeGreaterThan(0);
  });

  it("should generate export participants buffer", async () => {
    const buffer = await service.exportParticipants(
      { id: "a1", name: "CTXH A" },
      [
        { student_code: "2150001", status: "REGISTERED", actual_days: null, note: "" },
        { student_code: "2150002", status: "COMPLETED", actual_days: 2, note: "good" },
      ],
    );

    expect(buffer.length).toBeGreaterThan(0);
  });
});