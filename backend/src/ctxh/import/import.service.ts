import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { User } from "../../entities/user.entity";
import {
  OldSystemCtxhRecordDto,
  ImportOldSystemCtxhResultDto,
} from "./dto/import-old-system-ctxh.dto";

@Injectable()
export class CtxhImportService {
  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
  ) {}

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

    for (const record of records) {
      try {
        // Find user by student code
        const user = await this.userRepository.findOne({
          where: { code: record.studentCode },
        });

        if (!user) {
          result.failed++;
          result.errors.push(
            `Dòng ${result.successful + result.failed}: Không tìm thấy sinh viên ${record.studentCode}`,
          );
          continue;
        }

        // Update ctxh_days_old_system
        await this.userRepository.update(user.id, {
          ctxhDaysOldSystem: record.days,
        });

        result.successful++;
      } catch (error) {
        result.failed++;
        result.errors.push(
          `Dòng ${result.successful + result.failed}: Lỗi khi cập nhật ${record.studentCode} - ${error.message}`,
        );
      }
    }

    // Generate message
    if (result.successful > 0 && result.failed === 0) {
      result.message = `Import thành công ${result.successful} bản ghi.`;
    } else if (result.successful > 0 && result.failed > 0) {
      result.message = `Import hoàn thành với một số lỗi. ${result.successful} thành công, ${result.failed} thất bại.`;
    } else {
      result.message = `Import thất bại. Không có bản ghi nào được cập nhật thành công.`;
    }

    return result;
  }
}
