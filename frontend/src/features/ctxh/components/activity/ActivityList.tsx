import React, { useState, useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Search, Edit, Trash2, Eye, Calendar, ChevronDown } from 'lucide-react';
import {
  CtxhActivity,
  ActivityQueryParams,
  CtxhCategory,
  ActivityStatus
} from '../../types';
import { categoryService } from '../../services';
import { organizationService } from '../../../../shared/services';
import { Organization } from '../../../../shared/types/organization';
import { Pagination } from '../../../../shared/components';
import { useOrganizationList, useActivityList } from '../../../../shared/hooks/queries';

interface ActivityListProps {
  onCreateClick: () => void;
  onEditClick: (activity: CtxhActivity) => void;
  onDeleteClick: (activity: CtxhActivity) => void;
  onViewClick: (activity: CtxhActivity) => void;
  showToast: (type: 'success' | 'error' | 'info', message: string) => void;
  permissions?: {
    create: boolean;
    update: boolean;
    delete: boolean;
  };
}

const ActivityList: React.FC<ActivityListProps> = ({
  onEditClick,
  onDeleteClick,
  onViewClick,
  showToast,
  permissions
}) => {
  const { t } = useTranslation('ctxh');

  // Prefetch organizations using React Query (for caching)
  useOrganizationList();

  // State for filters and pagination
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [limit, setLimit] = useState(10);

  // Filter states
  const [selectedCategoryId, setSelectedCategoryId] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('');
  const [selectedOrganizationId, setSelectedOrganizationId] = useState('');
  const [categories, setCategories] = useState<CtxhCategory[]>([]);
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [loadingCategories, setLoadingCategories] = useState(false);
  const [loadingOrganizations, setLoadingOrganizations] = useState(false);

  // Combobox states
  const [categorySearch, setCategorySearch] = useState('');
  const [statusSearch, setStatusSearch] = useState('');
  const [organizationSearch, setOrganizationSearch] = useState('');
  const [categoryDropdownOpen, setCategoryDropdownOpen] = useState(false);
  const [statusDropdownOpen, setStatusDropdownOpen] = useState(false);
  const [organizationDropdownOpen, setOrganizationDropdownOpen] = useState(false);

  // Debounce search term
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
      setCurrentPage(1); // Reset to page 1 when searching
    }, 300);

    return () => clearTimeout(timer);
  }, [searchTerm]);

  // Build query params with useMemo for stable reference
  const queryParams = useMemo<ActivityQueryParams>(() => ({
    page: currentPage,
    limit: limit,
    search: debouncedSearchTerm || undefined,
    category_id: selectedCategoryId || undefined,
    status: selectedStatus as ActivityStatus || undefined,
    organization_id: selectedOrganizationId || undefined,
  }), [currentPage, limit, debouncedSearchTerm, selectedCategoryId, selectedStatus, selectedOrganizationId]);

  // Use TanStack Query hook for activities
  const {
    data: activityData,
    isLoading,
    isError,
    error
  } = useActivityList(queryParams);

  // Extract data from response
  const activities = activityData?.data || [];
  const total = activityData?.total || 0;
  const totalPages = activityData?.totalPages || 1;

  // Show error toast if query fails
  useEffect(() => {
    if (isError && error) {
      showToast('error', t('activity.loadActivitiesError'));
    }
  }, [isError, error, showToast, t]);

  // Create debounced search functions for comboboxes
  const debouncedCategorySearchRef = React.useRef<NodeJS.Timeout>();
  const debouncedOrganizationSearchRef = React.useRef<NodeJS.Timeout>();

  // Debounced category search
  const handleCategorySearch = (term: string) => {
    if (debouncedCategorySearchRef.current) {
      clearTimeout(debouncedCategorySearchRef.current);
    }
    debouncedCategorySearchRef.current = setTimeout(() => {
      loadCategories(term);
    }, 300);
  };

  // Debounced organization search
  const handleOrganizationSearch = (term: string) => {
    if (debouncedOrganizationSearchRef.current) {
      clearTimeout(debouncedOrganizationSearchRef.current);
    }
    debouncedOrganizationSearchRef.current = setTimeout(() => {
      loadOrganizations(term);
    }, 300);
  };

  // Filter functions for comboboxes (status only - category & organization use server-side search)
  const statusOptions = [
    { value: ActivityStatus.DRAFT, label: t('activity.statusOptions.DRAFT') },
    { value: ActivityStatus.ACTIVE, label: t('activity.statusOptions.ACTIVE') },
    { value: ActivityStatus.COMPLETED, label: t('activity.statusOptions.COMPLETED') },
    { value: ActivityStatus.CANCELLED, label: t('activity.statusOptions.CANCELLED') }
  ];

  const filteredStatuses = statusOptions.filter(status =>
    status.label.toLowerCase().includes(statusSearch.toLowerCase())
  );

  // Helper functions
  const getSelectedCategoryName = () => {
    const category = categories.find(c => c.id === selectedCategoryId);
    return category ? category.name : t('activity.allCategories');
  };

  const getSelectedStatusName = () => {
    const status = statusOptions.find(s => s.value === selectedStatus);
    return status ? status.label : t('activity.allStatuses');
  };

  const getSelectedOrganizationName = () => {
    const organization = organizations.find(o => o.id === selectedOrganizationId);
    return organization ? organization.name : t('activity.allOrganizations');
  };

  // Load categories with server-side search
  const loadCategories = async (search?: string) => {
    try {
      setLoadingCategories(true);
      const response = await categoryService.findAll({
        page: 1,
        limit: 20, // Limit to 20 items per search
        search: search || undefined
      });
      setCategories(response.data);
    } catch (error) {
      console.error('Failed to load categories:', error);
      showToast('error', t('activity.loadCategoriesError'));
    } finally {
      setLoadingCategories(false);
    }
  };

  // Load organizations with server-side search (Level 1 & 2 only)
  const loadOrganizations = async (search?: string) => {
    try {
      setLoadingOrganizations(true);
      // Use server-side search API for CTXH activity viewable organizations (Level 1 & 2 only)
      const response = await organizationService.searchCtxhActivityViewableOrganizations({
        page: 1,
        limit: 20, // Limit to 20 items per search
        search: search || undefined
      });
      setOrganizations(response.data);
    } catch (error) {
      console.error('Failed to load organizations:', error);
      showToast('error', 'Không thể tải danh sách tổ chức');
    } finally {
      setLoadingOrganizations(false);
    }
  };

  // Remove loadActivities function - now handled by TanStack Query

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Element;
      if (!target.closest('.category-combobox')) {
        setCategoryDropdownOpen(false);
        setCategorySearch('');
      }
      if (!target.closest('.status-combobox')) {
        setStatusDropdownOpen(false);
        setStatusSearch('');
      }
      if (!target.closest('.organization-combobox')) {
        setOrganizationDropdownOpen(false);
        setOrganizationSearch('');
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Filter change handlers - reset to page 1 and reload
  // ✅ TanStack Query automatically refetches when queryParams change - no manual filtering needed
  // Remove useEffect - state changes trigger query refetch via queryParams dependency

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setSearchTerm(value);
  };

  const handleCategoryChange = (categoryId: string) => {
    setSelectedCategoryId(categoryId);
    setCategoryDropdownOpen(false);
    setCategorySearch('');
    setCurrentPage(1); // Reset to first page on filter change
  };

  const handleStatusChange = (status: string) => {
    setSelectedStatus(status);
    setStatusDropdownOpen(false);
    setStatusSearch('');
    setCurrentPage(1); // Reset to first page on filter change
  };

  const handleOrganizationChange = (organizationId: string) => {
    setSelectedOrganizationId(organizationId);
    setOrganizationDropdownOpen(false);
    setOrganizationSearch('');
    setCurrentPage(1); // Reset to first page on filter change
  };

  const handleEdit = (activity: CtxhActivity) => {
    onEditClick(activity);
  };

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'ACTIVE':
        return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300';
      case 'DRAFT':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300';
      case 'COMPLETED':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300';
      case 'CANCELLED':
        return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'ACTIVE':
        return t('activity.statusOptions.ACTIVE');
      case 'DRAFT':
        return t('activity.statusOptions.DRAFT');
      case 'COMPLETED':
        return t('activity.statusOptions.COMPLETED');
      case 'CANCELLED':
        return t('activity.statusOptions.CANCELLED');
      default:
        return status;
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('vi-VN');
  };

  return (
    <div className="space-y-6">
      {/* Filters */}
      <div className="p-4 bg-white border border-gray-200 rounded-lg shadow-sm dark:bg-gray-800 dark:border-gray-700">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-5">
          {/* Search */}
          <div className="relative">
            <Search className="absolute w-5 h-5 text-gray-400 transform -translate-y-1/2 left-3 top-1/2" />
            <input
              type="text"
              placeholder={t('activity.search')}
              value={searchTerm}
              onChange={handleSearch}
              className="w-full py-2 pl-10 pr-4 border border-gray-300 rounded-md dark:border-gray-600 focus:ring-2 focus:ring-doan-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
            />
          </div>

          {/* Category Filter */}
          <div className="relative category-combobox">
            <div className="relative">
              <input
                type="text"
                placeholder={t('activity.allCategories')}
                value={categoryDropdownOpen ? categorySearch : getSelectedCategoryName()}
                onChange={(e) => {
                  const value = e.target.value;
                  setCategorySearch(value);
                  if (!categoryDropdownOpen) setCategoryDropdownOpen(true);
                  // Trigger server-side search with debounce
                  handleCategorySearch(value);
                }}
                onFocus={() => {
                  setCategoryDropdownOpen(true);
                  setCategorySearch('');
                  // Load initial categories when dropdown opens
                  if (categories.length === 0) {
                    loadCategories();
                  }
                }}
                onBlur={() => {
                  setTimeout(() => setCategoryDropdownOpen(false), 200);
                }}
                className="w-full py-2 px-3 pr-10 border border-gray-300 rounded-md dark:border-gray-600 focus:ring-2 focus:ring-doan-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
              />
              <button
                type="button"
                onClick={() => {
                  const newState = !categoryDropdownOpen;
                  setCategoryDropdownOpen(newState);
                  if (newState && categories.length === 0) {
                    loadCategories();
                  }
                }}
                className="absolute inset-y-0 right-0 flex items-center px-3 text-gray-400 hover:text-gray-600 dark:text-gray-400 dark:hover:text-gray-300"
              >
                <ChevronDown className="w-4 h-4" />
              </button>

              {categoryDropdownOpen && (
                <div className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg dark:bg-gray-700 dark:border-gray-600 max-h-60 overflow-auto">
                  {loadingCategories ? (
                    <div className="px-3 py-2 text-sm text-gray-500 dark:text-gray-400 text-center">
                      {t('activity.loading')}
                    </div>
                  ) : (
                    <>
                      <button
                        type="button"
                        onClick={() => handleCategoryChange('')}
                        className={`w-full text-left px-3 py-2 hover:bg-gray-100 dark:hover:bg-gray-600 focus:bg-gray-100 dark:focus:bg-gray-600 focus:outline-none ${!selectedCategoryId ? 'bg-blue-50 text-blue-700 dark:bg-blue-900 dark:text-blue-300' : 'text-gray-900 dark:text-white'
                          }`}
                      >
                        {t('activity.allCategories')}
                      </button>
                      {categories.length > 0 ? (
                        categories.map((category) => (
                          <button
                            key={category.id}
                            type="button"
                            onClick={() => handleCategoryChange(category.id)}
                            className={`w-full text-left px-3 py-2 hover:bg-gray-100 dark:hover:bg-gray-600 focus:bg-gray-100 dark:focus:bg-gray-600 focus:outline-none ${selectedCategoryId === category.id ? 'bg-blue-50 text-blue-700 dark:bg-blue-900 dark:text-blue-300' : 'text-gray-900 dark:text-white'
                              }`}
                          >
                            {category.name}
                          </button>
                        ))
                      ) : (
                        <div className="px-3 py-2 text-sm text-gray-500 dark:text-gray-400">
                          {t('activity.form.noResults')}
                        </div>
                      )}
                    </>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Organization Filter */}
          <div className="relative organization-combobox">
            <div className="relative">
              <input
                type="text"
                placeholder={t('activity.allOrganizations')}
                value={organizationDropdownOpen ? organizationSearch : getSelectedOrganizationName()}
                onChange={(e) => {
                  const value = e.target.value;
                  setOrganizationSearch(value);
                  if (!organizationDropdownOpen) setOrganizationDropdownOpen(true);
                  // Trigger server-side search with debounce
                  handleOrganizationSearch(value);
                }}
                onFocus={() => {
                  setOrganizationDropdownOpen(true);
                  setOrganizationSearch('');
                  // Load initial organizations when dropdown opens
                  if (organizations.length === 0) {
                    loadOrganizations();
                  }
                }}
                onBlur={() => {
                  setTimeout(() => setOrganizationDropdownOpen(false), 200);
                }}
                className="w-full py-2 px-3 pr-10 border border-gray-300 rounded-md dark:border-gray-600 focus:ring-2 focus:ring-doan-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
              />
              <button
                type="button"
                onClick={() => {
                  const newState = !organizationDropdownOpen;
                  setOrganizationDropdownOpen(newState);
                  if (newState && organizations.length === 0) {
                    loadOrganizations();
                  }
                }}
                className="absolute inset-y-0 right-0 flex items-center px-3 text-gray-400 hover:text-gray-600 dark:text-gray-400 dark:hover:text-gray-300"
              >
                <ChevronDown className="w-4 h-4" />
              </button>

              {organizationDropdownOpen && (
                <div className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg dark:bg-gray-700 dark:border-gray-600 max-h-60 overflow-auto">
                  {loadingOrganizations ? (
                    <div className="px-3 py-2 text-sm text-gray-500 dark:text-gray-400 text-center">
                      {t('activity.loading')}
                    </div>
                  ) : (
                    <>
                      <button
                        type="button"
                        onClick={() => handleOrganizationChange('')}
                        className={`w-full text-left px-3 py-2 hover:bg-gray-100 dark:hover:bg-gray-600 focus:bg-gray-100 dark:focus:bg-gray-600 focus:outline-none ${!selectedOrganizationId ? 'bg-blue-50 text-blue-700 dark:bg-blue-900 dark:text-blue-300' : 'text-gray-900 dark:text-white'
                          }`}
                      >
                        {t('activity.allOrganizations')}
                      </button>
                      {organizations.length > 0 ? (
                        organizations.map((organization) => (
                          <button
                            key={organization.id}
                            type="button"
                            onClick={() => handleOrganizationChange(organization.id)}
                            className={`w-full text-left px-3 py-2 hover:bg-gray-100 dark:hover:bg-gray-600 focus:bg-gray-100 dark:focus:bg-gray-600 focus:outline-none ${selectedOrganizationId === organization.id ? 'bg-blue-50 text-blue-700 dark:bg-blue-900 dark:text-blue-300' : 'text-gray-900 dark:text-white'
                              }`}
                          >
                            {organization.name}
                          </button>
                        ))
                      ) : (
                        <div className="px-3 py-2 text-sm text-gray-500 dark:text-gray-400">
                          {t('activity.form.noResults')}
                        </div>
                      )}
                    </>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Status Filter */}
          <div className="relative status-combobox">
            <div className="relative">
              <input
                type="text"
                placeholder={t('activity.allStatuses')}
                value={statusDropdownOpen ? statusSearch : getSelectedStatusName()}
                onChange={(e) => {
                  setStatusSearch(e.target.value);
                  if (!statusDropdownOpen) setStatusDropdownOpen(true);
                }}
                onFocus={() => {
                  setStatusDropdownOpen(true);
                  setStatusSearch('');
                }}
                onBlur={() => {
                  setTimeout(() => setStatusDropdownOpen(false), 200);
                }}
                className="w-full py-2 px-3 pr-10 border border-gray-300 rounded-md dark:border-gray-600 focus:ring-2 focus:ring-doan-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
              />
              <button
                type="button"
                onClick={() => setStatusDropdownOpen(!statusDropdownOpen)}
                className="absolute inset-y-0 right-0 flex items-center px-3 text-gray-400 hover:text-gray-600 dark:text-gray-400 dark:hover:text-gray-300"
              >
                <ChevronDown className="w-4 h-4" />
              </button>

              {statusDropdownOpen && (
                <div className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg dark:bg-gray-700 dark:border-gray-600 max-h-60 overflow-auto">
                  <button
                    type="button"
                    onClick={() => handleStatusChange('')}
                    className={`w-full text-left px-3 py-2 hover:bg-gray-100 dark:hover:bg-gray-600 focus:bg-gray-100 dark:focus:bg-gray-600 focus:outline-none ${!selectedStatus ? 'bg-blue-50 text-blue-700 dark:bg-blue-900 dark:text-blue-300' : 'text-gray-900 dark:text-white'
                      }`}
                  >
                    {t('activity.allStatuses')}
                  </button>
                  {filteredStatuses.length > 0 ? (
                    filteredStatuses.map((status) => (
                      <button
                        key={status.value}
                        type="button"
                        onClick={() => handleStatusChange(status.value)}
                        className={`w-full text-left px-3 py-2 hover:bg-gray-100 dark:hover:bg-gray-600 focus:bg-gray-100 dark:focus:bg-gray-600 focus:outline-none ${selectedStatus === status.value ? 'bg-blue-50 text-blue-700 dark:bg-blue-900 dark:text-blue-300' : 'text-gray-900 dark:text-white'
                          }`}
                      >
                        {status.label}
                      </button>
                    ))
                  ) : (
                    <div className="px-3 py-2 text-sm text-gray-500 dark:text-gray-400">
                      {t('activity.form.noResults')}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Empty column for grid layout */}
          <div></div>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-hidden bg-white border border-gray-200 rounded-lg shadow-sm dark:bg-gray-800 dark:border-gray-700">
        {isLoading ? (
          <div className="flex items-center justify-center min-h-[400px]">
            <div className="w-12 h-12 mx-auto border-b-2 rounded-full animate-spin border-doan-600"></div>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto max-w-full">
              <table className="w-full min-w-[1200px]">
                <thead className="bg-gray-50 dark:bg-gray-900">
                  <tr>
                    <th className="w-1/4 px-6 py-3 text-xs font-medium tracking-wider text-left text-gray-500 uppercase dark:text-gray-400">
                      {t('activity.name')}
                    </th>
                    <th className="w-1/4 px-6 py-3 text-xs font-medium tracking-wider text-left text-gray-500 uppercase dark:text-gray-400">
                      {t('activity.category')}
                    </th>
                    <th className="w-1/4 px-6 py-3 text-xs font-medium tracking-wider text-left text-gray-500 uppercase dark:text-gray-400">
                      {t('activity.location')}
                    </th>
                    <th className="w-1/4 px-6 py-3 text-xs font-medium tracking-wider text-left text-gray-500 uppercase dark:text-gray-400">
                      {t('activity.time')}
                    </th>
                    <th className="w-24 px-6 py-3 text-xs font-medium tracking-wider text-left text-gray-500 uppercase dark:text-gray-400">
                      {t('activity.status')}
                    </th>
                    <th className="w-28 px-6 py-3 text-xs font-medium tracking-wider text-left text-gray-500 uppercase dark:text-gray-400">
                      {t('limitConfig.actions')}
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200 dark:bg-gray-800 dark:divide-gray-700">
                  {activities.map((activity) => (
                    <tr key={activity.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                      <td className="w-1/4 px-6 py-4">
                        <div className="font-medium text-gray-900 dark:text-white break-words overflow-hidden">
                          <div
                            className="leading-5 overflow-hidden"
                            style={{
                              display: '-webkit-box',
                              WebkitLineClamp: 2,
                              WebkitBoxOrient: 'vertical',
                              overflow: 'hidden'
                            }}
                            title={activity.name}
                          >
                            {activity.name}
                          </div>
                        </div>
                        {activity.description && (
                          <div className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                            <div
                              className="overflow-hidden break-words leading-4"
                              style={{
                                display: '-webkit-box',
                                WebkitLineClamp: 2,
                                WebkitBoxOrient: 'vertical',
                                overflow: 'hidden'
                              }}
                              title={activity.description}
                            >
                              {activity.description}
                            </div>
                          </div>
                        )}
                      </td>
                      <td className="w-1/4 px-6 py-4">
                        <div
                          className="text-gray-500 dark:text-gray-400 break-words overflow-hidden leading-5"
                          style={{
                            display: '-webkit-box',
                            WebkitLineClamp: 2,
                            WebkitBoxOrient: 'vertical',
                            overflow: 'hidden'
                          }}
                          title={activity.category?.name || '-'}
                        >
                          {activity.category?.name || '-'}
                        </div>
                      </td>
                      <td className="w-1/4 px-6 py-4">
                        <div
                          className="text-sm text-gray-500 dark:text-gray-400 break-words overflow-hidden leading-5"
                          style={{
                            display: '-webkit-box',
                            WebkitLineClamp: 2,
                            WebkitBoxOrient: 'vertical',
                            overflow: 'hidden'
                          }}
                          title={activity.location || t('activity.noLocation')}
                        >
                          {activity.location || <span className="text-gray-400 dark:text-gray-500 italic">{t('activity.noLocation')}</span>}
                        </div>
                      </td>
                      <td className="w-1/4 px-6 py-4">
                        <div className="flex items-center text-sm text-gray-500 dark:text-gray-400">
                          <Calendar className="w-4 h-4 mr-1 flex-shrink-0" />
                          <div className="overflow-hidden">
                            {activity.startDate && activity.endDate ? (
                              <>
                                <div className="truncate">{formatDate(activity.startDate)}</div>
                                <div className="text-xs truncate">{t('activity.to')} {formatDate(activity.endDate)}</div>
                              </>
                            ) : (
                              <span className="text-gray-400 dark:text-gray-500 italic">{t('activity.noTimePeriod')}</span>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="w-24 px-6 py-4">
                        <div className="flex justify-center items-center h-full">
                          <span className={`px-4 py-1 text-xs font-semibold rounded-full whitespace-nowrap ${getStatusColor(activity.status)} text-center`}>
                            {getStatusText(activity.status)}
                          </span>
                        </div>
                      </td>
                      <td className="w-28 px-6 py-4 text-sm font-medium">
                        <div className="flex items-center space-x-2">
                          <button
                            onClick={() => onViewClick(activity)}
                            className="text-blue-600 hover:text-blue-900 dark:text-blue-400 dark:hover:text-blue-300 p-1"
                            title={t('category.viewDetails')}
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          {permissions?.update && (
                            <button
                              onClick={() => handleEdit(activity)}
                              className="text-yellow-600 hover:text-yellow-900 dark:text-yellow-400 dark:hover:text-yellow-300 p-1"
                              title={t('category.edit')}
                            >
                              <Edit className="w-4 h-4" />
                            </button>
                          )}
                          {permissions?.delete && (
                            <button
                              onClick={() => onDeleteClick(activity)}
                              className="text-red-700 hover:text-red-900 dark:text-red-500 dark:hover:text-red-400 p-1"
                              title={t('category.delete')}
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {activities.length === 0 && (
              <div className="py-12 text-center">
                <div className="text-gray-500 dark:text-gray-400">
                  {searchTerm || selectedCategoryId || selectedStatus || selectedOrganizationId
                    ? t('activity.noActivitiesFound')
                    : t('activity.noActivities')}
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Pagination */}
      <div className="px-4 py-3 bg-gray-50 border-t border-gray-200 rounded-b-lg dark:bg-gray-900 dark:border-gray-700">
        <Pagination
          currentPage={currentPage}
          totalPages={totalPages}
          total={total}
          limit={limit}
          onPageChange={handlePageChange}
          onLimitChange={(newLimit) => {
            setLimit(newLimit);
            setCurrentPage(1);
            // ✅ TanStack Query auto-refetches when limit/page changes via queryParams
          }}
          showLimitSelector
        />
      </div>
    </div>
  );
};

export default ActivityList;