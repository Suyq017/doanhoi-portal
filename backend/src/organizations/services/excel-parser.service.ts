import { Injectable, BadRequestException } from "@nestjs/common";
import * as XLSX from "xlsx";

export interface OrganizationMemberImportData {
  studentCode: string;
  classOrUnitCode?: string;
  _rowIndex?: number;
}

@Injectable()
export class OrganizationExcelParserService {
  private readonly expectedHeadersLevel2 = ["Mã số sinh viên", "Mã lớp/đơn vị"];
  private readonly expectedHeadersLevel3 = ["Mã số sinh viên"];
  private readonly requiredHeaders = ["Mã số sinh viên"];

  async parseExcelFile(
    buffer: Buffer,
    level: number,
  ): Promise<OrganizationMemberImportData[]> {
    try {
      const workbook = XLSX.read(buffer, {
        type: "buffer",
        cellText: false,
        cellDates: true,
      });

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
      this.validateHeaders(headers, level);

      const dataRows = jsonData.slice(1);
      return dataRows.map((row: any, index) =>
        this.mapRowData(row as any[], headers, index, level),
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

  validateHeaders(headers: string[], level: number): boolean {
    const normalizedHeaders = headers.map((h) =>
      h?.toString().toLowerCase().trim(),
    );
    const _expectedHeaders =
      level === 2 ? this.expectedHeadersLevel2 : this.expectedHeadersLevel3;

    // Check required headers
    for (const required of this.requiredHeaders) {
      const found = normalizedHeaders.some(
        (h) =>
          h.includes("sinh viên") ||
          h.includes("student") ||
          h.includes("studentcode"),
      );
      if (!found) {
        throw new BadRequestException(`Missing required column: ${required}`);
      }
    }

    // Check level 2 specific requirements
    if (level === 2) {
      const hasClassUnit = normalizedHeaders.some(
        (h) =>
          h.includes("lớp") ||
          h.includes("đơn vị") ||
          h.includes("class") ||
          h.includes("unit"),
      );
      if (!hasClassUnit) {
        throw new BadRequestException(
          "Level 2 requires class/unit code column",
        );
      }
    }

    return true;
  }

  private mapRowData(
    row: any[],
    headers: string[],
    rowIndex: number,
    level: number,
  ): OrganizationMemberImportData {
    const data: Partial<OrganizationMemberImportData> = {
      _rowIndex: rowIndex,
      studentCode: "",
    };

    // Find student code column
    let studentCodeIndex = headers.findIndex(
      (h) =>
        h &&
        (h.includes("sinh viên") ||
          h.includes("Student") ||
          h.includes("studentCode")),
    );
    if (studentCodeIndex === -1) studentCodeIndex = 0; // Default to first column

    // Get student code
    const studentCode = row[studentCodeIndex];
    data.studentCode = studentCode?.toString().trim() || "";

    // For level 2, also get class/unit code
    if (level === 2) {
      let classCodeIndex = headers.findIndex(
        (h) =>
          h &&
          (h.includes("lớp") ||
            h.includes("đơn vị") ||
            h.includes("Class") ||
            h.includes("classOrUnitCode")),
      );
      if (classCodeIndex === -1) classCodeIndex = 1; // Default to second column

      const classOrUnitCode = row[classCodeIndex];
      data.classOrUnitCode = classOrUnitCode?.toString().trim() || undefined;
    }

    return data as OrganizationMemberImportData;
  }

  generateTemplate(level: number): Buffer {
    console.log(`Generating template for level ${level}`);

    let templateData: string[][];

    if (level === 2) {
      // Level 2: 2 cột - Mã số sinh viên, Mã lớp/đơn vị
      templateData = [
        // Header row
        ["Mã số sinh viên", "Mã lớp/đơn vị"],
        // Sample data rows
        ["2052001", "KTPM01"],
        ["2052002", "KTPM02"],
        ["2052003", "CNTT01"],
        ["2052004", "KTPM01"],
      ];
    } else if (level === 3) {
      // Level 3: 1 cột - chỉ Mã số sinh viên
      templateData = [
        // Header row
        ["Mã số sinh viên"],
        // Sample data rows
        ["2052001"],
        ["2052002"],
        ["2052003"],
        ["2052004"],
      ];
    } else {
      throw new BadRequestException("Level phải là 2 hoặc 3");
    }

    console.log("Template data:", templateData);

    try {
      const worksheet = XLSX.utils.aoa_to_sheet(templateData);

      // Set column widths
      if (level === 2) {
        worksheet["!cols"] = [
          { width: 20 }, // Mã số sinh viên
          { width: 18 }, // Mã lớp/đơn vị
        ];
      } else {
        worksheet["!cols"] = [
          { width: 20 }, // Mã số sinh viên
        ];
      }

      // Style header row (make it bold)
      const range = XLSX.utils.decode_range(worksheet["!ref"] || "A1");
      for (let C = range.s.c; C <= range.e.c; ++C) {
        const cellAddress = XLSX.utils.encode_cell({ c: C, r: 0 });
        if (worksheet[cellAddress]) {
          if (!worksheet[cellAddress].s) worksheet[cellAddress].s = {};
          if (!worksheet[cellAddress].s.font)
            worksheet[cellAddress].s.font = {};
          worksheet[cellAddress].s.font.bold = true;

          // Add background color for header
          if (!worksheet[cellAddress].s.fill)
            worksheet[cellAddress].s.fill = {};
          worksheet[cellAddress].s.fill.fgColor = { rgb: "E6F3FF" };
        }
      }

      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "Organization_Members");

      const buffer = XLSX.write(workbook, { type: "buffer", bookType: "xlsx" });
      console.log("Generated buffer length:", buffer.length);

      return Buffer.from(buffer);
    } catch (error) {
      console.error("Error generating template:", error);
      throw new BadRequestException(
        "Không thể tạo file Excel template: " + error.message,
      );
    }
  }
}
