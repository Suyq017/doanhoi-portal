import React, { useState, useEffect } from 'react';
import { Search, Edit, Trash2, Eye } from 'lucide-react';
import { 
  CtxhCategory, 
  CategoryQueryParams,
  PaginatedResponse
} from '../../types';
import { categoryService } from '../../services';
import { getErrorMessage, debounce } from '../../utils';
import { Pagination } from '../../../../shared/components';

interface CategoryListProps {
  onCreateClick: () => void;
  onEditClick: (category: CtxhCategory) => void;
  onDeleteClick: (category: CtxhCategory) => void;
  onViewDetailClick: (category: CtxhCategory) => void;
  showToast: (type: 'success' | 'error' | 'info', message: string) => void;
  refreshTrigger: number;
}

const CategoryList: React.FC<CategoryListProps> = ({
  onEditClick,
  onDeleteClick,
  onViewDetailClick,
  showToast,
  refreshTrigger
}) => {
  const [categories, setCategories] = useState<CtxhCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [limit, setLimit] = useState(10);

  const debouncedSearch = debounce((term: string) => {
    setCurrentPage(1);
    loadCategories(1, term);
  }, 300);

  const loadCategories = async (page: number = currentPage, search?: string) => {
    try {
      setLoading(true);
      const params: CategoryQueryParams = {
        page,
        limit,
        search: search !== undefined ? search : searchTerm
      };

      const response: PaginatedResponse<CtxhCategory> = await categoryService.findAll(params);
      setCategories(response.data);
      setTotalPages(response.totalPages);
      setTotal(response.total);
      setCurrentPage(response.page);
    } catch (error) {
      console.error('Error loading categories:', error);
      showToast('error', 'Không thể tải danh sách danh mục: ' + getErrorMessage(error));
      setCategories([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCategories();
  }, [refreshTrigger]);

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setSearchTerm(value);
    debouncedSearch(value);
  };

  const handleEdit = (category: CtxhCategory) => {
    onEditClick(category);
  };

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    loadCategories(page);
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
              placeholder="Tìm kiếm danh mục..."
              value={searchTerm}
              onChange={handleSearch}
              className="w-full py-2 pl-10 pr-4 border border-gray-300 rounded-md dark:border-gray-600 focus:ring-2 focus:ring-doan-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
            />
          </div>

          {/* Empty columns for grid layout */}
          <div></div>
          <div></div>
          <div></div>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-hidden bg-white border border-gray-200 rounded-lg shadow-sm dark:bg-gray-800 dark:border-gray-700">
        {loading ? (
          <div className="flex items-center justify-center min-h-[400px]">
            <div className="text-center">
              <div className="w-12 h-12 mx-auto border-b-2 rounded-full animate-spin border-doan-600"></div>
              <p className="mt-4 text-gray-600 dark:text-gray-400">Đang tải danh mục...</p>
            </div>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full table-fixed">
                <thead className="bg-gray-50 dark:bg-gray-900">
                  <tr>
                    <th className="px-6 py-3 text-xs font-medium tracking-wider text-left text-gray-500 uppercase dark:text-gray-400 w-1/4">
                      Tên danh mục
                    </th>
                    <th className="px-6 py-3 text-xs font-medium tracking-wider text-left text-gray-500 uppercase dark:text-gray-400 w-1/2">
                      Mô tả
                    </th>
                    <th className="px-6 py-3 text-xs font-medium tracking-wider text-center text-gray-500 uppercase dark:text-gray-400 w-1/6">
                      Số hoạt động
                    </th>
                    <th className="px-6 py-3 text-xs font-medium tracking-wider text-right text-gray-500 uppercase dark:text-gray-400 w-1/12">
                      Thao tác
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200 dark:bg-gray-800 dark:divide-gray-700">
                  {categories.map((category) => (
                    <tr key={category.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="font-medium text-gray-900 dark:text-white">{category.name}</div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="max-w-lg text-gray-500 dark:text-gray-400">
                          <div 
                            className="overflow-hidden break-words"
                            style={{
                              display: '-webkit-box',
                              WebkitLineClamp: 3,
                              WebkitBoxOrient: 'vertical',
                              lineHeight: '1.4',
                              maxHeight: '4.2em'
                            }}
                            title={category.description || '-'}
                          >
                            {category.description || '-'}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-center whitespace-nowrap">
                        <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300">
                          {category._count?.activities || category.activities_count || 0} hoạt động
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm font-medium whitespace-nowrap">
                        <div className="flex items-center justify-end space-x-2">
                          <button
                            onClick={() => onViewDetailClick(category)}
                            className="text-blue-600 hover:text-blue-900 dark:text-blue-400 dark:hover:text-blue-300"
                            title="Xem chi tiết"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleEdit(category)}
                            className="text-yellow-600 hover:text-yellow-900 dark:text-yellow-400 dark:hover:text-yellow-300"
                            title="Chỉnh sửa"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => onDeleteClick(category)}
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

            {categories.length === 0 && (
              <div className="py-12 text-center">
                <div className="text-gray-500 dark:text-gray-400">
                  {searchTerm ? 'Không tìm thấy danh mục nào' : 'Chưa có danh mục nào. Tạo danh mục đầu tiên.'}
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <Pagination
          currentPage={currentPage}
          totalPages={totalPages}
          total={total}
          limit={limit}
          onPageChange={handlePageChange}
          showLimitSelector={true}
          onLimitChange={(newLimit) => {
            setLimit(newLimit);
            setCurrentPage(1);
          }}
        />
      )}
    </div>
  );
};

export default CategoryList;