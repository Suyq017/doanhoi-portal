import React, { useState } from 'react';
import { ExportModal, useExport, USER_EXPORT_FIELDS } from './index';

interface ExportButtonProps {
  organizationId?: string;
  organizationName?: string;
  type?: 'organization' | 'users';
  buttonText?: string;
  buttonClassName?: string;
  onSuccess?: (fileName: string) => void;
  onError?: (error: string) => void;
}

const ExportButton: React.FC<ExportButtonProps> = ({
  organizationId,
  organizationName,
  type = 'organization',
  buttonText = 'Xuất dữ liệu',
  buttonClassName = 'flex items-center space-x-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-100',
  onSuccess,
  onError,
}) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  
  const { exportData, isLoading, error, clearError } = useExport({
    organizationId,
    organizationName,
    onSuccess: (fileName) => {
      if (onSuccess) {
        onSuccess(fileName);
      }
      // Show success notification
      console.log(`Xuất file thành công: ${fileName}`);
    },
    onError: (errorMessage) => {
      if (onError) {
        onError(errorMessage);
      }
      // Show error notification
      console.error(`Lỗi xuất file: ${errorMessage}`);
    },
  });

  const handleExport = async (fields: string[]) => {
    await exportData(fields, type);
  };

  const handleOpenModal = () => {
    clearError();
    setIsModalOpen(true);
  };

  const modalTitle = type === 'organization' 
    ? `Xuất danh sách thành viên${organizationName ? ` - ${organizationName}` : ''}` 
    : 'Xuất danh sách người dùng';

  return (
    <>
      <button
        onClick={handleOpenModal}
        disabled={isLoading}
        className={buttonClassName}
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
        <span>{isLoading ? 'Đang xuất...' : buttonText}</span>
      </button>

      <ExportModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onExport={handleExport}
        title={modalTitle}
        description="Chọn các trường dữ liệu bạn muốn xuất ra file Excel"
        availableFields={USER_EXPORT_FIELDS}
      />

      {/* Error Display */}
      {error && (
        <div className="fixed bottom-4 right-4 bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded shadow-lg">
          <div className="flex items-center">
            <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
            </svg>
            <span className="text-sm">{error}</span>
            <button
              onClick={clearError}
              className="ml-2 text-red-500 hover:text-red-700"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
      )}
    </>
  );
};

export default ExportButton;
