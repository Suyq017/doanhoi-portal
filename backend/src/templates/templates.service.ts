import {
  Injectable,
  NotFoundException,
  BadRequestException,
  InternalServerErrorException,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
} from "@aws-sdk/client-s3";
import PizZip from "pizzip";
import { Template, TemplateStatus } from "../entities/template.entity";
import { TemplateField, FieldType } from "../entities/template-field.entity";
import { AwsS3ConfigService } from "../aws-config/aws-s3-config.service";
import {
  CreateTemplateDto,
  UpdateTemplateDto,
  ConfigureFieldsDto,
} from "./dto";
import { ErrorMessages } from "../common/constants/error-messages";

@Injectable()
export class TemplatesService {
  private s3Client: S3Client | null = null;
  private s3Config: any = null;

  constructor(
    @InjectRepository(Template)
    private readonly templateRepository: Repository<Template>,
    @InjectRepository(TemplateField)
    private readonly templateFieldRepository: Repository<TemplateField>,
    private readonly awsS3ConfigService: AwsS3ConfigService,
  ) {
    this.initializeS3Client();
  }

  /**
   * Initialize S3 client with active configuration
   */
  private async initializeS3Client() {
    try {
      const config = await this.awsS3ConfigService.getActiveConfig();
      if (config) {
        this.s3Config = config;
        this.s3Client = new S3Client({
          region: config.region,
          endpoint: config.s3Endpoint,
          credentials: {
            accessKeyId: config.accessKeyId,
            secretAccessKey: config.secretAccessKey,
          },
          forcePathStyle: true,
        });
      }
    } catch (error) {
      console.error("Failed to initialize S3 client:", error);
    }
  }

  /**
   * Upload template file to S3 and create Template entity
   */
  async uploadTemplate(
    file: Express.Multer.File,
    dto: CreateTemplateDto,
    userId: string,
  ): Promise<Template> {
    if (!this.s3Client || !this.s3Config) {
      await this.initializeS3Client();
      if (!this.s3Client) {
        throw new InternalServerErrorException(
          "S3 configuration not available",
        );
      }
    }

    // Validate file type
    if (!file.originalname.endsWith(".docx")) {
      throw new BadRequestException(ErrorMessages.TEMPLATE_ONLY_DOCX);
    }

    try {
      // Generate unique filename
      const timestamp = Date.now();
      const fileName = `templates/${userId}/${timestamp}_${file.originalname}`;

      // Upload to S3
      const uploadCommand = new PutObjectCommand({
        Bucket: this.s3Config.s3Bucket,
        Key: fileName,
        Body: file.buffer,
        ContentType:
          "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      });

      await this.s3Client.send(uploadCommand);

      // Construct file URL
      const fileUrl = `${this.s3Config.s3Endpoint}/${this.s3Config.s3Bucket}/${fileName}`;

      // Parse template to extract placeholders
      const schema = await this.parseTemplate(file.buffer);

      // Create Template entity
      const template = this.templateRepository.create({
        name: dto.name,
        description: dto.description,
        originalFileUrl: fileUrl,
        originalFileName: file.originalname,
        fileSize: file.size,
        status: TemplateStatus.PROCESSING,
        schema: {
          fields: schema.placeholders.map((name: string, idx: number) => ({
            fieldName: name,
            position: idx,
          })),
          parsedAt: new Date(),
        },
        organizationId: dto.organizationId,
        createdBy: userId,
      });

      const savedTemplate = await this.templateRepository.save(template);

      // Auto-create fields from schema
      if (schema && schema.placeholders && schema.placeholders.length > 0) {
        await this.autoCreateFields(savedTemplate.id, schema.placeholders);
        // Keep status as PROCESSING until admin configures it
        // Status will be updated to ACTIVE when admin saves configuration
      }

      return this.findOne(savedTemplate.id);
    } catch (error) {
      throw new InternalServerErrorException(
        `Failed to upload template: ${error.message}`,
      );
    }
  }

  /**
   * Parse Word template to extract placeholders (public API)
   */
  async parseTemplate(buffer: Buffer): Promise<any> {
    try {
      const zip = new PizZip(buffer);

      // Extract text directly from XML to avoid Word formatting issues
      const documentXml = zip.file("word/document.xml")?.asText();
      if (!documentXml) {
        throw new Error("Invalid .docx file: missing word/document.xml");
      }

      // Remove all XML tags to get plain text
      const plainText = documentXml.replace(/<[^>]+>/g, "");

      // Find all {{placeholder}} patterns
      const regex = /\{\{([^}]+)\}\}/g;
      const matches: string[] = plainText.match(regex) || [];

      // Count occurrences of each placeholder
      const placeholderCounts: Record<string, number> = {};
      matches.forEach((tag) => {
        const placeholder = tag.replace(/\{\{|\}\}/g, "").trim();
        if (placeholder.length > 0) {
          placeholderCounts[placeholder] =
            (placeholderCounts[placeholder] || 0) + 1;
        }
      });

      const uniquePlaceholders = Object.keys(placeholderCounts);

      // If no placeholders found, warn but don't fail
      if (uniquePlaceholders.length === 0) {
        console.warn(
          "No placeholders found in template. Template will work but has no dynamic fields.",
        );
      }

      return {
        placeholders: uniquePlaceholders,
        placeholderCounts, // Thêm thông tin số lần xuất hiện
        totalFields: uniquePlaceholders.length,
      };
    } catch (error) {
      console.error("Template parsing error:", error);
      throw new BadRequestException(
        `Failed to parse template: ${error.message}. Please ensure: 1) File is a valid .docx (not .doc), 2) File is not corrupted, 3) Use {{placeholder}} syntax (double curly braces)`,
      );
    }
  }

  /**
   * Auto-create TemplateField entities from placeholders
   */
  private async autoCreateFields(templateId: string, placeholders: string[]) {
    const fields = placeholders.map((placeholder, index) => {
      return this.templateFieldRepository.create({
        templateId,
        fieldName: placeholder,
        displayName: this.generateDisplayName(placeholder),
        fieldType: FieldType.TEXT, // Default to text, admin can change later
        position: index,
        validationRules: { required: true },
        isVisible: true,
      });
    });

    await this.templateFieldRepository.save(fields);
  }

  /**
   * Generate human-readable display name from field name
   */
  private generateDisplayName(fieldName: string): string {
    return fieldName
      .replace(/_/g, " ")
      .replace(/\b\w/g, (char) => char.toUpperCase());
  }

  /**
   * Configure fields for a template
   */
  async configureFields(
    templateId: string,
    dto: ConfigureFieldsDto,
  ): Promise<Template> {
    // ✅ OPTIMIZATION: Use findOne (already has error handling) instead of duplicate code
    const _template = await this.findOne(templateId);

    // Delete existing fields - use DELETE query instead of loading then deleting
    await this.templateFieldRepository.delete({ templateId });

    // Create new fields
    const fields = dto.fields.map((field) =>
      this.templateFieldRepository.create({
        ...field,
        templateId,
      }),
    );

    await this.templateFieldRepository.save(fields);

    // Load fresh data with new fields
    return this.findOne(templateId);
  }

  /**
   * Find all templates with pagination and filters
   */
  async findAll(
    status?: string,
    search?: string,
    page: number = 1,
    limit: number = 10,
  ): Promise<{
    data: Template[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }> {
    // ✅ OPTIMIZATION 1: Select only needed fields to reduce data transfer
    const queryBuilder = this.templateRepository
      .createQueryBuilder("template")
      .select([
        "template.id",
        "template.name",
        "template.description",
        "template.status",
        "template.originalFileName",
        "template.fileSize",
        "template.createdAt",
        "template.updatedAt",
      ])
      // ✅ OPTIMIZATION 2: Only load fields count, not full field data (reduce payload)
      .loadRelationCountAndMap("template.fieldsCount", "template.fields")
      // ✅ OPTIMIZATION 3: Select minimal creator info
      .leftJoin("template.creator", "creator")
      .addSelect([
        "creator.id",
        "creator.familyName",
        "creator.givenName",
        "creator.email",
      ])
      // ✅ OPTIMIZATION 4: Select minimal organization info
      .leftJoin("template.organization", "organization")
      .addSelect(["organization.id", "organization.name"])
      .orderBy("template.createdAt", "DESC");

    // Apply status filter
    if (status && status !== "all") {
      queryBuilder.andWhere("template.status = :status", { status });
    }

    // Apply search filter
    if (search) {
      queryBuilder.andWhere(
        "(LOWER(template.name) LIKE LOWER(:search) OR LOWER(template.description) LIKE LOWER(:search))",
        { search: `%${search}%` },
      );
    }

    // ✅ OPTIMIZATION 5: Use getManyAndCount() to get data and count in one operation
    const pageNum = Number(page);
    const limitNum = Number(limit);
    const skip = (pageNum - 1) * limitNum;

    const [data, total] = await queryBuilder
      .skip(skip)
      .take(limitNum)
      .getManyAndCount();

    return {
      data,
      total,
      page: pageNum,
      limit: limitNum,
      totalPages: Math.ceil(total / limitNum),
    };
  }

  /**
   * Find one template by ID
   */
  async findOne(id: string): Promise<Template> {
    const template = await this.templateRepository.findOne({
      where: { id },
      relations: ["fields", "creator", "organization"],
    });

    if (!template) {
      throw new NotFoundException(ErrorMessages.TEMPLATE_NOT_FOUND);
    }

    return template;
  }

  /**
   * Update template
   */
  async update(id: string, dto: UpdateTemplateDto): Promise<Template> {
    // ❌ BEFORE: 3 queries (findOne → save → findOne again)
    // ✅ AFTER: 2 queries (findOne → save and return)
    const template = await this.findOne(id);

    Object.assign(template, dto);

    const updated = await this.templateRepository.save(template);

    // Return the updated entity directly instead of querying again
    // Relations are already loaded from findOne()
    return updated;
  }

  /**
   * Delete template and its file from S3
   */
  async delete(id: string): Promise<void> {
    const template = await this.templateRepository.findOne({
      where: { id },
      relations: ["submissions"],
    });

    if (!template) {
      throw new NotFoundException(ErrorMessages.TEMPLATE_NOT_FOUND);
    }

    // Check if template has submissions
    if (template.submissions && template.submissions.length > 0) {
      throw new BadRequestException(ErrorMessages.TEMPLATE_HAS_SUBMISSIONS);
    }

    // Delete from S3
    if (this.s3Client && this.s3Config) {
      try {
        const fileKey = template.originalFileUrl.replace(
          `${this.s3Config.s3Endpoint}/${this.s3Config.s3Bucket}/`,
          "",
        );

        const deleteCommand = new DeleteObjectCommand({
          Bucket: this.s3Config.s3Bucket,
          Key: fileKey,
        });

        await this.s3Client.send(deleteCommand);
      } catch (error) {
        console.error("Failed to delete file from S3:", error);
      }
    }

    // Delete from database (CASCADE will delete fields)
    await this.templateRepository.remove(template);
  }
}
