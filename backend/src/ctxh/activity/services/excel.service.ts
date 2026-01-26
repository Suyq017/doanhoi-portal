import {
  Injectable,
  BadRequestException,
  Inject,
  forwardRef,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { User } from "../../../entities/user.entity";
import { ExcelParserService } from "../../../users/services/excel-parser.service";
import { ParticipationService } from "./participation.service";
import * as XLSX from "xlsx";

@Injectable()
export class ExcelService {
  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
    private excelParserService: ExcelParserService,
    @Inject(forwardRef(() => ParticipationService))
    private participationService: ParticipationService,
  ) {}

  async processParticipantsExcel(file: Express.Multer.File): Promise<string[]> {
    try {
      // Parse Excel file directly với cấu trúc đơn giản
      const workbook = XLSX.read(file.buffer, { type: "buffer" });
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];

      // Convert to JSON
      const jsonData = XLSX.utils.sheet_to_json(worksheet, {
        header: 1,
        defval: "",
        blankrows: false,
      });

      if (jsonData.length < 2) {
        throw new BadRequestException(
          "File Excel phải có ít nhất 2 dòng (header + dữ liệu)",
        );
      }

      const headers = jsonData[0] as string[];
      const dataRows = jsonData.slice(1);

      console.log("Excel headers:", headers);
      console.log("Data rows count:", dataRows.length);

      // Tìm cột chứa mã số sinh viên (linh hoạt với nhiều tên cột)
      let codeColumnIndex = -1;
      for (let i = 0; i < headers.length; i++) {
        const header = headers[i]
          ?.toString()
          .toLowerCase()
          .trim()
          .replace(/[*]/g, "")
          .replace(/\s+/g, "")
          .replace(/[àáạảãâầấậẩẫăằắặẳẵ]/g, "a")
          .replace(/[èéẹẻẽêềếệểễ]/g, "e")
          .replace(/[ìíịỉĩ]/g, "i")
          .replace(/[òóọỏõôồốộổỗơờớợởỡ]/g, "o")
          .replace(/[ùúụủũưừứựửữ]/g, "u")
          .replace(/[ỳýỵỷỹ]/g, "y")
          .replace(/[đ]/g, "d");

        console.log(`Header ${i}: "${headers[i]}" -> normalized: "${header}"`);

        if (
          ["maso", "masosinhvien", "mssv", "code", "studentcode"].includes(
            header,
          )
        ) {
          codeColumnIndex = i;
          console.log(`Found student code column at index ${i}`);
          break;
        }
      }

      if (codeColumnIndex === -1) {
        throw new BadRequestException(
          'Không tìm thấy cột mã số sinh viên. Vui lòng đặt tên cột là: "Mã số", "MSSV", "Mã số sinh viên", "Code", hoặc "Student Code"',
        );
      }

      // Extract student codes từ data rows
      const studentCodes: string[] = [];
      const errors: string[] = [];

      dataRows.forEach((row: any[], index) => {
        const studentCode = row[codeColumnIndex]?.toString().trim();

        if (!studentCode) {
          errors.push(`Dòng ${index + 2}: Thiếu mã số sinh viên`);
          return;
        }

        // Basic validation - chỉ chấp nhận số
        if (!/^\d+$/.test(studentCode)) {
          errors.push(
            `Dòng ${index + 2}: Mã số sinh viên "${studentCode}" phải là số`,
          );
          return;
        }

        studentCodes.push(studentCode);
      });

      if (errors.length > 0) {
        throw new BadRequestException(
          `Lỗi trong file Excel:\n${errors.join("\n")}`,
        );
      }

      // Remove duplicates
      const uniqueStudentCodes = [...new Set(studentCodes)];

      if (uniqueStudentCodes.length !== studentCodes.length) {
        const duplicateCount = studentCodes.length - uniqueStudentCodes.length;
        throw new BadRequestException(
          `File Excel có ${duplicateCount} mã số sinh viên trùng lặp`,
        );
      }

      return uniqueStudentCodes;
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new BadRequestException(
        "Không thể đọc file Excel. Vui lòng kiểm tra định dạng file (.xlsx)",
      );
    }
  }

  async validateStudentCodes(studentCodes: string[]): Promise<{
    validUsers: User[];
    invalidCodes: string[];
  }> {
    const validUsers: User[] = [];
    const invalidCodes: string[] = [];

    for (const studentCode of studentCodes) {
      const user = await this.userRepository.findOne({
        where: { code: studentCode }, // Sử dụng 'code' thay vì 'student_code'
        select: ["id", "code", "familyName", "givenName", "email"], // Sử dụng 'familyName', 'givenName' thay vì 'fullName'
      });

      if (user) {
        validUsers.push(user);
      } else {
        invalidCodes.push(studentCode);
      }
    }

    return { validUsers, invalidCodes };
  }

  async generateParticipantsTemplate(): Promise<Buffer> {
    const templateData = [
      // Header row - chỉ cần mã số sinh viên
      ["Mã số sinh viên"],
      // Sample data rows
      ["2150001"],
      ["2150002"],
      ["2150003"],
      ["2150004"],
      ["2150005"],
    ];

    const worksheet = XLSX.utils.aoa_to_sheet(templateData);

    // Set column width
    worksheet["!cols"] = [
      { width: 20 }, // Mã số sinh viên
    ];

    // Add some styling/formatting
    worksheet["A1"].s = {
      font: { bold: true },
      fill: { fgColor: { rgb: "DDDDDD" } },
    };

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Danh sách sinh viên");

    return XLSX.write(workbook, { type: "buffer", bookType: "xlsx" });
  }

  async generateGradingTemplate(
    activity: any,
    participants: any[],
  ): Promise<Buffer> {
    // Tạo header cho template chấm điểm
    const headers = [
      "STT",
      "Mã số sinh viên",
      "Họ tên",
      "Số ngày CTXH", // Bỏ dấu * và rút gọn
      "Ghi chú",
    ];

    // Tạo data rows từ danh sách sinh viên đã tham gia nhưng chưa chấm điểm
    const dataRows = participants
      .filter(
        (p) =>
          p.status !== "CANCELLED" &&
          (p.actual_days === null || p.actual_days === undefined),
      ) // Lọc bỏ sinh viên đã hủy và đã chấm điểm
      .map((participant, index) => [
        index + 1, // STT
        participant.student_code || "", // Mã số sinh viên
        participant.student?.full_name || "", // Họ tên
        "", // Số ngày CTXH - để trống để điền
        "", // Ghi chú - để trống để điền
      ]);

    // Combine header và data
    const templateData = [headers, ...dataRows];

    const worksheet = XLSX.utils.aoa_to_sheet(templateData);

    // Set column widths
    worksheet["!cols"] = [
      { width: 8 }, // STT
      { width: 20 }, // Mã số sinh viên
      { width: 25 }, // Họ tên
      { width: 25 }, // Số ngày CTXH thực tế
      { width: 30 }, // Ghi chú
    ];

    // Style header row
    const headerRange = XLSX.utils.decode_range("A1:F1");
    for (let col = headerRange.s.c; col <= headerRange.e.c; col++) {
      const cellAddress = XLSX.utils.encode_cell({ r: 0, c: col });
      if (worksheet[cellAddress]) {
        worksheet[cellAddress].s = {
          font: { bold: true, color: { rgb: "FFFFFF" } },
          fill: { fgColor: { rgb: "4472C4" } },
          alignment: { horizontal: "center", vertical: "center" },
        };
      }
    }

    // Add data validation cho cột "Số ngày CTXH thực tế" (column E)
    if (dataRows.length > 0) {
      const dataValidation = {
        type: "whole",
        operator: "between",
        formula1: "0",
        formula2: "365",
        showErrorMessage: true,
        errorTitle: "Lỗi nhập liệu",
        error: "Số ngày phải là số nguyên từ 0 đến 365",
      };

      // Apply validation to column E (Số ngày CTXH thực tế)
      const validationRange = `E2:E${dataRows.length + 1}`;
      if (!worksheet["!dataValidations"]) worksheet["!dataValidations"] = [];
      worksheet["!dataValidations"].push({
        sqref: validationRange,
        ...dataValidation,
      });
    }

    // Add instruction note
    const instructionRow = dataRows.length + 3; // Thêm vài dòng trống
    worksheet[`A${instructionRow}`] = {
      v: "Hướng dẫn:",
      s: { font: { bold: true, color: { rgb: "FF0000" } } },
    };
    worksheet[`A${instructionRow + 1}`] = {
      v: "1. Điền số ngày CTXH thực tế vào cột E (bắt buộc, từ 0-365)",
      s: { font: { color: { rgb: "FF0000" } } },
    };
    worksheet[`A${instructionRow + 2}`] = {
      v: "2. Điền ghi chú vào cột F (tùy chọn)",
      s: { font: { color: { rgb: "FF0000" } } },
    };
    worksheet[`A${instructionRow + 3}`] = {
      v: "3. Không được xóa hoặc thay đổi thông tin các cột khác",
      s: { font: { color: { rgb: "FF0000" } } },
    };

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Template chấm điểm");

    return XLSX.write(workbook, { type: "buffer", bookType: "xlsx" });
  }

  async exportParticipants(
    activity: any,
    participants: any[],
  ): Promise<Buffer> {
    // Tạo header cho file Excel chấm điểm
    const headers = [
      "STT",
      "Mã số sinh viên",
      "Tên hoạt động",
      "Trạng thái",
      "Số ngày CTXH thực tế", // Cột để điền số ngày
      "Ghi chú", // Cột để điền ghi chú
    ];

    // Tạo data rows - chỉ include những sinh viên đã registered hoặc completed
    const dataRows = participants
      .filter((p) => p.status !== "CANCELLED") // Lọc bỏ những sinh viên đã hủy
      .map((participant, index) => [
        index + 1, // STT
        participant.student_code || "", // Mã số sinh viên
        activity.name || "", // Tên hoạt động
        this.translateStatus(participant.status), // Trạng thái tiếng Việt
        participant.actual_days || "", // Số ngày thực tế (có thể đã có hoặc để trống)
        participant.note || "", // Ghi chú (có thể đã có hoặc để trống)
      ]);

    // Combine header và data
    const exportData = [headers, ...dataRows];

    const worksheet = XLSX.utils.aoa_to_sheet(exportData);

    // Set column widths
    worksheet["!cols"] = [
      { width: 8 }, // STT
      { width: 20 }, // Mã số sinh viên
      { width: 40 }, // Tên hoạt động
      { width: 15 }, // Trạng thái
      { width: 20 }, // Số ngày CTXH thực tế
      { width: 30 }, // Ghi chú
    ];

    // Style header row
    const headerRange = XLSX.utils.decode_range("A1:F1");
    for (let col = headerRange.s.c; col <= headerRange.e.c; col++) {
      const cellAddress = XLSX.utils.encode_cell({ r: 0, c: col });
      if (worksheet[cellAddress]) {
        worksheet[cellAddress].s = {
          font: { bold: true, color: { rgb: "FFFFFF" } },
          fill: { fgColor: { rgb: "4472C4" } },
          alignment: { horizontal: "center", vertical: "center" },
        };
      }
    }

    // Add data validation cho cột "Số ngày CTXH thực tế" (column E)
    if (dataRows.length > 0) {
      const dataValidation = {
        type: "whole",
        operator: "between",
        formula1: "0",
        formula2: "365",
        showErrorMessage: true,
        errorTitle: "Lỗi nhập liệu",
        error: "Số ngày phải là số nguyên từ 0 đến 365",
      };

      // Apply validation to column E (Số ngày CTXH thực tế)
      const validationRange = `E2:E${dataRows.length + 1}`;
      if (!worksheet["!dataValidations"]) worksheet["!dataValidations"] = [];
      worksheet["!dataValidations"].push({
        sqref: validationRange,
        ...dataValidation,
      });
    }

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Chấm điểm CTXH");

    return XLSX.write(workbook, { type: "buffer", bookType: "xlsx" });
  }

  private translateStatus(status: string): string {
    switch (status) {
      case "REGISTERED":
        return "Đã đăng ký";
      case "COMPLETED":
        return "Hoàn thành";
      case "CANCELLED":
        return "Đã hủy";
      default:
        return status;
    }
  }

  async processGradingExcel(
    file: Express.Multer.File,
    maxDays: number,
    activityId: string,
  ): Promise<
    {
      studentCode: string;
      actualDays: number;
      note: string;
      errors?: string[];
    }[]
  > {
    console.log(`Processing grading Excel for activityId: ${activityId}`);

    try {
      const workbook = XLSX.read(file.buffer, { type: "buffer" });
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];

      // Convert to JSON
      const jsonData = XLSX.utils.sheet_to_json(worksheet, {
        header: 1,
        defval: "",
        blankrows: false,
      });

      if (jsonData.length < 2) {
        throw new BadRequestException(
          "File Excel phải có ít nhất 2 dòng (header + dữ liệu)",
        );
      }

      const headers = jsonData[0] as string[];
      const dataRows = jsonData.slice(1);

      // Tìm các cột cần thiết
      let studentCodeIndex = -1;
      let actualDaysIndex = -1;
      let noteIndex = -1;

      for (let i = 0; i < headers.length; i++) {
        const header = headers[i]
          ?.toString()
          .toLowerCase()
          .trim()
          .replace(/[*]/g, "")
          .replace(/\s+/g, "")
          .replace(/[àáạảãâầấậẩẫăằắặẳẵ]/g, "a")
          .replace(/[èéẹẻẽêềếệểễ]/g, "e")
          .replace(/[ìíịỉĩ]/g, "i")
          .replace(/[òóọỏõôồốộổỗơờớợởỡ]/g, "o")
          .replace(/[ùúụủũưừứựửữ]/g, "u")
          .replace(/[ỳýỵỷỹ]/g, "y")
          .replace(/[đ]/g, "d");

        // Tìm cột mã số sinh viên
        if (
          ["masosinhvien", "maso", "mssv", "studentcode", "code"].includes(
            header,
          )
        ) {
          studentCodeIndex = i;
        }

        // Tìm cột số ngày CTXH
        if (
          [
            "songayctxhthucte",
            "songayctxh",
            "songay",
            "actualdays",
            "days",
          ].includes(header)
        ) {
          actualDaysIndex = i;
        }

        // Tìm cột ghi chú
        if (["ghichu", "note", "notes"].includes(header)) {
          noteIndex = i;
        }
      }

      if (studentCodeIndex === -1) {
        throw new BadRequestException('Không tìm thấy cột "Mã số sinh viên"');
      }

      if (actualDaysIndex === -1) {
        throw new BadRequestException('Không tìm thấy cột "Số ngày CTXH"');
      }

      // Process data rows
      const gradingData: {
        studentCode: string;
        actualDays: number;
        note: string;
        errors?: string[];
      }[] = [];
      const validationErrors: string[] = [];

      // Lấy danh sách sinh viên tham gia hoạt động
      const participants =
        await this.participationService.findByActivity(activityId);
      const participantCodes = new Set(participants.map((p) => p.student_code));

      console.log("=== GRADING VALIDATION DEBUG ===");
      console.log("Activity ID:", activityId);
      console.log("Participants count:", participants.length);
      console.log("Participant codes:", Array.from(participantCodes));
      console.log("================================");

      console.log(
        `Activity ${activityId} has ${participants.length} participants:`,
      );
      console.log("Participant codes:", Array.from(participantCodes));
      console.log(
        "File contains student codes:",
        dataRows
          .map((row) => row[studentCodeIndex]?.toString().trim())
          .filter(Boolean),
      );

      dataRows.forEach((row: any[], index) => {
        const studentCode = row[studentCodeIndex]?.toString().trim();
        const actualDaysStr = row[actualDaysIndex]?.toString().trim();
        const note =
          noteIndex !== -1 ? row[noteIndex]?.toString().trim() || "" : "";
        const rowErrors: string[] = [];

        // Kiểm tra mã số sinh viên
        if (!studentCode) {
          rowErrors.push(`Thiếu mã số sinh viên`);
        } else if (!participantCodes.has(studentCode)) {
          console.log(
            `Student ${studentCode} NOT found in participants. Available: [${Array.from(participantCodes).join(", ")}]`,
          );
          rowErrors.push(`Sinh viên không tham gia hoạt động này`);
        } else {
          console.log(`Student ${studentCode} found in participants - OK`);
        }

        // Kiểm tra số ngày
        if (!actualDaysStr) {
          // Cho phép để trống số ngày (sẽ không cập nhật)
          if (studentCode) {
            gradingData.push({
              studentCode,
              actualDays: 0,
              note,
              errors: rowErrors.length > 0 ? rowErrors : undefined,
            });
          }
          return;
        }

        const actualDays = parseInt(actualDaysStr);
        if (isNaN(actualDays) || actualDays < 0) {
          rowErrors.push(`Số ngày CTXH không hợp lệ`);
        } else if (actualDays > maxDays) {
          rowErrors.push(
            `Số ngày CTXH vượt quá giới hạn (tối đa ${maxDays} ngày)`,
          );
        }

        if (studentCode) {
          gradingData.push({
            studentCode,
            actualDays: isNaN(actualDays) ? 0 : actualDays,
            note,
            errors: rowErrors.length > 0 ? rowErrors : undefined,
          });

          // Thêm vào danh sách lỗi chung cho logging
          if (rowErrors.length > 0) {
            validationErrors.push(`Dòng ${index + 2}: ${rowErrors.join(", ")}`);
          }
        }
      });

      // Không throw lỗi ở đây, để controller xử lý
      // Chỉ log để debug
      if (validationErrors.length > 0) {
        console.log("Grading validation issues:", validationErrors);
      }

      return gradingData;
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new BadRequestException(
        "Không thể đọc file Excel chấm điểm. Vui lòng kiểm tra định dạng file (.xlsx)",
      );
    }
  }
}
