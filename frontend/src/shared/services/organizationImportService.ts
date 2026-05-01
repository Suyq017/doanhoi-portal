import { OrganizationImportData } from '../types/organization';
import {
    organizationExcelParserService
} from './organizationExcelParserService';
import {
    organizationImportValidationService,
    ValidationResult
} from './organizationImportValidationService';
import {
    organizationImportSubmitService,
    ImportResult,
    ProgressInfo
} from './organizationImportSubmitService';

/**
 * Main service that orchestrates organization import operations
 * Combines parsing, validation, and submission services
 */

/**
 * Parse an organization import Excel file
 * @param file - The Excel file to parse
 * @param level - Organization level (2 or 3)
 * @param onProgress - Optional progress callback
 * @returns Array of parsed organization import data
 */
export const frontendParseOrganizationFile = async (
    file: File,
    level: 2 | 3,
    onProgress?: (progress: number) => void
): Promise<OrganizationImportData[]> => {
    try {
        return await organizationExcelParserService.parseOrganizationImportFile(
            file,
            level,
            onProgress
        );
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        throw new Error(`Lỗi parse file: ${errorMessage}`);
    }
};

/**
 * Validate organization import data
 * @param data - Array of organization import data to validate
 * @param level - Organization level (2 or 3)
 * @param organizationId - Target organization ID (optional, backend supports validation without it)
 * @param onProgress - Optional progress callback for chunked validation
 * @returns Validation result with errors and warnings
 */
export const frontendValidateOrganizationData = async (
    data: OrganizationImportData[],
    level: 2 | 3,
    organizationId?: string,
    onProgress?: (progress: { current: number; total: number; percentage: number }) => void
): Promise<ValidationResult> => {
    try {
        // ALWAYS use backend validation for FAST performance with bulk queries
        // Backend now supports optional organizationId (Level 2 validation without specific org)
        const { organizationBatchValidationService } = await import('./organizationBatchValidationService');

        return await organizationBatchValidationService.validateMembers(
            data,
            organizationId, // Optional: undefined for Level 2, provided for Level 3
            level,
            onProgress
        );
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        throw new Error(`Lỗi validation: ${errorMessage}`);
    }
};

/**
 * Submit organization import data to backend
 * @param data - Array of organization import data
 * @param level - Organization level (2 or 3)
 * @param organizationId - Target organization ID (required for Level 3)
 * @param onProgress - Optional progress callback
 * @returns Import result with statistics
 */
export const frontendSubmitOrganizationImport = async (
    data: OrganizationImportData[],
    level: 2 | 3,
    organizationId?: string,
    onProgress?: (progress: ProgressInfo) => void
): Promise<ImportResult> => {
    try {
        return await organizationImportSubmitService.submitOrganizationImport(
            data,
            level,
            organizationId,
            onProgress
        );
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        throw new Error(`Lỗi submit import: ${errorMessage}`);
    }
};

/**
 * Complete organization import workflow
 * Parse -> Validate -> Submit (if valid)
 * @param file - The Excel file to import
 * @param level - Organization level (2 or 3)
 * @param organizationId - Target organization ID (required for Level 3)
 * @param onProgress - Optional progress callback
 * @returns Import result
 */
export const processOrganizationImportFile = async (
    file: File,
    level: 2 | 3,
    organizationId?: string,
    onProgress?: (progress: ProgressInfo) => void
): Promise<ImportResult> => {
    try {
        // Step 1: Parse file
        if (onProgress) {
            onProgress({
                currentBatch: 0,
                totalBatches: 1,
                processedRecords: 0,
                totalRecords: 0,
                percentage: 0,
                currentOperation: 'parsing',
                message: 'Đang đọc file Excel...'
            });
        }

        const parsedData = await frontendParseOrganizationFile(file, level, (parseProgress) => {
            if (onProgress) {
                onProgress({
                    currentBatch: 0,
                    totalBatches: 1,
                    processedRecords: 0,
                    totalRecords: 0,
                    percentage: parseProgress * 0.3, // Parsing is 30% of total progress
                    currentOperation: 'parsing',
                    message: `Đang đọc file... ${Math.round(parseProgress)}%`
                });
            }
        });

        // Step 2: Validate data
        if (onProgress) {
            onProgress({
                currentBatch: 0,
                totalBatches: 1,
                processedRecords: 0,
                totalRecords: parsedData.length,
                percentage: 30,
                currentOperation: 'validating',
                message: 'Đang kiểm tra dữ liệu...'
            });
        }

        const validationResult = await frontendValidateOrganizationData(parsedData, level);

        if (!validationResult.isValid) {
            const errorMessage = organizationImportValidationService.getValidationSummaryMessage(validationResult);
            throw new Error(errorMessage);
        }

        // Step 3: Submit data
        if (onProgress) {
            onProgress({
                currentBatch: 0,
                totalBatches: 1,
                processedRecords: 0,
                totalRecords: parsedData.length,
                percentage: 40,
                currentOperation: 'importing',
                message: 'Bắt đầu import...'
            });
        }

        const importResult = await frontendSubmitOrganizationImport(
            parsedData,
            level,
            organizationId,
            (submitProgress) => {
                if (onProgress) {
                    // Import is 40-100% of total progress
                    const adjustedPercentage = 40 + (submitProgress.percentage * 0.6);
                    onProgress({
                        ...submitProgress,
                        percentage: adjustedPercentage
                    });
                }
            }
        );

        return importResult;

    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        throw new Error(errorMessage);
    }
};

/**
 * Get expected headers for template generation
 */
export const getOrganizationImportHeaders = (level: 2 | 3): string[] => {
    return organizationExcelParserService.getExpectedHeaders(level);
};

/**
 * Get validation summary message
 */
export const getValidationSummary = (result: ValidationResult): string => {
    return organizationImportValidationService.getValidationSummaryMessage(result);
};

/**
 * Estimate import duration
 */
export const estimateImportDuration = (dataSize: number): string => {
    return organizationImportSubmitService.estimateDuration(dataSize);
};

// Export service instances for advanced usage
export {
    organizationExcelParserService,
    organizationImportValidationService,
    organizationImportSubmitService
};

// Export types
export type {
    ValidationResult,
    ImportResult,
    ProgressInfo
};
