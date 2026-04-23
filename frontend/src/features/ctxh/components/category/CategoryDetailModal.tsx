import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { X, Search, ChevronDown, Eye } from 'lucide-react';
import { CtxhCategory, CtxhActivity, ActivityQueryParams, PaginatedResponse } from '../../types';
import { activityService } from '../../services';
import { organizationService } from '../../../../shared/services';
import { Organization } from '../../../../shared/types/organization';
import { getErrorMessage } from '../../utils';
import { Pagination } from '../../../../shared/components';
import { usePermissions } from '../../../../shared/hooks/usePermissions';

interface CategoryDetailModalProps {
  isOpen: boolean;
  category: CtxhCategory | undefined;
  onClose: () => void;
}

const CategoryDetailModal: React.FC<CategoryDetailModalProps> = ({
  isOpen,
  category,
  onClose
}) => {
  const { t } = useTranslation('ctxh');
  const navigate = useNavigate();
  const { user } = usePermissions();
  const isStudentUser = user?.userType === 'student';

  const [activities, setActivities] = useState<CtxhActivity[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [limit, setLimit] = useState(10);

  // Filter states
  const [selectedStatus, setSelectedStatus] = useState('');
  const [selectedOrganizationId, setSelectedOrganizationId] = useState('');
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [loadingOrganizations, setLoadingOrganizations] = useState(false);

  // Combobox states
  const [statusSearch, setStatusSearch] = useState('');
  const [organizationSearch, setOrganizationSearch] = useState('');
  const [statusDropdownOpen, setStatusDropdownOpen] = useState(false);
  const [organizationDropdownOpen, setOrganizationDropdownOpen] = useState(false);

  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const organizationSearchTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const statusOptions = isStudentUser
    ? [
        { value: 'ACTIVE', label: t('activity.statusOptions.ACTIVE') },
        { value: 'COMPLETED', label: t('activity.statusOptions.COMPLETED') }
      ]
    : [
        { value: 'DRAFT', label: t('activity.statusOptions.DRAFT') },
        { value: 'ACTIVE', label: t('activity.statusOptions.ACTIVE') },
        { value: 'COMPLETED', label: t('activity.statusOptions.COMPLETED') },
        { value: 'CANCELLED', label: t('activity.statusOptions.CANCELLED') }
      ];

  const filteredStatuses = statusOptions.filter(status =>
    status.label.toLowerCase().includes(statusSearch.toLowerCase())
  );

  const getSelectedStatusName = () => {
    const status = statusOptions.find(s => s.value === selectedStatus);
    return status ? status.label : t('activity.allStatuses');
  };

  const getSelectedOrganizationName = () => {
    const organization = organizations.find(o => o.id === selectedOrganizationId);
    return organization ? organization.name : t('activity.allOrganizations');
  };

  const loadOrganizations = async (search?: string) => {
    try {
      setLoadingOrganizations(true);
      const response = await organizationService.searchCtxhActivityViewableOrganizations({
        page: 1,
        limit: 20,
        search: search || undefined
      });
      setOrganizations(response.data);
    } catch (error) {
      console.error('Failed to load organizations:', error);
    } finally {
      setLoadingOrganizations(false);
    }
  };

  const handleOrganizationSearch = (term: string) => {
    if (organizationSearchTimeoutRef.current) {
      clearTimeout(organizationSearchTimeoutRef.current);
    }
    organizationSearchTimeoutRef.current = setTimeout(() => {
      loadOrganizations(term);
    }, 300);
  };

  // Fetch activities for this category from backend with pagination and search
  const fetchActivities = async (
    page: number = currentPage,
    search?: string,
    newLimit?: number,
    status?: string,
    organizationId?: string
  ) => {
    if (!category) return;

    setLoading(true);
    try {
      const params: ActivityQueryParams = {
        page,
        limit: newLimit !== undefined ? newLimit : limit,
        category_id: category.id,
        search: search !== undefined ? search : searchTerm,
        status: status !== undefined ? status as any : (selectedStatus as any || undefined),
        organization_id: organizationId !== undefined ? organizationId : (selectedOrganizationId || undefined)
      };

      const response: PaginatedResponse<CtxhActivity> = await activityService.findAll(params);
      setActivities(response.data);
      setTotalPages(response.totalPages);
      setTotal(response.total);
      setCurrentPage(response.page);
    } catch (error) {
      console.error('Error fetching activities:', getErrorMessage(error));
      setActivities([]);
      setTotalPages(1);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen && category) {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
        searchTimeoutRef.current = null;
      }
      setCurrentPage(1);
      setSearchTerm('');
      setSelectedStatus('');
      setSelectedOrganizationId('');
      setStatusSearch('');
      setOrganizationSearch('');
      setStatusDropdownOpen(false);
      setOrganizationDropdownOpen(false);
      fetchActivities(1, '', undefined, '', '');
    }
  }, [isOpen, category]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Element;
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

  useEffect(() => {
    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
      if (organizationSearchTimeoutRef.current) {
        clearTimeout(organizationSearchTimeoutRef.current);
      }
    };
  }, []);

  // Handle search input changes
  const handleSearchInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setSearchTerm(value);

    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    searchTimeoutRef.current = setTimeout(() => {
      setCurrentPage(1);
      fetchActivities(1, value, undefined, selectedStatus, selectedOrganizationId);
    }, 700);
  };

  const handleStatusChange = (status: string) => {
    setSelectedStatus(status);
    setStatusDropdownOpen(false);
    setStatusSearch('');
    setCurrentPage(1);
    fetchActivities(1, searchTerm, undefined, status, selectedOrganizationId);
  };

  const handleOrganizationChange = (organizationId: string) => {
    setSelectedOrganizationId(organizationId);
    setOrganizationDropdownOpen(false);
    setOrganizationSearch('');
    setCurrentPage(1);
    fetchActivities(1, searchTerm, undefined, selectedStatus, organizationId);
  };

  const handleViewActivityDetail = (activity: CtxhActivity) => {
    if (!category) return;

    navigate(`/portal/ctxh/activities/${activity.id}`, {
      state: {
        from: 'category-detail',
        category,
      },
    });
  };

  // Handle page change
  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    fetchActivities(page, searchTerm, undefined, selectedStatus, selectedOrganizationId);
  };

  // Format date
  const formatDate = (date: string | undefined) => {
    if (!date) return '-';
    try {
      const d = new Date(date);
      if (isNaN(d.getTime())) return '-';

      return d.toLocaleDateString('vi-VN', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
      });
    } catch {
      return '-';
    }
  };

  // Format activity status
  const getStatusDisplay = (status: string) => {
    const statusMap: { [key: string]: { text: string; class: string } } = {
      'ACTIVE': { text: 'Đang hoạt động', class: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300' },
      'active': { text: 'Đang hoạt động', class: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300' },
      'COMPLETED': { text: 'Hoàn thành', class: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300' },
      'completed': { text: 'Hoàn thành', class: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300' },
      'DRAFT': { text: 'Nháp', class: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300' },
      'draft': { text: 'Nháp', class: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300' },
      'pending': { text: 'Chờ duyệt', class: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300' },
      'CANCELLED': { text: 'Đã hủy', class: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300' },
      'cancelled': { text: 'Đã hủy', class: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300' }
    };
    return statusMap[status] || { text: status, class: 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300' };
  };

  if (!isOpen || !category) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:p-0">
        {/* Background overlay */}
        <div
          className="fixed inset-0 bg-black bg-opacity-50"
          onClick={onClose}
        />

        {/* Modal */}
        <div className="relative w-full max-w-6xl mx-auto overflow-hidden transition-all transform bg-white rounded-lg shadow-xl dark:bg-gray-800 max-h-[90vh] flex flex-col">
          {/* Header */}
          <div className="px-4 sm:px-6 py-4 border-b border-gray-200 dark:border-gray-700 flex-shrink-0">
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0 flex-1">
                <h3
                  className="text-lg font-medium text-gray-900 dark:text-white break-words overflow-wrap-anywhere leading-6"
                  title={`${t('category.details')}: ${category.name}`}
                >
                  {t('category.details')}: {category.name}
                </h3>
                {category.description && (
                  <p
                    className="mt-1 text-sm text-gray-500 dark:text-gray-400 break-words overflow-wrap-anywhere leading-5"
                    title={category.description}
                  >
                    {category.description}
                  </p>
                )}
              </div>
              <button
                onClick={onClose}
                className="flex-shrink-0 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 p-1"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
          </div>

          {/* Content */}
          <div className="px-4 sm:px-6 py-4 flex-1 overflow-y-auto">
            {/* Filters */}
            <div className="mb-4 grid grid-cols-1 gap-3 md:grid-cols-3">
              <div className="relative">
                <Search className="absolute w-5 h-5 text-gray-400 transform -translate-y-1/2 left-3 top-1/2" />
                <input
                  type="text"
                  placeholder={t('category.searchActivities')}
                  value={searchTerm}
                  onChange={handleSearchInputChange}
                  className="w-full py-2 pl-10 pr-4 border border-gray-300 rounded-md dark:border-gray-600 focus:ring-2 focus:ring-doan-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                />
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
                      handleOrganizationSearch(value);
                    }}
                    onFocus={() => {
                      setOrganizationDropdownOpen(true);
                      setOrganizationSearch('');
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
                            className={`w-full text-left px-3 py-2 hover:bg-gray-100 dark:hover:bg-gray-600 focus:bg-gray-100 dark:focus:bg-gray-600 focus:outline-none ${!selectedOrganizationId ? 'bg-blue-50 text-blue-700 dark:bg-blue-900 dark:text-blue-300' : 'text-gray-900 dark:text-white'}`}
                          >
                            {t('activity.allOrganizations')}
                          </button>
                          {organizations.length > 0 ? (
                            organizations.map((organization) => (
                              <button
                                key={organization.id}
                                type="button"
                                onClick={() => handleOrganizationChange(organization.id)}
                                className={`w-full text-left px-3 py-2 hover:bg-gray-100 dark:hover:bg-gray-600 focus:bg-gray-100 dark:focus:bg-gray-600 focus:outline-none ${selectedOrganizationId === organization.id ? 'bg-blue-50 text-blue-700 dark:bg-blue-900 dark:text-blue-300' : 'text-gray-900 dark:text-white'}`}
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
                        className={`w-full text-left px-3 py-2 hover:bg-gray-100 dark:hover:bg-gray-600 focus:bg-gray-100 dark:focus:bg-gray-600 focus:outline-none ${!selectedStatus ? 'bg-blue-50 text-blue-700 dark:bg-blue-900 dark:text-blue-300' : 'text-gray-900 dark:text-white'}`}
                      >
                        {t('activity.allStatuses')}
                      </button>
                      {filteredStatuses.length > 0 ? (
                        filteredStatuses.map((status) => (
                          <button
                            key={status.value}
                            type="button"
                            onClick={() => handleStatusChange(status.value)}
                            className={`w-full text-left px-3 py-2 hover:bg-gray-100 dark:hover:bg-gray-600 focus:bg-gray-100 dark:focus:bg-gray-600 focus:outline-none ${selectedStatus === status.value ? 'bg-blue-50 text-blue-700 dark:bg-blue-900 dark:text-blue-300' : 'text-gray-900 dark:text-white'}`}
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
            </div>

            {/* Activities Content */}
            <div className="border border-gray-200 rounded-lg dark:border-gray-700">
              {loading ? (
                <div className="flex items-center justify-center min-h-[300px]">
                  <div className="w-12 h-12 mx-auto border-b-2 rounded-full animate-spin border-doan-600"></div>
                </div>
              ) : activities.length === 0 ? (
                <div className="flex items-center justify-center min-h-[300px]">
                  <div className="text-center">
                    <p className="text-gray-500 dark:text-gray-400">
                      {searchTerm ? t('activity.noSearchResults') : t('category.noActivities')}
                    </p>
                  </div>
                </div>
              ) : (
                <>
                  {/* Desktop Table */}
                  <div className="hidden lg:block overflow-x-auto max-w-full">
                    <table className="w-full">
                      <thead className="bg-gray-50 dark:bg-gray-900">
                        <tr>
                          <th className="px-6 py-3 text-xs font-medium tracking-wider text-left text-gray-500 uppercase dark:text-gray-400 align-top" style={{ width: '30%' }}>
                            {t('activity.name')}
                          </th>
                          <th className="px-6 py-3 text-xs font-medium tracking-wider text-left text-gray-500 uppercase dark:text-gray-400 align-top" style={{ width: '15%' }}>
                            {t('activity.status')}
                          </th>
                          <th className="px-6 py-3 text-xs font-medium tracking-wider text-left text-gray-500 uppercase dark:text-gray-400 align-top" style={{ width: '18%' }}>
                            {t('activity.time')}
                          </th>
                          <th className="px-6 py-3 text-xs font-medium tracking-wider text-left text-gray-500 uppercase dark:text-gray-400 align-top" style={{ width: '18%' }}>
                            {t('activity.location')}
                          </th>
                          <th className="px-6 py-3 text-xs font-medium tracking-wider text-left text-gray-500 uppercase dark:text-gray-400 align-top" style={{ width: '19%' }}>
                            {t('activity.unit')}
                          </th>
                          <th className="px-6 py-3 text-xs font-medium tracking-wider text-right text-gray-500 uppercase dark:text-gray-400 align-top" style={{ width: '10%' }}>
                            {t('category.actions')}
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200 dark:bg-gray-800 dark:divide-gray-700">
                        {activities.map((activity: CtxhActivity) => {
                          const statusInfo = getStatusDisplay(activity.status);
                          return (
                            <tr key={activity.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                              <td className="px-6 py-4 align-top text-left" style={{ width: '30%' }}>
                                <div className="overflow-hidden">
                                  <div
                                    className="font-medium text-gray-900 dark:text-white break-words leading-5"
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
                                </div>
                              </td>
                              <td className="px-6 py-4 align-top text-left" style={{ width: '15%' }}>
                                <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${statusInfo.class}`}>
                                  {statusInfo.text}
                                </span>
                              </td>
                              <td className="px-6 py-4 text-sm text-gray-500 dark:text-gray-400 align-top text-left" style={{ width: '18%' }}>
                                <div className="break-words overflow-hidden">
                                  {activity.startDate && activity.endDate ? (
                                    <>
                                      <div className="truncate">{formatDate(activity.startDate)}</div>
                                      <div className="truncate">- {formatDate(activity.endDate)}</div>
                                    </>
                                  ) : (
                                    <span className="text-gray-400 dark:text-gray-500 italic">{t('activity.noTimePeriod')}</span>
                                  )}
                                </div>
                              </td>
                              <td className="px-6 py-4 text-sm text-gray-500 dark:text-gray-400 align-top text-left" style={{ width: '18%' }}>
                                <div
                                  className="break-words overflow-hidden leading-5"
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
                              <td className="px-6 py-4 text-sm text-gray-500 dark:text-gray-400 align-top text-left" style={{ width: '19%' }}>
                                <div
                                  className="break-words overflow-hidden leading-5"
                                  style={{
                                    display: '-webkit-box',
                                    WebkitLineClamp: 2,
                                    WebkitBoxOrient: 'vertical',
                                    overflow: 'hidden'
                                  }}
                                  title={activity.organization?.name || 'Chưa có thông tin tổ chức'}
                                >
                                  {activity.organization?.name || 'Chưa có thông tin tổ chức'}
                                </div>
                              </td>
                              <td className="px-6 py-4 align-top text-right" style={{ width: '10%' }}>
                                <button
                                  onClick={() => handleViewActivityDetail(activity)}
                                  className="text-blue-600 hover:text-blue-900 dark:text-blue-400 dark:hover:text-blue-300 p-1"
                                  title={t('category.viewDetails')}
                                >
                                  <Eye className="w-4 h-4" />
                                </button>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>

                  {/* Mobile Cards */}
                  <div className="lg:hidden">
                    <div className="divide-y divide-gray-200 dark:divide-gray-600">
                      {activities.map((activity: CtxhActivity) => {
                        const statusInfo = getStatusDisplay(activity.status);
                        return (
                          <div key={activity.id} className="p-4 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                            {/* Activity Name & Status */}
                            <div className="flex items-start justify-between gap-3 mb-3">
                              <div className="flex-1 min-w-0">
                                <div className="font-semibold text-gray-900 dark:text-white text-base break-words leading-tight">
                                  {activity.name}
                                </div>
                                {activity.description && (
                                  <div
                                    className="mt-1.5 text-sm text-gray-600 dark:text-gray-400 break-words"
                                    style={{
                                      display: '-webkit-box',
                                      WebkitLineClamp: 2,
                                      WebkitBoxOrient: 'vertical',
                                      overflow: 'hidden',
                                      lineHeight: '1.4'
                                    }}
                                    title={activity.description}
                                  >
                                    {activity.description}
                                  </div>
                                )}
                              </div>
                              <div className="flex items-center gap-2 flex-shrink-0">
                                <span className={`inline-flex px-2.5 py-1 text-xs font-semibold rounded-full whitespace-nowrap ${statusInfo.class}`}>
                                  {statusInfo.text}
                                </span>
                                <button
                                  onClick={() => handleViewActivityDetail(activity)}
                                  className="text-blue-600 hover:text-blue-900 dark:text-blue-400 dark:hover:text-blue-300 p-1"
                                  title={t('category.viewDetails')}
                                >
                                  <Eye className="w-4 h-4" />
                                </button>
                              </div>
                            </div>

                            {/* Divider */}
                            <div className="border-t border-gray-200 dark:border-gray-600 my-3"></div>

                            {/* Info Grid */}
                            <div className="space-y-2.5">
                              {/* Time */}
                              <div className="flex items-start gap-2">
                                <div className="text-xs text-gray-500 dark:text-gray-400 font-medium uppercase tracking-wider min-w-[80px] pt-0.5">
                                  {t('activity.time')}
                                </div>
                                <div className="text-sm text-gray-700 dark:text-gray-300 flex-1">
                                  {activity.startDate && activity.endDate ? (
                                    <>
                                      <div>{formatDate(activity.startDate)}</div>
                                      <div className="text-gray-500 dark:text-gray-400">đến {formatDate(activity.endDate)}</div>
                                    </>
                                  ) : (
                                    <span className="text-gray-400 dark:text-gray-500 italic">{t('activity.noTimePeriod')}</span>
                                  )}
                                </div>
                              </div>

                              {/* Location */}
                              <div className="flex items-start gap-2">
                                <div className="text-xs text-gray-500 dark:text-gray-400 font-medium uppercase tracking-wider min-w-[80px] pt-0.5">
                                  {t('activity.location')}
                                </div>
                                <div className="text-sm text-gray-700 dark:text-gray-300 flex-1 break-words">
                                  {activity.location || <span className="text-gray-400 dark:text-gray-500 italic">{t('activity.noLocation')}</span>}
                                </div>
                              </div>

                              {/* Unit */}
                              <div className="flex items-start gap-2">
                                <div className="text-xs text-gray-500 dark:text-gray-400 font-medium uppercase tracking-wider min-w-[80px] pt-0.5">
                                  {t('activity.unit')}
                                </div>
                                <div className="text-sm text-gray-700 dark:text-gray-300 flex-1 break-words">
                                  {activity.organization?.name || 'Chưa có thông tin tổ chức'}
                                </div>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* Pagination */}
            {!loading && (
              <div className="mt-4">
                <Pagination
                  currentPage={currentPage}
                  totalPages={totalPages}
                  total={total}
                  onPageChange={handlePageChange}
                  limit={limit}
                  onLimitChange={(newLimit) => {
                    setLimit(newLimit);
                    setCurrentPage(1);
                    fetchActivities(1, searchTerm, newLimit, selectedStatus, selectedOrganizationId);
                  }}
                  showLimitSelector
                />
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="px-4 sm:px-6 py-3 bg-gray-50 dark:bg-gray-900 flex-shrink-0">
            <div className="flex justify-end">
              <button
                onClick={onClose}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 dark:bg-gray-800 dark:text-gray-300 dark:border-gray-600 dark:hover:bg-gray-700"
              >
                {t('category.close')}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CategoryDetailModal;