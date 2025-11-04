import { Controller, Post, Body, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RequirePermissions } from '../../auth/decorators/permissions.decorator';
import { CtxhImportService } from './import.service';
import { ImportOldSystemCtxhDto, ImportOldSystemCtxhResultDto } from './dto/import-old-system-ctxh.dto';

@ApiTags('CTXH Import')
@ApiBearerAuth()
@Controller('ctxh/import')
@UseGuards(JwtAuthGuard)
export class CtxhImportController {
  constructor(private readonly importService: CtxhImportService) {}

  @Post('old-system')
  @ApiOperation({
    summary: 'Import CTXH từ hệ thống cũ',
    description: 'Nhập số ngày CTXH từ hệ thống cũ vào cột ctxh_days_old_system',
  })
  @ApiResponse({
    status: 200,
    description: 'Import thành công',
    type: ImportOldSystemCtxhResultDto,
  })
  @RequirePermissions('ctxh.import.old_system')
  async importOldSystem(
    @Body() dto: ImportOldSystemCtxhDto,
  ): Promise<ImportOldSystemCtxhResultDto> {
    return this.importService.importOldSystemCtxh(dto.records);
  }
}
