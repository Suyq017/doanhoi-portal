import React, { useEffect, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { ArrowLeft, AlertCircle, Loader } from 'lucide-react';
import {
  getTemplateById,
  createSubmission,
  submitSubmission,
  deleteSubmission,
  getSubmissionById,
} from '@/shared/services/template.service';
import type {
  TemplateField,
  TemplateSubmission,
} from '@/shared/types/template.types';
import { useToast } from '@/shared/hooks/useToast';
import { Toast } from '@/shared/components';

interface FormFillTabProps {
  templateId: string | null;
  onBack: () => void;
  onSubmitSuccess?: (message: string) => void; // Callback khi submit thành công với message
  editingSubmission?: TemplateSubmission | null; // Submission đang chỉnh sửa
}

const FormFillTab: React.FC<FormFillTabProps> = ({ templateId, onBack, onSubmitSuccess, editingSubmission }) => {
  const queryClient = useQueryClient();
  const { toasts, showSuccess, showError, hideToast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Fetch template
  const { data: template, isLoading: templateLoading } = useQuery({
    queryKey: ['template', templateId],
    queryFn: () => getTemplateById(templateId!),
    enabled: !!templateId,
    staleTime: 5 * 60 * 1000, // 5 minutes - cache template data
  });

  // Build dynamic Zod schema from template fields
  const buildSchema = (fields: TemplateField[]) => {
    const schemaFields: Record<string, z.ZodTypeAny> = {};

    fields
      .filter((field) => field.isVisible)
      .forEach((field) => {
        let fieldSchema: z.ZodTypeAny;

        switch (field.fieldType) {
          case 'text':
          case 'textarea':
          case 'email':
            let stringSchema = z.string();
            if (field.validationRules?.minLength) {
              stringSchema = stringSchema.min(field.validationRules.minLength);
            }
            if (field.validationRules?.maxLength) {
              stringSchema = stringSchema.max(field.validationRules.maxLength);
            }
            // Giới hạn tối đa 255 ký tự cho text nếu không có maxLength
            if (field.fieldType === 'text' && !field.validationRules?.maxLength) {
              stringSchema = stringSchema.max(255, 'Tối đa 255 ký tự');
            }
            if (field.fieldType === 'email') {
              stringSchema = stringSchema.email('Email không hợp lệ');
            }
            if (field.validationRules?.pattern) {
              stringSchema = stringSchema.regex(
                new RegExp(field.validationRules.pattern),
                'Định dạng không hợp lệ'
              );
            }
            fieldSchema = stringSchema;
            break;

          case 'number':
            let numberSchema = z.coerce.number({
              errorMap: (issue, ctx) => {
                if (issue.code === 'invalid_type') {
                  return { message: 'Vui lòng nhập kiểu dữ liệu dạng số' };
                }
                return { message: ctx.defaultError };
              }
            });
            if (field.validationRules?.min !== undefined) {
              numberSchema = numberSchema.min(field.validationRules.min, `Giá trị tối thiểu là ${field.validationRules.min}`);
            }
            if (field.validationRules?.max !== undefined) {
              numberSchema = numberSchema.max(field.validationRules.max, `Giá trị tối đa là ${field.validationRules.max}`);
            }
            fieldSchema = numberSchema;
            break;

          case 'day':
            let daySchema = z.union([
              z.string().regex(/^(0[1-9]|[12][0-9]|3[01])$/, 'Ngày phải theo định dạng DD (01-31)'),
              z.number().int().min(1).max(31)
            ])
              .transform((val) => typeof val === 'string' ? parseInt(val, 10) : val)
              .refine((val) => val >= 1 && val <= 31, 'Ngày phải từ 01-31');
            
            if (field.validationRules?.min !== undefined) {
              daySchema = daySchema.refine(
                (val) => val >= field.validationRules!.min!,
                `Ngày tối thiểu là ${String(field.validationRules.min).padStart(2, '0')}`
              ) as any;
            }
            if (field.validationRules?.max !== undefined) {
              daySchema = daySchema.refine(
                (val) => val <= field.validationRules!.max!,
                `Ngày tối đa là ${String(field.validationRules.max).padStart(2, '0')}`
              ) as any;
            }
            fieldSchema = daySchema;
            break;

          case 'month':
            let monthSchema = z.union([
              z.string().regex(/^(0[1-9]|1[0-2])$/, 'Tháng phải theo định dạng MM (01-12)'),
              z.number().int().min(1).max(12)
            ])
              .transform((val) => typeof val === 'string' ? parseInt(val, 10) : val)
              .refine((val) => val >= 1 && val <= 12, 'Tháng phải từ 01-12');
            
            if (field.validationRules?.min !== undefined) {
              monthSchema = monthSchema.refine(
                (val) => val >= field.validationRules!.min!,
                `Tháng tối thiểu là ${String(field.validationRules.min).padStart(2, '0')}`
              ) as any;
            }
            if (field.validationRules?.max !== undefined) {
              monthSchema = monthSchema.refine(
                (val) => val <= field.validationRules!.max!,
                `Tháng tối đa là ${String(field.validationRules.max).padStart(2, '0')}`
              ) as any;
            }
            fieldSchema = monthSchema;
            break;

          case 'year':
            let yearSchema = z.union([
              z.string().regex(/^(19|20)\d{2}$/, 'Năm phải theo định dạng YYYY (1900-2099)'),
              z.number().int().min(1900).max(2100)
            ])
              .transform((val) => typeof val === 'string' ? parseInt(val, 10) : val)
              .refine((val) => val >= 1900 && val <= 2100, 'Năm phải từ 1900-2100');
            
            if (field.validationRules?.min !== undefined) {
              yearSchema = yearSchema.refine(
                (val) => val >= field.validationRules!.min!,
                `Năm tối thiểu là ${field.validationRules.min}`
              ) as any;
            }
            if (field.validationRules?.max !== undefined) {
              yearSchema = yearSchema.refine(
                (val) => val <= field.validationRules!.max!,
                `Năm tối đa là ${field.validationRules.max}`
              ) as any;
            }
            fieldSchema = yearSchema;
            break;

          case 'phone':
            // Số điện thoại Việt Nam: 10-11 số, bắt đầu bằng 0
            let phoneSchema = z.string()
              .regex(/^0\d{9}$/, 'Số điện thoại phải có 10 chữ số và bắt đầu bằng 0');
            
            if (field.validationRules?.pattern) {
              phoneSchema = z.string().regex(
                new RegExp(field.validationRules.pattern),
                field.validationRules.message || 'Số điện thoại không hợp lệ'
              );
            }
            fieldSchema = phoneSchema;
            break;

          case 'time':
            // Time format HH:MM (24-hour)
            fieldSchema = z.string()
              .regex(/^([01]\d|2[0-3]):([0-5]\d)$/, 'Thời gian phải theo định dạng HH:MM (00:00-23:59)');
            break;

          case 'datetime':
            // DateTime validation - accept ISO format from datetime-local input
            fieldSchema = z.string()
              .refine((val) => {
                // datetime-local returns format: YYYY-MM-DDTHH:MM
                const datetimeRegex = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/;
                if (!datetimeRegex.test(val)) return false;
                const date = new Date(val);
                return !isNaN(date.getTime());
              }, 'Ngày giờ không hợp lệ');
            break;

          case 'checkbox':
            // Checkbox: Chọn nhiều options → "☒ Option1 ☐ Option2 ☒ Option3"
            // Khi edit: accept cả array (mới) và string (từ DB)
            fieldSchema = z.union([
              z.array(z.string()), // Array of selected values (mới)
              z.string() // String từ DB
            ]).transform((val) => {
              // Nếu là string từ DB, giữ nguyên
              if (typeof val === 'string') {
                return val;
              }
              // Nếu là array (mới), transform sang format với checkbox icons
              if (Array.isArray(val) && field.options && field.options.length > 0) {
                return field.options
                  .map(opt => {
                    const isSelected = val.includes(opt.value);
                    const checkbox = isSelected ? '☒' : '☐';
                    return `${checkbox} ${opt.label}`;
                  })
                  .join(' ');
              }
              return String.fromCharCode(168); // Default unchecked
            }).default([]);
            break;

          case 'date':
            fieldSchema = z.string().refine((val) => !isNaN(Date.parse(val)), {
              message: 'Ngày không hợp lệ',
            });
            break;

          case 'radio':
            // Radio: Transform selected value to format "☐ Option1 ☒ Selected ☐ Option3"
            fieldSchema = z.string().transform((selectedValue) => {
              if (!field.options || field.options.length === 0) return selectedValue;
              
              return field.options
                .map(opt => {
                  const isSelected = opt.value === selectedValue;
                  const checkbox = isSelected ? '☒' : '☐';
                  return `${checkbox} ${opt.label}`;
                })
                .join(' ');
            });
            
            if (field.options && field.options.length > 0) {
              const enumValues = field.options.map(opt => opt.value) as [string, ...string[]];
              fieldSchema = z.enum(enumValues).transform((selectedValue) => {
                return field.options!
                  .map(opt => {
                    const isSelected = opt.value === selectedValue;
                    const checkbox = isSelected ? '☒' : '☐';
                    return `${checkbox} ${opt.label}`;
                  })
                  .join(' ');
              });
            }
            break;

          default:
            fieldSchema = z.string();
        }

        // Handle required fields
        if (field.validationRules?.required) {
          schemaFields[field.fieldName] = fieldSchema;
        } else {
          schemaFields[field.fieldName] = fieldSchema.optional();
        }
      });

    return z.object(schemaFields);
  };

  // Initialize form
  const formSchema = template && template.fields
    ? buildSchema(template.fields.sort((a, b) => a.position - b.position))
    : z.object({});

  const {
    control,
    handleSubmit,
    reset,
    watch,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(formSchema),
    defaultValues: editingSubmission?.formData || {},
    mode: 'onChange', // Validate on every change for real-time feedback
  });

  // Watch all form values for real-time updates
  const formValues = watch();

  // Reset form when editing submission changes
  useEffect(() => {
    if (editingSubmission) {
      reset(editingSubmission.formData);
    }
  }, [editingSubmission, reset]);

  // Submit mutation - Tạo mới và xóa cũ nếu đang edit
  const submitMutation = useMutation({
    mutationFn: async (formData: Record<string, any>) => {
      // Tạo submission mới
      const newSubmission = await createSubmission({ templateId: templateId!, formData });
      
      // Submit ngay
      const result = await submitSubmission(newSubmission.id);
      
      // Nếu đang edit và submit thành công, xóa submission cũ
      if (editingSubmission && result.status === 'submitted') {
        await deleteSubmission(editingSubmission.id);
      }
      
      return result;
    },
    onSuccess: async (submission) => {
      const baseMessage = editingSubmission 
        ? 'Chỉnh sửa thành công!' 
        : 'Gửi biểu mẫu thành công!';
      
      // Polling để đợi file tạo xong
      const checkStatus = async (): Promise<'completed' | 'failed' | 'pending'> => {
        try {
          const updated = await getSubmissionById(submission.id);
          if (updated.status === 'completed') return 'completed';
          if (updated.status === 'failed') return 'failed';
          return 'pending';
        } catch {
          return 'pending';
        }
      };

      // Poll mỗi 1 giây, tối đa 30 lần (30 giây)
      let attempts = 0;
      const maxAttempts = 30;
      let finalStatus: 'completed' | 'failed' | 'pending' = 'pending';
      
      while (attempts < maxAttempts) {
        finalStatus = await checkStatus();
        if (finalStatus === 'completed' || finalStatus === 'failed') break;
        
        await new Promise(resolve => setTimeout(resolve, 1000));
        attempts++;
      }

      queryClient.invalidateQueries({ queryKey: ['mySubmissions'] });
      setIsSubmitting(false);
      
      // Tạo message dựa trên kết quả
      let message: string;
      if (finalStatus === 'completed') {
        message = editingSubmission 
          ? 'Chỉnh sửa thành công! Tài liệu đã được cập nhật.'
          : 'Gửi biểu mẫu thành công! Tài liệu đã được tạo.';
      } else if (finalStatus === 'failed') {
        message = `${baseMessage} Tuy nhiên có lỗi khi tạo tài liệu.`;
      } else {
        message = `${baseMessage} Tài liệu đang được xử lý...`;
      }
      
      // Nếu có callback onSubmitSuccess thì dùng và truyền message
      if (onSubmitSuccess) {
        onSubmitSuccess(message);
      } else {
        // Fallback: hiển thị toast và quay lại
        showSuccess(message);
        setTimeout(() => {
          onBack();
        }, 2000);
      }
    },
    onError: (error: any) => {
      setIsSubmitting(false);
      showError(error?.response?.data?.message || 'Gửi biểu mẫu thất bại');
    },
  });

  const onSubmit = handleSubmit((data) => {
    setIsSubmitting(true);
    submitMutation.mutate(data);
  });

  if (!templateId) {
    return (
      <div className="text-center py-12">
        <AlertCircle className="mx-auto h-12 w-12 text-gray-400" />
        <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-white">
          Chưa chọn biểu mẫu
        </h3>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          Vui lòng chọn biểu mẫu từ danh sách
        </p>
        <button
          onClick={onBack}
          className="mt-4 inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 dark:bg-gray-800 dark:text-gray-300 dark:border-gray-600 dark:hover:bg-gray-700"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Quay lại danh sách
        </button>
      </div>
    );
  }

  if (templateLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (!template) {
    return (
      <div className="rounded-lg bg-red-50 dark:bg-red-900/20 p-4">
        <div className="flex">
          <AlertCircle className="h-5 w-5 text-red-400" />
          <div className="ml-3">
            <h3 className="text-sm font-medium text-red-800 dark:text-red-300">
              Không tìm thấy biểu mẫu
            </h3>
          </div>
        </div>
      </div>
    );
  }

  const visibleFields = (template.fields || [])
    .filter((f) => f.isVisible)
    .sort((a, b) => a.position - b.position);

  // Tính toán số lượng fields theo thời gian thực
  const currentFormValues = Object.entries(formValues || {});
  const filledFields = currentFormValues.filter(([fieldName, val]: [string, any]) => {
    // Checkbox với options: array rỗng cũng tính là đã điền (chọn 0 option hợp lệ)
    const field = visibleFields.find(f => f.fieldName === fieldName);
    if (field?.fieldType === 'checkbox') {
      // Nếu có options (multiple checkbox), array luôn hợp lệ
      if (field.options && field.options.length > 0) {
        return Array.isArray(val); // Array (có thể rỗng) = đã điền
      }
      // Legacy checkbox (boolean) - luôn hợp lệ
      return true;
    }
    // Các field khác: phải có giá trị
    return val !== '' && val !== null && val !== undefined;
  }).length;
  const requiredFields = visibleFields.filter(f => f.validationRules?.required).length;
  const totalFields = visibleFields.length;

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
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

      {/* Header with back button */}
      <div className="mb-8">
        <button
          onClick={onBack}
          className="group inline-flex items-center text-sm font-medium text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white mb-4 transition-colors"
        >
          <ArrowLeft className="h-4 w-4 mr-2 transition-transform group-hover:-translate-x-1" />
          Quay lại
        </button>
        
        <div className="bg-[#030391] rounded-lg shadow-lg p-6 text-white">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <h1 className="text-3xl font-bold mb-2">
                {template.name}
              </h1>
              {template.description && (
                <p className="text-blue-100 text-sm leading-relaxed max-w-3xl">
                  {template.description}
                </p>
              )}
              {editingSubmission && (
                <div className="mt-3 inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-green-500 text-white shadow-sm">
                  Đang chỉnh sửa
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Form */}
      <form onSubmit={onSubmit} className="space-y-6 pb-8">
        {/* Form Fields Card */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md border border-gray-200 dark:border-gray-700 overflow-hidden">
          <div className="p-8 space-y-8">{visibleFields.map((field, index) => (
            <div 
              key={field.id}
              className={`${index !== 0 ? 'pt-8 border-t border-gray-200 dark:border-gray-700' : ''}`}
            >
              <label
                htmlFor={field.fieldName}
                className="block text-base font-semibold text-gray-900 dark:text-white mb-1"
              >
                {field.displayName}
                {field.validationRules?.required && (
                  <span className="text-red-500 ml-1" title="Trường bắt buộc">*</span>
                )}
              </label>
              {field.helpText && (
                <p className="mt-1 mb-3 text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
                  {field.helpText}
                </p>
              )}
              <div className="mt-3">
                <Controller
                  name={field.fieldName}
                  control={control}
                  render={({ field: { onChange, value } }) => {
                    switch (field.fieldType) {
                      case 'textarea':
                        return (
                          <textarea
                            id={field.fieldName}
                            rows={4}
                            value={value || ''}
                            onChange={onChange}
                            placeholder={field.placeholder || `Nhập ${field.displayName.toLowerCase()}...`}
                            className="block w-full rounded-lg border-gray-300 dark:border-gray-600 shadow-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white sm:text-sm transition-colors"
                          />
                        );

                      case 'radio':
                        return (
                          <div className="space-y-2">
                            {field.options?.map((option) => {
                              const isSelected = value === option.value;
                              return (
                                <label
                                  key={option.value}
                                  className="flex items-center cursor-pointer group"
                                >
                                  <input
                                    type="radio"
                                    value={option.value}
                                    checked={isSelected}
                                    onChange={onChange}
                                    className="sr-only peer"
                                  />
                                  <div className={`
                                    w-5 h-5 border-2 rounded flex items-center justify-center transition-all duration-200
                                    ${isSelected 
                                      ? 'bg-blue-600 border-blue-600 dark:bg-blue-500 dark:border-blue-500' 
                                      : 'border-gray-300 dark:border-gray-500 bg-white dark:bg-gray-700'
                                    }
                                    group-hover:border-blue-400 dark:group-hover:border-blue-400
                                    peer-focus:ring-2 peer-focus:ring-blue-500 peer-focus:ring-offset-2 dark:peer-focus:ring-offset-gray-800
                                  `}>
                                    {isSelected && (
                                      <svg 
                                        className="w-3.5 h-3.5 text-white pointer-events-none" 
                                        fill="none" 
                                        strokeWidth="3" 
                                        stroke="currentColor" 
                                        viewBox="0 0 24 24"
                                      >
                                        <path d="M6 6L18 18M18 6L6 18" strokeLinecap="round" strokeLinejoin="round"/>
                                      </svg>
                                    )}
                                  </div>
                                  <span className="ml-3 text-sm font-medium text-gray-900 dark:text-gray-100 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors select-none">
                                    {option.label}
                                  </span>
                                </label>
                              );
                            })}
                          </div>
                        );

                      case 'date':
                        return (
                          <input
                            id={field.fieldName}
                            type="date"
                            value={value || ''}
                            onChange={onChange}
                            className="block w-full rounded-lg border-gray-300 dark:border-gray-600 shadow-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white sm:text-sm transition-colors"
                          />
                        );

                      case 'time':
                        return (
                          <input
                            id={field.fieldName}
                            type="time"
                            value={value || ''}
                            onChange={onChange}
                            className="block w-full rounded-lg border-gray-300 dark:border-gray-600 shadow-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white sm:text-sm transition-colors"
                          />
                        );

                      case 'datetime':
                        return (
                          <input
                            id={field.fieldName}
                            type="datetime-local"
                            value={value || ''}
                            onChange={onChange}
                            className="block w-full rounded-lg border-gray-300 dark:border-gray-600 shadow-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white sm:text-sm transition-colors"
                          />
                        );

                      case 'number':
                        return (
                          <input
                            id={field.fieldName}
                            type="text"
                            value={value || ''}
                            onChange={onChange}
                            placeholder={field.placeholder}
                            className="block w-full rounded-lg border-gray-300 dark:border-gray-600 shadow-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white sm:text-sm transition-colors"
                          />
                        );

                      case 'day':
                        return (
                          <input
                            id={field.fieldName}
                            type="text"
                            value={typeof value === 'number' ? String(value).padStart(2, '0') : (value || '')}
                            onChange={onChange}
                            placeholder="DD (01-31)"
                            maxLength={2}
                            className="block w-full rounded-lg border-gray-300 dark:border-gray-600 shadow-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white sm:text-sm transition-colors"
                          />
                        );

                      case 'month':
                        return (
                          <input
                            id={field.fieldName}
                            type="text"
                            value={typeof value === 'number' ? String(value).padStart(2, '0') : (value || '')}
                            onChange={onChange}
                            placeholder="MM (01-12)"
                            maxLength={2}
                            className="block w-full rounded-lg border-gray-300 dark:border-gray-600 shadow-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white sm:text-sm transition-colors"
                          />
                        );

                      case 'year':
                        return (
                          <input
                            id={field.fieldName}
                            type="text"
                            value={typeof value === 'number' ? String(value) : (value || '')}
                            onChange={onChange}
                            placeholder="YYYY (1900-2100)"
                            maxLength={4}
                            className="block w-full rounded-lg border-gray-300 dark:border-gray-600 shadow-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white sm:text-sm transition-colors"
                          />
                        );

                      case 'phone':
                        return (
                          <input
                            id={field.fieldName}
                            type="tel"
                            value={value || ''}
                            onChange={onChange}
                            placeholder={field.placeholder || "0xxxxxxxxx"}
                            maxLength={11}
                            className="block w-full rounded-lg border-gray-300 dark:border-gray-600 shadow-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white sm:text-sm transition-colors"
                          />
                        );

                      case 'checkbox':
                        // Checkbox với multiple options
                        const selectedValues = Array.isArray(value) ? value : [];
                        return (
                          <div className="space-y-2">
                            {field.options?.map((option) => {
                              const isSelected = selectedValues.includes(option.value);
                              return (
                                <label
                                  key={option.value}
                                  className="flex items-center cursor-pointer group"
                                >
                                  <input
                                    type="checkbox"
                                    value={option.value}
                                    checked={isSelected}
                                    onChange={(e) => {
                                      const newValues = e.target.checked
                                        ? [...selectedValues, option.value]
                                        : selectedValues.filter(v => v !== option.value);
                                      onChange(newValues);
                                    }}
                                    className="sr-only peer"
                                  />
                                  <div className={`
                                    w-5 h-5 border-2 rounded flex items-center justify-center transition-all duration-200
                                    ${isSelected 
                                      ? 'bg-blue-600 border-blue-600 dark:bg-blue-500 dark:border-blue-500' 
                                      : 'border-gray-300 dark:border-gray-500 bg-white dark:bg-gray-700'
                                    }
                                    group-hover:border-blue-400 dark:group-hover:border-blue-400
                                    peer-focus:ring-2 peer-focus:ring-blue-500 peer-focus:ring-offset-2 dark:peer-focus:ring-offset-gray-800
                                  `}>
                                    {isSelected && (
                                      <svg 
                                        className="w-3.5 h-3.5 text-white pointer-events-none" 
                                        fill="none" 
                                        strokeWidth="3" 
                                        stroke="currentColor" 
                                        viewBox="0 0 24 24"
                                      >
                                        <path d="M6 6L18 18M18 6L6 18" strokeLinecap="round" strokeLinejoin="round"/>
                                      </svg>
                                    )}
                                  </div>
                                  <span className="ml-3 text-sm font-medium text-gray-900 dark:text-gray-100 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors select-none">
                                    {option.label}
                                  </span>
                                </label>
                              );
                            })}
                          </div>
                        );

                      default:
                        return (
                          <input
                            id={field.fieldName}
                            type={field.fieldType === 'email' ? 'email' : 'text'}
                            value={value || ''}
                            onChange={onChange}
                            placeholder={field.placeholder || `Nhập ${field.displayName.toLowerCase()}...`}
                            className="block w-full rounded-lg border-gray-300 dark:border-gray-600 shadow-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white sm:text-sm transition-colors"
                          />
                        );
                    }
                  }}
                />
                {errors[field.fieldName] && (
                  <div className="mt-2 flex items-start">
                    <AlertCircle className="h-4 w-4 text-red-500 mr-1.5 mt-0.5 flex-shrink-0" />
                    <p className="text-sm text-red-600 dark:text-red-400">
                      {errors[field.fieldName]?.message as string}
                    </p>
                  </div>
                )}
              </div>
            </div>
          ))}
          </div>
        </div>

        {/* Submit Button - Sticky at bottom */}
        <div className="sticky bottom-0 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 shadow-lg rounded-t-xl p-6 -mx-4 sm:mx-0">
          <div className="flex items-center justify-between">
            <div className="text-sm text-gray-600 dark:text-gray-400 space-x-4">
              <span>
                Tổng số trường: <span className="font-semibold text-gray-900 dark:text-white">{totalFields}</span>
              </span>
              <span>•</span>
              <span>
                Trường bắt buộc: <span className="font-semibold text-gray-900 dark:text-white">{requiredFields}</span>
              </span>
              <span>•</span>
              <span>
                Đã điền: <span className="font-semibold text-gray-900 dark:text-white">{filledFields}</span>
              </span>
            </div>
            <button
              type="submit"
              disabled={isSubmitting || submitMutation.isPending}
              className="inline-flex items-center px-6 py-3 border border-transparent rounded-lg shadow-sm text-base font-medium text-white bg-[#030391] hover:bg-[#02026b] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#030391] disabled:opacity-50 disabled:cursor-not-allowed transition-all hover:shadow-md"
            >
              {isSubmitting || submitMutation.isPending ? (
                <>
                  <Loader className="h-5 w-5 mr-2 animate-spin" />
                  Đang xử lý...
                </>
              ) : (
                editingSubmission ? 'Lưu chỉnh sửa' : 'Gửi biểu mẫu'
              )}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
};

export default FormFillTab;
