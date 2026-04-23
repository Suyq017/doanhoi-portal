import { ClassExcelParserService, ClassImportData } from './classExcelParserService';
import { ClassImportValidationService, ValidationResult } from './classImportValidationService';
import { ClassImportSubmitService, ImportResult, ProgressInfo } from './classImportSubmitService';

// Create service instances
const classExcelParser = new ClassExcelParserService();
const classValidator = new ClassImportValidationService();
const classSubmitter = new ClassImportSubmitService();

/**
 * Frontend parse class import file
 * @param file - Excel file to parse
 * @param onProgress - Optional progress callback
 * @returns Parsed class data array
 */
export const frontendParseClassFile = async (
    file: File,
    onProgress?: (progress: number) => void
): Promise<ClassImportData[]> => {
    return classExcelParser.parseClassImportFile(file, onProgress);
};

/**
 * Frontend validate class import data
 * @param data - Class data to validate
 * @returns Validation result with errors and warnings
 */
export const frontendValidateClassData = async (
    data: ClassImportData[]
): Promise<ValidationResult> => {
    return classValidator.validateClassImportData(data);
};

/**
 * Frontend submit class import
 * @param data - Class data to import
 * @param onProgress - Optional progress callback
 * @returns Import result
 */
export const frontendSubmitClassImport = async (
    data: ClassImportData[],
    onProgress?: (progress: ProgressInfo) => void
): Promise<ImportResult> => {
    return classSubmitter.submitClassImport(data, onProgress);
};

/**
 * Complete workflow: parse -> validate -> submit
 * @param file - Excel file to process
 * @param onProgress - Optional progress callback with stage information
 * @returns Import result
 */
export const processClassImportFile = async (
    file: File,
    onProgress?: (progress: { stage: string; percentage: number }) => void
): Promise<ImportResult> => {
    // Stage 1: Parsing (0-30%)
    onProgress?.({ stage: 'parsing', percentage: 0 });
    const parsedData = await frontendParseClassFile(file, (p) => {
        onProgress?.({ stage: 'parsing', percentage: p * 0.3 }); // 0-30%
    });

    // Stage 2: Validation (30-40%)
    onProgress?.({ stage: 'validating', percentage: 30 });
    const validationResult = await frontendValidateClassData(parsedData);
    onProgress?.({ stage: 'validating', percentage: 40 });

    if (!validationResult.isValid) {
        const errorCount = validationResult.errors.length;
        const warningCount = validationResult.warnings.length;
        throw new Error(
            `Validation failed: ${errorCount} lỗi, ${warningCount} cảnh báo. ` +
            `Vui lòng sửa các lỗi trước khi import.`
        );
    }

    // Stage 3: Import (40-100%)
    onProgress?.({ stage: 'importing', percentage: 40 });
    const importResult = await frontendSubmitClassImport(parsedData, (p) => {
        // Map import progress from 40% to 100%
        const mappedPercentage = 40 + (p.percentage * 0.6);
        onProgress?.({ stage: 'importing', percentage: mappedPercentage });
    });

    return importResult;
};

// Export service instances for advanced usage
export { classExcelParser, classValidator, classSubmitter };

// Re-export types for convenience
export type { ClassImportData, ValidationResult, ImportResult, ProgressInfo };
