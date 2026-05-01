import React, { useState, useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Search, Edit, Trash2, Eye } from 'lucide-react';
import {
  CtxhCategory,
  CategoryQueryParams
} from '../../types';
import { getErrorMessage } from '../../utils';
import { Pagination } from '../../../../shared/components';
import { useCategoryList } from '../../../../shared/hooks/queries';

interface CategoryListProps {
  onCreateClick: () => void;
  onEditClick: (category: CtxhCategory) => void;
  onDeleteClick: (category: CtxhCategory) => void;
  onViewDetailClick: (category: CtxhCategory) => void;
  showToast: (type: 'success' | 'error' | 'info', message: string) => void;
  permissions?: {
    create: boolean;
    update: boolean;
    delete: boolean;
  };
}

const CategoryList: React.FC<CategoryListProps> = ({
  onEditClick,
  onDeleteClick,
  onViewDetailClick,
  showToast,
  permissions
}) => {
  const { t } = useTranslation('ctxh');

  // State for filters
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [limit, setLimit] = useState(10);

  // Debounce search term
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
      setCurrentPage(1); // Reset to page 1 when searching
    }, 300);

    return () => clearTimeout(timer);
  }, [searchTerm]);

  // Build query params
  const queryParams = useMemo<CategoryQueryParams>(() => ({
    page: currentPage,
    limit: limit,
    search: debouncedSearchTerm || undefined,
  }), [currentPage, limit, debouncedSearchTerm]);

  // Use TanStack Query hook
  const {
    data: paginatedData,
    isLoading,
    isError,
    error
  } = useCategoryList(queryParams);

  // Extract data from response
  const categories = paginatedData?.data || [];
  const total = paginatedData?.total || 0;
  const totalPages = paginatedData?.totalPages || 1;

  // Show error toast if query fails
  useEffect(() => {
    if (isError && error) {
      showToast('error', 'Không thể tải danh sách danh mục: ' + getErrorMessage(error));
    }
  }, [isError, error, showToast]);

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setSearchTerm(value);
  };

  const handleEdit = (category: CtxhCategory) => {
    onEditClick(category);
  };

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  const handleLimitChange = (newLimit: number) => {
    setLimit(newLimit);
    setCurrentPage(1); // Reset to page 1 when changing limit
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
              placeholder={t('category.search')}
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
        {isLoading ? (
          <div className="flex items-center justify-center min-h-[400px]">
            <div className="w-12 h-12 mx-auto border-b-2 rounded-full animate-spin border-doan-600"></div>
          </div>
        ) : (
          <>
            {/* Desktop Table */}
            <div className="hidden xl:block overflow-x-auto max-w-full">
              <table className="w-full table-fixed">
                <thead className="bg-gray-50 dark:bg-gray-900">
                  <tr>
                    <th className="w-1/4 px-6 py-3 text-xs font-medium tracking-wider text-left text-gray-500 uppercase dark:text-gray-400">
                      {t('category.name')}
                    </th>
                    <th className="w-1/2 px-6 py-3 text-xs font-medium tracking-wider text-left text-gray-500 uppercase dark:text-gray-400">
                      {t('category.description')}
                    </th>
                    <th className="w-32 px-6 py-3 text-xs font-medium tracking-wider text-center text-gray-500 uppercase dark:text-gray-400">
                      {t('category.activities')}
                    </th>
                    <th className="w-28 px-6 py-3 text-xs font-medium tracking-wider text-right text-gray-500 uppercase dark:text-gray-400">
                      {t('category.actions')}
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200 dark:bg-gray-800 dark:divide-gray-700">
                  {categories.map((category) => (
                    <tr key={category.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                      <td className="w-1/4 px-6 py-4">
                        <div className="font-medium text-gray-900 dark:text-white break-words overflow-hidden">
                          <div
                            className="leading-5"
                            style={{
                              display: '-webkit-box',
                              WebkitLineClamp: 2,
                              WebkitBoxOrient: 'vertical',
                              overflow: 'hidden'
                            }}
                            title={category.name}
                          >
                            {category.name}
                          </div>
                        </div>
                      </td>
                      <td className="w-1/2 px-6 py-4">
                        <div className="text-gray-500 dark:text-gray-400 overflow-hidden">
                          <div
                            className="break-words leading-5"
                            style={{
                              display: '-webkit-box',
                              WebkitLineClamp: 3,
                              WebkitBoxOrient: 'vertical',
                              overflow: 'hidden'
                            }}
                            title={category.description || '-'}
                          >
                            {category.description || '-'}
                          </div>
                        </div>
                      </td>
                      <td className="w-32 px-6 py-4 text-center">
                        <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300">
                          {category._count?.activities || category.activities_count || 0} {t('category.activities')}
                        </span>
                      </td>
                      <td className="w-28 px-6 py-4 text-sm font-medium">
                        <div className="flex items-center justify-end space-x-2">
                          <button
                            onClick={() => onViewDetailClick(category)}
                            className="text-blue-600 hover:text-blue-900 dark:text-blue-400 dark:hover:text-blue-300 p-1"
                            title={t('category.viewDetails')}
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          {permissions?.update && (
                            <button
                              onClick={() => handleEdit(category)}
                              className="text-yellow-600 hover:text-yellow-900 dark:text-yellow-400 dark:hover:text-yellow-300 p-1"
                              title="Chỉnh sửa"
                            >
                              <Edit className="w-4 h-4" />
                            </button>
                          )}
                          {permissions?.delete && (
                            <button
                              onClick={() => onDeleteClick(category)}
                              className="text-red-700 hover:text-red-900 dark:text-red-500 dark:hover:text-red-400 p-1"
                              title="Xóa"
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

            {/* Mobile Cards */}
            <div className="xl:hidden">
              {/* Mobile Table with horizontal scroll */}
              <div className="overflow-x-auto">
                <div className="min-w-full space-y-3 p-4">
                  {categories.map((category) => (
                    <div key={category.id} className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4 min-w-0">
                      <div className="space-y-3">
                        {/* Header with name and actions */}
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex-1 min-w-0">
                            <div className="font-medium text-gray-900 dark:text-white text-base break-words">
                              {category.name}
                            </div>
                          </div>
                          <div className="flex items-center space-x-2 flex-shrink-0">
                            <button
                              onClick={() => onViewDetailClick(category)}
                              className="text-blue-600 hover:text-blue-900 dark:text-blue-400 dark:hover:text-blue-300 p-1"
                              title={t('category.viewDetails')}
                            >
                              <Eye className="w-4 h-4" />
                            </button>
                            {permissions?.update && (
                              <button
                                onClick={() => handleEdit(category)}
                                className="text-yellow-600 hover:text-yellow-900 dark:text-yellow-400 dark:hover:text-yellow-300 p-1"
                                title="Chỉnh sửa"
                              >
                                <Edit className="w-4 h-4" />
                              </button>
                            )}
                            {permissions?.delete && (
                              <button
                                onClick={() => onDeleteClick(category)}
                                className="text-red-700 hover:text-red-900 dark:text-red-500 dark:hover:text-red-400 p-1"
                                title="Xóa"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            )}
                          </div>
                        </div>

                        {/* Description */}
                        {category.description && (
                          <div className="min-w-0">
                            <div className="text-xs text-gray-500 dark:text-gray-400 font-medium uppercase tracking-wider mb-1">
                              {t('category.description')}
                            </div>
                            <div
                              className="text-sm text-gray-500 dark:text-gray-400 break-words overflow-hidden"
                              style={{
                                display: '-webkit-box',
                                WebkitLineClamp: 3,
                                WebkitBoxOrient: 'vertical',
                                lineHeight: '1.4',
                                maxHeight: '4.2em'
                              }}
                              title={category.description}
                            >
                              {category.description}
                            </div>
                          </div>
                        )}

                        {/* Activities count */}
                        <div className="flex items-center justify-between">
                          <div className="text-xs text-gray-500 dark:text-gray-400 font-medium uppercase tracking-wider">
                            {t('category.activities')}
                          </div>
                          <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300">
                            {category._count?.activities || category.activities_count || 0} {t('category.activities')}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {categories.length === 0 && (
              <div className="py-12 text-center">
                <div className="text-gray-500 dark:text-gray-400">
                  {searchTerm ? t('category.noSearchResults') : t('category.noData') + '. ' + t('category.createFirst') + '.'}
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Pagination */}
      <Pagination
        currentPage={currentPage}
        totalPages={totalPages}
        total={total}
        limit={limit}
        onPageChange={handlePageChange}
        showLimitSelector={true}
        onLimitChange={handleLimitChange}
      />
    </div>
  );
};

export default CategoryList;