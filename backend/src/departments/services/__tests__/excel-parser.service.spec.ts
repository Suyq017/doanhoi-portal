import { BadRequestException } from "@nestjs/common";
import { describe, expect, it } from "@jest/globals";
import * as XLSX from "xlsx";
import { ExcelParserService } from "../excel-parser.service";

describe("departments ExcelParserService", () => {
  const service = new ExcelParserService();

  it("should parse valid department rows", async () => {
    const ws = XLSX.utils.aoa_to_sheet([
      ["Tên đơn vị", "Mã đơn vị", "Mô tả"],
      ["Phong CNTT", "CNTT", "Mo ta"],
    ]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Departments");
    const buffer = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });

    const parsed = await service.parseExcelFile(buffer);

    expect(parsed).toHaveLength(1);
    expect(parsed[0].name).toBe("Phong CNTT");
    expect(parsed[0].code).toBe("CNTT");
    expect(parsed[0].isActive).toBe(true);
  });

  it("should throw if required header is missing", async () => {
    const ws = XLSX.utils.aoa_to_sheet([
      ["Mã đơn vị", "Mô tả"],
      ["CNTT", "Mo ta"],
    ]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Departments");
    const buffer = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });

    await expect(service.parseExcelFile(buffer)).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });

  it("should generate a template workbook", async () => {
    const template = await service.generateTemplate();
    const wb = XLSX.read(template, { type: "buffer" });
    const ws = wb.Sheets[wb.SheetNames[0]];
    const data = XLSX.utils.sheet_to_json(ws, { header: 1 });

    expect(data.length).toBeGreaterThan(1);
    expect((data[0] as string[])[0]).toBe("Tên đơn vị");
  });
});