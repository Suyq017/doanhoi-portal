import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { X, FileText, Loader, AlertCircle } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { getSubmissionById } from '@/shared/services/template.service';
import type { TemplateSubmission } from '@/shared/types/template.types';

interface SubmissionPreviewModalProps {
  isOpen: boolean;
  submissionId: string | null;
  onClose: () => void;
}

const SubmissionPreviewModal: React.FC<SubmissionPreviewModalProps> = ({
  isOpen,
  submissionId,
  onClose,
}) => {
  const { t } = useTranslation(['templates', 'common']);

  const { data: submission, isLoading, error } = useQuery({
    queryKey: ['submission', submissionId],
    queryFn: () => getSubmissionById(submissionId!),
    enabled: isOpen && !!submissionId,
    staleTime: 0, // Always fetch fresh data
  });

  if (!isOpen) return null;

  const renderFieldValue = (value: any): string => {
    if (value === null || value === undefined) return '-';
    if (typeof value === 'boolean') return value ? t('common:labels.yes') : t('common:labels.no');
    if (Array.isArray(value)) return value.join(', ');
    if (typeof value === 'object') return JSON.stringify(value);
    return String(value);
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black bg-opacity-50 transition-opacity"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="flex min-h-screen items-center justify-center p-4">
        <div
          className="relative w-full max-w-4xl bg-white dark:bg-gray-800 rounded-lg shadow-xl"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700">
            <div className="flex items-center">
              <FileText className="h-6 w-6 text-blue-600 dark:text-blue-400 mr-3" />
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white">
                {t('templates:preview.title')}
              </h3>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-500 dark:hover:text-gray-300 transition-colors"
            >
              <X className="h-6 w-6" />
            </button>
          </div>

          {/* Content */}
          <div className="px-6 py-4 max-h-[70vh] overflow-y-auto">
            {isLoading && (
              <div className="flex flex-col items-center justify-center py-12">
                <Loader className="h-12 w-12 text-blue-500 animate-spin mb-4" />
                <p className="text-gray-600 dark:text-gray-400">
                  {t('common:messages.loading')}
                </p>
              </div>
            )}

            {error && (
              <div className="rounded-lg bg-red-50 dark:bg-red-900/20 p-4">
                <div className="flex">
                  <AlertCircle className="h-5 w-5 text-red-400 flex-shrink-0" />
                  <div className="ml-3">
                    <h3 className="text-sm font-medium text-red-800 dark:text-red-300">
                      {t('templates:errors.loadingSubmission')}
                    </h3>
                    <p className="mt-2 text-sm text-red-700 dark:text-red-400">
                      {error instanceof Error ? error.message : t('templates:errors.unknown')}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {submission && (
              <div className="space-y-6">
                {/* Template Info */}
                <div className="bg-gray-50 dark:bg-gray-900/50 rounded-lg p-4">
                  <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">
                    {t('templates:preview.templateInfo')}
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <span className="text-xs text-gray-500 dark:text-gray-400">
                        {t('templates:fields.name')}:
                      </span>
                      <p className="text-sm font-medium text-gray-900 dark:text-white mt-1">
                        {submission.template?.name || '-'}
                      </p>
                    </div>
                    <div>
                      <span className="text-xs text-gray-500 dark:text-gray-400">
                        {t('templates:fields.status')}:
                      </span>
                      <p className="text-sm font-medium text-gray-900 dark:text-white mt-1">
                        {t(`templates:status.${submission.status}`)}
                      </p>
                    </div>
                    <div>
                      <span className="text-xs text-gray-500 dark:text-gray-400">
                        {t('templates:fields.createdAt')}:
                      </span>
                      <p className="text-sm font-medium text-gray-900 dark:text-white mt-1">
                        {(() => {
                          const date = new Date(submission.createdAt);
                          date.setHours(date.getHours() + 7);
                          const day = String(date.getDate()).padStart(2, '0');
                          const month = String(date.getMonth() + 1).padStart(2, '0');
                          const year = date.getFullYear();
                          const hours = String(date.getHours()).padStart(2, '0');
                          const minutes = String(date.getMinutes()).padStart(2, '0');
                          return `${hours}:${minutes}, ${day}/${month}/${year}`;
                        })()}
                      </p>
                    </div>
                    <div>
                      <span className="text-xs text-gray-500 dark:text-gray-400">
                        {t('templates:fields.updatedAt')}:
                      </span>
                      <p className="text-sm font-medium text-gray-900 dark:text-white mt-1">
                        {(() => {
                          const date = new Date(submission.updatedAt);
                          date.setHours(date.getHours() + 7);
                          const day = String(date.getDate()).padStart(2, '0');
                          const month = String(date.getMonth() + 1).padStart(2, '0');
                          const year = date.getFullYear();
                          const hours = String(date.getHours()).padStart(2, '0');
                          const minutes = String(date.getMinutes()).padStart(2, '0');
                          return `${hours}:${minutes}, ${day}/${month}/${year}`;
                        })()}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Form Data */}
                <div>
                  <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-4">
                    {t('templates:preview.formData')}
                  </h4>
                  <div className="space-y-4">
                    {submission.template?.fields && submission.template.fields.length > 0 ? (
                      submission.template.fields
                        .sort((a, b) => (a.position || 0) - (b.position || 0))
                        .map((field) => {
                          const value = submission.formData?.[field.fieldName];
                          return (
                            <div
                              key={field.fieldName}
                              className="border-l-4 border-blue-500 bg-gray-50 dark:bg-gray-900/50 rounded-r-lg px-4 py-3"
                            >
                              <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2">
                                <div className="flex-1">
                                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                                    {field.displayName}
                                    {field.validationRules?.required && (
                                      <span className="text-red-500 ml-1">*</span>
                                    )}
                                  </label>
                                  {field.helpText && (
                                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                      {field.helpText}
                                    </p>
                                  )}
                                </div>
                                <div className="sm:text-right sm:max-w-md">
                                  <p className="text-sm text-gray-900 dark:text-white font-medium break-words">
                                    {renderFieldValue(value)}
                                  </p>
                                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                    {t(`templates:fieldTypes.${field.fieldType}`)}
                                  </p>
                                </div>
                              </div>
                            </div>
                          );
                        })
                    ) : (
                      <p className="text-sm text-gray-500 dark:text-gray-400 italic">
                        {t('templates:preview.noFields')}
                      </p>
                    )}
                  </div>
                </div>

                {/* Error Message (if any) */}
                {submission.errorMessage && (
                  <div className="rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 p-4">
                    <h4 className="text-sm font-semibold text-red-800 dark:text-red-300 mb-2">
                      {t('templates:preview.errorMessage')}
                    </h4>
                    <p className="text-sm text-red-700 dark:text-red-400">
                      {submission.errorMessage}
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="flex justify-end px-6 py-4 border-t border-gray-200 dark:border-gray-700">
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
            >
              {t('common:actions.close')}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SubmissionPreviewModal;
