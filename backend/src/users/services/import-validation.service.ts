import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../../entities/user.entity';
import { Class } from '../../entities/class.entity';
import { Department } from '../../entities/department.entity';
import { Organization } from '../../entities/organization.entity';
import { UserImportData } from './excel-parser.service';

export interface ValidationError {
  row: number;
  column: string;
  message: string;
  severity: 'error' | 'warning';
}

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

export interface ResolvedUserData extends UserImportData {
  classId?: string;
  managementDepartmentId?: string;
  trainingDepartmentId?: string;
  organizationIds?: string[];
}

export interface UserValidationResult {
  rowIndex: number;
  data: ResolvedUserData;
  validation: ValidationResult;
  _rowIndex?: number;
  _hasError?: boolean;
  _errors?: ValidationError[];
  _warnings?: ValidationError[];
}

@Injectable()
export class ImportValidationService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(Class)
    private readonly classRepository: Repository<Class>,
    @InjectRepository(Department)
    private readonly departmentRepository: Repository<Department>,
    @InjectRepository(Organization)
    private readonly organizationRepository: Repository<Organization>,
  ) {}

  async validateImportData(data: UserImportData[]): Promise<UserValidationResult[]> {
    const results: UserValidationResult[] = [];
    
    // Get existing data for validation
    const existingUsers = await this.userRepository.find({
      select: ['email', 'code']
    });
    const existingEmails = new Set(existingUsers.map(u => u.email.toLowerCase()));
    const existingCodes = new Set(existingUsers.map(u => u.code.toLowerCase()));
    
    const classes = await this.classRepository.find({ select: ['id', 'name'] });
    const classMap = new Map(classes.map(c => [c.name.toLowerCase(), c.id]));
    
    const departments = await this.departmentRepository.find({ select: ['id', 'code'] });
    const departmentMap = new Map(departments.map(d => [d.code.toLowerCase(), d.id]));
    
    const organizations = await this.organizationRepository.find({ select: ['id', 'code'] });
    const organizationMap = new Map(organizations.map(o => [o.code.toLowerCase(), o.id]));

    // Track duplicates within the import data
    const importEmails = new Set<string>();
    const importCodes = new Set<string>();

    for (let i = 0; i < data.length; i++) {
      const row = data[i];
      const resolvedData: ResolvedUserData = { 
        ...row,
        // Set default values for optional fields
        userType: row.userType || 'student',
        membershipStatus: row.membershipStatus || 'none',
        isActive: row.isActive !== undefined ? row.isActive : true
      };
      const validation: ValidationResult = {
        isValid: true,
        errors: [],
        warnings: []
      };

      // For UI display
      const _errors: ValidationError[] = [];
      const _warnings: ValidationError[] = [];
      const rowNumber = i + 2; // Excel row (header is row 1)

      // Validate required fields
      if (!row.familyName?.trim()) {
        validation.errors.push('Family Name is required');
        validation.isValid = false;
        _errors.push({
          row: rowNumber,
          column: 'familyName',
          message: 'Family Name is required',
          severity: 'error'
        });
      }

      if (!row.givenName?.trim()) {
        validation.errors.push('Given Name is required');
        validation.isValid = false;
        _errors.push({
          row: rowNumber,
          column: 'givenName',
          message: 'Given Name is required',
          severity: 'error'
        });
      }

      if (!row.email?.trim()) {
        validation.errors.push('Email is required');
        validation.isValid = false;
        _errors.push({
          row: rowNumber,
          column: 'email',
          message: 'Email is required',
          severity: 'error'
        });
      } else {
        // Validate email format
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(row.email)) {
          validation.errors.push('Invalid email format');
          validation.isValid = false;
          _errors.push({
            row: rowNumber,
            column: 'email',
            message: 'Invalid email format',
            severity: 'error'
          });
        } else {
          const normalizedEmail = row.email.toLowerCase();
          
          // Check for duplicates in existing data
          if (existingEmails.has(normalizedEmail)) {
            validation.errors.push('Email already exists in database');
            validation.isValid = false;
            _errors.push({
              row: rowNumber,
              column: 'email',
              message: 'Email already exists in database',
              severity: 'error'
            });
          }
          
          // Check for duplicates within import data
          if (importEmails.has(normalizedEmail)) {
            validation.errors.push('Duplicate email in import data');
            validation.isValid = false;
            _errors.push({
              row: rowNumber,
              column: 'email',
              message: 'Duplicate email in import data',
              severity: 'error'
            });
          } else {
            importEmails.add(normalizedEmail);
          }
        }
      }

      if (!row.code?.trim()) {
        validation.errors.push('Code is required');
        validation.isValid = false;
        _errors.push({
          row: rowNumber,
          column: 'code',
          message: 'Code is required',
          severity: 'error'
        });
      } else {
        const normalizedCode = row.code.toLowerCase();
        
        // Check for duplicates in existing data
        if (existingCodes.has(normalizedCode)) {
          validation.errors.push('Code already exists in database');
          validation.isValid = false;
          _errors.push({
            row: rowNumber,
            column: 'code',
            message: 'Code already exists in database',
            severity: 'error'
          });
        }
        
        // Check for duplicates within import data
        if (importCodes.has(normalizedCode)) {
          validation.errors.push('Duplicate code in import data');
          validation.isValid = false;
          _errors.push({
            row: rowNumber,
            column: 'code',
            message: 'Duplicate code in import data',
            severity: 'error'
          });
        } else {
          importCodes.add(normalizedCode);
        }
      }

      // Validate phone format (optional)
      if (row.phone && row.phone.trim()) {
        const phoneRegex = /^[\d\s\-\+\(\)]+$/;
        if (!phoneRegex.test(row.phone)) {
          validation.warnings.push('Invalid phone number format');
          _warnings.push({
            row: rowNumber,
            column: 'phone',
            message: 'Invalid phone number format',
            severity: 'warning'
          });
        }
      }

      // Validate password (optional but if provided, check complexity)
      if (row.password && row.password.trim()) {
        if (row.password.length < 6) {
          validation.warnings.push('Password should be at least 6 characters long');
          _warnings.push({
            row: rowNumber,
            column: 'password',
            message: 'Password should be at least 6 characters long',
            severity: 'warning'
          });
        }
      }

      // Validate and resolve class reference (optional - only warn if not found)
      if (row.className && row.className.trim()) {
        const normalizedClassName = row.className.toLowerCase();
        if (classMap.has(normalizedClassName)) {
          resolvedData.classId = classMap.get(normalizedClassName);
        } else {
          validation.warnings.push(`Class with name '${row.className}' not found - will be skipped`);
          _warnings.push({
            row: rowNumber,
            column: 'className',
            message: `Class with name '${row.className}' not found - will be skipped`,
            severity: 'warning'
          });
        }
      }

      // Validate and resolve management department reference (optional - only warn if not found)
      if (row.managementDepartmentCode && row.managementDepartmentCode.trim()) {
        const normalizedCode = row.managementDepartmentCode.toLowerCase();
        if (departmentMap.has(normalizedCode)) {
          resolvedData.managementDepartmentId = departmentMap.get(normalizedCode);
        } else {
          validation.warnings.push(`Management Department with code '${row.managementDepartmentCode}' not found - will be skipped`);
          _warnings.push({
            row: rowNumber,
            column: 'managementDepartmentCode',
            message: `Management Department with code '${row.managementDepartmentCode}' not found - will be skipped`,
            severity: 'warning'
          });
        }
      }

      // Validate and resolve training department reference (optional - only warn if not found)
      if (row.trainingDepartmentCode && row.trainingDepartmentCode.trim()) {
        const normalizedCode = row.trainingDepartmentCode.toLowerCase();
        if (departmentMap.has(normalizedCode)) {
          resolvedData.trainingDepartmentId = departmentMap.get(normalizedCode);
        } else {
          validation.warnings.push(`Training Department with code '${row.trainingDepartmentCode}' not found - will be skipped`);
          _warnings.push({
            row: rowNumber,
            column: 'trainingDepartmentCode',
            message: `Training Department with code '${row.trainingDepartmentCode}' not found - will be skipped`,
            severity: 'warning'
          });
        }
      }

      // Validate and resolve organization references (optional - only warn if not found)
      if (row.organizationCodes && row.organizationCodes.trim()) {
        const orgCodes = row.organizationCodes.split(';')
          .map(code => code.trim())
          .filter(code => code.length > 0);
        
        const resolvedOrgIds: string[] = [];
        const invalidOrgCodes: string[] = [];
        
        for (const orgCode of orgCodes) {
          const normalizedOrgCode = orgCode.toLowerCase();
          if (organizationMap.has(normalizedOrgCode)) {
            resolvedOrgIds.push(organizationMap.get(normalizedOrgCode)!);
          } else {
            invalidOrgCodes.push(orgCode);
          }
        }
        
        if (invalidOrgCodes.length > 0) {
          validation.warnings.push(`Organizations not found: ${invalidOrgCodes.join(', ')} - will be skipped`);
          _warnings.push({
            row: rowNumber,
            column: 'organizationCodes',
            message: `Organizations not found: ${invalidOrgCodes.join(', ')} - will be skipped`,
            severity: 'warning'
          });
        }
        
        if (resolvedOrgIds.length > 0) {
          resolvedData.organizationIds = resolvedOrgIds;
        }
      }

      // Validate user type (optional - use default if invalid)
      if (row.userType && !['student', 'staff'].includes(row.userType)) {
        validation.warnings.push(`Invalid user type '${row.userType}'. Will default to 'student'`);
        resolvedData.userType = 'student'; // Default value
        _warnings.push({
          row: rowNumber,
          column: 'userType',
          message: `Invalid user type '${row.userType}'. Will default to 'student'`,
          severity: 'warning'
        });
      }

      // Validate membership status (optional - use default if invalid)
      if (row.membershipStatus && !['doan_vien', 'hoi_vien', 'both', 'none'].includes(row.membershipStatus)) {
        validation.warnings.push(`Invalid membership status '${row.membershipStatus}'. Will default to 'none'`);
        resolvedData.membershipStatus = 'none'; // Default value
        _warnings.push({
          row: rowNumber,
          column: 'membershipStatus',
          message: `Invalid membership status '${row.membershipStatus}'. Will default to 'none'`,
          severity: 'warning'
        });
      }

      // Business logic validations (only warnings)
      if (resolvedData.userType === 'student' && !row.className) {
        validation.warnings.push('Students typically should have a class assigned');
        _warnings.push({
          row: rowNumber,
          column: 'className',
          message: 'Students typically should have a class assigned',
          severity: 'warning'
        });
      }

      if (resolvedData.userType === 'staff' && !row.managementDepartmentCode) {
        validation.warnings.push('Staff members typically should have a management department assigned');
        _warnings.push({
          row: rowNumber,
          column: 'managementDepartmentCode',
          message: 'Staff members typically should have a management department assigned',
          severity: 'warning'
        });
      }

      // Final validation check - only fail if there are actual errors (not warnings)
      validation.isValid = validation.errors.length === 0;

      results.push({
        rowIndex: i + 2, // +2 because 0-based index + header row
        data: resolvedData,
        validation,
        _rowIndex: i + 2,
        _hasError: validation.errors.length > 0,
        _errors,
        _warnings
      });
    }

    return results;
  }

  async validateEmailUniqueness(email: string, excludeId?: string): Promise<boolean> {
    const query = this.userRepository.createQueryBuilder('user')
      .where('LOWER(user.email) = LOWER(:email)', { email });
    
    if (excludeId) {
      query.andWhere('user.id != :excludeId', { excludeId });
    }
    
    const existing = await query.getOne();
    return !existing;
  }

  async validateCodeUniqueness(code: string, excludeId?: string): Promise<boolean> {
    const query = this.userRepository.createQueryBuilder('user')
      .where('LOWER(user.code) = LOWER(:code)', { code });
    
    if (excludeId) {
      query.andWhere('user.id != :excludeId', { excludeId });
    }
    
    const existing = await query.getOne();
    return !existing;
  }
}
