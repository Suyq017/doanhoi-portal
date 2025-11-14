import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { X, Search } from 'lucide-react';
import { CtxhCategory, CtxhActivity, ActivityQueryParams, PaginatedResponse } from '../../types';
import { activityService } from '../../services';
import { getErrorMessage, debounce } from '../../utils';
import { Pagination } from '../../../../shared/components';

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
  
  const [activities, setActivities] = useState<CtxhActivity[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [limit, setLimit] = useState(10);

  // Debounced search function
  const debouncedSearch = debounce((term: string) => {
    setCurrentPage(1);
    fetchActivities(1, term);
  }, 300);

  // Fetch activities for this category from backend with pagination and search
  const fetchActivities = async (page: number = currentPage, search?: string, newLimit?: number) => {
    if (!category) return;
    
    setLoading(true);
    try {
      const params: ActivityQueryParams = {
        page,
        limit: newLimit !== undefined ? newLimit : limit,
        category_id: category.id,
        search: search !== undefined ? search : searchTerm
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
      setCurrentPage(1);
      setSearchTerm('');
      fetchActivities(1, '');
    }
  }, [isOpen, category]);

  // Handle search input changes
  const handleSearchInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setSearchTerm(value);
    debouncedSearch(value);
  };

  // Handle page change
  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    fetchActivities(page);
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
            {/* Search */}
            <div className="mb-4">
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
                    <table className="w-full table-fixed">
                      <thead className="bg-gray-50 dark:bg-gray-900">
                        <tr>
                          <th className="w-1/3 px-6 py-3 text-xs font-medium tracking-wider text-left text-gray-500 uppercase dark:text-gray-400">
                            {t('activity.name')}
                          </th>
                          <th className="w-24 px-6 py-3 text-xs font-medium tracking-wider text-left text-gray-500 uppercase dark:text-gray-400">
                            {t('activity.status')}
                          </th>
                          <th className="w-32 px-6 py-3 text-xs font-medium tracking-wider text-left text-gray-500 uppercase dark:text-gray-400">
                            {t('activity.time')}
                          </th>
                          <th className="w-32 px-6 py-3 text-xs font-medium tracking-wider text-left text-gray-500 uppercase dark:text-gray-400">
                            {t('activity.location')}
                          </th>
                          <th className="w-32 px-6 py-3 text-xs font-medium tracking-wider text-left text-gray-500 uppercase dark:text-gray-400">
                            {t('activity.unit')}
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200 dark:bg-gray-800 dark:divide-gray-700">
                        {activities.map((activity: CtxhActivity) => {
                          const statusInfo = getStatusDisplay(activity.status);
                          return (
                            <tr key={activity.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                              <td className="w-1/3 px-6 py-4">
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
                              <td className="w-24 px-6 py-4">
                                <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${statusInfo.class}`}>
                                  {statusInfo.text}
                                </span>
                              </td>
                              <td className="w-32 px-6 py-4 text-sm text-gray-500 dark:text-gray-400">
                                <div className="break-words overflow-hidden">
                                  <div className="truncate">{formatDate(activity.startDate)}</div>
                                  <div className="truncate">- {formatDate(activity.endDate)}</div>
                                </div>
                              </td>
                              <td className="w-32 px-6 py-4 text-sm text-gray-500 dark:text-gray-400">
                                <div 
                                  className="break-words overflow-hidden leading-5"
                                  style={{
                                    display: '-webkit-box',
                                    WebkitLineClamp: 2,
                                    WebkitBoxOrient: 'vertical',
                                    overflow: 'hidden'
                                  }}
                                  title={activity.location || '-'}
                                >
                                  {activity.location || '-'}
                                </div>
                              </td>
                              <td className="w-32 px-6 py-4 text-sm text-gray-500 dark:text-gray-400">
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
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>

                  {/* Mobile Cards */}
                  <div className="lg:hidden">
                    <div className="space-y-3 p-4">
                      {activities.map((activity: CtxhActivity) => {
                        const statusInfo = getStatusDisplay(activity.status);
                        return (
                          <div key={activity.id} className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4 space-y-3">
                            {/* Activity Name */}
                            <div>
                              <div className="font-medium text-gray-900 dark:text-white text-base break-words">
                                {activity.name}
                              </div>
                              {activity.description && (
                                <div 
                                  className="mt-1 text-sm text-gray-500 dark:text-gray-400 break-words overflow-hidden"
                                  style={{
                                    display: '-webkit-box',
                                    WebkitLineClamp: 2,
                                    WebkitBoxOrient: 'vertical',
                                    lineHeight: '1.4',
                                    maxHeight: '2.8em'
                                  }}
                                  title={activity.description}
                                >
                                  {activity.description}
                                </div>
                              )}
                            </div>
                            
                            {/* Status */}
                            <div className="flex items-center justify-between">
                              <div className="text-xs text-gray-500 dark:text-gray-400 font-medium uppercase tracking-wider">
                                {t('activity.status')}
                              </div>
                              <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${statusInfo.class}`}>
                                {statusInfo.text}
                              </span>
                            </div>

                            {/* Time */}
                            <div className="flex items-center justify-between">
                              <div className="text-xs text-gray-500 dark:text-gray-400 font-medium uppercase tracking-wider">
                                {t('activity.time')}
                              </div>
                              <div className="text-sm text-gray-500 dark:text-gray-400 text-right">
                                {formatDate(activity.startDate)} - {formatDate(activity.endDate)}
                              </div>
                            </div>

                            {/* Location */}
                            <div className="flex items-center justify-between">
                              <div className="text-xs text-gray-500 dark:text-gray-400 font-medium uppercase tracking-wider">
                                {t('activity.location')}
                              </div>
                              <div className="text-sm text-gray-500 dark:text-gray-400 text-right break-words min-w-0 flex-1 ml-2">
                                {activity.location || '-'}
                              </div>
                            </div>

                            {/* Unit */}
                            <div className="flex items-center justify-between">
                              <div className="text-xs text-gray-500 dark:text-gray-400 font-medium uppercase tracking-wider">
                                {t('activity.unit')}
                              </div>
                              <div className="text-sm text-gray-500 dark:text-gray-400 text-right break-words min-w-0 flex-1 ml-2">
                                {activity.organization?.name || 'Chưa có thông tin tổ chức'}
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
                    fetchActivities(1, undefined, newLimit);
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