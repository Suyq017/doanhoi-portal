import React from 'react';
import { createPortal } from 'react-dom';
import { X, Calendar, Users } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Department } from '../../../shared';

interface ViewDepartmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  department: Department;
}

const ViewDepartmentModal: React.FC<ViewDepartmentModalProps> = ({
  isOpen,
  onClose,
  department,
}) => {
  const { t } = useTranslation(['departments', 'common']);

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('vi-VN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const handleOverlayClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  if (!isOpen) return null;

  return createPortal(
    <div 
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
      onClick={handleOverlayClick}
    >
      <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">
            {t('departments:titles.view')}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Basic Information */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {t('departments:fields.name')}
              </label>
              <p className="text-lg font-semibold text-gray-900">{department.name}</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {t('departments:fields.code')}
              </label>
              <p className="text-gray-900">{department.code || '-'}</p>
            </div>
          </div>

          {/* Description */}
          {department.description && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {t('departments:fields.description')}
              </label>
              <p className="text-gray-900 whitespace-pre-wrap">{department.description}</p>
            </div>
          )}

          {/* Status */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {t('common:fields.status')}
            </label>
            <span
              className={`inline-flex px-3 py-1 text-sm font-semibold rounded-full ${
                department.isActive
                  ? 'bg-green-100 text-green-800'
                  : 'bg-red-100 text-red-800'
              }`}
            >
              {department.isActive ? t('common:status.active') : t('common:status.inactive')}
            </span>
          </div>

          {/* User Statistics */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-blue-50 rounded-lg p-4">
              <div className="flex items-center">
                <Users className="w-8 h-8 text-blue-600" />
                <div className="ml-3">
                  <p className="text-sm font-medium text-blue-900">
                    {t('departments:fields.managementUsers')}
                  </p>
                  <p className="text-2xl font-bold text-blue-600">
                    {department.managementUserCount || 0}
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-green-50 rounded-lg p-4">
              <div className="flex items-center">
                <Users className="w-8 h-8 text-green-600" />
                <div className="ml-3">
                  <p className="text-sm font-medium text-green-900">
                    {t('departments:fields.trainingUsers')}
                  </p>
                  <p className="text-2xl font-bold text-green-600">
                    {department.trainingUserCount|| 0}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Timestamps */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t border-gray-200">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                <Calendar className="w-4 h-4 inline mr-1" />
                {t('common:fields.createdAt')}
              </label>
              <p className="text-gray-600">{formatDate(department.createdAt)}</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                <Calendar className="w-4 h-4 inline mr-1" />
                {t('common:fields.updatedAt')}
              </label>
              <p className="text-gray-600">{formatDate(department.updatedAt)}</p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end p-6 border-t border-gray-200">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md transition-colors"
          >
            {t('common:actions.close')}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};

export default ViewDepartmentModal;
