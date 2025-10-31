import { ParticipantImportData, GradingImportData } from './excelParserService';
import { userService } from '../../../shared/services/userService';

export interface ValidationResult<T> {
  data: T[];
  validData: T[];
  invalidData: T[];
  errors: ValidationError[];
  warnings: ValidationWarning[];
  summary: {
    total: number;
    valid: number;
    invalid: number;
    duplicates: number;
    conflicts: number;
  };
}

export interface ValidationError {
  row: number;
  field: string;
  value: any;
  message: string;
  type: 'validation' | 'business' | 'duplicate' | 'conflict';
}

export interface ValidationWarning {
  row: number;
  field: string;
  value: any;
  message: string;
  type: 'warning' | 'info';
}

export interface ParticipantValidationData extends ParticipantImportData {
  _hasError?: boolean;
  _errorMessage?: string;
  _studentExists?: boolean;
  _isAlreadyParticipating?: boolean;
  _studentData?: any;
}

export interface GradingValidationData extends GradingImportData {
  _hasError?: boolean;
  _errorMessage?: string;
  _participantExists?: boolean;
  _participantId?: number;
  _exceedsMaxDays?: boolean;
  _participantData?: any;
  _hasParseError?: boolean;
  _parseErrorMessage?: string;
}

export class ImportValidationService {
  /**
   * Validate participant import data (students)
   */
  async validateParticipantData(
    data: ParticipantImportData[],
    existingParticipants: any[] = [],
    onProgress?: (progress: number) => void
  ): Promise<ValidationResult<ParticipantValidationData>> {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];
    const validatedData: ParticipantValidationData[] = [];

    onProgress?.(10);

    // Check for duplicates within the import data
    const duplicateMap = this.findDuplicatesInData(data, 'studentCode');
    
    onProgress?.(30);

    // Validate each participant
    for (let i = 0; i < data.length; i++) {
      const participant = data[i];
      const rowNumber = i + 1;
      
      const validationResult = await this.validateSingleParticipant(
        participant,
        rowNumber,
        existingParticipants,
        duplicateMap
      );

      validatedData.push(validationResult.data);
      errors.push(...validationResult.errors);
      warnings.push(...validationResult.warnings);

      // Update progress
      if (i % 10 === 0) {
        onProgress?.(30 + (i / data.length) * 60);
      }
    }

    onProgress?.(100);

    const validData = validatedData.filter(item => !item._hasError);
    const invalidData = validatedData.filter(item => item._hasError);

    return {
      data: validatedData,
      validData,
      invalidData,
      errors,
      warnings,
      summary: {
        total: data.length,
        valid: validData.length,
        invalid: invalidData.length,
        duplicates: Object.keys(duplicateMap).length,
        conflicts: errors.filter(e => e.type === 'conflict').length
      }
    };
  }

  /**
   * Validate grading import data
   */
  async validateGradingData(
    data: GradingImportData[],
    existingParticipants: any[] = [],
    activityTotalDays?: number,
    onProgress?: (progress: number) => void
  ): Promise<ValidationResult<GradingValidationData>> {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];
    const validatedData: GradingValidationData[] = [];

    onProgress?.(10);

    // Check for duplicates within the import data
    const duplicateMap = this.findDuplicatesInData(data, 'studentCode');
    
    onProgress?.(30);

    // Validate each grading record
    for (let i = 0; i < data.length; i++) {
      const grading = data[i];
      const rowNumber = i + 1;
      
      const validationResult = await this.validateSingleGrading(
        grading,
        rowNumber,
        existingParticipants,
        activityTotalDays,
        duplicateMap
      );

      validatedData.push(validationResult.data);
      errors.push(...validationResult.errors);
      warnings.push(...validationResult.warnings);

      // Update progress
      if (i % 10 === 0) {
        onProgress?.(30 + (i / data.length) * 60);
      }
    }

    onProgress?.(100);

    const validData = validatedData.filter(item => !item._hasError);
    const invalidData = validatedData.filter(item => item._hasError);

    return {
      data: validatedData,
      validData,
      invalidData,
      errors,
      warnings,
      summary: {
        total: data.length,
        valid: validData.length,
        invalid: invalidData.length,
        duplicates: Object.keys(duplicateMap).length,
        conflicts: errors.filter(e => e.type === 'conflict').length
      }
    };
  }

  /**
   * Validate single participant
   */
  private async validateSingleParticipant(
    participant: ParticipantImportData,
    rowNumber: number,
    existingParticipants: any[],
    duplicateMap: Record<string, number[]>
  ): Promise<{
    data: ParticipantValidationData;
    errors: ValidationError[];
    warnings: ValidationWarning[];
  }> {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];
    let hasError = false;
    let errorMessage = '';

    // Priority 1: Check for duplicates in import data (highest priority error)
    if (duplicateMap[participant.studentCode] && duplicateMap[participant.studentCode].length > 1) {
      errors.push({
        row: rowNumber,
        field: 'studentCode',
        value: participant.studentCode,
        message: `Mã số sinh viên ${participant.studentCode} bị trùng lặp trong file import`,
        type: 'duplicate'
      });
      hasError = true;
      errorMessage = `Mã số sinh viên bị trùng lặp trong file`;
      
      // Return early for duplicate errors - no need to check further
      const validatedParticipant: ParticipantValidationData = {
        ...participant,
        _hasError: hasError,
        _errorMessage: errorMessage,
        _studentExists: false,
        _isAlreadyParticipating: false,
        _studentData: null
      };

      return {
        data: validatedParticipant,
        errors,
        warnings
      };
    }

    // Priority 2: Check if already participating (Frontend check since we have the data)
    const isAlreadyParticipating = existingParticipants.some(p => 
      p.student_code === participant.studentCode || 
      (p.student?.student_code === participant.studentCode)
    );

    if (isAlreadyParticipating) {
      errors.push({
        row: rowNumber,
        field: 'studentCode',
        value: participant.studentCode,
        message: `Sinh viên ${participant.studentCode} đã tham gia hoạt động này`,
        type: 'conflict'
      });
      hasError = true;
      errorMessage = `Sinh viên ${participant.studentCode} đã tham gia hoạt động`;
      
      // Return early - no need to check student existence if already participating
      const validatedParticipant: ParticipantValidationData = {
        ...participant,
        _hasError: hasError,
        _errorMessage: errorMessage,
        _studentExists: false, // Don't matter since already participating
        _isAlreadyParticipating: isAlreadyParticipating,
        _studentData: null
      };

      return {
        data: validatedParticipant,
        errors,
        warnings
      };
    }

    // Priority 3: Validate student exists in system (Frontend validation)
    let studentExists = false;
    let studentData = null;
    
    try {
      const user = await userService.findByExactCode(participant.studentCode);
      if (user) {
        studentExists = true;
        studentData = {
          id: user.id,
          student_code: user.code || participant.studentCode,
          full_name: `${user.familyName} ${user.givenName}`,
          email: user.email
        };

        // Update name and email if not provided
        if (!participant.name) {
          participant.name = studentData.full_name;
        }
        if (!participant.email) {
          participant.email = studentData.email;
        }
      } else {
        // Student not found - this is an error since we're checking frontend
        errors.push({
          row: rowNumber,
          field: 'studentCode',
          value: participant.studentCode,
          message: `Không tìm thấy sinh viên với mã số ${participant.studentCode}`,
          type: 'validation'
        });
        hasError = true;
        errorMessage = `Sinh viên ${participant.studentCode} không tồn tại trong hệ thống`;
      }
    } catch (error) {
      console.error(`Error looking up student ${participant.studentCode}:`, error);
      errors.push({
        row: rowNumber,
        field: 'studentCode',
        value: participant.studentCode,
        message: `Lỗi khi tra cứu thông tin sinh viên ${participant.studentCode}`,
        type: 'validation'
      });
      hasError = true;
      errorMessage = `Lỗi khi tra cứu thông tin sinh viên ${participant.studentCode}`;
    }

    // Priority 4: Validate email format if provided (low priority)
    if (participant.email && !this.isValidEmail(participant.email)) {
      warnings.push({
        row: rowNumber,
        field: 'email',
        value: participant.email,
        message: `Định dạng email không hợp lệ: ${participant.email}`,
        type: 'warning'
      });
      // Email validation doesn't set hasError - it's just a warning
    }

    const validatedParticipant: ParticipantValidationData = {
      ...participant,
      _hasError: hasError,
      _errorMessage: errorMessage || undefined,
      _studentExists: studentExists,
      _isAlreadyParticipating: false, // We already handled this case above
      _studentData: studentData
    };

    return {
      data: validatedParticipant,
      errors,
      warnings
    };
  }

  /**
   * Validate single grading record
   */
  private async validateSingleGrading(
    grading: GradingImportData,
    rowNumber: number,
    existingParticipants: any[],
    activityTotalDays?: number,
    duplicateMap: Record<string, number[]> = {}
  ): Promise<{
    data: GradingValidationData;
    errors: ValidationError[];
    warnings: ValidationWarning[];
  }> {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];
    let hasError = false;
    let errorMessage = '';

    // Check for duplicates in import data
    if (duplicateMap[grading.studentCode] && duplicateMap[grading.studentCode].length > 1) {
      errors.push({
        row: rowNumber,
        field: 'studentCode',
        value: grading.studentCode,
        message: `Mã số sinh viên ${grading.studentCode} bị trùng lặp trong file import`,
        type: 'duplicate'
      });
      hasError = true;
      errorMessage = `Mã số sinh viên bị trùng lặp trong file`;
    }

    // Check for parse errors first
    if (grading._hasParseError) {
      errors.push({
        row: rowNumber,
        field: 'actualDays',
        value: grading.actualDays,
        message: grading._parseErrorMessage || 'Lỗi khi phân tích dữ liệu',
        type: 'validation'
      });
      hasError = true;
      errorMessage = grading._parseErrorMessage || 'Lỗi khi phân tích dữ liệu';
    }

    // Find participant in existing participants
    const participant = existingParticipants.find(p => 
      p.student_code === grading.studentCode || 
      (p.student?.student_code === grading.studentCode)
    );

    if (!participant) {
      errors.push({
        row: rowNumber,
        field: 'studentCode',
        value: grading.studentCode,
        message: `Sinh viên ${grading.studentCode} chưa tham gia hoạt động này`,
        type: 'validation'
      });
      hasError = true;
      errorMessage = `Sinh viên chưa tham gia hoạt động`;
    }

    // Validate actual days
    if (typeof grading.actualDays !== 'number' || isNaN(grading.actualDays)) {
      errors.push({
        row: rowNumber,
        field: 'actualDays',
        value: grading.actualDays,
        message: `Số ngày CTXH không hợp lệ: "${grading.actualDays}". Vui lòng nhập một số hợp lệ`,
        type: 'validation'
      });
      hasError = true;
      errorMessage = `Số ngày CTXH không hợp lệ`;
    } else if (grading.actualDays < 0) {
      errors.push({
        row: rowNumber,
        field: 'actualDays',
        value: grading.actualDays,
        message: `Số ngày CTXH không được âm: ${grading.actualDays}`,
        type: 'validation'
      });
      hasError = true;
      errorMessage = `Số ngày CTXH không hợp lệ`;
    } else if (grading.actualDays > 365) {
      errors.push({
        row: rowNumber,
        field: 'actualDays',
        value: grading.actualDays,
        message: `Số ngày CTXH quá lớn: ${grading.actualDays}. Vui lòng kiểm tra lại`,
        type: 'validation'
      });
      hasError = true;
      errorMessage = `Số ngày CTXH không hợp lệ`;
    }

    // Check if exceeds activity total days - THIS SHOULD BE AN ERROR
    let exceedsMaxDays = false;
    if (activityTotalDays && grading.actualDays > activityTotalDays) {
      exceedsMaxDays = true;
      hasError = true; // Mark as ERROR, not warning
      
      // Format display: Remove .0 from numbers like 5.0 -> 5
      const displayTotalDays = activityTotalDays % 1 === 0 ? 
        Math.floor(activityTotalDays).toString() : 
        activityTotalDays.toString();
      
      errors.push({
        row: rowNumber,
        field: 'actualDays',
        value: grading.actualDays,
        message: `Số ngày CTXH (${grading.actualDays}) vượt quá tổng số ngày hoạt động (${displayTotalDays})`,
        type: 'validation'
      });
      
      // Update error message if it's not already set from parse errors
      if (!errorMessage || !errorMessage.includes('không hợp lệ')) {
        errorMessage = `Số ngày CTXH vượt quá giới hạn`;
      }
    }

    const validatedGrading: GradingValidationData = {
      ...grading,
      _hasError: hasError,
      _errorMessage: errorMessage || undefined,
      _participantExists: !!participant,
      _participantId: participant?.id,
      _exceedsMaxDays: exceedsMaxDays,
      _participantData: participant
    };

    return {
      data: validatedGrading,
      errors,
      warnings
    };
  }

  /**
   * Find duplicates in data array
   */
  private findDuplicatesInData<T>(data: T[], keyField: keyof T): Record<string, number[]> {
    const seen = new Map<string, number[]>();
    
    data.forEach((item, index) => {
      const key = String(item[keyField]);
      if (!seen.has(key)) {
        seen.set(key, []);
      }
      seen.get(key)!.push(index + 1); // 1-based row numbers
    });

    // Return only items that appear more than once
    const duplicates: Record<string, number[]> = {};
    seen.forEach((rows, key) => {
      if (rows.length > 1) {
        duplicates[key] = rows;
      }
    });

    return duplicates;
  }

  /**
   * Validate email format
   */
  private isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  /**
   * Clean and normalize data
   */
  cleanData<T>(data: T[]): T[] {
    return data.map(item => {
      const cleaned = { ...item };
      
      // Trim string values
      Object.keys(cleaned as object).forEach(key => {
        if (typeof (cleaned as any)[key] === 'string') {
          (cleaned as any)[key] = (cleaned as any)[key].trim();
        }
      });

      return cleaned;
    });
  }
}

export const importValidationService = new ImportValidationService();