import { Controller, Post, Body, UseGuards } from "@nestjs/common";
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from "@nestjs/swagger";
import { JwtAuthGuard } from "../../auth/guards/jwt-auth.guard";
import { RequirePermissions } from "../../auth/decorators/permissions.decorator";
import { CtxhImportService } from "./import.service";
import {
  ImportOldSystemCtxhDto,
  ImportOldSystemCtxhResultDto,
  ValidateOldSystemCtxhDto,
  ValidateOldSystemCtxhResultDto,
} from "./dto/import-old-system-ctxh.dto";

@ApiTags("CTXH Import")
@ApiBearerAuth()
@Controller("ctxh/import")
@UseGuards(JwtAuthGuard)
export class CtxhImportController {
  constructor(private readonly importService: CtxhImportService) {}

  @Post("old-system/validate")
  @ApiOperation({
    summary: "Validate dữ liệu CTXH từ hệ thống cũ",
    description:
      "Kiểm tra tính hợp lệ của dữ liệu trước khi import (validate MSSV có tồn tại)",
  })
  @ApiResponse({
    status: 200,
    description: "Validation thành công",
    type: ValidateOldSystemCtxhResultDto,
  })
  @RequirePermissions("ctxh.import.old_system")
  async validateOldSystem(
    @Body() dto: ValidateOldSystemCtxhDto,
  ): Promise<ValidateOldSystemCtxhResultDto> {
    return this.importService.validateOldSystemCtxh(dto.records);
  }

  @Post("old-system")
  @ApiOperation({
    summary: "Import CTXH từ hệ thống cũ",
    description:
      "Nhập số ngày CTXH từ hệ thống cũ vào cột ctxh_days_old_system",
  })
  @ApiResponse({
    status: 200,
    description: "Import thành công",
    type: ImportOldSystemCtxhResultDto,
  })
  @RequirePermissions("ctxh.import.old_system")
  async importOldSystem(
    @Body() dto: ImportOldSystemCtxhDto,
  ): Promise<ImportOldSystemCtxhResultDto> {
    return this.importService.importOldSystemCtxh(dto.records);
  }
}
