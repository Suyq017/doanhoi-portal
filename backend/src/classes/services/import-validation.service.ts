import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Class } from '../../entities/class.entity';
import { Department } from '../../entities/department.entity';
import { ClassImportData } from './excel-parser.service';

export interface ValidationError {
  row: number;
  column: string;
  message: string;
  severity: 'error' | 'warning';
}

export interface ClassImportDataWithValidation extends ClassImportData {
  _errors: ValidationError[];
  _warnings: ValidationError[];
  _departmentId?: string; // Resolved department ID
}

export interface ValidationResult {
  isValid: boolean;
  data: ClassImportDataWithValidation[];
  errors: ValidationError[];
  warnings: ValidationError[];
  summary: {
    total: number;
    valid: number;
    invalid: number;
    duplicates: number;
    conflicts: number;
  };
}

export interface DuplicateInfo {
  rows: number[];
  data: ClassImportData;
  type: 'internal' | 'external';
}

export interface ConflictInfo {
  row: number;
  data: ClassImportData;
  existingClass: Class;
  conflictType: 'name' | 'code';
}

@Injectable()
export class ImportValidationService {
  constructor(
    @InjectRepository(Class)
    private classesRepository: Repository<Class>,
    @InjectRepository(Department)
    private departmentsRepository: Repository<Department>,
  ) { }

  async validateClassData(data: ClassImportData[]): Promise<ValidationResult> {
    const validatedData: ClassImportDataWithValidation[] = data.map(item => ({
      ...item,
      _errors: [] as ValidationError[],
      _warnings: [] as ValidationError[]
    }));
    const allErrors: ValidationError[] = [];
    const allWarnings: ValidationError[] = [];

    // Load all departments for validation
    const departments = await this.departmentsRepository.find();
    const departmentMap = new Map<string, string>(); // code -> id
    departments.forEach(dept => {
      if (dept.code) {
        departmentMap.set(dept.code.toLowerCase(), dept.id);
      }
    });

    // Basic validation
    for (let i = 0; i < validatedData.length; i++) {
      const item = validatedData[i];
      const rowNumber = i + 2; // Excel row (header is row 1)

      // Required field validation
      if (!item.name || item.name.trim() === '') {
        const error: ValidationError = {
          row: rowNumber,
          column: 'name',
          message: 'Class name is required',
          severity: 'error'
        };
        item._errors.push(error);
        allErrors.push(error);
      }

      // Length validation
      if (item.name && item.name.length > 100) {
        const error: ValidationError = {
          row: rowNumber,
          column: 'name',
          message: 'Class name must be less than 100 characters',
          severity: 'error'
        };
        item._errors.push(error);
        allErrors.push(error);
      }

      // Note: Class entity doesn't have code field, so we skip code validation

      // Year validation
      if (item.year && (item.year < 2000 || item.year > 2100)) {
        const error: ValidationError = {
          row: rowNumber,
          column: 'year',
          message: 'Year must be between 2000 and 2100',
          severity: 'error'
        };
        item._errors.push(error);
        allErrors.push(error);
      }

      // Format validation (code field is optional and not stored in database)
    }

    // Check duplicates within import data
    const duplicates = this.checkDuplicates(validatedData);
    for (const duplicate of duplicates) {
      for (const row of duplicate.rows) {
        const error: ValidationError = {
          row: row + 2,
          column: duplicate.type === 'name' ? 'name' : 'code',
          message: `Duplicate ${duplicate.type} found in import data`,
          severity: 'error'
        };
        validatedData[row]._errors.push(error);
        allErrors.push(error);
      }
    }

    // Department code validation - add errors for non-existent department codes
    for (let i = 0; i < validatedData.length; i++) {
      const item = validatedData[i];
      const rowNumber = i + 2;

      if (item.departmentCode) {
        const departmentId = departmentMap.get(item.departmentCode.toLowerCase());
        if (departmentId) {
          item._departmentId = departmentId;
        } else {
          // Add error if department code doesn't exist (blocks import)
          const error: ValidationError = {
            row: rowNumber,
            column: 'departmentCode',
            message: `Không tìm thấy khoa/đơn vị với mã '${item.departmentCode}'`,
            severity: 'error'
          };
          item._errors.push(error);
          allErrors.push(error);
        }
      }
    }

    // Check conflicts with existing data (only for rows without errors)
    const conflicts = await this.checkExistingConflicts(validatedData);
    for (const conflict of conflicts) {
      // Only add warning if the row doesn't already have errors
      if (validatedData[conflict.row]._errors.length === 0) {
        const warning: ValidationError = {
          row: conflict.row + 2,
          column: conflict.conflictType,
          message: `${conflict.conflictType === 'name' ? 'Name' : 'Code'} already exists in database`,
          severity: 'warning'
        };
        validatedData[conflict.row]._warnings.push(warning);
        allWarnings.push(warning);
      }
    }

    const validCount = validatedData.filter(item => item._errors.length === 0).length;

    return {
      isValid: allErrors.length === 0,
      data: validatedData,
      errors: allErrors,
      warnings: allWarnings,
      summary: {
        total: data.length,
        valid: validCount,
        invalid: data.length - validCount,
        duplicates: duplicates.length,
        conflicts: conflicts.length
      }
    };
  }

  checkDuplicates(data: ClassImportData[]): Array<{ rows: number[]; type: 'name' | 'code' }> {
    const duplicates: Array<{ rows: number[]; type: 'name' | 'code' }> = [];

    // Check name duplicates within same year
    const nameYearMap = new Map<string, number[]>();
    data.forEach((item, index) => {
      if (item.name && item.year) {
        const key = `${item.name.toLowerCase().trim()}_${item.year}`;
        if (!nameYearMap.has(key)) {
          nameYearMap.set(key, []);
        }
        nameYearMap.get(key)!.push(index);
      }
    });

    nameYearMap.forEach((rows) => {
      if (rows.length > 1) {
        duplicates.push({ rows, type: 'name' });
      }
    });

    // Check name duplicates within same year only (no code duplicates since Class entity doesn't have code)

    return duplicates;
  }

  async checkExistingConflicts(data: ClassImportData[]): Promise<ConflictInfo[]> {
    const conflicts: ConflictInfo[] = [];

    for (let i = 0; i < data.length; i++) {
      const item = data[i];

      // Check name conflicts within same year
      if (item.name && item.year) {
        const existingByName = await this.classesRepository.findOne({
          where: {
            name: item.name,
            year: item.year
          }
        });

        if (existingByName) {
          conflicts.push({
            row: i,
            data: item,
            existingClass: existingByName,
            conflictType: 'name'
          });
        }
      }

      // Note: Class entity doesn't have code field, so we skip code conflict checking
    }

    return conflicts;
  }
}
