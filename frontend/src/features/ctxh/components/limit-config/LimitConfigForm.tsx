import React, { useState, useEffect } from 'react';
import { X, Building2, Calendar } from 'lucide-react';
import { CtxhLimitConfig, CreateLimitConfigRequest, UpdateLimitConfigRequest, LimitConfigStatus } from '../../types';
import { organizationService } from '../../../../shared/services';

interface LimitConfigFormProps {
  isOpen: boolean;
  config?: CtxhLimitConfig;
  onSave: (data: CreateLimitConfigRequest | UpdateLimitConfigRequest) => Promise<void>;
  onClose: () => void;
  loading?: boolean;
}

interface FormData {
  organizationId: string;
  maxDaysPerSemester: number;
  status: LimitConfigStatus;
}

interface ValidationErrors {
  organizationId?: string;
  maxDaysPerSemester?: string;
}

const LimitConfigForm: React.FC<LimitConfigFormProps> = ({
  isOpen,
  config,
  onSave,
  onClose,
  loading = false
}) => {
  // Form state
  const [formData, setFormData] = useState<FormData>({
    organizationId: '',
    maxDaysPerSemester: 30,
    status: LimitConfigStatus.ACTIVE
  });

  const [errors, setErrors] = useState<ValidationErrors>({});
  const [submitting, setSubmitting] = useState(false);

  // Mock organizations - In real app, fetch from API
  const [organizations, setOrganizations] = useState([
    { id: '1', name: 'Đoàn Trường' },
    { id: '2', name: 'Hội Sinh viên' },
    { id: '3', name: 'CLB Khoa học' },
    { id: '4', name: 'CLB Thể thao' },
    { id: '5', name: 'CLB Văn hóa' }
  ]);

  // Load organizations
  const loadOrganizations = async () => {
    try {
      const data = await organizationService.getOrganizations();
      setOrganizations(data.map(org => ({ id: org.id, name: org.name })));
    } catch (error) {
      console.error('Failed to load organizations:', error);
      // Keep mock data as fallback
    }
  };

  // Initialize form data
  useEffect(() => {
    loadOrganizations();
    
    if (config) {
      // Editing mode - ensure all fields have valid values
      setFormData({
        organizationId: config.organizationId || '',
        maxDaysPerSemester: config.maxDaysPerSemester || 30,
        status: config.status || LimitConfigStatus.ACTIVE
      });
    } else {
      // Creating mode - reset to defaults
      setFormData({
        organizationId: '',
        maxDaysPerSemester: 30,
        status: LimitConfigStatus.ACTIVE
      });
    }
    setErrors({});
  }, [config, isOpen]);

  // Validation
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

  const validateForm = (): boolean => {
    const newErrors: ValidationErrors = {};

    // Only validate organization when creating (not editing)
    if (!config && !formData.organizationId) {
      newErrors.organizationId = 'Vui lòng chọn tổ chức';
    }

    if (!formData.maxDaysPerSemester || formData.maxDaysPerSemester < 1) {
      newErrors.maxDaysPerSemester = 'Số ngày tối đa phải lớn hơn 0';
    } else if (formData.maxDaysPerSemester > 365) {
      newErrors.maxDaysPerSemester = 'Số ngày tối đa không được vượt quá 365';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Form handlers
  const handleInputChange = (field: keyof FormData, value: string | number) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));

    // Clear error when user starts typing
    if (errors[field as keyof ValidationErrors]) {
      setErrors(prev => ({
        ...prev,
        [field]: undefined
      }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm() || submitting) return;

    setSubmitting(true);
    try {
      if (config) {
        // Update mode - only send changed fields
        const updateData: UpdateLimitConfigRequest = {
          max_days_per_semester: formData.maxDaysPerSemester,
          status: formData.status
        };
        // Updating configuration
        await onSave(updateData);
      } else {
        // Create mode - use snake_case for backend compatibility
        const createData: CreateLimitConfigRequest = {
          organization_id: formData.organizationId,
          max_days_per_semester: formData.maxDaysPerSemester
        };
        // Creating new configuration
        await onSave(createData);
      }
    } catch (error) {
      console.error('Form submission error:', error);
      // Error handling is done in parent component
    } finally {
      setSubmitting(false);
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
        <div className="relative transform overflow-hidden rounded-lg bg-white text-left shadow-xl transition-all sm:my-8 sm:w-full sm:max-w-lg max-h-[90vh] overflow-y-auto">
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b">
            <h2 className="text-lg font-medium text-gray-900">
              {config ? 'Cập nhật cấu hình' : 'Tạo cấu hình mới'}
            </h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600"
              disabled={submitting}
            >
              <X className="h-5 w-5" />
            </button>
          </div>

            {/* Form */}
            <form onSubmit={handleSubmit}>
              <div className="p-6 space-y-4">
                {/* Organization */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    <Building2 className="inline h-4 w-4 mr-1" />
                    Tổ chức <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={formData.organizationId}
                    onChange={(e) => handleInputChange('organizationId', e.target.value)}
                    disabled={!!config || submitting} // Cannot change organization when editing
                    className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                      errors.organizationId 
                        ? 'border-red-300 focus:ring-red-500' 
                        : 'border-gray-300 focus:border-blue-500'
                    } ${(!!config || submitting) ? 'bg-gray-100 cursor-not-allowed' : ''}`}
                  >
                    <option value="">Chọn tổ chức</option>
                    {organizations.map((org) => (
                      <option key={org.id} value={org.id}>
                        {org.name}
                      </option>
                    ))}
                  </select>
                  {errors.organizationId && (
                    <p className="mt-1 text-xs text-red-500">{errors.organizationId}</p>
                  )}
                  {config && (
                    <p className="mt-1 text-xs text-gray-500">
                      Không thể thay đổi tổ chức khi cập nhật
                    </p>
                  )}
                </div>

                {/* Max Days Per Semester */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    <Calendar className="inline h-4 w-4 mr-1" />
                    Số ngày tối đa mỗi kì học <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="365"
                    value={formData.maxDaysPerSemester}
                    onChange={(e) => handleInputChange('maxDaysPerSemester', parseInt(e.target.value) || 0)}
                    disabled={submitting}
                    className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                      errors.maxDaysPerSemester 
                        ? 'border-red-300 focus:ring-red-500' 
                        : 'border-gray-300 focus:border-blue-500'
                    }`}
                    placeholder="Nhập số ngày tối đa"
                  />
                  {errors.maxDaysPerSemester && (
                    <p className="mt-1 text-xs text-red-500">{errors.maxDaysPerSemester}</p>
                  )}
                  <p className="mt-1 text-xs text-gray-500">
                    Số ngày CTXH tối đa sinh viên có thể đăng ký trong một kì học
                  </p>
                </div>

                {/* Status (only for editing) */}
                {config && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Trạng thái
                    </label>
                    <select
                      value={formData.status}
                      onChange={(e) => handleInputChange('status', e.target.value as LimitConfigStatus)}
                      disabled={submitting}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    >
                      <option value={LimitConfigStatus.ACTIVE}>Hoạt động</option>
                      <option value={LimitConfigStatus.INACTIVE}>Không hoạt động</option>
                      <option value={LimitConfigStatus.DRAFT}>Nháp</option>
                    </select>
                  </div>
                )}
              </div>

              {/* Footer */}
              <div className="flex items-center justify-end space-x-3 p-6 border-t bg-gray-50">
                <button
                  type="button"
                  onClick={onClose}
                  disabled={submitting}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={submitting || loading}
                  className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
                >
                  {(submitting || loading) && (
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  )}
                  {config ? 'Cập nhật' : 'Tạo mới'}
                </button>
              </div>
            </form>
        </div>
      </div>
    </div>
  );
};

export default LimitConfigForm;