import { useTranslation } from 'react-i18next';
import { Upload } from 'lucide-react';
import { ImportModal } from '@/shared/components';
import { useOldSystemImport } from '../hooks';
import { ctxhOldSystemImportConfig } from '../config/oldSystemImportConfig';

/**
 * CTXH Old System Import Page
 * Refactored with separation of concerns using custom hook
 */
export const CtxhOldSystemImportPage = () => {
  const { t } = useTranslation('ctxh-import');
  
  const {
    isImportModalOpen,
    modalKey,
    openImportModal,
    closeImportModal,
    handleImportSuccess,
    handleImportError
  } = useOldSystemImport();

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
            onClick={openImportModal}
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
        onClose={closeImportModal}
        config={{
          ...ctxhOldSystemImportConfig,
          onSuccess: handleImportSuccess,
          onError: handleImportError
        }}
      />
    </div>
  );
};

export default CtxhOldSystemImportPage;
