import React from 'react';
import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';
import { X, GraduationCap, Calendar, Building, Users, Tag, Clock } from 'lucide-react';
import { Class } from '../../../shared';

interface ViewClassModalProps {
  isOpen: boolean;
  classData: Class;
  onClose: () => void;
}

const ViewClassModal: React.FC<ViewClassModalProps> = ({
  isOpen,
  classData,
  onClose,
}) => {
  const { t } = useTranslation(['classes', 'common']);

  if (!isOpen) return null;

  return createPortal(
    <div
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
    >
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white flex items-center">
            <GraduationCap className="w-6 h-6 mr-2 text-doan-600" />
            {t('classes:titles.view')}
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
          {/* Basic Information Section */}
          <div className="mb-6">
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4 flex items-center">
              <Tag className="w-5 h-5 mr-2" />
              {t('classes:labels.classInfo')}
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Class Name */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  {t('classes:fields.name')}
                </label>
                <div className="text-gray-900 dark:text-white text-lg font-semibold">
                  {classData.name}
                </div>
              </div>

              {/* Year */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  {t('classes:fields.year')}
                </label>
                <div className="text-gray-900 dark:text-white flex items-center">
                  <Calendar className="w-4 h-4 mr-2 text-gray-500" />
                  {classData.year || '-'}
                </div>
              </div>

              {/* Status */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  {t('common:fields.status')}
                </label>
                <span className={`inline-flex px-3 py-1 text-sm font-semibold rounded-full ${classData.isActive
                    ? 'bg-green-100 text-green-800 dark:bg-green-800 dark:text-green-100'
                    : 'bg-red-100 text-red-800 dark:bg-red-800 dark:text-red-100'
                  }`}>
                  {classData.isActive ? t('common:status.active') : t('common:status.inactive')}
                </span>
              </div>
            </div>
          </div>

          {/* Department Information */}
          {classData.department && (
            <div className="mb-6">
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4 flex items-center">
                <Building className="w-5 h-5 mr-2" />
                {t('classes:fields.department')}
              </h3>

              <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      {t('departments:fields.name')}
                    </label>
                    <div className="text-gray-900 dark:text-white">
                      {classData.department.name}
                    </div>
                  </div>

                  {classData.department.code && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        {t('common:fields.code')}
                      </label>
                      <div className="text-gray-900 dark:text-white">
                        {classData.department.code}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Student Information */}
          <div className="mb-6">
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4 flex items-center">
              <Users className="w-5 h-5 mr-2" />
              {t('classes:labels.studentList')}
            </h3>

            <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <Users className="w-6 h-6 mr-2 text-doan-600" />
                  <span className="text-lg font-semibold text-gray-900 dark:text-white">
                    {t('classes:fields.studentCount')}: {classData.students?.length || 0}
                  </span>
                </div>
              </div>

              {classData.students && classData.students.length > 0 ? (
                <div className="mt-4">
                  <div className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                    {t('common:pagination.showing', {
                      start: 1,
                      end: Math.min(5, classData.students.length),
                      total: classData.students.length
                    })}
                  </div>
                  <div className="space-y-2">
                    {classData.students.slice(0, 5).map((student: any, index: number) => (
                      <div key={index} className="flex items-center p-2 bg-white dark:bg-gray-600 rounded border">
                        <div className="flex-1">
                          <div className="text-sm font-medium text-gray-900 dark:text-white">
                            {student.fullName || `${student.familyName} ${student.givenName}`}
                          </div>
                          <div className="text-xs text-gray-500 dark:text-gray-400">
                            {student.code} • {student.email}
                          </div>
                        </div>
                      </div>
                    ))}
                    {classData.students.length > 5 && (
                      <div className="text-sm text-gray-500 dark:text-gray-400 text-center py-2">
                        +{classData.students.length - 5} {t('common:messages.more')}
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div className="text-center py-4 text-gray-500 dark:text-gray-400">
                  {t('common:messages.empty.noData')}
                </div>
              )}
            </div>
          </div>

          {/* Timestamps */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                {t('common:fields.createdAt')}
              </label>
              <div className="text-gray-900 dark:text-white flex items-center">
                <Clock className="w-4 h-4 mr-2 text-gray-500" />
                {new Date(classData.createdAt).toLocaleString()}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                {t('common:fields.updatedAt')}
              </label>
              <div className="text-gray-900 dark:text-white flex items-center">
                <Clock className="w-4 h-4 mr-2 text-gray-500" />
                {new Date(classData.updatedAt).toLocaleString()}
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end p-6 border-t border-gray-200 dark:border-gray-700">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-doan-500 transition-colors"
          >
            {t('common:actions.close')}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};

export default ViewClassModal;
