import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Save, Loader, AlertCircle, Link2, ChevronDown, Unlink } from 'lucide-react';
import { getTemplateById, configureFields, updateTemplate } from '@/shared/services/template.service';
import { FieldType, type ConfigureFieldDto, type TemplateStatus } from '@/shared/types/template.types';
import { useToast } from '@/shared/hooks/useToast';
import { Toast } from '@/shared/components';
import { getAllFieldTypes, FIELD_TYPE_GROUPS } from '@/shared/constants/field-types';

const TemplateConfigPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { toasts, showSuccess, showError, hideToast } = useToast();
  const [fields, setFields] = useState<ConfigureFieldDto[]>([]);
  const [selectedFields, setSelectedFields] = useState<Set<number>>(new Set());
  const [showDateMappingDialog, setShowDateMappingDialog] = useState(false);
  const [dateMappingFields, setDateMappingFields] = useState<{
    dayFieldIndex: number | null;
    monthFieldIndex: number | null;
    yearFieldIndex: number | null;
  }>({
    dayFieldIndex: null,
    monthFieldIndex: null,
    yearFieldIndex: null,
  });
  const [templateName, setTemplateName] = useState('');
  const [templateDescription, setTemplateDescription] = useState('');
  const [templateStatus, setTemplateStatus] = useState<'processing' | 'active' | 'inactive' | 'error'>('processing');
  const [statusDropdownOpen, setStatusDropdownOpen] = useState(false);
  const statusDropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (statusDropdownRef.current && !statusDropdownRef.current.contains(event.target as Node)) {
        setStatusDropdownOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const { data: template, isLoading } = useQuery({
    queryKey: ['template', id],
    queryFn: () => getTemplateById(id!),
    enabled: !!id,
    staleTime: 5 * 60 * 1000, // 5 minutes - cache template data
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
            datePartsMapping: f.datePartsMapping,
          }))
        );
      }
    }
  }, [template]);

  // Status options
  const statusOptions = [
    { value: 'active', label: 'Hoạt động' },
    { value: 'inactive', label: 'Không hoạt động' },
    { value: 'processing', label: 'Đang xử lý' },
    { value: 'error', label: 'Lỗi' },
  ];

  const getStatusLabel = (value: string) => {
    return statusOptions.find(opt => opt.value === value)?.label || value;
  };

  const handleStatusChange = (value: string) => {
    setTemplateStatus(value as any);
    setStatusDropdownOpen(false);
  };

  const saveMutation = useMutation({
    mutationFn: async (data: { fields: ConfigureFieldDto[] }) => {
      // Determine final status: 
      // - If user selected a status in dropdown, use that
      // - Otherwise, if template is currently processing, auto-change to active when saving
      // - For other statuses, keep the current status
      let finalStatus: TemplateStatus = templateStatus as TemplateStatus;
      if (!templateStatus || templateStatus === template?.status) {
        // User didn't change the dropdown or it matches current template status
        if (template?.status === 'processing') {
          finalStatus = 'active' as TemplateStatus; // Auto-change processing to active
        } else {
          finalStatus = (template?.status || 'active') as TemplateStatus; // Keep current status or default to active
        }
      }
      
      // Update template info first
      await updateTemplate(id!, {
        name: templateName,
        description: templateDescription,
        status: finalStatus,
      });
      // Then update fields
      return configureFields(id!, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['template', id] });
      queryClient.invalidateQueries({ queryKey: ['templates'] });
      // Navigate với state để hiển thị toast ở trang đích
      navigate('/admin/templates', { 
        state: { 
          successMessage: 'Cấu hình đã được lưu thành công!' 
        } 
      });
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

  // Check if a field is already used in a DATE mapping
  const isFieldMapped = (fieldName: string): boolean => {
    return fields.some(f => 
      f.fieldType === FieldType.DATE && 
      f.datePartsMapping && 
      (f.datePartsMapping.dayField === fieldName || 
       f.datePartsMapping.monthField === fieldName || 
       f.datePartsMapping.yearField === fieldName)
    );
  };

  const toggleFieldSelection = (index: number) => {
    // Don't allow selection if field is already mapped
    if (isFieldMapped(fields[index].fieldName)) {
      return;
    }

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

  const mergeFieldsToDate = () => {
    if (selectedFields.size < 2) {
      showError('Vui lòng chọn ít nhất 2 fields để nhóm');
      return;
    }

    if (selectedFields.size === 3) {
      // Nếu chọn đúng 3 fields, hiển thị dialog để chọn day/month/year
      setShowDateMappingDialog(true);
    } else {
      // Nếu chọn 2 fields hoặc nhiều hơn 3, merge không cần mapping
      performMerge(null);
    }
  };

  const performMerge = (mapping: { dayFieldIndex: number; monthFieldIndex: number; yearFieldIndex: number } | null) => {
    const selectedIndices = Array.from(selectedFields).sort((a, b) => a - b);
    const selectedFieldNames = selectedIndices.map((i) => fields[i].fieldName);

    // Tạo tên field mới (bỏ suffix _day, _month, _year nếu có)
    const baseName = selectedFieldNames[0]
      .replace(/_?(day|month|year|ngay|thang|nam)$/i, '')
      .replace(/^(day|month|year|ngay|thang|nam)_?/i, '') || 'date';

    const newField: ConfigureFieldDto = {
      fieldName: baseName,
      displayName: `${baseName} (Nhóm)`,
      fieldType: FieldType.DATE,
      position: fields[selectedIndices[0]].position,
      validationRules: { required: true },
      options: [],
      isVisible: true,
      datePartsMapping: mapping ? {
        dayField: fields[mapping.dayFieldIndex].fieldName,
        monthField: fields[mapping.monthFieldIndex].fieldName,
        yearField: fields[mapping.yearFieldIndex].fieldName,
      } : undefined,
    };

    // Xóa các field đã chọn và thêm field mới
    const newFields = fields.filter((_, i) => !selectedFields.has(i));
    newFields.splice(selectedIndices[0], 0, newField);

    setFields(newFields);
    setSelectedFields(new Set());
    setShowDateMappingDialog(false);
    setDateMappingFields({ dayFieldIndex: null, monthFieldIndex: null, yearFieldIndex: null });
    showSuccess(`Đã nhóm ${selectedFields.size} fields thành DATE`);
  };

  const unmergeField = (index: number) => {
    const field = fields[index];
    
    // Kiểm tra xem field có phải DATE với mapping không
    if (field.fieldType !== FieldType.DATE || !field.datePartsMapping) {
      showError('Trường này không phải là DATE đã được gộp');
      return;
    }

    const { dayField, monthField, yearField } = field.datePartsMapping;

    // Tạo lại 3 trường riêng biệt
    const newFields: ConfigureFieldDto[] = [
      {
        fieldName: dayField,
        displayName: `${dayField} (Ngày)`,
        fieldType: FieldType.TEXT,
        position: field.position,
        validationRules: { required: field.validationRules?.required || false },
        options: [],
        isVisible: true,
      },
      {
        fieldName: monthField,
        displayName: `${monthField} (Tháng)`,
        fieldType: FieldType.TEXT,
        position: field.position + 1,
        validationRules: { required: field.validationRules?.required || false },
        options: [],
        isVisible: true,
      },
      {
        fieldName: yearField,
        displayName: `${yearField} (Năm)`,
        fieldType: FieldType.TEXT,
        position: field.position + 2,
        validationRules: { required: field.validationRules?.required || false },
        options: [],
        isVisible: true,
      },
    ];

    // Xóa field DATE và thêm 3 field mới vào vị trí đó
    const updatedFields = [...fields];
    updatedFields.splice(index, 1, ...newFields);

    setFields(updatedFields);
    showSuccess('Đã tách DATE thành 3 trường riêng biệt');
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
      {/* Toasts - Fixed position at top-right */}
      <div className="fixed top-4 right-4 z-[9999] space-y-2">
        {toasts.map((toast) => (
          <Toast
            key={toast.id}
            type={toast.type}
            message={toast.message}
            onClose={() => hideToast(toast.id)}
          />
        ))}
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-6">
          <button
            onClick={() => navigate('/admin/templates')}
            className="inline-flex items-center text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300 mb-3 transition-colors"
          >
            <ArrowLeft className="h-4 w-4 mr-1" />
            Quay lại danh sách
          </button>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
                Cấu hình biểu mẫu
              </h1>
              <p className="mt-2 text-gray-600 dark:text-gray-400">
                Cấu hình các trường dữ liệu cho biểu mẫu "{template.name}"
              </p>
            </div>
            
            {/* Status Selector */}
            <div className="flex items-center gap-3">
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Trạng thái:
              </label>
              <div className="relative" ref={statusDropdownRef}>
                <button
                  type="button"
                  onClick={() => setStatusDropdownOpen(!statusDropdownOpen)}
                  className="w-48 px-4 py-2 text-left border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors text-sm font-medium flex items-center justify-between"
                >
                  <span>{getStatusLabel(templateStatus)}</span>
                  <ChevronDown className="w-4 h-4 text-gray-400" />
                </button>

                {statusDropdownOpen && (
                  <div className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg dark:bg-gray-700 dark:border-gray-600">
                    {statusOptions.map((option) => (
                      <button
                        key={option.value}
                        type="button"
                        onClick={() => handleStatusChange(option.value)}
                        className={`w-full text-left px-4 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-600 focus:outline-none ${
                          templateStatus === option.value
                            ? 'bg-blue-50 text-blue-700 dark:bg-blue-900 dark:text-blue-300 font-medium'
                            : 'text-gray-900 dark:text-white'
                        }`}
                      >
                        {option.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
        {/* Processing Status Alert - Based on actual template status */}
        {template.status === 'processing' && (
          <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-700 rounded-lg p-4 mb-6">
            <div className="flex items-start">
              <AlertCircle className="h-5 w-5 text-yellow-600 dark:text-yellow-400 mr-3 mt-0.5 flex-shrink-0" />
              <div className="flex-1">
                <h3 className="text-sm font-semibold text-yellow-800 dark:text-yellow-300 mb-1">
                  Biểu mẫu đang ở trạng thái "Đang xử lý"
                </h3>
                <p className="text-sm text-yellow-700 dark:text-yellow-400">
                  Biểu mẫu này chưa được kích hoạt và người dùng chưa thể sử dụng. 
                  Để kích hoạt, vui lòng chọn trạng thái <strong>"Hoạt động"</strong> ở góc trên và nhấn <strong>"Lưu cấu hình"</strong>.
                </p>
              </div>
            </div>
          </div>
        )}
        
        {/* Inactive Status Info - Based on actual template status */}
        {template.status === 'inactive' && (
          <div className="bg-gray-50 dark:bg-gray-800/50 border border-gray-300 dark:border-gray-600 rounded-lg p-4 mb-6">
            <div className="flex items-start">
              <AlertCircle className="h-5 w-5 text-gray-600 dark:text-gray-400 mr-3 mt-0.5 flex-shrink-0" />
              <div className="flex-1">
                <h3 className="text-sm font-semibold text-gray-800 dark:text-gray-300 mb-1">
                  Biểu mẫu đang tạm ngưng
                </h3>
                <p className="text-sm text-gray-700 dark:text-gray-400">
                  Biểu mẫu này không khả dụng với người dùng. Chuyển sang <strong>"Hoạt động"</strong> để kích hoạt lại.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Hướng dẫn các loại dữ liệu */}
        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 rounded-lg p-6 mb-6">
          <h3 className="text-lg font-semibold text-blue-900 dark:text-blue-200 mb-4">
            Hướng dẫn các loại dữ liệu
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            {Object.entries(FIELD_TYPE_GROUPS).map(([key, group]) => (
              <div key={key}>
                <p className="font-medium text-blue-800 dark:text-blue-200 mb-2">{group.label}:</p>
                <ul className="space-y-1.5 text-blue-700 dark:text-blue-300">
                  {group.types.map((fieldType: any) => (
                    <li key={fieldType.value} className="whitespace-pre-line">
                      <strong>{fieldType.label}:</strong> {fieldType.description}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
          <div className="mt-4 p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-700 rounded">
            <p className="text-sm text-yellow-800 dark:text-yellow-300">
              <strong>Mẹo:</strong> Nếu template có 3 fields riêng (day, month, year), 
              tick chọn cả 3 và nhấn <strong>"Nhóm thành Date"</strong> để gộp lại!
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Template Info Section */}
          <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-sm">
            <div className="px-6 py-5">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                Thông tin biểu mẫu
              </h3>
              <div className="grid grid-cols-1 gap-5">
                {/* Template Name */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Tên biểu mẫu
                  </label>
                  <input
                    type="text"
                    value={templateName}
                    onChange={(e) => setTemplateName(e.target.value)}
                    className="block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors sm:text-sm"
                  />
                </div>

                {/* Template Description */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Mô tả
                  </label>
                  <textarea
                    rows={3}
                    value={templateDescription}
                    onChange={(e) => setTemplateDescription(e.target.value)}
                    className="block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors sm:text-sm"
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
                  <span className="text-sm font-medium text-blue-800 dark:text-blue-300">
                    Đã chọn {selectedFields.size} trường
                  </span>
                </div>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={mergeFieldsToDate}
                    className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-lg text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors shadow-sm"
                  >
                    <Link2 className="h-4 w-4 mr-2" />
                    Nhóm thành Date
                  </button>
                  <button
                    type="button"
                    onClick={() => setSelectedFields(new Set())}
                    className="inline-flex items-center px-4 py-2 border border-gray-300 dark:border-gray-600 text-sm font-medium rounded-lg text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 transition-colors shadow-sm"
                  >
                    Hủy
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Fields Configuration Section */}
          <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-sm">
            <div className="px-6 py-5">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                Cấu hình các trường dữ liệu
              </h3>
              <div className="space-y-6">
              {fields.map((field, index) => (
                <div
                  key={field.fieldName}
                  className={`border border-gray-200 dark:border-gray-700 rounded-lg p-5 transition-colors ${
                    selectedFields.has(index) 
                      ? 'bg-blue-50 dark:bg-blue-900/10 border-blue-300 dark:border-blue-700' 
                      : 'bg-gray-50 dark:bg-gray-900/50'
                  }`}
                >
                  <div className="space-y-4">
                    {/* Checkbox for selection and Unmerge button */}
                    <div className="flex items-center justify-between pb-3 border-b border-gray-200 dark:border-gray-700">
                      <div className="flex items-center gap-3">
                        <input
                          type="checkbox"
                          checked={selectedFields.has(index)}
                          onChange={() => toggleFieldSelection(index)}
                          disabled={isFieldMapped(field.fieldName)}
                          className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                        />
                        <label className={`block text-sm font-medium ${
                          isFieldMapped(field.fieldName) 
                            ? 'text-gray-400 dark:text-gray-600' 
                            : 'text-gray-700 dark:text-gray-300'
                        }`}>
                          {isFieldMapped(field.fieldName) 
                            ? 'Đã được gộp vào DATE' 
                            : 'Chọn để nhóm'
                          }
                        </label>
                      </div>
                      
                      {/* Unmerge button - only show for DATE fields with mapping */}
                      {field.fieldType === FieldType.DATE && field.datePartsMapping && (
                        <button
                          type="button"
                          onClick={() => unmergeField(index)}
                          className="inline-flex items-center px-3 py-1.5 text-xs font-medium rounded-lg text-orange-700 bg-orange-50 border border-orange-200 hover:bg-orange-100 dark:bg-orange-900/20 dark:text-orange-400 dark:border-orange-800 dark:hover:bg-orange-900/30 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500 transition-colors"
                        >
                          <Unlink className="h-3 w-3 mr-1.5" />
                          Tách nhóm
                        </button>
                      )}
                    </div>

                    {/* Field Name (Read-only) */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Tên trường (Field Name)
                      </label>
                      <input
                        type="text"
                        value={field.fieldName}
                        disabled
                        className="block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-400 rounded-lg shadow-sm bg-gray-100 text-gray-600 sm:text-sm cursor-not-allowed"
                      />
                      
                      {/* Show mapping info for DATE fields with mapping */}
                      {field.fieldType === FieldType.DATE && field.datePartsMapping && (
                        <div className="mt-2 p-2 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 rounded text-xs">
                          <p className="text-blue-800 dark:text-blue-300 font-medium mb-1">Mapping:</p>
                          <ul className="text-blue-700 dark:text-blue-400 space-y-0.5">
                            <li>• Ngày: <code className="bg-blue-100 dark:bg-blue-900/40 px-1 rounded">{field.datePartsMapping.dayField}</code></li>
                            <li>• Tháng: <code className="bg-blue-100 dark:bg-blue-900/40 px-1 rounded">{field.datePartsMapping.monthField}</code></li>
                            <li>• Năm: <code className="bg-blue-100 dark:bg-blue-900/40 px-1 rounded">{field.datePartsMapping.yearField}</code></li>
                          </ul>
                        </div>
                      )}
                    </div>

                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                      {/* Display Name */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                          Tên hiển thị
                        </label>
                        <input
                          type="text"
                          value={field.displayName}
                          onChange={(e) =>
                            updateField(index, { displayName: e.target.value })
                          }
                          className="block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors sm:text-sm"
                        />
                      </div>

                      {/* Field Type */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                          Loại trường
                        </label>
                        <div className="flex gap-2">
                          <select
                            value={field.fieldType}
                            onChange={(e) =>
                              updateField(index, { fieldType: e.target.value as FieldType })
                            }
                            disabled={field.fieldType === FieldType.DATE && !!field.datePartsMapping}
                            className="block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors sm:text-sm disabled:opacity-50 disabled:cursor-not-allowed disabled:bg-gray-100 dark:disabled:bg-gray-800"
                          >
                            {getAllFieldTypes().map((ft: any) => (
                              <option key={ft.value} value={ft.value}>
                                {ft.label}
                                {ft.needsOptions ? ' (cần options)' : ''}
                              </option>
                            ))}
                          </select>
                        </div>
                        {field.fieldType === FieldType.DATE && field.datePartsMapping && (
                          <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                            Không thể thay đổi loại - trường này đã được gộp từ ngày/tháng/năm
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Help Text */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Văn bản hướng dẫn
                      </label>
                      <input
                        type="text"
                        value={field.helpText || ''}
                        onChange={(e) =>
                          updateField(index, { helpText: e.target.value })
                        }
                        placeholder="Hướng dẫn điền trường này"
                        className="block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors sm:text-sm"
                      />
                    </div>

                    {/* Required Checkbox */}
                    <div className="flex items-center">
                      <label className="inline-flex items-center mt-6">
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
                        <span className="ml-2 text-sm font-medium text-gray-700 dark:text-gray-300">
                          Bắt buộc nhập
                        </span>
                      </label>
                    </div>

                    {/* Options for radio and checkbox */}
                    {(field.fieldType === 'radio' || field.fieldType === 'checkbox') && (
                      <div className="col-span-full space-y-3">
                        <div className="flex items-center justify-between">
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                            Các tùy chọn
                          </label>
                          <button
                            type="button"
                            onClick={() => {
                              const newOptions = [...(field.options || []), { value: '', label: '' }];
                              updateField(index, { options: newOptions });
                            }}
                            className="text-sm text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 font-medium"
                          >
                            + Thêm tùy chọn
                          </button>
                        </div>
                        
                        <div className="space-y-2">
                          {(field.options || [{ value: '', label: '' }]).map((option, optIndex) => (
                            <div key={optIndex} className="flex items-center gap-2">
                              <span className="text-sm text-gray-500 dark:text-gray-400 w-8">
                                {optIndex + 1}.
                              </span>
                              <input
                                type="text"
                                value={option.label}
                                onChange={(e) => {
                                  const newOptions = [...(field.options || [])];
                                  const newValue = e.target.value;
                                  newOptions[optIndex] = { value: newValue, label: newValue };
                                  updateField(index, { options: newOptions });
                                }}
                                placeholder={`Tùy chọn ${optIndex + 1}`}
                                className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors sm:text-sm"
                              />
                              {(field.options?.length || 0) > 1 && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    const newOptions = (field.options || []).filter((_, i) => i !== optIndex);
                                    updateField(index, { options: newOptions });
                                  }}
                                  className="p-2 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                                  title="Xóa tùy chọn"
                                >
                                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                  </svg>
                                </button>
                              )}
                            </div>
                          ))}
                        </div>
                        
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          Ví dụ: "Thấp", "Trung Bình", "Cao"
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3">
            <button
              type="button"
              onClick={() => navigate('/admin/templates')}
              className="inline-flex items-center px-4 py-2 border border-gray-300 dark:border-gray-600 text-sm font-medium rounded-lg text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 transition-colors shadow-sm"
            >
              Hủy
            </button>
            <button
              type="submit"
              disabled={saveMutation.isPending}
              className="inline-flex items-center px-4 py-2 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
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

        {/* Date Parts Mapping Dialog */}
        {showDateMappingDialog && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-6 max-w-md w-full mx-4">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
                Chọn trường Ngày/Tháng/Năm
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                Vui lòng chỉ định trường nào đại diện cho Ngày, Tháng và Năm trong biểu mẫu Word.
              </p>
              
              <div className="space-y-4">
                {/* Day Field */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Trường Ngày
                  </label>
                  <select
                    value={dateMappingFields.dayFieldIndex ?? ''}
                    onChange={(e) => setDateMappingFields(prev => ({
                      ...prev,
                      dayFieldIndex: e.target.value ? Number(e.target.value) : null
                    }))}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-gray-100"
                  >
                    <option value="">-- Chọn trường --</option>
                    {Array.from(selectedFields).map((fieldIndex) => {
                      const field = fields[fieldIndex];
                      return (
                        <option key={fieldIndex} value={fieldIndex}>
                          {field.fieldName} ({field.displayName || 'Chưa có nhãn'})
                        </option>
                      );
                    })}
                  </select>
                </div>

                {/* Month Field */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Trường Tháng
                  </label>
                  <select
                    value={dateMappingFields.monthFieldIndex ?? ''}
                    onChange={(e) => setDateMappingFields(prev => ({
                      ...prev,
                      monthFieldIndex: e.target.value ? Number(e.target.value) : null
                    }))}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-gray-100"
                  >
                    <option value="">-- Chọn trường --</option>
                    {Array.from(selectedFields).map((fieldIndex) => {
                      const field = fields[fieldIndex];
                      return (
                        <option key={fieldIndex} value={fieldIndex}>
                          {field.fieldName} ({field.displayName || 'Chưa có nhãn'})
                        </option>
                      );
                    })}
                  </select>
                </div>

                {/* Year Field */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Trường Năm
                  </label>
                  <select
                    value={dateMappingFields.yearFieldIndex ?? ''}
                    onChange={(e) => setDateMappingFields(prev => ({
                      ...prev,
                      yearFieldIndex: e.target.value ? Number(e.target.value) : null
                    }))}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-gray-100"
                  >
                    <option value="">-- Chọn trường --</option>
                    {Array.from(selectedFields).map((fieldIndex) => {
                      const field = fields[fieldIndex];
                      return (
                        <option key={fieldIndex} value={fieldIndex}>
                          {field.fieldName} ({field.displayName || 'Chưa có nhãn'})
                        </option>
                      );
                    })}
                  </select>
                </div>
              </div>

              {/* Validation Error */}
              {dateMappingFields.dayFieldIndex !== null &&
               dateMappingFields.monthFieldIndex !== null &&
               dateMappingFields.yearFieldIndex !== null &&
               (dateMappingFields.dayFieldIndex === dateMappingFields.monthFieldIndex ||
                dateMappingFields.dayFieldIndex === dateMappingFields.yearFieldIndex ||
                dateMappingFields.monthFieldIndex === dateMappingFields.yearFieldIndex) && (
                <div className="mt-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                  <p className="text-sm text-red-600 dark:text-red-400">
                    Các trường phải khác nhau
                  </p>
                </div>
              )}

              {/* Actions */}
              <div className="flex justify-end gap-3 mt-6">
                <button
                  type="button"
                  onClick={() => {
                    setShowDateMappingDialog(false);
                    setDateMappingFields({
                      dayFieldIndex: null,
                      monthFieldIndex: null,
                      yearFieldIndex: null,
                    });
                  }}
                  className="px-4 py-2 border border-gray-300 dark:border-gray-600 text-sm font-medium rounded-lg text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 transition-colors"
                >
                  Hủy
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const { dayFieldIndex, monthFieldIndex, yearFieldIndex } = dateMappingFields;
                    
                    // Validate all fields selected
                    if (dayFieldIndex === null || monthFieldIndex === null || yearFieldIndex === null) {
                      showError('Vui lòng chọn đầy đủ 3 trường');
                      return;
                    }

                    // Validate all fields are different
                    if (dayFieldIndex === monthFieldIndex || dayFieldIndex === yearFieldIndex || monthFieldIndex === yearFieldIndex) {
                      showError('Các trường phải khác nhau');
                      return;
                    }

                    // Perform merge with indices
                    performMerge({ dayFieldIndex, monthFieldIndex, yearFieldIndex });
                    
                    // Close dialog and reset state
                    setShowDateMappingDialog(false);
                    setDateMappingFields({
                      dayFieldIndex: null,
                      monthFieldIndex: null,
                      yearFieldIndex: null,
                    });
                  }}
                  disabled={
                    dateMappingFields.dayFieldIndex === null ||
                    dateMappingFields.monthFieldIndex === null ||
                    dateMappingFields.yearFieldIndex === null ||
                    dateMappingFields.dayFieldIndex === dateMappingFields.monthFieldIndex ||
                    dateMappingFields.dayFieldIndex === dateMappingFields.yearFieldIndex ||
                    dateMappingFields.monthFieldIndex === dateMappingFields.yearFieldIndex
                  }
                  className="px-4 py-2 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  Xác nhận
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default TemplateConfigPage;

