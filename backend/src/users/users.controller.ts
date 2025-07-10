import { Controller, Get, Post, Body, Patch, Param, Delete, Query, UseGuards, UseInterceptors, UploadedFile, Res } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiConsumes } from '@nestjs/swagger';
import { FileInterceptor } from '@nestjs/platform-express';
import { Response } from 'express';
import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { QueryUserDto } from './dto/query-user.dto';
import { BulkDeleteUserDto } from './dto/bulk-delete-user.dto';
import { ImportService } from './services/import.service';

@ApiTags('users')
@Controller('users')
export class UsersController {
  constructor(
    private readonly usersService: UsersService,
    private readonly importService: ImportService
  ) { }

  @Post()
  @ApiOperation({ summary: 'Tạo người dùng mới' })
  @ApiResponse({ status: 201, description: 'Người dùng đã được tạo thành công' })
  @ApiResponse({ status: 400, description: 'Dữ liệu không hợp lệ' })
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
  @ApiOperation({ summary: 'Download template Excel để import users' })
  @ApiResponse({ status: 200, description: 'File template Excel' })
  async downloadTemplate(@Res() res: Response) {
    const buffer = await this.importService.generateTemplate();

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename="users_import_template.xlsx"');
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
  @ApiOperation({ summary: 'Upload file Excel để import users' })
  @ApiResponse({ status: 200, description: 'File đã được upload thành công' })
  @ApiResponse({ status: 400, description: 'File không hợp lệ' })
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(FileInterceptor('file'))
  async uploadImportFile(@UploadedFile() file: Express.Multer.File) {
    return this.importService.uploadFile(file);
  }

  @Get('import/:sessionId/validate')
  @ApiOperation({ summary: 'Validate dữ liệu import' })
  @ApiResponse({ status: 200, description: 'Kết quả validation' })
  @ApiResponse({ status: 404, description: 'Session không tồn tại' })
  async validateImportData(@Param('sessionId') sessionId: string) {
    return this.importService.validateData(sessionId);
  }

  @Post('import/:sessionId/execute')
  @ApiOperation({ summary: 'Thực hiện import dữ liệu' })
  @ApiResponse({ status: 200, description: 'Import thành công' })
  @ApiResponse({ status: 400, description: 'Dữ liệu chưa được validate hoặc có lỗi' })
  async executeImport(
    @Param('sessionId') sessionId: string,
    @Body() options?: { skipConflicts?: boolean; batchSize?: number }
  ) {
    return this.importService.executeImport(sessionId, options);
  }

  @Post('import/:sessionId/execute-async')
  @ApiOperation({ summary: 'Thực hiện import dữ liệu bất đồng bộ (cho file lớn)' })
  @ApiResponse({ status: 200, description: 'Import được xếp hàng thành công' })
  @ApiResponse({ status: 400, description: 'Dữ liệu chưa được validate hoặc có lỗi' })
  async executeImportAsync(
    @Param('sessionId') sessionId: string,
    @Body() options?: { skipConflicts?: boolean; batchSize?: number }
  ) {
    return this.importService.executeImportAsync(sessionId, options);
  }

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

  @Get('import/queue-status')
  @ApiOperation({ summary: 'Lấy trạng thái hàng đợi import' })
  @ApiResponse({ status: 200, description: 'Trạng thái hàng đợi' })
  async getQueueStatus() {
    return this.importService.getQueueStatus();
  }
}
