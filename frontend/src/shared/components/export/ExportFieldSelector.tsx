import React from 'react';
import { ExportFieldSelectorProps, ExportField } from '../../types/export.types';

const ExportFieldSelector: React.FC<ExportFieldSelectorProps> = ({
  fields,
  selectedFields,
  onFieldChange,
  onSelectAll,
  onDeselectAll,
}) => {
  // Group fields by category
  const groupedFields = fields.reduce((acc, field) => {
    if (!acc[field.category]) {
      acc[field.category] = [];
    }
    acc[field.category].push(field);
    return acc;
  }, {} as Record<string, ExportField[]>);

  const categoryLabels = {
    basic: 'Thông tin cơ bản',
    academic: 'Thông tin học tập',
    organization: 'Thông tin tổ chức',
    system: 'Thông tin hệ thống',
  };

  const allSelected = selectedFields.length === fields.length;
  const someSelected = selectedFields.length > 0;

  return (
    <div className="space-y-4">
      {/* Select All Controls */}
      <div className="flex items-center justify-between border-b border-gray-200 pb-3">
        <h3 className="text-lg font-medium text-gray-900">
          Chọn trường dữ liệu ({selectedFields.length}/{fields.length})
        </h3>
        <div className="flex space-x-2">
          <button
            type="button"
            onClick={onSelectAll}
            disabled={allSelected}
            className="px-3 py-1 text-sm font-medium text-blue-600 hover:text-blue-700 disabled:text-gray-400"
          >
            Chọn tất cả
          </button>
          <button
            type="button"
            onClick={onDeselectAll}
            disabled={!someSelected}
            className="px-3 py-1 text-sm font-medium text-red-600 hover:text-red-700 disabled:text-gray-400"
          >
            Bỏ chọn tất cả
          </button>
        </div>
      </div>

      {/* Field Groups */}
      <div className="space-y-4 max-h-96 overflow-y-auto">
        {Object.entries(groupedFields).map(([category, categoryFields]) => (
          <div key={category} className="space-y-2">
            <h4 className="font-medium text-gray-700 text-sm uppercase tracking-wide">
              {categoryLabels[category as keyof typeof categoryLabels]}
            </h4>
            <div className="space-y-2 ml-2">
              {categoryFields.map((field) => (
                <label
                  key={field.key}
                  className="flex items-start space-x-3 p-2 rounded-lg hover:bg-gray-50 cursor-pointer"
                >
                  <input
                    type="checkbox"
                    checked={selectedFields.includes(field.key)}
                    onChange={(e) => onFieldChange(field.key, e.target.checked)}
                    className="mt-1 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900">{field.label}</p>
                    {field.description && (
                      <p className="text-sm text-gray-500">{field.description}</p>
                    )}
                  </div>
                </label>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Validation Message */}
      {selectedFields.length === 0 && (
        <div className="text-sm text-red-600 bg-red-50 p-3 rounded-md">
          Vui lòng chọn ít nhất một trường để xuất dữ liệu
        </div>
      )}
    </div>
  );
};

export default ExportFieldSelector;
