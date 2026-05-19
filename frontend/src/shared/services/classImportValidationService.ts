import { ClassImportData } from './classExcelParserService';
import { apiClient } from './apiClient';

export interface ValidationError {
    row: number;
    field: string;
    value: any;
    message: string;
    type: 'error' | 'warning';
}

export interface ValidationResult {
    isValid: boolean;
    errors: ValidationError[];
    warnings: ValidationError[];
    summary: {
        total: number;
        valid: number;
        invalid: number;
        duplicates: number;
    };
}

/**
 * Service for validating class import data
 */
export class ClassImportValidationService {
    /**
     * Validate array of class import data
     * @param data - Array of class import data to validate
     * @returns Validation result with errors and warnings
     */
    async validateClassImportData(
        data: ClassImportData[]
    ): Promise<ValidationResult> {
        const errors: ValidationError[] = [];
        const warnings: ValidationError[] = [];

        // Validate each row
        data.forEach((item, index) => {
            const rowNumber = index + 2; // Excel row (1-indexed + header)

            // Validate required fields
            const fieldErrors = this.validateRequiredFields(item, rowNumber);
            errors.push(...fieldErrors);

            // Validate formats
            const formatErrors = this.validateFormats(item, rowNumber);
            warnings.push(...formatErrors);

            // Validate business rules
            const businessErrors = this.validateBusinessRules(item, rowNumber);
            warnings.push(...businessErrors);
        });

        // Check for duplicate class names within the file
        const duplicateErrors = this.checkDuplicates(data);
        errors.push(...duplicateErrors);

        // Validate department codes exist (call API)
        const departmentErrors = await this.validateDepartmentCodes(data);
        errors.push(...departmentErrors);

        // Calculate summary
        const uniqueRowsWithErrors = new Set(
            errors.filter(e => e.type === 'error').map(e => e.row)
        );

        return {
            isValid: errors.length === 0,
            errors,
            warnings,
            summary: {
                total: data.length,
                valid: data.length - uniqueRowsWithErrors.size,
                invalid: uniqueRowsWithErrors.size,
                duplicates: duplicateErrors.length
            }
        };
    }

    /**
     * Validate required fields
     */
    private validateRequiredFields(
        item: ClassImportData,
        rowNumber: number
    ): ValidationError[] {
        const errors: ValidationError[] = [];

        // Class name is required
        if (!item.name || !item.name.trim()) {
            errors.push({
                row: rowNumber,
                field: 'name',
                value: item.name,
                message: 'Tên lớp không được để trống',
                type: 'error'
            });
        }

        return errors;
    }

    /**
     * Validate data formats
     */
    private validateFormats(
        item: ClassImportData,
        rowNumber: number
    ): ValidationError[] {
        const errors: ValidationError[] = [];

        // Validate year format if provided
        if (item.year !== undefined) {
            if (!this.isValidYear(item.year)) {
                errors.push({
                    row: rowNumber,
                    field: 'year',
                    value: item.year,
                    message: 'Năm học không hợp lệ (phải từ 2000 đến 2100)',
                    type: 'warning'
                });
            }
        }

        // Validate department code format if provided
        if (item.departmentCode && !this.isValidDepartmentCode(item.departmentCode)) {
            errors.push({
                row: rowNumber,
                field: 'departmentCode',
                value: item.departmentCode,
                message: 'Mã khoa không đúng định dạng (2-20 ký tự chữ và số)',
                type: 'warning'
            });
        }

        return errors;
    }

    /**
     * Validate business rules
     */
    private validateBusinessRules(
        item: ClassImportData,
        rowNumber: number
    ): ValidationError[] {
        const errors: ValidationError[] = [];

        // Class name should not be too long
        if (item.name && item.name.length > 100) {
            errors.push({
                row: rowNumber,
                field: 'name',
                value: item.name,
                message: 'Tên lớp quá dài (tối đa 100 ký tự)',
                type: 'warning'
            });
        }

        // Class name should have reasonable length
        if (item.name && item.name.trim().length < 2) {
            errors.push({
                row: rowNumber,
                field: 'name',
                value: item.name,
                message: 'Tên lớp quá ngắn (tối thiểu 2 ký tự)',
                type: 'warning'
            });
        }

        return errors;
    }

    /**
     * Check for duplicate class names within the file
     */
    private checkDuplicates(data: ClassImportData[]): ValidationError[] {
        const errors: ValidationError[] = [];
        const seen = new Map<string, number>();

        data.forEach((item, index) => {
            const rowNumber = index + 2;

            if (!item.name || !item.name.trim()) {
                return; // Skip validation for empty names (already caught by required field validation)
            }

            const key = item.name.trim().toLowerCase();

            if (seen.has(key)) {
                errors.push({
                    row: rowNumber,
                    field: 'name',
                    value: item.name,
                    message: `Tên lớp bị trùng với dòng ${seen.get(key)}`,
                    type: 'error'
                });
            } else {
                seen.set(key, rowNumber);
            }
        });

        return errors;
    }

    /**
     * Validate that department codes exist in the database
     */
    private async validateDepartmentCodes(data: ClassImportData[]): Promise<ValidationError[]> {
        const errors: ValidationError[] = [];

        // Get unique department codes (excluding undefined/empty)
        const departmentCodes = [...new Set(
            data
                .filter(item => item.departmentCode && item.departmentCode.trim())
                .map(item => item.departmentCode!)
        )];

        if (departmentCodes.length === 0) {
            return errors;
        }

        try {
            // Call API to validate department codes
            const response = await apiClient.post<{
                validCodes: string[];
                invalidCodes: string[];
            }>('/departments/validate-codes', { codes: departmentCodes });

            const invalidCodesSet = new Set(response.invalidCodes);

            // Add errors for rows with invalid department codes
            data.forEach((item, index) => {
                if (item.departmentCode && invalidCodesSet.has(item.departmentCode)) {
                    errors.push({
                        row: index + 2,
                        field: 'departmentCode',
                        value: item.departmentCode,
                        message: `Không tìm thấy khoa với mã: ${item.departmentCode}`,
                        type: 'error'
                    });
                }
            });
        } catch (error) {
            console.error('Error validating department codes:', error);
            // Don't block import if validation API fails
            // Log warning but continue
        }

        return errors;
    }

    /**
     * Check if year is valid
     */
    private isValidYear(year: number): boolean {
        return year >= 2000 && year <= 2100;
    }

    /**
     * Check if department code format is valid
     * Basic validation - alphanumeric, 2-20 characters
     */
    private isValidDepartmentCode(code: string): boolean {
        return /^[A-Z0-9]{2,20}$/.test(code);
    }
}
