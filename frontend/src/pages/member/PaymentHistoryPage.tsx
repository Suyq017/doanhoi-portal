import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Calendar, Download, Search, Filter, CreditCard, ArrowUpDown } from 'lucide-react';
import { PaymentHistory } from '../../shared/components/member/PaymentHistory';
import { usePaymentTransactions } from '../../shared/hooks/usePaymentTransactions';
import { TextInput, Select, DateInput } from '../../shared/components/forms/FormFields';

interface HistoryFilters {
  status: string;
  startDate: string;
  endDate: string;
  search: string;
  sortBy: 'createdAt' | 'amount' | 'status';
  sortOrder: 'asc' | 'desc';
}

export const PaymentHistoryPage: React.FC = () => {
  const [filters, setFilters] = useState<HistoryFilters>({
    status: '',
    startDate: '',
    endDate: '',
    search: '',
    sortBy: 'createdAt',
    sortOrder: 'desc'
  });

  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);

  const {
    transactions,
    loading,
    error,
    statistics,
    refreshTransactions,
    exportTransactions
  } = usePaymentTransactions();

  useEffect(() => {
    refreshTransactions();
  }, [refreshTransactions]);

  const handleExport = async () => {
    try {
      await exportTransactions(filters);
    } catch (err) {
      console.error('Failed to export transactions:', err);
    }
  };

  const formatAmount = (amount: number) => {
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND'
    }).format(amount);
  };

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="bg-white p-8 rounded-lg shadow-sm max-w-md w-full text-center">
          <div className="text-red-500 mb-4">
            <svg className="w-16 h-16 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.5 0L4.268 19.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          </div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Lỗi</h2>
          <p className="text-gray-600 mb-6">{error}</p>
          <button
            onClick={refreshTransactions}
            className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 font-medium"
          >
            Thử lại
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex justify-between items-start mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Lịch sử thanh toán</h1>
            <p className="text-gray-600 mt-2">Theo dõi tất cả các giao dịch thanh toán của bạn</p>
          </div>
          
          <div className="flex space-x-3">
            <button
              onClick={handleExport}
              disabled={loading}
              className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-medium flex items-center space-x-2 disabled:opacity-50"
            >
              <Download className="w-4 h-4" />
              <span>Xuất Excel</span>
            </button>
            
            <Link
              to="/payment/my-campaigns"
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium flex items-center space-x-2"
            >
              <CreditCard className="w-4 h-4" />
              <span>Đóng phí mới</span>
            </Link>
          </div>
        </div>

        {/* Statistics Summary */}
        {statistics && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            <div className="bg-white p-6 rounded-lg shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Tổng giao dịch</p>
                  <p className="text-3xl font-bold text-gray-900">{statistics.totalTransactions}</p>
                </div>
                <div className="p-3 bg-blue-100 rounded-full">
                  <Calendar className="w-6 h-6 text-blue-600" />
                </div>
              </div>
            </div>

            <div className="bg-white p-6 rounded-lg shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Thành công</p>
                  <p className="text-3xl font-bold text-green-600">{statistics.successfulTransactions}</p>
                </div>
                <div className="p-3 bg-green-100 rounded-full">
                  <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
              </div>
            </div>

            <div className="bg-white p-6 rounded-lg shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Tổng số tiền</p>
                  <p className="text-xl font-bold text-gray-900">
                    {formatAmount(statistics.totalAmount)}
                  </p>
                </div>
                <div className="p-3 bg-purple-100 rounded-full">
                  <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                  </svg>
                </div>
              </div>
            </div>

            <div className="bg-white p-6 rounded-lg shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Trung bình/giao dịch</p>
                  <p className="text-lg font-bold text-gray-900">
                    {formatAmount(statistics.averageAmount)}
                  </p>
                </div>
                <div className="p-3 bg-orange-100 rounded-full">
                  <ArrowUpDown className="w-6 h-6 text-orange-600" />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Filters */}
        <div className="bg-white p-6 rounded-lg shadow-sm mb-6">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-medium text-gray-900">Bộ lọc</h3>
            <button
              onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
              className="text-blue-600 hover:text-blue-700 text-sm font-medium flex items-center space-x-1"
            >
              <Filter className="w-4 h-4" />
              <span>{showAdvancedFilters ? 'Ẩn bộ lọc nâng cao' : 'Hiện bộ lọc nâng cao'}</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <TextInput
              placeholder="Tìm kiếm theo tên đợt, mô tả..."
              value={filters.search}
              onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
            />

            <Select
              placeholder="Trạng thái"
              value={filters.status}
              onChange={(e) => setFilters(prev => ({ ...prev, status: e.target.value }))}
              options={[
                { value: '', label: 'Tất cả trạng thái' },
                { value: 'PAID', label: 'Thành công' },
                { value: 'PENDING', label: 'Đang xử lý' },
                { value: 'CANCELLED', label: 'Đã hủy' },
                { value: 'FAILED', label: 'Thất bại' }
              ]}
            />

            <Select
              value={filters.sortBy}
              onChange={(e) => setFilters(prev => ({ ...prev, sortBy: e.target.value as any }))}
              options={[
                { value: 'createdAt', label: 'Ngày tạo' },
                { value: 'amount', label: 'Số tiền' },
                { value: 'status', label: 'Trạng thái' }
              ]}
            />
          </div>

          {showAdvancedFilters && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4 pt-4 border-t border-gray-200">
              <DateInput
                label="Từ ngày"
                value={filters.startDate}
                onChange={(e) => setFilters(prev => ({ ...prev, startDate: e.target.value }))}
              />

              <DateInput
                label="Đến ngày"
                value={filters.endDate}
                onChange={(e) => setFilters(prev => ({ ...prev, endDate: e.target.value }))}
              />

              <Select
                label="Sắp xếp"
                value={filters.sortOrder}
                onChange={(e) => setFilters(prev => ({ ...prev, sortOrder: e.target.value as any }))}
                options={[
                  { value: 'desc', label: 'Mới nhất trước' },
                  { value: 'asc', label: 'Cũ nhất trước' }
                ]}
              />
            </div>
          )}

          {(filters.search || filters.status || filters.startDate || filters.endDate) && (
            <div className="mt-4 pt-4 border-t border-gray-200 flex justify-between items-center">
              <div className="text-sm text-gray-600">
                Đang lọc {transactions.length} giao dịch
              </div>
              <button
                onClick={() => setFilters({
                  status: '',
                  startDate: '',
                  endDate: '',
                  search: '',
                  sortBy: 'createdAt',
                  sortOrder: 'desc'
                })}
                className="text-blue-600 hover:text-blue-700 text-sm font-medium"
              >
                Xóa bộ lọc
              </button>
            </div>
          )}
        </div>

        {/* Payment History Component */}
        <PaymentHistory 
          filters={filters}
          loading={loading}
        />

        {/* Back to Campaigns */}
        <div className="mt-8 text-center">
          <Link
            to="/payment/my-campaigns"
            className="inline-flex items-center space-x-2 text-blue-600 hover:text-blue-700 font-medium"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            <span>Quay lại danh sách đợt đóng phí</span>
          </Link>
        </div>
      </div>
    </div>
  );
};
