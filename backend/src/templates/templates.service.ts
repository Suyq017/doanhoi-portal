import { Injectable, NotFoundException, BadRequestException, InternalServerErrorException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { S3Client, PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import Docxtemplater from 'docxtemplater';
import PizZip from 'pizzip';
import { Template, TemplateStatus } from '../entities/template.entity';
import { TemplateField, FieldType } from '../entities/template-field.entity';
import { AwsS3ConfigService } from '../aws-config/aws-s3-config.service';
import { CreateTemplateDto, UpdateTemplateDto, ConfigureFieldsDto } from './dto';

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
      console.error('Failed to initialize S3 client:', error);
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
        throw new InternalServerErrorException('S3 configuration not available');
      }
    }

    // Validate file type
    if (!file.originalname.endsWith('.docx')) {
      throw new BadRequestException('Only .docx files are allowed');
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
        ContentType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
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
      const documentXml = zip.file('word/document.xml')?.asText();
      if (!documentXml) {
        throw new Error('Invalid .docx file: missing word/document.xml');
      }

      // Remove all XML tags to get plain text
      const plainText = documentXml.replace(/<[^>]+>/g, '');
      
      // Find all {{placeholder}} patterns
      const regex = /\{\{([^}]+)\}\}/g;
      const matches = plainText.match(regex) || [];
      
      const uniquePlaceholders = [...new Set(
        matches.map(tag => tag.replace(/\{\{|\}\}/g, '').trim())
      )].filter(p => p.length > 0);

      // If no placeholders found, warn but don't fail
      if (uniquePlaceholders.length === 0) {
        console.warn('No placeholders found in template. Template will work but has no dynamic fields.');
      }

      return {
        placeholders: uniquePlaceholders,
        totalFields: uniquePlaceholders.length,
      };
    } catch (error) {
      console.error('Template parsing error:', error);
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
      .replace(/_/g, ' ')
      .replace(/\b\w/g, (char) => char.toUpperCase());
  }

  /**
   * Configure fields for a template
   */
  async configureFields(templateId: string, dto: ConfigureFieldsDto): Promise<Template> {
    const template = await this.templateRepository.findOne({
      where: { id: templateId },
      relations: ['fields'],
    });

    if (!template) {
      throw new NotFoundException('Template not found');
    }

    // Delete existing fields
    await this.templateFieldRepository.delete({ templateId });

    // Create new fields
    const fields = dto.fields.map(field =>
      this.templateFieldRepository.create({
        ...field,
        templateId,
      }),
    );

    await this.templateFieldRepository.save(fields);

    return this.findOne(templateId);
  }

  /**
   * Find all templates (shared for all users)
   * Filter by status if provided
   */
  async findAll(status?: string): Promise<Template[]> {
    const where: any = {};
    
    // Filter by status if provided
    if (status && status !== 'all') {
      where.status = status;
    }

    return this.templateRepository.find({
      where,
      relations: ['fields', 'creator', 'organization'],
      order: { createdAt: 'DESC' },
    });
  }

  /**
   * Find one template by ID
   */
  async findOne(id: string): Promise<Template> {
    const template = await this.templateRepository.findOne({
      where: { id },
      relations: ['fields', 'creator', 'organization'],
    });

    if (!template) {
      throw new NotFoundException('Template not found');
    }

    return template;
  }

  /**
   * Update template
   */
  async update(id: string, dto: UpdateTemplateDto): Promise<Template> {
    const template = await this.findOne(id);

    Object.assign(template, dto);

    await this.templateRepository.save(template);

    return this.findOne(id);
  }

  /**
   * Delete template and its file from S3
   */
  async delete(id: string): Promise<void> {
    const template = await this.templateRepository.findOne({
      where: { id },
      relations: ['submissions'],
    });

    if (!template) {
      throw new NotFoundException('Template not found');
    }

    // Check if template has submissions
    if (template.submissions && template.submissions.length > 0) {
      throw new BadRequestException(
        `Cannot delete template. It has ${template.submissions.length} submission(s). Please delete all submissions first or set template status to inactive.`
      );
    }

    // Delete from S3
    if (this.s3Client && this.s3Config) {
      try {
        const fileKey = template.originalFileUrl.replace(
          `${this.s3Config.s3Endpoint}/${this.s3Config.s3Bucket}/`,
          '',
        );

        const deleteCommand = new DeleteObjectCommand({
          Bucket: this.s3Config.s3Bucket,
          Key: fileKey,
        });

        await this.s3Client.send(deleteCommand);
      } catch (error) {
        console.error('Failed to delete file from S3:', error);
      }
    }

    // Delete from database (CASCADE will delete fields)
    await this.templateRepository.remove(template);
  }
}
