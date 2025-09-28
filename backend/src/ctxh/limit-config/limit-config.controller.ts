import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  UseGuards,
  Request,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiQuery,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RequirePermissions } from '../../auth/decorators/permissions.decorator';
import { LimitConfigService } from './limit-config.service';
import { CreateLimitConfigDto } from './dto/create-limit-config.dto';
import { UpdateLimitConfigDto } from './dto/update-limit-config.dto';

@ApiTags('CTXH Limit Config')
@ApiBearerAuth()
@Controller('ctxh/limit-config')
@UseGuards(JwtAuthGuard) // Tạm thời bỏ PermissionGuard
export class LimitConfigController {
  constructor(private readonly limitConfigService: LimitConfigService) {}

  @Post()
  @ApiOperation({ summary: 'Tạo cấu hình giới hạn CTXH mới' })
  @ApiResponse({ status: 201, description: 'Tạo cấu hình thành công' })
  @RequirePermissions('ctxh_limit_config:create')
  create(@Body() createLimitConfigDto: CreateLimitConfigDto, @Request() req) {
    return this.limitConfigService.create(createLimitConfigDto, req.user.id);
  }

  @Get()
  @ApiOperation({ 
    summary: 'Lấy danh sách cấu hình giới hạn CTXH',
    description: 'Lấy danh sách cấu hình với phân trang và filter theo tổ chức, trạng thái'
  })
  @ApiQuery({ 
    name: 'page', 
    required: false, 
    description: 'Trang hiện tại',
    example: 1
  })
  @ApiQuery({ 
    name: 'limit', 
    required: false, 
    description: 'Số lượng bản ghi mỗi trang',
    example: 10
  })
  @ApiQuery({ 
    name: 'organization_id', 
    required: false, 
    description: 'Filter theo ID tổ chức',
    example: 'uuid-string'
  })
  @ApiQuery({ 
    name: 'status', 
    required: false, 
    description: 'Filter theo trạng thái',
    enum: ['ACTIVE', 'INACTIVE', 'DRAFT']
  })
  @ApiResponse({ status: 200, description: 'Lấy danh sách thành công' })
  @RequirePermissions('ctxh_limit_config:read')
  findAll(
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('organization_id') organizationId?: string,
    @Query('status') status?: string,
  ) {
    return this.limitConfigService.findAll({
      page: page || 1,
      limit: limit || 10,
      organization_id: organizationId,
      status,
    });
  }

  @Get(':id')
  @ApiOperation({ summary: 'Lấy cấu hình CTXH theo ID' })
  @ApiResponse({ status: 200, description: 'Lấy cấu hình thành công' })
  @RequirePermissions('ctxh_limit_config:read')
  findOne(@Param('id') id: string) {
    return this.limitConfigService.findOne(id);
  }

  @Patch(':id')
  @RequirePermissions('ctxh_limit_config:update')
  update(
    @Param('id') id: string,
    @Body() updateLimitConfigDto: UpdateLimitConfigDto,
    @Request() req,
  ) {
    return this.limitConfigService.update(id, updateLimitConfigDto, req.user.id);
  }

  @Delete(':id')
  @RequirePermissions('ctxh_limit_config:delete')
  remove(@Param('id') id: string, @Request() req) {
    return this.limitConfigService.remove(id, req.user.id);
  }

  @Post(':id/restore')
  @ApiOperation({ summary: 'Khôi phục cấu hình đã xóa' })
  @ApiResponse({ status: 200, description: 'Khôi phục thành công' })
  @RequirePermissions('ctxh_limit_config:create')
  restore(@Param('id') id: string, @Request() req) {
    return this.limitConfigService.restore(id, req.user.id);
  }
}