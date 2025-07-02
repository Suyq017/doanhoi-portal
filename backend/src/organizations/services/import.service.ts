import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Organization } from '../../entities/organization.entity';
import { User } from '../../entities/user.entity';
import { UserOrganization, UserRole } from '../../entities/user-organization.entity';
import { OrganizationExcelParserService, OrganizationMemberImportData } from './excel-parser.service';
import { OrganizationImportValidationService, OrganizationValidationResult } from './import-validation.service';
import { OrganizationImportSessionService, OrganizationImportSession, OrganizationImportResult } from './import-session.service';

export interface OrganizationImportUploadResponse {
  sessionId: string;
  fileName: string;
  totalRows: number;
  message: string;
}

export interface OrganizationImportValidationResponse {
  sessionId: string;
  isValid: boolean;
  summary: OrganizationValidationResult['summary'];
  errors: OrganizationValidationResult['errors'];
  warnings: OrganizationValidationResult['warnings'];
  previewData: any[];
}

export interface OrganizationImportExecuteResponse {
  sessionId: string;
  success: boolean;
  importedCount: number;
  skippedCount: number;
  failedCount: number;
  errors: string[];
  message: string;
}

@Injectable()
export class OrganizationImportService {
  constructor(
    @InjectRepository(Organization)
    private organizationsRepository: Repository<Organization>,
    @InjectRepository(User)
    private usersRepository: Repository<User>,
    @InjectRepository(UserOrganization)
    private userOrganizationsRepository: Repository<UserOrganization>,
    private excelParserService: OrganizationExcelParserService,
    private validationService: OrganizationImportValidationService,
    private sessionService: OrganizationImportSessionService,
  ) {}

  async uploadFile(
    file: Express.Multer.File, 
    organizationId: string, 
    level: number
  ): Promise<OrganizationImportUploadResponse> {
    if (!file) {
      throw new BadRequestException('No file uploaded');
    }

    if (!file.originalname.match(/\.(xlsx|xls)$/)) {
      throw new BadRequestException('Only Excel files (.xlsx, .xls) are allowed');
    }

    // Validate organization exists
    const organization = await this.organizationsRepository.findOne({
      where: { id: organizationId }
    });
    if (!organization) {
      throw new NotFoundException('Organization not found');
    }

    try {
      // Parse Excel file
      const data = await this.excelParserService.parseExcelFile(file.buffer, level);
      
      if (data.length === 0) {
        throw new BadRequestException('Excel file contains no data rows');
      }

      // Create session
      const session = this.sessionService.createSession(file.originalname, organizationId, level, data);

      return {
        sessionId: session.id,
        fileName: file.originalname,
        totalRows: data.length,
        message: `File uploaded successfully. Found ${data.length} rows to import.`
      };
    } catch (error) {
      if (error instanceof BadRequestException || error instanceof NotFoundException) {
        throw error;
      }
      throw new BadRequestException(`Failed to parse Excel file: ${error.message}`);
    }
  }

  async validateData(sessionId: string): Promise<OrganizationImportValidationResponse> {
    const session = this.sessionService.getSession(sessionId);
    if (!session) {
      throw new NotFoundException('Import session not found or expired');
    }

    if (!session.data) {
      throw new BadRequestException('No data found in session');
    }

    try {
      // Validate data
      const validationResult = await this.validationService.validateOrganizationMemberData(
        session.data, 
        session.organizationId, 
        session.level
      );
      
      // Update session with validation result
      this.sessionService.updateSessionValidation(sessionId, validationResult);

      // Create preview data (first 10 rows with validation info)
      const previewData = validationResult.data.slice(0, 10).map((item, index) => ({
        row: index + 2, // Excel row number
        studentCode: item.studentCode,
        classOrUnitCode: item.classOrUnitCode,
        hasErrors: item._errors.length > 0,
        hasWarnings: item._warnings.length > 0,
        errors: item._errors,
        warnings: item._warnings
      }));

      return {
        sessionId,
        isValid: validationResult.isValid,
        summary: validationResult.summary,
        errors: validationResult.errors,
        warnings: validationResult.warnings,
        previewData
      };
    } catch (error) {
      throw new BadRequestException(`Validation failed: ${error.message}`);
    }
  }

  async executeImport(sessionId: string, options?: { skipConflicts?: boolean }): Promise<OrganizationImportExecuteResponse> {
    const session = this.sessionService.getSession(sessionId);
    if (!session) {
      throw new NotFoundException('Import session not found or expired');
    }

    if (session.status !== 'validated') {
      throw new BadRequestException('Data must be validated before import');
    }

    const validatedData = this.sessionService.getValidatedData(sessionId);
    if (!validatedData) {
      throw new BadRequestException('No validated data found');
    }

    try {
      const importResult = await this.performImport(validatedData, session.organizationId, options);
      
      // Update session with import result
      this.sessionService.updateSessionImport(sessionId, importResult);

      return {
        sessionId,
        success: importResult.success,
        importedCount: importResult.importedCount,
        skippedCount: importResult.skippedCount,
        failedCount: importResult.failedCount,
        errors: importResult.errors,
        message: importResult.success 
          ? `Import completed successfully. ${importResult.importedCount} members imported.`
          : `Import completed with errors. ${importResult.importedCount} imported, ${importResult.failedCount} failed.`
      };
    } catch (error) {
      const importResult: OrganizationImportResult = {
        success: false,
        importedCount: 0,
        skippedCount: 0,
        failedCount: validatedData.length,
        errors: [error.message],
        importedIds: []
      };

      this.sessionService.updateSessionImport(sessionId, importResult);
      throw new BadRequestException(`Import failed: ${error.message}`);
    }
  }

  async getSessionStatus(sessionId: string): Promise<OrganizationImportSession> {
    const session = this.sessionService.getSession(sessionId);
    if (!session) {
      throw new NotFoundException('Import session not found or expired');
    }
    return session;
  }

  async generateTemplate(level: number): Promise<Buffer> {
    return this.excelParserService.generateTemplate(level);
  }

  private async performImport(
    validatedData: any[],
    organizationId: string,
    options?: { skipConflicts?: boolean }
  ): Promise<OrganizationImportResult> {
    const importResult: OrganizationImportResult = {
      success: true,
      importedCount: 0,
      skippedCount: 0,
      failedCount: 0,
      errors: [],
      importedIds: []
    };

    // Filter out rows with errors
    const validRows = validatedData.filter(item => item._errors.length === 0);
    
    // Handle conflicts if skipConflicts is true
    let rowsToImport = validRows;
    if (options?.skipConflicts) {
      rowsToImport = validRows.filter(item => item._warnings.length === 0);
      importResult.skippedCount = validRows.length - rowsToImport.length;
    }

    for (const rowData of rowsToImport) {
      try {
        // Find user by student code
        const user = await this.usersRepository.findOne({
          where: { code: rowData.studentCode }
        });

        if (!user) {
          importResult.errors.push(`User with code "${rowData.studentCode}" not found`);
          importResult.failedCount++;
          continue;
        }

        // Check if user is already a member
        const existingMembership = await this.userOrganizationsRepository.findOne({
          where: {
            userId: user.id,
            organizationId: organizationId
          }
        });

        if (existingMembership) {
          if (!options?.skipConflicts) {
            importResult.errors.push(`User "${rowData.studentCode}" is already a member`);
            importResult.failedCount++;
            continue;
          } else {
            importResult.skippedCount++;
            continue;
          }
        }

        // Create new membership
        const userOrganization = this.userOrganizationsRepository.create({
          userId: user.id,
          organizationId: organizationId,
          role: UserRole.MEMBER,
          joinedAt: new Date()
        });

        const savedMembership = await this.userOrganizationsRepository.save(userOrganization);
        importResult.importedCount++;
        importResult.importedIds.push(savedMembership.id);

      } catch (error) {
        importResult.errors.push(`Failed to import "${rowData.studentCode}": ${error.message}`);
        importResult.failedCount++;
        importResult.success = false;
      }
    }

    return importResult;
  }
}
