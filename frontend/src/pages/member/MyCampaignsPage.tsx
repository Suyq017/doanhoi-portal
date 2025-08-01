import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { CreditCard, Clock, CheckCircle, AlertCircle, Calendar } from 'lucide-react';
import { usePaymentAssignments } from '../../shared/hooks/usePaymentAssignments';
import { TextInput, Select } from '../../shared/components/forms/FormFields';
import { paymentService } from '../../features/fee-collection/services/paymentService';

// Import the PaymentAssignment type from the hook file
type PaymentAssignment = {
  id: string;
  campaignId: string;
  userId: string;
  feeLevelId?: string;
  customAmount?: number;
  note?: string;
  status: 'PENDING' | 'PAID' | 'OVERDUE' | 'EXEMPTED';
  dueDate?: string;
  assignedAt: string;
  paidAt?: string;
  assignedById: string;
  campaign: {
    id: string;
    name: string;
    description?: string;
    status: string;
    organization: {
      id: string;
      name: string;
    };
  };
  user: {
    id: string;
    username: string;
    fullName: string;
    email?: string;
  };
  feeLevel?: {
    id: string;
    levelName: string;
    amount: number;
    description?: string;
  };
  transactions?: any[];
};

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
      const amount = assignment.feeLevel?.amount || 0;
      const organizationId = assignment.campaign.organization.id;

      // Gọi PayOS service để tạo payment link
      const paymentResponse = await paymentService.createPaymentLink({
        amount,
        description: `Thanh toán phí: ${assignment.campaign.name}`,
        organizationId,
        assignmentId
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

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'PAID':
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      case 'OVERDUE':
        return <AlertCircle className="w-5 h-5 text-red-500" />;
      case 'EXEMPTED':
        return <CheckCircle className="w-5 h-5 text-blue-500" />;
      default:
        return <Clock className="w-5 h-5 text-yellow-500" />;
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'PAID':
        return 'Đã thanh toán';
      case 'OVERDUE':
        return 'Quá hạn';
      case 'EXEMPTED':
        return 'Được miễn';
      default:
        return 'Chờ thanh toán';
    }
  };

  const filteredAndSortedAssignments = assignments
    .filter(assignment => {
      const matchesStatus = !filters.status || assignment.status === filters.status;
      const matchesSearch = !filters.search || 
        assignment.campaign.name.toLowerCase().includes(filters.search.toLowerCase()) ||
        assignment.campaign.organization.name.toLowerCase().includes(filters.search.toLowerCase());
      
      return matchesStatus && matchesSearch;
    })
    .sort((a, b) => {
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
          const amountA = a.customAmount || a.feeLevel?.amount || 0;
          const amountB = b.customAmount || b.feeLevel?.amount || 0;
          comparison = amountA - amountB;
          break;
      }
      
      return filters.sortOrder === 'desc' ? -comparison : comparison;
    });

  const summaryStats = {
    total: assignments.length,
    pending: assignments.filter(a => a.status === 'PENDING').length,
    overdue: assignments.filter(a => a.status === 'OVERDUE').length,
    paid: assignments.filter(a => a.status === 'PAID').length,
    totalAmount: assignments
      .filter(a => a.status === 'PENDING' || a.status === 'OVERDUE')
      .reduce((sum, a) => sum + (a.customAmount || a.feeLevel?.amount || 0), 0)
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="text-center">
          <div className="w-12 h-12 mx-auto border-b-2 border-blue-600 rounded-full animate-spin"></div>
          <p className="mt-4 text-gray-600">Đang tải danh sách...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="w-full max-w-md p-8 text-center bg-white rounded-lg shadow-sm">
          <AlertCircle className="w-16 h-16 mx-auto mb-4 text-red-500" />
          <h2 className="mb-2 text-xl font-semibold text-gray-900">Lỗi</h2>
          <p className="mb-6 text-gray-600">{error}</p>
          <button
            onClick={fetchAssignments}
            className="px-6 py-2 font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700"
          >
            Thử lại
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="px-4 py-8 mx-auto max-w-7xl">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Đóng phí của tôi</h1>
          <p className="mt-2 text-gray-600">Quản lý và thanh toán các khoản phí được phân công</p>
        </div>

        {/* Summary Stats */}
        <div className="grid grid-cols-1 gap-6 mb-8 md:grid-cols-2 lg:grid-cols-4">
          <div className="p-6 bg-white rounded-lg shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Tổng số</p>
                <p className="text-3xl font-bold text-gray-900">{summaryStats.total}</p>
              </div>
              <div className="p-3 bg-blue-100 rounded-full">
                <CreditCard className="w-6 h-6 text-blue-600" />
              </div>
            </div>
          </div>

          <div className="p-6 bg-white rounded-lg shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Chờ thanh toán</p>
                <p className="text-3xl font-bold text-yellow-600">{summaryStats.pending}</p>
              </div>
              <div className="p-3 bg-yellow-100 rounded-full">
                <Clock className="w-6 h-6 text-yellow-600" />
              </div>
            </div>
          </div>

          <div className="p-6 bg-white rounded-lg shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Quá hạn</p>
                <p className="text-3xl font-bold text-red-600">{summaryStats.overdue}</p>
              </div>
              <div className="p-3 bg-red-100 rounded-full">
                <AlertCircle className="w-6 h-6 text-red-600" />
              </div>
            </div>
          </div>

          <div className="p-6 bg-white rounded-lg shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Tổng tiền cần đóng</p>
                <p className="text-lg font-bold text-gray-900">
                  {formatAmount(summaryStats.totalAmount)}
                </p>
              </div>
              <div className="p-3 bg-green-100 rounded-full">
                <CheckCircle className="w-6 h-6 text-green-600" />
              </div>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="p-6 mb-6 bg-white rounded-lg shadow-sm">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
            <TextInput
              placeholder="Tìm kiếm đợt đóng phí..."
              value={filters.search}
              onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
              className="pl-10"
            />

            <Select
              placeholder="Trạng thái"
              value={filters.status}
              onChange={(e) => setFilters(prev => ({ ...prev, status: e.target.value }))}
              options={[
                { value: '', label: 'Tất cả trạng thái' },
                { value: 'PENDING', label: 'Chờ thanh toán' },
                { value: 'OVERDUE', label: 'Quá hạn' },
                { value: 'PAID', label: 'Đã thanh toán' },
                { value: 'EXEMPTED', label: 'Được miễn' }
              ]}
            />

            <Select
              value={filters.sortBy}
              onChange={(e) => setFilters(prev => ({ ...prev, sortBy: e.target.value as any }))}
              options={[
                { value: 'dueDate', label: 'Hạn thanh toán' },
                { value: 'assignedAt', label: 'Ngày phân công' },
                { value: 'amount', label: 'Số tiền' }
              ]}
            />

            <Select
              value={filters.sortOrder}
              onChange={(e) => setFilters(prev => ({ ...prev, sortOrder: e.target.value as any }))}
              options={[
                { value: 'asc', label: 'Tăng dần' },
                { value: 'desc', label: 'Giảm dần' }
              ]}
            />
          </div>
        </div>

        {/* Assignments List */}
        <div className="space-y-4">
          {filteredAndSortedAssignments.length === 0 ? (
            <div className="p-12 text-center bg-white rounded-lg shadow-sm">
              <CreditCard className="w-16 h-16 mx-auto mb-4 text-gray-300" />
              <h3 className="mb-2 text-lg font-medium text-gray-900">Không có đợt đóng phí nào</h3>
              <p className="text-gray-600">
                {filters.search || filters.status 
                  ? 'Không tìm thấy đợt đóng phí nào phù hợp với bộ lọc'
                  : 'Bạn chưa được phân công đóng phí nào'
                }
              </p>
            </div>
          ) : (
            filteredAndSortedAssignments.map((assignment) => (
              <div key={assignment.id} className="p-6 bg-white rounded-lg shadow-sm">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center mb-2 space-x-3">
                      {getStatusIcon(assignment.status)}
                      <h3 className="text-lg font-semibold text-gray-900">
                        {assignment.campaign.name}
                      </h3>
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                        assignment.status === 'PAID' ? 'bg-green-100 text-green-800' :
                        assignment.status === 'OVERDUE' ? 'bg-red-100 text-red-800' :
                        assignment.status === 'EXEMPTED' ? 'bg-blue-100 text-blue-800' :
                        'bg-yellow-100 text-yellow-800'
                      }`}>
                        {getStatusText(assignment.status)}
                      </span>
                    </div>

                    <p className="mb-2 text-gray-600">{assignment.campaign.organization.name}</p>
                    
                    {assignment.campaign.description && (
                      <p className="mb-3 text-sm text-gray-500">{assignment.campaign.description}</p>
                    )}

                    <div className="grid grid-cols-1 gap-4 text-sm md:grid-cols-3">
                      <div>
                        <span className="text-gray-500">Số tiền:</span>
                        <span className="ml-2 font-semibold text-blue-600">
                          {formatAmount(assignment.customAmount || assignment.feeLevel?.amount || 0)}
                        </span>
                      </div>
                      
                      {assignment.feeLevel && (
                        <div>
                          <span className="text-gray-500">Mức phí:</span>
                          <span className="ml-2">{assignment.feeLevel.levelName}</span>
                        </div>
                      )}
                      
                      {assignment.dueDate && (
                        <div>
                          <span className="text-gray-500">Hạn đóng:</span>
                          <span className="ml-2">
                            {new Date(assignment.dueDate).toLocaleDateString('vi-VN')}
                          </span>
                        </div>
                      )}
                    </div>

                    {assignment.note && (
                      <div className="p-3 mt-3 rounded-lg bg-gray-50">
                        <p className="text-sm text-gray-700">
                          <span className="font-medium">Ghi chú:</span> {assignment.note}
                        </p>
                      </div>
                    )}
                  </div>

                  <div className="flex flex-col ml-6 space-y-2">
                    {/* Status display */}
                    <div className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
                      assignment.status === 'PAID' ? 'text-green-600 bg-green-50' :
                      assignment.status === 'OVERDUE' ? 'text-red-600 bg-red-50' :
                      assignment.status === 'EXEMPTED' ? 'text-blue-600 bg-blue-50' :
                      'text-yellow-600 bg-yellow-50'
                    }`}>
                      {getStatusIcon(assignment.status)}
                      <span className="ml-1">{getStatusText(assignment.status)}</span>
                    </div>
                    
                    {assignment.status === 'PENDING' && (
                      <button
                        onClick={() => handlePayNow(assignment.id)}
                        className="flex items-center px-4 py-2 space-x-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700"
                      >
                        <CreditCard className="w-4 h-4" />
                        <span>Thanh toán ngay</span>
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Quick Actions */}
        <div className="flex justify-center mt-8">
          <Link
            to="/payment/history"
            className="flex items-center px-6 py-2 space-x-2 font-medium text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50"
          >
            <Calendar className="w-4 h-4" />
            <span>Xem lịch sử thanh toán</span>
          </Link>
        </div>
      </div>
    </div>
  );
};
