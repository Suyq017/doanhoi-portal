import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { X } from 'lucide-react';
import { CtxhCategory, CtxhActivity, CreateActivityRequest, UpdateActivityRequest, ActivityStatus } from '../types';
import { categoryService, activityService, limitConfigService } from '../services';
import { organizationService } from '../../../shared/services/organizationService';
import { useToast } from '../../../shared/hooks';

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
  const { t } = useTranslation('ctxh');
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
  const [organizationConstraints, setOrganizationConstraints] = useState<{
    canSelectMultiple: boolean;
    fixedOrganization: any | null;
  }>({
    canSelectMultiple: true,
    fixedOrganization: null
  });
  const [dateValidation, setDateValidation] = useState({
    startDate: { isValid: true, message: '' },
    endDate: { isValid: true, message: '' }
  });

  const [fieldValidation, setFieldValidation] = useState({
    name: { isValid: true, message: '' },
    categoryId: { isValid: true, message: '' },
    organizationId: { isValid: true, message: '' },
    totalDays: { isValid: true, message: '' },
    startDate: { isValid: true, message: '' },
    endDate: { isValid: true, message: '' }
  });

  // Combobox search states
  const [categorySearch, setCategorySearch] = useState('');
  const [organizationSearch, setOrganizationSearch] = useState('');
  const [categoryDropdownOpen, setCategoryDropdownOpen] = useState(false);
  const [organizationDropdownOpen, setOrganizationDropdownOpen] = useState(false);

  // Toast notifications
  const { showError } = useToast();

  // Format number to remove unnecessary decimal places
  const formatNumber = (num: number): string => {
    return num % 1 === 0 ? Math.floor(num).toString() : num.toString();
  };

  // Filter functions for combobox
  const filteredCategories = categories.filter(category =>
    category.name.toLowerCase().includes(categorySearch.toLowerCase())
  );

  const filteredOrganizations = organizations.filter(org =>
    org.name.toLowerCase().includes(organizationSearch.toLowerCase())
  );

  // Helper functions to get selected names
  const getSelectedCategoryName = () => {
    const category = categories.find(c => c.id === formData.categoryId);
    return category?.name || '';
  };

  const getSelectedOrganizationName = () => {
    const org = organizations.find(o => o.id === formData.organizationId);
    return org?.name || '';
  };

  // Validate required fields
  const validateFields = async () => {
    let isValid = true;
    const errors = [];

    // Set field validation states
    const newFieldValidation = {
      name: {
        isValid: formData.name.trim() !== '',
        message: formData.name.trim() === '' ? t('activity.validation.nameRequired') : ''
      },
      categoryId: {
        isValid: formData.categoryId !== '',
        message: formData.categoryId === '' ? t('activity.validation.categoryRequired') : ''
      },
      organizationId: {
        isValid: formData.organizationId !== '',
        message: formData.organizationId === '' ? t('activity.validation.organizationRequired') : ''
      },
      totalDays: fieldValidation.totalDays,
      startDate: fieldValidation.startDate,
      endDate: fieldValidation.endDate
    };

    // Check basic required fields
    if (!newFieldValidation.name.isValid) {
      isValid = false;
    }
    if (!newFieldValidation.categoryId.isValid) {
      isValid = false;
    }
    if (!newFieldValidation.organizationId.isValid) {
      isValid = false;
    }

    // Check if total days is required for ACTIVE status
    if (formData.status === ActivityStatus.ACTIVE) {
      if (!formData.totalDays || parseFloat(formData.totalDays) < 0.1) {
        newFieldValidation.totalDays = {
          isValid: false,
          message: t('activity.validation.totalDaysRequired')
        };
        isValid = false;
      }

      // Require start and end date when total days is specified
      if (!formData.startDate) {
        newFieldValidation.startDate = {
          isValid: false,
          message: t('activity.validation.startDateRequiredForActive')
        };
        isValid = false;
      }

      if (!formData.endDate) {
        newFieldValidation.endDate = {
          isValid: false,
          message: t('activity.validation.endDateRequiredForActive')
        };
        isValid = false;
      }
    }

    // Set all field validations
    setFieldValidation(newFieldValidation);

    // Check for duplicate name + category combination (only if name and category are valid)
    if (formData.name.trim() && formData.categoryId) {
      try {
        const response = await activityService.findAll({
          search: formData.name.trim(),
          category_id: formData.categoryId,
          limit: 100
        });

        const existingActivity = response.data.find((act: any) =>
          act.name.toLowerCase() === formData.name.trim().toLowerCase() &&
          act.category_id === formData.categoryId &&
          (!activity || act.id !== activity.id) // Exclude current activity when editing
        );

        if (existingActivity) {
          errors.push(t('activity.validation.duplicateNameCategory'));
          isValid = false;
        }
      } catch (error) {
        console.error('Error checking duplicate activity:', error);
      }
    }

    // Check organization day limit (when totalDays is specified - validate for both new and existing activities)
    if (formData.totalDays && formData.organizationId) {
      console.log('Starting day limit validation:', {
        status: formData.status,
        totalDays: formData.totalDays,
        organizationId: formData.organizationId,
        isNewActivity: !activity
      });

      try {
        const totalDays = parseFloat(formData.totalDays);
        const limitConfigs = await limitConfigService.findAll({
          organization_id: formData.organizationId,
          status: 'ACTIVE' as any,
          limit: 10
        });

        console.log('Limit configs response:', limitConfigs);

        if (limitConfigs.data && limitConfigs.data.length > 0) {
          const activeConfig = limitConfigs.data[0];
          console.log('Full activeConfig object:', activeConfig);
          console.log('Available properties:', Object.keys(activeConfig));

          const maxDays = activeConfig.maxDays;
          console.log('Day limit validation check:', {
            totalDays,
            maxDays,
            maxDaysProperty: activeConfig.maxDays,
            exceedsLimit: totalDays > maxDays,
            activeConfig
          });

          if (totalDays > maxDays) {
            console.log('Day limit exceeded - adding validation error');
            errors.push(t('limitConfig.validation.totalDaysExceedLimit', {
              totalDays: totalDays,
              maxDays: formatNumber(maxDays)
            }));

            // Also update the totalDays field validation
            newFieldValidation.totalDays = {
              isValid: false,
              message: t('limitConfig.validation.organizationLimitExceeded', {
                maxDays: formatNumber(maxDays)
              })
            };
            setFieldValidation(newFieldValidation);
            isValid = false;
          } else {
            console.log('Day limit within allowed range');
            // Clear any previous validation error for totalDays
            newFieldValidation.totalDays = {
              isValid: true,
              message: ''
            };
            setFieldValidation(newFieldValidation);
          }
        } else {
          console.log('No active limit config found for organization');
          // Clear any previous validation error for totalDays when no limit config
          newFieldValidation.totalDays = {
            isValid: true,
            message: ''
          };
          setFieldValidation(newFieldValidation);
        }
      } catch (error) {
        console.error('Error checking organization day limit:', error);
        showError(t('activity.checkDayLimitError'));
      }
    } else {
      console.log('Skipping day limit validation:', {
        hasTotalDays: !!formData.totalDays,
        hasOrganization: !!formData.organizationId,
        totalDays: formData.totalDays,
        organizationId: formData.organizationId
      });
    }

    // Return validation result with errors for external handling (only duplicate errors)
    return { isValid, errors };
  };

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
          message: t('activity.validation.startDateFuture')
        };
      }
    }

    if (startDate && endDate) {
      const start = new Date(startDate);
      const end = new Date(endDate);

      if (end <= start) {
        endDateValidation = {
          isValid: false,
          message: t('activity.validation.endDateAfterStart')
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

      // Use new endpoint for CTXH activity organizations
      const response = await organizationService.getCtxhActivityAccessibleOrganizations();

      setOrganizations(response.organizations);
      setOrganizationConstraints({
        canSelectMultiple: response.canSelectMultiple,
        fixedOrganization: response.fixedOrganization
      });

      console.log('[ActivityForm] Loaded organizations:', {
        count: response.organizations.length,
        canSelectMultiple: response.canSelectMultiple,
        fixed: response.fixedOrganization?.name || 'none'
      });
    } catch (error) {
      console.error('Failed to load organizations:', error);
      setOrganizations([]);
    } finally {
      setOrganizationsLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validate all fields
    const validationResult = await validateFields();
    const datesValid = dateValidation.startDate.isValid && dateValidation.endDate.isValid;

    // Check field validation state (including totalDays validation)
    const fieldValidationValid = Object.values(fieldValidation).every(field => field.isValid);

    console.log('Form submission validation:', {
      validationResult: validationResult.isValid,
      datesValid,
      fieldValidationValid,
      fieldValidation,
      errors: validationResult.errors
    });

    if (!validationResult.isValid || !datesValid || !fieldValidationValid) {
      // Show all validation errors in a single toast
      const allErrors = [...validationResult.errors];
      if (!dateValidation.startDate.isValid) {
        allErrors.push(dateValidation.startDate.message);
      }
      if (!dateValidation.endDate.isValid) {
        allErrors.push(dateValidation.endDate.message);
      }

      // Add field validation errors
      Object.values(fieldValidation).forEach(field => {
        if (!field.isValid) {
          allErrors.push(field.message);
        }
      });

      console.log('Form submission blocked due to validation errors:', allErrors);

      if (allErrors.length > 0) {
        showError(allErrors.join(' • '));
      }
      return;
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
        total_days: formData.totalDays ? parseFloat(formData.totalDays) : undefined, // Backend expects total_days
        ...(activity && { status: formData.status }) // Only include status for updates
      };

      console.log('Form submission data:', {
        original_totalDays: formData.totalDays,
        parsed_totalDays: formData.totalDays ? parseFloat(formData.totalDays) : undefined,
        submitData
      });

      await onSubmit(submitData as any);
      // Success toast will be shown by parent component
      onClose();
    } catch (error) {
      console.error('Failed to submit form:', error);
      // Don't show error toast here - let parent handle server errors
      // Don't close the form on error so user can try again
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (field: string, value: string) => {
    const newFormData = { ...formData, [field]: value };
    setFormData(newFormData);

    // Clear field validation errors when user makes changes
    if (field === 'name' && fieldValidation.name && !fieldValidation.name.isValid) {
      setFieldValidation(prev => ({
        ...prev,
        name: { isValid: true, message: '' }
      }));
    }

    if (field === 'categoryId' && fieldValidation.categoryId && !fieldValidation.categoryId.isValid) {
      setFieldValidation(prev => ({
        ...prev,
        categoryId: { isValid: true, message: '' }
      }));
    }

    if (field === 'organizationId' && fieldValidation.organizationId && !fieldValidation.organizationId.isValid) {
      setFieldValidation(prev => ({
        ...prev,
        organizationId: { isValid: true, message: '' }
      }));
    }

    if (field === 'totalDays' && fieldValidation.totalDays && !fieldValidation.totalDays.isValid) {
      setFieldValidation(prev => ({
        ...prev,
        totalDays: { isValid: true, message: '' }
      }));
    }

    if (field === 'startDate' && fieldValidation.startDate && !fieldValidation.startDate.isValid) {
      setFieldValidation(prev => ({
        ...prev,
        startDate: { isValid: true, message: '' }
      }));
    }

    if (field === 'endDate' && fieldValidation.endDate && !fieldValidation.endDate.isValid) {
      setFieldValidation(prev => ({
        ...prev,
        endDate: { isValid: true, message: '' }
      }));
    }

    // Show field validation when changing to ACTIVE status
    if (field === 'status' && value === ActivityStatus.ACTIVE) {
      setFieldValidation(prev => ({
        ...prev,
        totalDays: {
          isValid: !!(newFormData.totalDays && parseInt(newFormData.totalDays) >= 1),
          message: (!newFormData.totalDays || parseInt(newFormData.totalDays) < 1) ? t('activity.validation.totalDaysRequired') : ''
        },
        startDate: {
          isValid: !!newFormData.startDate,
          message: !newFormData.startDate ? t('activity.validation.startDateRequiredForActive') : ''
        },
        endDate: {
          isValid: !!newFormData.endDate,
          message: !newFormData.endDate ? t('activity.validation.endDateRequiredForActive') : ''
        }
      }));
    }

    // Clear field validation when changing away from ACTIVE status
    if (field === 'status' && value !== ActivityStatus.ACTIVE) {
      setFieldValidation(prev => ({
        ...prev,
        totalDays: { isValid: true, message: '' },
        startDate: { isValid: true, message: '' },
        endDate: { isValid: true, message: '' }
      }));
    }

    // Re-validate active fields when they change and status is ACTIVE
    if (formData.status === ActivityStatus.ACTIVE) {
      if (field === 'totalDays') {
        setFieldValidation(prev => ({
          ...prev,
          totalDays: {
            isValid: !!(value && parseInt(value) >= 1),
            message: (!value || parseInt(value) < 1) ? t('activity.validation.totalDaysRequired') : ''
          }
        }));
      }

      if (field === 'startDate') {
        setFieldValidation(prev => ({
          ...prev,
          startDate: {
            isValid: !!value,
            message: !value ? t('activity.validation.startDateRequiredForActive') : ''
          }
        }));
      }

      if (field === 'endDate') {
        setFieldValidation(prev => ({
          ...prev,
          endDate: {
            isValid: !!value,
            message: !value ? t('activity.validation.endDateRequiredForActive') : ''
          }
        }));
      }
    }

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
          <form onSubmit={handleSubmit} noValidate className="p-6 space-y-6">
            {/* Activity Name */}
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-2">
                {t('activity.name')} <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                id="name"
                value={formData.name}
                onChange={(e) => handleInputChange('name', e.target.value)}
                className={`w-full border rounded-md px-3 py-2 focus:ring-blue-500 focus:border-blue-500 ${!fieldValidation.name.isValid
                    ? 'border-red-300 focus:border-red-500 focus:ring-red-500'
                    : 'border-gray-300'
                  }`}
                placeholder={t('activity.form.namePlaceholder')}
              />
              {!fieldValidation.name.isValid && (
                <p className="mt-1 text-sm text-red-600">
                  {fieldValidation.name.message}
                </p>
              )}
            </div>

            {/* Description */}
            <div>
              <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-2">
                {t('activity.description')}
              </label>
              <textarea
                id="description"
                rows={3}
                value={formData.description}
                onChange={(e) => handleInputChange('description', e.target.value)}
                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder={t('activity.form.descriptionPlaceholder')}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Category */}
              <div className="relative">
                <label htmlFor="categoryId" className="block text-sm font-medium text-gray-700 mb-2">
                  {t('activity.category')} <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <input
                    type="text"
                    placeholder={categoriesLoading ? t('activity.form.loading') : t('activity.form.selectCategory')}
                    value={categoryDropdownOpen ? categorySearch : getSelectedCategoryName()}
                    onChange={(e) => {
                      setCategorySearch(e.target.value);
                      if (!categoryDropdownOpen) setCategoryDropdownOpen(true);
                    }}
                    onFocus={() => {
                      setCategoryDropdownOpen(true);
                      setCategorySearch('');
                    }}
                    onBlur={() => {
                      setTimeout(() => setCategoryDropdownOpen(false), 200);
                    }}
                    className={`w-full border rounded-md px-3 py-2 pr-10 focus:ring-blue-500 focus:border-blue-500 ${!fieldValidation.categoryId.isValid
                        ? 'border-red-300 focus:border-red-500 focus:ring-red-500'
                        : 'border-gray-300'
                      }`}
                    disabled={categoriesLoading}
                  />
                  <button
                    type="button"
                    onClick={() => setCategoryDropdownOpen(!categoryDropdownOpen)}
                    className="absolute inset-y-0 right-0 flex items-center px-3 text-gray-400 hover:text-gray-600"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>

                  {categoryDropdownOpen && (
                    <div className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-auto">
                      {filteredCategories.length > 0 ? (
                        filteredCategories.map((category) => (
                          <button
                            key={category.id}
                            type="button"
                            onClick={() => {
                              handleInputChange('categoryId', category.id);
                              setCategoryDropdownOpen(false);
                              setCategorySearch('');
                            }}
                            className={`w-full text-left px-3 py-2 hover:bg-gray-100 focus:bg-gray-100 focus:outline-none ${formData.categoryId === category.id ? 'bg-blue-50 text-blue-700' : 'text-gray-900'
                              }`}
                          >
                            {category.name}
                          </button>
                        ))
                      ) : (
                        <div className="px-3 py-2 text-gray-500 text-sm">
                          {categoriesLoading ? t('activity.form.loading') : t('activity.form.noResults')}
                        </div>
                      )}
                    </div>
                  )}
                </div>
                {!fieldValidation.categoryId.isValid && (
                  <p className="mt-1 text-sm text-red-600">
                    {fieldValidation.categoryId.message}
                  </p>
                )}
              </div>

              {/* Organization */}
              <div className="relative">
                <label htmlFor="organizationId" className="block text-sm font-medium text-gray-700 mb-2">
                  {t('activity.organization')} <span className="text-red-500">*</span>
                </label>

                {activity && organizations.length === 0 ? (
                  // LEVEL 3 EDIT MODE - Display current organization (disabled, read-only)
                  <div>
                    <div className="relative">
                      <input
                        type="text"
                        value={(activity as any).organization?.name || getSelectedOrganizationName() || t('activity.form.organizationNotAvailable')}
                        disabled
                        className="w-full py-2 px-3 pr-10 border border-gray-300 rounded-md 
                                 bg-gray-100 text-gray-700 cursor-not-allowed"
                      />
                      <div className="absolute inset-y-0 right-0 flex items-center px-3 text-gray-400">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                      </div>
                    </div>
                    <p className="mt-1 text-xs text-gray-500">
                      {t('activity.form.organizationLevel3Restricted')}
                    </p>
                  </div>
                ) : (
                  // NORMAL COMBOBOX - User can select
                  <div className="relative">
                    <input
                      type="text"
                      placeholder={organizationsLoading ? t('activity.form.loading') : t('activity.form.selectOrganization')}
                      value={organizationDropdownOpen ? organizationSearch : getSelectedOrganizationName()}
                      onChange={(e) => {
                        setOrganizationSearch(e.target.value);
                        if (!organizationDropdownOpen) setOrganizationDropdownOpen(true);
                      }}
                      onFocus={() => {
                        setOrganizationDropdownOpen(true);
                        setOrganizationSearch('');
                      }}
                      onBlur={() => {
                        setTimeout(() => setOrganizationDropdownOpen(false), 200);
                      }}
                      className={`w-full border rounded-md px-3 py-2 pr-10 focus:ring-blue-500 focus:border-blue-500 ${!fieldValidation.organizationId.isValid
                          ? 'border-red-300 focus:border-red-500 focus:ring-red-500'
                          : 'border-gray-300'
                        }`}
                      disabled={organizationsLoading}
                    />
                    <button
                      type="button"
                      onClick={() => setOrganizationDropdownOpen(!organizationDropdownOpen)}
                      className="absolute inset-y-0 right-0 flex items-center px-3 text-gray-400 hover:text-gray-600"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </button>

                    {organizationDropdownOpen && (
                      <div className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-auto">
                        {filteredOrganizations.length > 0 ? (
                          filteredOrganizations.map((org) => (
                            <button
                              key={org.id}
                              type="button"
                              onClick={() => {
                                handleInputChange('organizationId', org.id);
                                setOrganizationDropdownOpen(false);
                                setOrganizationSearch('');
                              }}
                              className={`w-full text-left px-3 py-2 hover:bg-gray-100 focus:bg-gray-100 focus:outline-none ${formData.organizationId === org.id ? 'bg-blue-50 text-blue-700' : 'text-gray-900'
                                }`}
                            >
                              {org.name}
                            </button>
                          ))
                        ) : (
                          <div className="px-3 py-2 text-gray-500 text-sm">
                            {organizationsLoading ? t('activity.form.loading') : t('activity.form.noResults')}
                          </div>
                        )}
                      </div>
                    )}

                    {!fieldValidation.organizationId.isValid && (
                      <p className="mt-1 text-sm text-red-600">
                        {fieldValidation.organizationId.message}
                      </p>
                    )}

                    {/* Hint for Level 2 users */}
                    {organizationConstraints.fixedOrganization && organizations.length > 1 && (
                      <p className="mt-1 text-xs text-gray-500">
                        {t('activity.form.organizationLevel2Hint', { 
                          org: organizationConstraints.fixedOrganization.name 
                        })}
                      </p>
                    )}
                  </div>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Status - only show when editing */}
              {activity && (
                <div>
                  <label htmlFor="status" className="block text-sm font-medium text-gray-700 mb-2">
                    {t('activity.status')} <span className="text-red-500">*</span>
                  </label>
                  <select
                    id="status"
                    value={formData.status}
                    onChange={(e) => handleInputChange('status', e.target.value as ActivityStatus)}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value={ActivityStatus.DRAFT}>{t('activity.statusOptions.DRAFT')}</option>
                    <option value={ActivityStatus.ACTIVE}>{t('activity.statusOptions.ACTIVE')}</option>
                    <option value={ActivityStatus.COMPLETED}>{t('activity.statusOptions.COMPLETED')}</option>
                    <option value={ActivityStatus.CANCELLED}>{t('activity.statusOptions.CANCELLED')}</option>
                  </select>
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Start Date */}
              <div>
                <label htmlFor="startDate" className="block text-sm font-medium text-gray-700 mb-2">
                  {t('activity.startDate')}
                </label>
                <input
                  type="date"
                  id="startDate"
                  value={formData.startDate}
                  onChange={(e) => handleInputChange('startDate', e.target.value)}
                  className={`w-full border rounded-md px-3 py-2 focus:ring-blue-500 focus:border-blue-500 ${!dateValidation.startDate.isValid || !fieldValidation.startDate.isValid
                      ? 'border-red-300 focus:border-red-500 focus:ring-red-500'
                      : 'border-gray-300'
                    }`}
                />
                {!dateValidation.startDate.isValid && (
                  <p className="mt-1 text-sm text-red-600">
                    {dateValidation.startDate.message}
                  </p>
                )}
                {!fieldValidation.startDate.isValid && (
                  <p className="mt-1 text-sm text-red-600">
                    {fieldValidation.startDate.message}
                  </p>
                )}
              </div>

              {/* End Date */}
              <div>
                <label htmlFor="endDate" className="block text-sm font-medium text-gray-700 mb-2">
                  {t('activity.endDate')}
                </label>
                <input
                  type="date"
                  id="endDate"
                  value={formData.endDate}
                  onChange={(e) => handleInputChange('endDate', e.target.value)}
                  className={`w-full border rounded-md px-3 py-2 focus:ring-blue-500 focus:border-blue-500 ${!dateValidation.endDate.isValid || !fieldValidation.endDate.isValid
                      ? 'border-red-300 focus:border-red-500 focus:ring-red-500'
                      : 'border-gray-300'
                    }`}
                />
                {!dateValidation.endDate.isValid && (
                  <p className="mt-1 text-sm text-red-600">
                    {dateValidation.endDate.message}
                  </p>
                )}
                {!fieldValidation.endDate.isValid && (
                  <p className="mt-1 text-sm text-red-600">
                    {fieldValidation.endDate.message}
                  </p>
                )}
              </div>
            </div>

            {/* Total Days */}
            <div>
              <label htmlFor="totalDays" className="block text-sm font-medium text-gray-700 mb-2">
                {t('activity.totalDays')}
              </label>
              <input
                type="number"
                id="totalDays"
                min="0.1"
                step="0.1"
                value={formData.totalDays}
                onChange={(e) => handleInputChange('totalDays', e.target.value)}
                className={`w-full border rounded-md px-3 py-2 focus:ring-blue-500 focus:border-blue-500 ${!fieldValidation.totalDays.isValid
                    ? 'border-red-300 focus:border-red-500 focus:ring-red-500'
                    : 'border-gray-300'
                  }`}
                placeholder={t('activity.form.totalDaysPlaceholder')}
              />
              {!fieldValidation.totalDays.isValid && (
                <p className="mt-1 text-sm text-red-600">
                  {fieldValidation.totalDays.message}
                </p>
              )}
            </div>

            {/* Actions */}
            <div className="flex justify-end space-x-3 pt-6 border-t">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                {t('category.cancel')}
              </button>
              <button
                type="submit"
                disabled={loading}
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? t('activity.form.saving') : activity ? t('activity.form.update') : t('activity.form.create')}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default ActivityForm;