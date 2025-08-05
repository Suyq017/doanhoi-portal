import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Organization } from '../../entities/organization.entity';
import { User } from '../../entities/user.entity';
import { UserOrganization, UserOrgRole } from '../../entities/user-organization.entity';
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
  ) { }
  async uploadFile(
    file: Express.Multer.File,
    organizationId: string | undefined,
    level: number
  ): Promise<OrganizationImportUploadResponse> {
    if (!file) {
      throw new BadRequestException('No file uploaded');
    }

    if (!file.originalname.match(/\.(xlsx|xls)$/)) {
      throw new BadRequestException('Only Excel files (.xlsx, .xls) are allowed');
    }

    // Validate organization exists if organizationId is provided
    let organization: Organization | null = null;
    if (organizationId) {
      organization = await this.organizationsRepository.findOne({
        where: { id: organizationId }
      });
      if (!organization) {
        throw new NotFoundException('Organization not found');
      }
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

      for (const item of validationResult.data) {
        // Skip rows có errors - không thêm warning nếu đã có error
        if (item._errors.length > 0) {
          continue;
        }

        try {
          // Tìm user
          const user = await this.usersRepository.findOne({
            where: { code: item.studentCode }
          });

          if (!user) {
            continue; // User không tồn tại đã được validation service báo lỗi
          }

          // Xác định target organization
          let targetOrganizationId = session.organizationId;
          let targetOrganization = null;          // Nếu có classOrUnitCode thì tìm organization con
          if (item.classOrUnitCode) {
            // Đầu tiên, thử tìm organization con trực tiếp
            let childOrg = await this.organizationsRepository.findOne({
              where: {
                code: item.classOrUnitCode,
                parent: { id: session.organizationId }
              }
            });

            // Nếu không tìm thấy, thử tìm trong toàn bộ hệ thống (case insensitive)
            if (!childOrg) {
              childOrg = await this.organizationsRepository
                .createQueryBuilder('org')
                .where('UPPER(org.code) = UPPER(:code)', { code: item.classOrUnitCode })
                .getOne();

              // Nếu tìm thấy nhưng không phải con của session organization
              if (childOrg) {
                console.log(`Found organization with code ${item.classOrUnitCode} but it's not a direct child of session organization`);
                // Kiểm tra xem có phải là descendant không
                const isDescendant = await this.isDescendantOf(childOrg.id, session.organizationId);
                if (!isDescendant) {
                  console.log(`Organization ${item.classOrUnitCode} exists but is not under session organization`);
                  childOrg = null; // Reset nếu không phải descendant
                }
              }
            }

            if (childOrg) {
              targetOrganizationId = childOrg.id;
              targetOrganization = childOrg;
              console.log(`Found target organization: ${childOrg.name} (${childOrg.code})`);
            } else {
              // Không tìm thấy organization con, thêm error và skip
              item._errors.push({
                row: (item as any)._rowIndex !== undefined ? (item as any)._rowIndex + 2 : (validationResult.data.indexOf(item) + 2),
                column: 'classOrUnitCode',
                message: `Organization with code ${item.classOrUnitCode} not found or not under current organization`,
                severity: 'error'
              });
              continue; // Skip kiểm tra membership vì organization không tồn tại
            }
          } else {
            // Sử dụng organization gốc
            targetOrganization = await this.organizationsRepository.findOne({
              where: { id: session.organizationId }
            });
          }

          // Chỉ kiểm tra membership nếu không có error mới
          if (item._errors.length === 0) {
            // Kiểm tra existing membership
            const existingMembership = await this.userOrganizationsRepository.findOne({
              where: {
                userId: user.id,
                organizationId: targetOrganizationId
              }
            });

            if (existingMembership) {
              console.log(`User ${item.studentCode} already exists in target organization`);
              item._warnings.push({
                row: (item as any)._rowIndex !== undefined ? (item as any)._rowIndex + 2 : (validationResult.data.indexOf(item) + 2),
                column: item.classOrUnitCode ? 'classOrUnitCode' : 'studentCode',
                message: `User with code ${item.studentCode} is already a member of this organization`,
                severity: 'warning'
              });
            }
          }

        } catch (error) {
          console.error(`Error checking membership for user ${item.studentCode}:`, error);
          // Chỉ thêm warning nếu không có error
          if (item._errors.length === 0) {
            item._warnings.push({
              row: (item as any)._rowIndex !== undefined ? (item as any)._rowIndex + 2 : (validationResult.data.indexOf(item) + 2),
              column: 'studentCode',
              message: `Could not verify membership status: ${error.message}`,
              severity: 'warning'
            });
          }
        }
      }

      // Recalculate summary after adding membership warnings
      const finalValidRows = validationResult.data.filter(item => item._errors.length === 0);
      const finalWarningRows = validationResult.data.filter(item => item._warnings.length > 0);

      console.log('After membership check:');
      console.log('Final valid rows:', finalValidRows.length);
      console.log('Final warning rows:', finalWarningRows.length);

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

      console.log('Validation completed successfully');

      return {
        sessionId,
        isValid: validationResult.isValid,
        summary: validationResult.summary,
        errors: validationResult.errors,
        warnings: validationResult.warnings,
        previewData
      };
    } catch (error) {
      console.error('Validation failed:', error);
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
      console.log('Import result:', importResult);
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

  // Helper method to check if an organization is descendant of another
  private async isDescendantOf(childId: string, ancestorId: string): Promise<boolean> {
    if (childId === ancestorId) {
      return true;
    }

    const child = await this.organizationsRepository.findOne({
      where: { id: childId },
      relations: ['parent']
    });

    if (!child || !child.parent) {
      return false;
    }

    // Recursively check parent chain
    return this.isDescendantOf(child.parent.id, ancestorId);
  } private async performImport(
    validatedData: any[],
    organizationId: string,
    options?: { skipConflicts?: boolean }
  ): Promise<OrganizationImportResult> {
    console.log('=== STARTING IMPORT ===');
    console.log('validatedData length:', validatedData.length);
    console.log('organizationId:', organizationId);
    console.log('options:', options);
    console.log('First row sample:', validatedData[0]);

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
    console.log('validRows after filtering errors:', validRows.length);
    console.log('Filtered out rows with errors:', validatedData.length - validRows.length);

    // Handle conflicts if skipConflicts is true
    let rowsToImport = validRows;
    if (options?.skipConflicts) {
      rowsToImport = validRows.filter(item => item._warnings.length === 0);
      importResult.skippedCount = validRows.length - rowsToImport.length;
      console.log('skipConflicts enabled, rowsToImport after filtering warnings:', rowsToImport.length);
      console.log('Filtered out rows with warnings:', validRows.length - rowsToImport.length);
    }

    console.log('FINAL rowsToImport length:', rowsToImport.length);

    if (rowsToImport.length === 0) {
      console.log('NO ROWS TO IMPORT - all filtered out!');
      return importResult;
    }

    for (const rowData of rowsToImport) {
      try {
        console.log(`Processing row:`, rowData);

        // Find user by student code
        const user = await this.usersRepository.findOne({
          where: { code: rowData.studentCode }
        });

        if (!user) {
          importResult.errors.push(`Row ${rowData._rowIndex + 2}: User with code "${rowData.studentCode}" not found`);
          importResult.failedCount++;
          continue;
        }

        // Xác định target organization
        let targetOrganization: Organization;        // Nếu có classOrUnitCode thì tìm organization con
        if (rowData.classOrUnitCode) {
          // Đầu tiên, thử tìm organization con trực tiếp
          let childOrg = await this.organizationsRepository.findOne({
            where: {
              code: rowData.classOrUnitCode,
              parent: { id: organizationId }
            },
            relations: ['parent']
          });

          // Nếu không tìm thấy, thử tìm trong toàn bộ hệ thống (case insensitive)
          if (!childOrg) {
            childOrg = await this.organizationsRepository
              .createQueryBuilder('org')
              .leftJoinAndSelect('org.parent', 'parent')
              .where('UPPER(org.code) = UPPER(:code)', { code: rowData.classOrUnitCode })
              .getOne();

            // Nếu tìm thấy nhưng không phải con của session organization
            if (childOrg) {
              console.log(`Found organization with code ${rowData.classOrUnitCode} but checking if it's under session organization`);
              const isDescendant = await this.isDescendantOf(childOrg.id, organizationId);
              if (!isDescendant) {
                console.log(`Organization ${rowData.classOrUnitCode} exists but is not under session organization`);
                childOrg = null; // Reset nếu không phải descendant
              }
            }
          }

          if (childOrg) {
            targetOrganization = childOrg;
            console.log(`Found child organization: ${childOrg.name} (${childOrg.code})`);
          } else {
            // Nếu không tìm thấy child org, sử dụng parent org
            targetOrganization = await this.organizationsRepository.findOne({
              where: { id: organizationId },
              relations: ['parent']
            });
            console.log(`Child organization "${rowData.classOrUnitCode}" not found or not under session organization, using parent organization`);
          }
        } else {
          // Nếu không có classOrUnitCode, sử dụng organization gốc
          targetOrganization = await this.organizationsRepository.findOne({
            where: { id: organizationId },
            relations: ['parent']
          });
        }

        if (!targetOrganization) {
          importResult.errors.push(`Row ${rowData._rowIndex + 2}: Target organization not found`);
          importResult.failedCount++;
          continue;
        }

        // Kiểm tra xem user đã là thành viên của target organization chưa
        const existingMembership = await this.userOrganizationsRepository.findOne({
          where: {
            userId: user.id,
            organizationId: targetOrganization.id
          }
        });
        console.log(`Processing user: ${rowData.studentCode}, classOrUnitCode: ${rowData.classOrUnitCode}`);
        console.log(`Target organization: ${targetOrganization?.name} (${targetOrganization?.id})`);

        if (existingMembership) {
          console.log(`SKIP REASON: User "${rowData.studentCode}" already exists in target org "${targetOrganization.name}"`);
          if (!options?.skipConflicts) {
            importResult.errors.push(`Row ${rowData._rowIndex + 2}: User "${rowData.studentCode}" is already a member of target organization`);
            importResult.failedCount++;
            continue;
          } else {
            console.log(`User "${rowData.studentCode}" already exists in target org, skipping...`);
            importResult.skippedCount++;
            continue;
          }
        }

        // Tạo danh sách tất cả organization cần thêm (target + tất cả parent)
        const allOrgsToAdd: Organization[] = [targetOrganization];

        // Tìm tất cả organization cha
        let parentOrg = targetOrganization.parent;
        while (parentOrg) {
          allOrgsToAdd.push(parentOrg);
          // Lấy parent tiếp theo
          const nextParent = await this.organizationsRepository.findOne({
            where: { id: parentOrg.id },
            relations: ['parent']
          });
          parentOrg = nextParent?.parent;
        }

        console.log(`Adding user "${rowData.studentCode}" to ${allOrgsToAdd.length} organizations`);

        // Danh sách memberships đã tạo cho row này
        const rowMemberships: UserOrganization[] = [];
        let existingCount = 0;

        // Thêm user vào tất cả organizations
        for (const org of allOrgsToAdd) {
          // Kiểm tra xem đã là thành viên chưa
          const membershipExists = await this.userOrganizationsRepository.findOne({
            where: {
              organizationId: org.id,
              userId: user.id
            }
          });

          if (membershipExists) {
            existingCount++;
            console.log(`User "${rowData.studentCode}" already exists in org "${org.name || org.code}"`);
          } else {
            // Tạo membership mới
            const membership = this.userOrganizationsRepository.create({
              organizationId: org.id,
              userId: user.id,
              role: UserOrgRole.MEMBER,
              joinedAt: new Date()
            });

            const savedMembership = await this.userOrganizationsRepository.save(membership);
            rowMemberships.push(savedMembership);
            console.log(`Added user "${rowData.studentCode}" to org "${org.name || org.code}"`);
          }
        }

        // Cập nhật kết quả import
        if (rowMemberships.length > 0) {
          importResult.importedCount++;
          importResult.importedIds.push(...rowMemberships.map(m => m.id));

          let successMsg = `User "${rowData.studentCode}" added to target organization`;
          if (rowMemberships.length > 1) {
            successMsg += ` and ${rowMemberships.length - 1} parent organizations`;
          }
          if (existingCount > 0) {
            successMsg += `. Already member of ${existingCount} organizations`;
          }
          console.log(successMsg);
        } else {
          // Nếu không tạo được membership nào (tất cả đã tồn tại)
          importResult.skippedCount++;
          console.log(`User "${rowData.studentCode}" already exists in all target organizations`);
        }

      } catch (error) {
        console.error(`Failed to process row ${rowData._rowIndex + 2}:`, error);
        importResult.errors.push(`Row ${rowData._rowIndex + 2}: Failed to import "${rowData.studentCode}": ${error.message}`);
        importResult.failedCount++;
        importResult.success = false;
      }
    }

    // Final success check
    if (importResult.failedCount > 0) {
      importResult.success = false;
    }

    console.log('Import completed:', importResult);
    return importResult;
  }
}
