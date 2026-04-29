import { BadRequestException } from "@nestjs/common";
import { describe, expect, it } from "@jest/globals";
import * as XLSX from "xlsx";
import { OrganizationExcelParserService } from "../excel-parser.service";

describe("OrganizationExcelParserService", () => {
  const service = new OrganizationExcelParserService();

  it("should parse level 2 template data", async () => {
    const ws = XLSX.utils.aoa_to_sheet([
      ["Mã số sinh viên", "Mã lớp/đơn vị"],
      ["2052001", "KTPM01"],
    ]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Members");
    const buffer = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });

    const result = await service.parseExcelFile(buffer, 2);
    expect(result).toHaveLength(1);
    expect(result[0].studentCode).toBe("2052001");
    expect(result[0].classOrUnitCode).toBe("KTPM01");
  });

  it("should reject level 2 headers without class/unit column", async () => {
    const ws = XLSX.utils.aoa_to_sheet([
      ["Mã số sinh viên"],
      ["2052001"],
    ]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Members");
    const buffer = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });

    await expect(service.parseExcelFile(buffer, 2)).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });

  it("should generate template for both levels", () => {
    const lv2 = service.generateTemplate(2);
    const lv3 = service.generateTemplate(3);

    expect(lv2.length).toBeGreaterThan(0);
    expect(lv3.length).toBeGreaterThan(0);
  });

  it("should reject invalid template level", () => {
    expect(() => service.generateTemplate(1)).toThrow(BadRequestException);
  });
});