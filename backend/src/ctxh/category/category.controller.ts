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
  Req,
  HttpStatus,
} from "@nestjs/common";
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiQuery,
  ApiBearerAuth,
} from "@nestjs/swagger";
import { CategoryService } from "./category.service";
import { CreateCategoryDto } from "./dto/create-category.dto";
import { UpdateCategoryDto } from "./dto/update-category.dto";
import { CategoryResponseDto } from "./dto/category-response.dto";
import { JwtAuthGuard } from "../../auth/guards/jwt-auth.guard";
import { PermissionGuard } from "../../auth/guards/permission.guard";
import { RequirePermissions } from "../../auth/decorators/permissions.decorator";

@ApiTags("CTXH Categories")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionGuard)
@Controller("ctxh/categories")
export class CategoryController {
  constructor(private readonly categoryService: CategoryService) {}

  @Get()
  @RequirePermissions("ctxh.categories.view")
  @ApiOperation({ summary: "Lấy danh sách danh mục CTXH" })
  @ApiQuery({
    name: "search",
    required: false,
    description: "Tìm kiếm theo tên danh mục",
  })
  @ApiQuery({ name: "page", required: false, description: "Số trang" })
  @ApiQuery({
    name: "limit",
    required: false,
    description: "Số lượng mỗi trang",
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: "Danh sách danh mục thành công",
    schema: {
      type: "object",
      properties: {
        data: { type: "array", items: { type: "object" } },
        total: { type: "number" },
        page: { type: "number" },
        limit: { type: "number" },
        totalPages: { type: "number" },
        hasNextPage: { type: "boolean" },
        hasPrevPage: { type: "boolean" },
      },
    },
  })
  async findAll(
    @Query("search") search?: string,
    @Query("page") page?: number,
    @Query("limit") limit?: number,
  ) {
    return this.categoryService.findAll({ search, page, limit });
  }

  @Get(":id")
  @RequirePermissions("ctxh.categories.view")
  @ApiOperation({ summary: "Lấy chi tiết danh mục CTXH" })
  @ApiResponse({
    status: HttpStatus.OK,
    description: "Chi tiết danh mục thành công",
    type: CategoryResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: "Danh mục không tồn tại",
  })
  async findOne(@Param("id") id: string): Promise<CategoryResponseDto> {
    return this.categoryService.findOne(id);
  }

  @Post()
  @RequirePermissions("ctxh.categories.create")
  @ApiOperation({ summary: "Tạo danh mục CTXH mới" })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: "Tạo danh mục thành công",
    type: CategoryResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.CONFLICT,
    description: "Danh mục đã tồn tại",
  })
  async create(
    @Body() createCategoryDto: CreateCategoryDto,
    @Req() req: any,
  ): Promise<CategoryResponseDto> {
    const createdBy = req.user.id; // Assuming user info from JWT
    return this.categoryService.create(createCategoryDto, createdBy);
  }

  @Patch(":id")
  @RequirePermissions("ctxh.categories.update")
  @ApiOperation({ summary: "Cập nhật danh mục CTXH" })
  @ApiResponse({
    status: HttpStatus.OK,
    description: "Cập nhật danh mục thành công",
    type: CategoryResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: "Danh mục không tồn tại",
  })
  @ApiResponse({
    status: HttpStatus.CONFLICT,
    description: "Tên danh mục đã tồn tại",
  })
  async update(
    @Param("id") id: string,
    @Body() updateCategoryDto: UpdateCategoryDto,
    @Req() req: any,
  ): Promise<CategoryResponseDto> {
    const updatedBy = req.user.id;
    return this.categoryService.update(id, updateCategoryDto, updatedBy);
  }

  @Delete(":id")
  @RequirePermissions("ctxh.categories.delete")
  @ApiOperation({ summary: "Xóa mềm danh mục CTXH" })
  @ApiResponse({
    status: HttpStatus.OK,
    description: "Xóa danh mục thành công",
    schema: {
      type: "object",
      properties: {
        message: {
          type: "string",
          example: "Xóa danh mục thành công",
        },
      },
    },
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: "Danh mục không tồn tại",
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: "Không thể xóa danh mục có hoạt động",
  })
  async remove(
    @Param("id") id: string,
    @Req() req: any,
  ): Promise<{ message: string }> {
    const deletedBy = req.user.id;
    await this.categoryService.softDelete(id, deletedBy);
    return { message: "Xóa danh mục thành công" };
  }

  @Post(":id/restore")
  @RequirePermissions("ctxh.categories.create")
  @ApiOperation({ summary: "Khôi phục danh mục CTXH đã xóa" })
  @ApiResponse({
    status: HttpStatus.OK,
    description: "Khôi phục danh mục thành công",
    type: CategoryResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: "Danh mục đã xóa không tồn tại",
  })
  @ApiResponse({
    status: HttpStatus.CONFLICT,
    description: "Không thể khôi phục do tên đã tồn tại",
  })
  async restore(@Param("id") id: string): Promise<CategoryResponseDto> {
    return this.categoryService.restore(id);
  }
}
