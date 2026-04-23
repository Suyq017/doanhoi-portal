import {
  Controller,
  Post,
  Body,
  Param,
  Res,
  HttpStatus,
  HttpException,
} from "@nestjs/common";
import { Response } from "express";
import { ApiTags, ApiOperation, ApiResponse, ApiParam } from "@nestjs/swagger";
import { ExportService } from "./export.service";
import { ExportRequestDto, ExportResponseDto } from "./dto/export-request.dto";

@ApiTags("Export")
@Controller("export")
export class ExportController {
  constructor(private readonly exportService: ExportService) {}

  @Post("users")
  @ApiOperation({
    summary: "Xuất danh sách người dùng",
    description: "Xuất danh sách tất cả người dùng theo các trường được chọn",
  })
  @ApiResponse({
    status: 200,
    description: "File Excel được tạo thành công",
    type: ExportResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: "Yêu cầu không hợp lệ",
  })
  @ApiResponse({
    status: 404,
    description: "Không có dữ liệu để xuất",
  })
  async exportUsers(
    @Body() exportRequest: ExportRequestDto,
    @Res() res: Response,
  ) {
    try {
      const buffer = await this.exportService.exportUsers(exportRequest);
      const fileName = this.exportService.generateFileName(
        "danh_sach_nguoi_dung",
      );

      res.setHeader(
        "Content-Type",
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      );
      res.setHeader(
        "Content-Disposition",
        `attachment; filename="${fileName}"`,
      );
      res.setHeader("Content-Length", buffer.length);

      res.send(buffer);
    } catch (error) {
      throw new HttpException(
        {
          success: false,
          error: error.message || "Có lỗi xảy ra khi xuất file",
        },
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  @Post("organizations/:organizationId/members")
  @ApiOperation({
    summary: "Xuất danh sách thành viên tổ chức",
    description:
      "Xuất danh sách thành viên của một tổ chức theo các trường được chọn",
  })
  @ApiParam({
    name: "organizationId",
    description: "ID của tổ chức",
    type: "string",
  })
  @ApiResponse({
    status: 200,
    description: "File Excel được tạo thành công",
    type: ExportResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: "Yêu cầu không hợp lệ",
  })
  @ApiResponse({
    status: 404,
    description: "Không tìm thấy tổ chức hoặc không có thành viên nào",
  })
  async exportOrganizationMembers(
    @Param("organizationId") organizationId: string,
    @Body() exportRequest: ExportRequestDto,
    @Res() res: Response,
  ) {
    try {
      const buffer = await this.exportService.exportOrganizationMembers(
        organizationId,
        exportRequest,
      );

      // Get organization name for filename
      const fileName = this.exportService.generateFileName(
        "danh_sach_thanh_vien",
        "organization", // We could get the actual org name from the service
      );

      res.setHeader(
        "Content-Type",
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      );
      res.setHeader(
        "Content-Disposition",
        `attachment; filename="${fileName}"`,
      );
      res.setHeader("Content-Length", buffer.length);

      res.send(buffer);
    } catch (error) {
      const status = error.message.includes("Không tìm thấy")
        ? HttpStatus.NOT_FOUND
        : HttpStatus.BAD_REQUEST;

      throw new HttpException(
        {
          success: false,
          error: error.message || "Có lỗi xảy ra khi xuất file",
        },
        status,
      );
    }
  }

  @Post("payment-assignments/:campaignId")
  @ApiOperation({
    summary: "Xuất danh sách phân công đóng phí",
    description:
      "Xuất danh sách phân công đóng phí của một đợt thu phí theo các trường được chọn",
  })
  @ApiParam({
    name: "campaignId",
    description: "ID của đợt thu phí",
    type: "string",
  })
  @ApiResponse({
    status: 200,
    description: "File Excel được tạo thành công",
    type: ExportResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: "Yêu cầu không hợp lệ",
  })
  @ApiResponse({
    status: 404,
    description: "Không tìm thấy đợt thu phí hoặc không có phân công nào",
  })
  async exportPaymentAssignments(
    @Param("campaignId") campaignId: string,
    @Body() exportRequest: ExportRequestDto,
    @Res() res: Response,
  ) {
    try {
      const buffer = await this.exportService.exportPaymentAssignments(
        campaignId,
        exportRequest,
      );

      // Generate filename for payment assignments
      const fileName = this.exportService.generateFileName(
        "danh_sach_phan_cong",
        "payment_assignments",
      );

      res.setHeader(
        "Content-Type",
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      );
      res.setHeader(
        "Content-Disposition",
        `attachment; filename="${fileName}"`,
      );
      res.setHeader("Content-Length", buffer.length);

      res.send(buffer);
    } catch (error) {
      const status = error.message.includes("Không tìm thấy")
        ? HttpStatus.NOT_FOUND
        : HttpStatus.BAD_REQUEST;

      throw new HttpException(
        {
          success: false,
          error: error.message || "Có lỗi xảy ra khi xuất file",
        },
        status,
      );
    }
  }
}
