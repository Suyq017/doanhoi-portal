  import React, { useState, useEffect, useRef } from 'react';
  import { useTranslation } from 'react-i18next';
  import { X } from 'lucide-react';
  import { CtxhCategory, CtxhActivity, CreateActivityRequest, UpdateActivityRequest, ActivityStatus } from '../types';
  import { categoryService, limitConfigService } from '../services';
  import { organizationService } from '../../../shared/services/organizationService';
  import { useToast } from '../../../shared/hooks';
  import { usePermissions } from '../../../shared/hooks/usePermissions';
  import { useOrganizationList } from '../../../shared/hooks/queries';

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
  const [dateValidation, setDateValidation] = useState({
    startDate: { isValid: true, message: '' },
    endDate: { isValid: true, message: '' }
  });
  const [organizationLoading, setOrganizationLoading] = useState(false);
  const { t } = useTranslation('ctxh');
  
  // Prefetch organizations using React Query (for caching)
  const { data: cachedOrganizations, isLoading: orgListLoading } = useOrganizationList();

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
    organizationId: '',
    status: ActivityStatus.DRAFT,
    startDate: '', // Now stores datetime (YYYY-MM-DDTHH:mm)
    endDate: '', // Now stores datetime (YYYY-MM-DDTHH:mm)
    totalDays: '',
    location: ''
  });
  // State cho custom dropdown tổ chức
  const [orgDropdownOpen, setOrgDropdownOpen] = useState(false);
  const [orgSearch, setOrgSearch] = useState('');
  const orgInputRef = useRef(null);

  const [categories, setCategories] = useState<CtxhCategory[]>([]);
  const [userOrganization, setUserOrganization] = useState<any | null>(null); // Single org for user
  const [loading, setLoading] = useState(false);
  const [categoriesLoading, setCategoriesLoading] = useState(false);
  const [organizationList, setOrganizationList] = useState<any[]>([]);
  const { isSuperAdmin } = usePermissions();
  // Debug log for create button visibility (must be after all hooks and state declarations)
  useEffect(() => {
    console.log('[ActivityForm] ========== FORM LOAD DEBUG ==========');
    console.log('[ActivityForm] isOpen:', isOpen);
    console.log('[ActivityForm] activity (editing?):', activity);
    console.log('[ActivityForm] isSuperAdmin:', isSuperAdmin());
    console.log('[ActivityForm] userOrganization:', userOrganization);
    console.log('[ActivityForm] organizationList:', organizationList);
    console.log('[ActivityForm] organizationLoading:', organizationLoading);
    console.log('[ActivityForm] formData.organizationId:', formData.organizationId);
    
    if (!isSuperAdmin()) {
      console.log('[ActivityForm] ⚠️ Not super admin');
      if (!userOrganization) {
        console.log('[ActivityForm] ❌ No organization found for user - CREATE WILL BE DISABLED');
      } else {
        console.log('[ActivityForm] ✅ User organization found:', userOrganization.name);
      }
    } else {
      console.log('[ActivityForm] ✅ Super admin - can select organization');
    }
    console.log('[ActivityForm] =======================================');
  }, [isOpen, userOrganization, organizationList, organizationLoading, formData.organizationId]);

  useEffect(() => {
    // Nếu là super admin thì lấy danh sách tổ chức từ cache và lọc bỏ cấp 3 (chi đoàn/chi hội)
    if (isSuperAdmin() && cachedOrganizations) {
      // Giả sử cấp 3 có type là 'CHI_DOAN' hoặc 'CHI_HOI' hoặc cấp = 3
      // Chỉ hiển thị tổ chức cấp 1-2: exclude chi_doan, chi_hoi (type lowercase)
      const filteredOrgs = cachedOrganizations.filter(org => {
        // type: 'doan_truong', 'doan_co_so', 'hoi_sinh_vien_truong', 'lien_chi_hoi', ...
        return org.type !== 'chi_doan' && org.type !== 'chi_hoi';
      });
      setOrganizationList(filteredOrgs);
    }
  }, [isSuperAdmin, cachedOrganizations]);
  const [fieldValidation, setFieldValidation] = useState({
    name: { isValid: true, message: '' },
    categoryId: { isValid: true, message: '' },
    organizationId: { isValid: true, message: '' },
    totalDays: { isValid: true, message: '' },
    startDate: { isValid: true, message: '' },
    endDate: { isValid: true, message: '' },
    location: { isValid: true, message: '' }
  });

  // Combobox search states (only for category now)
  const [categorySearch, setCategorySearch] = useState('');
  const [categoryDropdownOpen, setCategoryDropdownOpen] = useState(false);

  // Debounced search ref for category
  const debouncedCategorySearchRef = useRef<NodeJS.Timeout | null>(null);

  // Toast notifications
  const { showError } = useToast();

  // Format number to remove unnecessary decimal places
  const formatNumber = (num: number): string => {
    return num % 1 === 0 ? Math.floor(num).toString() : num.toString();
  };

  // Helper function to get selected category name
  const getSelectedCategoryName = () => {
    const category = categories.find(c => c.id === formData.categoryId);
    return category?.name || '';
  };

  // Validate totalDays to only allow .0 or .5 increments
  const validateTotalDays = (value: string): { isValid: boolean; message: string } => {
    if (!value) {
      return { isValid: true, message: '' };
    }

    const numValue = parseFloat(value);

    // Check if it's a valid number
    if (isNaN(numValue)) {
      return { isValid: false, message: t('activity.validation.totalDaysInvalid') };
    }

    // Check minimum value
    if (numValue < 0.5) {
      return { isValid: false, message: t('activity.validation.totalDaysMin') };
    }

    // Check if decimal part is .0 or .5
    const decimalPart = numValue % 1;
    if (decimalPart !== 0 && decimalPart !== 0.5) {
      return { isValid: false, message: t('activity.validation.totalDaysIncrement') };
    }

    return { isValid: true, message: '' };
  };

  // Validate required fields
  const validateFields = async () => {
    let isValid = true;
    const errors: string[] = [];

    // Set field validation states - validate all fields fresh
    let totalDaysValidation = { isValid: true, message: '' };

    // Always validate totalDays if it has a value
    if (formData.totalDays) {
      totalDaysValidation = validateTotalDays(formData.totalDays);
    }

    // Preserve existing totalDays validation if it already has an error (from real-time check)
    const preservedTotalDaysValidation = !fieldValidation.totalDays.isValid && fieldValidation.totalDays.message
      ? fieldValidation.totalDays
      : totalDaysValidation;

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
      totalDays: preservedTotalDaysValidation,
      startDate: { isValid: true, message: '' },
      endDate: { isValid: true, message: '' },
      location: { isValid: true, message: '' }
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

    // Check totalDays format validation
    if (!newFieldValidation.totalDays.isValid) {
      isValid = false;
    }

    // Check if total days is required for ACTIVE status
    if (formData.status === ActivityStatus.ACTIVE) {
      // Check if totalDays is required (only if format validation passed)
      if (!formData.totalDays && newFieldValidation.totalDays.isValid) {
        newFieldValidation.totalDays = {
          isValid: false,
          message: t('activity.validation.totalDaysRequired')
        };
        isValid = false;
      }
      // Format validation already handled above, don't override it

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

      if (!formData.location || formData.location.trim() === '') {
        newFieldValidation.location = {
          isValid: false,
          message: t('activity.validation.locationRequiredForActive')
        };
        isValid = false;
      }
    }

    // Set all field validations FIRST
    setFieldValidation(newFieldValidation);

    // Return early if basic validation failed
    if (!isValid) {
      return { isValid: false, errors: [] };
    }

    // Note: Duplicate name checking is now handled by backend when submitting
    // This avoids issues with race conditions and ensures consistency

    // Check organization day limit (when totalDays is specified - validate for both new and existing activities)
    if (formData.totalDays && formData.organizationId) {
      try {
        const totalDays = parseFloat(formData.totalDays);
        const limitConfigs = await limitConfigService.findAll({
          organization_id: formData.organizationId,
          status: 'ACTIVE' as any,
          limit: 10
        });

        if (limitConfigs.data && limitConfigs.data.length > 0) {
          const activeConfig = limitConfigs.data[0];
          const maxDays = activeConfig.maxDays;

          if (totalDays > maxDays) {
            // Update only the totalDays field validation, keep other fields intact
            newFieldValidation.totalDays = {
              isValid: false,
              message: t('limitConfig.validation.organizationLimitExceeded', {
                maxDays: formatNumber(maxDays)
              })
            };
            isValid = false;
          }
        }
      } catch (error) {
        console.error('Error checking organization day limit:', error);
      }
    }

    // Set final field validation state (after all async checks)
    setFieldValidation(newFieldValidation);

    // Return validation result with errors for external handling
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

  // Load categories once when component mounts or when modal opens for the first time
  useEffect(() => {
    if (isOpen && categories.length === 0) {
      loadCategories();
    }
  }, [isOpen]);

  // Load user organization when modal opens (only for create mode)
  useEffect(() => {
    console.log('[ActivityForm] useEffect for loading organization triggered');
    console.log('[ActivityForm] isOpen:', isOpen, 'activity:', activity, 'isSuperAdmin:', isSuperAdmin());
    
    if (isOpen && !activity) {
      console.log('[ActivityForm] Loading user organization for CREATE mode...');
      loadUserOrganization();
    } else if (isOpen && activity) {
      // Edit mode: set organization from activity data
      const activityOrg = (activity as any).organization;
      console.log('[ActivityForm] EDIT mode - setting organization from activity:', activityOrg);
      if (activityOrg) {
        setUserOrganization(activityOrg);
      }
    }
  }, [isOpen, activity]);

  // Close category dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Element;
      if (!target.closest('.category-combobox')) {
        setCategoryDropdownOpen(false);
        setCategorySearch('');
      }
    };

    if (categoryDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => {
        document.removeEventListener('mousedown', handleClickOutside);
      };
    }
  }, [categoryDropdownOpen]);

  // Cleanup debounce timeout on unmount
  useEffect(() => {
    return () => {
      if (debouncedCategorySearchRef.current) {
        clearTimeout(debouncedCategorySearchRef.current);
      }
    };
  }, []);

  // Populate form when editing
  useEffect(() => {
    if (activity) {
      // Format datetime for datetime-local input (YYYY-MM-DDTHH:mm)
      const formatDatetimeLocal = (dateStr: string) => {
        if (!dateStr) return '';
        const date = new Date(dateStr);
        // Get local datetime string in format YYYY-MM-DDTHH:mm
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        const hours = String(date.getHours()).padStart(2, '0');
        const minutes = String(date.getMinutes()).padStart(2, '0');
        return `${year}-${month}-${day}T${hours}:${minutes}`;
      };

      const newFormData = {
        name: activity.name || '',
        description: activity.description || '',
        categoryId: (activity as any).category_id || '', // API uses category_id
        organizationId: (activity as any).organization_id || '', // API uses organization_id
        status: activity.status || ActivityStatus.DRAFT,
        startDate: formatDatetimeLocal((activity as any).start_date),
        endDate: formatDatetimeLocal((activity as any).end_date),
        totalDays: (activity as any).total_days?.toString() || '',
        location: activity.location || '' // Use proper TypeScript property
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
        organizationId: '', // Will be auto-set from loadUserOrganization
        status: ActivityStatus.DRAFT,
        startDate: '', // Now stores datetime (YYYY-MM-DDTHH:mm)
        endDate: '', // Now stores datetime (YYYY-MM-DDTHH:mm)
        totalDays: '',
        location: ''
      };
      setFormData(newFormData);
    }
  }, [activity, isOpen]);

  const loadCategories = async (search?: string) => {
    try {
      setCategoriesLoading(true);
      const response = await categoryService.findAll({ 
        search: search || undefined,
        limit: 20 
      });
      const categoriesData = Array.isArray(response.data) ? response.data : [];
      setCategories(categoriesData);
    } catch (error) {
      console.error('Failed to load categories:', error);
      setCategories([]);
    } finally {
      setCategoriesLoading(false);
    }
  };

  // Load user's organization for CTXH activity creation
  const loadUserOrganization = async () => {
    // This function is only called in CREATE mode (from useEffect)
    console.log('[ActivityForm] loadUserOrganization() called');
    try {
      setOrganizationLoading(true);
      console.log('[ActivityForm] Calling organizationService.getUserPrimaryOrganization()...');
      const response = await organizationService.getUserPrimaryOrganization();
      console.log('[ActivityForm] getUserPrimaryOrganization response:', response);
      
      if (response.organization) {
        // User has an active organization
        console.log('[ActivityForm] ✅ Organization found:', response.organization.name);
        setUserOrganization(response.organization);
        setFormData(prev => ({
          ...prev,
          organizationId: response.organization!.id
        }));
      } else {
        // No organization found in user_organizations
        console.warn('[ActivityForm] ❌ No organization found for user in user_organizations table');
        setUserOrganization(null);
        showError(t('activity.form.noAccessibleOrganization'));
      }
    } catch (error) {
      console.error('[ActivityForm] ❌ Failed to load user organization:', error);
      setUserOrganization(null);
      showError(t('activity.form.loadOrganizationError'));
    } finally {
      setOrganizationLoading(false);
      console.log('[ActivityForm] Organization loading finished');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validate all fields
    const validationResult = await validateFields();
    const datesValid = dateValidation.startDate.isValid && dateValidation.endDate.isValid;

    // Check field validation state (including totalDays validation)
    const fieldValidationValid = Object.values(fieldValidation).every(field => field.isValid);

    if (!validationResult.isValid || !datesValid || !fieldValidationValid) {
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
        location: formData.location?.trim() || undefined, // Backend expects location
        ...(activity && { status: formData.status }) // Only include status for updates
      };

      await onSubmit(submitData as any);
      // Only close form if submission succeeds (no error thrown)
      onClose();
    } catch (error: any) {
      console.error('Failed to submit form:', error);
      
      // Check if it's a duplicate name error
      const errorMessage = error.message || error.response?.data?.message || '';
      if (errorMessage.includes('đã tồn tại')) {
        // Show error in form field
        setFieldValidation(prev => ({
          ...prev,
          name: { 
            isValid: false, 
            message: errorMessage
          }
        }));
        showError(errorMessage);
      }
      // Error is already handled and shown by parent component
      // Keep form open so user can fix the issue and try again
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

    if (field === 'totalDays') {
      // Validate totalDays immediately when user types
      const validation = validateTotalDays(value);
      setFieldValidation(prev => ({
        ...prev,
        totalDays: validation
      }));
    }

    if (field === 'location' && fieldValidation.location && !fieldValidation.location.isValid) {
      setFieldValidation(prev => ({
        ...prev,
        location: { isValid: true, message: '' }
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
      const totalDaysValidation = validateTotalDays(newFormData.totalDays);
      const isValidTotalDays = newFormData.totalDays && totalDaysValidation.isValid;

      setFieldValidation(prev => ({
        ...prev,
        totalDays: {
          isValid: !!isValidTotalDays,
          message: !isValidTotalDays ? (totalDaysValidation.message || t('activity.validation.totalDaysRequired')) : ''
        },
        startDate: {
          isValid: !!newFormData.startDate,
          message: !newFormData.startDate ? t('activity.validation.startDateRequiredForActive') : ''
        },
        endDate: {
          isValid: !!newFormData.endDate,
          message: !newFormData.endDate ? t('activity.validation.endDateRequiredForActive') : ''
        },
        location: {
          isValid: !!(newFormData.location && newFormData.location.trim()),
          message: !(newFormData.location && newFormData.location.trim()) ? t('activity.validation.locationRequiredForActive') : ''
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

    // Always validate totalDays day limit (for all statuses)
    if (field === 'totalDays' && value && formData.organizationId) {
      const totalDaysValue = parseFloat(value);
      
      if (totalDaysValue >= 0.5) {
        // Check day limit asynchronously
        (async () => {
          try {
            const limitConfigs = await limitConfigService.findAll({
              organization_id: formData.organizationId,
              status: 'ACTIVE' as any,
              limit: 10
            });

            if (limitConfigs.data && limitConfigs.data.length > 0) {
              const activeConfig = limitConfigs.data[0];
              const maxDays = activeConfig.maxDays;

              if (totalDaysValue > maxDays) {
                setFieldValidation(prev => ({
                  ...prev,
                  totalDays: {
                    isValid: false,
                    message: t('limitConfig.validation.organizationLimitExceeded', {
                      maxDays: formatNumber(maxDays)
                    })
                  }
                }));
              } else {
                setFieldValidation(prev => ({
                  ...prev,
                  totalDays: {
                    isValid: true,
                    message: ''
                  }
                }));
              }
            }
          } catch (error) {
            console.error('Error checking day limit:', error);
          }
        })();
      }
    }

    // Re-validate active fields when they change and status is ACTIVE
    if (formData.status === ActivityStatus.ACTIVE) {
      if (field === 'totalDays') {
        const totalDaysValue = parseFloat(value);
        
        // First check basic validation
        if (!value || totalDaysValue < 0.5) {
          setFieldValidation(prev => ({
            ...prev,
            totalDays: {
              isValid: false,
              message: t('activity.validation.totalDaysRequired')
            }
          }));
        } else {
          // Then check day limit asynchronously
          (async () => {
            try {
              const limitConfigs = await limitConfigService.findAll({
                organization_id: formData.organizationId,
                status: 'ACTIVE' as any,
                limit: 10
              });

              if (limitConfigs.data && limitConfigs.data.length > 0) {
                const activeConfig = limitConfigs.data[0];
                const maxDays = activeConfig.maxDays;

                if (totalDaysValue > maxDays) {
                  setFieldValidation(prev => ({
                    ...prev,
                    totalDays: {
                      isValid: false,
                      message: t('limitConfig.validation.organizationLimitExceeded', {
                        maxDays: formatNumber(maxDays)
                      })
                    }
                  }));
                } else {
                  setFieldValidation(prev => ({
                    ...prev,
                    totalDays: {
                      isValid: true,
                      message: ''
                    }
                  }));
                }
              }
            } catch (error) {
              console.error('Error checking day limit:', error);
            }
          })();
        }
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

            {/* Location */}
            <div>
              <label htmlFor="location" className="block text-sm font-medium text-gray-700 mb-2">
                {t('activity.location')}
              </label>
              <input
                type="text"
                id="location"
                value={formData.location}
                onChange={(e) => handleInputChange('location', e.target.value)}
                className={`w-full border rounded-md px-3 py-2 focus:ring-blue-500 focus:border-blue-500 ${!fieldValidation.location.isValid
                  ? 'border-red-300 focus:border-red-500 focus:ring-red-500'
                  : 'border-gray-300'
                  }`}
                placeholder={t('activity.form.locationPlaceholder')}
              />
              {!fieldValidation.location.isValid && (
                <p className="mt-1 text-sm text-red-600">
                  {fieldValidation.location.message}
                </p>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Category */}
              <div className="relative category-combobox">
                <label htmlFor="categoryId" className="block text-sm font-medium text-gray-700 mb-2">
                  {t('activity.category')} <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <input
                    type="text"
                    placeholder={categoriesLoading ? t('activity.form.loading') : t('activity.form.selectCategory')}
                    value={categoryDropdownOpen ? categorySearch : getSelectedCategoryName()}
                    onChange={(e) => {
                      const searchValue = e.target.value;
                      setCategorySearch(searchValue);
                      if (!categoryDropdownOpen) setCategoryDropdownOpen(true);
                      
                      // Debounced server-side search
                      if (debouncedCategorySearchRef.current) {
                        clearTimeout(debouncedCategorySearchRef.current);
                      }
                      debouncedCategorySearchRef.current = setTimeout(() => {
                        loadCategories(searchValue);
                      }, 300);
                    }}
                    onFocus={() => {
                      setCategoryDropdownOpen(true);
                      setCategorySearch('');
                      if (categories.length === 0) {
                        loadCategories();
                      }
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
                    onClick={() => {
                      setCategoryDropdownOpen(!categoryDropdownOpen);
                      if (!categoryDropdownOpen && categories.length === 0) {
                        loadCategories();
                      }
                    }}
                    className="absolute inset-y-0 right-0 flex items-center px-3 text-gray-400 hover:text-gray-600"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>

                  {categoryDropdownOpen && (
                    <div className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-auto">
                      {categoriesLoading ? (
                        <div className="px-3 py-2 text-sm text-gray-500">{t('activity.form.loading')}</div>
                      ) : categories.length > 0 ? (
                        categories.slice(0, 10).map((category) => (
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
                          {t('activity.form.noResults')}
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

              {/* Organization - Auto-set from user, hoặc combobox cho admin */}
              <div className="relative">
                <label htmlFor="organizationId" className="block text-sm font-medium text-gray-700 mb-2">
                  {t('activity.organization')} <span className="text-red-500">*</span>
                </label>
                {isSuperAdmin() ? (
                  <div className="relative">
                    <button
                      type="button"
                      className="w-full py-2 px-3 border border-gray-300 rounded-md bg-white text-gray-700 text-left"
                      onClick={() => setOrgDropdownOpen((open) => !open)}
                      ref={orgInputRef}
                      aria-haspopup="listbox"
                      aria-expanded={orgDropdownOpen}
                      disabled={orgListLoading}
                    >
                      {orgListLoading
                        ? t('activity.form.loading')
                        : formData.organizationId
                          ? organizationList.find(org => org.id === formData.organizationId)?.name || 'Chọn tổ chức'
                          : 'Chọn tổ chức'}
                    </button>
                    {orgDropdownOpen && (
                      <div
                        className="absolute left-0 top-full z-50 w-full bg-white border border-gray-300 rounded-md shadow-lg mt-1 max-h-64 overflow-y-auto"
                        style={{ minWidth: '200px' }}
                      >
                        <input
                          type="text"
                          className="w-full px-3 py-2 border-b border-gray-200"
                          placeholder="Tìm tổ chức..."
                          value={orgSearch}
                          onChange={e => setOrgSearch(e.target.value)}
                          autoFocus
                        />
                        {organizationList
                          .filter(org =>
                            org.name.toLowerCase().includes(orgSearch.toLowerCase()) ||
                            org.code?.toLowerCase().includes(orgSearch.toLowerCase())
                          )
                          .slice(0, 10)
                          .map(org => (
                            <div
                              key={org.id}
                              className={`px-3 py-2 cursor-pointer hover:bg-blue-50 ${formData.organizationId === org.id ? 'bg-blue-100 font-semibold' : ''}`}
                              onClick={() => {
                                setFormData({ ...formData, organizationId: org.id });
                                setOrgDropdownOpen(false);
                                setOrgSearch('');
                              }}
                              role="option"
                              aria-selected={formData.organizationId === org.id}
                            >
                              {org.name}
                            </div>
                          ))}
                        {organizationList
                          .filter(org =>
                            org.name.toLowerCase().includes(orgSearch.toLowerCase()) ||
                            org.code?.toLowerCase().includes(orgSearch.toLowerCase())
                          )
                          .slice(0, 10)
                          .length === 0 && (
                          <div className="px-3 py-2 text-gray-500">Không tìm thấy tổ chức</div>
                        )}
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="relative">
                    <input
                      type="text"
                      value={
                        organizationLoading 
                          ? t('activity.form.loading')
                          : userOrganization?.name || (activity as any)?.organization?.name || t('activity.form.noOrganization')
                      }
                      disabled
                      className="w-full py-2 px-3 pr-10 border border-gray-300 rounded-md 
                               bg-gray-100 text-gray-700 cursor-not-allowed"
                    />
                    <div className="absolute inset-y-0 right-0 flex items-center px-3 text-gray-400">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                      </svg>
                    </div>
                  </div>
                )}
                {!isSuperAdmin() && (
                  <p className="mt-1 text-xs text-gray-500">
                    {t('activity.form.organizationAutoSetHint')}
                  </p>
                )}
                {!fieldValidation.organizationId.isValid && (
                  <p className="mt-1 text-sm text-red-600">
                    {fieldValidation.organizationId.message}
                  </p>
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
              {/* Start Date & Time */}
              <div>
                <label htmlFor="startDate" className="block text-sm font-medium text-gray-700 mb-2">
                  {t('activity.startDate')}
                </label>
                <input
                  type="datetime-local"
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

              {/* End Date & Time */}
              <div>
                <label htmlFor="endDate" className="block text-sm font-medium text-gray-700 mb-2">
                  {t('activity.endDate')}
                </label>
                <input
                  type="datetime-local"
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
                min="0.5"
                step="0.5"
                value={formData.totalDays}
                onChange={(e) => handleInputChange('totalDays', e.target.value)}
                className={`w-full border rounded-md px-3 py-2 focus:ring-blue-500 focus:border-blue-500 ${!fieldValidation.totalDays.isValid
                  ? 'border-red-300 focus:border-red-500 focus:ring-red-500'
                  : 'border-gray-300'
                  }`}
                placeholder={t('activity.form.totalDaysPlaceholder')}
              />
              {!fieldValidation.totalDays.isValid && fieldValidation.totalDays.message && (
                <p className="mt-1 text-sm text-red-600" style={{ display: 'block', color: 'red', fontSize: '14px', marginTop: '4px' }}>
                  {fieldValidation.totalDays.message}
                </p>
              )}
              <p className="mt-1 text-xs text-gray-500">
                {t('activity.form.totalDaysHelp')}
              </p>
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