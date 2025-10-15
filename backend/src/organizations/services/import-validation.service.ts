import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../../entities/user.entity';
import { UserOrganization } from '../../entities/user-organization.entity';
import { Organization } from '../../entities/organization.entity';
import { OrganizationMemberImportData } from './excel-parser.service';

export interface OrganizationValidationError {
  row: number;
  column: string;
  message: string;
  severity: 'error' | 'warning';
}

export interface OrganizationMemberImportDataWithValidation extends OrganizationMemberImportData {
  _errors: OrganizationValidationError[];
  _warnings: OrganizationValidationError[];
}

export interface OrganizationValidationResult {
  isValid: boolean;
  data: OrganizationMemberImportDataWithValidation[];
  errors: OrganizationValidationError[];
  warnings: OrganizationValidationError[];
  summary: {
    total: number;
    valid: number;
    invalid: number;
    conflicts: number;
  };
}

export interface OrganizationConflictInfo {
  row: number;
  data: OrganizationMemberImportData;
  existingUser: User;
  conflictType: 'already_member';
}

@Injectable()
export class OrganizationImportValidationService {
  constructor(
    @InjectRepository(User)
    private usersRepository: Repository<User>,
    @InjectRepository(UserOrganization)
    private userOrganizationsRepository: Repository<UserOrganization>,
    @InjectRepository(Organization)
    private organizationsRepository: Repository<Organization>,
  ) { }

  async validateOrganizationMemberData(
    data: OrganizationMemberImportData[],
    organizationId: string,
    level: number
  ): Promise<OrganizationValidationResult> {
    const validationResult: OrganizationValidationResult = {
      isValid: true,
      data: [],
      errors: [],
      warnings: [], summary: {
        total: data.length,
        valid: 0,
        invalid: 0,
        conflicts: 0
      }
    };

    // Validate organization exists
    const organization = await this.organizationsRepository.findOne({
      where: { id: organizationId }
    });
    if (!organization) {
      validationResult.errors.push({
        row: 0,
        column: 'organization',
        message: 'Organization not found',
        severity: 'error'
      });
      validationResult.isValid = false;
      return validationResult;
    }

    // Process each row
    for (let i = 0; i < data.length; i++) {
      const rowData = data[i];
      const validatedRow: OrganizationMemberImportDataWithValidation = {
        ...rowData,
        _errors: [],
        _warnings: []
      };

      // Validate student code
      await this.validateStudentCode(validatedRow, i + 2); // Excel row number

      // Validate class/unit code for level 2
      if (level === 2) {
        this.validateClassOrUnitCode(validatedRow, i + 2);
      }

      // Check if user exists and is already a member
      if (validatedRow.studentCode) {
        await this.checkUserExists(validatedRow, i + 2);
        await this.checkExistingMembership(validatedRow, organizationId, i + 2);
      }

      validationResult.data.push(validatedRow);

      // Update summary
      if (validatedRow._errors.length > 0) {
        validationResult.summary.invalid++;
        validationResult.isValid = false;
      } else {
        validationResult.summary.valid++;
      }      // Collect all errors and warnings
      validationResult.errors.push(...validatedRow._errors);
      validationResult.warnings.push(...validatedRow._warnings);
    }

    return validationResult;
  }

  private async validateStudentCode(
    row: OrganizationMemberImportDataWithValidation,
    rowNumber: number
  ): Promise<void> {
    if (!row.studentCode || row.studentCode.trim() === '') {
      row._errors.push({
        row: rowNumber,
        column: 'studentCode',
        message: 'Student code is required',
        severity: 'error'
      });
      return;
    }

    // Basic format validation (customize as needed)
    const studentCodePattern = /^[0-9]{7}$/; // Assuming 7-digit student codes
    if (!studentCodePattern.test(row.studentCode)) {
      row._warnings.push({
        row: rowNumber,
        column: 'studentCode',
        message: 'Student code format may be incorrect (expected 7 digits)',
        severity: 'warning'
      });
    }
  }

  private validateClassOrUnitCode(
    row: OrganizationMemberImportDataWithValidation,
    rowNumber: number
  ): void {
    if (!row.classOrUnitCode || row.classOrUnitCode.trim() === '') {
      row._warnings.push({
        row: rowNumber,
        column: 'classOrUnitCode',
        message: 'Class/Unit code is recommended for level 2 organizations',
        severity: 'warning'
      });
    }
  }

  private async checkUserExists(
    row: OrganizationMemberImportDataWithValidation,
    rowNumber: number
  ): Promise<void> {
    try {
      const user = await this.usersRepository.findOne({
        where: { code: row.studentCode }
      });

      if (!user) {
        row._errors.push({
          row: rowNumber,
          column: 'studentCode',
          message: `User with code ${row.studentCode} not found`,
          severity: 'error'
        });
      }
    } catch (error) {
      row._errors.push({
        row: rowNumber,
        column: 'studentCode',
        message: `Error checking user: ${error.message}`,
        severity: 'error'
      });
    }
  }

  private async checkExistingMembership(
    row: OrganizationMemberImportDataWithValidation,
    organizationId: string,
    rowNumber: number
  ): Promise<void> {
    try {
      const user = await this.usersRepository.findOne({
        where: { code: row.studentCode }
      });

      if (user) {
        // For Level 2, determine the actual target organization based on classOrUnitCode
        let targetOrganizationId = organizationId;

        if (row.classOrUnitCode) {
          // Level 2: Look up the child organization by code
          const childOrg = await this.organizationsRepository.findOne({
            where: {
              code: row.classOrUnitCode,
              parent: { id: organizationId } // Must be a child of the session org
            }
          });

          if (childOrg) {
            targetOrganizationId = childOrg.id;
            console.log(`[DEBUG] Level 2: Row ${rowNumber}, ClassOrUnitCode ${row.classOrUnitCode} -> Org ${childOrg.name} (${childOrg.id})`);
          } else {
            console.log(`[DEBUG] Level 2: Row ${rowNumber}, ClassOrUnitCode ${row.classOrUnitCode} -> NOT FOUND`);
            // Organization not found - add error
            row._errors.push({
              row: rowNumber,
              column: 'classOrUnitCode',
              message: `Organization with code ${row.classOrUnitCode} not found`,
              severity: 'error'
            });
            return;
          }
        }

        // Check if user is already a member of the TARGET organization
        const existingMembership = await this.userOrganizationsRepository.findOne({
          where: {
            userId: user.id,
            organizationId: targetOrganizationId
          }
        });

        console.log(`[DEBUG] Checking membership for ${row.studentCode} in org ${targetOrganizationId}: ${existingMembership ? 'EXISTS' : 'NO'}`);

        if (existingMembership) {
          row._warnings.push({
            row: rowNumber,
            column: 'studentCode',
            message: `User ${row.studentCode} is already a member of this organization`,
            severity: 'warning'
          });
          return;
        }

        // Get the target organization with its tree structure
        const targetOrganization = await this.organizationsRepository.findOne({
          where: { id: targetOrganizationId },
          relations: ['parent']
        });

        if (!targetOrganization) {
          return;
        }

        // Check if user is a member of any CHILD organizations of the target
        // (being a member of parent is OK, being a member of child is a warning)
        const userMemberships = await this.userOrganizationsRepository.find({
          where: { userId: user.id },
          relations: ['organization', 'organization.parent']
        });

        console.log(`[DEBUG] User ${row.studentCode} has ${userMemberships.length} memberships`);
        for (const membership of userMemberships) {
          console.log(`  - Member of: ${membership.organization.name} (ID: ${membership.organization.id})`);
          console.log(`    Parent: ${membership.organization.parent?.name || 'None'} (ID: ${membership.organization.parent?.id || 'None'})`);
          console.log(`    Target Org ID: ${targetOrganizationId}`);
          console.log(`    Is child of target? ${membership.organization.parent?.id === targetOrganizationId}`);

          // Check if this membership's organization is a child of our target organization
          if (membership.organization.parent?.id === targetOrganizationId) {
            console.log(`  ⚠️ WARNING: User is member of child org!`);
            row._warnings.push({
              row: rowNumber,
              column: 'studentCode',
              message: `User ${row.studentCode} is already a member of child organization: ${membership.organization.name}`,
              severity: 'warning'
            });
            break;
          }
        }
      }
    } catch (error) {
      row._errors.push({
        row: rowNumber,
        column: 'studentCode',
        message: `Error checking membership: ${error.message}`,
        severity: 'error'
      });
    }
  }
}
