import React, { useState } from 'react';
import { CreditCard, AlertCircle, Filter, Search } from 'lucide-react';
import PaymentAssignmentCard from './PaymentAssignmentCard';
import PaymentModal from './PaymentModal';
import EmptyState from '../../../shared/components/EmptyState';
import LoadingSpinner from '../../../shared/components/LoadingSpinner';
import { useMyPaymentAssignments } from '../../../features/fee-collection/hooks/useMyPaymentAssignments';
import { PaymentAssignment } from '../../../features/fee-collection/types';

type StatusFilter = 'all' | 'pending' | 'paid' | 'overdue';
type SortBy = 'created' | 'dueDate' | 'amount';

const PendingPaymentsList: React.FC = () => {
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [sortBy, setSortBy] = useState<SortBy>('created');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedPayment, setSelectedPayment] = useState<PaymentAssignment | null>(null);
  const [showPaymentModal, setShowPaymentModal] = useState(false);

  const { assignments, loading, error, refetch } = useMyPaymentAssignments();

  // Filter and sort assignments
  const filteredAssignments = React.useMemo(() => {
    let filtered = assignments || [];

    // Filter by status
    if (statusFilter !== 'all') {
      filtered = filtered.filter((assignment: PaymentAssignment) => 
        assignment.status.toLowerCase() === statusFilter
      );
    }

    // Filter by search term
    if (searchTerm) {
      filtered = filtered.filter((assignment: PaymentAssignment) =>
        assignment.campaign?.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        assignment.campaign?.organization?.name.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Sort
    filtered.sort((a: PaymentAssignment, b: PaymentAssignment) => {
      switch (sortBy) {
        case 'dueDate':
          if (!a.dueDate && !b.dueDate) return 0;
          if (!a.dueDate) return 1;
          if (!b.dueDate) return -1;
          return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
        case 'amount':
          const amountA = a.customAmount || a.feeLevel?.amount || 0;
          const amountB = b.customAmount || b.feeLevel?.amount || 0;
          return amountB - amountA;
        case 'created':
        default:
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      }
    });

    return filtered;
  }, [assignments, statusFilter, searchTerm, sortBy]);

  const handlePayment = (assignment: PaymentAssignment) => {
    setSelectedPayment(assignment);
    setShowPaymentModal(true);
  };

  const handlePaymentSuccess = () => {
    setShowPaymentModal(false);
    setSelectedPayment(null);
    refetch();
  };

  const getStatusCounts = () => {
    if (!assignments) return { all: 0, pending: 0, paid: 0, overdue: 0 };
    
    return {
      all: assignments.length,
      pending: assignments.filter((a: PaymentAssignment) => a.status === 'PENDING').length,
      paid: assignments.filter((a: PaymentAssignment) => a.status === 'PAID').length,
      overdue: assignments.filter((a: PaymentAssignment) => a.status === 'OVERDUE').length,
    };
  };

  const statusCounts = getStatusCounts();

  if (loading) {
    return <LoadingSpinner message="Đang tải danh sách khoản phí..." />;
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">Có lỗi xảy ra</h3>
        <p className="text-gray-600 mb-4">{error}</p>
        <button
          onClick={refetch}
          className="bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-700"
        >
          Thử lại
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Filters and Search */}
      <div className="bg-white p-6 rounded-lg shadow-sm border">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          {/* Search */}
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input
              type="text"
              placeholder="Tìm kiếm đợt đóng phí..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 pr-4 py-2 w-full border border-gray-300 rounded-md focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            />
          </div>

          {/* Filters */}
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <Filter className="w-4 h-4 text-gray-500" />
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
                className="border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              >
                <option value="all">Tất cả ({statusCounts.all})</option>
                <option value="pending">Chưa đóng ({statusCounts.pending})</option>
                <option value="paid">Đã đóng ({statusCounts.paid})</option>
                <option value="overdue">Quá hạn ({statusCounts.overdue})</option>
              </select>
            </div>

            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as SortBy)}
              className="border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            >
              <option value="created">Ngày tạo</option>
              <option value="dueDate">Hạn đóng</option>
              <option value="amount">Số tiền</option>
            </select>
          </div>
        </div>
      </div>

      {/* Payment Assignments List */}
      {filteredAssignments.length === 0 ? (
        <EmptyState
          title={searchTerm || statusFilter !== 'all' ? 'Không tìm thấy kết quả' : 'Chưa có khoản phí nào'}
          description={
            searchTerm || statusFilter !== 'all'
              ? 'Thử thay đổi bộ lọc hoặc từ khóa tìm kiếm'
              : 'Hiện tại bạn chưa được phân công đóng phí nào'
          }
          icon={CreditCard}
        />
      ) : (
        <div className="grid gap-4">
          {filteredAssignments.map((assignment: PaymentAssignment) => (
            <PaymentAssignmentCard
              key={assignment.id}
              assignment={assignment}
              onPayment={handlePayment}
            />
          ))}
        </div>
      )}

      {/* Payment Modal */}
      {showPaymentModal && selectedPayment && (
        <PaymentModal
          assignment={selectedPayment}
          onSuccess={handlePaymentSuccess}
          onClose={() => {
            setShowPaymentModal(false);
            setSelectedPayment(null);
          }}
        />
      )}
    </div>
  );
};

export default PendingPaymentsList;
