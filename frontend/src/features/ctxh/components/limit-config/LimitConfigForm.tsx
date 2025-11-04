import React, { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { X, Building2, Calendar, ChevronDown } from 'lucide-react';
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
  maxDays: number;
  status: LimitConfigStatus;
}

interface ValidationErrors {
  organizationId?: string;
  maxDays?: string;
}

const LimitConfigForm: React.FC<LimitConfigFormProps> = ({
  isOpen,
  config,
  onSave,
  onClose,
  loading = false
}) => {
  const { t } = useTranslation('ctxh');

  // Translate error messages from server
  // const translateError = (error: any): string => {
  //   const message = error?.message || error?.toString() || '';

  //   // Common server error patterns
  //   if (message.includes('tồn tại cấu hình') || message.includes('already exists')) {
  //     return t('limitConfig.errors.alreadyExists');
  //   }
  //   if (message.includes('không tìm thấy') || message.includes('not found')) {
  //     return t('limitConfig.errors.notFound');
  //   }
  //   if (message.includes('không có quyền') || message.includes('permission')) {
  //     return t('limitConfig.errors.noPermission');
  //   }

  //   // Return original message if no translation found
  //   return message || t('limitConfig.errors.unknown');
  // };
  // Form state
  const [formData, setFormData] = useState<FormData>({
    organizationId: '',
    maxDays: 15,
    status: LimitConfigStatus.ACTIVE
  });

  const [errors, setErrors] = useState<ValidationErrors>({});
  const [submitting, setSubmitting] = useState(false);

  // Organization search states
  const [organizationSearch, setOrganizationSearch] = useState('');
  const [organizationDropdownOpen, setOrganizationDropdownOpen] = useState(false);
  const [loadingOrganizations, setLoadingOrganizations] = useState(false);
  const debouncedOrganizationSearchRef = useRef<NodeJS.Timeout>();

  // Organizations list (server-side search)
  const [organizations, setOrganizations] = useState<Array<{ id: string; name: string }>>([]);

  // Filter organizations based on search with server-side call
  const loadOrganizations = async (search: string = '') => {
    try {
      setLoadingOrganizations(true);
      // Call API with search and only level 1 & 2
      const response = await organizationService.searchCtxhActivityViewableOrganizations({ 
        search, 
        limit: 20 
      });
      setOrganizations(response.data.map((org: any) => ({ id: org.id, name: org.name })));
    } catch (error) {
      console.error('Failed to load organizations:', error);
      setOrganizations([]);
    } finally {
      setLoadingOrganizations(false);
    }
  };

  // Get selected organization name
  const getSelectedOrganizationName = () => {
    const organization = organizations.find(o => o.id === formData.organizationId);
    return organization ? organization.name : '';
  };

  // Debounced organization search
  useEffect(() => {
    // Clear previous timeout
    if (debouncedOrganizationSearchRef.current) {
      clearTimeout(debouncedOrganizationSearchRef.current);
    }

    // Set new timeout for search
    if (organizationDropdownOpen) {
      debouncedOrganizationSearchRef.current = setTimeout(() => {
        loadOrganizations(organizationSearch);
      }, 300);
    }

    // Cleanup
    return () => {
      if (debouncedOrganizationSearchRef.current) {
        clearTimeout(debouncedOrganizationSearchRef.current);
      }
    };
  }, [organizationSearch, organizationDropdownOpen]);

  // Initialize form data
  useEffect(() => {
    // Load organizations only if editing and we need to show the selected org
    if (config && config.organizationId && organizations.length === 0) {
      loadOrganizations();
    }

    if (config) {
      // Editing mode - ensure all fields have valid values
      setFormData({
        organizationId: config.organizationId || '',
        maxDays: config.maxDays || 15,
        status: config.status || LimitConfigStatus.ACTIVE
      });
    } else {
      // Creating mode - reset to defaults
      setFormData({
        organizationId: '',
        maxDays: 15,
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

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (organizationDropdownOpen && !target.closest('.organization-dropdown-container')) {
        setOrganizationDropdownOpen(false);
        setOrganizationSearch('');
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [organizationDropdownOpen]);

  const validateForm = (): boolean => {
    const newErrors: ValidationErrors = {};

    // Only validate organization when creating (not editing)
    if (!config && !formData.organizationId) {
      newErrors.organizationId = t('validation.required', { field: t('limitConfig.organization') });
    }

    if (!formData.maxDays || formData.maxDays < 0.1) {
      newErrors.maxDays = t('limitConfig.validation.minDays');
    } else if (formData.maxDays > 365) {
      newErrors.maxDays = t('limitConfig.validation.maxDays');
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Handle input changes with real-time validation
  const handleInputChange = (field: keyof FormData, value: string | number) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));

    // Real-time validation for maxDays
    if (field === 'maxDays' && typeof value === 'number') {
      const newErrors = { ...errors };
      if (value < 0.1 && value > 0) {
        newErrors.maxDays = t('limitConfig.validation.minDays');
      } else if (value > 365) {
        newErrors.maxDays = t('limitConfig.validation.maxDays');
      } else if (value === 0 || !value) {
        newErrors.maxDays = t('limitConfig.validation.minDays');
      } else {
        delete newErrors.maxDays;
      }
      setErrors(newErrors);
    } else {
      // Clear error when user starts typing for other fields
      if (errors[field as keyof ValidationErrors]) {
        setErrors(prev => ({
          ...prev,
          [field]: undefined
        }));
      }
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
          max_days: formData.maxDays,
          status: formData.status
        };
        // Updating configuration
        await onSave(updateData);
      } else {
        // Create mode - use snake_case for backend compatibility
        const createData: CreateLimitConfigRequest = {
          organization_id: formData.organizationId,
          max_days: formData.maxDays,
          status: LimitConfigStatus.ACTIVE
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
              {config ? t('limitConfig.edit') : t('limitConfig.create')}
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
          <form onSubmit={handleSubmit} noValidate>
            {/* Hierarchical Inheritance Warning */}
            <div className="mx-6 mt-6 mb-4 p-4 bg-blue-50 border border-blue-200 rounded-md">
              <div className="flex items-start">
                <div className="flex-shrink-0">
                  <svg className="h-5 w-5 text-blue-400" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-blue-800">
                    {config ? t('limitConfig.hierarchicalEditTitle') : t('limitConfig.hierarchicalCreationTitle')}
                  </h3>
                  <div className="mt-2 text-sm text-blue-700">
                    <p>{config ? t('limitConfig.hierarchicalEditDescription') : t('limitConfig.hierarchicalCreationDescription')}</p>
                    <ul className="mt-2 list-disc list-inside">
                      <li>{config ? t('limitConfig.hierarchicalEditNote1') : t('limitConfig.hierarchicalCreationNote1')}</li>
                      <li>{config ? t('limitConfig.hierarchicalEditNote2') : t('limitConfig.hierarchicalCreationNote2')}</li>
                      <li>{config ? t('limitConfig.hierarchicalEditNote3') : t('limitConfig.hierarchicalCreationNote3')}</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>

            <div className="p-6 space-y-4">
              {/* Organization */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  <Building2 className="inline h-4 w-4 mr-1" />
                  {t('limitConfig.organization')} <span className="text-red-500">*</span>
                </label>
                
                {config ? (
                  // Edit mode - show selected organization as disabled input
                  <div>
                    <input
                      type="text"
                      value={config.organization?.name || t('limitConfig.unknownOrganization')}
                      disabled
                      className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-100 cursor-not-allowed"
                    />
                    <p className="mt-1 text-xs text-gray-500">
                      {t('limitConfig.cannotChangeOrganization')}
                    </p>
                  </div>
                ) : (
                  // Create mode - show searchable combobox
                  <div className="relative organization-dropdown-container">
                    <div className="relative">
                      <input
                        type="text"
                        value={organizationDropdownOpen ? organizationSearch : getSelectedOrganizationName()}
                        onChange={(e) => {
                          setOrganizationSearch(e.target.value);
                          if (!organizationDropdownOpen) {
                            setOrganizationDropdownOpen(true);
                          }
                        }}
                        onFocus={() => {
                          setOrganizationDropdownOpen(true);
                        }}
                        placeholder={t('limitConfig.selectOrganization')}
                        className={`w-full px-3 py-2 pr-10 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                          errors.organizationId
                            ? 'border-red-300 focus:ring-red-500'
                            : 'border-gray-300 focus:border-blue-500'
                        }`}
                      />
                      <ChevronDown 
                        className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" 
                      />
                    </div>

                    {organizationDropdownOpen && (
                      <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-auto">
                        {loadingOrganizations ? (
                          <div className="px-3 py-2 text-sm text-gray-500 flex items-center">
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-500 mr-2"></div>
                            Đang tải...
                          </div>
                        ) : organizations.length > 0 ? (
                          organizations.map((org: { id: string; name: string }) => (
                            <div
                              key={org.id}
                              onClick={() => {
                                handleInputChange('organizationId', org.id);
                                setOrganizationDropdownOpen(false);
                                setOrganizationSearch('');
                              }}
                              className="px-3 py-2 hover:bg-gray-100 cursor-pointer text-sm"
                            >
                              {org.name}
                            </div>
                          ))
                        ) : (
                          <div className="px-3 py-2 text-sm text-gray-500">
                            {organizationSearch ? 'Không tìm thấy tổ chức' : 'Nhập tên để tìm kiếm'}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}
                
                {errors.organizationId && (
                  <p className="mt-1 text-xs text-red-500">{errors.organizationId}</p>
                )}
              </div>

              {/* Max Days Per Semester */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  <Calendar className="inline h-4 w-4 mr-1" />
                  {t('limitConfig.maxDays')} <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  step="0.1"
                  min="0.1"
                  value={formData.maxDays}
                  onChange={(e) => handleInputChange('maxDays', parseFloat(e.target.value) || 0)}
                  disabled={submitting}
                  className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${errors.maxDays
                      ? 'border-red-300 focus:ring-red-500'
                      : 'border-gray-300 focus:border-blue-500'
                    }`}
                  placeholder={t('limitConfig.maxDaysPlaceholder')}
                />
                {errors.maxDays && (
                  <p className="mt-1 text-xs text-red-500">{errors.maxDays}</p>
                )}
                <p className="mt-1 text-xs text-gray-500">
                  {t('limitConfig.maxDaysHelp')}
                </p>
              </div>

              {/* Status (only for editing) */}
              {config && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {t('limitConfig.status')}
                  </label>
                  <select
                    value={formData.status}
                    onChange={(e) => handleInputChange('status', e.target.value as LimitConfigStatus)}
                    disabled={submitting}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value={LimitConfigStatus.ACTIVE}>{t('limitConfig.statusOptions.ACTIVE')}</option>
                    <option value={LimitConfigStatus.INACTIVE}>{t('limitConfig.statusOptions.INACTIVE')}</option>
                    <option value={LimitConfigStatus.DRAFT}>{t('limitConfig.statusOptions.DRAFT')}</option>
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
                {t('limitConfig.cancel')}
              </button>
              <button
                type="submit"
                disabled={submitting || loading}
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
              >
                {(submitting || loading) && (
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                )}
                {config ? t('limitConfig.edit') : t('limitConfig.create')}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default LimitConfigForm;