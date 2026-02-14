import { useTranslation } from 'react-i18next';
import { useToast } from '../../../shared/hooks/useToast';
import { ImportModalConfig } from '../../../shared/types/import';
import { userColumns } from '../../../shared/utils/importColumns';
import { batchImportService } from '../../../shared/services/users-import-service';

interface UseUserBatchImportConfigParams {
    onRefreshData?: () => void;
    useBatchProcessing?: boolean; // Feature flag for Phase 4
}

export const useUserBatchImportConfig = (params: UseUserBatchImportConfigParams = {}) => {
    const { onRefreshData, useBatchProcessing = false } = params;
    const { t } = useTranslation(['users', 'common']);
    const { showSuccess, showError } = useToast();

    // Legacy server-side config (fallback)
    const legacyConfig: ImportModalConfig = {
        entityName: 'users',
        columns: userColumns(t),
        acceptedFileTypes: ['.xlsx', '.xls'],
        maxFileSize: 10 * 1024 * 1024, // 10MB
        templateUrl: `${import.meta.env.VITE_BACKEND_API_URL || '/api'}/users/template`,
        templateFileName: 'users_import_template.xlsx',
        previewRowCount: 10,
        allowPartialImport: true,
        // Server-side processing (existing)
        useClientSideProcessing: false,
        enableBatchProcessing: false,
        onSuccess: () => {
            if (onRefreshData) {
                onRefreshData();
            }
            showSuccess(t('users:import.success', { 
                defaultValue: 'Import thành công!' 
            }));
        },
        onError: (error: Error) => {
            console.error('Import error:', error);
            showError(error.message || t('users:import.error', { 
                defaultValue: 'Import thất bại!' 
            }));
        }
    };

    // New batch processing config (Phase 4)
    const batchConfig: ImportModalConfig = {
        entityName: 'users',
        columns: userColumns(t),
        acceptedFileTypes: ['.xlsx', '.xls'],
        maxFileSize: 50 * 1024 * 1024, // 50MB for large files
        templateUrl: `${import.meta.env.VITE_BACKEND_API_URL || '/api'}/users/template`,
        templateFileName: 'users_import_template.xlsx',
        previewRowCount: 20, // More preview rows for large files
        allowPartialImport: true,
        
        // Client-side batch processing
        useClientSideProcessing: true,
        enableBatchProcessing: true,
        batchSize: 200, // Match backend batch size
        
        // Client-side processing functions with backend validation and pagination
        parseFile: batchImportService.parseUserFile.bind(batchImportService),
        validateClientData: batchImportService.validateClientData.bind(batchImportService),
        submitClientData: batchImportService.submitClientData.bind(batchImportService),
        
        onSuccess: (result) => {
            if (onRefreshData) {
                onRefreshData();
            }
            
            // Enhanced success message for batch processing
            if ('sessionSummary' in result) {
                const summary = result.sessionSummary;
                
                if (summary.totalFailed > 0 && summary.totalSuccessful > 0) {
                    // Mixed results - some success, some failures
                    const mixedMsg = t('users:import.batchMixed', { 
                        total: summary.totalProcessed,
                        successful: summary.totalSuccessful,
                        failed: summary.totalFailed,
                        defaultValue: `Import hoàn thành với kết quả hỗn hợp: ${summary.totalSuccessful} thành công, ${summary.totalFailed} thất bại`
                    });
                    showSuccess(mixedMsg);
                } else if (summary.totalFailed === 0) {
                    // All success
                    const successMsg = t('users:import.batchSuccess', { 
                        total: summary.totalProcessed,
                        successful: summary.totalSuccessful,
                        defaultValue: `Import thành công: ${summary.totalSuccessful}/${summary.totalProcessed} bản ghi`
                    });
                    showSuccess(successMsg);
                } else {
                    // All failed - this should be handled by onError
                    const failMsg = t('users:import.batchAllFailed', { 
                        total: summary.totalProcessed,
                        failed: summary.totalFailed,
                        defaultValue: `Import thất bại: ${summary.totalFailed}/${summary.totalProcessed} bản ghi lỗi`
                    });
                    showError(failMsg);
                }
            } else {
                showSuccess(t('users:import.success', { 
                    defaultValue: 'Import thành công!' 
                }));
            }
        },
        
        onError: (error: Error) => {
            console.error('Batch import error:', error);
            showError(error.message || t('users:import.batchError', { 
                defaultValue: 'Batch import thất bại!' 
            }));
        },
        
        onValidationComplete: (result) => {
            // Optional: Handle validation completion for large files
            if ('summary' in result) {
                console.log(`Validation completed: ${result.summary.valid}/${result.summary.total} valid records`);
            }
        }
    };

    // Return appropriate config based on feature flag
    return useBatchProcessing ? batchConfig : legacyConfig;
};