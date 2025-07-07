import { useState } from 'react';
import { exportService } from '../services/exportService';

export interface UseExportOptions {
  onSuccess?: (fileName: string) => void;
  onError?: (error: string) => void;
  organizationId?: string;
  organizationName?: string;
}

export const useExport = (options: UseExportOptions = {}) => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const exportData = async (fields: string[], type: 'organization' | 'users' = 'organization') => {
    if (fields.length === 0) {
      setError('Vui lòng chọn ít nhất một trường để xuất');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      let blob: Blob;
      let fileName: string;

      if (type === 'organization' && options.organizationId) {
        blob = await exportService.exportOrganizationMembers(options.organizationId, fields);
        fileName = exportService.generateFileName('danh_sach_thanh_vien', options.organizationName);
      } else {
        blob = await exportService.exportUsers(fields);
        fileName = exportService.generateFileName('danh_sach_nguoi_dung');
      }

      exportService.downloadFile(blob, fileName);
      
      if (options.onSuccess) {
        options.onSuccess(fileName);
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Có lỗi xảy ra khi xuất file';
      setError(errorMessage);
      
      if (options.onError) {
        options.onError(errorMessage);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const clearError = () => setError(null);

  return {
    exportData,
    isLoading,
    error,
    clearError,
  };
};
