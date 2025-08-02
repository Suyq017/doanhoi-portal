import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Search, Eye, Edit, Trash2, Play, CheckCircle, X } from 'lucide-react';
import { useToast } from '@/shared/hooks/useToast';
import Toast from '@/shared/components/Toast';
import { PaymentCampaign, PaymentCampaignFilters, Organization } from '../../types';
import { paymentCampaignService } from '@/shared/services/fee-collection-service';

interface PaymentCampaignListProps {
  organizations: Organization[];
}

const PaymentCampaignList: React.FC<PaymentCampaignListProps> = ({ organizations }) => {
  const { toasts, showSuccess, showError, hideToast } = useToast();
  const [campaigns, setCampaigns] = useState<PaymentCampaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null); // Track which action is loading
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

  useEffect(() => {
    loadCampaigns();
  }, [filters]);

  const loadCampaigns = async () => {
    try {
      setLoading(true);
      setError(null); // Clear any previous errors
      const response : any = await paymentCampaignService.getPaymentCampaigns(filters);
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
    if (!confirm('Bạn có chắc chắn muốn xóa đợt đóng phí này?')) return;
    
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
      case 'DRAFT': return 'bg-gray-100 text-gray-800';
      case 'ACTIVE': return 'bg-green-100 text-green-800';
      case 'COMPLETED': return 'bg-blue-100 text-blue-800';
      case 'CANCELLED': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-32 h-32 border-b-2 border-blue-600 rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Filters */}
      <div className="p-4 bg-white border rounded-lg">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
          <div>
            <label className="block mb-1 text-sm font-medium text-gray-700">
              Tổ chức
            </label>
            <select
              value={filters.organizationId || ''}
              onChange={(e) => setFilters(prev => ({ ...prev, organizationId: e.target.value || undefined, page: 1 }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Tất cả tổ chức</option>
              {organizations.map(org => (
                <option key={org.id} value={org.id}>{org.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block mb-1 text-sm font-medium text-gray-700">
              Trạng thái
            </label>
            <select
              value={filters.status || ''}
              onChange={(e) => setFilters(prev => ({ ...prev, status: e.target.value as PaymentCampaign['status'] || undefined, page: 1 }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Tất cả trạng thái</option>
              <option value="DRAFT">Nháp</option>
              <option value="ACTIVE">Đang hoạt động</option>
              <option value="COMPLETED">Hoàn thành</option>
              <option value="CANCELLED">Đã hủy</option>
            </select>
          </div>

          <div>
            <label className="block mb-1 text-sm font-medium text-gray-700">
              Từ ngày
            </label>
            <input
              type="date"
              value={filters.startDate || ''}
              onChange={(e) => setFilters(prev => ({ ...prev, startDate: e.target.value || undefined, page: 1 }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block mb-1 text-sm font-medium text-gray-700">
              Đến ngày
            </label>
            <input
              type="date"
              value={filters.endDate || ''}
              onChange={(e) => setFilters(prev => ({ ...prev, endDate: e.target.value || undefined, page: 1 }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        <div className="mt-4">
          <div className="relative">
            <Search className="absolute w-4 h-4 text-gray-400 transform -translate-y-1/2 left-3 top-1/2" />
            <input
              type="text"
              placeholder="Tìm kiếm theo tên đợt đóng phí..."
              value={filters.search || ''}
              onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value || undefined, page: 1 }))}
              className="w-full py-2 pl-10 pr-4 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="px-4 py-3 text-red-700 border border-red-200 rounded bg-red-50">
          {error}
        </div>
      )}

      {/* Table */}
      <div className="overflow-hidden bg-white border rounded-lg">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-xs font-medium tracking-wider text-left text-gray-500 uppercase">
                  Đợt đóng phí
                </th>
                <th className="px-6 py-3 text-xs font-medium tracking-wider text-left text-gray-500 uppercase">
                  Tổ chức
                </th>
                <th className="px-6 py-3 text-xs font-medium tracking-wider text-left text-gray-500 uppercase">
                  Thời gian
                </th>
                <th className="px-6 py-3 text-xs font-medium tracking-wider text-left text-gray-500 uppercase">
                  Trạng thái
                </th>
                <th className="px-6 py-3 text-xs font-medium tracking-wider text-left text-gray-500 uppercase">
                  Người tạo
                </th>
                <th className="px-6 py-3 text-xs font-medium tracking-wider text-right text-gray-500 uppercase">
                  Thao tác
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {campaigns.map((campaign) => (
                <tr key={campaign?.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4">
                    <div>
                      <div className="text-sm font-medium text-gray-900">{campaign.name}</div>
                      <div className="text-sm text-gray-500">{campaign.description}</div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-sm text-gray-900">
                      {campaign.organization?.name || 'N/A'}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-sm text-gray-900">
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
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-sm text-gray-900">
                      {campaign.createdByUser?.familyName} {campaign.createdByUser?.givenName}
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm font-medium text-right">
                    <div className="flex items-center justify-end space-x-2">
                      <Link
                        to={`/admin/payment-campaigns/${campaign.id}`}
                        className="text-blue-600 hover:text-blue-900"
                        title="Xem chi tiết"
                      >
                        <Eye className="w-4 h-4" />
                      </Link>
                      
                      {campaign.status === 'DRAFT' && (
                        <>
                          <Link
                            to={`/admin/payment-campaigns/${campaign.id}/edit`}
                            className="text-yellow-600 hover:text-yellow-900"
                            title="Chỉnh sửa"
                          >
                            <Edit className="w-4 h-4" />
                          </Link>
                          <button
                            onClick={() => handleStatusChange(campaign.id, 'activate')}
                            disabled={actionLoading === `${campaign.id}-activate`}
                            className="text-green-600 hover:text-green-900 disabled:opacity-50"
                            title="Kích hoạt"
                          >
                            <Play className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(campaign.id)}
                            className="text-red-600 hover:text-red-900"
                            title="Xóa"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </>
                      )}
                      
                      {campaign.status === 'ACTIVE' && (
                        <>
                          <button
                            onClick={() => handleStatusChange(campaign.id, 'complete')}
                            disabled={actionLoading === `${campaign.id}-complete`}
                            className="text-blue-600 hover:text-blue-900 disabled:opacity-50"
                            title="Hoàn thành"
                          >
                            <CheckCircle className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleStatusChange(campaign.id, 'cancel')}
                            disabled={actionLoading === `${campaign.id}-cancel`}
                            className="text-red-600 hover:text-red-900 disabled:opacity-50"
                            title="Hủy"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {pagination.totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 bg-white border-t border-gray-200">
            <div className="flex justify-between flex-1 sm:hidden">
              <button
                onClick={() => setFilters(prev => ({ ...prev, page: Math.max(1, pagination.page - 1) }))}
                disabled={pagination.page === 1}
                className="relative inline-flex items-center px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50"
              >
                Trước
              </button>
              <button
                onClick={() => setFilters(prev => ({ ...prev, page: Math.min(pagination.totalPages, pagination.page + 1) }))}
                disabled={pagination.page === pagination.totalPages}
                className="relative inline-flex items-center px-4 py-2 ml-3 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50"
              >
                Sau
              </button>
            </div>
            <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
              <div>
                <p className="text-sm text-gray-700">
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
                    className="relative inline-flex items-center px-2 py-2 text-sm font-medium text-gray-500 bg-white border border-gray-300 rounded-l-md hover:bg-gray-50 disabled:opacity-50"
                  >
                    Trước
                  </button>
                  {[...Array(pagination.totalPages)].map((_, i) => (
                    <button
                      key={i + 1}
                      onClick={() => setFilters(prev => ({ ...prev, page: i + 1 }))}
                      className={`relative inline-flex items-center px-4 py-2 border text-sm font-medium ${
                        pagination.page === i + 1
                          ? 'z-10 bg-blue-50 border-blue-500 text-blue-600'
                          : 'bg-white border-gray-300 text-gray-500 hover:bg-gray-50'
                      }`}
                    >
                      {i + 1}
                    </button>
                  ))}
                  <button
                    onClick={() => setFilters(prev => ({ ...prev, page: Math.min(pagination.totalPages, pagination.page + 1) }))}
                    disabled={pagination.page === pagination.totalPages}
                    className="relative inline-flex items-center px-2 py-2 text-sm font-medium text-gray-500 bg-white border border-gray-300 rounded-r-md hover:bg-gray-50 disabled:opacity-50"
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
          <div className="mb-4 text-gray-500">Không có đợt đóng phí nào</div>
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
    </div>
  );
};

export default PaymentCampaignList;
