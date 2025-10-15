import { OrganizationImportData } from '../types/organization';

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
 * Service for validating organization member import data
 * Handles validation for both Level 2 and Level 3 imports
 */
export class OrganizationImportValidationService {
    /**
     * Validate array of organization import data
     * @param data - Array of organization import data to validate
     * @param level - Organization level (2 or 3)
     * @returns Validation result with errors and warnings
     */
    async validateOrganizationImportData(
        data: OrganizationImportData[],
        level: 2 | 3
    ): Promise<ValidationResult> {
        const errors: ValidationError[] = [];
        const warnings: ValidationError[] = [];

        // Validate each row
        data.forEach((item, index) => {
            const rowNumber = index + 2; // Excel row (1-indexed + header)

            // Validate required fields
            const fieldErrors = this.validateRequiredFields(item, level, rowNumber);
            errors.push(...fieldErrors);

            // Validate formats
            const formatErrors = this.validateFormats(item, level, rowNumber);
            warnings.push(...formatErrors);

            // Validate business rules
            const businessErrors = this.validateBusinessRules(item, level, rowNumber);
            warnings.push(...businessErrors);
        });

        // Check for duplicates within the file
        const duplicateErrors = this.checkDuplicates(data, level);
        errors.push(...duplicateErrors);

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
     * Validate required fields based on level
     */
    private validateRequiredFields(
        item: OrganizationImportData,
        level: 2 | 3,
        rowNumber: number
    ): ValidationError[] {
        const errors: ValidationError[] = [];

        // Student code is always required
        if (!item.studentCode || !item.studentCode.trim()) {
            errors.push({
                row: rowNumber,
                field: 'studentCode',
                value: item.studentCode,
                message: 'Mã số sinh viên không được để trống',
                type: 'error'
            });
        }

        // Class/Unit code is required for Level 2
        if (level === 2 && (!item.classOrUnitCode || !item.classOrUnitCode.trim())) {
            errors.push({
                row: rowNumber,
                field: 'classOrUnitCode',
                value: item.classOrUnitCode,
                message: 'Mã lớp/đơn vị không được để trống (bắt buộc cho Level 2)',
                type: 'error'
            });
        }

        return errors;
    }

    /**
     * Validate data formats
     */
    private validateFormats(
        item: OrganizationImportData,
        level: 2 | 3,
        rowNumber: number
    ): ValidationError[] {
        const errors: ValidationError[] = [];

        // Validate student code format
        if (item.studentCode && !this.isValidStudentCode(item.studentCode)) {
            errors.push({
                row: rowNumber,
                field: 'studentCode',
                value: item.studentCode,
                message: 'Mã số sinh viên không đúng định dạng (nên là 6-15 ký tự chữ và số)',
                type: 'warning'
            });
        }

        // Validate class/unit code format for Level 2
        if (level === 2 && item.classOrUnitCode && !this.isValidCode(item.classOrUnitCode)) {
            errors.push({
                row: rowNumber,
                field: 'classOrUnitCode',
                value: item.classOrUnitCode,
                message: 'Mã lớp/đơn vị không đúng định dạng',
                type: 'warning'
            });
        }

        // Check for special characters that might cause issues
        if (item.studentCode && this.containsSpecialCharacters(item.studentCode)) {
            errors.push({
                row: rowNumber,
                field: 'studentCode',
                value: item.studentCode,
                message: 'Mã số sinh viên chứa ký tự đặc biệt không hợp lệ',
                type: 'warning'
            });
        }

        return errors;
    }

    /**
     * Validate business rules
     */
    private validateBusinessRules(
        item: OrganizationImportData,
        level: 2 | 3,
        rowNumber: number
    ): ValidationError[] {
        const errors: ValidationError[] = [];

        // Check student code length
        if (item.studentCode && (item.studentCode.length < 3 || item.studentCode.length > 20)) {
            errors.push({
                row: rowNumber,
                field: 'studentCode',
                value: item.studentCode,
                message: 'Mã số sinh viên phải có độ dài từ 3-20 ký tự',
                type: 'warning'
            });
        }

        // Check class/unit code length for Level 2
        if (level === 2 && item.classOrUnitCode) {
            if (item.classOrUnitCode.length < 2 || item.classOrUnitCode.length > 50) {
                errors.push({
                    row: rowNumber,
                    field: 'classOrUnitCode',
                    value: item.classOrUnitCode,
                    message: 'Mã lớp/đơn vị phải có độ dài từ 2-50 ký tự',
                    type: 'warning'
                });
            }
        }

        return errors;
    }

    /**
     * Check for duplicate entries within the file
     */
    private checkDuplicates(
        data: OrganizationImportData[],
        level: 2 | 3
    ): ValidationError[] {
        const errors: ValidationError[] = [];
        const seen = new Map<string, number>(); // key -> first row number

        data.forEach((item, index) => {
            const rowNumber = index + 2;

            // Create unique key based on level
            let key: string;
            if (level === 2) {
                key = `${item.studentCode}|${item.classOrUnitCode}`;
            } else {
                key = item.studentCode;
            }

            // Check if we've seen this key before
            const firstOccurrence = seen.get(key);
            if (firstOccurrence !== undefined) {
                errors.push({
                    row: rowNumber,
                    field: level === 2 ? 'studentCode,classOrUnitCode' : 'studentCode',
                    value: key,
                    message: `Dữ liệu bị trùng lặp với dòng ${firstOccurrence}`,
                    type: 'error'
                });
            } else {
                seen.set(key, rowNumber);
            }
        });

        return errors;
    }

    /**
     * Validate student code format
     * Basic validation - can be enhanced based on specific business rules
     */
    private isValidStudentCode(code: string): boolean {
        // Should be 6-15 alphanumeric characters
        return /^[A-Z0-9]{6,15}$/i.test(code);
    }

    /**
     * Validate general code format
     */
    private isValidCode(code: string): boolean {
        // Should not be empty and should have reasonable length
        if (!code || code.length < 2 || code.length > 50) {
            return false;
        }

        // Should not contain only whitespace
        if (code.trim().length === 0) {
            return false;
        }

        return true;
    }

    /**
     * Check if string contains problematic special characters
     */
    private containsSpecialCharacters(str: string): boolean {
        // Allow alphanumeric, dash, underscore, and dot
        return !/^[A-Z0-9\-_.]+$/i.test(str);
    }

    /**
     * Get validation summary message
     */
    getValidationSummaryMessage(result: ValidationResult): string {
        const { summary } = result;

        if (result.isValid) {
            return `✓ Tất cả ${summary.total} dòng dữ liệu hợp lệ`;
        }

        const messages: string[] = [];

        if (summary.invalid > 0) {
            messages.push(`${summary.invalid} dòng có lỗi`);
        }

        if (summary.duplicates > 0) {
            messages.push(`${summary.duplicates} dòng bị trùng lặp`);
        }

        if (result.warnings.length > 0) {
            messages.push(`${result.warnings.length} cảnh báo`);
        }

        return `⚠ ${messages.join(', ')}. Vui lòng kiểm tra và sửa lỗi trước khi import.`;
    }

    /**
     * Group errors by row for better display
     */
    groupErrorsByRow(errors: ValidationError[]): Map<number, ValidationError[]> {
        const grouped = new Map<number, ValidationError[]>();

        errors.forEach(error => {
            const rowErrors = grouped.get(error.row) || [];
            rowErrors.push(error);
            grouped.set(error.row, rowErrors);
        });

        return grouped;
    }

    /**
     * Get the most critical errors (first N errors)
     */
    getTopErrors(errors: ValidationError[], limit: number = 10): ValidationError[] {
        // Prioritize 'error' type over 'warning'
        const sortedErrors = [...errors].sort((a, b) => {
            if (a.type === 'error' && b.type === 'warning') return -1;
            if (a.type === 'warning' && b.type === 'error') return 1;
            return a.row - b.row;
        });

        return sortedErrors.slice(0, limit);
    }
}

// Export singleton instance
export const organizationImportValidationService = new OrganizationImportValidationService();
