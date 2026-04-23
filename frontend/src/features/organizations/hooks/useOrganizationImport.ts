import { useImportConfig, UseImportConfigReturn } from '../../../shared/hooks/useImportConfig';
import { organizationService } from '../../../shared/services/organizationService';
import { organizationColumns } from '../../../shared/utils/importColumns';
import {
    frontendParseOrganizationFile,
    frontendValidateOrganizationData,
    frontendSubmitOrganizationImport
} from '../../../shared/services/organizationImportService';

interface UseOrganizationImportOptions {
    level: 2 | 3;
    organizationId?: string;
    onSuccess?: () => void;
    onError?: (error: Error) => void;
    useClientSideProcessing?: boolean; // Feature flag for client-side processing
}

export const useOrganizationImport = (options: UseOrganizationImportOptions): UseImportConfigReturn => {
    const { level, organizationId, onSuccess, onError, useClientSideProcessing = false } = options;

    const result = useImportConfig({
        entityName: 'organizations',
        // Server-side processing service (always provided for backward compatibility)
        entityService: {
            getTemplate: () => organizationService.getTemplate(level),
            uploadImportFile: async (file: File) => {
                const result = await organizationService.uploadImportFile(file, level, organizationId);
                return {
                    sessionId: result.sessionId,
                    fileName: file.name,
                    totalRows: result.previewData?.length || 0,
                    message: 'File uploaded successfully'
                };
            },
            validateImportData: (sessionId: string) => organizationService.validateImportData(sessionId),
            executeImport: async (sessionId: string, options?: any) => {
                const result = await organizationService.executeImport(sessionId, options);
                return {
                    sessionId: result.sessionId,
                    success: result.success,
                    importedCount: result.importedCount,
                    skippedCount: result.skippedCount,
                    failedCount: result.failedCount,
                    errors: result.errors,
                    message: result.message
                };
            },
            getImportStatus: (sessionId: string) => organizationService.getImportStatus(sessionId)
        },

        // Client-side processing functions (new system)
        ...(useClientSideProcessing && {
            parseFile: (file: File, onProgress?: (progress: number) => void) =>
                frontendParseOrganizationFile(file, level, onProgress),

            validateClientData: (data: any[], onProgress?: (progress: { current: number; total: number; percentage: number }) => void) =>
                frontendValidateOrganizationData(data, level, organizationId, onProgress),

            submitClientData: (data: any[], onProgress?: any) =>
                frontendSubmitOrganizationImport(data, level, organizationId, onProgress)
        }),

        columns: organizationColumns(level),
        templateParams: {
            level,
            organizationId
        },
        templateFileName: `organization_level${level}_template.xlsx`,
        onSuccess,
        onError,

        // Processing configuration
        processingMode: useClientSideProcessing ? 'client' : 'server',
        maxFileSize: useClientSideProcessing ? 10 * 1024 * 1024 : 5 * 1024 * 1024, // 10MB for client-side, 5MB for server-side
        acceptedFileTypes: ['.xlsx', '.xls']
    });

    // Return all the controls from useImportConfig
    return result;
};
