import { useState, useMemo, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Upload } from 'lucide-react';
import * as XLSX from 'xlsx';
import { ImportModal } from '@/shared/components';
import { ctxhOldSystemImportConfig } from '../config/oldSystemImportConfig';

export const CtxhOldSystemImportPage = () => {
  const { t } = useTranslation('ctxh-import');
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [modalKey, setModalKey] = useState(0);

  // Generate template blob URL
  const templateBlobUrl = useMemo(() => {
    const template = [
      ['MSSV', 'Số ngày'],
      ['2211234', 15],
      ['2211235', 20],
      ['2211236', 10.5]
    ];

    const ws = XLSX.utils.aoa_to_sheet(template);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Template');
    
    // Generate blob
    const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
    const blob = new Blob([wbout], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    return URL.createObjectURL(blob);
  }, []);

  // Cleanup blob URL on unmount
  useEffect(() => {
    return () => {
      if (templateBlobUrl) {
        URL.revokeObjectURL(templateBlobUrl);
      }
    };
  }, [templateBlobUrl]);

  const handleImportSuccess = (result: any) => {
    console.log('Import completed:', result);
    // Optionally show success toast or redirect
  };

  const handleImportError = (error: Error) => {
    console.error('Import failed:', error);
    // Optionally show error toast
  };

  // Create enhanced config with blob URL for template
  const enhancedConfig = {
    ...ctxhOldSystemImportConfig,
    templateUrl: templateBlobUrl,
    onSuccess: handleImportSuccess,
    onError: handleImportError
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
          {t('title')}
        </h1>
        <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
          {t('description')}
        </p>
      </div>

      {/* Main Content */}
      <div className="max-w-2xl mx-auto">
        {/* Import Section */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <div className="mb-6">
            <h2 className="text-xl font-semibold flex items-center gap-2 text-gray-900 dark:text-gray-100">
              <Upload className="w-5 h-5" />
              {t('uploadSection.title')}
            </h2>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
              {t('uploadSection.description')}
            </p>
          </div>

          {/* Import Button */}
          <button
            onClick={() => {
              setModalKey(prev => prev + 1); // Force remount modal
              setIsImportModalOpen(true);
            }}
            className="w-full py-3 px-4 bg-doan-500 hover:bg-doan-600 text-white rounded-lg font-medium transition-colors flex items-center justify-center gap-2"
          >
            <Upload className="w-5 h-5" />
            {t('importButton')}
          </button>
        </div>
      </div>

      {/* Import Modal */}
      <ImportModal
        key={modalKey}
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
        config={enhancedConfig}
      />
    </div>
  );
};
