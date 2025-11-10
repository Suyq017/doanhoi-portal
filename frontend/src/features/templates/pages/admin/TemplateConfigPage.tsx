import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Save, Loader, AlertCircle, Link2, Unlink } from 'lucide-react';
import { getTemplateById, configureFields, updateTemplate } from '@/shared/services/template.service';
import type { FieldType, ConfigureFieldDto } from '@/shared/types/template.types';
import { useToast } from '@/shared/hooks/useToast';
import { Toast } from '@/shared/components';

const TemplateConfigPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { toasts, showSuccess, showError, hideToast } = useToast();
  const [fields, setFields] = useState<ConfigureFieldDto[]>([]);
  const [selectedFields, setSelectedFields] = useState<Set<number>>(new Set());
  const [templateName, setTemplateName] = useState('');
  const [templateDescription, setTemplateDescription] = useState('');
  const [templateStatus, setTemplateStatus] = useState<'processing' | 'active' | 'inactive' | 'error'>('active');

  const { data: template, isLoading } = useQuery({
    queryKey: ['template', id],
    queryFn: () => getTemplateById(id!),
    enabled: !!id,
  });

  // Initialize fields and template info when template loads
  React.useEffect(() => {
    if (template) {
      setTemplateName(template.name);
      setTemplateDescription(template.description || '');
      setTemplateStatus(template.status);
      
      if (template.fields) {
        setFields(
          template.fields.map((f, index) => ({
            fieldName: f.fieldName,
            displayName: f.displayName,
            fieldType: f.fieldType,
            position: f.position || index,
            validationRules: f.validationRules || {},
            options: f.options || [],
            placeholder: f.placeholder,
            helpText: f.helpText,
            defaultValue: f.defaultValue,
            isVisible: f.isVisible,
          }))
        );
      }
    }
  }, [template]);

  const saveMutation = useMutation({
    mutationFn: async (data: { fields: ConfigureFieldDto[] }) => {
      // Update template info first
      await updateTemplate(id!, {
        name: templateName,
        description: templateDescription,
        status: templateStatus,
      });
      // Then update fields
      return configureFields(id!, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['template', id] });
      queryClient.invalidateQueries({ queryKey: ['templates'] });
      showSuccess('Cấu hình đã được lưu');
      setTimeout(() => navigate('/admin/templates'), 1500);
    },
    onError: (error: any) => {
      showError(error?.response?.data?.message || 'Lưu cấu hình thất bại');
    },
  });

  const updateField = (index: number, updates: Partial<ConfigureFieldDto>) => {
    setFields((prev) =>
      prev.map((f, i) => (i === index ? { ...f, ...updates } : f))
    );
  };

  const toggleFieldSelection = (index: number) => {
    setSelectedFields((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(index)) {
        newSet.delete(index);
      } else {
        newSet.add(index);
      }
      return newSet;
    });
  };

  const mergeFieldsToDateParts = () => {
    if (selectedFields.size < 2) {
      showError('Vui lòng chọn ít nhất 2 fields để nhóm');
      return;
    }

    const selectedIndices = Array.from(selectedFields).sort((a, b) => a - b);
    const selectedFieldNames = selectedIndices.map((i) => fields[i].fieldName);

    // Tạo tên field mới (bỏ suffix _day, _month, _year nếu có)
    const baseName = selectedFieldNames[0]
      .replace(/_?(day|month|year|ngay|thang|nam)$/i, '')
      .replace(/^(day|month|year|ngay|thang|nam)_?/i, '') || 'date';

    const newField: ConfigureFieldDto = {
      fieldName: baseName,
      displayName: `${baseName} (Nhóm)`,
      fieldType: 'date_parts' as FieldType,
      position: fields[selectedIndices[0]].position,
      validationRules: { required: true },
      options: [],
      isVisible: true,
    };

    // Xóa các field đã chọn và thêm field mới
    const newFields = fields.filter((_, i) => !selectedFields.has(i));
    newFields.splice(selectedIndices[0], 0, newField);

    setFields(newFields);
    setSelectedFields(new Set());
    showSuccess(`Đã nhóm ${selectedFields.size} fields thành DATE_PARTS`);
  };

  const ungroupDatePartsField = (index: number) => {
    const field = fields[index];
    
    if (field.fieldType !== 'date_parts') {
      showError('Chỉ có thể tách field DATE_PARTS');
      return;
    }

    // Tách thành 3 fields: day, month, year
    const baseName = field.fieldName;
    const newFields: ConfigureFieldDto[] = [
      {
        fieldName: `${baseName}_day`,
        displayName: `${field.displayName} - Ngày`,
        fieldType: 'number' as FieldType,
        position: field.position,
        validationRules: { required: true, min: 1, max: 31 },
        options: [],
        placeholder: 'DD',
        isVisible: true,
      },
      {
        fieldName: `${baseName}_month`,
        displayName: `${field.displayName} - Tháng`,
        fieldType: 'number' as FieldType,
        position: field.position + 1,
        validationRules: { required: true, min: 1, max: 12 },
        options: [],
        placeholder: 'MM',
        isVisible: true,
      },
      {
        fieldName: `${baseName}_year`,
        displayName: `${field.displayName} - Năm`,
        fieldType: 'number' as FieldType,
        position: field.position + 2,
        validationRules: { required: true, min: 1900, max: 2100 },
        options: [],
        placeholder: 'YYYY',
        isVisible: true,
      },
    ];

    // Xóa field DATE_PARTS và thêm 3 fields mới
    const updatedFields = [...fields];
    updatedFields.splice(index, 1, ...newFields);

    setFields(updatedFields);
    showSuccess('Đã tách DATE_PARTS thành 3 fields riêng');
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    saveMutation.mutate({ fields });
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (!template) {
    return (
      <div className="p-4">
        <div className="rounded-lg bg-red-50 dark:bg-red-900/20 p-4">
          <AlertCircle className="h-5 w-5 text-red-400 inline mr-2" />
          <span className="text-red-800 dark:text-red-300">Không tìm thấy biểu mẫu</span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {toasts.map((toast) => (
        <Toast key={toast.id} {...toast} onClose={() => hideToast(toast.id)} />
      ))}

      {/* Header */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <button
            onClick={() => navigate('/admin/templates')}
            className="inline-flex items-center text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300 mb-4"
          >
            <ArrowLeft className="h-4 w-4 mr-1" />
            Quay lại danh sách
          </button>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Cấu hình: {template.name}
          </h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Cấu hình các trường dữ liệu cho biểu mẫu
          </p>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Hướng dẫn các loại dữ liệu */}
        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 rounded-lg p-6 mb-6">
          <h3 className="text-lg font-semibold text-blue-900 dark:text-blue-300 mb-4">
            📖 Hướng dẫn các loại dữ liệu
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div>
              <p className="font-medium text-blue-800 dark:text-blue-200 mb-2">Loại dữ liệu cơ bản:</p>
              <ul className="space-y-1.5 text-blue-700 dark:text-blue-300">
                <li><strong>Text:</strong> Văn bản ngắn (họ tên, địa chỉ...)</li>
                <li><strong>Textarea:</strong> Văn bản dài nhiều dòng</li>
                <li><strong>Number:</strong> Số (tuổi, điểm số...)</li>
                <li><strong>Email:</strong> Địa chỉ email (có validation)</li>
                <li><strong>Date:</strong> Ngày tháng (date picker)</li>
                <li><strong>Checkbox:</strong> Tick chọn (đồng ý/không)</li>
              </ul>
            </div>
            <div>
              <p className="font-medium text-blue-800 dark:text-blue-200 mb-2">Loại dữ liệu nâng cao:</p>
              <ul className="space-y-1.5 text-blue-700 dark:text-blue-300">
                <li><strong>Select:</strong> Dropdown chọn 1 (cần cấu hình options)</li>
                <li><strong>Radio:</strong> Chọn 1 trong nhiều (cần cấu hình options)</li>
                <li>
                  <strong>Date Parts:</strong> Ngày/Tháng/Năm riêng biệt
                  <br />
                  <span className="text-xs">
                    • Template: <code className="bg-blue-100 dark:bg-blue-800 px-1 rounded">{'{{birth_date_day}}'}</code> / 
                    <code className="bg-blue-100 dark:bg-blue-800 px-1 rounded mx-1">{'{{birth_date_month}}'}</code> / 
                    <code className="bg-blue-100 dark:bg-blue-800 px-1 rounded">{'{{birth_date_year}}'}</code>
                    <br />
                    • User chỉ điền 1 lần, tự động fill cả 3 vị trí
                  </span>
                </li>
              </ul>
            </div>
          </div>
          <div className="mt-4 p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-700 rounded">
            <p className="text-sm text-yellow-800 dark:text-yellow-300">
              <strong>💡 Mẹo:</strong> Nếu template có 3 fields riêng (day, month, year), 
              tick chọn cả 3 và nhấn <strong>"Nhóm thành Date Parts"</strong> để gộp lại!
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Template Info Section */}
          <div className="bg-white dark:bg-gray-800 shadow overflow-hidden sm:rounded-lg">
            <div className="px-4 py-5 sm:p-6">
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
                Thông tin biểu mẫu
              </h3>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                {/* Template Name */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Tên biểu mẫu
                  </label>
                  <input
                    type="text"
                    value={templateName}
                    onChange={(e) => setTemplateName(e.target.value)}
                    className="mt-1 block w-full border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                  />
                </div>

                {/* Template Status */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Trạng thái
                  </label>
                  <select
                    value={templateStatus}
                    onChange={(e) => setTemplateStatus(e.target.value as any)}
                    className="mt-1 block w-full border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                  >
                    <option value="active">Hoạt động</option>
                    <option value="inactive">Không hoạt động</option>
                    <option value="processing">Đang xử lý</option>
                    <option value="error">Lỗi</option>
                  </select>
                </div>

                {/* Template Description */}
                <div className="sm:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Mô tả
                  </label>
                  <textarea
                    rows={3}
                    value={templateDescription}
                    onChange={(e) => setTemplateDescription(e.target.value)}
                    className="mt-1 block w-full border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Toolbar for grouping */}
          {selectedFields.size > 0 && (
            <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <span className="text-sm text-blue-800 dark:text-blue-300">
                    Đã chọn {selectedFields.size} field(s)
                  </span>
                </div>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={mergeFieldsToDateParts}
                    className="inline-flex items-center px-3 py-1.5 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                  >
                    <Link2 className="h-4 w-4 mr-1" />
                    Nhóm thành Date Parts
                  </button>
                  <button
                    type="button"
                    onClick={() => setSelectedFields(new Set())}
                    className="inline-flex items-center px-3 py-1.5 border border-gray-300 dark:border-gray-600 text-sm font-medium rounded-md text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600"
                  >
                    Hủy
                  </button>
                </div>
              </div>
            </div>
          )}

          <div className="bg-white dark:bg-gray-800 shadow overflow-hidden sm:rounded-lg">
            <div className="px-4 py-5 sm:p-6 space-y-6">
              {fields.map((field, index) => (
                <div
                  key={field.fieldName}
                  className={`border-b border-gray-200 dark:border-gray-700 pb-6 last:border-0 ${
                    selectedFields.has(index) ? 'bg-blue-50 dark:bg-blue-900/10 p-4 rounded-lg' : ''
                  }`}
                >
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    {/* Checkbox for selection */}
                    <div className="sm:col-span-2 flex items-center gap-3">
                      <input
                        type="checkbox"
                        checked={selectedFields.has(index)}
                        onChange={() => toggleFieldSelection(index)}
                        className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                      />
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                        Chọn để nhóm
                      </label>
                    </div>

                    {/* Field Name (Read-only) */}
                    <div className="sm:col-span-2">
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                        Tên trường (Field Name)
                      </label>
                      <input
                        type="text"
                        value={field.fieldName}
                        disabled
                        className="mt-1 block w-full border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-md shadow-sm bg-gray-50 sm:text-sm"
                      />
                    </div>

                    {/* Display Name */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                        Tên hiển thị
                      </label>
                      <input
                        type="text"
                        value={field.displayName}
                        onChange={(e) =>
                          updateField(index, { displayName: e.target.value })
                        }
                        className="mt-1 block w-full border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                      />
                    </div>

                    {/* Field Type */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                        Loại trường
                      </label>
                      <div className="flex gap-2">
                        <select
                          value={field.fieldType}
                          onChange={(e) =>
                            updateField(index, { fieldType: e.target.value as FieldType })
                          }
                          className="mt-1 block w-full border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                        >
                          <option value="text">Text</option>
                          <option value="textarea">Textarea</option>
                          <option value="email">Email</option>
                          <option value="number">Number</option>
                          <option value="date">Date</option>
                          <option value="date_parts">Date Parts (Ngày/Tháng/Năm)</option>
                          <option value="select">Select</option>
                          <option value="radio">Radio</option>
                          <option value="checkbox">Checkbox</option>
                        </select>
                        {field.fieldType === 'date_parts' && (
                          <button
                            type="button"
                            onClick={() => ungroupDatePartsField(index)}
                            className="mt-1 inline-flex items-center px-3 py-2 border border-gray-300 dark:border-gray-600 text-sm font-medium rounded-md text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600"
                            title="Tách thành 3 fields riêng"
                          >
                            <Unlink className="h-4 w-4" />
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Help Text */}
                    <div className="sm:col-span-2">
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                        Văn bản hướng dẫn
                      </label>
                      <input
                        type="text"
                        value={field.helpText || ''}
                        onChange={(e) =>
                          updateField(index, { helpText: e.target.value })
                        }
                        placeholder="Hướng dẫn điền trường này"
                        className="mt-1 block w-full border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                      />
                    </div>

                    {/* Required Checkbox */}
                    <div className="sm:col-span-2">
                      <label className="inline-flex items-center">
                        <input
                          type="checkbox"
                          checked={field.validationRules?.required || false}
                          onChange={(e) =>
                            updateField(index, {
                              validationRules: {
                                ...field.validationRules,
                                required: e.target.checked,
                              },
                            })
                          }
                          className="h-4 w-4 text-blue-600 border-gray-300 dark:border-gray-600 rounded focus:ring-blue-500"
                        />
                        <span className="ml-2 text-sm text-gray-700 dark:text-gray-300">
                          Bắt buộc nhập
                        </span>
                      </label>
                    </div>

                    {/* Options for select/radio */}
                    {(field.fieldType === 'select' || field.fieldType === 'radio') && (
                      <div className="sm:col-span-2">
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                          Các tùy chọn (mỗi dòng 1 option: value|label)
                        </label>
                        <textarea
                          rows={4}
                          value={(field.options || []).map(o => `${o.value}|${o.label}`).join('\n')}
                          onChange={(e) => {
                            const lines = e.target.value.split('\n').filter(l => l.trim());
                            const options = lines.map(line => {
                              const [value, label] = line.split('|');
                              return { value: value?.trim() || '', label: label?.trim() || value?.trim() || '' };
                            });
                            updateField(index, { options });
                          }}
                          placeholder="nam|Nam&#10;nu|Nữ&#10;khac|Khác"
                          className="mt-1 block w-full border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm font-mono text-xs"
                        />
                        <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                          Ví dụ: "nam|Nam" hoặc chỉ "Nam" (dùng làm cả value và label)
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-end space-x-3">
            <button
              type="button"
              onClick={() => navigate('/admin/templates')}
              className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 dark:bg-gray-800 dark:text-gray-300 dark:border-gray-600 dark:hover:bg-gray-700"
            >
              Hủy
            </button>
            <button
              type="submit"
              disabled={saveMutation.isPending}
              className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
            >
              {saveMutation.isPending ? (
                <>
                  <Loader className="h-4 w-4 mr-2 animate-spin" />
                  Đang lưu...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4 mr-2" />
                  Lưu cấu hình
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default TemplateConfigPage;
