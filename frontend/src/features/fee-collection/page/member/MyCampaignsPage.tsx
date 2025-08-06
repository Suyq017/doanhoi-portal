import React, { useState, useEffect } from 'react';
import { CreditCard, Clock, CheckCircle, AlertCircle, Search } from 'lucide-react';
import { usePaymentAssignments, PaymentAssignment } from '../../../../shared/hooks/usePaymentAssignments';
import { paymentService } from '../../../../shared/services/fee-collection-service';

interface Filters {
  status: string;
  search: string;
  sortBy: 'dueDate' | 'assignedAt' | 'amount';
  sortOrder: 'asc' | 'desc';
}

export const MyCampaignsPage: React.FC = () => {
  const [assignments, setAssignments] = useState<PaymentAssignment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState<Filters>({
    status: '',
    search: '',
    sortBy: 'dueDate',
    sortOrder: 'asc'
  });

  const { getUserAssignments } = usePaymentAssignments();

  useEffect(() => {
    fetchAssignments();
  }, []);

  const fetchAssignments = async () => {
    try {
      setLoading(true);
      setError(null);
      const result = await getUserAssignments();
      setAssignments(result || []);
    } catch (err) {
      setError('Không thể tải danh sách đóng phí');
    } finally {
      setLoading(false);
    }
  };

  const handlePayNow = async (assignmentId: string) => {
    try {
      // Tìm assignment để lấy thông tin thanh toán
      const assignment = assignments.find(a => a.id === assignmentId);
      if (!assignment) {
        alert('Không tìm thấy thông tin đóng phí');
        return;
      }

      // Lấy số tiền và thông tin cần thiết
      const amount = Number(assignment.customAmount) || Number(assignment.feeLevel?.amount) || 0;
      const organizationId = assignment.campaign.organization.id;

      // Gọi PayOS service để tạo payment link
      const paymentResponse = await paymentService.createPaymentLink({
        assignmentId, // Thêm assignmentId vào request
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
      alert('Có lỗi xảy ra khi tạo thanh toán. Vui lòng thử lại.');
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
          const amountA = Number(a.customAmount) || Number(a.feeLevel?.amount) || 0;
          const amountB = Number(b.customAmount) || Number(b.feeLevel?.amount) || 0;
          comparison = amountA - amountB;
          break;
      }
      
      return filters.sortOrder === 'desc' ? -comparison : comparison;
    });

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
        const amount = Number(a.customAmount) || Number(a.feeLevel?.amount) || 0;
        return sum + amount;
      }, 0)
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
              Đóng phí của tôi
            </h1>
            <p className="mt-2 text-gray-600 dark:text-gray-400">
              Quản lý và thanh toán các khoản phí được phân công
            </p>
          </div>
        </div>
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <div className="w-12 h-12 mx-auto border-b-2 border-blue-600 rounded-full animate-spin"></div>
            <p className="mt-4 text-gray-600 dark:text-gray-400">
              Đang tải danh sách...
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
              Đóng phí của tôi
            </h1>
            <p className="mt-2 text-gray-600 dark:text-gray-400">
              Quản lý và thanh toán các khoản phí được phân công
            </p>
          </div>
        </div>
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <div className="mb-4 text-xl text-red-500">⚠️</div>
            <p className="text-red-600 dark:text-red-400">{error}</p>
            <button
              onClick={fetchAssignments}
              className="px-4 py-2 mt-4 text-white bg-blue-600 rounded-lg hover:bg-blue-700"
            >
              Thử lại
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
            Đóng phí của tôi
          </h1>
          <p className="mt-2 text-gray-600 dark:text-gray-400">
            Quản lý và thanh toán các khoản phí được phân công
          </p>
        </div>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
        <div className="p-6 bg-white border border-gray-200 rounded-lg shadow-sm dark:bg-gray-800 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Tổng số</p>
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
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Chờ thanh toán</p>
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
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Quá hạn</p>
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
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Tổng tiền cần đóng</p>
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
              placeholder="Tìm kiếm đợt đóng phí..."
              value={filters.search}
              onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
              className="w-full py-2 pl-10 pr-4 border border-gray-300 rounded-md dark:border-gray-600 focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
            />
          </div>

          {/* Status Filter */}
          <div>
            <select
              value={filters.status}
              onChange={(e) => setFilters(prev => ({ ...prev, status: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md dark:border-gray-600 focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
            >
              <option value="">Tất cả trạng thái</option>
              <option value="PENDING">Chờ thanh toán</option>
              <option value="OVERDUE">Quá hạn</option>
              <option value="PAID">Đã thanh toán</option>
            </select>
          </div>

          {/* Sort By */}
          <div>
            <select
              value={filters.sortBy}
              onChange={(e) => setFilters(prev => ({ ...prev, sortBy: e.target.value as any }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md dark:border-gray-600 focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
            >
              <option value="dueDate">Hạn thanh toán</option>
              <option value="assignedAt">Ngày phân công</option>
              <option value="amount">Số tiền</option>
            </select>
          </div>

          {/* Sort Order */}
          <div>
            <select
              value={filters.sortOrder}
              onChange={(e) => setFilters(prev => ({ ...prev, sortOrder: e.target.value as any }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md dark:border-gray-600 focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
            >
              <option value="asc">Tăng dần</option>
              <option value="desc">Giảm dần</option>
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
                  Đợt đóng phí
                </th>
                <th className="px-6 py-3 text-xs font-medium tracking-wider text-left text-gray-500 uppercase dark:text-gray-400">
                  Tổ chức
                </th>
                <th className="px-6 py-3 text-xs font-medium tracking-wider text-left text-gray-500 uppercase dark:text-gray-400">
                  Số tiền
                </th>
                <th className="px-6 py-3 text-xs font-medium tracking-wider text-left text-gray-500 uppercase dark:text-gray-400">
                  Từ ngày
                </th>
                <th className="px-6 py-3 text-xs font-medium tracking-wider text-left text-gray-500 uppercase dark:text-gray-400">
                  Đến ngày
                </th>
                <th className="px-6 py-3 text-xs font-medium tracking-wider text-center text-gray-500 uppercase dark:text-gray-400">
                  Thanh toán
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200 dark:bg-gray-800 dark:divide-gray-700">
              {filteredAndSortedAssignments.map((assignment) => (
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
                      {formatAmount(Number(assignment.customAmount) || Number(assignment.feeLevel?.amount) || 0)}
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
                        <span>Thanh toán ngay</span>
                      </button>
                    )}

                    {assignment.status === 'PENDING' && assignment.campaign.status === 'CANCELLED' && (
                      <button
                        disabled
                        className="inline-flex items-center px-4 py-2 space-x-2 text-sm font-medium text-red-800 bg-red-200 rounded-lg shadow-sm cursor-not-allowed opacity-60 dark:bg-red-900 dark:text-red-400"
                      >
                        <AlertCircle className="w-4 h-4" />
                        <span>Đã hết hạn thanh toán</span>
                      </button>
                    )}
                    
                    {assignment.status === 'OVERDUE' && (
                      <button
                        disabled
                        className="inline-flex items-center px-4 py-2 space-x-2 text-sm font-medium text-red-800 bg-red-200 rounded-lg shadow-sm cursor-not-allowed opacity-60 dark:bg-red-900 dark:text-red-400"
                      >
                        <AlertCircle className="w-4 h-4" />
                        <span>Đã hết hạn thanh toán</span>
                      </button>
                    )}
                    
                    {assignment.status === 'PAID' && (
                      <button
                        disabled
                        className="inline-flex items-center px-4 py-2 space-x-2 text-sm font-medium text-green-800 bg-green-200 rounded-lg shadow-sm cursor-not-allowed opacity-60 dark:bg-green-900 dark:text-green-400"
                      >
                        <CheckCircle className="w-4 h-4" />
                        <span>Đã thanh toán</span>
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {filteredAndSortedAssignments.length === 0 && (
          <div className="py-12 text-center">
            <CreditCard className="w-16 h-16 mx-auto mb-4 text-gray-300 dark:text-gray-600" />
            <h3 className="mb-2 text-lg font-medium text-gray-900 dark:text-white">
              Không có đợt đóng phí nào
            </h3>
            <div className="text-gray-500 dark:text-gray-400">
              {filters.search || filters.status 
                ? 'Không tìm thấy đợt đóng phí nào phù hợp với bộ lọc'
                : 'Bạn chưa được phân công đóng phí nào'
              }
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default MyCampaignsPage;
