import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';
import { X, AlertTriangle } from 'lucide-react';
import { Class, classService } from '../../../shared';

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
        alert(t('classes:messages.cannotDeleteWithStudents'));
      }
    } finally {
      setLoading(false);
    }
  };

  const handleOverlayClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  if (!isOpen) return null;

  const hasStudents = classData.students && classData.students.length > 0;

  return createPortal(
    <div 
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
      onClick={handleOverlayClick}
    >
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-md">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white flex items-center">
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
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
              {t('common:messages.confirm.delete')}
            </p>
            <div className="bg-gray-50 dark:bg-gray-700 p-3 rounded-lg">
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
            <div className="mb-4 p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
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
        <div className="flex justify-end space-x-3 px-6 py-4 border-t border-gray-200 dark:border-gray-700">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-doan-500 transition-colors"
            disabled={loading}
          >
            {t('common:actions.cancel')}
          </button>
          <button
            type="button"
            onClick={handleDelete}
            className="px-4 py-2 text-sm font-medium text-white bg-red-600 border border-transparent rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            disabled={loading || hasStudents}
          >
            {loading ? t('common:states.deleting') : t('common:actions.delete')}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};

export default DeleteConfirmModal;
