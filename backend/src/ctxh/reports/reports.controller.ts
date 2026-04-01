import { Controller, Get, Param, UseGuards } from "@nestjs/common";
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
} from "@nestjs/swagger";
import { JwtAuthGuard } from "../../auth/guards/jwt-auth.guard";
import { PermissionGuard } from "../../auth/guards/permission.guard";
import { RequirePermissions } from "../../auth/decorators/permissions.decorator";
import { ReportsService } from "./reports.service";

@ApiTags("CTXH Reports")
@ApiBearerAuth()
@Controller("ctxh/reports")
@UseGuards(JwtAuthGuard, PermissionGuard)
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @Get("student/:studentCode")
  @ApiOperation({
    summary: "Lấy báo cáo CTXH theo mã số sinh viên",
    description:
      "Lấy báo cáo tổng hợp hoạt động CTXH của sinh viên theo mã số sinh viên",
  })
  @ApiParam({
    name: "studentCode",
    description: "Mã số sinh viên (MSSV)",
    example: "2150001",
  })
  @ApiResponse({ status: 200, description: "Lấy báo cáo thành công" })
  @ApiResponse({
    status: 404,
    description: "Không tìm thấy sinh viên với mã số này",
  })
  getStudentReport(@Param("studentCode") studentCode: string) {
    return this.reportsService.getStudentReportByCode(studentCode);
  }

  @Get("system")
  @ApiOperation({ summary: "Lấy báo cáo tổng quan hệ thống CTXH" })
  @ApiResponse({ status: 200, description: "Lấy báo cáo thành công" })
  getSystemReport() {
    return this.reportsService.getSystemReport();
  }
}
