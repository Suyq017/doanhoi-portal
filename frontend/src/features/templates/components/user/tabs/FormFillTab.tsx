import React, { useEffect, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { ArrowLeft, Save, Send, AlertCircle, Loader } from 'lucide-react';
import {
  getTemplateById,
  createSubmission,
  updateSubmission,
  submitSubmission,
  getMySubmissions,
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
}

const FormFillTab: React.FC<FormFillTabProps> = ({ templateId, onBack }) => {
  const queryClient = useQueryClient();
  const { toasts, showSuccess, showError, hideToast } = useToast();
  const [draftSubmission, setDraftSubmission] = useState<TemplateSubmission | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Fetch template
  const { data: template, isLoading: templateLoading } = useQuery({
    queryKey: ['template', templateId],
    queryFn: () => getTemplateById(templateId!),
    enabled: !!templateId,
  });

  // Fetch existing draft submission
  const { data: submissions } = useQuery({
    queryKey: ['mySubmissions', templateId],
    queryFn: () => getMySubmissions(templateId || undefined),
    enabled: !!templateId,
  });

  // Find draft submission for this template
  useEffect(() => {
    if (submissions) {
      const draft = submissions.find(
        (s) => s.templateId === templateId && s.status === 'draft'
      );
      setDraftSubmission(draft || null);
    }
  }, [submissions, templateId]);

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
            let numberSchema = z.coerce.number();
            if (field.validationRules?.min !== undefined) {
              numberSchema = numberSchema.min(field.validationRules.min);
            }
            if (field.validationRules?.max !== undefined) {
              numberSchema = numberSchema.max(field.validationRules.max);
            }
            fieldSchema = numberSchema;
            break;

          case 'date':
            fieldSchema = z.string().refine((val) => !isNaN(Date.parse(val)), {
              message: 'Ngày không hợp lệ',
            });
            break;

          case 'date_parts':
            // Validate object có day, month, year
            fieldSchema = z.object({
              day: z.coerce.number().min(1).max(31),
              month: z.coerce.number().min(1).max(12),
              year: z.coerce.number().min(1900).max(2100),
            });
            break;

          case 'select':
          case 'radio':
            fieldSchema = z.string();
            if (field.options && field.options.length > 0) {
              const enumValues = field.options.map(opt => opt.value) as [string, ...string[]];
              fieldSchema = z.enum(enumValues);
            }
            break;

          case 'checkbox':
            fieldSchema = z.boolean();
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
    formState: { errors, isDirty },
  } = useForm({
    resolver: zodResolver(formSchema),
    defaultValues: draftSubmission?.formData || {},
  });

  // Reset form when draft changes
  useEffect(() => {
    if (draftSubmission) {
      reset(draftSubmission.formData);
    }
  }, [draftSubmission, reset]);

  // Save draft mutation
  const saveDraftMutation = useMutation({
    mutationFn: async (formData: Record<string, any>) => {
      if (draftSubmission) {
        return updateSubmission(draftSubmission.id, { formData });
      } else {
        return createSubmission({ templateId: templateId!, formData });
      }
    },
    onSuccess: (data) => {
      setDraftSubmission(data);
      queryClient.invalidateQueries({ queryKey: ['mySubmissions'] });
      showSuccess('Đã lưu nháp thành công');
    },
    onError: (error: any) => {
      showError(error?.response?.data?.message || 'Lưu nháp thất bại');
    },
  });

  // Submit mutation
  const submitMutation = useMutation({
    mutationFn: async (formData: Record<string, any>) => {
      let submissionId = draftSubmission?.id;

      // Create or update draft first
      if (!submissionId) {
        const draft = await createSubmission({ templateId: templateId!, formData });
        submissionId = draft.id;
      } else {
        await updateSubmission(submissionId, { formData });
      }

      // Submit
      return submitSubmission(submissionId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['mySubmissions'] });
      showSuccess('Gửi biểu mẫu thành công! Tài liệu đang được tạo...');
      setIsSubmitting(false);
      setTimeout(() => {
        onBack();
      }, 2000);
    },
    onError: (error: any) => {
      setIsSubmitting(false);
      showError(error?.response?.data?.message || 'Gửi biểu mẫu thất bại');
    },
  });

  const onSaveDraft = handleSubmit((data) => {
    saveDraftMutation.mutate(data);
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

  return (
    <div className="max-w-4xl mx-auto">
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

      {/* Header */}
      <div className="mb-6">
        <button
          onClick={onBack}
          className="inline-flex items-center text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300 mb-4"
        >
          <ArrowLeft className="h-4 w-4 mr-1" />
          Quay lại danh sách
        </button>
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
          {template.name}
        </h2>
        {template.description && (
          <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
            {template.description}
          </p>
        )}
        {draftSubmission && (
          <div className="mt-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200">
            <Save className="h-3 w-3 mr-1" />
            Đang chỉnh sửa nháp
          </div>
        )}
      </div>

      {/* Form */}
      <form onSubmit={onSubmit} className="space-y-6">
        <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6 space-y-6">
          {visibleFields.map((field) => (
            <div key={field.id}>
              <label
                htmlFor={field.fieldName}
                className="block text-sm font-medium text-gray-700 dark:text-gray-300"
              >
                {field.displayName}
                {field.validationRules?.required && <span className="text-red-500 ml-1">*</span>}
              </label>
              {field.helpText && (
                <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                  {field.helpText}
                </p>
              )}
              <div className="mt-2">
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
                            className="shadow-sm focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-sm border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-md"
                          />
                        );

                      case 'select':
                        return (
                          <select
                            id={field.fieldName}
                            value={value || ''}
                            onChange={onChange}
                            className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md"
                          >
                            <option value="">-- Chọn --</option>
                            {field.options?.map((option) => (
                              <option key={option.value} value={option.value}>
                                {option.label}
                              </option>
                            ))}
                          </select>
                        );

                      case 'radio':
                        return (
                          <div className="space-y-2">
                            {field.options?.map((option) => (
                              <label
                                key={option.value}
                                className="inline-flex items-center mr-6"
                              >
                                <input
                                  type="radio"
                                  value={option.value}
                                  checked={value === option.value}
                                  onChange={onChange}
                                  className="form-radio h-4 w-4 text-blue-600 border-gray-300 dark:border-gray-600 focus:ring-blue-500"
                                />
                                <span className="ml-2 text-sm text-gray-700 dark:text-gray-300">
                                  {option.label}
                                </span>
                              </label>
                            ))}
                          </div>
                        );

                      case 'checkbox':
                        return (
                          <div className="flex items-center">
                            <input
                              id={field.fieldName}
                              type="checkbox"
                              checked={value || false}
                              onChange={(e) => onChange(e.target.checked)}
                              className="h-4 w-4 text-blue-600 border-gray-300 dark:border-gray-600 rounded focus:ring-blue-500"
                            />
                            <label
                              htmlFor={field.fieldName}
                              className="ml-2 block text-sm text-gray-900 dark:text-gray-300"
                            >
                              {field.displayName}
                            </label>
                          </div>
                        );

                      case 'date':
                        return (
                          <input
                            id={field.fieldName}
                            type="date"
                            value={value || ''}
                            onChange={onChange}
                            className="shadow-sm focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-sm border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-md"
                          />
                        );

                      case 'date_parts':
                        return (
                          <div className="grid grid-cols-3 gap-3">
                            <div>
                              <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">
                                Ngày
                              </label>
                              <input
                                type="number"
                                min="1"
                                max="31"
                                value={value?.day || ''}
                                onChange={(e) =>
                                  onChange({
                                    ...value,
                                    day: parseInt(e.target.value) || undefined,
                                  })
                                }
                                placeholder="DD"
                                className="shadow-sm focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-sm border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-md"
                              />
                            </div>
                            <div>
                              <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">
                                Tháng
                              </label>
                              <input
                                type="number"
                                min="1"
                                max="12"
                                value={value?.month || ''}
                                onChange={(e) =>
                                  onChange({
                                    ...value,
                                    month: parseInt(e.target.value) || undefined,
                                  })
                                }
                                placeholder="MM"
                                className="shadow-sm focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-sm border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-md"
                              />
                            </div>
                            <div>
                              <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">
                                Năm
                              </label>
                              <input
                                type="number"
                                min="1900"
                                max="2100"
                                value={value?.year || ''}
                                onChange={(e) =>
                                  onChange({
                                    ...value,
                                    year: parseInt(e.target.value) || undefined,
                                  })
                                }
                                placeholder="YYYY"
                                className="shadow-sm focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-sm border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-md"
                              />
                            </div>
                          </div>
                        );

                      case 'number':
                        return (
                          <input
                            id={field.fieldName}
                            type="number"
                            value={value || ''}
                            onChange={onChange}
                            min={field.validationRules?.min}
                            max={field.validationRules?.max}
                            className="shadow-sm focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-sm border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-md"
                          />
                        );

                      default:
                        return (
                          <input
                            id={field.fieldName}
                            type={field.fieldType === 'email' ? 'email' : 'text'}
                            value={value || ''}
                            onChange={onChange}
                            minLength={field.validationRules?.minLength}
                            maxLength={field.validationRules?.maxLength}
                            className="shadow-sm focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-sm border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-md"
                          />
                        );
                    }
                  }}
                />
                {errors[field.fieldName] && (
                  <p className="mt-1 text-sm text-red-600 dark:text-red-400">
                    {errors[field.fieldName]?.message as string}
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Actions */}
        <div className="flex justify-end space-x-3">
          <button
            type="button"
            onClick={onSaveDraft}
            disabled={!isDirty || saveDraftMutation.isPending}
            className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 dark:bg-gray-800 dark:text-gray-300 dark:border-gray-600 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {saveDraftMutation.isPending ? (
              <Loader className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Save className="h-4 w-4 mr-2" />
            )}
            Lưu nháp
          </button>
          <button
            type="submit"
            disabled={isSubmitting || submitMutation.isPending}
            className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSubmitting || submitMutation.isPending ? (
              <Loader className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Send className="h-4 w-4 mr-2" />
            )}
            Gửi biểu mẫu
          </button>
        </div>
      </form>
    </div>
  );
};

export default FormFillTab;
