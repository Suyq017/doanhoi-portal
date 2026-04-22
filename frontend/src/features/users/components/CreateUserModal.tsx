import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { CreateUserRequest } from '../../../shared';
import { useOrganizationList } from '../../../shared/hooks/queries';
import OrganizationCombobox from './OrganizationCombobox';

interface CreateUserModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (userData: CreateUserRequest) => Promise<void>;
  loading?: boolean;
}

const CreateUserModal: React.FC<CreateUserModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  loading = false,
}) => {
  const { t } = useTranslation(['users', 'common']);

  const [formData, setFormData] = useState<CreateUserRequest>({
    code: '',
    familyName: '',
    givenName: '',
    email: '',
    phone: '',
    password: '',
    userType: 'student',
    membershipStatus: 'none',
    organizationId: '', // Add organization selection
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const { data: organizations = [], isLoading: loadingOrganizations } = useOrganizationList();

  // Load organizations when modal opens
  useEffect(() => {
    if (isOpen) {
      // Organizations loaded automatically by React Query
    } else {
      // Reset form when modal closes
      resetForm();
    }
  }, [isOpen]);

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));

    // Clear error when user starts typing
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };
  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.code.trim()) {
      newErrors.code = t('common:validation.required', { field: t('users:fields.code') });
    }

    if (!formData.familyName.trim()) {
      newErrors.familyName = t('common:validation.required', { field: t('users:fields.familyName') });
    }

    if (!formData.givenName.trim()) {
      newErrors.givenName = t('common:validation.required', { field: t('users:fields.givenName') });
    }

    if (!formData.email.trim()) {
      newErrors.email = t('common:validation.required', { field: t('common:fields.email') });
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = t('common:validation.email');
    }

    if (!formData.phone.trim()) {
      newErrors.phone = t('common:validation.required', { field: t('common:fields.phone') });
    } else if (!/^[0-9]{10,11}$/.test(formData.phone.replace(/\s/g, ''))) {
      newErrors.phone = t('common:validation.phone');
    }    // Validate organization (optional, but if selected must be valid)
    if (formData.organizationId && formData.organizationId.trim()) {
      const selectedOrg = organizations.find(org => org.id === formData.organizationId);
      if (!selectedOrg) {
        newErrors.organizationId = t('users:validation.invalidOrganization');
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }; const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    try {
      // Prepare the final data
      const finalData = { ...formData };

      // Remove empty password
      if (!finalData.password || finalData.password.trim() === '') {
        delete finalData.password;
      }      // Handle organization ID (can be empty)
      if (!finalData.organizationId || finalData.organizationId.trim() === '') {
        delete finalData.organizationId;
      }

      await onSubmit(finalData);

      // Reset form on success
      resetForm();
    } catch (error) {
      console.error('Error creating user:', error);
    }
  }; const resetForm = () => {
    setFormData({
      code: '',
      familyName: '',
      givenName: '',
      email: '',
      phone: '',
      password: '',
      userType: 'student',
      membershipStatus: 'none',
      organizationId: '',
    });

    setErrors({});
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  if (!isOpen) return null;

  const handleOverlayClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) {
      handleClose();
    }
  };

  const modalContent = (
    <div
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[9999] px-4"
      style={{ margin: 0, top: 0, left: 0, right: 0, bottom: 0 }}
      onClick={handleOverlayClick}
    >      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-visible flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700 flex-shrink-0">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
            {t('users:titles.create')}
          </h2>
          <button
            onClick={handleClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
            disabled={loading}
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Form Content - Scrollable */}
        <div className="flex-1 overflow-y-auto">
          <form onSubmit={handleSubmit} className="p-6 space-y-4">
            {/* User Code */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                {t('users:fields.code')} *
              </label>
              <input
                type="text"
                name="code"
                value={formData.code}
                onChange={handleInputChange}
                className={`w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-doan-500 focus:border-transparent dark:bg-gray-700 dark:text-white ${errors.code
                  ? 'border-red-500 dark:border-red-500'
                  : 'border-gray-300 dark:border-gray-600'
                  }`}
                placeholder={t('users:placeholders.code')}
                disabled={loading}
              />
              {errors.code && (
                <p className="mt-1 text-sm text-red-600 dark:text-red-400">
                  {errors.code}
                </p>
              )}
            </div>

            {/* Name Fields */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  {t('users:fields.familyName')} *
                </label>
                <input
                  type="text"
                  name="familyName"
                  value={formData.familyName}
                  onChange={handleInputChange}
                  className={`w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-doan-500 focus:border-transparent dark:bg-gray-700 dark:text-white ${errors.familyName
                    ? 'border-red-500 dark:border-red-500'
                    : 'border-gray-300 dark:border-gray-600'
                    }`}
                  placeholder={t('users:placeholders.familyName')}
                  disabled={loading}
                />
                {errors.familyName && (
                  <p className="mt-1 text-sm text-red-600 dark:text-red-400">
                    {errors.familyName}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  {t('users:fields.givenName')} *
                </label>
                <input
                  type="text"
                  name="givenName"
                  value={formData.givenName}
                  onChange={handleInputChange}
                  className={`w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-doan-500 focus:border-transparent dark:bg-gray-700 dark:text-white ${errors.givenName
                    ? 'border-red-500 dark:border-red-500'
                    : 'border-gray-300 dark:border-gray-600'
                    }`}
                  placeholder={t('users:placeholders.givenName')}
                  disabled={loading}
                />
                {errors.givenName && (
                  <p className="mt-1 text-sm text-red-600 dark:text-red-400">
                    {errors.givenName}
                  </p>
                )}
              </div>
            </div>

            {/* Email */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                {t('common:fields.email')} *
              </label>
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleInputChange}
                className={`w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-doan-500 focus:border-transparent dark:bg-gray-700 dark:text-white ${errors.email
                  ? 'border-red-500 dark:border-red-500'
                  : 'border-gray-300 dark:border-gray-600'
                  }`}
                placeholder={t('users:placeholders.email')}
                disabled={loading}
              />
              {errors.email && (
                <p className="mt-1 text-sm text-red-600 dark:text-red-400">
                  {errors.email}
                </p>
              )}
            </div>

            {/* Phone Number */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                {t('common:fields.phone')} *
              </label>
              <input
                type="tel"
                name="phone"
                value={formData.phone}
                onChange={handleInputChange}
                className={`w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-doan-500 focus:border-transparent dark:bg-gray-700 dark:text-white ${errors.phone
                  ? 'border-red-500 dark:border-red-500'
                  : 'border-gray-300 dark:border-gray-600'
                  }`}
                placeholder={t('users:placeholders.phone')}
                disabled={loading}
              />
              {errors.phone && (
                <p className="mt-1 text-sm text-red-600 dark:text-red-400">
                  {errors.phone}
                </p>
              )}
            </div>

            {/* Password */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                {t('users:labels.passwordOptional')}
              </label>
              <input
                type="password"
                name="password"
                value={formData.password}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-doan-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                placeholder={t('users:placeholders.password')}
                disabled={loading}
              />
            </div>          {/* User Type and Status */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  {t('users:fields.userType')}
                </label>
                <select
                  name="userType"
                  value={formData.userType}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-doan-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                  disabled={loading}
                >
                  <option value="student">{t('users:types.student')}</option>
                  <option value="staff">{t('users:types.staff')}</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  {t('users:fields.membershipStatus')}
                </label>
                <select
                  name="membershipStatus"
                  value={formData.membershipStatus}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-doan-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                  disabled={loading}
                >
                  <option value="none">{t('users:membershipStatus.none')}</option>
                  <option value="doan_vien">{t('users:membershipStatus.doan_vien')}</option>
                  <option value="hoi_vien">{t('users:membershipStatus.hoi_vien')}</option>
                  <option value="both">{t('users:membershipStatus.both')}</option>
                </select>
              </div>
            </div>          {/* Organization Selection */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                {t('users:fields.organization')}
                <span className="text-sm text-gray-500 dark:text-gray-400 ml-1">
                  ({t('common:labels.optional')})
                </span>
              </label>            <OrganizationCombobox
                organizations={organizations}
                selectedId={formData.organizationId || ''}
                onSelect={(organizationId) => {
                  setFormData(prev => ({ ...prev, organizationId }));
                  // Clear error when selection changes
                  if (errors.organizationId) {
                    setErrors(prev => ({ ...prev, organizationId: '' }));
                  }
                }}
                loading={loadingOrganizations}
                disabled={loading}
                error={errors.organizationId}
                placeholder={t('users:placeholders.selectOrganization')}
              />
              {errors.organizationId && (
                <p className="mt-1 text-sm text-red-600 dark:text-red-400">
                  {errors.organizationId}
                </p>
              )}            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                {t('users:help.organizationHelp')}
              </p>
            </div>          {/* Buttons */}
            <div className="flex items-center justify-end space-x-3 pt-4">
              <button
                type="button"
                onClick={handleClose}
                className="px-4 py-2 text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                disabled={loading}
              >
                {t('common:actions.cancel')}
              </button>
              <button
                type="submit"
                disabled={loading}
                className="px-4 py-2 bg-doan-600 text-white rounded-md hover:bg-doan-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2 transition-colors"
              >
                {loading && (
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                )}
                <span>{loading ? t('common:states.creating') : t('common:actions.create')}</span>
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
};

export default CreateUserModal;
