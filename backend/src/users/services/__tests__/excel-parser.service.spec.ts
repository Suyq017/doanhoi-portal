import { describe, expect, it } from "@jest/globals";
import * as XLSX from "xlsx";
import { ExcelParserService } from "../excel-parser.service";

describe("users ExcelParserService", () => {
  const service = new ExcelParserService();

  it("should parse valid workbook and normalize mapped values", async () => {
    const rows = [
      [
        "Mã số sinh viên",
        "Email",
        "CMND",
        "Họ",
        "Tên",
        "Ngày sinh",
        "Giới tính",
        "Mật khẩu",
        "Điện thoại",
        "Năm vào",
        "Năm CTDT",
        "Tên lớp",
        "Mã khoa",
        "Mã đơn vị quản lý",
        "Hệ đào tạo",
        "Bậc đào tạo",
        "Loại người dùng",
        "Tình trạng thành viên",
      ],
      [
        "SV001",
        "*",
        "123456789",
        "Nguyen",
        "An",
        "01/02/2000",
        "Nam",
        "pass",
        "0909",
        "2022",
        "2022",
        "L01",
        "CNTT",
        "K.CNTT",
        "CQ",
        "DH",
        "sinh_vien",
        "doan_vien",
      ],
    ];

    const ws = XLSX.utils.aoa_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Users");
    const buffer = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });

    const parsed = await service.parseExcelFile(buffer);

    expect(parsed).toHaveLength(1);
    expect(parsed[0].code).toBe("SV001");
    expect(parsed[0].email).toBeNull();
    expect(parsed[0].userType).toBe("student");
    expect(parsed[0].membershipStatus).toBe("doan_vien");
    expect(parsed[0].birthDate).toBeInstanceOf(Date);
  });

  it("should reject workbook without data rows", async () => {
    const ws = XLSX.utils.aoa_to_sheet([["Mã số", "Email"]]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Users");
    const buffer = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });

    await expect(service.parseExcelFile(buffer)).rejects.toThrow(
      "Excel file must contain header row",
    );
  });

  it("should generate non-empty template", async () => {
    const template = await service.generateTemplate();
    expect(template.length).toBeGreaterThan(0);
  });
});