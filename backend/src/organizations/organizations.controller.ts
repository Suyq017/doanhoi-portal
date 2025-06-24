import { Controller, Get, Post, Body, Patch, Param, Delete, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam } from '@nestjs/swagger';
import { OrganizationsService } from './organizations.service';
import { CreateOrganizationDto } from './dto/create-organization.dto';
import { UpdateOrganizationDto } from './dto/update-organization.dto';
import { OrganizationType } from '../entities/organization.entity';
import { UserRole } from '../entities/user-organization.entity';

@ApiTags('organizations')
@Controller('organizations')
export class OrganizationsController {
  constructor(private readonly organizationsService: OrganizationsService) {}

  @Post()
  @ApiOperation({ summary: 'Tạo tổ chức mới' })
  @ApiResponse({ status: 201, description: 'Tổ chức đã được tạo thành công' })
  create(@Body() createOrganizationDto: CreateOrganizationDto) {
    return this.organizationsService.create(createOrganizationDto);
  }

  @Get()
  @ApiOperation({ summary: 'Lấy danh sách tổ chức' })
  @ApiResponse({ status: 200, description: 'Danh sách tổ chức' })
  findAll() {
    return this.organizationsService.findAll();
  }

  @Get('tree')
  @ApiOperation({ summary: 'Lấy cây tổ chức' })
  @ApiResponse({ status: 200, description: 'Cây tổ chức' })
  findTree() {
    return this.organizationsService.findTree();
  }

  @Get('type/:type')
  @ApiOperation({ summary: 'Lấy tổ chức theo loại' })
  @ApiParam({ name: 'type', enum: OrganizationType })
  @ApiResponse({ status: 200, description: 'Danh sách tổ chức theo loại' })
  findByType(@Param('type') type: OrganizationType) {
    return this.organizationsService.findByType(type);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Lấy thông tin chi tiết tổ chức' })
  @ApiResponse({ status: 200, description: 'Thông tin tổ chức' })
  @ApiResponse({ status: 404, description: 'Không tìm thấy tổ chức' })
  findOne(@Param('id') id: string) {
    return this.organizationsService.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Cập nhật thông tin tổ chức' })
  @ApiResponse({ status: 200, description: 'Tổ chức đã được cập nhật' })
  update(@Param('id') id: string, @Body() updateOrganizationDto: UpdateOrganizationDto) {
    return this.organizationsService.update(id, updateOrganizationDto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Xóa tổ chức' })
  @ApiResponse({ status: 200, description: 'Tổ chức đã được xóa' })
  remove(@Param('id') id: string) {
    return this.organizationsService.remove(id);
  }

  @Post(':id/members/:userId')
  @ApiOperation({ summary: 'Thêm thành viên vào tổ chức' })
  @ApiResponse({ status: 201, description: 'Thành viên đã được thêm' })
  addMember(
    @Param('id') id: string,
    @Param('userId') userId: string,
    @Body('role') role: UserRole = UserRole.MEMBER
  ) {
    return this.organizationsService.addMember(id, userId, role);
  }

  @Delete(':id/members/:userId')
  @ApiOperation({ summary: 'Xóa thành viên khỏi tổ chức' })
  @ApiResponse({ status: 200, description: 'Thành viên đã được xóa' })
  removeMember(@Param('id') id: string, @Param('userId') userId: string) {
    return this.organizationsService.removeMember(id, userId);
  }

  @Get(':id/members')
  @ApiOperation({ summary: 'Lấy danh sách thành viên của tổ chức' })
  @ApiResponse({ status: 200, description: 'Danh sách thành viên' })
  getMembers(@Param('id') id: string) {
    return this.organizationsService.getMembers(id);
  }
}
