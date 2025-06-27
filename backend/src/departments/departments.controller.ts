import { Controller, Get, Post, Body, Patch, Param, Delete, Query, Res, UseInterceptors, UploadedFile } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiConsumes } from '@nestjs/swagger';
import { FileInterceptor } from '@nestjs/platform-express';
import { Response } from 'express';
import * as XLSX from 'xlsx';
import { DepartmentsService } from './departments.service';
import { CreateDepartmentDto } from './dto/create-department.dto';
import { UpdateDepartmentDto } from './dto/update-department.dto';
import { QueryDepartmentDto } from './dto/query-department.dto';

@ApiTags('departments')
@Controller('departments')
export class DepartmentsController {
  constructor(private readonly departmentsService: DepartmentsService) {}

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
    // Create Excel template data
    const templateData = [
      ['Tên đơn vị', 'Mã đơn vị', 'Mô tả', 'Trạng thái (true/false)'],
      ['Khoa Khoa học máy tính', 'CSE', 'Khoa đào tạo về khoa học máy tính', 'true'],
      ['Khoa Điện tử', 'EE', 'Khoa đào tạo về điện tử', 'true']
    ];

    // Create a new workbook and worksheet
    const workbook = XLSX.utils.book_new();
    const worksheet = XLSX.utils.aoa_to_sheet(templateData);

    // Set column widths
    worksheet['!cols'] = [
      { width: 30 }, // Tên đơn vị
      { width: 15 }, // Mã đơn vị
      { width: 40 }, // Mô tả
      { width: 20 }  // Trạng thái
    ];

    // Add the worksheet to the workbook
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Departments');

    // Generate Excel file buffer
    const excelBuffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });

    // Set response headers
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename="departments_template.xlsx"');
    
    // Send the Excel file
    res.send(excelBuffer);
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

  @Post('import')
  @ApiOperation({ summary: 'Import danh sách đơn vị từ file' })
  @ApiResponse({ status: 200, description: 'Kết quả import' })
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(FileInterceptor('file'))
  async importDepartments(
    @UploadedFile() file: any,
    @Body() body: any
  ) {
    // For demonstration, return a mock successful response
    return {
      total: 10,
      success: 8,
      failed: 2,
      skipped: 0,
      errors: [
        'Row 3: Department name is required',
        'Row 7: Invalid department code format'
      ],
      warnings: []
    };
  }
}
