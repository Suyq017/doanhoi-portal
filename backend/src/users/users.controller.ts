import { Controller, Get, Post, Body, Patch, Param, Delete, Query, UseGuards, UseInterceptors, UploadedFile, Res, BadRequestException, NotFoundException } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiConsumes } from '@nestjs/swagger';
import { FileInterceptor } from '@nestjs/platform-express';
import { Response } from 'express';
import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { QueryUserDto } from './dto/query-user.dto';
import { BulkDeleteUserDto } from './dto/bulk-delete-user.dto';
import { ImportService } from './services/import.service';
import { BatchImportService } from './services/batch-import.service';
import { BatchImportRequestDto } from './dto/batch-import-request-simple.dto';
import { BatchImportResponseDto } from './dto/batch-import-response.dto';
import { RolesService } from '../roles/roles.service';
import { User } from '../entities/user.entity';

@ApiTags('users')
@Controller('users')
export class UsersController {
  constructor(
    private readonly usersService: UsersService,
    private readonly importService: ImportService, // Enhanced with 18-column template & auto organization creation
    private readonly batchImportService: BatchImportService, // NEW: Client-side batch processing
    private readonly rolesService: RolesService
  ) { }
  @Post()
  @ApiOperation({ summary: 'Tạo người dùng mới với hỗ trợ gán nhiều vai trò-tổ chức' })
  @ApiResponse({ status: 201, description: 'Người dùng đã được tạo thành công' })
  @ApiResponse({ status: 400, description: 'Dữ liệu không hợp lệ hoặc có vai trò-tổ chức trùng lặp' })
  create(@Body() createUserDto: CreateUserDto) {
    return this.usersService.create(createUserDto);
  }

  @Get()
  @ApiOperation({ summary: 'Lấy danh sách người dùng' })
  @ApiResponse({ status: 200, description: 'Danh sách người dùng' })
  findAll(@Query() query: QueryUserDto) {
    return this.usersService.findAll(query);
  }
  @Get('template')
  @ApiOperation({ summary: 'Download template Excel để import users (Enhanced 18-Column Version)' })
  @ApiResponse({ status: 200, description: 'File template Excel' })
  async downloadTemplate(@Res() res: Response) {
    const buffer = await this.importService.generateTemplate();

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename="users_import_template_enhanced.xlsx"');
    res.send(buffer);
  }



  @Delete('bulk-delete')
  @ApiOperation({ summary: 'Xóa nhiều người dùng cùng lúc' })
  @ApiResponse({ status: 200, description: 'Các người dùng đã được xóa thành công' })
  @ApiResponse({ status: 400, description: 'Dữ liệu không hợp lệ' })
  @ApiResponse({ status: 404, description: 'Một hoặc nhiều người dùng không tồn tại' })
  async bulkDelete(@Body() bulkDeleteUserDto: BulkDeleteUserDto) {
    await this.usersService.removeMultiple(bulkDeleteUserDto.ids);
    return {
      message: `Đã xóa thành công ${bulkDeleteUserDto.ids.length} người dùng`,
      deletedCount: bulkDeleteUserDto.ids.length
    };
  }
  @Get('password-status')
  @ApiOperation({ summary: 'Kiểm tra users có mật khẩu mặc định cần thông báo' })
  @ApiResponse({ status: 200, description: 'Danh sách users cần thông báo mật khẩu' })
  async getUsersWithDefaultPassword() {
    return this.usersService.getUsersWithDefaultPassword();
  }

  @Get('available-roles')
  @ApiOperation({ summary: 'Get available roles for user assignment' })
  async getAvailableRoles() {
    return this.rolesService.getAllRoles();
  }

  @Get('find-by-code/:code')
  @ApiOperation({ summary: 'Tìm người dùng theo mã code chính xác' })
  @ApiResponse({ status: 200, description: 'Thông tin người dùng', type: User })
  @ApiResponse({ status: 404, description: 'Không tìm thấy người dùng' })
  async findByCode(@Param('code') code: string) {
    const user = await this.usersService.findByExactCode(code);
    if (!user) {
      throw new NotFoundException(`Không tìm thấy người dùng với mã ${code}`);
    }
    return user;
  }

  @Get(':id')
  @ApiOperation({ summary: 'Lấy thông tin chi tiết người dùng' })
  @ApiResponse({ status: 200, description: 'Thông tin người dùng' })
  @ApiResponse({ status: 404, description: 'Không tìm thấy người dùng' })
  findOne(@Param('id') id: string) {
    return this.usersService.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Cập nhật thông tin người dùng' })
  @ApiResponse({ status: 200, description: 'Người dùng đã được cập nhật' })
  @ApiResponse({ status: 404, description: 'Không tìm thấy người dùng' })
  update(@Param('id') id: string, @Body() updateUserDto: UpdateUserDto) {
    return this.usersService.update(id, updateUserDto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Xóa người dùng' })
  @ApiResponse({ status: 200, description: 'Người dùng đã được xóa' })
  @ApiResponse({ status: 404, description: 'Không tìm thấy người dùng' })
  remove(@Param('id') id: string) {
    return this.usersService.remove(id);
  }


  @Post('import/upload')
  @ApiOperation({ summary: 'Upload file Excel để import users (Enhanced 18-Column Version)' })
  @ApiResponse({ status: 200, description: 'File đã được upload thành công' })
  @ApiResponse({ status: 400, description: 'File không hợp lệ' })
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(FileInterceptor('file'))
  async uploadImportFile(@UploadedFile() file: Express.Multer.File) {
    return this.importService.uploadFile(file);
  }



  @Get('import/:sessionId/validate')
  @ApiOperation({ summary: 'Validate dữ liệu import (Enhanced with Organization Auto-Creation)' })
  @ApiResponse({ status: 200, description: 'Kết quả validation' })
  @ApiResponse({ status: 404, description: 'Session không tồn tại' })
  async validateImportData(@Param('sessionId') sessionId: string) {
    return this.importService.validateData(sessionId);
  }

  @Post('import/:sessionId/execute')
  @ApiOperation({ summary: 'Thực hiện import dữ liệu (Enhanced with Auto Organization Creation)' })
  @ApiResponse({ status: 200, description: 'Import thành công' })
  @ApiResponse({ status: 400, description: 'Dữ liệu chưa được validate hoặc có lỗi' })
  async executeImport(
    @Param('sessionId') sessionId: string,
    @Body() options?: { skipConflicts: true; batchSize?: number }
  ) {
    return this.importService.executeImport(sessionId, options);
  }

  @Get('import/:sessionId/status')
  @ApiOperation({ summary: 'Lấy trạng thái session import' })
  @ApiResponse({ status: 200, description: 'Trạng thái session' })
  @ApiResponse({ status: 404, description: 'Session không tồn tại' })
  async getSessionStatus(@Param('sessionId') sessionId: string) {
    return this.importService.getSessionStatus(sessionId);
  }

  // NEW: Client-side batch processing endpoint
  @Post('import/batch')
  @ApiOperation({ 
    summary: 'Import batch users từ frontend (Client-side Processing)',
    description: 'Nhận JSON array từ frontend và xử lý import theo batch. Hỗ trợ session tracking và error recovery cho files lớn tới 27k records. Backward compatible với existing import system.'
  })
  @ApiResponse({ 
    status: 200, 
    description: 'Batch import thành công',
    type: BatchImportResponseDto 
  })
  @ApiResponse({ 
    status: 400, 
    description: 'Dữ liệu không hợp lệ hoặc batch size vượt quá giới hạn' 
  })
  @ApiResponse({ 
    status: 409, 
    description: 'Có conflict trong dữ liệu (duplicate records)' 
  })
  async batchImport(
    @Body() request: BatchImportRequestDto
  ): Promise<BatchImportResponseDto> {
    // Debug logging
    console.log('Batch import request received:', {
      usersLength: request.users?.length,
      batchInfo: request.batchInfo,
      options: request.options
    });
    
    // Manual validation for debugging
    if (!request.users || !Array.isArray(request.users)) {
      throw new BadRequestException('Users array is required');
    }
    
    if (request.users.length === 0) {
      throw new BadRequestException('At least 1 user required per batch');
    }
    
    if (request.users.length > 200) {
      throw new BadRequestException('Maximum 200 users per batch');
    }
    
    return this.batchImportService.processBatch(request);
  }

  @Get('import/batch/:sessionId/summary')
  @ApiOperation({ 
    summary: 'Lấy tổng kết session batch import',
    description: 'Trả về thống kê tổng hợp của tất cả batches trong một session import.'
  })
  @ApiResponse({ 
    status: 200, 
    description: 'Thông tin tổng kết session' 
  })
  @ApiResponse({ 
    status: 404, 
    description: 'Session không tồn tại hoặc đã hết hạn' 
  })
  async getBatchSessionSummary(@Param('sessionId') sessionId: string) {
    return this.batchImportService.getSessionSummary(sessionId);
  }

  @Delete('import/batch/:sessionId')
  @ApiOperation({ 
    summary: 'Xóa session batch import',
    description: 'Dọn dẹp session data sau khi hoàn tất import.'
  })
  @ApiResponse({ 
    status: 200, 
    description: 'Session đã được xóa thành công' 
  })
  async clearBatchSession(@Param('sessionId') sessionId: string) {
    this.batchImportService.clearSession(sessionId);
    return { message: `Session ${sessionId} cleared successfully` };
  }

  // @Post('import/:sessionId/execute-async')
  // @ApiOperation({ summary: 'Thực hiện import dữ liệu bất đồng bộ (cho file lớn)' })
  // @ApiResponse({ status: 200, description: 'Import được xếp hàng thành công' })
  // @ApiResponse({ status: 400, description: 'Dữ liệu chưa được validate hoặc có lỗi' })
  // async executeImportAsync(
  //   @Param('sessionId') sessionId: string,
  //   @Body() options?: { skipConflicts?: boolean; batchSize?: number }
  // ) {
  //   return this.importService.executeImportAsync(sessionId, options);
  // }

  @Get('import/:sessionId/progress')
  @ApiOperation({ summary: 'Lấy tiến trình import' })
  @ApiResponse({ status: 200, description: 'Tiến trình import' })
  @ApiResponse({ status: 404, description: 'Session không tồn tại' })
  async getImportProgress(@Param('sessionId') sessionId: string) {
    return this.importService.getImportProgress(sessionId);
  }

  @Post('import/:sessionId/pause')
  @ApiOperation({ summary: 'Tạm dừng import' })
  @ApiResponse({ status: 200, description: 'Import đã được tạm dừng' })
  @ApiResponse({ status: 404, description: 'Session không tồn tại' })
  async pauseImport(@Param('sessionId') sessionId: string) {
    return this.importService.pauseImport(sessionId);
  }

  @Post('import/:sessionId/resume')
  @ApiOperation({ summary: 'Tiếp tục import' })
  @ApiResponse({ status: 200, description: 'Import đã được tiếp tục' })
  @ApiResponse({ status: 404, description: 'Session không tồn tại' })
  async resumeImport(@Param('sessionId') sessionId: string) {
    return this.importService.resumeImport(sessionId);
  }

  @Post('import/:sessionId/cancel')
  @ApiOperation({ summary: 'Hủy import' })
  @ApiResponse({ status: 200, description: 'Import đã được hủy' })
  @ApiResponse({ status: 404, description: 'Session không tồn tại' })
  async cancelImport(@Param('sessionId') sessionId: string) {
    return this.importService.cancelImport(sessionId);
  }

  @Get('import/system-health')
  @ApiOperation({ summary: 'Lấy thông tin sức khỏe hệ thống import' })
  @ApiResponse({ status: 200, description: 'Thông tin hệ thống' })
  async getSystemHealth() {
    return this.importService.getSystemHealth();
  }

  @Get('import/background-job/:jobId/status')
  @ApiOperation({ summary: 'Lấy trạng thái background job' })
  @ApiResponse({ status: 200, description: 'Trạng thái job' })
  @ApiResponse({ status: 404, description: 'Job không tồn tại' })
  async getBackgroundJobStatus(@Param('jobId') jobId: string) {
    return this.importService.getBackgroundJobStatus(jobId);
  }

  @Post('import/background-job/:jobId/cancel') 
  @ApiOperation({ summary: 'Hủy background job' })
  @ApiResponse({ status: 200, description: 'Job đã được hủy' })
  @ApiResponse({ status: 404, description: 'Job không tồn tại' })
  async cancelBackgroundJob(@Param('jobId') jobId: string) {
    return this.importService.cancelBackgroundJob(jobId);
  }

  @Get(':id/roles')
  @ApiOperation({ summary: 'Get user roles' })
  async getUserRoles(
    @Param('id') userId: string,
    @Query('organizationId') organizationId?: string
  ) {
    return this.rolesService.getUserRoles(userId, organizationId);
  }

  @Post(':id/assign-role')
  @ApiOperation({ summary: 'Assign role to user' })
  async assignUserRole(
    @Param('id') userId: string,
    @Body() assignRoleDto: { roleId: string; organizationId?: string }
  ) {
    return this.rolesService.assignUserRole(
      userId,
      assignRoleDto.roleId,
      assignRoleDto.organizationId
    );
  }

  @Get('import/queue-status')
  @ApiOperation({ summary: 'Lấy trạng thái hàng đợi import' })
  @ApiResponse({ status: 200, description: 'Trạng thái hàng đợi' })
  async getQueueStatus() {
    return this.importService.getQueueStatus();
  }
}
