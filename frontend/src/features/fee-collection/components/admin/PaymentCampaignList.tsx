import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { Search, Eye, Edit, Trash2, Play, CheckCircle, X } from 'lucide-react';
import { useToast } from '@/shared/hooks/useToast';
import { Toast, ConfirmDialog } from '@/shared/components';
import SearchableCombobox from '@/shared/components/SearchableCombobox';
import { PaymentCampaign, PaymentCampaignFilters, Organization } from '../../types';
import { paymentCampaignService } from '@/shared/services/fee-collection-service';
import { usePermissions } from '@/shared/hooks/usePermissions';

interface PaymentCampaignListProps {
  organizations: Organization[];
  onEditCampaign?: (campaign: PaymentCampaign) => void;
  refreshTrigger?: number;
}

const PaymentCampaignList: React.FC<PaymentCampaignListProps> = ({
  organizations,
  onEditCampaign,
  refreshTrigger
}) => {
  const permissions = usePermissions();
  const { toasts, confirmDialog, showSuccess, showError, showConfirm, hideToast } = useToast();
  const [campaigns, setCampaigns] = useState<PaymentCampaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null); // Track which action is loading
  const [searchTerm, setSearchTerm] = useState(''); // Local search term state
  const [filters, setFilters] = useState<PaymentCampaignFilters>({
    page: 1,
    limit: 10
  });
  
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 0
  });

  // Row-level permission checks
  const canEditCampaign = (campaign: PaymentCampaign) => {
    return permissions.canUpdatePaymentCampaignInOrg(campaign.organizationId);
  };

  const canDeleteCampaign = (campaign: PaymentCampaign) => {
    return permissions.canDeletePaymentCampaignInOrg(campaign.organizationId);
  };
  const canViewCampaign = (campaign: PaymentCampaign) => {
    return permissions.canViewPaymentCampaignInOrg(campaign.organizationId);
  };

  // Only show action column if user has any action permissions
  const showActionColumn = permissions.canViewPaymentCampaignDetails() ||
    permissions.canUpdatePaymentCampaign() ||
    permissions.canDeletePaymentCampaign();


  // Debounced search function
  const debouncedSearch = useCallback(
    (searchValue: string) => {
      const timeoutId = setTimeout(() => {
        setFilters(prev => ({ 
          ...prev, 
          search: searchValue || undefined, 
          page: 1 
        }));
      }, 500); // 500ms delay

      return () => clearTimeout(timeoutId);
    },
    []
  );

  // Handle search term change
  useEffect(() => {
    const cleanup = debouncedSearch(searchTerm);
    return cleanup;
  }, [searchTerm, debouncedSearch]);

  // Create organization options for SearchableCombobox
  const organizationOptions = [
    { value: '', label: 'Tất cả tổ chức' },
    ...organizations.map(org => ({
      value: org.id,
      label: org.name
    }))
  ];

  useEffect(() => {
    loadCampaigns();
  }, [filters]);

  // Reload campaigns when refreshTrigger changes
  useEffect(() => {
    if (refreshTrigger && refreshTrigger > 0) {
      loadCampaigns();
    }
  }, [refreshTrigger]);

  const loadCampaigns = async () => {
    try {
      setLoading(true);
      setError(null); // Clear any previous errors
      const response: any = await paymentCampaignService.getPaymentCampaigns(filters);
      setCampaigns(response.campaigns);
      setPagination({
        page: response.page,
        limit: response.limit,
        total: response.total,
        totalPages: response.totalPages
      });
    } catch (err) {
      console.error('Error loading campaigns:', err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to load campaigns';
      setError(errorMessage);
      showError(`Không thể tải danh sách đợt thu phí: ${errorMessage}`);
    } finally {
      setLoading(false);
    }
  };
  
  
  const handleStatusChange = async (id: string, action: 'activate' | 'complete' | 'cancel') => {
    // Show confirmation dialog for activate action
    if (action === 'activate') {
      const shouldActivate = await showConfirm(
        'Kích hoạt đợt thu phí',
        'Bạn có chắc chắn muốn kích hoạt đợt thu phí này? Sau khi kích hoạt, thành viên sẽ có thể thực hiện thanh toán.',
        {
          confirmText: 'Kích hoạt',
          cancelText: 'Hủy',
          variant: 'warning'
        }
      );
      
      if (!shouldActivate) return;
    }

    // Show confirmation dialog for complete action
    if (action === 'complete') {
      const shouldComplete = await showConfirm(
        'Hoàn thành đợt thu phí',
        'Bạn có chắc chắn muốn hoàn thành đợt thu phí này? Sau khi hoàn thành, đợt thu phí sẽ kết thúc và không thể thay đổi.',
        {
          confirmText: 'Hoàn thành',
          cancelText: 'Hủy',
          variant: 'info'
        }
      );
      
      if (!shouldComplete) return;
    }

    // Show confirmation dialog for cancel action
    if (action === 'cancel') {
      const shouldCancel = await showConfirm(
        'Hủy đợt thu phí',
        'Bạn có chắc chắn muốn hủy đợt thu phí này? Sau khi hủy, thành viên sẽ không thể thực hiện thanh toán và đợt thu phí sẽ kết thúc.',
        {
          confirmText: 'Hủy đợt thu phí',
          cancelText: 'Không hủy',
          variant: 'danger'
        }
      );
      
      if (!shouldCancel) return;
    }
    
    try {
      setActionLoading(`${id}-${action}`);
      let response;
      switch (action) {
        case 'activate':
          response = await paymentCampaignService.activatePaymentCampaign(id);
          break;
        case 'complete':
          response = await paymentCampaignService.completePaymentCampaign(id);
          break;
        case 'cancel':
          response = await paymentCampaignService.cancelPaymentCampaign(id);
          break;
      }

      // Handle response properly - it might be response.data or just response
      const updatedCampaign = response?.data || response;

      if (updatedCampaign) {
        // Update the campaign in the list
        setCampaigns(prev => prev.map(campaign =>
          campaign.id === id ? updatedCampaign : campaign
        ));

        // Show success toast
        const actionMessages = {
          activate: 'Đợt thu phí đã được kích hoạt thành công!',
          complete: 'Đợt thu phí đã được hoàn thành thành công!',
          cancel: 'Đợt thu phí đã được hủy thành công!'
        };
        showSuccess(actionMessages[action]);
      } else {
        showError('Không thể cập nhật trạng thái đợt thu phí. Vui lòng thử lại.');
      }
    } catch (err) {
      console.error('Error in handleStatusChange:', err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to update campaign status';
      showError(`Không thể ${action === 'activate' ? 'kích hoạt' : action === 'complete' ? 'hoàn thành' : 'hủy'}: ${errorMessage}`);

      // Reload campaigns to ensure UI is in sync
      await loadCampaigns();
    } finally {
      setActionLoading(null);
    }
  };

  const handleDelete = async (id: string) => {
    const campaign = campaigns.find(c => c.id === id);
    if (!campaign) return;

    // Use custom confirm dialog
    const shouldDelete = await showConfirm(
      'Xóa đợt thu phí - Hành động này không thể hoàn tác!',
      ` Bạn có chắc muốn xóa đợt thu phí này vì sẽ xóa luôn cả lịch sử thu phí ở trang của thành viên và quản trị viên?`,
      {
        confirmText: 'Xóa',
        cancelText: 'Hủy',
        variant: 'danger'
      }
    );

    if (!shouldDelete) return;

    try {
      await paymentCampaignService.deletePaymentCampaign(id);
      setCampaigns(prev => prev.filter(campaign => campaign.id !== id));
      showSuccess('Đợt thu phí đã được xóa thành công!');
    } catch (err) {
      console.error('Error in handleDelete:', err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to delete campaign';
      showError(`Không thể xóa đợt thu phí: ${errorMessage}`);
    }
  };

  const getStatusIcon = (status: PaymentCampaign['status']) => {
    switch (status) {
      case 'DRAFT': return <Edit className="w-4 h-4 text-gray-500" />;
      case 'ACTIVE': return <Play className="w-4 h-4 text-green-500" />;
      case 'COMPLETED': return <CheckCircle className="w-4 h-4 text-blue-500" />;
      case 'CANCELLED': return <X className="w-4 h-4 text-red-500" />;
      default: return null;
    }
  };

  const getStatusClass = (status: PaymentCampaign['status']) => {
    switch (status) {
      case 'DRAFT': return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300';
      case 'ACTIVE': return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
      case 'COMPLETED': return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200';
      case 'CANCELLED': return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200';
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300';
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        {/* Filters placeholder */}
        <div className="p-4 bg-white border border-gray-200 rounded-lg shadow-sm dark:bg-gray-800 dark:border-gray-700">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
            {/* Empty filter placeholders */}
            <div className="h-10 bg-gray-200 rounded animate-pulse dark:bg-gray-700"></div>
            <div className="h-10 bg-gray-200 rounded animate-pulse dark:bg-gray-700"></div>
            <div className="h-10 bg-gray-200 rounded animate-pulse dark:bg-gray-700"></div>
            <div className="h-10 bg-gray-200 rounded animate-pulse dark:bg-gray-700"></div>
          </div>
        </div>

        {/* Loading content */}
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <div className="w-12 h-12 mx-auto border-b-2 rounded-full animate-spin border-doan-600"></div>
            <p className="mt-4 text-gray-600 dark:text-gray-400">
              Đang tải danh sách đợt thu phí...
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div>
      {/* Filters */}
      <div className="p-4 bg-white border rounded-lg dark:bg-gray-800 dark:border-gray-700">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
          <div>
            <label className="block mb-1 text-sm font-medium text-gray-700 dark:text-gray-300">
              Tổ chức
            </label>
            <SearchableCombobox
              value={filters.organizationId || ''}
              onChange={(value) => setFilters(prev => ({ ...prev, organizationId: value || undefined, page: 1 }))}
              options={organizationOptions}
              placeholder="Chọn tổ chức..."
              className="w-full"
            />
          </div>

          <div>
            <label className="block mb-1 text-sm font-medium text-gray-700 dark:text-gray-300">
              Trạng thái
            </label>
            <select
              value={filters.status || ''}
              onChange={(e) => setFilters(prev => ({ ...prev, status: e.target.value as PaymentCampaign['status'] || undefined, page: 1 }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
            >
              <option value="">Tất cả trạng thái</option>
              <option value="DRAFT">Nháp</option>
              <option value="ACTIVE">Đang hoạt động</option>
              <option value="COMPLETED">Hoàn thành</option>
              <option value="CANCELLED">Đã hủy</option>
            </select>
          </div>

          <div>
            <label className="block mb-1 text-sm font-medium text-gray-700 dark:text-gray-300">
              Từ ngày
            </label>
            <input
              type="date"
              value={filters.startDate || ''}
              onChange={(e) => setFilters(prev => ({ ...prev, startDate: e.target.value || undefined, page: 1 }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
            />
          </div>

          <div>
            <label className="block mb-1 text-sm font-medium text-gray-700 dark:text-gray-300">
              Đến ngày
            </label>
            <input
              type="date"
              value={filters.endDate || ''}
              onChange={(e) => setFilters(prev => ({ ...prev, endDate: e.target.value || undefined, page: 1 }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
            />
          </div>
        </div>

        <div className="mt-4">
          <div className="relative">
            <Search className="absolute w-4 h-4 text-gray-400 transform -translate-y-1/2 left-3 top-1/2 dark:text-gray-500" />
            <input
              type="text"
              placeholder="Tìm kiếm theo tên đợt đóng phí..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full py-2 pl-10 pr-4 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
            />
          </div>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="px-4 py-3 text-red-700 border border-red-200 rounded bg-red-50 dark:bg-red-900 dark:border-red-800 dark:text-red-200">
          {error}
        </div>
      )}

      {/* Table */}
      <div className="overflow-hidden bg-white border rounded-lg dark:bg-gray-800 dark:border-gray-700">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-gray-50 dark:bg-gray-900">
              <tr>
                <th className="px-6 py-3 text-xs font-medium tracking-wider text-left text-gray-500 uppercase dark:text-gray-400">
                  Đợt đóng phí
                </th>
                <th className="px-6 py-3 text-xs font-medium tracking-wider text-left text-gray-500 uppercase dark:text-gray-400">
                  Tổ chức
                </th>
                <th className="px-6 py-3 text-xs font-medium tracking-wider text-left text-gray-500 uppercase dark:text-gray-400">
                  Thời gian
                </th>
                <th className="px-6 py-3 text-xs font-medium tracking-wider text-left text-gray-500 uppercase dark:text-gray-400">
                  Trạng thái
                </th>                <th className="px-6 py-3 text-xs font-medium tracking-wider text-left text-gray-500 uppercase dark:text-gray-400">
                  Người tạo
                </th>
                {showActionColumn && (
                  <th className="px-6 py-3 text-xs font-medium tracking-wider text-right text-gray-500 uppercase dark:text-gray-400">
                    Thao tác
                  </th>
                )}
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200 dark:bg-gray-800 dark:divide-gray-700">
              {campaigns.map((campaign) => (
                <tr key={campaign?.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                  <td className="px-6 py-4">
                    <div>
                      <div className="text-sm font-medium text-gray-900 dark:text-white">{campaign.name}</div>
                      <div className="text-sm text-gray-500 dark:text-gray-400">{campaign.description}</div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-sm text-gray-900 dark:text-white">
                      {campaign.organization?.name || 'N/A'}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-sm text-gray-900 dark:text-white">
                      {new Date(campaign.startDate).toLocaleDateString('vi-VN')} - {new Date(campaign.endDate).toLocaleDateString('vi-VN')}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center">
                      {getStatusIcon(campaign.status)}
                      <span className={`ml-2 inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusClass(campaign.status)}`}>
                        {campaign.status === 'DRAFT' && 'Nháp'}
                        {campaign.status === 'ACTIVE' && 'Đang hoạt động'}
                        {campaign.status === 'COMPLETED' && 'Hoàn thành'}
                        {campaign.status === 'CANCELLED' && 'Đã hủy'}
                      </span>
                    </div>
                  </td>                  <td className="px-6 py-4">
                    <div className="text-sm text-gray-900 dark:text-white">
                      {campaign.createdByUser?.familyName} {campaign.createdByUser?.givenName}
                    </div>
                  </td>

                  {/* Actions Column - Permission controlled */}
                  {showActionColumn && (
                    <td className="px-6 py-4 text-sm font-medium text-right">
                      <div className="flex items-center justify-end space-x-2">                        
                      {canViewCampaign(campaign) && (
                        <Link
                          to={`/admin/payment-campaigns/${campaign.id}`}
                          className="text-blue-600 hover:text-blue-900 dark:text-blue-400 dark:hover:text-blue-300"
                          title="Xem chi tiết"
                        >
                          <Eye className="w-4 h-4" />
                        </Link>
                      )}                        
                      {campaign.status === 'DRAFT' && (
                        <>
                          {canEditCampaign(campaign) && (
                            <button
                              onClick={() => onEditCampaign?.(campaign)}
                              className="text-yellow-600 hover:text-yellow-900 dark:text-yellow-400 dark:hover:text-yellow-300"
                              title="Chỉnh sửa"
                            >
                              <Edit className="w-4 h-4" />
                            </button>
                          )}

                          {canDeleteCampaign(campaign) && (
                            <button
                              onClick={() => handleDelete(campaign.id)}
                              className="text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300"
                              title="Xóa"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </>
                      )}                        
                      {campaign.status === 'ACTIVE' && (
                        <>
                          {canEditCampaign(campaign) && (
                            <button
                              onClick={() => handleStatusChange(campaign.id, 'complete')}
                              disabled={actionLoading === `${campaign.id}-complete`}
                              className="text-blue-600 hover:text-blue-900 disabled:opacity-50 dark:text-blue-400 dark:hover:text-blue-300"
                              title="Hoàn thành"
                            >
                              <CheckCircle className="w-4 h-4" />
                            </button>
                          )}

                          {canEditCampaign(campaign) && (
                            <button
                              onClick={() => handleStatusChange(campaign.id, 'cancel')}
                              disabled={actionLoading === `${campaign.id}-cancel`}
                              className="text-red-600 hover:text-red-900 disabled:opacity-50 dark:text-red-400 dark:hover:text-red-300"
                              title="Hủy"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          )}
                        </>
                      )}                        
                      {(campaign.status === 'CANCELLED' || campaign.status === 'COMPLETED') && (
                        <>
                          {canDeleteCampaign(campaign) && (
                            <button
                              onClick={() => handleDelete(campaign.id)}
                              className="text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300"
                              title="Xóa đợt thu phí"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </>
                      )}

                      </div>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {pagination.totalPages !== 0 && (
          <div className="flex items-center justify-between px-4 py-3 bg-white border-t border-gray-200 dark:bg-gray-800 dark:border-gray-700">
            <div className="flex justify-between flex-1 sm:hidden">
              <button
                onClick={() => setFilters(prev => ({ ...prev, page: Math.max(1, pagination.page - 1) }))}
                disabled={pagination.page === 1}
                className="relative inline-flex items-center px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 dark:bg-gray-800 dark:text-gray-300 dark:border-gray-600 dark:hover:bg-gray-700"
              >
                Trước
              </button>
              <button
                onClick={() => setFilters(prev => ({ ...prev, page: Math.min(pagination.totalPages, pagination.page + 1) }))}
                disabled={pagination.page === pagination.totalPages}
                className="relative inline-flex items-center px-4 py-2 ml-3 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 dark:bg-gray-800 dark:text-gray-300 dark:border-gray-600 dark:hover:bg-gray-700"
              >
                Sau
              </button>
            </div>
            <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
              <div>
                <p className="text-sm text-gray-700 dark:text-gray-300">
                  Hiển thị <span className="font-medium">{(pagination.page - 1) * pagination.limit + 1}</span> đến{' '}
                  <span className="font-medium">{Math.min(pagination.page * pagination.limit, pagination.total)}</span> trong tổng số{' '}
                  <span className="font-medium">{pagination.total}</span> kết quả
                </p>
              </div>
              <div>
                <nav className="relative z-0 inline-flex -space-x-px rounded-md shadow-sm">
                  <button
                    onClick={() => setFilters(prev => ({ ...prev, page: Math.max(1, pagination.page - 1) }))}
                    disabled={pagination.page === 1}
                    className="relative inline-flex items-center px-2 py-2 text-sm font-medium text-gray-500 bg-white border border-gray-300 rounded-l-md hover:bg-gray-50 disabled:opacity-50 dark:bg-gray-800 dark:text-gray-400 dark:border-gray-600 dark:hover:bg-gray-700"
                  >
                    Trước
                  </button>
                  {[...Array(pagination.totalPages)].map((_, i) => (
                    <button
                      key={i + 1}
                      onClick={() => setFilters(prev => ({ ...prev, page: i + 1 }))}
                      className={`relative inline-flex items-center px-4 py-2 border text-sm font-medium ${pagination.page === i + 1
                        ? 'z-10 bg-blue-50 border-blue-500 text-blue-600 dark:bg-blue-900 dark:border-blue-500 dark:text-blue-300'
                        : 'bg-white border-gray-300 text-gray-500 hover:bg-gray-50 dark:bg-gray-800 dark:border-gray-600 dark:text-gray-400 dark:hover:bg-gray-700'
                        }`}
                    >
                      {i + 1}
                    </button>
                  ))}
                  <button
                    onClick={() => setFilters(prev => ({ ...prev, page: Math.min(pagination.totalPages, pagination.page + 1) }))}
                    disabled={pagination.page === pagination.totalPages}
                    className="relative inline-flex items-center px-2 py-2 text-sm font-medium text-gray-500 bg-white border border-gray-300 rounded-r-md hover:bg-gray-50 disabled:opacity-50 dark:bg-gray-800 dark:text-gray-400 dark:border-gray-600 dark:hover:bg-gray-700"
                  >
                    Sau
                  </button>
                </nav>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Empty State */}
      {campaigns.length === 0 && !loading && (
        <div className="py-12 text-center">
          <div className="mb-4 text-gray-500 dark:text-gray-400">Không có đợt đóng phí nào</div>
        </div>
      )}

      {/* Toast Container */}
      <div className="fixed z-50 space-y-4 top-4 right-4">
        {toasts.map((toast) => (
          <Toast
            key={toast.id}
            type={toast.type}
            message={toast.message}
            duration={toast.duration}
            onClose={() => hideToast(toast.id)}
          />
        ))}
      </div>

      {/* Confirm Dialog */}
      <ConfirmDialog
        isOpen={confirmDialog.isOpen}
        title={confirmDialog.title}
        message={confirmDialog.message}
        confirmText={confirmDialog.confirmText}
        cancelText={confirmDialog.cancelText}
        variant={confirmDialog.variant}
        onConfirm={confirmDialog.onConfirm || (() => { })}
        onCancel={confirmDialog.onCancel || (() => { })}
      />
    </div>
  );
};

export default PaymentCampaignList;
