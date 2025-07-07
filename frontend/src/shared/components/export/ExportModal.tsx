import React, { useState, useEffect } from 'react';
import { ExportModalProps } from '../../types/export.types';
import ExportFieldSelector from './ExportFieldSelector';

const ExportModal: React.FC<ExportModalProps> = ({
  isOpen,
  onClose,
  onExport,
  title = 'Xuất dữ liệu',
  description = 'Chọn các trường dữ liệu bạn muốn xuất ra file Excel',
  availableFields,
}) => {
  const [selectedFields, setSelectedFields] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Reset selection when modal opens
  useEffect(() => {
    if (isOpen) {
      setSelectedFields([]);
    }
  }, [isOpen]);

  const handleFieldChange = (fieldKey: string, checked: boolean) => {
    setSelectedFields(prev => {
      if (checked) {
        return [...prev, fieldKey];
      } else {
        return prev.filter(key => key !== fieldKey);
      }
    });
  };

  const handleSelectAll = () => {
    setSelectedFields(availableFields.map(field => field.key));
  };

  const handleDeselectAll = () => {
    setSelectedFields([]);
  };

  const handleExport = async () => {
    if (selectedFields.length === 0) {
      return;
    }

    setIsLoading(true);
    try {
      await onExport(selectedFields);
      onClose();
    } catch (error) {
      // Error handling is done in the parent component
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    if (!isLoading) {
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
        {/* Backdrop */}
        <div
          className="fixed inset-0 transition-opacity bg-gray-500 bg-opacity-75"
          onClick={handleClose}
        />

        {/* Modal */}
        <div className="inline-block w-full max-w-2xl my-8 overflow-hidden text-left align-middle transition-all transform bg-white shadow-xl rounded-lg">
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-gray-200">
            <div>
              <h2 className="text-xl font-semibold text-gray-900">{title}</h2>
              <p className="mt-1 text-sm text-gray-600">{description}</p>
            </div>
            <button
              onClick={handleClose}
              disabled={isLoading}
              className="text-gray-400 hover:text-gray-600 disabled:cursor-not-allowed"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Body */}
          <div className="p-6">
            <ExportFieldSelector
              fields={availableFields}
              selectedFields={selectedFields}
              onFieldChange={handleFieldChange}
              onSelectAll={handleSelectAll}
              onDeselectAll={handleDeselectAll}
            />
          </div>

          {/* Footer */}
          <div className="flex items-center justify-end px-6 py-3 bg-gray-50 border-t border-gray-200 space-x-3">
            <button
              onClick={handleClose}
              disabled={isLoading}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Hủy
            </button>
            <button
              onClick={handleExport}
              disabled={selectedFields.length === 0 || isLoading}
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50 flex items-center space-x-2"
            >
              {isLoading && (
                <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
              )}
              <span>{isLoading ? 'Đang xuất...' : 'Xuất file'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ExportModal;
