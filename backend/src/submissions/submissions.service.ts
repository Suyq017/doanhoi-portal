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
  GetObjectCommand,
  DeleteObjectCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import Docxtemplater from "docxtemplater";
import PizZip from "pizzip";
import {
  TemplateSubmission,
  SubmissionStatus,
} from "../entities/template-submission.entity";
import { Template } from "../entities/template.entity";
import { AwsS3ConfigService } from "../aws-config/aws-s3-config.service";
import { CreateSubmissionDto, UpdateSubmissionDto } from "./dto";
import { ErrorMessages } from "../common/constants/error-messages";

@Injectable()
export class SubmissionsService {
  private s3Client: S3Client | null = null;
  private s3Config: any = null;
  private presignedUrlCache: Map<string, { url: string; expiresAt: number }> =
    new Map();

  constructor(
    @InjectRepository(TemplateSubmission)
    private readonly submissionRepository: Repository<TemplateSubmission>,
    @InjectRepository(Template)
    private readonly templateRepository: Repository<Template>,
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
   * Create new submission (draft)
   */
  async create(
    dto: CreateSubmissionDto,
    userId: string,
  ): Promise<TemplateSubmission> {
    const template = await this.templateRepository.findOne({
      where: { id: dto.templateId },
      relations: ["fields"],
    });

    if (!template) {
      throw new NotFoundException(ErrorMessages.TEMPLATE_NOT_FOUND);
    }

    const submission = this.submissionRepository.create({
      templateId: dto.templateId,
      userId,
      formData: dto.formData,
      status: SubmissionStatus.DRAFT,
    });

    return this.submissionRepository.save(submission);
  }

  /**
   * Update submission (save draft)
   */
  async update(
    id: string,
    dto: UpdateSubmissionDto,
    userId: string,
  ): Promise<TemplateSubmission> {
    const submission = await this.submissionRepository.findOne({
      where: { id, userId },
    });

    if (!submission) {
      throw new NotFoundException(ErrorMessages.SUBMISSION_NOT_FOUND);
    }

    if (submission.status !== SubmissionStatus.DRAFT) {
      throw new BadRequestException(ErrorMessages.SUBMISSION_ONLY_UPDATE_DRAFT);
    }

    if (dto.formData) {
      submission.formData = dto.formData;
    }

    return this.submissionRepository.save(submission);
  }

  /**
   * Submit and generate document
   */
  async submit(id: string, userId: string): Promise<TemplateSubmission> {
    const submission = await this.submissionRepository.findOne({
      where: { id, userId },
      relations: ["template"],
    });

    if (!submission) {
      throw new NotFoundException(ErrorMessages.SUBMISSION_NOT_FOUND);
    }

    if (submission.status === SubmissionStatus.COMPLETED) {
      throw new BadRequestException(ErrorMessages.SUBMISSION_ALREADY_COMPLETED);
    }

    // Update status to SUBMITTED
    submission.status = SubmissionStatus.SUBMITTED;
    submission.submittedAt = new Date();
    await this.submissionRepository.save(submission);

    // Generate document asynchronously
    this.generateDocument(id).catch((error) => {
      console.error("Failed to generate document:", error);
    });

    return submission;
  }

  /**
   * Generate Word document from template and form data
   */
  async generateDocument(submissionId: string): Promise<void> {
    const submission = await this.submissionRepository.findOne({
      where: { id: submissionId },
      relations: ["template", "template.fields"],
    });

    if (!submission) {
      throw new NotFoundException(ErrorMessages.SUBMISSION_NOT_FOUND);
    }

    try {
      // Download template file from S3
      const templateBuffer = await this.downloadTemplate(
        submission.template.originalFileUrl,
      );

      // Load template into docxtemplater with error handling
      const zip = new PizZip(templateBuffer);
      const doc = new Docxtemplater(zip, {
        paragraphLoop: true,
        linebreaks: true,
        delimiters: { start: "{{", end: "}}" },
        nullGetter: () => "", // Return empty string for missing values
      });

      // Transform formData: convert date_parts objects to strings
      const transformedData = this.transformFormData(
        submission.formData,
        submission.template.fields || [],
      );

      // Render document with form data
      doc.render(transformedData);

      // Get generated document as buffer
      const outputBuffer = doc.getZip().generate({
        type: "nodebuffer",
        compression: "DEFLATE",
      });

      // Upload to S3
      if (!this.s3Client || !this.s3Config) {
        await this.initializeS3Client();
        if (!this.s3Client) {
          throw new InternalServerErrorException(
            "S3 configuration not available",
          );
        }
      }

      const timestamp = Date.now();

      // Format: template_name_YYYYMMDD_HHMMSS.docx
      // More readable than pure timestamp
      const now = new Date();
      const dateStr = now.toISOString().slice(0, 10).replace(/-/g, ""); // YYYYMMDD
      const timeStr = now.toISOString().slice(11, 19).replace(/:/g, ""); // HHMMSS
      const readableTimestamp = `${dateStr}_${timeStr}`;

      const outputFileName = `${submission.template.originalFileName.replace(".docx", "")}_${readableTimestamp}.docx`;
      const outputKey = `submissions/${submission.userId}/${timestamp}_${outputFileName}`;

      const uploadCommand = new PutObjectCommand({
        Bucket: this.s3Config.s3Bucket,
        Key: outputKey,
        Body: outputBuffer,
        ContentType:
          "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      });

      await this.s3Client.send(uploadCommand);

      // Update submission with output file info
      submission.outputFileUrl = `${this.s3Config.s3Endpoint}/${this.s3Config.s3Bucket}/${outputKey}`;
      submission.outputFileName = outputFileName;
      submission.outputFileSize = outputBuffer.length;
      submission.status = SubmissionStatus.COMPLETED;
      submission.completedAt = new Date();
      submission.errorMessage = null;

      await this.submissionRepository.save(submission);
    } catch (error) {
      // Update submission with error
      submission.status = SubmissionStatus.FAILED;
      submission.errorMessage =
        error instanceof Error ? error.message : String(error);
      await this.submissionRepository.save(submission);
      throw error;
    }
  }

  /**
   * Download template file from S3 using S3 Client
   */
  private async downloadTemplate(fileUrl: string): Promise<Buffer> {
    try {
      if (!this.s3Client || !this.s3Config) {
        await this.initializeS3Client();
        if (!this.s3Client) {
          throw new InternalServerErrorException(
            "S3 configuration not available",
          );
        }
      }

      const fileKey = this.extractObjectKey(fileUrl);

      const command = new GetObjectCommand({
        Bucket: this.s3Config.s3Bucket,
        Key: fileKey,
      });

      const response = await this.s3Client.send(command);

      // Convert stream to buffer
      const chunks: Buffer[] = [];
      for await (const chunk of response.Body as any) {
        chunks.push(chunk);
      }

      return Buffer.concat(chunks);
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      throw new InternalServerErrorException(
        `Failed to download template: ${errorMessage}`,
      );
    }
  }

  /**
   * Extract object key from a stored file URL in a provider-agnostic way.
   */
  private extractObjectKey(fileUrl: string): string {
    if (!this.s3Config) {
      throw new InternalServerErrorException("S3 configuration not available");
    }

    const endpoint = String(this.s3Config.s3Endpoint || "").replace(/\/+$/, "");
    const bucket = String(this.s3Config.s3Bucket || "");
    const normalizedUrl = String(fileUrl || "").trim();

    // Preferred format used by this app: <endpoint>/<bucket>/<key>
    const prefix = `${endpoint}/${bucket}/`;
    if (normalizedUrl.startsWith(prefix)) {
      return normalizedUrl.slice(prefix.length);
    }

    // Fallback for any full URL format where key is in pathname.
    try {
      const parsed = new URL(normalizedUrl);
      const pathname = parsed.pathname.replace(/^\/+/, "");
      if (pathname.startsWith(`${bucket}/`)) {
        return pathname.slice(bucket.length + 1);
      }
      return pathname;
    } catch {
      // If value is already a key, return as-is.
      return normalizedUrl.replace(/^\/+/, "");
    }
  }

  /**
   * Get user's submissions
   */
  async getUserSubmissions(
    userId: string,
    templateId?: string,
  ): Promise<TemplateSubmission[]> {
    // ✅ OPTIMIZATION: Use query builder for better control
    const queryBuilder = this.submissionRepository
      .createQueryBuilder("submission")
      .select([
        "submission.id",
        "submission.status",
        "submission.formData",
        "submission.outputFileName",
        "submission.outputFileSize",
        "submission.submittedAt",
        "submission.completedAt",
        "submission.createdAt",
        "submission.updatedAt",
      ])
      .leftJoin("submission.template", "template")
      .addSelect(["template.id", "template.name", "template.description"])
      .where("submission.userId = :userId", { userId })
      .orderBy("submission.createdAt", "DESC");

    if (templateId) {
      queryBuilder.andWhere("submission.templateId = :templateId", {
        templateId,
      });
    }

    return queryBuilder.getMany();
  }

  /**
   * Get all submissions (admin)
   */
  async getAllSubmissions(templateId?: string): Promise<TemplateSubmission[]> {
    // ✅ OPTIMIZATION: Use query builder with selective loading
    const queryBuilder = this.submissionRepository
      .createQueryBuilder("submission")
      .select([
        "submission.id",
        "submission.status",
        "submission.outputFileName",
        "submission.outputFileSize",
        "submission.submittedAt",
        "submission.completedAt",
        "submission.createdAt",
      ])
      .leftJoin("submission.template", "template")
      .addSelect(["template.id", "template.name"])
      .leftJoin("submission.user", "user")
      .addSelect(["user.id", "user.familyName", "user.givenName", "user.email"])
      .orderBy("submission.createdAt", "DESC");

    if (templateId) {
      queryBuilder.where("submission.templateId = :templateId", { templateId });
    }

    return queryBuilder.getMany();
  }

  /**
   * Get submission by ID
   */
  async findOne(id: string, userId?: string): Promise<TemplateSubmission> {
    const query: any = { id };

    if (userId) {
      query.userId = userId;
    }

    const submission = await this.submissionRepository.findOne({
      where: query,
      relations: ["template", "user"],
    });

    if (!submission) {
      throw new NotFoundException(ErrorMessages.SUBMISSION_NOT_FOUND);
    }

    return submission;
  }

  /**
   * Delete submission (user can delete any of their submissions)
   */
  async delete(id: string, userId: string): Promise<void> {
    const submission = await this.submissionRepository.findOne({
      where: { id, userId },
    });

    if (!submission) {
      throw new NotFoundException(ErrorMessages.SUBMISSION_NOT_FOUND);
    }

    // Delete output file from S3 if exists
    if (submission.outputFileUrl && this.s3Client && this.s3Config) {
      try {
        const fileKey = this.extractObjectKey(submission.outputFileUrl);

        const deleteCommand = new DeleteObjectCommand({
          Bucket: this.s3Config.s3Bucket,
          Key: fileKey,
        });

        await this.s3Client.send(deleteCommand);
      } catch (error) {
        console.error("Failed to delete output file from S3:", error);
        // Continue to delete from DB even if S3 deletion fails
      }
    }

    // Delete from database
    await this.submissionRepository.remove(submission);
  }

  /**
   * Transform form data: convert date_parts to formatted strings
   */
  private transformFormData(
    formData: Record<string, any>,
    fields: any[],
  ): Record<string, any> {
    const transformed = { ...formData };

    if (!fields || fields.length === 0) {
      return transformed;
    }

    fields.forEach((field) => {
      const value = formData[field.fieldName];

      // Handle date_parts: {day, month, year} -> "DD/MM/YYYY"
      if (
        field.fieldType === "date_parts" &&
        value &&
        typeof value === "object"
      ) {
        const { day, month, year } = value;

        if (day && month && year) {
          // Tạo chuỗi đầy đủ: "15/03/2024"
          const dayStr = String(day).padStart(2, "0");
          const monthStr = String(month).padStart(2, "0");
          transformed[field.fieldName] = `${dayStr}/${monthStr}/${year}`;

          // Tạo thêm 3 fields riêng cho template có {{fieldName_day}}, {{fieldName_month}}, {{fieldName_year}}
          transformed[`${field.fieldName}_day`] = dayStr;
          transformed[`${field.fieldName}_month`] = monthStr;
          transformed[`${field.fieldName}_year`] = year;
        }
      }

      // Handle date: "YYYY-MM-DD" -> "DD/MM/YYYY"
      if (field.fieldType === "date" && value && typeof value === "string") {
        // Parse "YYYY-MM-DD" hoặc "YYYY/MM/DD"
        const dateMatch = value.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})$/);
        if (dateMatch) {
          const [, year, month, day] = dateMatch;
          const dayStr = String(day).padStart(2, "0");
          const monthStr = String(month).padStart(2, "0");

          // Tạo chuỗi format DD/MM/YYYY cho field chính
          transformed[field.fieldName] = `${dayStr}/${monthStr}/${year}`;

          // Tạo các biến phụ: {fieldName}_day, {fieldName}_month, {fieldName}_year
          // Ví dụ: date -> date_day, date_month, date_year
          transformed[`${field.fieldName}_day`] = dayStr;
          transformed[`${field.fieldName}_month`] = monthStr;
          transformed[`${field.fieldName}_year`] = year;

          // Nếu có datePartsMapping, tạo thêm các biến theo tên gốc
          // Ví dụ: mapping {dayField: "1", monthField: "2", yearField: "3"}
          // -> tạo thêm {{1}} = dayStr, {{2}} = monthStr, {{3}} = year
          if (field.datePartsMapping) {
            transformed[field.datePartsMapping.dayField] = dayStr;
            transformed[field.datePartsMapping.monthField] = monthStr;
            transformed[field.datePartsMapping.yearField] = year;
          }
        }
      }
    });

    return transformed;
  }

  /**
   * Download submission output file from S3
   */
  async downloadSubmissionFile(
    id: string,
    userId: string,
  ): Promise<{ buffer: Buffer; fileName: string }> {
    const submission = await this.submissionRepository.findOne({
      where: { id, userId },
    });

    if (!submission) {
      throw new NotFoundException(ErrorMessages.SUBMISSION_NOT_FOUND);
    }

    if (submission.status !== SubmissionStatus.COMPLETED) {
      throw new BadRequestException(ErrorMessages.SUBMISSION_NOT_COMPLETED);
    }

    if (!submission.outputFileUrl) {
      throw new NotFoundException(ErrorMessages.SUBMISSION_OUTPUT_NOT_FOUND);
    }

    // Download from S3
    const buffer = await this.downloadTemplate(submission.outputFileUrl);

    return {
      buffer,
      fileName: submission.outputFileName,
    };
  }

  /**
   * Get public URL for Office Online Viewer using presigned URL
   */
  async getPublicUrl(
    id: string,
    userId: string,
  ): Promise<{ url: string; fileName: string }> {
    const submission = await this.submissionRepository.findOne({
      where: { id, userId },
    });

    if (!submission) {
      throw new NotFoundException(ErrorMessages.SUBMISSION_NOT_FOUND);
    }

    if (submission.status !== SubmissionStatus.COMPLETED) {
      throw new BadRequestException(ErrorMessages.SUBMISSION_NOT_COMPLETED);
    }

    if (!submission.outputFileUrl) {
      throw new NotFoundException(ErrorMessages.SUBMISSION_OUTPUT_NOT_FOUND);
    }

    try {
      if (!this.s3Client || !this.s3Config) {
        throw new InternalServerErrorException(
          "S3 configuration not available",
        );
      }

      // Check cache first (cache for 50 minutes)
      const cacheKey = `${id}-${userId}`;
      const cached = this.presignedUrlCache.get(cacheKey);
      if (cached && cached.expiresAt > Date.now()) {
        console.log("[SubmissionsService] Using cached presigned URL");
        return {
          url: cached.url,
          fileName: submission.outputFileName || "document.docx",
        };
      }

      console.log("[SubmissionsService] Generating new presigned URL");
      console.log("[SubmissionsService] S3 Config:", {
        s3Bucket: this.s3Config.s3Bucket,
        region: this.s3Config.region,
        s3Endpoint: this.s3Config.s3Endpoint,
      });

      const key = this.extractObjectKey(submission.outputFileUrl);

      console.log("[SubmissionsService] Extracted key:", key);
      console.log("[SubmissionsService] Bucket name:", this.s3Config.s3Bucket);

      // Create presigned URL (valid for 1 hour)
      const command = new GetObjectCommand({
        Bucket: this.s3Config.s3Bucket,
        Key: key,
      });

      const presignedUrl = await getSignedUrl(this.s3Client, command, {
        expiresIn: 3600, // 1 hour
      });

      console.log(
        "[SubmissionsService] Generated presigned URL:",
        presignedUrl,
      );

      // Cache the URL for 50 minutes (10 min buffer before expiry)
      this.presignedUrlCache.set(cacheKey, {
        url: presignedUrl,
        expiresAt: Date.now() + 50 * 60 * 1000, // 50 minutes
      });

      return {
        url: presignedUrl,
        fileName: submission.outputFileName || "document.docx",
      };
    } catch (error) {
      console.error("Error generating presigned URL:", error);
      throw new InternalServerErrorException(
        "Failed to generate presigned URL",
      );
    }
  }
}
