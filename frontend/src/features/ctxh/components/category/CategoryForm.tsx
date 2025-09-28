import React, { useState, useEffect } from 'react';
import { X, AlertCircle } from 'lucide-react';
import { CtxhCategory, CreateCategoryRequest, UpdateCategoryRequest } from '../../types';
import { validateRequired } from '../../utils';

interface CategoryFormProps {
  isOpen: boolean;
  category?: CtxhCategory; // For edit mode
  onSave: (data: CreateCategoryRequest | UpdateCategoryRequest) => Promise<void>;
  onClose: () => void;
  loading?: boolean;
}

interface FormData {
  name: string;
  description: string;
}

interface FormErrors {
  name?: string;
  general?: string;
}

const CategoryForm: React.FC<CategoryFormProps> = ({
  isOpen,
  category,
  onSave,
  onClose,
  loading = false
}) => {
  const [formData, setFormData] = useState<FormData>({
    name: '',
    description: ''
  });
  const [errors, setErrors] = useState<FormErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const isEditMode = !!category;

  // Prevent body scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }

    // Cleanup on unmount
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  // Initialize form data
  useEffect(() => {
    if (category) {
      setFormData({
        name: category.name,
        description: category.description || ''
      });
    } else {
      setFormData({
        name: '',
        description: ''
      });
    }
    setErrors({});
  }, [category, isOpen]);

  // Validate form
  const validateForm = (): boolean => {
    const newErrors: FormErrors = {};
    
    const nameError = validateRequired(formData.name, 'Tên danh mục');
    if (nameError) newErrors.name = nameError;

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) return;

    setIsSubmitting(true);
    setErrors({});

    try {
      if (isEditMode) {
        const updateData: UpdateCategoryRequest = {
          name: formData.name,
          description: formData.description || undefined
        };
        await onSave(updateData);
      } else {
        const createData: CreateCategoryRequest = {
          name: formData.name,
          description: formData.description || undefined
        };
        await onSave(createData);
      }
    } catch (error: any) {
      setErrors({
        general: error.message || 'Đã xảy ra lỗi khi lưu danh mục'
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle input changes
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    
    // Clear error for this field when user starts typing
    if (errors[name as keyof FormErrors]) {
      setErrors(prev => ({ ...prev, [name]: undefined }));
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex min-h-full items-end justify-center p-4 text-center sm:items-center sm:p-0">
        {/* Backdrop */}
        <div 
          className="fixed inset-0 bg-black bg-opacity-50"
          onClick={onClose}
          aria-hidden="true"
        />

        {/* Modal panel */}
        <div className="relative transform overflow-hidden rounded-lg bg-white text-left shadow-xl transition-all sm:my-8 sm:w-full sm:max-w-lg dark:bg-gray-800">
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
            <h3 className="text-lg font-medium text-gray-900 dark:text-white">
              {isEditMode ? 'Chỉnh sửa danh mục' : 'Thêm danh mục mới'}
            </h3>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
              disabled={isSubmitting}
            >
              <X className="w-5 h-5" />
            </button>
          </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="p-6">
              {/* General Error */}
              {errors.general && (
                <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md">
                  <div className="flex items-center">
                    <AlertCircle className="w-4 h-4 text-red-500 mr-2" />
                    <span className="text-sm text-red-700">{errors.general}</span>
                  </div>
                </div>
              )}

              {/* Category Name */}
              <div className="mb-4">
                <label htmlFor="name" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Tên danh mục <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  id="name"
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  className={`block w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 sm:text-sm ${
                    errors.name
                      ? 'border-red-300 focus:ring-red-500 focus:border-red-500'
                      : 'border-gray-300 dark:border-gray-600'
                  } dark:bg-gray-700 dark:text-white`}
                  placeholder="Nhập tên danh mục"
                  disabled={isSubmitting}
                />
                {errors.name && (
                  <p className="mt-1 text-sm text-red-600">{errors.name}</p>
                )}
              </div>

              {/* Description */}
              <div className="mb-4">
                <label htmlFor="description" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Mô tả
                </label>
                <textarea
                  id="description"
                  name="description"
                  rows={3}
                  value={formData.description}
                  onChange={handleInputChange}
                  className="block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 sm:text-sm dark:bg-gray-700 dark:text-white"
                  placeholder="Nhập mô tả danh mục (tùy chọn)"
                  disabled={isSubmitting}
                />
              </div>

              {/* Note about category scope */}
              <div className="mb-6 p-3 bg-blue-50 border-l-4 border-blue-400 rounded">
                <div className="flex items-start">
                  <div className="ml-0">
                    <p className="text-sm text-blue-700">
                      <strong>Lưu ý:</strong> Danh mục CTXH sẽ được áp dụng cho toàn trường và có thể được sử dụng bởi tất cả các tổ chức.
                    </p>
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center justify-end space-x-3">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 dark:bg-gray-700 dark:text-gray-300 dark:border-gray-600 dark:hover:bg-gray-600"
                  disabled={isSubmitting}
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                  disabled={isSubmitting || loading}
                >
                  {isSubmitting ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2 inline-block"></div>
                      {isEditMode ? 'Đang cập nhật...' : 'Đang tạo...'}
                    </>
                  ) : (
                    isEditMode ? 'Cập nhật' : 'Tạo mới'
                  )}
                </button>
              </div>
            </form>
        </div>
      </div>
    </div>
  );
};

export default CategoryForm;