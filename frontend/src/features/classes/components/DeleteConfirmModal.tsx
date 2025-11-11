import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';
import { X, AlertTriangle } from 'lucide-react';
import { Class, classService } from '../../../shared';
import { Toast } from '@/shared/components';
import { useToast } from '@/shared/hooks/useToast';

interface DeleteConfirmModalProps {
  isOpen: boolean;
  classData: Class;
  onClose: () => void;
  onSuccess: () => void;
}

const DeleteConfirmModal: React.FC<DeleteConfirmModalProps> = ({
  isOpen,
  classData,
  onClose,
  onSuccess,
}) => {
  const { t } = useTranslation(['classes', 'common']);
  const { showError, toasts, hideToast } = useToast();
  const [loading, setLoading] = useState(false);

  const handleDelete = async () => {
    try {
      setLoading(true);
      await classService.deleteClass(classData.id);
      onSuccess();
    } catch (error: any) {
      console.error('Error deleting class:', error);

      // Handle specific error for classes with students
      if (error.message?.includes('students')) {
        showError(t('classes:messages.cannotDeleteWithStudents'));
      }
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  const hasStudents = classData.students && classData.students.length > 0;

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-50"
    >
      <div className="w-full max-w-md bg-white rounded-lg shadow-xl dark:bg-gray-800">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <h2 className="flex items-center text-xl font-semibold text-gray-900 dark:text-white">
            <AlertTriangle className="w-6 h-6 mr-2 text-red-600" />
            {t('classes:titles.delete')}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          <div className="mb-4">
            <p className="mb-2 text-sm text-gray-600 dark:text-gray-400">
              {t('common:messages.confirm.delete')}
            </p>
            <div className="p-3 rounded-lg bg-gray-50 dark:bg-gray-700">
              <div className="font-medium text-gray-900 dark:text-white">
                {classData.name}
              </div>
              {classData.code && (
                <div className="text-sm text-gray-500 dark:text-gray-400">
                  {t('common:fields.code')}: {classData.code}
                </div>
              )}
            </div>
          </div>

          {hasStudents && (
            <div className="p-3 mb-4 border border-yellow-200 rounded-lg bg-yellow-50 dark:bg-yellow-900/20 dark:border-yellow-800">
              <div className="flex items-start">
                <AlertTriangle className="w-5 h-5 text-yellow-600 dark:text-yellow-400 mt-0.5 mr-2 flex-shrink-0" />
                <div>
                  <div className="text-sm font-medium text-yellow-800 dark:text-yellow-200">
                    {t('classes:messages.hasStudents')}
                  </div>
                  <div className="text-sm text-yellow-700 dark:text-yellow-300">
                    {t('classes:messages.moveStudentsFirst', { count: classData.students?.length })}
                  </div>
                </div>
              </div>
            </div>
          )}

          <p className="text-sm text-red-600 dark:text-red-400">
            {t('common:messages.confirm.deleteWarning')}
          </p>
        </div>

        {/* Actions */}
        <div className="flex justify-end px-6 py-4 space-x-3 border-t border-gray-200 dark:border-gray-700">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 transition-colors bg-white border border-gray-300 rounded-md dark:text-gray-300 dark:bg-gray-700 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-doan-500"
            disabled={loading}
          >
            {t('common:actions.cancel')}
          </button>
          <button
            type="button"
            onClick={handleDelete}
            className="px-4 py-2 text-sm font-medium text-white transition-colors bg-red-600 border border-transparent rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50 disabled:cursor-not-allowed"
            disabled={loading || hasStudents}
          >
            {loading ? t('common:states.deleting') : t('common:actions.delete')}
          </button>
        </div>
      </div>

      {/* Toast notifications */}
      {toasts.map((toast) => (
        <Toast
          key={toast.id}
          type={toast.type}
          message={toast.message}
          duration={toast.duration}
          onClose={() => hideToast(toast.id)}
        />
      ))}
    </div>,
    document.body
  );
};

export default DeleteConfirmModal;
