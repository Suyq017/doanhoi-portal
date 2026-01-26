import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { Department } from "../../entities/department.entity";
import { DepartmentImportData } from "./excel-parser.service";

export interface ValidationError {
  row: number;
  column: string;
  message: string;
  severity: "error" | "warning";
}

export interface DepartmentImportDataWithValidation
  extends DepartmentImportData {
  _errors: ValidationError[];
  _warnings: ValidationError[];
}

export interface ValidationResult {
  isValid: boolean;
  data: DepartmentImportDataWithValidation[];
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
  data: DepartmentImportData;
  type: "internal" | "external";
}

export interface ConflictInfo {
  row: number;
  data: DepartmentImportData;
  existingDepartment: Department;
  conflictType: "name" | "code";
}

@Injectable()
export class ImportValidationService {
  constructor(
    @InjectRepository(Department)
    private departmentsRepository: Repository<Department>,
  ) {}

  async validateDepartmentData(
    data: DepartmentImportData[],
  ): Promise<ValidationResult> {
    const validatedData: DepartmentImportDataWithValidation[] = data.map(
      (item) => ({
        ...item,
        _errors: [] as ValidationError[],
        _warnings: [] as ValidationError[],
      }),
    );
    const allErrors: ValidationError[] = [];
    const allWarnings: ValidationError[] = [];

    // Basic validation - ERROR validation first
    for (let i = 0; i < validatedData.length; i++) {
      const item = validatedData[i];
      const rowNumber = i + 2; // Excel row (header is row 1)

      // Required field validation
      if (!item.name || item.name.trim() === "") {
        const error: ValidationError = {
          row: rowNumber,
          column: "name",
          message: "Department name is required",
          severity: "error",
        };
        item._errors.push(error);
        allErrors.push(error);
      }

      // Length validation
      if (item.name && item.name.length > 100) {
        const error: ValidationError = {
          row: rowNumber,
          column: "name",
          message: "Department name must be less than 100 characters",
          severity: "error",
        };
        item._errors.push(error);
        allErrors.push(error);
      }

      if (item.code && item.code.length > 20) {
        const error: ValidationError = {
          row: rowNumber,
          column: "code",
          message: "Department code must be less than 20 characters",
          severity: "error",
        };
        item._errors.push(error);
        allErrors.push(error);
      }
    }

    // Check duplicates within import data
    const duplicates = this.checkDuplicates(validatedData);
    for (const duplicate of duplicates) {
      for (const row of duplicate.rows) {
        const error: ValidationError = {
          row: row + 2,
          column: duplicate.type === "name" ? "name" : "code",
          message: `Duplicate ${duplicate.type} found in import data`,
          severity: "error",
        };
        validatedData[row]._errors.push(error);
        allErrors.push(error);
      }
    }

    // WARNING validation - only for rows without errors
    for (let i = 0; i < validatedData.length; i++) {
      const item = validatedData[i];
      const rowNumber = i + 2;

      // Only add warnings if the row doesn't have errors
      if (item._errors.length === 0) {
        if (item.description && item.description.length > 500) {
          const warning: ValidationError = {
            row: rowNumber,
            column: "description",
            message: "Description is quite long (over 500 characters)",
            severity: "warning",
          };
          item._warnings.push(warning);
          allWarnings.push(warning);
        }

        // Format validation
        if (item.code && !/^[A-Z0-9_-]+$/i.test(item.code)) {
          const warning: ValidationError = {
            row: rowNumber,
            column: "code",
            message:
              "Department code should only contain letters, numbers, underscore and dash",
            severity: "warning",
          };
          item._warnings.push(warning);
          allWarnings.push(warning);
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
          message: `${conflict.conflictType === "name" ? "Name" : "Code"} already exists in database`,
          severity: "warning",
        };
        validatedData[conflict.row]._warnings.push(warning);
        allWarnings.push(warning);
      }
    }

    const validCount = validatedData.filter(
      (item) => item._errors.length === 0,
    ).length;

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
        conflicts: conflicts.length,
      },
    };
  }

  checkDuplicates(
    data: DepartmentImportData[],
  ): Array<{ rows: number[]; type: "name" | "code" }> {
    const duplicates: Array<{ rows: number[]; type: "name" | "code" }> = [];

    // Check name duplicates
    const nameMap = new Map<string, number[]>();
    data.forEach((item, index) => {
      if (item.name) {
        const lowerName = item.name.toLowerCase().trim();
        if (!nameMap.has(lowerName)) {
          nameMap.set(lowerName, []);
        }
        nameMap.get(lowerName)!.push(index);
      }
    });

    nameMap.forEach((rows) => {
      if (rows.length > 1) {
        duplicates.push({ rows, type: "name" });
      }
    });

    // Check code duplicates
    const codeMap = new Map<string, number[]>();
    data.forEach((item, index) => {
      if (item.code) {
        const lowerCode = item.code.toLowerCase().trim();
        if (!codeMap.has(lowerCode)) {
          codeMap.set(lowerCode, []);
        }
        codeMap.get(lowerCode)!.push(index);
      }
    });

    codeMap.forEach((rows) => {
      if (rows.length > 1) {
        duplicates.push({ rows, type: "code" });
      }
    });

    return duplicates;
  }

  async checkExistingConflicts(
    data: DepartmentImportData[],
  ): Promise<ConflictInfo[]> {
    const conflicts: ConflictInfo[] = [];

    for (let i = 0; i < data.length; i++) {
      const item = data[i];

      // Check name conflicts
      if (item.name) {
        const existingByName = await this.departmentsRepository.findOne({
          where: { name: item.name },
        });

        if (existingByName) {
          conflicts.push({
            row: i,
            data: item,
            existingDepartment: existingByName,
            conflictType: "name",
          });
        }
      }

      // Check code conflicts
      if (item.code) {
        const existingByCode = await this.departmentsRepository.findOne({
          where: { code: item.code },
        });

        if (existingByCode) {
          conflicts.push({
            row: i,
            data: item,
            existingDepartment: existingByCode,
            conflictType: "code",
          });
        }
      }
    }

    return conflicts;
  }
}
