import * as yup from 'yup';
import { UserImportData, ValidationError, ValidationResult } from '../../types/userImport';

export class ImportValidationService {
  private userSchema = yup.object().shape({
    // Required fields only
    code: yup.string()
      .required('Mã số sinh viên/cán bộ không được để trống')
      .min(1, 'Mã số không được để trống')
      .max(50, 'Mã số không được vượt quá 50 ký tự'),
    
    familyName: yup.string()
      .required('Họ và tên lót không được để trống')
      .min(1, 'Họ và tên lót không được để trống')
      .max(100, 'Họ và tên lót không được vượt quá 100 ký tự'),
    
    givenName: yup.string()
      .required('Tên không được để trống')
      .min(1, 'Tên không được để trống')
      .max(50, 'Tên không được vượt quá 50 ký tự')
  });

  /**
   * Validate array of user import data
   */
  async validateUserImportData(data: UserImportData[]): Promise<ValidationResult> {
    const errors: ValidationError[] = [];
    const warnings: ValidationError[] = [];
    const validData: UserImportData[] = [];

    // Check for duplicates first
    const duplicateErrors = this.checkDuplicates(data);
    errors.push(...duplicateErrors);

    // Validate each record
    for (let i = 0; i < data.length; i++) {
      const user = data[i];
      const rowNumber = i + 1;

      try {
        // Validate against schema
        await this.userSchema.validate(user, { abortEarly: false });
        
        // No additional business rules or warnings for simplified validation

        validData.push(user);

      } catch (validationError) {
        if (validationError instanceof yup.ValidationError) {
          validationError.errors.forEach(errorMsg => {
            errors.push({
              row: rowNumber,
              field: validationError.path || 'unknown',
              value: user[validationError.path as keyof UserImportData],
              message: errorMsg,
              type: 'validation'
            });
          });
        }
      }
    }

    const summary = {
      total: data.length,
      valid: validData.length,
      invalid: data.length - validData.length,
      duplicates: duplicateErrors.length
    };

    return {
      isValid: errors.length === 0,
      data: validData,
      errors,
      warnings,
      summary
    };
  }



  private checkDuplicates(data: UserImportData[]): ValidationError[] {
    const errors: ValidationError[] = [];
    const seenCodes = new Map<string, number>();

    data.forEach((user, index) => {
      const existingIndex = seenCodes.get(user.code);
      
      if (existingIndex !== undefined) {
        errors.push({
          row: index + 1,
          field: 'code',
          value: user.code,
          message: `Mã số bị trùng với dòng ${existingIndex + 1}`,
          type: 'validation'
        });
      } else {
        seenCodes.set(user.code, index);
      }
    });

    return errors;
  }



  /**
   * Validate required fields only (for quick validation)
   */
  validateRequiredFields(user: UserImportData): ValidationError[] {
    const errors: ValidationError[] = [];

    if (!user.code?.trim()) {
      errors.push({
        row: 0,
        field: 'code',
        value: user.code,
        message: 'Mã số không được để trống',
        type: 'validation'
      });
    }

    if (!user.familyName?.trim()) {
      errors.push({
        row: 0,
        field: 'familyName',
        value: user.familyName,
        message: 'Họ và tên lót không được để trống',
        type: 'validation'
      });
    }

    if (!user.givenName?.trim()) {
      errors.push({
        row: 0,
        field: 'givenName',
        value: user.givenName,
        message: 'Tên không được để trống',
        type: 'validation'
      });
    }

    return errors;
  }
}