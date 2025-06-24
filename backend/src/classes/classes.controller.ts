import { Controller, Get, Post, Body, Patch, Param, Delete, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { ClassesService } from './classes.service';
import { CreateClassDto } from './dto/create-class.dto';
import { UpdateClassDto } from './dto/update-class.dto';
import { QueryClassDto } from './dto/query-class.dto';

@ApiTags('classes')
@Controller('classes')
export class ClassesController {
  constructor(private readonly classesService: ClassesService) {}

  @Post()
  @ApiOperation({ summary: 'Tạo lớp học mới' })
  @ApiResponse({ status: 201, description: 'Lớp học đã được tạo thành công' })
  @ApiResponse({ status: 400, description: 'Dữ liệu không hợp lệ' })
  create(@Body() createClassDto: CreateClassDto) {
    return this.classesService.create(createClassDto);
  }

  @Get()
  @ApiOperation({ summary: 'Lấy danh sách lớp học' })
  @ApiResponse({ status: 200, description: 'Danh sách lớp học' })
  findAll(@Query() query: QueryClassDto) {
    return this.classesService.findAll(query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Lấy thông tin chi tiết lớp học' })
  @ApiResponse({ status: 200, description: 'Thông tin lớp học' })
  @ApiResponse({ status: 404, description: 'Không tìm thấy lớp học' })
  findOne(@Param('id') id: string) {
    return this.classesService.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Cập nhật thông tin lớp học' })
  @ApiResponse({ status: 200, description: 'Lớp học đã được cập nhật' })
  @ApiResponse({ status: 404, description: 'Không tìm thấy lớp học' })
  update(@Param('id') id: string, @Body() updateClassDto: UpdateClassDto) {
    return this.classesService.update(id, updateClassDto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Xóa lớp học' })
  @ApiResponse({ status: 200, description: 'Lớp học đã được xóa' })
  @ApiResponse({ status: 404, description: 'Không tìm thấy lớp học' })
  @ApiResponse({ status: 400, description: 'Không thể xóa lớp học có sinh viên' })
  remove(@Param('id') id: string) {
    return this.classesService.remove(id);
  }
}
