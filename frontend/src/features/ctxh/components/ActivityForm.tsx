import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { CtxhCategory, CtxhActivity, CreateActivityRequest, UpdateActivityRequest, ActivityStatus } from '../types';
import { categoryService } from '../services';
import { organizationService } from '../../../shared/services/organizationService';
import { useToast } from '../../../shared/hooks';
import { Toast } from '../../../shared/components';

interface ActivityFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: CreateActivityRequest | UpdateActivityRequest) => Promise<void>;
  activity?: CtxhActivity; // For editing
  title: string;
}

const ActivityForm: React.FC<ActivityFormProps> = ({
  isOpen,
  onClose,
  onSubmit,
  activity,
  title
}) => {
  // Prevent body scroll when modal is open  
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    categoryId: '',
    organizationId: '', // Will be set from current user's org
    status: ActivityStatus.DRAFT,
    startDate: '',
    endDate: '',
    totalDays: ''
  });
  
  const [categories, setCategories] = useState<CtxhCategory[]>([]);
  const [organizations, setOrganizations] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [categoriesLoading, setCategoriesLoading] = useState(false);
  const [organizationsLoading, setOrganizationsLoading] = useState(false);
  const [dateValidation, setDateValidation] = useState({
    startDate: { isValid: true, message: '' },
    endDate: { isValid: true, message: '' }
  });

  // Toast notifications
  const { toasts, hideToast, showError } = useToast();

  // Validate dates in real-time
  const validateDates = (startDate: string, endDate: string) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    let startDateValidation = { isValid: true, message: '' };
    let endDateValidation = { isValid: true, message: '' };
    
    if (startDate) {
      const start = new Date(startDate);
      start.setHours(0, 0, 0, 0);
      
      // Only validate start date for new activities (not editing)
      if (!activity && start < today) {
        startDateValidation = { 
          isValid: false, 
          message: 'Ngày bắt đầu phải từ hôm nay trở về sau' 
        };
      }
    }
    
    if (startDate && endDate) {
      const start = new Date(startDate);
      const end = new Date(endDate);
      
      if (end <= start) {
        endDateValidation = { 
          isValid: false, 
          message: 'Ngày kết thúc phải sau ngày bắt đầu' 
        };
      }
    }
    
    setDateValidation({
      startDate: startDateValidation,
      endDate: endDateValidation
    });
  };

  // Load categories and organizations for dropdown
  useEffect(() => {
    if (isOpen) {
      loadCategories();
      loadOrganizations();
    }
  }, [isOpen]);

  // Populate form when editing
  useEffect(() => {
    if (activity) {
      const newFormData = {
        name: activity.name || '',
        description: activity.description || '',
        categoryId: (activity as any).category_id || '', // API uses category_id
        organizationId: (activity as any).organization_id || '', // API uses organization_id
        status: activity.status || ActivityStatus.DRAFT,
        startDate: (activity as any).start_date ? new Date((activity as any).start_date).toISOString().split('T')[0] : '',
        endDate: (activity as any).end_date ? new Date((activity as any).end_date).toISOString().split('T')[0] : '',
        totalDays: (activity as any).total_days?.toString() || ''
      };
      setFormData(newFormData);
      
      // Validate dates when form is populated
      validateDates(newFormData.startDate, newFormData.endDate);
    } else {
      // Reset form for create
      const newFormData = {
        name: '',
        description: '',
        categoryId: '',
        organizationId: '', // Let user choose organization
        status: ActivityStatus.DRAFT,
        startDate: '',
        endDate: '',
        totalDays: ''
      };
      setFormData(newFormData);
      
      // Reset validation state
      setDateValidation({
        startDate: { isValid: true, message: '' },
        endDate: { isValid: true, message: '' }
      });
    }
  }, [activity, isOpen]);

  const loadCategories = async () => {
    try {
      setCategoriesLoading(true);
      const response = await categoryService.findAll({ limit: 100 });
      const categoriesData = Array.isArray(response.data) ? response.data : [];
      setCategories(categoriesData);
    } catch (error) {
      console.error('Failed to load categories:', error);
      setCategories([]);
    } finally {
      setCategoriesLoading(false);
    }
  };

  const loadOrganizations = async () => {
    try {
      setOrganizationsLoading(true);
      const response = await organizationService.getOrganizations();
      setOrganizations(response);
    } catch (error) {
      console.error('Failed to load organizations:', error);
      setOrganizations([]);
    } finally {
      setOrganizationsLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validation
    if (!formData.name.trim()) {
      showError('Tên hoạt động không được để trống!');
      return;
    }
    
    if (!formData.categoryId) {
      showError('Vui lòng chọn danh mục!');
      return;
    }
    
    if (!formData.organizationId) {
      showError('Vui lòng chọn tổ chức!');
      return;
    }

    // Date validation
    const today = new Date();
    today.setHours(0, 0, 0, 0); // Reset time to midnight for comparison
    
    if (formData.startDate) {
      const startDate = new Date(formData.startDate);
      startDate.setHours(0, 0, 0, 0);
      
      // Only check if start date is before today for NEW activities (not editing)
      if (!activity && startDate < today) {
        showError('Ngày bắt đầu phải từ hôm nay trở về sau!');
        return;
      }
    }
    
    if (formData.startDate && formData.endDate) {
      const startDate = new Date(formData.startDate);
      const endDate = new Date(formData.endDate);
      
      // Check if end date is before or equal to start date
      if (endDate <= startDate) {
        showError('Ngày kết thúc phải sau ngày bắt đầu!');
        return;
      }
    }
    
    try {
      setLoading(true);
      
      const submitData = {
        name: formData.name.trim(),
        description: formData.description?.trim() || undefined,
        category_id: formData.categoryId, // Required - Backend expects category_id
        organization_id: formData.organizationId, // Required - Backend expects organization_id
        start_date: formData.startDate || undefined, // Backend expects start_date (as date string)
        end_date: formData.endDate || undefined, // Backend expects end_date (as date string)
        total_days: formData.totalDays ? parseInt(formData.totalDays) : undefined, // Backend expects total_days
        ...(activity && { status: formData.status }) // Only include status for updates
      };

      await onSubmit(submitData as any);
      // Success toast will be shown by parent component
      onClose();
    } catch (error) {
      console.error('Failed to submit form:', error);
      // Show error toast in the form itself for immediate feedback
      showError('Có lỗi xảy ra khi lưu hoạt động!');
      // Don't close the form on error so user can try again
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (field: string, value: string) => {
    const newFormData = { ...formData, [field]: value };
    setFormData(newFormData);
    
    // Validate dates when start or end date changes
    if (field === 'startDate' || field === 'endDate') {
      validateDates(newFormData.startDate, newFormData.endDate);
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
        <div className="relative transform overflow-hidden rounded-lg bg-white text-left shadow-xl transition-all sm:my-8 sm:w-full sm:max-w-2xl max-h-[90vh] overflow-y-auto">
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b">
            <h2 className="text-xl font-semibold text-gray-900">{title}</h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <X className="h-6 w-6" />
            </button>
          </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Activity Name */}
          <div>
            <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-2">
              Tên hoạt động <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              id="name"
              required
              value={formData.name}
              onChange={(e) => handleInputChange('name', e.target.value)}
              className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="Nhập tên hoạt động..."
            />
          </div>

          {/* Description */}
          <div>
            <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-2">
              Mô tả
            </label>
            <textarea
              id="description"
              rows={3}
              value={formData.description}
              onChange={(e) => handleInputChange('description', e.target.value)}
              className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="Nhập mô tả hoạt động..."
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Category */}
            <div>
              <label htmlFor="categoryId" className="block text-sm font-medium text-gray-700 mb-2">
                Danh mục <span className="text-red-500">*</span>
              </label>
              <select
                id="categoryId"
                value={formData.categoryId}
                onChange={(e) => handleInputChange('categoryId', e.target.value)}
                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-blue-500 focus:border-blue-500"
                disabled={categoriesLoading}
              >
                <option value="">
                  {categoriesLoading ? 'Đang tải...' : 'Chọn danh mục'}
                </option>
                {categories.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Organization */}
            <div>
              <label htmlFor="organizationId" className="block text-sm font-medium text-gray-700 mb-2">
                Tổ chức <span className="text-red-500">*</span>
              </label>
              <select
                id="organizationId"
                value={formData.organizationId}
                onChange={(e) => handleInputChange('organizationId', e.target.value)}
                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-blue-500 focus:border-blue-500"
                disabled={organizationsLoading}
                required
              >
                <option value="">
                  {organizationsLoading ? 'Đang tải...' : 'Chọn tổ chức'}
                </option>
                {organizations.map((org) => (
                  <option key={org.id} value={org.id}>
                    {org.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Status - only show when editing */}
            {activity && (
              <div>
                <label htmlFor="status" className="block text-sm font-medium text-gray-700 mb-2">
                  Trạng thái <span className="text-red-500">*</span>
                </label>
                <select
                  id="status"
                  required
                  value={formData.status}
                  onChange={(e) => handleInputChange('status', e.target.value as ActivityStatus)}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value={ActivityStatus.DRAFT}>Nháp</option>
                  <option value={ActivityStatus.ACTIVE}>Đang hoạt động</option>
                  <option value={ActivityStatus.COMPLETED}>Hoàn thành</option>
                  <option value={ActivityStatus.CANCELLED}>Đã hủy</option>
                </select>
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Start Date */}
            <div>
              <label htmlFor="startDate" className="block text-sm font-medium text-gray-700 mb-2">
                Ngày bắt đầu
              </label>
              <input
                type="date"
                id="startDate"
                value={formData.startDate}
                onChange={(e) => handleInputChange('startDate', e.target.value)}
                className={`w-full border rounded-md px-3 py-2 focus:ring-blue-500 focus:border-blue-500 ${
                  !dateValidation.startDate.isValid 
                    ? 'border-red-300 focus:border-red-500 focus:ring-red-500' 
                    : 'border-gray-300'
                }`}
              />
              {!dateValidation.startDate.isValid && (
                <p className="mt-1 text-sm text-red-600">
                  {dateValidation.startDate.message}
                </p>
              )}
            </div>

            {/* End Date */}
            <div>
              <label htmlFor="endDate" className="block text-sm font-medium text-gray-700 mb-2">
                Ngày kết thúc
              </label>
              <input
                type="date"
                id="endDate"
                value={formData.endDate}
                onChange={(e) => handleInputChange('endDate', e.target.value)}
                className={`w-full border rounded-md px-3 py-2 focus:ring-blue-500 focus:border-blue-500 ${
                  !dateValidation.endDate.isValid 
                    ? 'border-red-300 focus:border-red-500 focus:ring-red-500' 
                    : 'border-gray-300'
                }`}
              />
              {!dateValidation.endDate.isValid && (
                <p className="mt-1 text-sm text-red-600">
                  {dateValidation.endDate.message}
                </p>
              )}
            </div>
          </div>

          {/* Total Days */}
          <div>
            <label htmlFor="totalDays" className="block text-sm font-medium text-gray-700 mb-2">
              Tổng số ngày
            </label>
            <input
              type="number"
              id="totalDays"
              min="1"
              value={formData.totalDays}
              onChange={(e) => handleInputChange('totalDays', e.target.value)}
              className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="Nhập tổng số ngày..."
            />
          </div>

          {/* Actions */}
          <div className="flex justify-end space-x-3 pt-6 border-t">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              Hủy
            </button>
            <button
              type="submit"
              disabled={loading || !dateValidation.startDate.isValid || !dateValidation.endDate.isValid}
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Đang lưu...' : activity ? 'Cập nhật' : 'Tạo mới'}
            </button>
          </div>
        </form>
        </div>
      </div>
      
      {/* Toast Notifications */}
      <div className="fixed top-4 right-4 z-[60] space-y-4">
        {toasts.map((toast) => (
          <Toast
            key={toast.id}
            type={toast.type}
            message={toast.message}
            duration={toast.duration}
            onClose={() => hideToast(toast.id)}
          />
        ))}
      </div>
    </div>
  );
};

export default ActivityForm;