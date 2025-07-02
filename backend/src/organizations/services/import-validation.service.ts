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
    duplicates: number;
    conflicts: number;
  };
}

export interface OrganizationDuplicateInfo {
  rows: number[];
  data: OrganizationMemberImportData;
  type: 'internal' | 'external';
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
  ) {}

  async validateOrganizationMemberData(
    data: OrganizationMemberImportData[], 
    organizationId: string,
    level: number
  ): Promise<OrganizationValidationResult> {
    const validationResult: OrganizationValidationResult = {
      isValid: true,
      data: [],
      errors: [],
      warnings: [],
      summary: {
        total: data.length,
        valid: 0,
        invalid: 0,
        duplicates: 0,
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
      }

      // Collect all errors and warnings
      validationResult.errors.push(...validatedRow._errors);
      validationResult.warnings.push(...validatedRow._warnings);
    }

    // Check for internal duplicates
    this.checkInternalDuplicates(validationResult);

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
        const existingMembership = await this.userOrganizationsRepository.findOne({
          where: {
            userId: user.id,
            organizationId: organizationId
          }
        });

        if (existingMembership) {
          row._warnings.push({
            row: rowNumber,
            column: 'studentCode',
            message: `User ${row.studentCode} is already a member of this organization`,
            severity: 'warning'
          });
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

  private checkInternalDuplicates(validationResult: OrganizationValidationResult): void {
    const studentCodeMap = new Map<string, number[]>();

    // Group by student code
    validationResult.data.forEach((row, index) => {
      if (row.studentCode) {
        const existing = studentCodeMap.get(row.studentCode) || [];
        existing.push(index);
        studentCodeMap.set(row.studentCode, existing);
      }
    });

    // Mark duplicates
    for (const [studentCode, indices] of studentCodeMap.entries()) {
      if (indices.length > 1) {
        validationResult.summary.duplicates++;
        
        indices.forEach(index => {
          validationResult.data[index]._warnings.push({
            row: index + 2, // Excel row number
            column: 'studentCode',
            message: `Duplicate student code: ${studentCode} (appears in rows ${indices.map(i => i + 2).join(', ')})`,
            severity: 'warning'
          });
        });
      }
    }
  }
}
