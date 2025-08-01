import React, { useState, useEffect } from 'react';
import { Clock, DollarSign, AlertCircle, CheckCircle, User, CreditCard } from 'lucide-react';
import { PaymentAssignment } from '../../types';
import { paymentAssignmentService } from '../../services/paymentAssignmentService';
import PaymentCampaignCard from './PaymentCampaignCard';

interface MyPaymentDashboardProps {
  userId?: string; // If not provided, will use current user
}

const MyPaymentDashboard: React.FC<MyPaymentDashboardProps> = ({ userId }) => {
  const [assignments, setAssignments] = useState<PaymentAssignment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<'all' | 'pending' | 'paid' | 'overdue'>('all');

  useEffect(() => {
    loadMyAssignments();
  }, [userId]);

  const loadMyAssignments = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = userId 
        ? await paymentAssignmentService.getAssignmentsByUser(userId)
        : await paymentAssignmentService.getMyAssignments();
      
      setAssignments(response.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load assignments');
    } finally {
      setLoading(false);
    }
  };

  const getFilteredAssignments = () => {
    if (filter === 'all') return assignments;
    return assignments.filter(assignment => {
      switch (filter) {
        case 'pending': return assignment.status === 'PENDING';
        case 'paid': return assignment.status === 'PAID';
        case 'overdue': return assignment.status === 'OVERDUE';
        default: return true;
      }
    });
  };

  const getStats = () => {
    const pending = assignments.filter(a => a.status === 'PENDING').length;
    const paid = assignments.filter(a => a.status === 'PAID').length;
    const overdue = assignments.filter(a => a.status === 'OVERDUE').length;
    const totalAmount = assignments.reduce((sum, a) => sum + (a.customAmount || a.feeLevel?.amount || 0), 0);
    const paidAmount = assignments
      .filter(a => a.status === 'PAID')
      .reduce((sum, a) => sum + (a.customAmount || a.feeLevel?.amount || 0), 0);

    return { pending, paid, overdue, totalAmount, paidAmount };
  };

  const stats = getStats();
  const filteredAssignments = getFilteredAssignments();

  const formatAmount = (amount: number) => {
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND'
    }).format(amount);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
        {error}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Đợt Đóng Phí Của Tôi</h1>
          <p className="text-gray-600 mt-1">
            Quản lý và thanh toán các khoản phí được phân công
          </p>
        </div>
        <div className="flex items-center space-x-2 text-sm text-gray-500">
          <User className="w-4 h-4" />
          <span>Tổng {assignments.length} đợt phí</span>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg border p-4">
          <div className="flex items-center">
            <div className="p-2 bg-yellow-100 rounded-lg">
              <Clock className="w-5 h-5 text-yellow-600" />
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-600">Chờ đóng</p>
              <p className="text-2xl font-bold text-gray-900">{stats.pending}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg border p-4">
          <div className="flex items-center">
            <div className="p-2 bg-green-100 rounded-lg">
              <CheckCircle className="w-5 h-5 text-green-600" />
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-600">Đã đóng</p>
              <p className="text-2xl font-bold text-gray-900">{stats.paid}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg border p-4">
          <div className="flex items-center">
            <div className="p-2 bg-red-100 rounded-lg">
              <AlertCircle className="w-5 h-5 text-red-600" />
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-600">Quá hạn</p>
              <p className="text-2xl font-bold text-gray-900">{stats.overdue}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg border p-4">
          <div className="flex items-center">
            <div className="p-2 bg-blue-100 rounded-lg">
              <DollarSign className="w-5 h-5 text-blue-600" />
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-600">Tổng tiền</p>
              <p className="text-lg font-bold text-gray-900">
                {formatAmount(stats.totalAmount)}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Payment Progress */}
      {stats.totalAmount > 0 && (
        <div className="bg-white rounded-lg border p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-700">Tiến độ thanh toán</span>
            <span className="text-sm text-gray-500">
              {formatAmount(stats.paidAmount)} / {formatAmount(stats.totalAmount)}
            </span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div 
              className="bg-green-600 h-2 rounded-full transition-all duration-300"
              style={{ width: `${(stats.paidAmount / stats.totalAmount) * 100}%` }}
            ></div>
          </div>
          <div className="text-right text-sm text-gray-500 mt-1">
            {Math.round((stats.paidAmount / stats.totalAmount) * 100)}% hoàn thành
          </div>
        </div>
      )}

      {/* Filter Tabs */}
      <div className="bg-white rounded-lg border">
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex space-x-8 px-4">
            {[
              { key: 'all', label: 'Tất cả', count: assignments.length },
              { key: 'pending', label: 'Chờ đóng', count: stats.pending },
              { key: 'paid', label: 'Đã đóng', count: stats.paid },
              { key: 'overdue', label: 'Quá hạn', count: stats.overdue }
            ].map(tab => (
              <button
                key={tab.key}
                onClick={() => setFilter(tab.key as any)}
                className={`py-4 px-1 border-b-2 font-medium text-sm whitespace-nowrap ${
                  filter === tab.key
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                {tab.label}
                {tab.count > 0 && (
                  <span className={`ml-2 py-0.5 px-2 rounded-full text-xs ${
                    filter === tab.key 
                      ? 'bg-blue-100 text-blue-600' 
                      : 'bg-gray-100 text-gray-900'
                  }`}>
                    {tab.count}
                  </span>
                )}
              </button>
            ))}
          </nav>
        </div>

        {/* Assignments List */}
        <div className="p-4">
          {filteredAssignments.length === 0 ? (
            <div className="text-center py-12">
              <CreditCard className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-1">
                {filter === 'all' ? 'Chưa có đợt đóng phí nào' : `Không có đợt phí ${
                  filter === 'pending' ? 'chờ đóng' :
                  filter === 'paid' ? 'đã đóng' : 'quá hạn'
                }`}
              </h3>
              <p className="text-gray-500">
                {filter === 'all' 
                  ? 'Khi admin tạo đợt đóng phí mới, bạn sẽ thấy chúng ở đây'
                  : 'Hãy chọn tab khác để xem các đợt phí khác'
                }
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredAssignments.map((assignment) => (
                <PaymentCampaignCard
                  key={assignment.id}
                  assignment={assignment}
                  onPaymentComplete={loadMyAssignments}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Quick Actions */}
      {stats.pending > 0 && (
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg border border-blue-200 p-4">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <AlertCircle className="w-5 h-5 text-blue-600" />
            </div>
            <div className="ml-3 flex-1">
              <h3 className="text-sm font-medium text-blue-800">
                Bạn có {stats.pending} đợt phí chưa thanh toán
              </h3>
              <p className="text-sm text-blue-600 mt-1">
                Tổng số tiền cần đóng: {formatAmount(stats.totalAmount - stats.paidAmount)}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MyPaymentDashboard;
