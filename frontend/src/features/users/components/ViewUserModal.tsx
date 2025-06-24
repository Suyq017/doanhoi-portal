import React from 'react';
import { createPortal } from 'react-dom';
import { X, User, Mail, Phone, Calendar, Building } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { User as ApiUser } from '../../../shared';

interface ViewUserModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: ApiUser | null;
}

const ViewUserModal: React.FC<ViewUserModalProps> = ({
  isOpen,
  onClose,
  user
}) => {
  const { t } = useTranslation(['users', 'common']);
  
  if (!isOpen || !user) return null;

  const getUserTypeText = (type: string) => {
    return type === 'student' ? t('users:types.student') : t('users:types.staff');
  };

  const getMembershipStatusText = (status: string) => {
    switch (status) {
      case 'doan_vien': return t('users:membershipStatus.doan_vien');
      case 'hoi_vien': return t('users:membershipStatus.hoi_vien');
      case 'both': return t('users:membershipStatus.both');
      case 'none': return t('users:membershipStatus.none');
      default: return status;
    }
  };

  const getMembershipStatusColor = (status: string) => {
    switch (status) {
      case 'doan_vien': return 'bg-doan-100 text-doan-800';
      case 'hoi_vien': return 'bg-hsv-100 text-hsv-800';
      case 'both': return 'bg-green-100 text-green-800';
      case 'none': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const handleOverlayClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  const modalContent = (
    <div 
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[9999] px-4"
      style={{ margin: 0, top: 0, left: 0, right: 0, bottom: 0 }}
      onClick={handleOverlayClick}
    >
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white flex items-center">
            <User className="w-5 h-5 mr-2" />
            {t('users:titles.view')}
          </h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md transition-colors"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Basic Info */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                {t('users:fields.fullName')}
              </label>
              <div className="text-lg font-semibold text-gray-900 dark:text-white">
                {`${user.familyName} ${user.givenName}`}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                {t('users:fields.code')}
              </label>
              <div className="text-lg text-gray-900 dark:text-white font-mono">
                {user.code}
              </div>
            </div>
          </div>

          {/* Contact Info */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 flex items-center">
                <Mail className="w-4 h-4 mr-1" />
                {t('common:fields.email')}
              </label>
              <div className="text-gray-900 dark:text-white">
                <a href={`mailto:${user.email}`} className="text-blue-600 hover:text-blue-800 underline">
                  {user.email}
                </a>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 flex items-center">
                <Phone className="w-4 h-4 mr-1" />
                {t('common:fields.phone')}
              </label>
              <div className="text-gray-900 dark:text-white">
                <a href={`tel:${user.phone}`} className="text-blue-600 hover:text-blue-800">
                  {user.phone}
                </a>
              </div>
            </div>
          </div>

          {/* User Type and Status */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                {t('users:fields.userType')}
              </label>
              <div className="inline-flex px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-800">
                {getUserTypeText(user.userType)}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                {t('users:fields.membershipStatus')}
              </label>
              <div className={`inline-flex px-3 py-1 rounded-full text-sm font-medium ${getMembershipStatusColor(user.membershipStatus)}`}>
                {getMembershipStatusText(user.membershipStatus)}
              </div>
            </div>
          </div>

          {/* Organizational Info */}
          {(user.managementDepartment || user.trainingDepartment || user.class) && (
            <div className="space-y-4">
              <h3 className="text-lg font-medium text-gray-900 dark:text-white flex items-center">
                <Building className="w-5 h-5 mr-2" />
                {t('users:labels.organizationalInfo')}
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {user.managementDepartment && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      {t('users:fields.managementDepartment')}
                    </label>
                    <div className="text-gray-900 dark:text-white">
                      {user.managementDepartment.name}
                    </div>
                  </div>
                )}

                {user.trainingDepartment && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      {t('users:fields.trainingDepartment')}
                    </label>
                    <div className="text-gray-900 dark:text-white">
                      {user.trainingDepartment.name}
                    </div>
                  </div>
                )}

                {user.class && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      {t('users:fields.class')}
                    </label>
                    <div className="text-gray-900 dark:text-white">
                      {user.class.name}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Timestamps */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 flex items-center">
                <Calendar className="w-4 h-4 mr-1" />
                {t('common:fields.createdAt')}
              </label>
              <div className="text-gray-900 dark:text-white">
                {new Date(user.createdAt).toLocaleString('vi-VN')}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 flex items-center">
                <Calendar className="w-4 h-4 mr-1" />
                {t('common:fields.updatedAt')}
              </label>
              <div className="text-gray-900 dark:text-white">
                {new Date(user.updatedAt).toLocaleString('vi-VN')}
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end p-6 border-t border-gray-200 dark:border-gray-700">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded-md hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
          >
            {t('common:actions.close')}
          </button>
        </div>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
};

export default ViewUserModal;
