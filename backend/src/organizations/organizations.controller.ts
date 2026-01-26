import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  UseInterceptors,
  UploadedFile,
  Res,
  BadRequestException,
  UseGuards,
  Request,
} from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiConsumes,
  ApiBody,
} from "@nestjs/swagger";
import { Response } from "express";
import { OrganizationsService } from "./organizations.service";
import { OrganizationImportService } from "./services/import.service";
import { OrganizationBatchImportService } from "./services/batch-import.service";
import { CreateOrganizationDto } from "./dto/create-organization.dto";
import { UpdateOrganizationDto } from "./dto/update-organization.dto";
import { BulkRemoveMembersDto } from "./dto/bulk-remove-members.dto";
import { BatchImportMembersDto } from "./dto/batch-import-members.dto";
import { OrganizationType } from "../entities/organization.entity";
import { UserOrgRole } from "../entities/user-organization.entity";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";

@ApiTags("organizations")
@Controller("organizations")
export class OrganizationsController {
  constructor(
    private readonly organizationsService: OrganizationsService,
    private readonly importService: OrganizationImportService,
    private readonly batchImportService: OrganizationBatchImportService,
  ) {}

  @Post()
  @ApiOperation({ summary: "Tạo tổ chức mới" })
  @ApiResponse({ status: 201, description: "Tổ chức đã được tạo thành công" })
  create(@Body() createOrganizationDto: CreateOrganizationDto) {
    return this.organizationsService.create(createOrganizationDto);
  }

  @Get()
  @ApiOperation({ summary: "Lấy danh sách tổ chức" })
  @ApiResponse({ status: 200, description: "Danh sách tổ chức" })
  findAll() {
    return this.organizationsService.findAll();
  }

  @Get("tree")
  @ApiOperation({ summary: "Lấy cây tổ chức" })
  @ApiResponse({ status: 200, description: "Cây tổ chức" })
  findTree(
    @Query("maxDepth") maxDepth?: number,
    @Query("type") type?: string,
    @Query("code") code?: string,
  ) {
    // ✅ NEW: Support depth limit and specific org query
    if (type && code) {
      // Get tree starting from specific org
      return this.organizationsService.findTreeByTypeCode(
        type,
        code,
        maxDepth ? parseInt(String(maxDepth)) : 2,
      );
    }

    if (maxDepth) {
      // Get tree with depth limit
      return this.organizationsService.findTreeWithDepth(
        parseInt(String(maxDepth)),
      );
    }

    // Default: Original behavior (load full tree)
    return this.organizationsService.findTree();
  }

  /**
   * ✅ NEW: Get organization by type/code with optional children
   */
  @Get("by-type-code/:type/:code")
  @ApiOperation({
    summary: "Lấy tổ chức theo loại và mã với tùy chọn load children",
  })
  @ApiParam({ name: "type", description: "Loại tổ chức" })
  @ApiParam({ name: "code", description: "Mã tổ chức" })
  @ApiResponse({ status: 200, description: "Thông tin tổ chức" })
  @ApiResponse({ status: 404, description: "Không tìm thấy tổ chức" })
  getOrganizationByTypeCode(
    @Param("type") type: string,
    @Param("code") code: string,
    @Query("includeChildren") includeChildren?: string,
    @Query("maxDepth") maxDepth?: string,
  ) {
    return this.organizationsService.findByTypeCodeWithChildren(
      type,
      code,
      includeChildren === "true",
      maxDepth ? parseInt(maxDepth) : 1,
    );
  }

  @Get("stats")
  @ApiOperation({ summary: "Lấy thống kê về tổ chức" })
  @ApiResponse({
    status: 200,
    description: "Thống kê số lượng tổ chức và thành viên",
    schema: {
      type: "object",
      properties: {
        doanCount: { type: "number", description: "Số lượng tổ chức Đoàn" },
        hoiCount: { type: "number", description: "Số lượng tổ chức Hội" },
        clbCount: { type: "number", description: "Số lượng Câu lạc bộ" },
        totalMembers: { type: "number", description: "Tổng số thành viên" },
      },
    },
  })
  getStats() {
    return this.organizationsService.getStats();
  }

  @Get("type/:type")
  @ApiOperation({ summary: "Lấy tổ chức theo loại" })
  @ApiParam({ name: "type", enum: OrganizationType })
  @ApiResponse({ status: 200, description: "Danh sách tổ chức theo loại" })
  findByType(@Param("type") type: OrganizationType) {
    return this.organizationsService.findByType(type);
  }
  @Get("accessible")
  @UseGuards(JwtAuthGuard)
  @ApiOperation({
    summary: "Lấy danh sách tổ chức mà user có quyền payment-campaigns.create",
  })
  @ApiResponse({
    status: 200,
    description: "Danh sách tổ chức có quyền tạo payment campaigns",
  })
  async getAccessibleOrganizations(@Request() req: any) {
    try {
      console.log(
        "[OrganizationsController] GET /organizations/accessible called",
      );
      console.log("[OrganizationsController] Request user:", req.user);

      const userId = req.user?.id;
      if (!userId) {
        console.error(
          "[OrganizationsController] User not authenticated - no user ID",
        );
        throw new BadRequestException("User not authenticated");
      }

      console.log(
        `[OrganizationsController] Getting organizations with payment-campaigns.create permission for user ID: ${userId}`,
      );
      const result =
        await this.organizationsService.getAccessibleOrganizations(userId);
      console.log(
        `[OrganizationsController] Successfully returned ${result.length} organizations with create permission`,
      );

      return result;
    } catch (error) {
      console.error(
        "[OrganizationsController] Error in getAccessibleOrganizations:",
        error,
      );
      throw error;
    }
  }

  @Get("user-primary-organization")
  @UseGuards(JwtAuthGuard)
  @ApiOperation({
    summary: "Get user's primary organization from user_organizations table",
    description:
      "Returns the first active organization the user belongs to (for auto-setting in activity forms)",
  })
  @ApiResponse({
    status: 200,
    description: "User primary organization",
    schema: {
      type: "object",
      properties: {
        organization: {
          type: "object",
          nullable: true,
          description: "User primary organization or null if not found",
        },
      },
    },
  })
  async getUserPrimaryOrganization(@Request() req: any) {
    const userId = req.user.id;
    return this.organizationsService.getUserPrimaryOrganization(userId);
  }

  @Get("ctxh-activity-viewable")
  @UseGuards(JwtAuthGuard)
  @ApiOperation({
    summary: "Get organizations user can view CTXH activities from",
    description:
      "Returns organizations based on ctxh.activities.view permission",
  })
  async getCtxhActivityViewableOrganizations(@Request() req: any) {
    const userId = req.user.id;
    const organizations =
      await this.organizationsService.getCtxhActivityViewableOrganizations(
        userId,
      );
    return { organizations };
  }

  @Get("ctxh-activity-viewable/search")
  @UseGuards(JwtAuthGuard)
  @ApiOperation({
    summary:
      "Search organizations user can view CTXH activities for (Level 1 & 2 only)",
    description:
      "Returns paginated organizations based on ctxh.activities.view permission, excluding level 3",
  })
  async searchCtxhActivityViewableOrganizations(
    @Request() req: any,
    @Query("search") search?: string,
    @Query("page") page?: number,
    @Query("limit") limit?: number,
  ) {
    const userId = req.user.id;
    return this.organizationsService.searchCtxhActivityViewableOrganizations(
      userId,
      search,
      page,
      limit,
    );
  }

  @Get(":id/children")
  @ApiOperation({ summary: "Lấy danh sách tổ chức con trực tiếp" })
  @ApiParam({ name: "id", description: "ID của tổ chức cha" })
  @ApiResponse({ status: 200, description: "Danh sách tổ chức con" })
  @ApiResponse({ status: 404, description: "Không tìm thấy tổ chức" })
  findChildren(@Param("id") id: string) {
    return this.organizationsService.findChildren(id);
  }

  @Get(":id")
  @ApiOperation({ summary: "Lấy thông tin chi tiết tổ chức" })
  @ApiResponse({ status: 200, description: "Thông tin tổ chức" })
  @ApiResponse({ status: 404, description: "Không tìm thấy tổ chức" })
  findOne(@Param("id") id: string) {
    return this.organizationsService.findOne(id);
  }

  @Patch(":id")
  @ApiOperation({ summary: "Cập nhật thông tin tổ chức" })
  @ApiResponse({ status: 200, description: "Tổ chức đã được cập nhật" })
  update(
    @Param("id") id: string,
    @Body() updateOrganizationDto: UpdateOrganizationDto,
  ) {
    return this.organizationsService.update(id, updateOrganizationDto);
  }

  @Delete(":id")
  @ApiOperation({ summary: "Xóa tổ chức" })
  @ApiResponse({ status: 200, description: "Tổ chức đã được xóa" })
  remove(@Param("id") id: string) {
    return this.organizationsService.remove(id);
  }

  @Post(":id/members/bulk-add")
  @ApiOperation({
    summary: "Thêm nhiều thành viên vào tổ chức theo danh sách mã sinh viên",
  })
  @ApiParam({ name: "id", description: "ID của tổ chức" })
  @ApiBody({
    schema: {
      type: "object",
      properties: {
        userCodes: {
          type: "array",
          items: { type: "string" },
          description: "Danh sách mã số sinh viên",
        },
      },
    },
  })
  @ApiResponse({
    status: 201,
    description: "Kết quả import thành viên",
    schema: {
      type: "object",
      properties: {
        success: { type: "number", description: "Số lượng thành công" },
        failed: { type: "number", description: "Số lượng thất bại" },
        errors: {
          type: "array",
          items: {
            type: "object",
            properties: {
              row: { type: "number" },
              code: { type: "string" },
              message: { type: "string" },
            },
          },
        },
      },
    },
  })
  async bulkAddMembersByCode(
    @Param("id") organizationId: string,
    @Body("userCodes") userCodes: string[],
  ) {
    return this.organizationsService.bulkAddMembersByCode(
      organizationId,
      userCodes,
    );
  }

  @Post(":id/members/:userId")
  @ApiOperation({ summary: "Thêm thành viên vào tổ chức" })
  @ApiResponse({ status: 201, description: "Thành viên đã được thêm" })
  addMember(
    @Param("id") id: string,
    @Param("userId") userId: string,
    @Body("role") role: UserOrgRole = UserOrgRole.MEMBER,
  ) {
    return this.organizationsService.addMember(id, userId, role);
  }

  @Post(":id/members/:userId/with-parents")
  @ApiOperation({
    summary: "Thêm thành viên vào tổ chức và tất cả tổ chức cha",
  })
  @ApiResponse({
    status: 201,
    description: "Thành viên đã được thêm vào tổ chức và các tổ chức cha",
  })
  addMemberWithParents(
    @Param("id") id: string,
    @Param("userId") userId: string,
    @Body("role") role: UserOrgRole = UserOrgRole.MEMBER,
  ) {
    return this.organizationsService.addMemberWithParents(id, userId, role);
  }
  @Delete(":id/members/bulk-remove")
  @ApiOperation({ summary: "Loại bỏ nhiều thành viên khỏi tổ chức cùng lúc" })
  @ApiResponse({
    status: 200,
    description: "Các thành viên đã được loại bỏ thành công",
  })
  @ApiResponse({ status: 400, description: "Dữ liệu không hợp lệ" })
  @ApiResponse({
    status: 404,
    description: "Tổ chức hoặc một số thành viên không tồn tại",
  })
  async bulkRemoveMembers(
    @Param("id") organizationId: string,
    @Body() bulkRemoveMembersDto: BulkRemoveMembersDto,
  ) {
    try {
      await this.organizationsService.bulkRemoveMembers(
        organizationId,
        bulkRemoveMembersDto.userIds,
      );
      return {
        message: `Đã loại bỏ thành công ${bulkRemoveMembersDto.userIds.length} thành viên khỏi tổ chức`,
        removedCount: bulkRemoveMembersDto.userIds.length,
      };
    } catch (error) {
      console.error("Error in bulkRemoveMembers controller:", error);
      throw error;
    }
  }
  @Delete(":id/members/:userId")
  @ApiOperation({ summary: "Xóa thành viên khỏi tổ chức" })
  @ApiResponse({ status: 200, description: "Thành viên đã được xóa" })
  removeMember(@Param("id") id: string, @Param("userId") userId: string) {
    return this.organizationsService.removeMember(id, userId);
  }

  @Delete(":id/members/:userId/safely")
  @ApiOperation({
    summary:
      "Xóa thành viên khỏi tổ chức một cách an toàn (kiểm tra tổ chức cha)",
  })
  @ApiResponse({ status: 200, description: "Thành viên đã được xóa an toàn" })
  removeMemberSafely(@Param("id") id: string, @Param("userId") userId: string) {
    return this.organizationsService.removeMemberSafely(id, userId);
  }

  @Get(":id/members")
  @ApiOperation({ summary: "Lấy danh sách thành viên của tổ chức" })
  @ApiResponse({
    status: 200,
    description: "Danh sách thành viên với phân trang",
  })
  getMembers(
    @Param("id") id: string,
    @Query("page") page: string = "1",
    @Query("limit") limit: string = "10",
  ) {
    const pageNum = parseInt(page, 10) || 1;
    const limitNum = parseInt(limit, 10) || 10;
    return this.organizationsService.getMembers(id, pageNum, limitNum);
  }

  // ❌ REMOVED: Old getOrganizationByTypeAndCode - Now handled by new endpoint with query params above

  @Post(":code_org/member/:code_user")
  @ApiOperation({ summary: "Thêm thành viên vào tổ chức theo code" })
  @ApiParam({ name: "code_org", description: "Mã của tổ chức" })
  @ApiParam({ name: "code_user", description: "Mã của người dùng" })
  @ApiResponse({
    status: 201,
    description: "Thành viên đã được thêm vào tổ chức",
  })
  @ApiResponse({
    status: 404,
    description: "Không tìm thấy tổ chức hoặc người dùng",
  })
  @ApiResponse({
    status: 400,
    description: "Người dùng đã là thành viên của tổ chức",
  })
  addMemberBySimpleCode(
    @Param("code_org") orgCode: string,
    @Param("code_user") userCode: string,
  ) {
    return this.organizationsService.addMemberBySimpleCode(orgCode, userCode);
  }

  @Post("validate-codes")
  @ApiOperation({ summary: "Kiểm tra danh sách mã tổ chức có tồn tại không" })
  @ApiBody({
    schema: {
      type: "object",
      properties: {
        codes: {
          type: "array",
          items: { type: "string" },
          description: "Danh sách mã tổ chức cần kiểm tra",
        },
      },
    },
  })
  @ApiResponse({
    status: 200,
    description: "Kết quả kiểm tra",
    schema: {
      type: "object",
      properties: {
        validCodes: {
          type: "array",
          items: { type: "string" },
          description: "Danh sách mã hợp lệ",
        },
        invalidCodes: {
          type: "array",
          items: { type: "string" },
          description: "Danh sách mã không tồn tại",
        },
      },
    },
  })
  async validateOrganizationCodes(@Body("codes") codes: string[]) {
    return this.organizationsService.validateOrganizationCodes(codes);
  }

  // Import Members Endpoints
  @Post("members/import/upload")
  @ApiOperation({ summary: "Upload file Excel để import thành viên" })
  @ApiConsumes("multipart/form-data")
  @ApiResponse({
    status: 200,
    description: "File đã được upload và xử lý thành công",
  })
  @ApiResponse({ status: 400, description: "File không hợp lệ" })
  @UseInterceptors(FileInterceptor("file"))
  async uploadImportFile(
    @UploadedFile() file: Express.Multer.File,
    @Query("level") level: string = "3",
    @Query("organizationId") organizationId?: string,
  ) {
    const levelNum = parseInt(level);
    if (![2, 3].includes(levelNum)) {
      throw new BadRequestException("Level phải là 2 hoặc 3");
    }
    return this.importService.uploadFile(file, organizationId, levelNum);
  }

  @Get("import/:sessionId/validate")
  @ApiOperation({ summary: "Validate dữ liệu import" })
  @ApiResponse({ status: 200, description: "Kết quả validation" })
  @ApiResponse({ status: 404, description: "Session không tồn tại" })
  async validateImportData(@Param("sessionId") sessionId: string) {
    return this.importService.validateData(sessionId);
  }

  @Post("import/:sessionId/execute")
  @ApiOperation({ summary: "Thực hiện import thành viên" })
  @ApiResponse({ status: 200, description: "Kết quả import" })
  @ApiResponse({ status: 404, description: "Session không tồn tại" })
  async executeImport(
    @Param("sessionId") sessionId: string,
    @Body() options?: { skipConflicts?: boolean },
  ) {
    return this.importService.executeImport(sessionId, options);
  }

  @Get("import/:sessionId/status")
  @ApiOperation({ summary: "Lấy trạng thái import session" })
  @ApiResponse({ status: 200, description: "Thông tin session" })
  @ApiResponse({ status: 404, description: "Session không tồn tại" })
  async getImportStatus(@Param("sessionId") sessionId: string) {
    return this.importService.getSessionStatus(sessionId);
  }

  @Get("/template/:level")
  @ApiOperation({ summary: "Tải file mẫu Excel cho import" })
  @ApiParam({ name: "level", description: "Cấp độ tổ chức" })
  @ApiResponse({ status: 200, description: "File mẫu Excel" })
  async downloadTemplate(@Param("level") level: string, @Res() res: Response) {
    const levelNum = parseInt(level);

    const templateBuffer = await this.importService.generateTemplate(levelNum);
    const filename = `organizationsss_level${levelNum}_template.xlsx`;

    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    );
    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
    res.send(templateBuffer);
  }

  // NEW: Client-Side Validation Endpoint (Fast Bulk Validation)
  @Post("members/validate")
  @ApiOperation({
    summary: "Validate dữ liệu thành viên với bulk queries (nhanh)",
  })
  @ApiBody({
    schema: {
      type: "object",
      properties: {
        data: {
          type: "array",
          description: "Danh sách thành viên cần validate",
          items: {
            type: "object",
            properties: {
              studentCode: { type: "string" },
              classOrUnitCode: { type: "string", nullable: true },
            },
          },
        },
        organizationId: {
          type: "string",
          description: "ID tổ chức đích (optional cho Level 2)",
        },
        level: {
          type: "number",
          enum: [2, 3],
          description: "Level tổ chức (2 hoặc 3)",
        },
      },
      required: ["data", "level"], // organizationId is now optional
    },
  })
  @ApiResponse({
    status: 200,
    description: "Kết quả validation với errors/warnings",
  })
  @ApiResponse({ status: 400, description: "Dữ liệu không hợp lệ" })
  async validateMembers(
    @Body()
    body: {
      data: Array<{ studentCode: string; classOrUnitCode?: string }>;
      organizationId?: string; // Now optional for Level 2
      level: 2 | 3;
    },
  ) {
    const { data, organizationId, level } = body;

    if (!data || !Array.isArray(data)) {
      throw new BadRequestException("data phải là một array");
    }

    if (![2, 3].includes(level)) {
      throw new BadRequestException("level phải là 2 hoặc 3");
    }

    // Use validation service with bulk queries
    return this.importService.validateMemberData(data, organizationId, level);
  }

  // NEW: Batch Import Endpoint for Client-Side Processing
  @Post("members/import/batch")
  @ApiOperation({
    summary: "Import thành viên theo batch với client-side processing",
  })
  @ApiBody({ type: BatchImportMembersDto })
  @ApiResponse({ status: 200, description: "Kết quả import batch" })
  @ApiResponse({ status: 400, description: "Dữ liệu không hợp lệ" })
  async importMembersBatch(@Body() importData: BatchImportMembersDto) {
    return this.batchImportService.processBatch(
      importData.members,
      importData.batchInfo,
      importData.options,
    );
  }

  @Get("import/batch/:sessionId/status")
  @ApiOperation({ summary: "Lấy trạng thái của batch import session" })
  @ApiParam({ name: "sessionId", description: "ID của session import" })
  @ApiResponse({ status: 200, description: "Thông tin session" })
  @ApiResponse({ status: 404, description: "Session không tồn tại" })
  async getBatchImportStatus(@Param("sessionId") sessionId: string) {
    return this.batchImportService.getSessionSummary(sessionId);
  }
}
