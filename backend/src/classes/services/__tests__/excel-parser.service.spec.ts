import { BadRequestException } from "@nestjs/common";
import { describe, expect, it } from "@jest/globals";
import * as XLSX from "xlsx";
import { ExcelParserService } from "../excel-parser.service";

describe("Classes ExcelParserService", () => {
  const service = new ExcelParserService();

  it("should parse valid class rows", async () => {
    const ws = XLSX.utils.aoa_to_sheet([
      ["Tên lớp", "Năm học", "Mã đơn vị"],
      ["KTPM01", "2024", "CNTT"],
    ]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Classes");
    const buffer = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });

    const parsed = await service.parseExcelFile(buffer);
    expect(parsed).toHaveLength(1);
    expect(parsed[0].name).toBe("KTPM01");
    expect(parsed[0].year).toBe(2024);
    expect(parsed[0].departmentCode).toBe("CNTT");
  });

  it("should throw on missing required header", async () => {
    const ws = XLSX.utils.aoa_to_sheet([
      ["Năm học", "Mã đơn vị"],
      ["2024", "CNTT"],
    ]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Classes");
    const buffer = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });

    await expect(service.parseExcelFile(buffer)).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });

  it("should parse invalid year as undefined", async () => {
    const ws = XLSX.utils.aoa_to_sheet([
      ["Tên lớp", "Năm học", "Mã đơn vị"],
      ["KTPM02", "1900", "CNTT"],
    ]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Classes");
    const buffer = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });

    const parsed = await service.parseExcelFile(buffer);
    expect(parsed[0].year).toBeUndefined();
  });

  it("should generate template workbook", async () => {
    const template = await service.generateTemplate();
    const wb = XLSX.read(template, { type: "buffer" });
    const ws = wb.Sheets[wb.SheetNames[0]];
    const data = XLSX.utils.sheet_to_json(ws, { header: 1 });

    expect(data.length).toBeGreaterThan(1);
    expect((data[0] as string[])[0]).toBe("Tên lớp");
  });
});