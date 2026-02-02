import {
  Injectable,
  BadRequestException,
  NotFoundException,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository, In } from "typeorm";
import * as XLSX from "xlsx";
import { Organization } from "../entities/organization.entity";
import { User } from "../entities/user.entity";
import {
  UserOrganization,
  UserOrgRole,
} from "../entities/user-organization.entity";
import { ImportMemberDto } from "./dto/import-members.dto";
import { MetricsService } from "../metrics/metrics.service";

export interface ImportSession {
  sessionId: string;
  organizationId: string;
  data: ImportMemberDto[];
  validationResults: ImportValidationResult[];
  createdAt: Date;
}

export interface ImportValidationResult {
  rowIndex: number;
  data: ImportMemberDto;
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

export interface ImportExecutionResult {
  total: number;
  successful: number;
  failed: number;
  errors: Array<{
    rowIndex: number;
    data: ImportMemberDto;
    error: string;
  }>;
}

@Injectable()
export class OrganizationImportService {
  private importSessions = new Map<string, ImportSession>();

  constructor(
    @InjectRepository(Organization)
    private organizationsRepository: Repository<Organization>,
    @InjectRepository(User)
    private usersRepository: Repository<User>,
    @InjectRepository(UserOrganization)
    private userOrganizationsRepository: Repository<UserOrganization>,
    private readonly metricsService: MetricsService,
  ) { }

  async processUploadedFile(
    file: Express.Multer.File,
    organizationId: string,
    level: number,
  ): Promise<{ sessionId: string; previewData: ImportMemberDto[] }> {
    // Validate file format
    if (!file.originalname.match(/\.(xlsx|xls)$/)) {
      throw new BadRequestException("Chỉ chấp nhận file Excel (.xlsx, .xls)");
    }

    // Validate organization exists
    const organization = await this.organizationsRepository.findOne({
      where: { id: organizationId },
    });
    if (!organization) {
      throw new NotFoundException("Không tìm thấy tổ chức");
    }

    try {
      // Parse Excel file with better options
      const workbook = XLSX.read(file.buffer, {
        type: "buffer",
        cellText: false,
        cellDates: true,
      });

      const sheetName = workbook.SheetNames[0];
      if (!sheetName) {
        throw new BadRequestException("File Excel không có sheet nào");
      }

      const worksheet = workbook.Sheets[sheetName];

      // Convert to JSON with specific options
      const jsonData = XLSX.utils.sheet_to_json(worksheet, {
        header: 1, // Use first row as header
        defval: "", // Default value for empty cells
        raw: false, // Convert all values to strings
      });

      if (jsonData.length <= 1) {
        throw new BadRequestException(
          "File Excel không có dữ liệu (chỉ có header hoặc rỗng)",
        );
      }

      // Get headers from first row
      const headers = jsonData[0] as string[];
      const dataRows = jsonData.slice(1); // Skip header row

      // Map data based on level
      const importData: ImportMemberDto[] = [];
      for (let i = 0; i < dataRows.length; i++) {
        const row = dataRows[i] as any[];

        if (level === 2) {
          // Level 2: cần mã sinh viên và mã lớp/đơn vị
          let studentCodeIndex = headers.findIndex(
            (h) =>
              h &&
              (h.includes("sinh viên") ||
                h.includes("Student") ||
                h.includes("studentCode")),
          );
          let classCodeIndex = headers.findIndex(
            (h) =>
              h &&
              (h.includes("lớp") ||
                h.includes("đơn vị") ||
                h.includes("Class") ||
                h.includes("classOrUnitCode")),
          );

          if (studentCodeIndex === -1) studentCodeIndex = 0; // Default to first column
          if (classCodeIndex === -1) classCodeIndex = 1; // Default to second column

          const studentCode = row[studentCodeIndex];
          const classOrUnitCode = row[classCodeIndex];

          if (studentCode && String(studentCode).trim()) {
            importData.push({
              studentCode: String(studentCode).trim(),
              classOrUnitCode: classOrUnitCode
                ? String(classOrUnitCode).trim()
                : undefined,
            });
          }
        } else if (level === 3) {
          // Level 3: chỉ cần mã sinh viên
          let studentCodeIndex = headers.findIndex(
            (h) =>
              h &&
              (h.includes("sinh viên") ||
                h.includes("Student") ||
                h.includes("studentCode")),
          );

          if (studentCodeIndex === -1) studentCodeIndex = 0; // Default to first column

          const studentCode = row[studentCodeIndex];

          if (studentCode && String(studentCode).trim()) {
            importData.push({
              studentCode: String(studentCode).trim(),
            });
          }
        }
      }

      if (importData.length === 0) {
        throw new BadRequestException(
          "Không tìm thấy dữ liệu hợp lệ trong file",
        );
      }

      // Create session
      const sessionId = `import_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      const session: ImportSession = {
        sessionId,
        organizationId,
        data: importData,
        validationResults: [],
        createdAt: new Date(),
      };

      this.importSessions.set(sessionId, session);

      // Return preview data (first 5 rows)
      const previewData = importData.slice(0, 5);

      return { sessionId, previewData };
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new BadRequestException(
        `Không thể xử lý file Excel: ${error.message}`,
      );
    }
  }

  async validateImportData(
    sessionId: string,
  ): Promise<ImportValidationResult[]> {
    const session = this.importSessions.get(sessionId);
    if (!session) {
      throw new NotFoundException("Session không tồn tại hoặc đã hết hạn");
    }

    const startTime = Date.now();
    console.log(
      `🔍 [Validation] Starting validation for ${session.data.length} rows...`,
    );

    // ✅ OPTIMIZATION 1: Extract all student codes (O(n) - single pass)
    const studentCodes = session.data
      .map((row) => row.studentCode?.trim())
      .filter((code) => code && code !== "");

    console.log(`   📝 Found ${studentCodes.length} student codes to validate`);

    // ✅ OPTIMIZATION 2: Bulk lookup users (1 query instead of N queries)
    const users = await this.usersRepository.find({
      where: { code: In(studentCodes) },
      select: ["id", "code", "fullName", "email"],
    });

    // Create lookup map for O(1) access
    const userMap = new Map(users.map((u) => [u.code, u]));
    console.log(
      `   👥 Found ${users.length}/${studentCodes.length} existing users in database`,
    );

    // ✅ OPTIMIZATION 3: Bulk check existing members (1 query instead of N queries)
    const userIds = users.map((u) => u.id);
    const existingMembers = await this.userOrganizationsRepository.find({
      where: {
        userId: In(userIds),
        organizationId: session.organizationId,
      },
      select: ["userId"],
    });

    // Create lookup set for O(1) access
    const existingMemberSet = new Set(existingMembers.map((m) => m.userId));
    console.log(
      `   ✓ Found ${existingMembers.length} existing members in organization`,
    );

    // ✅ OPTIMIZATION 4: Process validation results in memory (O(n))
    const validationResults: ImportValidationResult[] = session.data.map(
      (memberData, i) => {
        const result: ImportValidationResult = {
          rowIndex: i + 2, // Excel row number (header is row 1, data starts at row 2)
          data: memberData,
          isValid: true,
          errors: [],
          warnings: [],
        };

        // Validate student code
        const studentCode = memberData.studentCode?.trim();
        if (!studentCode || studentCode === "") {
          result.errors.push("Mã số sinh viên không được để trống");
          result.isValid = false;
          return result;
        }

        // Check if user exists (O(1) lookup from map)
        const user = userMap.get(studentCode);
        if (!user) {
          result.errors.push(`Không tìm thấy sinh viên với mã: ${studentCode}`);
          result.isValid = false;
          return result;
        }

        // Check if already member (O(1) lookup from set)
        if (existingMemberSet.has(user.id)) {
          result.warnings.push(
            `Sinh viên ${studentCode} đã là thành viên của tổ chức`,
          );
        }

        return result;
      },
    );

    // Calculate summary statistics
    const validCount = validationResults.filter((r) => r.isValid).length;
    const invalidCount = validationResults.length - validCount;
    const warningCount = validationResults.filter(
      (r) => r.warnings.length > 0,
    ).length;

    const duration = Date.now() - startTime;

    // Record metrics (convert ms to seconds for Prometheus)
    this.metricsService.orgImportValidationDuration.observe(duration / 1000);

    console.log(`✅ [Validation] Completed in ${duration}ms`);
    console.log(
      `   📊 Results: Valid: ${validCount}, Invalid: ${invalidCount}, Warnings: ${warningCount}`,
    );
    console.log(
      `   ⚡ Performance: ${(validationResults.length / (duration / 1000)).toFixed(0)} rows/second`,
    );

    // Update session with validation results
    session.validationResults = validationResults;
    this.importSessions.set(sessionId, session);

    return validationResults;
  }

  async executeImport(
    sessionId: string,
    skipErrors: boolean = false,
  ): Promise<ImportExecutionResult> {
    const session = this.importSessions.get(sessionId);
    if (!session) {
      throw new NotFoundException("Session không tồn tại hoặc đã hết hạn");
    }

    if (session.validationResults.length === 0) {
      throw new BadRequestException(
        "Dữ liệu chưa được validate. Vui lòng validate trước khi import",
      );
    }

    const startTime = Date.now();
    const BATCH_SIZE = 500; // Process 500 records per batch
    this.metricsService.orgImportBatchSize.set(BATCH_SIZE);
    this.metricsService.importSessionsActive.labels("organization").inc();
    console.log(
      `🚀 [Import] Starting import for ${session.data.length} rows...`,
    );
    console.log(`   Batch size: ${BATCH_SIZE}, Skip errors: ${skipErrors}`);

    const result: ImportExecutionResult = {
      total: session.data.length,
      successful: 0,
      failed: 0,
      errors: [],
    };

    // Get valid records to import
    const validRecords = skipErrors
      ? session.validationResults.filter((r) => r.isValid)
      : session.validationResults;

    if (!skipErrors) {
      const invalidRecords = session.validationResults.filter(
        (r) => !r.isValid,
      );
      if (invalidRecords.length > 0) {
        throw new BadRequestException(
          `Có ${invalidRecords.length} dòng dữ liệu không hợp lệ. Vui lòng sửa lỗi hoặc chọn "Bỏ qua lỗi"`,
        );
      }
    }

    console.log(`   📝 Valid records to import: ${validRecords.length}`);

    // ✅ OPTIMIZATION 1: Bulk lookup users (1 query instead of N)
    const studentCodes = validRecords
      .map((r) => r.data.studentCode?.trim())
      .filter(Boolean);
    const users = await this.usersRepository.find({
      where: { code: In(studentCodes) },
      select: ["id", "code"],
    });
    const userMap = new Map(users.map((u) => [u.code, u]));
    console.log(`   👥 Found ${users.length} users to import`);

    // ✅ OPTIMIZATION 2: Bulk check existing members (1 query instead of N)
    const userIds = users.map((u) => u.id);
    const existingMembers = await this.userOrganizationsRepository.find({
      where: {
        userId: In(userIds),
        organizationId: session.organizationId,
      },
      select: ["userId"],
    });
    const existingSet = new Set(existingMembers.map((m) => m.userId));
    console.log(
      `   ✓ ${existingMembers.length} users are already members (will be skipped)`,
    );

    // ✅ OPTIMIZATION 3: Filter out users that don't exist or are already members
    const usersToImport = validRecords
      .map((r) => {
        const user = userMap.get(r.data.studentCode?.trim());
        if (!user) {
          result.failed++;
          result.errors.push({
            rowIndex: r.rowIndex,
            data: r.data,
            error: `Không tìm thấy sinh viên với mã: ${r.data.studentCode}`,
          });
          return null;
        }
        if (existingSet.has(user.id)) {
          result.successful++; // Count as successful (already member)
          return null;
        }
        return { user, rowIndex: r.rowIndex, data: r.data };
      })
      .filter(Boolean);

    console.log(`   📊 New members to add: ${usersToImport.length}`);

    // ✅ OPTIMIZATION 4: Batch insert (500 records per batch)
    const totalBatches = Math.ceil(usersToImport.length / BATCH_SIZE);

    for (let batchIndex = 0; batchIndex < totalBatches; batchIndex++) {
      const start = batchIndex * BATCH_SIZE;
      const end = Math.min(start + BATCH_SIZE, usersToImport.length);
      const batch = usersToImport.slice(start, end);

      try {
        // Create entities for this batch
        const entities = batch.map((item) =>
          this.userOrganizationsRepository.create({
            userId: item.user.id,
            organizationId: session.organizationId,
            role: UserOrgRole.MEMBER,
            joinedAt: new Date(),
          }),
        );

        // Bulk insert
        await this.userOrganizationsRepository.save(entities);

        result.successful += batch.length;
        console.log(
          `   ✓ Batch ${batchIndex + 1}/${totalBatches}: Imported ${batch.length} members`,
        );
      } catch (error) {
        console.error(
          `   ✗ Batch ${batchIndex + 1}/${totalBatches} failed:`,
          error.message,
        );

        // If batch fails, try individual inserts for error handling
        for (const item of batch) {
          try {
            const entity = this.userOrganizationsRepository.create({
              userId: item.user.id,
              organizationId: session.organizationId,
              role: UserOrgRole.MEMBER,
              joinedAt: new Date(),
            });
            await this.userOrganizationsRepository.save(entity);
            result.successful++;
          } catch (individualError) {
            result.failed++;
            result.errors.push({
              rowIndex: item.rowIndex,
              data: item.data,
              error: individualError.message || "Lỗi không xác định",
            });
          }
        }
      }
    }

    const duration = Date.now() - startTime;
    console.log(`✅ [Import] Completed in ${duration}ms`);
    console.log(
      `   📊 Results: Successful: ${result.successful}, Failed: ${result.failed}`,
    );
    console.log(
      `   ⚡ Performance: ${(result.successful / (duration / 1000)).toFixed(0)} rows/second`,
    );

    this.metricsService.recordImportSession(
      "organization",
      result.successful,
      result.failed,
      duration / 1000, // Convert to seconds
    );

    // Decrement active sessions counter
    this.metricsService.importSessionsActive.labels("organization").dec();

    // Clean up session
    this.importSessions.delete(sessionId);

    return result;
  }

  generateTemplate(level: number): Buffer {
    let templateData: string[][];
    if (level === 2) {
      // 2 cột: Mã số lớp, Mã số sinh viên
      templateData = [
        ["Mã số lớp", "Mã số sinh viên"],
        ["KTPM01", "2052001"],
        ["KTPM02", "2052002"],
        ["CNTT01", "2052003"],
      ];
    } else if (level === 3) {
      // 1 cột: Mã số sinh viên
      templateData = [
        ["Mã số sinh viên"],
        ["2052001"],
        ["2052002"],
        ["2052003"],
      ];
    } else {
      throw new BadRequestException("Level phải là 2 hoặc 3");
    }

    const worksheet = XLSX.utils.aoa_to_sheet(templateData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Template");
    return Buffer.from(
      XLSX.write(workbook, { type: "buffer", bookType: "xlsx" }),
    );
  }
  // Clean up expired sessions (call this periodically)
  cleanupExpiredSessions() {
    const now = new Date();
    const expiredTime = 30 * 60 * 1000; // 30 minutes

    for (const [sessionId, session] of this.importSessions.entries()) {
      if (now.getTime() - session.createdAt.getTime() > expiredTime) {
        this.importSessions.delete(sessionId);
      }
    }
  }
}
