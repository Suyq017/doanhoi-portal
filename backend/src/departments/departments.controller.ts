import { Controller, Get, Post, Body, Patch, Param, Delete, Query, Res, UseInterceptors, UploadedFile } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiConsumes } from '@nestjs/swagger';
import { FileInterceptor } from '@nestjs/platform-express';
import { Response } from 'express';
import { DepartmentsService } from './departments.service';
import { ImportService } from './services/import.service';
import { CreateDepartmentDto } from './dto/create-department.dto';
import { UpdateDepartmentDto } from './dto/update-department.dto';
import { QueryDepartmentDto } from './dto/query-department.dto';

@ApiTags('departments')
@Controller('departments')
export class DepartmentsController {
  constructor(
    private readonly departmentsService: DepartmentsService,
    private readonly importService: ImportService,
  ) {}

  @Post()
  @ApiOperation({ summary: 'Tạo đơn vị mới' })
  @ApiResponse({ status: 201, description: 'Đơn vị đã được tạo thành công' })
  @ApiResponse({ status: 400, description: 'Dữ liệu không hợp lệ' })
  create(@Body() createDepartmentDto: CreateDepartmentDto) {
    return this.departmentsService.create(createDepartmentDto);
  }

  @Get()
  @ApiOperation({ summary: 'Lấy danh sách đơn vị' })
  @ApiResponse({ status: 200, description: 'Danh sách đơn vị' })
  findAll(@Query() query: QueryDepartmentDto) {
    return this.departmentsService.findAll(query);
  }

  @Get('template')
  @ApiOperation({ summary: 'Tải file mẫu import đơn vị' })
  @ApiResponse({ status: 200, description: 'File mẫu Excel' })
  async downloadTemplate(@Res() res: Response) {
    const templateBuffer = await this.importService.generateTemplate();
    
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename="departments_template.xlsx"');
    res.send(templateBuffer);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Lấy thông tin chi tiết đơn vị' })
  @ApiResponse({ status: 200, description: 'Thông tin đơn vị' })
  @ApiResponse({ status: 404, description: 'Không tìm thấy đơn vị' })
  findOne(@Param('id') id: string) {
    return this.departmentsService.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Cập nhật thông tin đơn vị' })
  @ApiResponse({ status: 200, description: 'Đơn vị đã được cập nhật' })
  @ApiResponse({ status: 404, description: 'Không tìm thấy đơn vị' })
  update(@Param('id') id: string, @Body() updateDepartmentDto: UpdateDepartmentDto) {
    return this.departmentsService.update(id, updateDepartmentDto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Xóa đơn vị' })
  @ApiResponse({ status: 200, description: 'Đơn vị đã được xóa' })
  @ApiResponse({ status: 404, description: 'Không tìm thấy đơn vị' })
  @ApiResponse({ status: 400, description: 'Không thể xóa đơn vị có người dùng' })
  remove(@Param('id') id: string) {
    return this.departmentsService.remove(id);
  }

  // Import endpoints
  @Post('import/upload')
  @ApiOperation({ summary: 'Upload file Excel để import đơn vị' })
  @ApiResponse({ status: 200, description: 'File được upload và parse thành công' })
  @ApiResponse({ status: 400, description: 'File không hợp lệ hoặc lỗi parse' })
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
  @ApiResponse({ status: 200, description: 'Kết quả import' })
  @ApiResponse({ status: 400, description: 'Dữ liệu chưa được validate hoặc lỗi import' })
  @ApiResponse({ status: 404, description: 'Session không tồn tại' })
  async executeImport(
    @Param('sessionId') sessionId: string,
    @Body() options?: { skipConflicts?: boolean }
  ) {
    return this.importService.executeImport(sessionId, options);
  }

  @Get('import/:sessionId/status')
  @ApiOperation({ summary: 'Lấy trạng thái import session' })
  @ApiResponse({ status: 200, description: 'Thông tin session' })
  @ApiResponse({ status: 404, description: 'Session không tồn tại' })
  async getImportStatus(@Param('sessionId') sessionId: string) {
    return this.importService.getSessionStatus(sessionId);
  }
}
