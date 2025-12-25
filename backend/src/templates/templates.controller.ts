import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  Query,
  Request,
  BadRequestException,
} from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import {
  ApiTags,
  ApiOperation,
  ApiConsumes,
  ApiBody,
  ApiBearerAuth,
} from "@nestjs/swagger";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { TemplatesService } from "./templates.service";
import {
  CreateTemplateDto,
  UpdateTemplateDto,
  ConfigureFieldsDto,
} from "./dto";
import {
  ErrorMessages,
  SuccessMessages,
} from "../common/constants/error-messages";

@ApiTags("Templates")
@ApiBearerAuth()
@Controller("templates")
@UseGuards(JwtAuthGuard)
export class TemplatesController {
  constructor(private readonly templatesService: TemplatesService) {}

  @Post("upload")
  @ApiOperation({ summary: "Upload a new Word template" })
  @ApiConsumes("multipart/form-data")
  @ApiBody({
    schema: {
      type: "object",
      properties: {
        file: { type: "string", format: "binary" },
        name: { type: "string" },
        description: { type: "string" },
        organizationId: { type: "string" },
      },
    },
  })
  @UseInterceptors(FileInterceptor("file"))
  async uploadTemplate(
    @UploadedFile() file: Express.Multer.File,
    @Body() dto: CreateTemplateDto,
    @Request() req: any,
  ) {
    if (!file) {
      throw new BadRequestException(ErrorMessages.TEMPLATE_FILE_REQUIRED);
    }

    return this.templatesService.uploadTemplate(file, dto, req.user.id);
  }

  @Post("parse")
  @ApiOperation({
    summary: "Parse Word template to extract placeholders (without saving)",
  })
  @ApiConsumes("multipart/form-data")
  @ApiBody({
    schema: {
      type: "object",
      properties: {
        file: { type: "string", format: "binary" },
      },
    },
  })
  @UseInterceptors(FileInterceptor("file"))
  async parseTemplate(@UploadedFile() file: Express.Multer.File) {
    if (!file) {
      throw new BadRequestException(ErrorMessages.TEMPLATE_FILE_REQUIRED);
    }

    if (!file.originalname.endsWith(".docx")) {
      throw new BadRequestException(ErrorMessages.TEMPLATE_ONLY_DOCX);
    }

    return this.templatesService.parseTemplate(file.buffer);
  }

  @Put(":id/configure-fields")
  @ApiOperation({ summary: "Configure fields for a template" })
  async configureFields(
    @Param("id") id: string,
    @Body() dto: ConfigureFieldsDto,
  ) {
    return this.templatesService.configureFields(id, dto);
  }

  @Get()
  @ApiOperation({ summary: "Get all templates with pagination and filters" })
  async findAll(
    @Query("status") status?: string,
    @Query("search") search?: string,
    @Query("page") page: number = 1,
    @Query("limit") limit: number = 10,
  ) {
    return this.templatesService.findAll(status, search, page, limit);
  }

  @Get(":id")
  @ApiOperation({ summary: "Get template by ID" })
  async findOne(@Param("id") id: string) {
    return this.templatesService.findOne(id);
  }

  @Put(":id")
  @ApiOperation({ summary: "Update template" })
  async update(@Param("id") id: string, @Body() dto: UpdateTemplateDto) {
    return this.templatesService.update(id, dto);
  }

  @Delete(":id")
  @ApiOperation({ summary: "Delete template" })
  async delete(@Param("id") id: string) {
    await this.templatesService.delete(id);
    return { message: SuccessMessages.TEMPLATE_DELETED };
  }
}
