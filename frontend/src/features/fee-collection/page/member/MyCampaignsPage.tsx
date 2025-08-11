import React, { useState, useEffect } from 'react';
import { CreditCard, Clock, CheckCircle, AlertCircle, Search } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { usePaymentAssignments, PaymentAssignment } from '../../../../shared/hooks/usePaymentAssignments';
import { paymentService } from '../../../../shared/services/fee-collection-service';
import { usePermissions } from '../../../../shared/hooks/usePermissions';
import { useToast } from '../../../../shared/hooks/useToast';
import { Toast } from '../../../../shared/components';
import { UserTablePagination } from '../../../../shared/components/UserTable/UserTablePagination';

interface Filters {
  status: string;
  search: string;
  sortBy: 'dueDate' | 'assignedAt' | 'amount';
  sortOrder: 'asc' | 'desc';
  page: number;
  limit: number;
}

export const MyCampaignsPage: React.FC = () => {
  const { t } = useTranslation('myPayments');
  const { showError, toasts, hideToast } = useToast();
  const [assignments, setAssignments] = useState<PaymentAssignment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState<Filters>({
    status: '',
    search: '',
    sortBy: 'dueDate',
    sortOrder: 'asc',
    page: 1,
    limit: 10
  });
  const { getUserAssignments } = usePaymentAssignments();
  const {
    canAccessMyPaymentsInOrg,
    userRoles,
    isSuperAdmin,
    permissionsLoading
  } = usePermissions();

  // Helper function để lấy tên tổ chức từ assignment hoặc hiển thị organizationId
  const getOrganizationName = (organizationId?: string) => {
    if (!organizationId) return 'N/A';

    // Tìm tên tổ chức từ assignments nếu có
    const assignment = assignments.find(a => a.campaign.organization.id === organizationId);
    return assignment?.campaign.organization.name || `Tổ chức ${organizationId}`;
  };
  useEffect(() => {
    fetchAssignments();
  }, []);

  const fetchAssignments = async () => {
    try {
      setLoading(true);
      setError(null);
      const result = await getUserAssignments();

      // Áp dụng cơ chế phân quyền: chỉ hiển thị assignments từ những tổ chức mà user có quyền truy cập
      const filteredAssignments = result.filter((assignment: PaymentAssignment) => {
        // Super admin có thể xem tất cả
        if (isSuperAdmin()) {
          return true;
        }

        // Kiểm tra quyền truy cập theo từng tổ chức
        return canAccessMyPaymentsInOrg(assignment.campaign.organization.id);
      });

      setAssignments(filteredAssignments || []);
    } catch (err) {
      setError(t('errors.loadError'));
    } finally {
      setLoading(false);
    }
  };

  const handlePayNow = async (assignmentId: string) => {
    try {
      // Tìm assignment để lấy thông tin thanh toán
      const assignment = assignments.find(a => a.id === assignmentId);
      if (!assignment) {
        showError(t('errors.assignmentNotFound'));
        return;
      }

      // Lấy số tiền và thông tin cần thiết
      const amount = Number(assignment.feeLevel?.amount) || 0;
      const organizationId = assignment.campaign.organization.id;

      // Gọi PayOS service để tạo payment link
      const paymentResponse = await paymentService.createPaymentLink({
        assignmentId,
        campaignId: assignment.campaign.id,
        amount,
        description: `Thanh toán: ${assignment.campaign.name}`,
        organizationId,
      });

      // Redirect đến PayOS checkout URL
      if (paymentResponse.success && paymentResponse.data?.checkoutUrl) {
        window.location.href = paymentResponse.data.checkoutUrl;
      } else {
        throw new Error(paymentResponse.message || 'Không nhận được URL thanh toán từ server');
      }

    } catch (error) {
      console.error('Error creating payment:', error);
      showError(t('errors.paymentSystemError'));
    }
  };

  const formatAmount = (amount: number) => {
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND'
    }).format(amount);
  };

  const filteredAndSortedAssignments = assignments
    .filter(assignment => {
      // Chỉ hiển thị assignments từ campaigns có status ACTIVE hoặc CANCELLED
      const isValidCampaignStatus = assignment.campaign.status === 'ACTIVE' || assignment.campaign.status === 'CANCELLED';

      const matchesStatus = !filters.status || assignment.status === filters.status;
      const matchesSearch = !filters.search ||
        assignment.campaign.name.toLowerCase().includes(filters.search.toLowerCase()) ||
        assignment.campaign.organization.name.toLowerCase().includes(filters.search.toLowerCase());

      return isValidCampaignStatus && matchesStatus && matchesSearch;
    })
    .sort((a, b) => {
      // Ưu tiên PENDING lên đầu
      if (a.status === 'PENDING' && b.status !== 'PENDING') return -1;
      if (b.status === 'PENDING' && a.status !== 'PENDING') return 1;

      let comparison = 0;

      switch (filters.sortBy) {
        case 'dueDate':
          const dateA = a.dueDate ? new Date(a.dueDate).getTime() : Infinity;
          const dateB = b.dueDate ? new Date(b.dueDate).getTime() : Infinity;
          comparison = dateA - dateB;
          break;
        case 'assignedAt':
          comparison = new Date(a.assignedAt).getTime() - new Date(b.assignedAt).getTime();
          break;
        case 'amount':
          const amountA = Number(a.feeLevel?.amount) || 0;
          const amountB = Number(b.feeLevel?.amount) || 0;
          comparison = amountA - amountB;
          break;
      }

      return filters.sortOrder === 'desc' ? -comparison : comparison;
    });

  // Pagination calculations
  const totalFiltered = filteredAndSortedAssignments.length;
  const totalPages = Math.ceil(totalFiltered / filters.limit);
  const startIndex = (filters.page - 1) * filters.limit;
  const endIndex = startIndex + filters.limit;
  const paginatedAssignments = filteredAndSortedAssignments.slice(startIndex, endIndex);

  // Lọc assignments để chỉ tính những assignments từ campaigns có status hợp lệ
  const validAssignments = assignments.filter(a =>
    a.campaign.status === 'ACTIVE' || a.campaign.status === 'CANCELLED'
  );
  const summaryStats = {
    total: validAssignments.length,
    pending: validAssignments
      .filter(a => a.status === 'PENDING')
      .length,
    overdue: validAssignments
      .filter(a => a.status === 'OVERDUE')
      .length,
    paid: validAssignments.filter(a => a.status === 'PAID').length,
    totalAmount: validAssignments
      .filter(a => a.status === 'PENDING')
      .reduce((sum, a) => {
        const amount = Number(a.feeLevel?.amount) || 0;
        return sum + amount;
      }, 0)
  };

  if (loading || permissionsLoading) {
    return (
      <div className="">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
              {t('title')}
            </h1>
            <p className="mt-2 text-gray-600 dark:text-gray-400">
              {t('description')}
            </p>
          </div>
        </div>
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <div className="w-12 h-12 mx-auto border-b-2 rounded-full animate-spin border-doan-600"></div>
            <p className="mt-4 text-gray-600 dark:text-gray-400">
              {t('loading.list')}
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
              {t('title')}
            </h1>
            <p className="mt-2 text-gray-600 dark:text-gray-400">
              {t('description')}
            </p>
          </div>
        </div>
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <div className="mb-4 text-xl text-red-500">⚠️</div>
            <p className="text-red-600 dark:text-red-400">{error}</p>
            <button
              onClick={fetchAssignments}
              className="px-4 py-2 mt-4 text-white rounded-lg bg-doan-600 hover:bg-doan-700"
            >
              {t('actions.retry')}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            {t('title')}
          </h1>
          <p className="mt-2 text-gray-600 dark:text-gray-400">
            {t('description')}
          </p>

          {/* Permission Info */}
          {!isSuperAdmin() && userRoles && userRoles.length > 0 && (
            <div className="p-3 mt-3 border border-blue-200 rounded-lg bg-blue-50 dark:bg-blue-900/20 dark:border-blue-800">
              <div className="flex items-start space-x-3">
                <div className="flex-shrink-0">
                  <div className="w-2 h-2 mt-2 bg-blue-500 rounded-full"></div>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-blue-900 dark:text-blue-200">
                    {t('accessRights')}
                  </p>                  <div className="mt-1 text-xs text-blue-800 dark:text-blue-300">
                    {t('organizationAccess')} {' '}
                    <span className="font-semibold">
                      {userRoles
                        .filter(userRole => userRole.organizationId && canAccessMyPaymentsInOrg(userRole.organizationId))
                        .map(userRole => getOrganizationName(userRole.organizationId))
                        .join(', ')
                      }
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {isSuperAdmin() && (
            <div className="p-3 mt-3 border border-green-200 rounded-lg bg-green-50 dark:bg-green-900/20 dark:border-green-800">
              <div className="flex items-start space-x-3">
                <div className="flex-shrink-0">
                  <div className="w-2 h-2 mt-2 bg-green-500 rounded-full"></div>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-green-900 dark:text-green-200">
                    {t('superAdminRights')}
                  </p>
                  <div className="mt-1 text-xs text-green-800 dark:text-green-300">
                    {t('superAdminDescription')}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
        <div className="p-6 bg-white border border-gray-200 rounded-lg shadow-sm dark:bg-gray-800 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">{t('stats.total')}</p>
              <p className="text-3xl font-bold text-gray-900 dark:text-white">{summaryStats.total}</p>
            </div>
            <div className="p-3 bg-blue-100 rounded-full dark:bg-blue-900">
              <CreditCard className="w-6 h-6 text-blue-600 dark:text-blue-400" />
            </div>
          </div>
        </div>

        <div className="p-6 bg-white border border-gray-200 rounded-lg shadow-sm dark:bg-gray-800 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">{t('stats.pending')}</p>
              <p className="text-3xl font-bold text-yellow-600 dark:text-yellow-400">{summaryStats.pending}</p>
            </div>
            <div className="p-3 bg-yellow-100 rounded-full dark:bg-yellow-900">
              <Clock className="w-6 h-6 text-yellow-600 dark:text-yellow-400" />
            </div>
          </div>
        </div>

        <div className="p-6 bg-white border border-gray-200 rounded-lg shadow-sm dark:bg-gray-800 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">{t('stats.overdue')}</p>
              <p className="text-3xl font-bold text-red-600 dark:text-red-400">{summaryStats.overdue}</p>
            </div>
            <div className="p-3 bg-red-100 rounded-full dark:bg-red-900">
              <AlertCircle className="w-6 h-6 text-red-600 dark:text-red-400" />
            </div>
          </div>
        </div>

        <div className="p-6 bg-white border border-gray-200 rounded-lg shadow-sm dark:bg-gray-800 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">{t('stats.totalAmount')}</p>
              <p className="text-lg font-bold text-gray-900 dark:text-white">
                {formatAmount(summaryStats.totalAmount)}
              </p>
            </div>
            <div className="p-3 bg-green-100 rounded-full dark:bg-green-900">
              <CheckCircle className="w-6 h-6 text-green-600 dark:text-green-400" />
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="p-4 bg-white border border-gray-200 rounded-lg shadow-sm dark:bg-gray-800 dark:border-gray-700">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
          {/* Search */}
          <div className="relative">
            <Search className="absolute w-5 h-5 text-gray-400 transform -translate-y-1/2 left-3 top-1/2" />
            <input
              type="text"
              placeholder={t('search.placeholder')}
              value={filters.search}
              onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value, page: 1 }))}
              className="w-full py-2 pl-10 pr-4 border border-gray-300 rounded-md dark:border-gray-600 focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
            />
          </div>

          {/* Status Filter */}
          <div>
            <select
              value={filters.status}
              onChange={(e) => setFilters(prev => ({ ...prev, status: e.target.value, page: 1 }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md dark:border-gray-600 focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
            >
              <option value="">{t('filters.allStatus')}</option>
              <option value="PENDING">{t('status.pending')}</option>
              <option value="OVERDUE">{t('status.overdue')}</option>
              <option value="PAID">{t('status.paid')}</option>
            </select>
          </div>

          {/* Sort By */}
          <div>
            <select
              value={filters.sortBy}
              onChange={(e) => setFilters(prev => ({ ...prev, sortBy: e.target.value as any }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md dark:border-gray-600 focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
            >
              <option value="dueDate">{t('sort.dueDate')}</option>
              <option value="assignedAt">{t('sort.assignedAt')}</option>
              <option value="amount">{t('sort.amount')}</option>
            </select>
          </div>

          {/* Sort Order */}
          <div>
            <select
              value={filters.sortOrder}
              onChange={(e) => setFilters(prev => ({ ...prev, sortOrder: e.target.value as any }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md dark:border-gray-600 focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
            >
              <option value="asc">{t('sort.ascending')}</option>
              <option value="desc">{t('sort.descending')}</option>
            </select>
          </div>
        </div>
      </div>

      {/* Assignments Table */}
      <div className="overflow-hidden bg-white border border-gray-200 rounded-lg shadow-sm dark:bg-gray-800 dark:border-gray-700">
        <div className="overflow-x-auto">
          <table className="w-full table-auto">
            <thead className="bg-gray-50 dark:bg-gray-900">
              <tr>
                <th className="px-6 py-3 text-xs font-medium tracking-wider text-left text-gray-500 uppercase dark:text-gray-400">
                  {t('table.campaign')}
                </th>
                <th className="px-6 py-3 text-xs font-medium tracking-wider text-left text-gray-500 uppercase dark:text-gray-400">
                  {t('table.organization')}
                </th>
                <th className="px-6 py-3 text-xs font-medium tracking-wider text-left text-gray-500 uppercase dark:text-gray-400">
                  {t('table.amount')}
                </th>
                <th className="px-6 py-3 text-xs font-medium tracking-wider text-left text-gray-500 uppercase dark:text-gray-400">
                  {t('table.startDate')}
                </th>
                <th className="px-6 py-3 text-xs font-medium tracking-wider text-left text-gray-500 uppercase dark:text-gray-400">
                  {t('table.endDate')}
                </th>
                <th className="px-6 py-3 text-xs font-medium tracking-wider text-center text-gray-500 uppercase dark:text-gray-400">
                  {t('table.payment')}
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200 dark:bg-gray-800 dark:divide-gray-700">
              {paginatedAssignments.map((assignment) => (
                <tr key={assignment.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div>
                      <div className="font-medium text-gray-900 dark:text-white">
                        {assignment.campaign.name}
                      </div>
                      {assignment.campaign.description && (
                        <div className="text-sm text-gray-500 dark:text-gray-400">
                          {assignment.campaign.description}
                        </div>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900 dark:text-white">
                      {assignment.campaign.organization.name}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-semibold text-blue-600 dark:text-blue-400">
                      {formatAmount(Number(assignment.feeLevel?.amount) || 0)}
                    </div>
                    {assignment.feeLevel && (
                      <div className="text-xs text-gray-500 dark:text-gray-400">
                        {assignment.feeLevel.levelName}
                      </div>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900 dark:text-white">
                      {new Date(assignment.campaign.startDate).toLocaleDateString('vi-VN', {
                        day: '2-digit',
                        month: '2-digit',
                        year: 'numeric'
                      })} {new Date(assignment.campaign.startDate).toLocaleTimeString('vi-VN', {
                        hour: '2-digit',
                        minute: '2-digit',
                        hour12: false
                      })}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900 dark:text-white">
                      {new Date(assignment.campaign.endDate).toLocaleDateString('vi-VN', {
                        day: '2-digit',
                        month: '2-digit',
                        year: 'numeric'
                      })} {new Date(assignment.campaign.endDate).toLocaleTimeString('vi-VN', {
                        hour: '2-digit',
                        minute: '2-digit',
                        hour12: false
                      })}
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm font-medium text-center whitespace-nowrap">
                    {assignment.status === 'PENDING' && assignment.campaign.status === 'ACTIVE' && (
                      <button
                        onClick={() => handlePayNow(assignment.id)}
                        className="inline-flex items-center px-4 py-2 space-x-2 text-sm font-medium text-white transition-all duration-300 bg-blue-600 rounded-lg shadow-lg hover:bg-blue-700 hover:shadow-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:bg-blue-500 dark:hover:bg-blue-600"
                      >
                        <CreditCard className="w-4 h-4" />
                        <span>{t('actions.payNow')}</span>
                      </button>
                    )}

                    {assignment.status === 'PENDING' && assignment.campaign.status === 'CANCELLED' && (
                      <button
                        disabled
                        className="inline-flex items-center px-4 py-2 space-x-2 text-sm font-medium text-red-800 bg-red-200 rounded-lg shadow-sm cursor-not-allowed opacity-60 dark:bg-red-900 dark:text-red-400"
                      >
                        <AlertCircle className="w-4 h-4" />
                        <span>{t('actions.paymentExpired')}</span>
                      </button>
                    )}

                    {assignment.status === 'OVERDUE' && (
                      <button
                        disabled
                        className="inline-flex items-center px-4 py-2 space-x-2 text-sm font-medium text-red-800 bg-red-200 rounded-lg shadow-sm cursor-not-allowed opacity-60 dark:bg-red-900 dark:text-red-400"
                      >
                        <AlertCircle className="w-4 h-4" />
                        <span>{t('actions.paymentExpired')}</span>
                      </button>
                    )}

                    {assignment.status === 'PAID' && (
                      <button
                        disabled
                        className="inline-flex items-center px-4 py-2 space-x-2 text-sm font-medium text-green-800 bg-green-200 rounded-lg shadow-sm cursor-not-allowed opacity-60 dark:bg-green-900 dark:text-green-400"
                      >
                        <CheckCircle className="w-4 h-4" />
                        <span>{t('actions.alreadyPaid')}</span>
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>        
        {totalFiltered === 0 && (
          <div className="py-12 text-center">
            <CreditCard className="w-16 h-16 mx-auto mb-4 text-gray-300 dark:text-gray-600" />
            <h3 className="mb-2 text-lg font-medium text-gray-900 dark:text-white">
              {t('empty.noCampaigns')}
            </h3>
            <div className="text-gray-500 dark:text-gray-400">
              {filters.search || filters.status
                ? t('empty.noResults')
                : isSuperAdmin()
                  ? t('empty.noAssignmentsSuperAdmin')
                  : t('empty.noAssignmentsRegular')
              }
            </div>            {!isSuperAdmin() && userRoles && userRoles.length > 0 && (
              <div className="mt-4 text-sm text-gray-400">
                {t('empty.accessOrganizations')} {' '}
                {userRoles
                  .filter(userRole => userRole.organizationId && canAccessMyPaymentsInOrg(userRole.organizationId))
                  .map(userRole => getOrganizationName(userRole.organizationId))
                  .join(', ')
                }
              </div>
            )}
          </div>
        )}
      </div>
      {/* Pagination */}
        <UserTablePagination
          currentPage={filters.page}
          totalPages={totalPages}
          total={totalFiltered}
          limit={filters.limit}
          onPageChange={(page) => setFilters(prev => ({ ...prev, page }))}
        />

      {/* Toast notifications */}
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
  );
};

export default MyCampaignsPage;
