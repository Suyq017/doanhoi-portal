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
  UseInterceptors,
  UploadedFile,
  BadRequestException,
  Res,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiConsumes,
  ApiBody,
  ApiQuery,
} from '@nestjs/swagger';
import { FileInterceptor } from '@nestjs/platform-express';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { PermissionGuard } from '../../auth/guards/permission.guard';
import { RequirePermissions } from '../../auth/decorators/permissions.decorator';
import { ActivitiesService } from './activities.service';
import { ParticipationService } from './services/participation.service';
import { ExcelService } from './services/excel.service';
import { CreateActivityDto } from './dto/create-activity.dto';
import { UpdateActivityDto } from './dto/update-activity.dto';
import { AddStudentDto } from './dto/add-student.dto';
import { GradeParticipantsDto } from './dto/grade-participants.dto';

@ApiTags('CTXH Activities')
@ApiBearerAuth()
@Controller('ctxh/activities')
@UseGuards(JwtAuthGuard, PermissionGuard)
export class ActivitiesController {
  constructor(
    private readonly activitiesService: ActivitiesService,
    private readonly participationService: ParticipationService,
    private readonly excelService: ExcelService,
  ) { }

  @Get('participants/template')
  @ApiOperation({
    summary: 'Tải template Excel để upload sinh viên (generic)',
    description: 'Tạo và download file Excel mẫu để upload danh sách sinh viên tham gia hoạt động CTXH'
  })
  @ApiResponse({
    status: 200,
    description: 'Tải template thành công',
    content: {
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': {
        schema: {
          type: 'string',
          format: 'binary'
        }
      }
    }
  })
  async downloadGenericParticipantsTemplate(@Res() res) {
    const buffer = await this.excelService.generateParticipantsTemplate();

    res.set({
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': 'attachment; filename="template-danh-sach-sinh-vien.xlsx"',
    });

    res.send(buffer);
  }

  @Post()
  @ApiOperation({
    summary: 'Tạo hoạt động CTXH mới',
    description: 'Tạo hoạt động mới với thông tin chi tiết, danh mục và tổ chức'
  })
  @ApiResponse({
    status: 201,
    description: 'Tạo hoạt động thành công',
    type: Object // Replace with ActivityResponseDto if you have it
  })
  @ApiResponse({
    status: 404,
    description: 'Danh mục không tồn tại'
  })
  @ApiResponse({
    status: 409,
    description: 'Tên hoạt động đã tồn tại trong tổ chức'
  })
  @ApiResponse({
    status: 403,
    description: 'Không có quyền tạo hoạt động cho tổ chức này'
  })
  @RequirePermissions('ctxh.activities.create')
  create(@Body() createActivityDto: CreateActivityDto, @Request() req) {
    return this.activitiesService.create(createActivityDto, req.user.id);
  }

  @Get()
  @ApiOperation({
    summary: 'Lấy danh sách hoạt động CTXH',
    description: 'Phân trang mặc định: page=1, limit=10. Có thể filter theo organizationId và/hoặc categoryId. Nếu không truyền filter nào sẽ lấy tất cả hoạt động.'
  })
  @ApiQuery({ name: 'page', required: false, description: 'Số trang (mặc định: 1)' })
  @ApiQuery({ name: 'limit', required: false, description: 'Số items mỗi trang (mặc định: 10)' })
  @ApiQuery({ name: 'category_id', required: false, description: 'Filter theo danh mục (tùy chọn)' })
  @ApiQuery({ name: 'organization_id', required: false, description: 'Filter theo tổ chức (tùy chọn)' })
  @ApiQuery({ name: 'status', required: false, description: 'Filter theo trạng thái (DRAFT, ACTIVE, COMPLETED, CANCELLED)' })
  @ApiQuery({ name: 'search', required: false, description: 'Tìm kiếm theo tên hoạt động' })
  @ApiQuery({ name: 'start_date', required: false, description: 'Filter theo ngày bắt đầu (YYYY-MM-DD)' })
  @ApiQuery({ name: 'end_date', required: false, description: 'Filter theo ngày kết thúc (YYYY-MM-DD)' })
  @ApiResponse({
    status: 200,
    description: 'Lấy danh sách thành công',
    schema: {
      type: 'object',
      properties: {
        data: { type: 'array', items: { type: 'object' } },
        total: { type: 'number', example: 100 },
        page: { type: 'number', example: 1 },
        limit: { type: 'number', example: 10 },
        totalPages: { type: 'number', example: 10 },
        hasNextPage: { type: 'boolean', example: true },
        hasPrevPage: { type: 'boolean', example: false }
      }
    }
  })
  @RequirePermissions('ctxh.activities.view')
  findAll(
    @Request() req,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('category_id') categoryId?: string,
    @Query('organization_id') organizationId?: string,
    @Query('status') status?: string,
    @Query('search') search?: string,
    @Query('start_date') startDate?: string,
    @Query('end_date') endDate?: string,
  ) {
    return this.activitiesService.findAll({
      page: page || 1,        // Mặc định page = 1
      limit: limit || 10,     // Mặc định limit = 10
      category_id: categoryId,
      organization_id: organizationId,
      status: status,
      search: search,
      start_date: startDate,
      end_date: endDate,
      user_id: req.user.id,   // Thêm user ID để filter theo organizations
    });
  }

  @Get(':id')
  @ApiOperation({
    summary: 'Lấy chi tiết hoạt động CTXH',
    description: 'Lấy thông tin chi tiết của một hoạt động cụ thể'
  })
  @ApiResponse({
    status: 200,
    description: 'Lấy chi tiết thành công'
  })
  @ApiResponse({
    status: 404,
    description: 'Hoạt động không tồn tại'
  })
  @RequirePermissions('ctxh.activities.view')
  findOne(@Param('id') id: string) {
    return this.activitiesService.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({
    summary: 'Cập nhật hoạt động CTXH',
    description: 'Cập nhật thông tin hoạt động như tên, mô tả, ngày tháng, trạng thái'
  })
  @ApiResponse({
    status: 200,
    description: 'Cập nhật hoạt động thành công'
  })
  @ApiResponse({
    status: 404,
    description: 'Hoạt động không tồn tại'
  })
  @ApiResponse({
    status: 409,
    description: 'Tên hoạt động đã tồn tại trong tổ chức'
  })
  @RequirePermissions('ctxh.activities.update')
  update(
    @Param('id') id: string,
    @Body() updateActivityDto: UpdateActivityDto,
    @Request() req,
  ) {
    return this.activitiesService.update(id, updateActivityDto, req.user.id);
  }

  @Delete(':id')
  @ApiOperation({
    summary: 'Xóa mềm hoạt động CTXH',
    description: 'Xóa mềm hoạt động (có thể khôi phục sau)'
  })
  @ApiResponse({
    status: 200,
    description: 'Xóa hoạt động thành công',
    schema: {
      type: 'object',
      properties: {
        message: {
          type: 'string',
          example: 'Xóa hoạt động thành công'
        }
      }
    }
  })
  @ApiResponse({
    status: 404,
    description: 'Hoạt động không tồn tại'
  })
  @RequirePermissions('ctxh.activities.delete')
  remove(@Param('id') id: string, @Request() req) {
    return this.activitiesService.remove(id, req.user.id);
  }

  @Post(':id/restore')
  @ApiOperation({
    summary: 'Khôi phục hoạt động CTXH đã xóa',
    description: 'Khôi phục hoạt động từ trạng thái đã xóa mềm'
  })
  @ApiResponse({
    status: 200,
    description: 'Khôi phục hoạt động thành công'
  })
  @ApiResponse({
    status: 404,
    description: 'Hoạt động không tồn tại hoặc chưa bị xóa'
  })
  @ApiResponse({
    status: 409,
    description: 'Không thể khôi phục do tên đã tồn tại'
  })
  @RequirePermissions('ctxh.activities.create')
  restore(@Param('id') id: string, @Request() req) {
    return this.activitiesService.restore(id, req.user.id);
  }

  // Participant Management
  @Get(':id/debug')
  async debugActivity(@Param('id') id: string) {
    const activity = await this.activitiesService.findOne(id);
    return {
      id: activity.id,
      name: activity.name,
      total_days: activity.total_days,
      start_date: activity.start_date,
      end_date: activity.end_date,
      status: activity.status
    };
  }

  @Get(':id/participants')
  @ApiOperation({
    summary: 'Lấy danh sách sinh viên tham gia hoạt động',
    description: 'Lấy danh sách tất cả sinh viên đã đăng ký tham gia hoạt động'
  })
  @ApiResponse({
    status: 200,
    description: 'Lấy danh sách tham gia thành công'
  })
  @ApiResponse({
    status: 404,
    description: 'Hoạt động không tồn tại'
  })
  @RequirePermissions('ctxh.activities.view')
  getParticipants(@Param('id') id: string) {
    return this.participationService.findByActivity(id);
  }

  @Post(':id/participants/batch')
  @ApiOperation({
    summary: 'Thêm sinh viên theo batch (Client-side processing)',
    description: 'Nhận dữ liệu sinh viên đã được xử lý từ frontend và thêm vào hoạt động theo batch'
  })
  @ApiResponse({
    status: 200,
    description: 'Batch import thành công'
  })
  @ApiResponse({
    status: 400,
    description: 'Dữ liệu batch không hợp lệ'
  })
  @RequirePermissions('ctxh.activities.update', 'ctxh.activities.manage_participants')
  async addParticipantsBatch(
    @Param('id') id: string,
    @Body() batchData: { students: Array<{ student_code: string }> },
    @Request() req,
  ) {
    const results = {
      successful: [],
      failed: [],
      total: batchData.students.length
    };

    for (const student of batchData.students) {
      try {
        const participant = await this.participationService.addStudent(
          id,
          student.student_code,
          req.user.id,
        );
        results.successful.push({
          student_code: student.student_code,
          participant_id: participant.id
        });
      } catch (error) {
        results.failed.push({
          student_code: student.student_code,
          error: error.message
        });
      }
    }

    return results;
  }

  @Post(':id/participants/grade-batch')
  @ApiOperation({
    summary: 'Chấm điểm theo batch (Client-side processing)',
    description: 'Nhận dữ liệu chấm điểm đã được xử lý từ frontend và cập nhật điểm theo batch'
  })
  @ApiResponse({
    status: 200,
    description: 'Batch grading thành công'
  })
  @ApiResponse({
    status: 400,
    description: 'Dữ liệu batch không hợp lệ'
  })
  @RequirePermissions('ctxh.activities.update', 'ctxh.activities.manage_participants')
  async gradeParticipantsBatch(
    @Param('id') id: string,
    @Body() batchData: {
      participants: Array<{
        participation_id: string;
        actual_days: number;
        note?: string;
      }>
    },
    @Request() req,
  ) {
    // Validate activity status
    const activity = await this.activitiesService.findOne(id);
    if (activity.status !== 'ACTIVE' && activity.status !== 'COMPLETED') {
      throw new BadRequestException(`Chỉ có thể chấm điểm khi hoạt động ở trạng thái ACTIVE hoặc COMPLETED (hiện tại: ${activity.status})`);
    }

    const maxDays = activity.total_days;
    const results = {
      successful: [],
      failed: [],
      total: batchData.participants.length
    };

    for (const participant of batchData.participants) {
      try {
        // Validate days
        if (participant.actual_days > maxDays) {
          throw new Error(`Số ngày CTXH vượt quá giới hạn (tối đa ${maxDays} ngày)`);
        }

        const gradedParticipant = await this.participationService.gradeParticipation(
          participant.participation_id,
          participant.actual_days,
          participant.note || '',
          req.user.id,
        );

        results.successful.push({
          participation_id: participant.participation_id,
          actual_days: participant.actual_days,
          graded_participant: gradedParticipant
        });
      } catch (error) {
        results.failed.push({
          participation_id: participant.participation_id,
          error: error.message
        });
      }
    }

    return results;
  }

  @Post(':id/participants')
  @ApiOperation({
    summary: 'Thêm sinh viên vào hoạt động (thủ công)',
    description: 'Thêm một sinh viên vào hoạt động bằng cách nhập mã số sinh viên. Chỉ cho phép thêm vào hoạt động có trạng thái ACTIVE.'
  })
  @ApiResponse({
    status: 201,
    description: 'Thêm sinh viên thành công'
  })
  @ApiResponse({
    status: 400,
    description: 'Hoạt động không ở trạng thái ACTIVE hoặc sinh viên đã tham gia'
  })
  @ApiResponse({
    status: 404,
    description: 'Hoạt động không tồn tại'
  })
  @ApiResponse({
    status: 409,
    description: 'Sinh viên đã tham gia hoạt động này'
  })
  @RequirePermissions('ctxh.activities.update', 'ctxh.activities.manage_participants')
  addStudent(
    @Param('id') id: string,
    @Body() addStudentDto: AddStudentDto,
    @Request() req,
  ) {
    return this.participationService.addStudent(
      id,
      addStudentDto.student_code,
      req.user.id,
    );
  }

  @Post(':id/participants/excel')
  @ApiOperation({
    summary: 'Upload danh sách sinh viên từ file Excel',
    description: 'Upload file Excel (.xlsx) chứa danh sách mã số sinh viên tham gia hoạt động. Chỉ cho phép upload vào hoạt động có trạng thái ACTIVE.'
  })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    description: 'File Excel chứa danh sách sinh viên',
    type: 'multipart/form-data',
    required: true,
    schema: {
      type: 'object',
      properties: {
        file: {
          type: 'string',
          format: 'binary',
          description: 'File Excel (.xlsx) với format: STT | Mã số SV'
        }
      }
    }
  })
  @ApiResponse({
    status: 201,
    description: 'Upload danh sách thành công'
  })
  @ApiResponse({
    status: 400,
    description: 'File không hợp lệ, format sai, hoặc hoạt động không ở trạng thái ACTIVE'
  })
  @ApiResponse({
    status: 404,
    description: 'Hoạt động không tồn tại'
  })
  @RequirePermissions('ctxh.activities.update', 'ctxh.activities.manage_participants')
  @UseInterceptors(FileInterceptor('file'))
  async uploadParticipants(
    @Param('id') id: string,
    @UploadedFile() file: Express.Multer.File,
    @Request() req,
  ) {
    if (!file) {
      throw new BadRequestException('File không được để trống');
    }

    const studentCodes = await this.excelService.processParticipantsExcel(file);
    return this.participationService.addMultipleStudents(
      id,
      studentCodes,
      req.user.id,
    );
  }

  @Post(':id/participants/grade')
  @ApiOperation({
    summary: 'Chấm điểm cho sinh viên tham gia',
    description: 'Chấm số ngày CTXH thực tế cho sinh viên sau khi hoàn thành hoạt động'
  })
  @ApiResponse({
    status: 200,
    description: 'Chấm điểm thành công'
  })
  @ApiResponse({
    status: 400,
    description: 'Dữ liệu chấm điểm không hợp lệ'
  })
  @ApiResponse({
    status: 404,
    description: 'Hoạt động hoặc sinh viên tham gia không tồn tại'
  })
  @RequirePermissions('ctxh.activities.update', 'ctxh.activities.manage_participants')
  async gradeParticipants(
    @Param('id') id: string,
    @Body() gradeDto: GradeParticipantsDto,
    @Request() req,
  ) {
    // Load activity để lấy total_days cho validation
    const activity = await this.activitiesService.findOne(id);

    // Kiểm tra trạng thái hoạt động
    if (activity.status !== 'ACTIVE' && activity.status !== 'COMPLETED') {
      throw new BadRequestException(`Chỉ có thể chấm điểm khi hoạt động ở trạng thái ACTIVE hoặc COMPLETED (hiện tại: ${activity.status})`);
    }

    if (!activity.total_days || activity.total_days <= 0) {
      throw new BadRequestException('Hoạt động chưa được cấu hình tổng số ngày CTXH hợp lệ');
    }

    const maxDays = activity.total_days;
    console.log(`Activity: ${activity.name}, Total Days: ${activity.total_days}, MaxDays for validation: ${maxDays}`);

    // Validate số ngày cho từng participant
    for (const participant of gradeDto.participants) {
      if (participant.actual_days > maxDays) {
        throw new BadRequestException(`Số ngày CTXH vượt quá giới hạn (tối đa ${maxDays} ngày)`);
      }
    }

    const results = Promise.all(
      gradeDto.participants.map((participant) =>
        this.participationService.gradeParticipation(
          participant.participation_id,
          participant.actual_days,
          participant.note || '',
          req.user.id,
        ),
      ),
    );

    return results;
  }

  @Post(':id/participants/grade-excel')
  @UseInterceptors(FileInterceptor('file'))
  @ApiOperation({
    summary: 'Chấm điểm CTXH từ file Excel',
    description: 'Upload file Excel đã điền số ngày CTXH để chấm điểm hàng loạt cho sinh viên'
  })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    description: 'File Excel chấm điểm đã xuất từ hệ thống',
    type: 'multipart/form-data',
    required: true,
    schema: {
      type: 'object',
      properties: {
        file: {
          type: 'string',
          format: 'binary',
          description: 'File Excel (.xlsx) chứa điểm số CTXH'
        }
      }
    }
  })
  @ApiResponse({
    status: 200,
    description: 'Chấm điểm thành công',
    schema: {
      type: 'object',
      properties: {
        successful: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              studentCode: { type: 'string' },
              message: { type: 'string' }
            }
          }
        },
        failed: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              studentCode: { type: 'string' },
              error: { type: 'string' }
            }
          }
        }
      }
    }
  })
  @ApiResponse({
    status: 400,
    description: 'File không hợp lệ hoặc format sai'
  })
  @ApiResponse({
    status: 404,
    description: 'Hoạt động không tồn tại'
  })
  @RequirePermissions('ctxh.activities.update', 'ctxh.activities.manage_participants')
  async bulkGradeFromExcel(
    @Param('id') id: string,
    @UploadedFile() file: Express.Multer.File,
    @Request() req,
  ) {
    if (!file) {
      throw new BadRequestException('File không được để trống');
    }

    // Load activity để lấy total_days
    const activity = await this.activitiesService.findOne(id);

    // Kiểm tra trạng thái hoạt động
    if (activity.status !== 'ACTIVE' && activity.status !== 'COMPLETED') {
      throw new BadRequestException(`Chỉ có thể chấm điểm khi hoạt động ở trạng thái ACTIVE hoặc COMPLETED (hiện tại: ${activity.status})`);
    }

    if (!activity.total_days || activity.total_days <= 0) {
      throw new BadRequestException('Hoạt động chưa được cấu hình tổng số ngày CTXH hợp lệ');
    }

    const maxDays = activity.total_days;

    const gradingData = await this.excelService.processGradingExcel(file, maxDays, id);
    return this.participationService.bulkGradeFromExcel(
      id,
      gradingData,
      req.user.id,
    );
  }

  @Delete(':id/participants/:participationId')
  @ApiOperation({
    summary: 'Xóa sinh viên khỏi hoạt động',
    description: 'Xóa một sinh viên khỏi danh sách tham gia hoạt động'
  })
  @ApiResponse({
    status: 200,
    description: 'Xóa sinh viên thành công'
  })
  @ApiResponse({
    status: 404,
    description: 'Hoạt động hoặc sinh viên tham gia không tồn tại'
  })
  @RequirePermissions('ctxh.activities.update', 'ctxh.activities.manage_participants')
  removeParticipant(
    @Param('id') id: string,
    @Param('participationId') participationId: string,
    @Request() req,
  ) {
    return this.participationService.removeParticipant(participationId, req.user.id);
  }

  @Get(':id/participants/grading-template')
  @ApiOperation({
    summary: 'Tải template chấm điểm với danh sách sinh viên tham gia',
    description: 'Xuất file Excel danh sách sinh viên đã tham gia hoạt động với cột trống để điền số ngày CTXH và ghi chú'
  })
  @ApiResponse({
    status: 200,
    description: 'Tải template chấm điểm thành công',
    content: {
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': {
        schema: {
          type: 'string',
          format: 'binary'
        }
      }
    }
  })
  @ApiResponse({
    status: 404,
    description: 'Hoạt động không tồn tại'
  })
  async downloadGradingTemplate(@Param('id') id: string, @Res() res) {
    const activity = await this.activitiesService.findOne(id);
    const participants = await this.participationService.findByActivity(id);

    const buffer = await this.excelService.generateGradingTemplate(activity, participants);

    // Tạo filename dựa trên tên hoạt động
    const activityName = activity.name.replace(/[^a-zA-Z0-9]/g, '-');
    const filename = `template-cham-diem-${activityName}-${Date.now()}.xlsx`;

    res.set({
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="${filename}"`,
    });

    res.send(buffer);
  }

  // Upload endpoints
  @Post(':id/participants/upload')
  @UseInterceptors(FileInterceptor('file'))
  @ApiOperation({
    summary: 'Upload file Excel sinh viên cho hoạt động',
    description: 'Upload file Excel chứa danh sách sinh viên để tham gia hoạt động'
  })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    description: 'File Excel chứa danh sách sinh viên',
    type: 'multipart/form-data',
    schema: {
      type: 'object',
      properties: {
        file: {
          type: 'string',
          format: 'binary',
          description: 'File Excel (.xlsx hoặc .xls)'
        }
      }
    }
  })
  async uploadParticipantsFile(
    @Param('id') activityId: string,
    @UploadedFile() file: Express.Multer.File,
    @Request() req
  ) {
    try {
      if (!file) {
        throw new BadRequestException('Vui lòng chọn file Excel để upload');
      }

      // Process file and return session info
      const studentCodes = await this.excelService.processParticipantsExcel(file);
      const { validUsers, invalidCodes } = await this.excelService.validateStudentCodes(studentCodes);

      // Create mock session for compatibility
      const sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

      // Store session data temporarily (in production, use Redis or database)
      const sessionData = {
        sessionId,
        fileName: file.originalname,
        totalRows: studentCodes.length,
        validUsers,
        invalidCodes,
        activityId
      };

      // For now, store in memory (should be Redis/DB in production)
      if (!global.uploadSessions) {
        global.uploadSessions = new Map();
      }
      global.uploadSessions.set(sessionId, sessionData);

      console.log(`Created session ${sessionId} with ${studentCodes.length} student codes`);
      console.log(`Valid users: ${validUsers.length}, Invalid codes: ${invalidCodes.length}`);

      return {
        sessionId,
        fileName: file.originalname,
        totalRows: studentCodes.length,
        message: 'File uploaded and processed successfully'
      };
    } catch (error) {
      throw new BadRequestException(`Lỗi xử lý file: ${error.message}`);
    }
  }

  @Post(':id/participants/grading-upload')
  @UseInterceptors(FileInterceptor('file'))
  @ApiOperation({
    summary: 'Upload file Excel chấm điểm cho hoạt động',
    description: 'Upload file Excel chứa kết quả chấm điểm cho sinh viên'
  })
  @ApiConsumes('multipart/form-data')
  async uploadGradingFile(
    @Param('id') activityId: string,
    @UploadedFile() file: Express.Multer.File,
    @Request() req
  ) {
    try {
      if (!file) {
        throw new BadRequestException('Vui lòng chọn file Excel để upload');
      }

      // Load activity để lấy total_days
      const activity = await this.activitiesService.findOne(activityId);

      // Kiểm tra trạng thái hoạt động
      if (activity.status !== 'ACTIVE' && activity.status !== 'COMPLETED') {
        throw new BadRequestException(`Chỉ có thể chấm điểm khi hoạt động ở trạng thái ACTIVE hoặc COMPLETED (hiện tại: ${activity.status})`);
      }

      if (!activity.total_days || activity.total_days <= 0) {
        throw new BadRequestException('Hoạt động chưa được cấu hình tổng số ngày CTXH hợp lệ');
      }

      const maxDays = activity.total_days;
      console.log(`Grading Upload - Activity: ${activity.name}, Total Days: ${activity.total_days}, MaxDays: ${maxDays}`);

      // Process grading file với maxDays validation và participant checking
      console.log(`Calling processGradingExcel with activityId: ${activityId}`);
      const gradingData = await this.excelService.processGradingExcel(file, maxDays, activityId);
      console.log(`processGradingExcel returned ${gradingData.length} rows`);

      // Create mock session for grading
      const sessionId = `grading_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

      const sessionData = {
        sessionId,
        fileName: file.originalname,
        totalRows: gradingData.length,
        gradingData,
        activityId,
        type: 'grading'
      };

      if (!global.uploadSessions) {
        global.uploadSessions = new Map();
      }
      global.uploadSessions.set(sessionId, sessionData);

      return {
        sessionId,
        fileName: file.originalname,
        totalRows: gradingData.length,
        message: 'Grading file uploaded and processed successfully'
      };
    } catch (error) {
      throw new BadRequestException(`Lỗi xử lý file chấm điểm: ${error.message}`);
    }
  }

  @Get('import/:sessionId/validate')
  @ApiOperation({
    summary: 'Validate uploaded data',
    description: 'Validate the uploaded Excel data and return validation results'
  })
  async validateImportSession(@Param('sessionId') sessionId: string) {
    console.log(`Validating session: ${sessionId}`);
    console.log(`Available sessions: ${Array.from((global.uploadSessions || new Map()).keys()).join(', ')}`);

    if (!global.uploadSessions || !global.uploadSessions.has(sessionId)) {
      throw new BadRequestException('Session không tồn tại hoặc đã hết hạn');
    }

    const sessionData = global.uploadSessions.get(sessionId);

    if (sessionData.type === 'grading') {
      // Handle grading validation
      const validItems = sessionData.gradingData.filter(item => !item.errors || item.errors.length === 0);
      const invalidItems = sessionData.gradingData.filter(item => item.errors && item.errors.length > 0);

      const errors = invalidItems.map((item, index) => {
        const originalIndex = sessionData.gradingData.findIndex(data => data === item);
        return {
          row: originalIndex + 2, // +2 because header row + 0-based index
          column: 'Số ngày CTXH',
          message: `${item.studentCode} - ${item.actualDays} ngày CTXH (${item.errors.join(', ')})`,
          severity: 'error' as const
        };
      });

      // Chỉ hiển thị sinh viên hợp lệ trong preview
      // Lấy danh sách participants để có thông tin họ tên
      const participants = await this.participationService.findByActivity(sessionData.activityId);
      const participantMap = new Map(participants.map(p => [p.student_code, p]));

      const previewData = validItems.slice(0, 10).map((item, index) => {
        const participant = participantMap.get(item.studentCode);
        return {
          'Mã số sinh viên': item.studentCode,
          'Họ tên': participant?.student?.full_name || '',
          'Số ngày CTXH': item.actualDays,
          'Ghi chú': item.note || ''
        };
      });

      return {
        sessionId,
        isValid: invalidItems.length === 0,
        summary: {
          total: sessionData.totalRows,
          valid: validItems.length,
          invalid: invalidItems.length,
          duplicates: 0,
          conflicts: 0
        },
        errors,
        warnings: [],
        previewData
      };
    } else {
      // Handle student validation
      const errors = sessionData.invalidCodes.map((code, index) => ({
        row: index + 2,
        column: 'MSSV',
        message: `Không tìm thấy sinh viên với mã số: ${code}`,
        severity: 'error' as const
      }));

      return {
        sessionId,
        isValid: sessionData.invalidCodes.length === 0,
        summary: {
          total: sessionData.totalRows,
          valid: sessionData.validUsers.length,
          invalid: sessionData.invalidCodes.length,
          duplicates: 0,
          conflicts: 0
        },
        errors,
        warnings: [],
        previewData: sessionData.validUsers.slice(0, 10).map((user, index) => ({
          STT: index + 1,
          MSSV: user.code,
          'Họ tên': user.familyName && user.givenName
            ? `${user.familyName} ${user.givenName}`.trim()
            : user.fullName || 'N/A',
          Email: user.email || ''
        }))
      };
    }
  }

  @Post('import/:sessionId/execute')
  @ApiOperation({
    summary: 'Execute import with validated data',
    description: 'Execute the import process with the validated data'
  })
  async executeImport(
    @Param('sessionId') sessionId: string,
    @Body() options: { skipConflicts?: boolean } = {},
    @Request() req
  ) {
    if (!global.uploadSessions || !global.uploadSessions.has(sessionId)) {
      throw new BadRequestException('Session không tồn tại hoặc đã hết hạn');
    }

    const sessionData = global.uploadSessions.get(sessionId);

    try {
      let successCount = 0;
      const errors = [];

      if (sessionData.type === 'grading') {
        // Handle grading execution - chỉ process sinh viên hợp lệ
        const { gradingData, activityId } = sessionData;

        // Lọc chỉ lấy sinh viên hợp lệ (không có errors)
        const validGradingData = gradingData.filter(item => !item.errors || item.errors.length === 0);

        const result = await this.participationService.bulkGradeFromExcel(
          activityId,
          validGradingData,
          req.user.id
        );

        successCount = result.successful.length;
        errors.push(...result.failed.map(f => `${f.studentCode}: ${f.error}`));
      } else {
        // Handle student execution
        const { validUsers, activityId } = sessionData;

        for (const user of validUsers) {
          try {
            await this.participationService.addStudent(
              activityId,
              user.code,
              req.user.id
            );
            successCount++;
          } catch (error) {
            errors.push(`${user.code}: ${error.message}`);
          }
        }
      }

      // Clean up session
      global.uploadSessions.delete(sessionId);

      return {
        sessionId,
        success: errors.length === 0,
        importedCount: successCount,
        skippedCount: 0,
        failedCount: errors.length,
        errors,
        message: successCount > 0
          ? `Thành công ${sessionData.type === 'grading' ? 'chấm điểm' : 'thêm'} ${successCount} sinh viên`
          : `Không thể ${sessionData.type === 'grading' ? 'chấm điểm' : 'thêm'} sinh viên nào`
      };
    } catch (error) {
      throw new BadRequestException(`Lỗi khi xử lý: ${error.message}`);
    }
  }

  @Get(':id/export')
  @ApiOperation({
    summary: 'Xuất danh sách sinh viên để chấm điểm',
    description: 'Xuất file Excel danh sách sinh viên tham gia hoạt động với cột trống để điền số ngày CTXH'
  })
  @ApiResponse({
    status: 200,
    description: 'Xuất file thành công',
    content: {
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': {
        schema: {
          type: 'string',
          format: 'binary'
        }
      }
    }
  })
  @ApiResponse({
    status: 404,
    description: 'Hoạt động không tồn tại'
  })
  @RequirePermissions('ctxh.activities.view')
  async exportParticipants(@Param('id') id: string, @Res() res) {
    const activity = await this.activitiesService.findOne(id);
    const participants = await this.participationService.findByActivity(id);

    const buffer = await this.excelService.exportParticipants(activity, participants);

    // Tạo filename dựa trên tên hoạt động
    const activityName = activity.name.replace(/[^a-zA-Z0-9]/g, '-');
    const filename = `cham-diem-${activityName}-${Date.now()}.xlsx`;

    res.set({
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="${filename}"`,
    });

    res.send(buffer);
  }
}
