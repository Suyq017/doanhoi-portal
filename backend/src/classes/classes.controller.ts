import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  Res,
  UseInterceptors,
  UploadedFile,
} from "@nestjs/common";
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiConsumes,
} from "@nestjs/swagger";
import { FileInterceptor } from "@nestjs/platform-express";
import { Response } from "express";
import { ClassesService } from "./classes.service";
import { ImportService } from "./services/import.service";
import { ClassBatchImportService } from "./services/batch-import.service";
import { CreateClassDto } from "./dto/create-class.dto";
import { UpdateClassDto } from "./dto/update-class.dto";
import { QueryClassDto } from "./dto/query-class.dto";
import { BulkDeleteClassesDto } from "./dto/bulk-delete-classes.dto";
import { BatchImportClassesDto } from "./dto/batch-import-classes.dto";

@ApiTags("classes")
@Controller("classes")
export class ClassesController {
  constructor(
    private readonly classesService: ClassesService,
    private readonly importService: ImportService,
    private readonly batchImportService: ClassBatchImportService,
  ) {}

  @Post()
  @ApiOperation({ summary: "Tạo lớp học mới" })
  @ApiResponse({ status: 201, description: "Lớp học đã được tạo thành công" })
  @ApiResponse({ status: 400, description: "Dữ liệu không hợp lệ" })
  create(@Body() createClassDto: CreateClassDto) {
    return this.classesService.create(createClassDto);
  }

  @Get()
  @ApiOperation({ summary: "Lấy danh sách lớp học" })
  @ApiResponse({ status: 200, description: "Danh sách lớp học" })
  findAll(@Query() query: QueryClassDto) {
    return this.classesService.findAll(query);
  }

  @Get("template")
  @ApiOperation({ summary: "Tải file mẫu import lớp học" })
  @ApiResponse({ status: 200, description: "File mẫu Excel" })
  async downloadTemplate(@Res() res: Response) {
    const templateBuffer = await this.importService.generateTemplate();

    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    );
    res.setHeader(
      "Content-Disposition",
      'attachment; filename="classes_template.xlsx"',
    );
    res.send(templateBuffer);
  }

  @Get(":id")
  @ApiOperation({ summary: "Lấy thông tin chi tiết lớp học" })
  @ApiResponse({ status: 200, description: "Thông tin lớp học" })
  @ApiResponse({ status: 404, description: "Không tìm thấy lớp học" })
  findOne(@Param("id") id: string) {
    return this.classesService.findOne(id);
  }

  @Patch(":id")
  @ApiOperation({ summary: "Cập nhật thông tin lớp học" })
  @ApiResponse({ status: 200, description: "Lớp học đã được cập nhật" })
  @ApiResponse({ status: 404, description: "Không tìm thấy lớp học" })
  update(@Param("id") id: string, @Body() updateClassDto: UpdateClassDto) {
    return this.classesService.update(id, updateClassDto);
  }

  @Delete("bulk")
  @ApiOperation({ summary: "Xóa nhiều lớp học" })
  @ApiResponse({ status: 200, description: "Lớp học đã được xóa thành công" })
  @ApiResponse({
    status: 400,
    description: "Không thể xóa lớp học có sinh viên",
  })
  async bulkDelete(@Body() bulkDeleteDto: BulkDeleteClassesDto) {
    await this.classesService.bulkDelete(bulkDeleteDto.ids);
    return {
      message: `Đã xóa thành công ${bulkDeleteDto.ids.length} lớp học`,
      deletedCount: bulkDeleteDto.ids.length,
    };
  }

  @Delete(":id")
  @ApiOperation({ summary: "Xóa lớp học" })
  @ApiResponse({ status: 200, description: "Lớp học đã được xóa" })
  @ApiResponse({ status: 404, description: "Không tìm thấy lớp học" })
  @ApiResponse({
    status: 400,
    description: "Không thể xóa lớp học có sinh viên",
  })
  remove(@Param("id") id: string) {
    return this.classesService.remove(id);
  }

  // Import endpoints
  @Post("import/upload")
  @ApiOperation({ summary: "Upload file Excel để import lớp học" })
  @ApiResponse({
    status: 200,
    description: "File được upload và parse thành công",
  })
  @ApiResponse({ status: 400, description: "File không hợp lệ hoặc lỗi parse" })
  @ApiConsumes("multipart/form-data")
  @UseInterceptors(FileInterceptor("file"))
  async uploadImportFile(@UploadedFile() file: Express.Multer.File) {
    return this.importService.uploadFile(file);
  }

  @Get("import/:sessionId/validate")
  @ApiOperation({ summary: "Validate dữ liệu import" })
  @ApiResponse({ status: 200, description: "Kết quả validation" })
  @ApiResponse({ status: 404, description: "Session không tồn tại" })
  async validateImportData(@Param("sessionId") sessionId: string) {
    return this.importService.validateData(sessionId);
  }

  @Post("import/:sessionId/execute")
  @ApiOperation({ summary: "Thực hiện import dữ liệu" })
  @ApiResponse({ status: 200, description: "Kết quả import" })
  @ApiResponse({
    status: 400,
    description: "Dữ liệu chưa được validate hoặc lỗi import",
  })
  @ApiResponse({ status: 404, description: "Session không tồn tại" })
  async executeImport(
    @Param("sessionId") sessionId: string,
    @Body() options?: { skipConflicts?: boolean },
  ) {
    return this.importService.executeImport(sessionId, options);
  }

  @Get("import/:sessionId/status")
  @ApiOperation({ summary: "Lấy trạng thái import session" })
  @ApiResponse({ status: 200, description: "Trạng thái session" })
  @ApiResponse({ status: 404, description: "Session không tồn tại" })
  async getImportStatus(@Param("sessionId") sessionId: string) {
    return this.importService.getSessionStatus(sessionId);
  }

  // New batch import endpoints for client-side processing
  @Post("import/batch")
  @ApiOperation({
    summary: "Import lớp học theo batch với client-side processing",
  })
  @ApiResponse({ status: 200, description: "Kết quả import batch" })
  @ApiResponse({
    status: 400,
    description: "Dữ liệu không hợp lệ hoặc lỗi import",
  })
  async importClassesBatch(@Body() importData: BatchImportClassesDto) {
    return this.batchImportService.processBatch(
      importData.classes,
      importData.batchInfo,
      importData.options,
    );
  }

  @Get("import/batch/:sessionId/status")
  @ApiOperation({ summary: "Lấy trạng thái import batch theo sessionId" })
  @ApiResponse({ status: 200, description: "Trạng thái session import" })
  async getBatchImportStatus(@Param("sessionId") sessionId: string) {
    return this.batchImportService.getSessionSummary(sessionId);
  }
}
