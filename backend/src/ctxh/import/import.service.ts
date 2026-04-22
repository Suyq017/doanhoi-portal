import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { User } from "../../entities/user.entity";
import {
  OldSystemCtxhRecordDto,
  ImportOldSystemCtxhResultDto,
  ValidateOldSystemCtxhResultDto,
  ValidationError,
} from "./dto/import-old-system-ctxh.dto";
import { In } from "typeorm";

@Injectable()
export class CtxhImportService {
  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
  ) { }

  /**
   * Validate old system CTXH records with 1 query
   */
  async validateOldSystemCtxh(
    records: OldSystemCtxhRecordDto[],
  ): Promise<ValidateOldSystemCtxhResultDto> {
    const errors: ValidationError[] = [];
    const warnings: ValidationError[] = [];
    let validCount = 0;

    // Get all student codes from records
    const studentCodes = records.map((r) => r.studentCode);

    // Single query to fetch all existing users (1 query instead of N)
    const existingUsers = await this.userRepository.find({
      where: { code: In(studentCodes) },
      select: ["code"],
    });

    const existingCodesSet = new Set(existingUsers.map((u) => u.code));

    // Validate each record
    for (let i = 0; i < records.length; i++) {
      const record = records[i];
      const rowNumber = i + 2; // Excel row (header is row 1)
      let hasError = false;

      // Check if student exists in database
      if (!existingCodesSet.has(record.studentCode)) {
        errors.push({
          row: rowNumber,
          column: "MSSV",
          message: `Không tìm thấy sinh viên ${record.studentCode} trong hệ thống`,
          severity: "error",
        });
        hasError = true;
      }

      // Additional warnings for data quality
      if (!hasError && record.days > 365) {
        warnings.push({
          row: rowNumber,
          column: "Số ngày",
          message: `Số ngày (${record.days}) lớn hơn 365 - có thể không hợp lệ`,
          severity: "warning",
        });
      }

      if (!hasError) {
        validCount++;
      }
    }

    return {
      isValid: errors.length === 0,
      total: records.length,
      valid: validCount,
      invalid: errors.length,
      errors,
      warnings,
    };
  }

  /**
   * Import old system CTXH with bulk update (1 query instead of N)
   */
  async importOldSystemCtxh(
    records: OldSystemCtxhRecordDto[],
  ): Promise<ImportOldSystemCtxhResultDto> {
    const result: ImportOldSystemCtxhResultDto = {
      total: records.length,
      successful: 0,
      failed: 0,
      errors: [],
      message: "",
    };

    if (records.length === 0) {
      result.message = "Không có dữ liệu để import.";
      return result;
    }

    try {
      // Get all student codes
      const studentCodes = records.map((r) => r.studentCode);

      // Single query to fetch all existing users
      const existingUsers = await this.userRepository.find({
        where: { code: In(studentCodes) },
        select: ["id", "code"],
      });

      // Create a map: code -> days
      const codeToIdMap = new Map(existingUsers.map((u) => [u.code, u.id]));
      const codeToRecordMap = new Map(
        records.map((r) => [r.studentCode, r]),
      );

      // Track which records can be updated
      const validUpdates: { id: string; days: number }[] = [];
      const notFoundCodes: string[] = [];

      for (const record of records) {
        const userId = codeToIdMap.get(record.studentCode);
        if (userId) {
          validUpdates.push({ id: userId, days: record.days });
        } else {
          notFoundCodes.push(record.studentCode);
          result.failed++;
          result.errors.push(
            `Không tìm thấy sinh viên ${record.studentCode}`,
          );
        }
      }

      // Bulk update with CASE WHEN (1 query)
      if (validUpdates.length > 0) {
        const caseStatements = validUpdates
          .map((u) => `WHEN id = '${u.id}' THEN ${u.days}`)
          .join(" ");

        const ids = validUpdates.map((u) => u.id);

        await this.userRepository
          .createQueryBuilder()
          .update(User)
          .set({
            ctxhDaysOldSystem: () =>
              `CASE ${caseStatements} ELSE ctxh_days_old_system END`,
          })
          .where("id IN (:...ids)", { ids })
          .execute();

        result.successful = validUpdates.length;
      }

      // Generate message
      if (result.successful > 0 && result.failed === 0) {
        result.message = `Import thành công ${result.successful} bản ghi.`;
      } else if (result.successful > 0 && result.failed > 0) {
        result.message = `Import hoàn thành với một số lỗi. ${result.successful} thành công, ${result.failed} thất bại.`;
      } else {
        result.message = `Import thất bại. Không có bản ghi nào được cập nhật thành công.`;
      }
    } catch (error) {
      result.failed = records.length;
      result.errors.push(
        `Lỗi khi import dữ liệu: ${error.message}`,
      );
      result.message = "Import thất bại do lỗi hệ thống.";
    }

    return result;
  }
}
