import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Edit, Trash2, RotateCcw, Building2, Settings, Search } from 'lucide-react';
import { CtxhLimitConfig, LimitConfigQueryParams, LimitConfigStatus } from '../../types';
import { limitConfigService } from '../../services/limitConfigService';
import { ToastType } from '../../../../shared/components/Toast';
import { Pagination } from '../../../../shared/components';

interface LimitConfigListProps {
  onCreateClick: () => void;
  onEditClick: (config: CtxhLimitConfig) => void;
  onDeleteClick: (config: CtxhLimitConfig) => void;
  onRestoreClick: (config: CtxhLimitConfig) => void;
  showToast: (type: ToastType, message: string) => void;
  refreshTrigger: number;
}

const LimitConfigList: React.FC<LimitConfigListProps> = ({
  onCreateClick,
  onEditClick,
  onDeleteClick,
  onRestoreClick,
  showToast,
  refreshTrigger
}) => {
  const { t } = useTranslation('ctxh');
  
  // Format number to remove unnecessary decimal places
  const formatNumber = (num: number): string => {
    // Nếu là số nguyên (ví dụ: 5.0), hiển thị không có phần thập phân (5)
    // Nếu có phần thập phân (ví dụ: 5.5), hiển thị đầy đủ (5.5)
    return num % 1 === 0 ? Math.floor(num).toString() : num.toString();
  };
  
  // Translate error messages from server
  const translateError = (error: any): string => {
    const message = error?.message || error?.toString() || '';
    
    // Common server error patterns
    if (message.includes('tồn tại cấu hình') || message.includes('already exists')) {
      return t('limitConfig.errors.alreadyExists');
    }
    if (message.includes('không tìm thấy') || message.includes('not found')) {
      return t('limitConfig.errors.notFound');
    }
    if (message.includes('không có quyền') || message.includes('permission')) {
      return t('limitConfig.errors.noPermission');
    }
    
    // Return original message if no translation found
    return message || t('limitConfig.errors.unknown');
  };
  // State
  const [configs, setConfigs] = useState<CtxhLimitConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [searchTerm, setSearchTerm] = useState('');
  const [limit, setLimit] = useState(20);
  const [filters, setFilters] = useState<LimitConfigQueryParams>({
    page: 1,
    limit: 20
  });

  // Debounce search to avoid too many API calls
  const [searchTimeout, setSearchTimeout] = useState<NodeJS.Timeout | null>(null);

  // Load configs
  const loadConfigs = async () => {
    try {
      setLoading(true);
      console.log('Loading configs with filters:', filters);
      const response = await limitConfigService.findAll(filters);
      console.log('API response:', response);
      
      setConfigs(response.data || []);
      setCurrentPage(response.page || 1);
      setTotalPages(response.totalPages || 1);
      setTotal(response.total || 0);
      
      // Sync the limit state with actual response
      if (response.limit && response.limit !== filters.limit) {
        setLimit(response.limit);
      }
    } catch (error) {
      const errorMessage = translateError(error);
      showToast('error', errorMessage);
      
      // Clear data on error
      setConfigs([]);
      setCurrentPage(1);
      setTotalPages(1);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  };

  // Effects
  useEffect(() => {
    loadConfigs();
  }, [filters, refreshTrigger]);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (searchTimeout) {
        clearTimeout(searchTimeout);
      }
    };
  }, [searchTimeout]);

  // Handlers
  const handlePageChange = (page: number) => {
    console.log('Page change requested:', page, 'Current filters:', filters);
    setFilters(prev => ({ ...prev, page }));
  };

  const handleLimitChange = (newLimit: number) => {
    console.log('Limit change requested:', newLimit);
    setLimit(newLimit);
    setFilters(prev => ({ 
      ...prev, 
      limit: newLimit,
      page: 1 // Reset to first page when changing limit
    }));
  };

  const handleStatusFilterChange = (status: LimitConfigStatus | 'ALL') => {
    console.log('Status filter change:', status);
    setFilters(prev => ({ 
      ...prev, 
      status: status === 'ALL' ? undefined : status,
      page: 1 
    }));
  };

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setSearchTerm(value);

    // Clear existing timeout
    if (searchTimeout) {
      clearTimeout(searchTimeout);
    }

    // Set new timeout for debounced search
    const timeout = setTimeout(() => {
      setFilters(prev => ({ 
        ...prev, 
        search: value.trim() || undefined,
        page: 1 
      }));
    }, 500); // Wait 500ms after user stops typing

    setSearchTimeout(timeout);
  };

  // Remove the frontend filtering since we're using API search now
  // All filtering is now handled by the backend API

  // Status display
  const getStatusDisplay = (status: LimitConfigStatus, isDeleted: boolean = false) => {
    if (isDeleted) {
      return (
        <span className="px-2 py-1 text-xs font-medium rounded-full border bg-red-100 text-red-800 border-red-200">
          {t('limitConfig.statusOptions.DELETED')}
        </span>
      );
    }

    const statusConfig = {
      [LimitConfigStatus.ACTIVE]: {
        text: t('limitConfig.statusOptions.ACTIVE'),
        className: 'bg-green-100 text-green-800 border-green-200'
      },
      [LimitConfigStatus.INACTIVE]: {
        text: t('limitConfig.statusOptions.INACTIVE'),
        className: 'bg-gray-100 text-gray-800 border-gray-200'
      },
      [LimitConfigStatus.DRAFT]: {
        text: t('limitConfig.statusOptions.DRAFT'),
        className: 'bg-yellow-100 text-yellow-800 border-yellow-200'
      }
    };

    const config = statusConfig[status];
    return (
      <span className={`px-2 py-1 text-xs font-medium rounded-full border ${config.className}`}>
        {config.text}
      </span>
    );
  };

  // Loading state
  if (loading) {
    return (
      <div className="flex justify-center items-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-doan-500"></div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Search and Filters */}
      <div className="flex flex-col sm:flex-row gap-4 justify-between">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
          <input
            type="text"
            placeholder={t('limitConfig.search')}
            value={searchTerm}
            onChange={handleSearchChange}
            className="pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-doan-500 focus:border-doan-500 block w-full sm:text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
          />
        </div>
        
        <div className="flex items-center space-x-4">
          <select
            value={filters.status || 'ALL'}
            onChange={(e) => handleStatusFilterChange(e.target.value as LimitConfigStatus | 'ALL')}
            className="border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-doan-500 focus:border-doan-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
          >
            <option value="ALL">{t('limitConfig.allStatuses')}</option>
            <option value={LimitConfigStatus.ACTIVE}>{t('limitConfig.statusOptions.ACTIVE')}</option>
            <option value={LimitConfigStatus.INACTIVE}>{t('limitConfig.statusOptions.INACTIVE')}</option>
            <option value={LimitConfigStatus.DRAFT}>{t('limitConfig.statusOptions.DRAFT')}</option>
          </select>
          
          <div className="text-sm text-gray-500 dark:text-gray-400">
            {total} {t('limitConfig.configCount')}
          </div>
        </div>
      </div>

      {/* Empty state when no configs */}
      {configs.length === 0 ? (
        <div className="text-center py-12">
          <Settings className="mx-auto h-12 w-12 text-gray-400" />
          {filters.status || searchTerm ? (
            // When filters are applied but no results found
            <>
              <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-white">{t('limitConfig.noResults')}</h3>
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                {t('limitConfig.tryDifferentFilters')}
              </p>
            </>
          ) : (
            // When no data and no filters - show create button
            <>
              <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-white">{t('limitConfig.noData')}</h3>
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                {t('limitConfig.createFirst')}
              </p>
              <div className="mt-6">
                <button
                  onClick={onCreateClick}
                  className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-doan-500 hover:bg-doan-600"
                >
                  {t('limitConfig.create')}
                </button>
              </div>
            </>
          )}
        </div>
      ) : (
        // Table when there are configs
        <div className="bg-white dark:bg-gray-800 shadow-sm rounded-lg overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
          <thead className="bg-gray-50 dark:bg-gray-700">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                {t('limitConfig.organization')}
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                {t('limitConfig.dayLimit')}
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                {t('limitConfig.status')}
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                {t('limitConfig.createdAt')}
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                {t('limitConfig.updatedAt')}
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                {t('limitConfig.actions')}
              </th>
            </tr>
          </thead>
          <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
            {configs.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-6 py-12 text-center">
                  <Settings className="mx-auto h-8 w-8 text-gray-400 mb-2" />
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    {searchTerm ? t('limitConfig.noSearchResults') : t('limitConfig.noFilterResults')}
                  </p>
                </td>
              </tr>
            ) : (
              configs.map((config: CtxhLimitConfig) => (
              <tr 
                key={config.id} 
                className={`hover:bg-gray-50 dark:hover:bg-gray-700 ${
                  config.deletedAt ? 'opacity-60 bg-red-50 dark:bg-red-900/10' : ''
                }`}
              >
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center">
                    <Building2 className="h-4 w-4 text-gray-400 mr-2" />
                    <div className="text-sm font-medium text-gray-900 dark:text-white">
                      {config.organization?.name || t('limitConfig.unknownOrganization')}
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm text-gray-900 dark:text-white">
                    <span className="font-semibold text-doan-600 dark:text-doan-400">
                      {config.maxDays 
                        ? formatNumber(config.maxDays)
                        : (config as any).max_days 
                          ? formatNumber((config as any).max_days)
                          : '0'}
                    </span>
                    <span className="text-gray-500 ml-1">{t('limitConfig.daysPerSemester')}</span>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  {getStatusDisplay(config.status, !!config.deletedAt)}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                  {(() => {
                    const createdAt = config.createdAt || (config as any).created_at;
                    if (!createdAt) return '-';
                    try {
                      return new Date(createdAt).toLocaleDateString('vi-VN', {
                        day: '2-digit',
                        month: '2-digit',
                        year: 'numeric'
                      });
                    } catch {
                      return createdAt;
                    }
                  })()}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                  {(() => {
                    const createdAt = config.createdAt || (config as any).created_at;
                    const updatedAt = config.updatedAt || (config as any).updated_at;
                    if (!updatedAt || updatedAt === createdAt) return '-';
                    try {
                      return new Date(updatedAt).toLocaleDateString('vi-VN', {
                        day: '2-digit',
                        month: '2-digit',
                        year: 'numeric'
                      });
                    } catch {
                      return updatedAt;
                    }
                  })()}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                  <div className="flex items-center justify-end space-x-2">
                    {!config.deletedAt ? (
                      <>
                        <button
                          onClick={() => onEditClick(config)}
                          className="text-yellow-600 hover:text-yellow-900 dark:text-yellow-400 dark:hover:text-yellow-300"
                          title={t('limitConfig.edit')}
                        >
                          <Edit className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => onDeleteClick(config)}
                          className="text-red-700 hover:text-red-900 dark:text-red-500 dark:hover:text-red-400"
                          title={t('limitConfig.delete')}
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </>
                    ) : (
                      <button
                        onClick={() => onRestoreClick(config)}
                        className="p-1 text-gray-400 hover:text-green-600 dark:text-gray-500 dark:hover:text-green-400 rounded transition-colors"
                        title={t('limitConfig.restore')}
                      >
                        <RotateCcw className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                </td>
              </tr>
              ))
            )}
          </tbody>
        </table>
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="px-4 py-3 bg-gray-50 border-t border-gray-200 rounded-b-lg dark:bg-gray-900 dark:border-gray-700">
          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            total={total}
            limit={limit}
            onPageChange={handlePageChange}
            onLimitChange={handleLimitChange}
            showLimitSelector={true}
          />
        </div>
      )}
    </div>
  );
};

export default LimitConfigList;