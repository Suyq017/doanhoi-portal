import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import * as bcrypt from 'bcryptjs';
import { User, UserType, MembershipStatus } from '../../entities/user.entity';
import { Class } from '../../entities/class.entity';
import { Department } from '../../entities/department.entity';
import { Organization } from '../../entities/organization.entity';
import { UserOrganization } from '../../entities/user-organization.entity';
import { ExcelParserService, UserImportData } from './excel-parser.service';
import { ImportValidationService, ResolvedUserData, ValidationError } from './import-validation.service';
import { ImportSessionService, ImportSession, ImportResult } from './import-session.service';

export interface ImportUploadResponse {
  sessionId: string;
  fileName: string;
  totalRows: number;
  message: string;
}

export interface ImportValidationResponse {
  sessionId: string;
  isValid: boolean;
  summary: {
    total: number;
    valid: number;
    invalid: number;
    duplicates: number;
    conflicts: number;
  };
  errors: ValidationError[];
  warnings: ValidationError[];
  validationResults: any[];
  canProceed: boolean;
}

export interface ImportExecuteResponse {
  sessionId: string;
  success: boolean;
  message: string;
  importedCount: number;
  skippedCount: number;
  failedCount: number;
  errors: string[];
}

@Injectable()
export class ImportService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(Class)
    private readonly classRepository: Repository<Class>,
    @InjectRepository(Department)
    private readonly departmentRepository: Repository<Department>,
    @InjectRepository(Organization)
    private readonly organizationRepository: Repository<Organization>,
    @InjectRepository(UserOrganization)
    private readonly userOrganizationRepository: Repository<UserOrganization>,
    private readonly excelParserService: ExcelParserService,
    private readonly validationService: ImportValidationService,
    private readonly sessionService: ImportSessionService,
    private readonly dataSource: DataSource,
  ) {}

  async uploadFile(file: Express.Multer.File): Promise<ImportUploadResponse> {
    if (!file) {
      throw new BadRequestException('No file uploaded');
    }

    // Validate file type
    const allowedTypes = [
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-excel'
    ];
    
    if (!allowedTypes.includes(file.mimetype)) {
      throw new BadRequestException('Invalid file type. Please upload an Excel file (.xlsx or .xls)');
    }

    // Validate file size (5MB limit)
    const maxSize = 5 * 1024 * 1024;
    if (file.size > maxSize) {
      throw new BadRequestException('File size too large. Maximum size is 5MB');
    }

    try {
      // Parse Excel file
      const parsedData = await this.excelParserService.parseExcelFile(file.buffer);
      
      if (parsedData.length === 0) {
        throw new BadRequestException('No valid data found in the Excel file');
      }

      // Create import session (without validation)
      const session = this.sessionService.createSession(file.originalname, parsedData);

      return {
        sessionId: session.id,
        fileName: file.originalname,
        totalRows: parsedData.length,
        message: `File uploaded successfully. Found ${parsedData.length} rows to import.`
      };
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new BadRequestException(`Failed to parse Excel file: ${error.message}`);
    }
  }

  async validateData(sessionId: string): Promise<ImportValidationResponse> {
    const session = this.sessionService.getSession(sessionId);
    
    if (!session) {
      throw new NotFoundException('Import session not found');
    }

    if (!session.data) {
      throw new BadRequestException('No data found in session');
    }

    try {
      // Validate data
      const validationResults = await this.validationService.validateImportData(session.data);
      
      // Update session with validation result
      this.sessionService.updateSessionValidation(sessionId, validationResults);

      // Extract all errors and warnings for UI
      const allErrors: ValidationError[] = [];
      const allWarnings: ValidationError[] = [];
      
      validationResults.forEach(result => {
        if (result._errors) allErrors.push(...result._errors);
        if (result._warnings) allWarnings.push(...result._warnings);
      });

      return {
        sessionId,
        isValid: validationResults.some(r => r.validation.isValid),
        summary: {
          total: session.metadata.totalRows,
          valid: validationResults.filter(r => r.validation.isValid).length,
          invalid: validationResults.filter(r => !r.validation.isValid).length,
          duplicates: 0, // Not tracked separately, included in invalid count
          conflicts: 0  // Not tracked separately, included in warnings
        },
        errors: allErrors,
        warnings: allWarnings,
        validationResults: validationResults,
        canProceed: validationResults.some(r => r.validation.isValid)
      };
    } catch (error) {
      throw new BadRequestException(`Validation failed: ${error.message}`);
    }
  }

  async executeImport(sessionId: string, options?: { skipConflicts?: boolean }): Promise<ImportExecuteResponse> {
    const session = this.sessionService.getSession(sessionId);
    
    if (!session) {
      throw new NotFoundException('Import session not found');
    }

    if (session.status !== 'validated') {
      throw new BadRequestException('Session data must be validated before import');
    }

    const validData = this.sessionService.getValidatedData(sessionId);
    if (validData.length === 0) {
      throw new BadRequestException('No valid data found to import');
    }

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const results: ImportResult = {
        success: true,
        importedCount: 0,
        skippedCount: 0,
        failedCount: 0,
        errors: [],
        importedIds: []
      };

      for (let i = 0; i < validData.length; i++) {
        const validationResult = validData[i];
        const userData = validationResult.data;
        
        try {
          const importedUser = await this.importSingleUser(queryRunner, userData);
          results.importedCount++;
          results.importedIds.push(importedUser.id);
        } catch (error) {
          results.failedCount++;
          results.errors.push(`Row ${validationResult.rowIndex}: ${error.message}`);
          
          // If not skipping conflicts, rollback transaction
          if (!options?.skipConflicts) {
            throw error;
          }
        }
      }

      await queryRunner.commitTransaction();
      
      this.sessionService.updateImportResult(sessionId, results);

      return {
        sessionId,
        success: true,
        message: `Import completed successfully. ${results.importedCount} users imported.`,
        importedCount: results.importedCount,
        skippedCount: results.skippedCount,
        failedCount: results.failedCount,
        errors: results.errors
      };

    } catch (error) {
      await queryRunner.rollbackTransaction();
      
      const failureResult: ImportResult = {
        success: false,
        importedCount: 0,
        skippedCount: 0,
        failedCount: validData.length,
        errors: [error.message],
        importedIds: []
      };
      
      this.sessionService.updateImportResult(sessionId, failureResult);
      
      return {
        sessionId,
        success: false,
        message: `Import failed: ${error.message}`,
        importedCount: 0,
        skippedCount: 0,
        failedCount: validData.length,
        errors: [error.message]
      };
    } finally {
      await queryRunner.release();
    }
  }

  private async importSingleUser(queryRunner: any, userData: ResolvedUserData): Promise<User> {
    // Create user entity
    const user = new User();
    user.familyName = userData.familyName;
    user.givenName = userData.givenName;
    user.email = userData.email;
    user.code = userData.code;
    user.phone = userData.phone || '';
    
    // Handle password
    if (userData.password && userData.password.trim()) {
      user.password = await bcrypt.hash(userData.password, 10);
    } else {
      // Generate random password if not provided
      const randomPassword = this.generateRandomPassword();
      user.password = await bcrypt.hash(randomPassword, 10);
    }

    // Set user type
    user.userType = userData.userType as UserType || UserType.STUDENT;
    
    // Set membership status
    user.membershipStatus = userData.membershipStatus as MembershipStatus || MembershipStatus.NONE;

    // Note: User entity does not have isActive field, so we ignore that property

    // Set class reference
    if (userData.classId) {
      const classEntity = await queryRunner.manager.findOne(Class, { 
        where: { id: userData.classId } 
      });
      if (classEntity) {
        user.class = classEntity;
      }
    }

    // Set management department reference
    if (userData.managementDepartmentId) {
      const managementDept = await queryRunner.manager.findOne(Department, { 
        where: { id: userData.managementDepartmentId } 
      });
      if (managementDept) {
        user.managementDepartment = managementDept;
      }
    }

    // Set training department reference
    if (userData.trainingDepartmentId) {
      const trainingDept = await queryRunner.manager.findOne(Department, { 
        where: { id: userData.trainingDepartmentId } 
      });
      if (trainingDept) {
        user.trainingDepartment = trainingDept;
      }
    }

    // Save user
    const savedUser = await queryRunner.manager.save(User, user);

    // Handle organization assignments
    if (userData.organizationIds && userData.organizationIds.length > 0) {
      for (const orgId of userData.organizationIds) {
        const organization = await queryRunner.manager.findOne(Organization, { 
          where: { id: orgId } 
        });
        
        if (organization) {
          const userOrg = new UserOrganization();
          userOrg.user = savedUser;
          userOrg.organization = organization;
          userOrg.joinedAt = new Date();
          
          await queryRunner.manager.save(UserOrganization, userOrg);
        }
      }
    }
    
    return savedUser;
  }

  private generateRandomPassword(length: number = 8): string {
    const charset = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let password = '';
    
    for (let i = 0; i < length; i++) {
      password += charset.charAt(Math.floor(Math.random() * charset.length));
    }
    
    return password;
  }

  async getSessionStatus(sessionId: string): Promise<ImportSession> {
    const session = this.sessionService.getSession(sessionId);
    
    if (!session) {
      throw new NotFoundException('Import session not found');
    }

    return session;
  }

  async generateTemplate(): Promise<Buffer> {
    return this.excelParserService.generateTemplate();
  }

  // Cleanup old sessions periodically
  cleanupSessions(): void {
    this.sessionService.cleanupExpiredSessions();
  }
}
