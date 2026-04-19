import React, { useEffect, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useTranslation } from 'react-i18next';
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
  onSubmitSuccess?: (message: string, status?: 'completed' | 'failed' | 'pending') => void;
  editingSubmission?: TemplateSubmission | null; // Submission đang chỉnh sửa
}

const FormFillTab: React.FC<FormFillTabProps> = ({ templateId, onBack, onSubmitSuccess, editingSubmission }) => {
  const { i18n } = useTranslation();

  // Force re-mount when language changes to rebuild form with new translations
  return <FormFillTabInner key={i18n.language} templateId={templateId} onBack={onBack} onSubmitSuccess={onSubmitSuccess} editingSubmission={editingSubmission} />;
};

const FormFillTabInner: React.FC<FormFillTabProps> = ({ templateId, onBack, onSubmitSuccess, editingSubmission }) => {
  const { t } = useTranslation(['templates', 'common']);
  const queryClient = useQueryClient();
  const { toasts, showSuccess, showError, hideToast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Determine the actual template ID to use
  // If editing a submission, use the template ID from the submission
  // Otherwise, use the provided templateId prop
  const actualTemplateId = editingSubmission?.template?.id || templateId;

  // Fetch template
  const { data: template, isLoading: templateLoading } = useQuery({
    queryKey: ['template', actualTemplateId],
    queryFn: () => {
      if (!actualTemplateId) {
        throw new Error('Template ID is required');
      }
      return getTemplateById(actualTemplateId);
    },
    enabled: !!actualTemplateId,
    staleTime: 5 * 60 * 1000, // 5 minutes - cache template data
  });

  // Helper function: Reverse transform data from DB back to original values
  const reverseTransformFormData = (formData: Record<string, any>, fields: TemplateField[]): Record<string, any> => {
    const reversedData: Record<string, any> = { ...formData };

    fields.forEach((field) => {
      const value = formData[field.fieldName];
      if (!value) return;

      // Radio: "Thấp ☐ Trung Bình ☒ Cao ☐" → "Trung Bình"
      if (field.fieldType === 'radio' && typeof value === 'string' && value.includes('☒')) {
        // Try to match against each option's formatted string
        if (field.options) {
          for (const option of field.options) {
            const pattern = `${option.label} ☒`;
            if (value.includes(pattern)) {
              reversedData[field.fieldName] = option.value;
              break;
            }
          }
        }
      }

      // Checkbox: "Option A ☒ Option B ☐ Option C ☒" → ["Option A", "Option C"]
      if (field.fieldType === 'checkbox' && typeof value === 'string' && (value.includes('☒') || value.includes('☐'))) {
        const selectedValues: string[] = [];

        if (field.options) {
          for (const option of field.options) {
            const pattern = `${option.label} ☒`;
            if (value.includes(pattern)) {
              selectedValues.push(option.value);
            }
          }
        }

        reversedData[field.fieldName] = selectedValues;
      }
    });

    return reversedData;
  };

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
              stringSchema = stringSchema.max(255, t('templates:validation.maxTextLength'));
            }
            if (field.fieldType === 'email') {
              stringSchema = stringSchema.email(t('templates:validation.email'));
            }
            if (field.validationRules?.pattern) {
              stringSchema = stringSchema.regex(
                new RegExp(field.validationRules.pattern),
                t('templates:validation.pattern')
              );
            }
            fieldSchema = stringSchema;
            break;

          case 'number':
            let numberSchema = z.coerce.number({
              errorMap: (issue, ctx) => {
                if (issue.code === 'invalid_type') {
                  return { message: t('templates:validation.number') };
                }
                return { message: ctx.defaultError };
              }
            });
            if (field.validationRules?.min !== undefined) {
              numberSchema = numberSchema.min(field.validationRules.min, t('templates:validation.min', { min: field.validationRules.min }));
            }
            if (field.validationRules?.max !== undefined) {
              numberSchema = numberSchema.max(field.validationRules.max, t('templates:validation.max', { max: field.validationRules.max }));
            }
            fieldSchema = numberSchema;
            break;

          case 'day':
            let daySchema = z.union([
              z.string().regex(/^(0[1-9]|[12][0-9]|3[01])$/, t('templates:validation.dayFormat')),
              z.number().int().min(1).max(31)
            ])
              .transform((val) => typeof val === 'string' ? parseInt(val, 10) : val)
              .refine((val) => val >= 1 && val <= 31, t('templates:validation.day'));

            if (field.validationRules?.min !== undefined) {
              daySchema = daySchema.refine(
                (val) => val >= field.validationRules!.min!,
                t('templates:validation.minDay', { min: String(field.validationRules.min).padStart(2, '0') })
              ) as any;
            }
            if (field.validationRules?.max !== undefined) {
              daySchema = daySchema.refine(
                (val) => val <= field.validationRules!.max!,
                t('templates:validation.maxDay', { max: String(field.validationRules.max).padStart(2, '0') })
              ) as any;
            }
            fieldSchema = daySchema;
            break;

          case 'month':
            let monthSchema = z.union([
              z.string().regex(/^(0[1-9]|1[0-2])$/, t('templates:validation.monthFormat')),
              z.number().int().min(1).max(12)
            ])
              .transform((val) => typeof val === 'string' ? parseInt(val, 10) : val)
              .refine((val) => val >= 1 && val <= 12, t('templates:validation.month'));

            if (field.validationRules?.min !== undefined) {
              monthSchema = monthSchema.refine(
                (val) => val >= field.validationRules!.min!,
                t('templates:validation.minMonth', { min: String(field.validationRules.min).padStart(2, '0') })
              ) as any;
            }
            if (field.validationRules?.max !== undefined) {
              monthSchema = monthSchema.refine(
                (val) => val <= field.validationRules!.max!,
                t('templates:validation.maxMonth', { max: String(field.validationRules.max).padStart(2, '0') })
              ) as any;
            }
            fieldSchema = monthSchema;
            break;

          case 'year':
            let yearSchema = z.union([
              z.string().regex(/^(19|20)\d{2}$/, t('templates:validation.yearFormat')),
              z.number().int().min(1900).max(2100)
            ])
              .transform((val) => typeof val === 'string' ? parseInt(val, 10) : val)
              .refine((val) => val >= 1900 && val <= 2100, t('templates:validation.year'));

            if (field.validationRules?.min !== undefined) {
              yearSchema = yearSchema.refine(
                (val) => val >= field.validationRules!.min!,
                t('templates:validation.minYear', { min: field.validationRules.min })
              ) as any;
            }
            if (field.validationRules?.max !== undefined) {
              yearSchema = yearSchema.refine(
                (val) => val <= field.validationRules!.max!,
                t('templates:validation.maxYear', { max: field.validationRules.max })
              ) as any;
            }
            fieldSchema = yearSchema;
            break;

          case 'phone':
            // Số điện thoại Việt Nam: 10-11 số, bắt đầu bằng 0
            let phoneSchema = z.string()
              .regex(/^0\d{9}$/, t('templates:validation.phone'));

            if (field.validationRules?.pattern) {
              phoneSchema = z.string().regex(
                new RegExp(field.validationRules.pattern),
                field.validationRules.message || t('templates:validation.phone')
              );
            }
            fieldSchema = phoneSchema;
            break;

          case 'time':
            // Time format HH:MM (24-hour)
            fieldSchema = z.string()
              .regex(/^([01]\d|2[0-3]):([0-5]\d)$/, t('templates:validation.timeFormat'));
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
              }, t('templates:validation.invalidDateTime'));
            break;

          case 'checkbox':
            // Checkbox: Validate array of selected values
            // Transformation to checkbox format happens on submit
            fieldSchema = z.array(z.string()).default([]);
            break;

          case 'date':
            fieldSchema = z.string().refine((val) => !isNaN(Date.parse(val)), {
              message: t('templates:validation.invalidDate'),
            });
            break;

          case 'radio':
            // Radio: Just validate the enum value, don't transform
            // Transformation to checkbox format happens on submit
            if (field.options && field.options.length > 0) {
              const enumValues = field.options.map(opt => opt.value) as [string, ...string[]];
              fieldSchema = z.enum(enumValues);
            } else {
              fieldSchema = z.string();
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

  // Initialize form - rebuild schema on every render to get latest translations
  // This is fast and ensures validation messages are always in current language
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
    defaultValues: editingSubmission && template && template.fields
      ? reverseTransformFormData(editingSubmission.formData, template.fields)
      : {},
    mode: 'onChange', // Validate on every change for real-time feedback
  });

  // Watch all form values for real-time updates
  const formValues = watch();

  // Reset form when editing submission changes
  useEffect(() => {
    if (editingSubmission && template && template.fields) {
      const reversedData = reverseTransformFormData(editingSubmission.formData, template.fields);
      reset(reversedData);
    }
  }, [editingSubmission, template, reset]);

  // Submit mutation - Tạo mới và xóa cũ nếu đang edit
  const submitMutation = useMutation({
    mutationFn: async (formData: Record<string, any>) => {
      if (!actualTemplateId) {
        throw new Error('Template ID is required');
      }

      // Tạo submission mới
      const newSubmission = await createSubmission({ templateId: actualTemplateId, formData });

      // Submit ngay
      const result = await submitSubmission(newSubmission.id);

      // Nếu đang edit và submit thành công, xóa submission cũ
      if (editingSubmission && result.status === 'submitted') {
        await deleteSubmission(editingSubmission.id);
      }

      return result;
    },
    onSuccess: async (submission) => {
      // Polling để đợi file tạo xong
      const checkStatus = async (): Promise<{ status: 'completed' | 'failed' | 'pending'; errorMessage?: string | null }> => {
        try {
          const updated = await getSubmissionById(submission.id);
          if (updated.status === 'completed') return { status: 'completed', errorMessage: updated.errorMessage };
          if (updated.status === 'failed') return { status: 'failed', errorMessage: updated.errorMessage };
          return { status: 'pending', errorMessage: updated.errorMessage };
        } catch {
          return { status: 'pending' };
        }
      };

      // Poll mỗi 1 giây, tối đa 30 lần (30 giây)
      let attempts = 0;
      const maxAttempts = 30;
      let finalStatus: 'completed' | 'failed' | 'pending' = 'pending';
      let finalErrorMessage: string | null | undefined;

      while (attempts < maxAttempts) {
        const statusResult = await checkStatus();
        finalStatus = statusResult.status;
        finalErrorMessage = statusResult.errorMessage;
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
          ? t('templates:messages.formCompleted')
          : t('templates:messages.formCompleted');
      } else if (finalStatus === 'failed') {
        if (typeof finalErrorMessage === 'string' && finalErrorMessage.includes('S3 configuration not available')) {
          message = t('templates:messages.s3FormSubmitConfigRequired');
        } else {
          message = t('templates:messages.formError');
        }
      } else {
        message = t('templates:messages.formProcessing');
      }

      // Nếu có callback onSubmitSuccess thì dùng và truyền message
      if (onSubmitSuccess) {
        onSubmitSuccess(message, finalStatus);
      } else {
        // Fallback: hiển thị toast và quay lại
        if (finalStatus === 'failed') {
          showError(message);
        } else {
          showSuccess(message);
        }
        setTimeout(() => {
          onBack();
        }, 2000);
      }
    },
    onError: (error: any) => {
      setIsSubmitting(false);
      const backendMessage = error?.response?.data?.message || error?.message;
      if (typeof backendMessage === 'string' && backendMessage.includes('S3 configuration not available')) {
        showError(t('templates:messages.s3FormSubmitConfigRequired'));
        return;
      }
      showError(backendMessage || t('templates:messages.submitError'));
    },
  });

  const onSubmit = handleSubmit((data) => {
    // Transform radio and checkbox data to checkbox format before submitting
    const transformedData = { ...data };

    if (template && template.fields) {
      template.fields.forEach(field => {
        const value = transformedData[field.fieldName];

        // Radio: Transform "Trung Bình" -> "Thấp ☐ Trung Bình ☒ Cao ☐"
        if (field.fieldType === 'radio' && value && field.options) {
          transformedData[field.fieldName] = field.options
            .map(opt => {
              const isSelected = opt.value === value;
              const checkbox = isSelected ? '☒' : '☐';
              return `${opt.label} ${checkbox}`;
            })
            .join(' ');
        }

        // Checkbox: Transform ["A", "C"] -> "A ☒ B ☐ C ☒"
        if (field.fieldType === 'checkbox' && Array.isArray(value) && field.options) {
          transformedData[field.fieldName] = field.options
            .map(opt => {
              const isSelected = value.includes(opt.value);
              const checkbox = isSelected ? '☒' : '☐';
              return `${opt.label} ${checkbox}`;
            })
            .join(' ');
        }
      });
    }

    setIsSubmitting(true);
    submitMutation.mutate(transformedData);
  });

  if (!actualTemplateId) {
    return (
      <div className="text-center py-12">
        <AlertCircle className="mx-auto h-12 w-12 text-gray-400" />
        <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-white">
          {t('common:messages.error.notSelected')}
        </h3>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          {t('common:messages.info.pleaseSelect')}
        </p>
        <button
          onClick={onBack}
          className="mt-4 inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 dark:bg-gray-800 dark:text-gray-300 dark:border-gray-600 dark:hover:bg-gray-700"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          {t('templates:actions.back')}
        </button>
      </div>
    );
  }

  if (templateLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-gray-200 dark:border-gray-700 border-t-doan-500 dark:border-t-doan-400"></div>
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
              {t('templates:messages.noTemplates')}
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
          {t('templates:actions.back')}
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
                  {t('common:actions.editing')}
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
                className="block text-base font-semibold text-gray-900 dark:text-white mb-2"
              >
                <span className="flex items-center gap-2">
                  {field.displayName}
                  {field.validationRules?.required ? (
                    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400">
                      {t('templates:validation.required')}
                    </span>
                  ) : (
                    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400">
                      {t('templates:validation.optional')}
                    </span>
                  )}
                </span>
              </label>
              {!field.validationRules?.required && (
                <p className="mt-1 mb-3 text-sm text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20 px-3 py-2 rounded-lg border border-amber-200 dark:border-amber-800 flex items-start gap-2">
                  <svg className="w-4 h-4 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                  <span>{t('templates:validation.optionalWarning')}</span>
                </p>
              )}
              {field.helpText && (
                <p className="mt-2 mb-4 text-sm text-gray-600 dark:text-gray-400 leading-relaxed bg-blue-50 dark:bg-blue-900/10 p-3 rounded-lg border border-blue-200 dark:border-blue-800">
                  <span className="font-medium text-blue-800 dark:text-blue-300"> </span>
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
                            rows={5}
                            value={value || ''}
                            onChange={onChange}
                            placeholder={field.placeholder || t('templates:placeholders.defaultValue')}
                            className="block w-full px-4 py-3 text-base rounded-lg border-2 border-gray-300 dark:border-gray-600 shadow-sm focus:border-blue-500 focus:ring-4 focus:ring-blue-100 dark:focus:ring-blue-900/50 dark:bg-gray-700 dark:text-white transition-all duration-200 hover:border-gray-400 dark:hover:border-gray-500"
                          />
                        );

                      case 'radio':
                        return (
                          <div className="space-y-3">
                            {field.options?.map((option) => {
                              const isSelected = value === option.value;
                              return (
                                <label
                                  key={option.value}
                                  className={`
                                    flex items-center cursor-pointer group px-4 py-3 rounded-lg border-2 transition-all duration-200
                                    ${isSelected
                                      ? 'bg-blue-50 border-blue-500 dark:bg-blue-900/20 dark:border-blue-500'
                                      : 'bg-white border-gray-200 dark:bg-gray-800 dark:border-gray-600 hover:border-blue-300 dark:hover:border-blue-600'
                                    }
                                  `}
                                >
                                  <input
                                    type="radio"
                                    value={option.value}
                                    checked={isSelected}
                                    onChange={onChange}
                                    className="sr-only peer"
                                  />
                                  <div className={`
                                    w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all duration-200
                                    ${isSelected
                                      ? 'bg-blue-600 border-blue-600 dark:bg-blue-500 dark:border-blue-500'
                                      : 'border-gray-300 dark:border-gray-500 bg-white dark:bg-gray-700'
                                    }
                                    peer-focus:ring-4 peer-focus:ring-blue-100 dark:peer-focus:ring-blue-900/50
                                  `}>
                                    {isSelected && (
                                      <div className="w-2 h-2 bg-white rounded-full"></div>
                                    )}
                                  </div>
                                  <span className={`ml-3 text-base font-medium transition-colors select-none ${isSelected
                                      ? 'text-blue-900 dark:text-blue-100'
                                      : 'text-gray-700 dark:text-gray-300 group-hover:text-blue-600 dark:group-hover:text-blue-400'
                                    }`}>
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
                            className="block w-full px-4 py-3 text-base rounded-lg border-2 border-gray-300 dark:border-gray-600 shadow-sm focus:border-blue-500 focus:ring-4 focus:ring-blue-100 dark:focus:ring-blue-900/50 dark:bg-gray-700 dark:text-white transition-all duration-200 hover:border-gray-400 dark:hover:border-gray-500"
                          />
                        );

                      case 'time':
                        return (
                          <input
                            id={field.fieldName}
                            type="time"
                            value={value || ''}
                            onChange={onChange}
                            className="block w-full px-4 py-3 text-base rounded-lg border-2 border-gray-300 dark:border-gray-600 shadow-sm focus:border-blue-500 focus:ring-4 focus:ring-blue-100 dark:focus:ring-blue-900/50 dark:bg-gray-700 dark:text-white transition-all duration-200 hover:border-gray-400 dark:hover:border-gray-500"
                          />
                        );

                      case 'datetime':
                        return (
                          <input
                            id={field.fieldName}
                            type="datetime-local"
                            value={value || ''}
                            onChange={onChange}
                            className="block w-full px-4 py-3 text-base rounded-lg border-2 border-gray-300 dark:border-gray-600 shadow-sm focus:border-blue-500 focus:ring-4 focus:ring-blue-100 dark:focus:ring-blue-900/50 dark:bg-gray-700 dark:text-white transition-all duration-200 hover:border-gray-400 dark:hover:border-gray-500"
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
                            className="block w-full px-4 py-3 text-base rounded-lg border-2 border-gray-300 dark:border-gray-600 shadow-sm focus:border-blue-500 focus:ring-4 focus:ring-blue-100 dark:focus:ring-blue-900/50 dark:bg-gray-700 dark:text-white transition-all duration-200 hover:border-gray-400 dark:hover:border-gray-500"
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
                            className="block w-full px-4 py-3 text-base rounded-lg border-2 border-gray-300 dark:border-gray-600 shadow-sm focus:border-blue-500 focus:ring-4 focus:ring-blue-100 dark:focus:ring-blue-900/50 dark:bg-gray-700 dark:text-white transition-all duration-200 hover:border-gray-400 dark:hover:border-gray-500"
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
                            className="block w-full px-4 py-3 text-base rounded-lg border-2 border-gray-300 dark:border-gray-600 shadow-sm focus:border-blue-500 focus:ring-4 focus:ring-blue-100 dark:focus:ring-blue-900/50 dark:bg-gray-700 dark:text-white transition-all duration-200 hover:border-gray-400 dark:hover:border-gray-500"
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
                            className="block w-full px-4 py-3 text-base rounded-lg border-2 border-gray-300 dark:border-gray-600 shadow-sm focus:border-blue-500 focus:ring-4 focus:ring-blue-100 dark:focus:ring-blue-900/50 dark:bg-gray-700 dark:text-white transition-all duration-200 hover:border-gray-400 dark:hover:border-gray-500"
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
                            className="block w-full px-4 py-3 text-base rounded-lg border-2 border-gray-300 dark:border-gray-600 shadow-sm focus:border-blue-500 focus:ring-4 focus:ring-blue-100 dark:focus:ring-blue-900/50 dark:bg-gray-700 dark:text-white transition-all duration-200 hover:border-gray-400 dark:hover:border-gray-500"
                          />
                        );

                      case 'checkbox':
                        // Checkbox với multiple options
                        const selectedValues = Array.isArray(value) ? value : [];
                        return (
                          <div className="space-y-3">
                            {field.options?.map((option) => {
                              const isSelected = selectedValues.includes(option.value);
                              return (
                                <label
                                  key={option.value}
                                  className={`
                                    flex items-center cursor-pointer group px-4 py-3 rounded-lg border-2 transition-all duration-200
                                    ${isSelected
                                      ? 'bg-blue-50 border-blue-500 dark:bg-blue-900/20 dark:border-blue-500'
                                      : 'bg-white border-gray-200 dark:bg-gray-800 dark:border-gray-600 hover:border-blue-300 dark:hover:border-blue-600'
                                    }
                                  `}
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
                                    peer-focus:ring-4 peer-focus:ring-blue-100 dark:peer-focus:ring-blue-900/50
                                  `}>
                                    {isSelected && (
                                      <svg
                                        className="w-3.5 h-3.5 text-white pointer-events-none"
                                        fill="none"
                                        strokeWidth="3"
                                        stroke="currentColor"
                                        viewBox="0 0 24 24"
                                      >
                                        <path d="M5 13l4 4L19 7" strokeLinecap="round" strokeLinejoin="round" />
                                      </svg>
                                    )}
                                  </div>
                                  <span className={`ml-3 text-base font-medium transition-colors select-none ${isSelected
                                      ? 'text-blue-900 dark:text-blue-100'
                                      : 'text-gray-700 dark:text-gray-300 group-hover:text-blue-600 dark:group-hover:text-blue-400'
                                    }`}>
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
                            placeholder={field.placeholder || t('templates:placeholders.enterField', { field: field.displayName.toLowerCase() })}
                            className="block w-full px-4 py-3 text-base rounded-lg border-2 border-gray-300 dark:border-gray-600 shadow-sm focus:border-blue-500 focus:ring-4 focus:ring-blue-100 dark:focus:ring-blue-900/50 dark:bg-gray-700 dark:text-white transition-all duration-200 hover:border-gray-400 dark:hover:border-gray-500"
                          />
                        );
                    }
                  }}
                />
                {errors[field.fieldName] && (
                  <div className="mt-3 flex items-start p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                    <AlertCircle className="h-5 w-5 text-red-500 dark:text-red-400 mr-2 mt-0.5 flex-shrink-0" />
                    <p className="text-sm font-medium text-red-700 dark:text-red-300">
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
                {t('common:fields.total')}: <span className="font-semibold text-gray-900 dark:text-white">{totalFields}</span>
              </span>
              <span>•</span>
              <span>
                {t('common:fields.required')}: <span className="font-semibold text-gray-900 dark:text-white">{requiredFields}</span>
              </span>
              <span>•</span>
              <span>
                {t('common:fields.filled')}: <span className="font-semibold text-gray-900 dark:text-white">{filledFields}</span>
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
                  {t('templates:messages.processing')}
                </>
              ) : (
                editingSubmission ? t('templates:actions.saveChanges') : t('templates:actions.submit')
              )}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
};

export default FormFillTab;
