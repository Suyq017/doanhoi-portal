import { useImportConfig } from '../../../shared/hooks/useImportConfig';
import { userService } from '../../../shared/services/userService';
import { userColumns } from '../../../shared/utils/importColumns';
import { useTranslation } from 'react-i18next';
import { useToast } from '../../../shared/hooks/useToast';

interface UseUserImportConfigParams {
    onRefreshData?: () => void;
}

export const useUserImportConfig = (params: UseUserImportConfigParams = {}) => {
    const { onRefreshData } = params;
    const { t } = useTranslation(['users', 'common']);
    const { showSuccess, showError } = useToast();

    return useImportConfig({
        entityName: 'users', entityService: {
            getTemplate: () => `${import.meta.env.VITE_BACKEND_API_URL || '/api'}/users/template`,
            uploadImportFile: userService.uploadImportFile.bind(userService),
            validateImportData: userService.validateImportData.bind(userService),
            executeImport: userService.executeImport.bind(userService),
            getImportStatus: userService.getImportStatus.bind(userService),
        },
        columns: userColumns(t),
        templateFileName: 'users_import_template.xlsx',
        onSuccess: () => {
            if (onRefreshData) {
                onRefreshData();
            }
            showSuccess(t('users:import.success', { defaultValue: 'Import thành công!' }));
        },
        onError: (error: Error) => {
            console.error('Import error:', error);
            showError(error.message || t('users:import.error', { defaultValue: 'Import thất bại!' }));
        }
    });
};