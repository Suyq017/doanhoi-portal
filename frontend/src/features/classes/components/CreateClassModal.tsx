import React, { useState, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';
import { X } from 'lucide-react';
import {
  CreateClassRequest,
  classService,
  Combobox
} from '../../../shared';
import { useDepartmentListQuery } from '../../../shared/hooks/queries/useDepartmentQueries'; // ✅ Use TanStack Query

interface CreateClassModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

const CreateClassModal: React.FC<CreateClassModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
}) => {
  const { t } = useTranslation(['classes', 'common']);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // ✅ Use TanStack Query cache for departments
  const { data: departmentsResponse } = useDepartmentListQuery({ limit: 1000 });
  const departments = useMemo(() => departmentsResponse?.departments ?? [], [departmentsResponse]);

  const [formData, setFormData] = useState<CreateClassRequest>({
    name: '',
    year: new Date().getFullYear(),
    departmentId: '',
    isActive: true,
  });

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type } = e.target;

    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox'
        ? (e.target as HTMLInputElement).checked
        : type === 'number'
          ? (value ? Number(value) : undefined)
          : value
    }));
  };

  const handleSelectChange = (name: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!formData.name.trim()) {
      setError(t('common:validation.required', { field: t('classes:fields.name') }));
      return;
    }

    try {
      setLoading(true);

      // Prepare data for submission, removing empty strings
      const submitData: CreateClassRequest = {
        name: formData.name.trim(),
        year: formData.year,
        isActive: formData.isActive,
        ...(formData.departmentId && { departmentId: formData.departmentId })
      };

      await classService.createClass(submitData);
      onSuccess();
    } catch (err: any) {
      console.error('Error creating class:', err);
      setError(err.message || t('common:messages.error.create'));
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setFormData({
      name: '',
      year: new Date().getFullYear(),
      departmentId: '',
      isActive: true,
    });
    setError(null);
    onClose();
  };

  if (!isOpen) return null;

  return createPortal(
    <div
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
    >
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-md max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
            {t('classes:titles.create')}
          </h2>
          <button
            onClick={handleClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
            disabled={loading}
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6">
          {/* Error Message */}
          {error && (
            <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded-md">
              {error}
            </div>
          )}

          <div className="space-y-4">
            {/* Name */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                {t('classes:fields.name')} *
              </label>
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-doan-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                placeholder={t('classes:placeholders.name')}
                required
                disabled={loading}
              />
            </div>

            {/* Year */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                {t('classes:fields.year')}
              </label>
              <input
                type="number"
                name="year"
                value={formData.year || ''}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-doan-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                placeholder={t('classes:placeholders.year')}
                min="2000"
                max="2100"
                disabled={loading}
              />
            </div>

            {/* Department */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                {t('classes:fields.department')}
              </label>
              <Combobox
                options={departments.map(dept => ({
                  id: dept.id,
                  label: dept.name
                }))}
                value={formData.departmentId}
                onSelect={(value) => handleSelectChange('departmentId', value)}
                onClear={() => handleSelectChange('departmentId', '')}
                placeholder={`-- ${t('common:actions.select')} --`}
                disabled={loading}
                dropdownPortal={true}
                className="w-full"
              />
            </div>

            {/* Status */}
            <div className="flex items-center">
              <input
                type="checkbox"
                name="isActive"
                checked={formData.isActive}
                onChange={handleInputChange}
                className="h-4 w-4 text-doan-600 focus:ring-doan-500 border-gray-300 rounded"
                disabled={loading}
              />
              <label className="ml-2 block text-sm text-gray-700 dark:text-gray-300">
                {t('common:status.active')}
              </label>
            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-end space-x-3 mt-6">
            <button
              type="button"
              onClick={handleClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-doan-500 transition-colors"
              disabled={loading}
            >
              {t('common:actions.cancel')}
            </button>
            <button
              type="submit"
              className="px-4 py-2 text-sm font-medium text-white bg-doan-600 border border-transparent rounded-md hover:bg-doan-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-doan-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              disabled={loading || !formData.name.trim()}
            >
              {loading ? t('common:states.creating') : t('common:actions.create')}
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
};

export default CreateClassModal;
