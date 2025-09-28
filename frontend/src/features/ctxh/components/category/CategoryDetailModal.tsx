import React, { useState, useEffect } from 'react';
import { X, Search } from 'lucide-react';
import { CtxhCategory, CtxhActivity, ActivityQueryParams, PaginatedResponse } from '../../types';
import { activityService } from '../../services';
import { getErrorMessage } from '../../utils';
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
  const [allActivities, setAllActivities] = useState<CtxhActivity[]>([]);
  const [filteredActivities, setFilteredActivities] = useState<CtxhActivity[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchInput, setSearchInput] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [limit, setLimit] = useState(10);

  // Filter activities based on search
  const filterActivities = (activities: CtxhActivity[], searchTerm: string) => {
    if (!searchTerm) return activities;
    
    const lowerSearchTerm = searchTerm.toLowerCase();
    return activities.filter(activity => 
      activity.name.toLowerCase().includes(lowerSearchTerm) ||
      (activity.description && activity.description.toLowerCase().includes(lowerSearchTerm))
    );
  };

  // Get paginated activities
  const getPaginatedActivities = () => {
    const startIndex = (currentPage - 1) * limit;
    const endIndex = startIndex + limit;
    return filteredActivities.slice(startIndex, endIndex);
  };

  const totalPages = Math.ceil(filteredActivities.length / limit);
  const total = filteredActivities.length;
  const displayedActivities = getPaginatedActivities();

  // Fetch activities for this category
  const fetchActivities = async () => {
    if (!category) return;
    
    setLoading(true);
    try {
      const params: ActivityQueryParams = {
        page: 1,
        limit: 1000, // Get all activities for this category
        category_id: category.id
      };
      
      const response: PaginatedResponse<CtxhActivity> = await activityService.findAll(params);
      console.log('Activities response:', response.data);
      setAllActivities(response.data);
      setFilteredActivities(response.data);
    } catch (error) {
      console.error('Error fetching activities:', getErrorMessage(error));
      setAllActivities([]);
      setFilteredActivities([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen && category) {
      setCurrentPage(1);
      setSearchInput('');
      fetchActivities();
    }
  }, [isOpen, category]);

  // Handle search input changes
  useEffect(() => {
    const filtered = filterActivities(allActivities, searchInput);
    setFilteredActivities(filtered);
    setCurrentPage(1);
  }, [searchInput, allActivities]);

  // Search input handler  
  const handleSearchInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchInput(e.target.value);
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
        <div className="relative w-full max-w-6xl mx-auto overflow-hidden transition-all transform bg-white rounded-lg shadow-xl dark:bg-gray-800">
          {/* Header */}
          <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                  Chi tiết danh mục: {category.name}
                </h3>
                <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                  {category.description || 'Không có mô tả'}
                </p>
              </div>
              <button
                onClick={onClose}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
          </div>

          {/* Content */}
          <div className="px-6 py-4">
            {/* Search */}
            <div className="mb-4">
              <div className="relative">
                <Search className="absolute w-5 h-5 text-gray-400 transform -translate-y-1/2 left-3 top-1/2" />
                <input
                  type="text"
                  placeholder="Tìm kiếm hoạt động..."
                  value={searchInput}
                  onChange={handleSearchInputChange}
                  className="w-full py-2 pl-10 pr-4 border border-gray-300 rounded-md dark:border-gray-600 focus:ring-2 focus:ring-doan-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                />
              </div>
            </div>

            {/* Activities Table */}
            <div className="overflow-hidden border border-gray-200 rounded-lg dark:border-gray-700">
              {loading ? (
                <div className="flex items-center justify-center min-h-[300px]">
                  <div className="text-center">
                    <div className="w-12 h-12 mx-auto border-b-2 rounded-full animate-spin border-doan-600"></div>
                    <p className="mt-4 text-gray-600 dark:text-gray-400">Đang tải hoạt động...</p>
                  </div>
                </div>
              ) : displayedActivities.length === 0 ? (
                <div className="flex items-center justify-center min-h-[300px]">
                  <div className="text-center">
                    <p className="text-gray-500 dark:text-gray-400">
                      {searchInput ? 'Không tìm thấy hoạt động nào' : 'Chưa có hoạt động nào trong danh mục này'}
                    </p>
                  </div>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50 dark:bg-gray-900">
                      <tr>
                        <th className="px-6 py-3 text-xs font-medium tracking-wider text-left text-gray-500 uppercase dark:text-gray-400">
                          Tên hoạt động
                        </th>
                        <th className="px-6 py-3 text-xs font-medium tracking-wider text-left text-gray-500 uppercase dark:text-gray-400">
                          Trạng thái
                        </th>
                        <th className="px-6 py-3 text-xs font-medium tracking-wider text-left text-gray-500 uppercase dark:text-gray-400">
                          Thời gian
                        </th>
                        <th className="px-6 py-3 text-xs font-medium tracking-wider text-left text-gray-500 uppercase dark:text-gray-400">
                          Đơn vị
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200 dark:bg-gray-800 dark:divide-gray-700">
                      {displayedActivities.map((activity) => {
                        const statusInfo = getStatusDisplay(activity.status);
                        console.log('Activity data:', {
                          name: activity.name,
                          status: activity.status,
                          startDate: activity.startDate,
                          endDate: activity.endDate,
                          organizationId: activity.organizationId,
                          organization: activity.organization,
                          organizationKeys: activity.organization ? Object.keys(activity.organization) : 'null',
                          organizationName: activity.organization?.name
                        });
                        return (
                          <tr key={activity.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                            <td className="px-6 py-4">
                              <div>
                                <div className="font-medium text-gray-900 dark:text-white">
                                  {activity.name}
                                </div>
                                {activity.description && (
                                  <div className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                                    <div 
                                      className="overflow-hidden break-words"
                                      style={{
                                        display: '-webkit-box',
                                        WebkitLineClamp: 2,
                                        WebkitBoxOrient: 'vertical',
                                        lineHeight: '1.4',
                                        maxHeight: '2.8em'
                                      }}
                                    >
                                      {activity.description}
                                    </div>
                                  </div>
                                )}
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${statusInfo.class}`}>
                                {statusInfo.text}
                              </span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                              <span>{formatDate(activity.startDate)} - {formatDate(activity.endDate)}</span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                              <span>
                                {activity.organization?.name || 'Chưa có thông tin tổ chức'}
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Pagination */}
            {!loading && displayedActivities.length > 0 && (
              <div className="mt-4">
                <Pagination
                  currentPage={currentPage}
                  totalPages={totalPages}
                  total={total}
                  onPageChange={setCurrentPage}
                  limit={limit}
                  onLimitChange={setLimit}
                  showLimitSelector
                />
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="px-6 py-3 bg-gray-50 dark:bg-gray-900">
            <div className="flex justify-end">
              <button
                onClick={onClose}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 dark:bg-gray-800 dark:text-gray-300 dark:border-gray-600 dark:hover:bg-gray-700"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CategoryDetailModal;