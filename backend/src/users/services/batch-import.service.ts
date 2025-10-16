import { Injectable, Logger, BadRequestException, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, QueryRunner, DataSource } from 'typeorm';
import { User, Gender,  UserType, MembershipStatus, AuthProvider } from '../../entities/user.entity';
import { Department } from '../../entities/department.entity';
import { Class } from '../../entities/class.entity';
import { Organization, OrganizationType } from '../../entities/organization.entity';
import { UserOrganization, UserOrgRole } from '../../entities/user-organization.entity';
import { ImportValidationService, UserValidationResult } from './import-validation.service';
import { 
  BatchImportRequestDto, 
  UserImportDto, 
  BatchInfoDto, 
  ImportOptionsDto 
} from '../dto/batch-import-request-simple.dto';
import {
  BatchImportResponseDto,
  BatchResultDto,
  SessionSummaryDto,
  ImportErrorDto
} from '../dto/batch-import-response.dto';
import * as bcrypt from 'bcryptjs';

interface SessionData {
  sessionId: string;
  totalRecords: number;
  processedRecords: number;
  successfulRecords: number;
  failedRecords: number;
  errors: string[];
  startTime: Date;
  endTime?: Date;
  expectedBatches: number;
  completedBatches: number;
  isComplete: boolean;
}

interface ResolvedUserData {
  familyName: string;
  givenName: string;
  email: string | null;
  code: string;
  phone?: string;
  password?: string;
  userType?: UserType;
  membershipStatus?: MembershipStatus;
  classId?: string;
  className?: string;
  managementDepartmentId?: string;
  managementDepartmentCode?: string;
  trainingDepartmentId?: string;
  organizationIds?: string[];
  // New fields for enhanced import system
  identityCard?: string;
  birthDate?: string;
  gender?: string;
  admissionYear?: string;
  curriculumYear?: string;
  facultyCode?: string;
  trainingSystem?: string;
  trainingLevel?: string;
}

@Injectable()
export class BatchImportService {
  private readonly logger = new Logger(BatchImportService.name);
  private readonly sessionCache = new Map<string, SessionData>();
  private readonly BATCH_SIZE_LIMIT = 200;
  private readonly SUB_BATCH_SIZE = 20; // Process in smaller chunks within transaction
  private readonly SESSION_TIMEOUT = 120 * 60 * 1000; // 60 minutes

  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(Department)
    private readonly departmentRepository: Repository<Department>,
    @InjectRepository(Class)
    private readonly classRepository: Repository<Class>,
    @InjectRepository(Organization)
    private readonly organizationRepository: Repository<Organization>,
    @InjectRepository(UserOrganization)
    private readonly userOrganizationRepository: Repository<UserOrganization>,
    private readonly dataSource: DataSource,
    private readonly validationService: ImportValidationService,
  ) {
    // Clean up expired sessions periodically
    setInterval(() => this.cleanupExpiredSessions(), 10 * 60 * 1000); // Every 10 minutes
  }

  /**
   * Process batch import of users
   */
  async processBatch(request: BatchImportRequestDto): Promise<BatchImportResponseDto> {
    const { users, batchInfo, options } = request;
    const { sessionId, batchNumber, totalBatches } = batchInfo;

    // Validate batch size
    if (users.length > this.BATCH_SIZE_LIMIT) {
      throw new BadRequestException(`Batch size exceeds limit of ${this.BATCH_SIZE_LIMIT} records`);
    }

    // Initialize session if first batch
    if (batchNumber === 1) {
      await this.initializeSession(sessionId, totalBatches, users.length * totalBatches);
    }

    // // Get or validate existing session
    // const session = this.getSession(sessionId);
    // if (!session) {
    //   throw new BadRequestException(`Session ${sessionId} not found or expired`);
    // }

    // // Validate batch sequence
    // if (batchNumber !== session.completedBatches + 1) {
    //   throw new BadRequestException(`Expected batch ${session.completedBatches + 1}, received batch ${batchNumber}`);
    // }

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // Process batch in sub-batches to avoid timeout
      const batchResult: BatchResultDto = {
        processed: 0,
        successful: 0,
        failed: 0,
        errors: []
      };

      // Process users in smaller sub-batches within the transaction
      for (let i = 0; i < users.length; i += this.SUB_BATCH_SIZE) {
        const subBatch = users.slice(i, i + this.SUB_BATCH_SIZE);
        const subBatchResult = await this.processSubBatch(
          subBatch, 
          queryRunner, 
          options,
          batchResult.processed + i + 1 // Starting row number for this sub-batch
        );

        batchResult.processed += subBatchResult.processed;
        batchResult.successful += subBatchResult.successful;
        batchResult.failed += subBatchResult.failed;
        batchResult.errors.push(...subBatchResult.errors);
      }

      await queryRunner.commitTransaction();
      this.logger.log(`Batch ${batchNumber}/${totalBatches} committed successfully`);

      // Update session progress
      this.updateSessionProgress(sessionId, batchResult, batchNumber === totalBatches);

      // Get updated session summary
      const sessionSummary = this.getSessionSummary(sessionId);

      // Determine success based on ImportService logic: success if at least one record processed successfully
      const batchSuccess = batchResult.successful > 0;
      
      // Create message similar to ImportService executeImport
      let message: string;
      if (batchSuccess && batchResult.failed === 0) {
        message = `Batch ${batchNumber}/${totalBatches} completed successfully. ${batchResult.successful} users imported.`;
      } else if (batchSuccess && batchResult.failed > 0) {
        message = `Batch ${batchNumber}/${totalBatches} completed with mixed results. ${batchResult.successful} users imported, ${batchResult.failed} failed.`;
      } else {
        message = `Batch ${batchNumber}/${totalBatches} failed. No users were imported successfully.`;
      }

      // Check if this is the final batch and provide session summary
      if (batchNumber === totalBatches) {
        const totalImported = sessionSummary.totalSuccessful;
        const totalFailed = sessionSummary.totalFailed;
        
        if (totalImported > 0 && totalFailed === 0) {
          message += ` Session completed successfully. Total: ${totalImported} users imported.`;
        } else if (totalImported > 0 && totalFailed > 0) {
          message += ` Session completed with mixed results. Total: ${totalImported} users imported, ${totalFailed} failed.`;
        } else {
          message += ` Session completed with failures. Total: ${totalFailed} records failed to import.`;
        }
      }

      return {
        success: batchSuccess,
        batchResult,
        sessionSummary,
        message
      };

    } catch (error) {
      await queryRunner.rollbackTransaction();
      this.logger.error(`Batch ${batchNumber}/${totalBatches} failed:`, error);
      
      // Update session with error
      this.updateSessionWithError(sessionId, error.message);
      
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  /**
   * Reset transaction after bulk operation failure
   */
  private async resetTransactionSafely(queryRunner: QueryRunner): Promise<void> {
    try {
      // Check if transaction is still active and rollback
      if (queryRunner.isTransactionActive) {
        await queryRunner.rollbackTransaction();
        this.logger.warn('Transaction rolled back due to bulk operation failure');
      }
    } catch (rollbackError) {
      // Ignore rollback errors - transaction might already be rolled back
      this.logger.warn(`Transaction rollback warning (ignored): ${rollbackError.message}`);
    }
    
    // Start fresh transaction
    await queryRunner.startTransaction();
    this.logger.log('Fresh transaction started for individual processing');
  }

  /**
   * Process a sub-batch of users within a transaction using bulk insert
   */
  private async processSubBatch(
    users: UserImportDto[], 
    queryRunner: QueryRunner, 
    options: ImportOptionsDto,
    startRowNumber: number
  ): Promise<BatchResultDto> {
    const result: BatchResultDto = {
      processed: 0,
      successful: 0,
      failed: 0,
      errors: []
    };

    const validUsers: Array<{
      userData: UserImportDto;
      originalIndex: number;
      rowNumber: number;
    }> = [];

    // Step 1: Filter valid users (basic validation + duplicate check)
    const seenCodes = new Set<string>();
    const seenEmails = new Set<string>();
    
    for (let i = 0; i < users.length; i++) {
      const user = users[i];
      const rowNumber = startRowNumber + i;
      let hasErrors = false;

      // Basic validation - check required fields
      if (!user.code || !user.familyName || !user.givenName) {
        result.failed++;
        const errorMessage = `Row ${rowNumber}: Missing required fields (code, familyName, or givenName)`;
        result.errors.push(errorMessage);
        this.logger.warn(errorMessage);
        hasErrors = true;
      }

      // Check for duplicates within current batch
      if (user.code && seenCodes.has(user.code)) {
        result.failed++;
        const errorMessage = `Row ${rowNumber}: Duplicate code in batch: ${user.code}`;
        result.errors.push(errorMessage);
        this.logger.warn(errorMessage);
        hasErrors = true;
      } else if (user.code) {
        seenCodes.add(user.code);
      }
      
      if (user.email && seenEmails.has(user.email)) {
        result.failed++;
        const errorMessage = `Row ${rowNumber}: Duplicate email in batch: ${user.email}`;
        result.errors.push(errorMessage);
        this.logger.warn(errorMessage);
        hasErrors = true;
      } else if (user.email) {
        seenEmails.add(user.email);
      }

      if (!hasErrors) {
        validUsers.push({
          userData: user,
          originalIndex: i,
          rowNumber
        });
      }
      
      result.processed++;
    }

    // Step 2: Bulk insert valid users
    if (validUsers.length > 0) {
      this.logger.log(`Processing batch: ${validUsers.length} users`);
      
      try {
        const userEntities = await this.createUserEntitiesDirectly(validUsers, queryRunner);
        
        if (userEntities.length > 0) {
          // Bulk insert users
          const insertResult = await queryRunner.manager.insert(User, userEntities);
          
          // Handle organization assignments for each inserted user
          for (let i = 0; i < validUsers.length; i++) {
            const { userData } = validUsers[i];
            const insertedUserId = insertResult.identifiers[i]?.id;
            
            if (insertedUserId && userData.className && userData.facultyCode) {
              try {
                await this.handleClassOrganizationCreation(
                  queryRunner, 
                  userData.className, 
                  userData.facultyCode, 
                  insertedUserId
                );
              } catch (orgError) {
                this.logger.warn(`Failed to create organizations for user ${userData.code}: ${orgError.message}`);
                // Don't fail the entire batch for organization creation errors
              }
            }
          }
          
          result.successful += userEntities.length;
          this.logger.log(`Bulk inserted ${userEntities.length} users successfully`);
        }
      } catch (bulkError) {
        // Check if this is a duplicate key constraint error
        if (bulkError.message && bulkError.message.includes('duplicate key value violates unique constraint')) {
          this.logger.warn(`Bulk insert failed due to duplicates, resetting transaction and processing individually: ${bulkError.message}`);
          
          // CRITICAL: Reset transaction before individual processing
          await this.resetTransactionSafely(queryRunner);
          
          // Process each user individually with duplicate check
          for (const { userData, rowNumber } of validUsers) {
            try {
              // Check if user already exists
              const existingUser = await queryRunner.manager.findOne(User, {
                where: [
                  { code: userData.code },
                  ...(userData.email ? [{ email: userData.email }] : [])
                ]
              });

              if (existingUser) {
                this.logger.warn(`User ${userData.code} already exists, skipping`);
                result.failed++;
                result.errors.push(`Row ${rowNumber}: User with code ${userData.code} already exists (duplicate)`);
                continue;
              }

              // Create individual user
              await this.processUser(userData, queryRunner, options);
              result.successful++;
            } catch (individualError) {
              result.failed++;
              const errorMessage = `Row ${rowNumber}: ${individualError.message}`;
              result.errors.push(errorMessage);
              this.logger.warn(errorMessage);
            }
          }
        } else {
          // Other bulk errors - reset transaction and fall back to individual processing
          this.logger.warn(`Bulk insert failed with non-duplicate error, resetting transaction and falling back: ${bulkError.message}`);
          
          // Reset transaction for clean state
          await this.resetTransactionSafely(queryRunner);
          
          for (const { userData, rowNumber } of validUsers) {
            try {
              await this.processUser(userData, queryRunner, options);
              result.successful++;
            } catch (individualError) {
              result.failed++;
              const errorMessage = `Row ${rowNumber}: ${individualError.message}`;
              result.errors.push(errorMessage);
              this.logger.warn(errorMessage);
            }
          }
        }
      }
    }

    return result;
  }

  /**
   * Create User entities directly from UserImportDto for bulk insert
   */
  private async createUserEntitiesDirectly(
    validUsers: Array<{
      userData: UserImportDto;
      originalIndex: number;
      rowNumber: number;
    }>,
    queryRunner: QueryRunner
  ): Promise<User[]> {
    const userEntities: User[] = [];

    for (const { userData } of validUsers) {
      try {
        const user = new User();
        user.familyName = userData.familyName;
        user.givenName = userData.givenName;
        user.email = userData.email || null;
        user.code = userData.code;
        user.phone = userData.phone || '';
        
        // Handle password generation
        if (userData.email) {
          const userPassword = this.generatePasswordFromEmail(userData.email);
          user.password = await bcrypt.hash(userPassword, 10);
        } else {
          const userPassword = userData.code;
          user.password = await bcrypt.hash(userPassword, 10);
        }

        // Set user type and membership status
        user.userType = UserType.STUDENT;
        user.membershipStatus = MembershipStatus.ACTIVE;

        // Set authentication fields
        user.authProvider = AuthProvider.LOCAL;
        user.isActive = true;

        // Set additional fields
        if (userData.identityCard) user.identityCard = userData.identityCard;
        if (userData.birthDate) user.birthDate = new Date(userData.birthDate);
        if (userData.gender) {
          user.gender = userData.gender.toUpperCase() === 'NAM' ? Gender.NAM : Gender.NU;
        }
        if (userData.admissionYear) user.admissionYear = userData.admissionYear;
        if (userData.curriculumYear) user.curriculumYear = userData.curriculumYear;
        if (userData.facultyCode) user.facultyCode = userData.facultyCode;
        if (userData.trainingSystem) user.trainingSystem = userData.trainingSystem;
        if (userData.trainingLevel) user.trainingLevel = userData.trainingLevel;

        // Set class reference
        if (userData.className) {
          const classEntity = await queryRunner.manager.findOne(Class, { 
            where: { name: userData.className } 
          });
          if (classEntity) user.class = classEntity;
        }

        // Set department references
        if (userData.departmentCode) {
          const department = await queryRunner.manager.findOne(Department, { 
            where: { code: userData.departmentCode } 
          });
          if (department) {
            user.managementDepartment = department;
            user.trainingDepartment = department;
          }
        }

        userEntities.push(user);
      } catch (error) {
        this.logger.warn(`Failed to create user entity for ${userData.code}: ${error.message}`);
        // Skip this user, continue with others
        continue;
      }
    }

    return userEntities;
  }

  /**
   * Process individual user record using ImportService logic
   */
  private async processUser(
    userData: UserImportDto, 
    queryRunner: QueryRunner, 
    options: ImportOptionsDto
  ): Promise<User> {
    // // Check if user already exists
    // const existingUser = await queryRunner.manager.findOne(User, {
    //   where: { code: userData.code }
    // });

    // if (existingUser) {
    //   if (options?.updateExisting) {
    //     // Update existing user
    //     await this.updateExistingUser(existingUser, userData, queryRunner);
    //     return existingUser;
    //   } else if (options?.skipDuplicates) {
    //     // Skip duplicate
    //     throw new ConflictException(`User with code ${userData.code} already exists (skipped)`);
    //   } else {
    //     // Fail on duplicate
    //     throw new ConflictException(`User with code ${userData.code} already exists`);
    //   }
    // }

    // Convert UserImportDto to ResolvedUserData format for importSingleUser
    const resolvedUserData: ResolvedUserData = await this.convertToResolvedUserData(userData, queryRunner);
    
    // Use ImportService's importSingleUser method with proper access
    const savedUser = await this.importUserWithImportService(queryRunner, resolvedUserData);
    
    return savedUser;
  }

  /**
   * Convert UserImportDto to ResolvedUserData format
   */
  private async convertToResolvedUserData(
    userData: UserImportDto, 
    queryRunner: QueryRunner
  ): Promise<ResolvedUserData> {
    // Resolve department and class IDs
    const departmentId = await this.resolveDepartment(userData.departmentCode, queryRunner);
    const classId = await this.resolveClass(userData.className, queryRunner);

    const resolvedData: ResolvedUserData = {
      familyName: userData.familyName,
      givenName: userData.givenName,
      email: userData.email || null,
      code: userData.code,
      phone: userData.phone || '',
      password: undefined, // Will be generated by importSingleUser
      userType: UserType.STUDENT,
      membershipStatus: MembershipStatus.ACTIVE,
      classId,
      className: userData.className,
      managementDepartmentId: departmentId,
      managementDepartmentCode: userData.departmentCode,
      trainingDepartmentId: departmentId,
      organizationIds: [], // Will be handled by organization creation in importSingleUser
      // New fields for enhanced import system
      identityCard: userData.identityCard,
      birthDate: userData.birthDate,
      gender: userData.gender,
      admissionYear: userData.admissionYear,
      curriculumYear: userData.curriculumYear,
      facultyCode: userData.facultyCode,
      trainingSystem: userData.trainingSystem,
      trainingLevel: userData.trainingLevel
    };

    return resolvedData;
  }

  /**
   * Call ImportService's importSingleUser method through reflection-like access
   */
  private async importUserWithImportService(
    queryRunner: any, 
    userData: ResolvedUserData
  ): Promise<User> {
    // Since importSingleUser is private, we need to access it through the service instance
    // We'll create a similar implementation using the same logic
    
    // Create user entity
    const user = new User();
    user.familyName = userData.familyName;
    user.givenName = userData.givenName;
    user.email = userData.email || null;
    user.code = userData.code;
    user.phone = userData.phone || '';
    
    // Handle password using ImportService's generatePasswordFromEmail logic
    if (userData.password && userData.password.trim()) {
      // Use provided password
      const userPassword = userData.password.trim();
      user.password = await bcrypt.hash(userPassword, 10);
    } else if (userData.email) {
      // No password provided but has email - generate from email
      const userPassword = this.generatePasswordFromEmail(userData.email);
      user.password = await bcrypt.hash(userPassword, 10);
    } else {
      // No password and no email - use code as password
      const userPassword = userData.code;
      user.password = await bcrypt.hash(userPassword, 10);
    }

    // Set user type
    user.userType = userData.userType as UserType || UserType.STUDENT;
    
    // Set membership status
    user.membershipStatus = userData.membershipStatus as MembershipStatus || MembershipStatus.ACTIVE;

    // Set authentication fields
    user.authProvider = AuthProvider.LOCAL;
    user.isActive = true;

    // Set new fields for enhanced import system
    if (userData.identityCard) {
      user.identityCard = userData.identityCard;
    }
    
    if (userData.birthDate) {
      user.birthDate = new Date(userData.birthDate);
    }
    
    if (userData.gender) {
      user.gender = userData.gender.toUpperCase() === 'NAM' ? Gender.NAM : Gender.NU;
    }
    
    if (userData.admissionYear) {
      user.admissionYear = userData.admissionYear;
    }
    
    if (userData.curriculumYear) {
      user.curriculumYear = userData.curriculumYear;
    }
    
    if (userData.facultyCode) {
      user.facultyCode = userData.facultyCode;
    }
    
    if (userData.trainingSystem) {
      user.trainingSystem = userData.trainingSystem;  
    }
    
    if (userData.trainingLevel) {
      user.trainingLevel = userData.trainingLevel;
    }

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

    // Handle class organization creation and assignment using ImportService methods
    if (userData.className && userData.facultyCode) {
      await this.handleClassOrganizationCreation(queryRunner, userData.className, userData.facultyCode, savedUser.id);
    }

    return savedUser;
  }

  /**
   * Generate password from email using ImportService logic
   */
  private generatePasswordFromEmail(email: string | null): string {
    if (!email) return '';
    
    // Generate password from email: take username part before @
    // Example: "nguyen.van.a@example.com" → "nguyenvana"
    // Example: "test@example.com" → "test"
    const username = email.split('@')[0];
    
    const password = username.replace(/\./g, '');

    return password;
  }

  /**
   * Handle class organization creation - copied from ImportService
   */
  private async handleClassOrganizationCreation(
    queryRunner: any, 
    className: string, 
    facultyCode: string, 
    userId: string
  ): Promise<void> {
    // Create both Chi đoàn and Chi hội organizations for the class
    const { chiDoan, chiHoi } = await this.createClassOrganizationsWithTransaction(queryRunner, className, facultyCode);

    // Add user to both organizations
    for (const org of [chiDoan, chiHoi]) {
      const existingMembership = await queryRunner.manager.findOne(UserOrganization, {
        where: { userId, organizationId: org.id }
      });

      if (!existingMembership) {
        const membership = queryRunner.manager.create(UserOrganization, {
          userId,
          organizationId: org.id,
          role: UserOrgRole.MEMBER
        });
        await queryRunner.manager.save(UserOrganization, membership);
      }
    }
  }

  /**
   * Create class organizations - copied from ImportService
   */
  private async createClassOrganizationsWithTransaction(
    queryRunner: any, 
    className: string, 
    facultyCode: string
  ): Promise<{ chiDoan: Organization, chiHoi: Organization }> {
    // Get or create parent organizations (level 2)
    const { lienChiDoan, lienChiHoi } = await this.getOrCreateParentOrganizationsWithTransaction(queryRunner, className, facultyCode);

    // Check if class organizations already exist
    let chiDoan = await queryRunner.manager.findOne(Organization, {
      where: { code: `CHI_DOAN_${className}`, type: OrganizationType.CHI_DOAN }
    });

    let chiHoi = await queryRunner.manager.findOne(Organization, {
      where: { code: `CHI_HOI_${className}`, type: OrganizationType.CHI_HOI }
    });

    // Create Chi đoàn if not exists
    if (!chiDoan) {
      chiDoan = queryRunner.manager.create(Organization, {
        name: `Chi đoàn ${className}`,
        code: `CHI_DOAN_${className}`,
        type: OrganizationType.CHI_DOAN,
        parent: lienChiDoan
      });
      chiDoan = await queryRunner.manager.save(Organization, chiDoan);
    }

    // Create Chi hội if not exists
    if (!chiHoi) {
      chiHoi = queryRunner.manager.create(Organization, {
        name: `Chi hội ${className}`,
        code: `CHI_HOI_${className}`,
        type: OrganizationType.CHI_HOI,
        parent: lienChiHoi
      });
      chiHoi = await queryRunner.manager.save(Organization, chiHoi);
    }

    return { chiDoan, chiHoi };
  }

  /**
   * Get or create parent organizations - copied from ImportService
   */
  private async getOrCreateParentOrganizationsWithTransaction(
    queryRunner: any, 
    className: string, 
    facultyCode: string
  ): Promise<{ lienChiDoan: Organization, lienChiHoi: Organization }> {
    let departmentName = 'Unknown Department';
    let departmentCode = facultyCode || 'UNKNOWN';

    // Check if class name starts with international prefixes
    const internationalPrefixes = ['CC', 'CN', 'CT', 'TT'];
    const isInternational = internationalPrefixes.some(prefix => 
      className.toUpperCase().startsWith(prefix)
    );

    if (isInternational) {
      departmentName = 'Văn Phòng Đào Tạo Quốc Tế';
      departmentCode = 'QT';
    } else if (facultyCode) {
      // Try to get department name from database
      const department = await queryRunner.manager.findOne(Department, {
        where: { code: facultyCode }
      });
      if (department) {
        departmentName = department.name;
        departmentCode = department.code;
      }
    }

    // Get level 1 parent organizations
    const doanTruong = await queryRunner.manager.findOne(Organization, {
      where: { type: OrganizationType.DOAN_TRUONG }
    });
    
    const hoiSinhVien = await queryRunner.manager.findOne(Organization, {
      where: { type: OrganizationType.HOI_SINH_VIEN_TRUONG }
    });

    if (!doanTruong || !hoiSinhVien) {
      throw new Error('Không tìm thấy tổ chức cấp 1 (Đoàn Trường hoặc Hội Sinh viên)');
    }

    // Get or create Liên chi đoàn (level 2) - Đoàn cơ sở
    let lienChiDoan = await queryRunner.manager.findOne(Organization, {
      where: { 
        name: `Liên chi đoàn ${departmentName}`, 
        type: OrganizationType.DOAN_CO_SO 
      }
    });

    if (!lienChiDoan) {
      lienChiDoan = queryRunner.manager.create(Organization, {
        name: `Liên chi đoàn ${departmentName}`,
        code: `LIEN_CHI_DOAN_${departmentCode}`,
        type: OrganizationType.DOAN_CO_SO,
        description: `Đoàn cơ sở của ${departmentName}`,
        parent: doanTruong
      });
      lienChiDoan = await queryRunner.manager.save(Organization, lienChiDoan);
    }

    // Get or create Liên chi hội (level 2)
    let lienChiHoi = await queryRunner.manager.findOne(Organization, {
      where: { 
        name: `Liên chi hội ${departmentName}`, 
        type: OrganizationType.LIEN_CHI_HOI 
      }
    });

    if (!lienChiHoi) {
      lienChiHoi = queryRunner.manager.create(Organization, {
        name: `Liên chi hội ${departmentName}`,
        code: `LIEN_CHI_HOI_${departmentCode}`,
        type: OrganizationType.LIEN_CHI_HOI,
        description: `Hội sinh viên cơ sở của ${departmentName}`,
        parent: hoiSinhVien
      });
      lienChiHoi = await queryRunner.manager.save(Organization, lienChiHoi);
    }

    return { lienChiDoan, lienChiHoi };
  }

  /**
   * Update existing user with new data
   */
  private async updateExistingUser(
    existingUser: User, 
    userData: UserImportDto, 
    queryRunner: QueryRunner
  ): Promise<void> {
    // Update fields if provided
    if (userData.familyName) existingUser.familyName = userData.familyName;
    if (userData.givenName) existingUser.givenName = userData.givenName;
    if (userData.email) existingUser.email = userData.email;
    if (userData.phone) existingUser.phone = userData.phone;
    
    // Map gender to enum
    if (userData.gender) {
      existingUser.gender = userData.gender.toUpperCase() === 'NAM' ? Gender.NAM : Gender.NU;
    }
    
    // Map date fields
    if (userData.birthDate) {
      existingUser.birthDate = new Date(userData.birthDate);
    }
    
    // Map identity card field
    if (userData.identityCard) {
      existingUser.identityCard = userData.identityCard;
    }
    
    // Map admission year as string
    if (userData.admissionYear) {
      existingUser.admissionYear = userData.admissionYear;
    }
    
    // Map curriculum year
    if (userData.curriculumYear) {
      existingUser.curriculumYear = userData.curriculumYear;
    }
    
    // Map faculty code
    if (userData.facultyCode) {
      existingUser.facultyCode = userData.facultyCode;
    }
    
    // Map training system enum
    if (userData.trainingSystem) {
      existingUser.trainingSystem = userData.trainingSystem;
    }
    
    // Map training level enum
    if (userData.trainingLevel) {
      existingUser.trainingLevel = userData.trainingLevel;
    }

    // Resolve references if provided
    if (userData.departmentCode) {
      const departmentId = await this.resolveDepartment(userData.departmentCode, queryRunner);
      if (departmentId) {
        existingUser.managementDepartment = await queryRunner.manager.findOne(Department, { where: { id: departmentId } });
        existingUser.trainingDepartment = existingUser.managementDepartment;
      }
    }
    
    if (userData.className) {
      const classId = await this.resolveClass(userData.className, queryRunner);
      if (classId) {
        existingUser.class = await queryRunner.manager.findOne(Class, { where: { id: classId } });
      }
    }

    await queryRunner.manager.save(User, existingUser);
    this.logger.debug(`Updated user: ${existingUser.code}`);
  }

  /**
   * Resolve department by code
   */
  private async resolveDepartment(departmentCode: string, queryRunner: QueryRunner): Promise<string | null> {
    if (!departmentCode) return null;

    const department = await queryRunner.manager.findOne(Department, {
      where: { code: departmentCode }
    });

    if (!department) {
      // Log warning but don't throw error - allow user creation without department
      return null;
    }

    return department.id;
  }

  /**
   * Resolve class by name (since Class entity doesn't have code field)
   */
  private async resolveClass(className: string, queryRunner: QueryRunner): Promise<string | null> {
    if (!className) return null;

    const classEntity = await queryRunner.manager.findOne(Class, {
      where: { name: className }
    });

    if (!classEntity) {
      // Log warning but don't throw error - allow user creation without class
      return null;
    }

    return classEntity.id;
  }

  /**
   * Initialize import session
   */
  private async initializeSession(sessionId: string, totalBatches: number, totalRecords: number): Promise<void> {
    const sessionData: SessionData = {
      sessionId,
      totalRecords,
      processedRecords: 0,
      successfulRecords: 0,
      failedRecords: 0,
      errors: [],
      startTime: new Date(),
      expectedBatches: totalBatches,
      completedBatches: 0,
      isComplete: false
    };

    this.sessionCache.set(sessionId, sessionData);
    this.logger.log(`Initialized session ${sessionId} with ${totalBatches} batches, ${totalRecords} total records`);

    // Auto-cleanup session after timeout
    setTimeout(() => {
      if (this.sessionCache.has(sessionId)) {
        this.sessionCache.delete(sessionId);
      }
    }, this.SESSION_TIMEOUT);
  }

  /**
   * Update session progress after batch completion
   */
  private updateSessionProgress(sessionId: string, batchResult: BatchResultDto, isLastBatch: boolean): void {
    const session = this.sessionCache.get(sessionId);
    if (!session) return;

    session.processedRecords += batchResult.processed;
    session.successfulRecords += batchResult.successful;
    session.failedRecords += batchResult.failed;
    session.errors.push(...batchResult.errors);
    session.completedBatches += 1;

    if (isLastBatch || session.completedBatches === session.expectedBatches) {
      session.isComplete = true;
      session.endTime = new Date();
      this.logger.log(`Session ${sessionId} completed successfully`);
    }

    this.sessionCache.set(sessionId, session);
  }

  /**
   * Update session with error information
   */
  private updateSessionWithError(sessionId: string, errorMessage: string): void {
    const session = this.sessionCache.get(sessionId);
    if (!session) return;

    session.errors.push(errorMessage);
    this.sessionCache.set(sessionId, session);
  }

  /**
   * Get session data
   */
  private getSession(sessionId: string): SessionData | null {
    return this.sessionCache.get(sessionId) || null;
  }

  /**
   * Get session summary
   */
  getSessionSummary(sessionId: string): SessionSummaryDto {
    const session = this.getSession(sessionId);
    if (!session) {
      throw new BadRequestException(`Session ${sessionId} not found`);
    }

    const duration = session.endTime 
      ? session.endTime.getTime() - session.startTime.getTime()
      : Date.now() - session.startTime.getTime();

    return {
      totalProcessed: session.processedRecords,
      totalSuccessful: session.successfulRecords,
      totalFailed: session.failedRecords,
      isComplete: session.isComplete,
      startTime: session.startTime,
      endTime: session.endTime,
      duration
    };
  }

  /**
   * Clear session data
   */
  clearSession(sessionId: string): void {
    if (this.sessionCache.has(sessionId)) {
      this.sessionCache.delete(sessionId);
      this.logger.log(`Session ${sessionId} cleared`);
    }
  }

  /**
   * Clean up expired sessions
   */
  private cleanupExpiredSessions(): void {
    const now = Date.now();
    const expiredSessions: string[] = [];

    for (const [sessionId, session] of this.sessionCache.entries()) {
      const sessionAge = now - session.startTime.getTime();
      if (sessionAge > this.SESSION_TIMEOUT) {
        expiredSessions.push(sessionId);
      }
    }

    expiredSessions.forEach(sessionId => {
      this.sessionCache.delete(sessionId);
      this.logger.warn(`Expired session ${sessionId} cleaned up`);
    });

    if (expiredSessions.length > 0) {
      this.logger.log(`Cleaned up ${expiredSessions.length} expired sessions`);
    }
  }

  /**
   * Validate parsed user data from frontend using ImportValidationService
   */
  async validateParsedData(
    userData: any[], 
    options: { 
      errorPage?: number; 
      errorLimit?: number; 
      warningPage?: number; 
      warningLimit?: number; 
    } = {}
  ): Promise<any> {
    if (!Array.isArray(userData) || userData.length === 0) {
      throw new BadRequestException('Invalid or empty user data array');
    }

    const {
      errorPage = 1,
      errorLimit = 50,
      warningPage = 1,
      warningLimit = 50
    } = options;

    try {
      // Convert input data to UserImportData format to match ImportValidationService
      const userImportData = userData.map(user => ({
        familyName: user.familyName,
        givenName: user.givenName,
        email: user.email,
        code: user.code,
        phone: user.phone,
        gender: user.gender,
        birthDate: user.birthDate,
        identityCard: user.identityCard,
        admissionYear: user.admissionYear,
        curriculumYear: user.curriculumYear,
        facultyCode: user.facultyCode,
        trainingSystem: user.trainingSystem,
        trainingLevel: user.trainingLevel,
        className: user.className,
        managementDepartmentCode: user.managementDepartmentCode || user.departmentCode,
        trainingDepartmentCode: user.trainingDepartmentCode,
        organizationCodes: user.organizationCodes,
        userType: user.userType || 'student',
        membershipStatus: user.membershipStatus || 'none',
        password: user.password,
        isActive: user.isActive
      }));

      // Validate using injected ImportValidationService
      const validationResults: UserValidationResult[] = await this.validationService.validateImportData(userImportData);

      // Convert results to frontend format
      const validData = validationResults
        .filter(result => result.validation.isValid)
        .map(result => result.data);

      const allErrors = validationResults
        .filter(result => result._errors && result._errors.length > 0)
        .flatMap(result => result._errors || []);

      const allWarnings = validationResults
        .filter(result => result._warnings && result._warnings.length > 0)
        .flatMap(result => result._warnings || []);

      // Apply pagination to errors
      const errorStartIndex = (errorPage - 1) * errorLimit;
      const errorEndIndex = errorStartIndex + errorLimit;
      const paginatedErrors = allErrors.slice(errorStartIndex, errorEndIndex);

      // Apply pagination to warnings
      const warningStartIndex = (warningPage - 1) * warningLimit;
      const warningEndIndex = warningStartIndex + warningLimit;
      const paginatedWarnings = allWarnings.slice(warningStartIndex, warningEndIndex);

      return {
        isValid: validData.length > 0,
        data: validData,
        errors: paginatedErrors,
        warnings: paginatedWarnings,
        pagination: {
          errors: {
            page: errorPage,
            limit: errorLimit,
            total: allErrors.length,
            totalPages: Math.ceil(allErrors.length / errorLimit)
          },
          warnings: {
            page: warningPage,
            limit: warningLimit,
            total: allWarnings.length,
            totalPages: Math.ceil(allWarnings.length / warningLimit)
          }
        },
        summary: {
          total: userData.length,
          valid: validData.length,
          invalid: userData.length - validData.length,
          duplicates: allErrors.filter(e => 
            e.message.toLowerCase().includes('duplicate') || 
            e.message.toLowerCase().includes('already exists')
          ).length
        }
      };

    } catch (error) {
      this.logger.error(`Validation failed using ImportValidationService: ${error.message}`, error.stack);
      throw new BadRequestException(`Validation failed: ${error.message}`);
    }
  }
}