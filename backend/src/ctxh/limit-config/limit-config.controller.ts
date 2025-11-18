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
  ApiParam,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { PermissionGuard } from '../../auth/guards/permission.guard';
import { RequirePermissions } from '../../auth/decorators/permissions.decorator';
import { LimitConfigService } from './limit-config.service';
import { CreateLimitConfigDto } from './dto/create-limit-config.dto';
import { UpdateLimitConfigDto } from './dto/update-limit-config.dto';

@ApiTags('CTXH Limit Config')
@ApiBearerAuth()
@Controller('ctxh/limit-config')
@UseGuards(JwtAuthGuard, PermissionGuard)
export class LimitConfigController {
  constructor(private readonly limitConfigService: LimitConfigService) {}

  @Post()
  @ApiOperation({ summary: 'Tạo cấu hình giới hạn CTXH mới' })
  @ApiResponse({ status: 201, description: 'Tạo cấu hình thành công' })
  @RequirePermissions('ctxh.config.manage')
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
  @ApiQuery({ 
    name: 'search', 
    required: false, 
    description: 'Tìm kiếm theo tên tổ chức',
    example: 'Khoa CNTT'
  })
  @ApiResponse({ status: 200, description: 'Lấy danh sách thành công' })
  @RequirePermissions('ctxh.config.manage')
  findAll(
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('organization_id') organizationId?: string,
    @Query('status') status?: string,
    @Query('search') search?: string,
  ) {
    console.log('Controller received parameters:', {
      page: page || 1,
      limit: limit || 10,
      organization_id: organizationId,
      status,
      search,
    });
    
    return this.limitConfigService.findAll({
      page: page || 1,
      limit: limit || 10,
      organization_id: organizationId,
      status,
      search,
    });
  }

  @Get('organization/:organizationId/active')
  @ApiOperation({ summary: 'Lấy cấu hình CTXH active của tổ chức (không cần quyền manage)' })
  @ApiParam({
    name: 'organizationId',
    required: true,
    description: 'ID của tổ chức'
  })
  @ApiResponse({ 
    status: 200, 
    description: 'Lấy cấu hình thành công',
    schema: {
      type: 'object',
      properties: {
        limitConfig: {
          type: 'object',
          nullable: true,
          description: 'Cấu hình giới hạn ngày CTXH hoặc null nếu không có'
        }
      }
    }
  })
  async getOrganizationActiveLimit(@Param('organizationId') organizationId: string) {
    const result = await this.limitConfigService.findAll({
      page: 1,
      limit: 1,
      organization_id: organizationId,
      status: 'ACTIVE',
    });
    
    return {
      limitConfig: result.data && result.data.length > 0 ? result.data[0] : null
    };
  }

  @Get(':id')
  @ApiOperation({ summary: 'Lấy cấu hình CTXH theo ID' })
  @ApiResponse({ status: 200, description: 'Lấy cấu hình thành công' })
  @RequirePermissions('ctxh.config.manage')
  findOne(@Param('id') id: string) {
    return this.limitConfigService.findOne(id);
  }

  @Patch(':id')
  @RequirePermissions('ctxh.config.manage')
  update(
    @Param('id') id: string,
    @Body() updateLimitConfigDto: UpdateLimitConfigDto,
    @Request() req,
  ) {
    return this.limitConfigService.update(id, updateLimitConfigDto, req.user.id);
  }

  @Delete(':id')
  @RequirePermissions('ctxh.config.manage')
  remove(@Param('id') id: string, @Request() req) {
    return this.limitConfigService.remove(id, req.user.id);
  }

  @Post(':id/restore')
  @ApiOperation({ summary: 'Khôi phục cấu hình đã xóa' })
  @ApiResponse({ status: 200, description: 'Khôi phục thành công' })
  @RequirePermissions('ctxh.config.manage')
  restore(@Param('id') id: string, @Request() req) {
    return this.limitConfigService.restore(id, req.user.id);
  }
}