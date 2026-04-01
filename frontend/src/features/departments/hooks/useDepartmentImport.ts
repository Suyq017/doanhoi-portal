/**
 * useDepartmentImport - Custom hook for department import functionality
 */

import { useTranslation } from 'react-i18next';
import { departmentService, useImportConfig, useToast } from '../../../shared';
import { departmentColumns } from '../../../shared/utils/importColumns';

export interface UseDepartmentImportOptions {
  onSuccess?: () => void;
}

export const useDepartmentImport = (options: UseDepartmentImportOptions = {}) => {
  const { t } = useTranslation(['departments', 'common']);
  const { showSuccess, showError } = useToast();

  const { importConfig, isImportModalOpen, openImportModal, closeImportModal } = useImportConfig({
    entityName: 'departments',
    entityService: {
      getTemplate: () => `${import.meta.env.VITE_BACKEND_API_URL || '/api'}/departments/template`,
      uploadImportFile: departmentService.uploadImportFile.bind(departmentService),
      validateImportData: departmentService.validateImportData.bind(departmentService),
      executeImport: departmentService.executeImport.bind(departmentService),
      getImportStatus: departmentService.getImportStatus.bind(departmentService),
    },
    columns: departmentColumns(t),
    onSuccess: () => {
      options.onSuccess?.();
      showSuccess(t('departments:import.importSuccess'));
    },
    onError: (error: Error) => {
      console.error('Import error:', error);
      showError(t('departments:import.importError'));
    },
  });

  return {
    importConfig,
    isImportModalOpen,
    openImportModal,
    closeImportModal,
  };
};

export default useDepartmentImport;
