import { Injectable, BadRequestException } from "@nestjs/common";
import * as XLSX from "xlsx";

export interface DepartmentImportData {
  name: string;
  code?: string;
  description?: string;
  isActive?: boolean;
  _rowIndex?: number;
}

@Injectable()
export class ExcelParserService {
  private readonly expectedHeaders = ["tên đơn vị", "mã đơn vị", "mô tả"];
  private readonly requiredHeaders = ["tên đơn vị"];

  async parseExcelFile(buffer: Buffer): Promise<DepartmentImportData[]> {
    try {
      const workbook = XLSX.read(buffer, { type: "buffer" });
      const sheetName = workbook.SheetNames[0];

      if (!sheetName) {
        throw new BadRequestException(
          "Excel file must contain at least one sheet",
        );
      }

      const worksheet = workbook.Sheets[sheetName];
      const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

      if (jsonData.length === 0) {
        throw new BadRequestException("Excel file is empty");
      }

      const headers = jsonData[0] as string[];
      this.validateHeaders(headers);

      const dataRows = jsonData.slice(1);
      return dataRows.map((row: any, index) =>
        this.mapRowData(row as any[], headers, index),
      );
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new BadRequestException(
        "Failed to parse Excel file: " + error.message,
      );
    }
  }

  validateHeaders(headers: string[]): boolean {
    const normalizedHeaders = headers.map((h) =>
      h?.toString().toLowerCase().trim(),
    );

    // Check required headers
    for (const required of this.requiredHeaders) {
      if (!normalizedHeaders.includes(required.toLowerCase())) {
        throw new BadRequestException(`Missing required column: ${required}`);
      }
    }

    return true;
  }

  private mapRowData(
    row: any[],
    headers: string[],
    rowIndex: number,
  ): DepartmentImportData {
    const data: Partial<DepartmentImportData> = {
      _rowIndex: rowIndex,
      name: "", // Default value
      isActive: true, // Mặc định là active vì không có cột này trong template
    };

    headers.forEach((header, index) => {
      const normalizedHeader = header?.toString().toLowerCase().trim();
      const cellValue = row[index];

      switch (normalizedHeader) {
        case "tên đơn vị":
          data.name = cellValue?.toString().trim() || "";
          break;
        case "mã đơn vị":
          data.code = cellValue?.toString().trim() || undefined;
          break;
        case "mô tả":
          data.description = cellValue?.toString().trim() || undefined;
          break;
        // Backward compatibility - keep old headers working
        case "isactive":
          data.isActive = this.parseBoolean(cellValue);
          break;
      }
    });

    return data as DepartmentImportData;
  }

  private parseBoolean(value: any): boolean {
    if (value === undefined || value === null || value === "") {
      return true; // Default to active
    }

    const strValue = value.toString().toLowerCase().trim();
    return (
      strValue === "true" ||
      strValue === "1" ||
      strValue === "yes" ||
      strValue === "active"
    );
  }

  async generateTemplate(): Promise<Buffer> {
    const templateData = [
      ["Tên đơn vị", "Mã đơn vị", "Mô tả"],
      [
        "Phòng Công nghệ thông tin",
        "TECH",
        "Phụ trách tất cả các sáng kiến công nghệ",
      ],
      ["Phòng Nhân sự", "HR", "Quản lý quan hệ nhân viên và chính sách"],
      ["Phòng Tài chính", "FIN", "Xử lý kế hoạch tài chính và kế toán"],
    ];

    const worksheet = XLSX.utils.aoa_to_sheet(templateData);

    // Set column widths
    worksheet["!cols"] = [
      { width: 25 }, // Tên đơn vị
      { width: 15 }, // Mã đơn vị
      { width: 40 }, // Mô tả
    ];

    // Set header style (bold)
    for (let i = 0; i < templateData[0].length; i++) {
      const cellRef = XLSX.utils.encode_cell({ c: i, r: 0 });
      if (worksheet[cellRef]) {
        worksheet[cellRef].s = { font: { bold: true } };
      }
    }

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Departments");

    return Buffer.from(
      XLSX.write(workbook, { type: "buffer", bookType: "xlsx" }),
    );
  }
}
