import React, { useState, useEffect } from 'react';
import { Search, Edit, Trash2, Eye, Calendar } from 'lucide-react';
import { 
  CtxhActivity, 
  ActivityQueryParams,
  PaginatedResponse,
  CtxhCategory,
  ActivityStatus
} from '../../types';
import { activityService, categoryService } from '../../services';
import { getErrorMessage, debounce } from '../../utils';
import { Pagination } from '../../../../shared/components';

interface ActivityListProps {
  onCreateClick: () => void;
  onEditClick: (activity: CtxhActivity) => void;
  onDeleteClick: (activity: CtxhActivity) => void;
  onViewClick: (activity: CtxhActivity) => void;
  showToast: (type: 'success' | 'error' | 'info', message: string) => void;
  refreshTrigger: number;
}

const ActivityList: React.FC<ActivityListProps> = ({
  onEditClick,
  onDeleteClick,
  onViewClick,
  showToast,
  refreshTrigger
}) => {
  const [activities, setActivities] = useState<CtxhActivity[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [limit, setLimit] = useState(10);
  
  // Filter states
  const [selectedCategoryId, setSelectedCategoryId] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('');
  const [categories, setCategories] = useState<CtxhCategory[]>([]);
  const [categoriesLoading, setCategoriesLoading] = useState(false);

  // Create debounced search function
  const debouncedSearchRef = React.useRef(
    debounce((term: string, categoryId: string, status: string) => {
      setCurrentPage(1);
      loadActivities(1, term, categoryId, status);
    }, 300)
  );

  // Load categories
  const loadCategories = async () => {
    try {
      setCategoriesLoading(true);
      const response = await categoryService.findAll({
        page: 1,
        limit: 100 // Get all categories for filter
      });
      setCategories(response.data);
    } catch (error) {
      console.error('Failed to load categories:', error);
      showToast('error', 'Không thể tải danh sách danh mục');
    } finally {
      setCategoriesLoading(false);
    }
  };

  const loadActivities = async (page: number = currentPage, search?: string, categoryId?: string, status?: string) => {
    try {
      setLoading(true);
      
      // Determine which values to use
      const searchValue = search !== undefined ? search : searchTerm;
      const categoryIdValue = categoryId !== undefined ? categoryId : selectedCategoryId;
      const statusValue = status !== undefined ? status : selectedStatus;
      
      const params: ActivityQueryParams = {
        page,
        limit,
        ...(searchValue && { search: searchValue }),
        ...(categoryIdValue && { category_id: categoryIdValue }),
        ...(statusValue && { status: statusValue as ActivityStatus })
      };

      const response: PaginatedResponse<CtxhActivity> = await activityService.findAll(params);
      setActivities(response.data);
      setTotalPages(response.totalPages);
      setTotal(response.total);
      setCurrentPage(response.page);
    } catch (error) {
      console.error('Error loading activities:', error);
      showToast('error', 'Không thể tải danh sách hoạt động: ' + getErrorMessage(error));
      setActivities([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadActivities();
    loadCategories();
  }, [refreshTrigger]);

  // Filter change handlers
  useEffect(() => {
    setCurrentPage(1);
    loadActivities(1, searchTerm, selectedCategoryId, selectedStatus);
  }, [selectedCategoryId, selectedStatus]);

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setSearchTerm(value);
    debouncedSearchRef.current(value, selectedCategoryId, selectedStatus);
  };

  const handleCategoryChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setSelectedCategoryId(e.target.value);
  };

  const handleStatusChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setSelectedStatus(e.target.value);
  };

  const handleEdit = (activity: CtxhActivity) => {
    onEditClick(activity);
  };

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    loadActivities(page, searchTerm, selectedCategoryId, selectedStatus);
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
        return 'Đang hoạt động';
      case 'DRAFT':
        return 'Nháp';
      case 'COMPLETED':
        return 'Hoàn thành';
      case 'CANCELLED':
        return 'Đã hủy';
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
        <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
          {/* Search */}
          <div className="relative">
            <Search className="absolute w-5 h-5 text-gray-400 transform -translate-y-1/2 left-3 top-1/2" />
            <input
              type="text"
              placeholder="Tìm kiếm hoạt động..."
              value={searchTerm}
              onChange={handleSearch}
              className="w-full py-2 pl-10 pr-4 border border-gray-300 rounded-md dark:border-gray-600 focus:ring-2 focus:ring-doan-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
            />
          </div>

          {/* Category Filter */}
          <div>
            <select
              value={selectedCategoryId}
              onChange={handleCategoryChange}
              disabled={categoriesLoading}
              className="w-full py-2 px-3 border border-gray-300 rounded-md dark:border-gray-600 focus:ring-2 focus:ring-doan-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
            >
              <option value="">Tất cả danh mục</option>
              {categories.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </select>
          </div>

          {/* Status Filter */}
          <div>
            <select
              value={selectedStatus}
              onChange={handleStatusChange}
              className="w-full py-2 px-3 border border-gray-300 rounded-md dark:border-gray-600 focus:ring-2 focus:ring-doan-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
            >
              <option value="">Tất cả trạng thái</option>
              <option value={ActivityStatus.DRAFT}>Nháp</option>
              <option value={ActivityStatus.ACTIVE}>Đang hoạt động</option>
              <option value={ActivityStatus.COMPLETED}>Hoàn thành</option>
              <option value={ActivityStatus.CANCELLED}>Đã hủy</option>
            </select>
          </div>

          {/* Empty column for grid layout */}
          <div></div>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-hidden bg-white border border-gray-200 rounded-lg shadow-sm dark:bg-gray-800 dark:border-gray-700">
        {loading ? (
          <div className="flex items-center justify-center min-h-[400px]">
            <div className="text-center">
              <div className="w-12 h-12 mx-auto border-b-2 rounded-full animate-spin border-doan-600"></div>
              <p className="mt-4 text-gray-600 dark:text-gray-400">Đang tải hoạt động...</p>
            </div>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full table-auto">
                <thead className="bg-gray-50 dark:bg-gray-900">
                  <tr>
                    <th className="px-6 py-3 text-xs font-medium tracking-wider text-left text-gray-500 uppercase dark:text-gray-400">
                      Tên hoạt động
                    </th>
                    <th className="px-6 py-3 text-xs font-medium tracking-wider text-left text-gray-500 uppercase dark:text-gray-400">
                      Danh mục
                    </th>
                    <th className="px-6 py-3 text-xs font-medium tracking-wider text-left text-gray-500 uppercase dark:text-gray-400">
                      Thời gian
                    </th>
                    <th className="px-6 py-3 text-xs font-medium tracking-wider text-left text-gray-500 uppercase dark:text-gray-400">
                      Trạng thái
                    </th>
                    <th className="px-6 py-3 text-xs font-medium tracking-wider text-left text-gray-500 uppercase dark:text-gray-400">
                      Thao tác
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200 dark:bg-gray-800 dark:divide-gray-700">
                  {activities.map((activity) => (
                    <tr key={activity.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                      <td className="px-6 py-4">
                        <div className="font-medium text-gray-900 dark:text-white">{activity.name}</div>
                        {activity.description && (
                          <div className="text-sm text-gray-500 dark:text-gray-400 max-w-lg">
                            <div 
                              className="overflow-hidden break-words"
                              style={{
                                display: '-webkit-box',
                                WebkitLineClamp: 3,
                                WebkitBoxOrient: 'vertical',
                                lineHeight: '1.4',
                                maxHeight: '4.2em'
                              }}
                              title={activity.description}
                            >
                              {activity.description}
                            </div>
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-gray-500 dark:text-gray-400">
                          {activity.category?.name || '-'}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center text-sm text-gray-500 dark:text-gray-400">
                          <Calendar className="w-4 h-4 mr-1" />
                          <div>
                            <div>{activity.startDate ? formatDate(activity.startDate) : '-'}</div>
                            {activity.endDate && (
                              <div className="text-xs">đến {formatDate(activity.endDate)}</div>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span
                          className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(activity.status)}`}
                        >
                          {getStatusText(activity.status)}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm font-medium whitespace-nowrap">
                        <div className="flex items-center space-x-2">
                          <button
                            onClick={() => onViewClick(activity)}
                            className="text-blue-600 hover:text-blue-900 dark:text-blue-400 dark:hover:text-blue-300"
                            title="Xem chi tiết"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleEdit(activity)}
                            className="text-yellow-600 hover:text-yellow-900 dark:text-yellow-400 dark:hover:text-yellow-300"
                            title="Chỉnh sửa"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => onDeleteClick(activity)}
                            className="text-red-700 hover:text-red-900 dark:text-red-500 dark:hover:text-red-400"
                            title="Xóa"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
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
                  {searchTerm ? 'Không tìm thấy hoạt động nào' : 'Chưa có hoạt động nào. Tạo hoạt động đầu tiên.'}
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="px-4 py-3 bg-gray-50 border-t border-gray-200 rounded-b-lg dark:bg-gray-900 dark:border-gray-700">
          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            total={total}
            limit={limit}
            onPageChange={handlePageChange}
            onLimitChange={(newLimit) => setLimit(newLimit)}
            showLimitSelector={true}
          />
        </div>
      )}
    </div>
  );
};

export default ActivityList;