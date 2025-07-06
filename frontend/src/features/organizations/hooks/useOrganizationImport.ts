import { useImportConfig, UseImportConfigReturn } from '../../../shared/hooks/useImportConfig';
import { organizationService } from '../../../shared/services/organizationService';
import { organizationColumns } from '../../../shared/utils/importColumns';

interface UseOrganizationImportOptions {
    level: 2 | 3;
    organizationId?: string;
    onSuccess?: () => void;
    onError?: (error: Error) => void;
}

export const useOrganizationImport = (options: UseOrganizationImportOptions): UseImportConfigReturn => {
    const { level, organizationId, onSuccess, onError } = options;

    const result = useImportConfig({
        entityName: 'organizations',
        entityService: {
            getTemplate: () => organizationService.getTemplate(level), uploadImportFile: async (file: File) => {
                const result = await organizationService.uploadImportFile(file, level, organizationId);
                return {
                    sessionId: result.sessionId,
                    fileName: file.name,
                    totalRows: result.previewData?.length || 0,
                    message: 'File uploaded successfully'
                };
            },
            validateImportData: (sessionId: string) => organizationService.validateImportData(sessionId), executeImport: async (sessionId: string, options?: any) => {
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
        columns: organizationColumns(level),
        templateParams: {
            level,
            organizationId
        }, templateFileName: `organization_level${level}_template.xlsx`,
        onSuccess,
        onError,
        processingMode: 'server',
        maxFileSize: 5 * 1024 * 1024, // 5MB
        acceptedFileTypes: ['.xlsx', '.xls']
    });

    // Return all the controls from useImportConfig
    return result;
};
