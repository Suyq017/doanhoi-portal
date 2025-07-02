import React, { useState } from 'react';
import { X, Plus } from 'lucide-react';
import { useTranslation } from 'react-i18next';

interface CreateOrganizationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (organizationData: CreateOrganizationData) => Promise<void>;
  loading?: boolean;
  parentId?: string;
  level?: number;
}

export interface CreateOrganizationData {
  name: string;
  code: string;
  type: string;
  description?: string;
  parentId?: string;
}

const CreateOrganizationModal: React.FC<CreateOrganizationModalProps> = ({
  isOpen,
  onClose,
  onSave,
  loading = false,
  parentId,
  level = 1
}) => {
  const { t } = useTranslation(['organizations', 'common']);
  
  const [formData, setFormData] = useState<CreateOrganizationData>({
    name: '',
    code: '',
    type: '',
    description: '',
    parentId
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  if (!isOpen) return null;

  const handleInputChange = (field: keyof CreateOrganizationData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.name.trim()) {
      newErrors.name = t('common:validation.required', { field: t('organizations:fields.name') });
    }

    if (!formData.code.trim()) {
      newErrors.code = t('common:validation.required', { field: t('organizations:fields.code') });
    }

    if (!formData.type) {
      newErrors.type = t('common:validation.required', { field: t('organizations:fields.type') });
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) return;

    try {
      await onSave(formData);
      handleClose();
    } catch (error) {
      console.error('Error creating organization:', error);
    }
  };

  const handleClose = () => {
    setFormData({
      name: '',
      code: '',
      type: '',
      description: '',
      parentId
    });
    setErrors({});
    onClose();
  };

  const getOrganizationTypeOptions = () => {
    switch (level) {
      case 1:
        return [
          { value: 'doan_truong', label: t('organizations:types.doan_truong') },
          { value: 'hoi_sinh_vien_truong', label: t('organizations:types.hoi_sinh_vien_truong') }
        ];
      case 2:
        return [
          { value: 'doan_co_so', label: t('organizations:types.doan_co_so') },
          { value: 'lien_chi_hoi', label: t('organizations:types.lien_chi_hoi') },
          { value: 'clb_truong', label: t('organizations:types.clb_truong') }
        ];
      case 3:
        return [
          { value: 'chi_doan', label: t('organizations:types.chi_doan') },
          { value: 'chi_hoi', label: t('organizations:types.chi_hoi') }
        ];
      default:
        return [];
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-md mx-4">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
            {t('organizations:titles.create')}
          </h2>
          <button
            onClick={handleClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Organization Name */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              {t('organizations:fields.name')} *
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => handleInputChange('name', e.target.value)}
              className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-doan-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white ${
                errors.name ? 'border-red-500' : 'border-gray-300'
              }`}
              placeholder={t('organizations:fields.name')}
            />
            {errors.name && (
              <p className="text-red-500 text-sm mt-1">{errors.name}</p>
            )}
          </div>

          {/* Organization Code */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              {t('organizations:fields.code')} *
            </label>
            <input
              type="text"
              value={formData.code}
              onChange={(e) => handleInputChange('code', e.target.value)}
              className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-doan-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white ${
                errors.code ? 'border-red-500' : 'border-gray-300'
              }`}
              placeholder={t('organizations:fields.code')}
            />
            {errors.code && (
              <p className="text-red-500 text-sm mt-1">{errors.code}</p>
            )}
          </div>

          {/* Organization Type */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              {t('organizations:fields.type')} *
            </label>
            <select
              value={formData.type}
              onChange={(e) => handleInputChange('type', e.target.value)}
              className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-doan-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white ${
                errors.type ? 'border-red-500' : 'border-gray-300'
              }`}
            >
              <option value="">{t('organizations:placeholders.selectType')}</option>
              {getOrganizationTypeOptions().map(option => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            {errors.type && (
              <p className="text-red-500 text-sm mt-1">{errors.type}</p>
            )}
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              {t('organizations:fields.description')}
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => handleInputChange('description', e.target.value)}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-doan-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
              placeholder={t('organizations:fields.description')}
            />
          </div>

          {/* Actions */}
          <div className="flex justify-end space-x-3 pt-4">
            <button
              type="button"
              onClick={handleClose}
              className="px-4 py-2 text-gray-700 bg-gray-200 rounded-md hover:bg-gray-300 dark:bg-gray-600 dark:text-gray-300 dark:hover:bg-gray-500"
            >
              {t('common:actions.cancel')}
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 bg-doan-600 text-white rounded-md hover:bg-doan-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
            >
              {loading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  {t('common:states.saving')}
                </>
              ) : (
                <>
                  <Plus className="w-4 h-4 mr-2" />
                  {t('common:actions.create')}
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CreateOrganizationModal;
