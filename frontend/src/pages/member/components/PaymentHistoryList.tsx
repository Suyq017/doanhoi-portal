import React, { useState, useEffect } from 'react';
import { Calendar, Search, FileText, Download, Filter } from 'lucide-react';
import { paymentService } from '../../../features/fee-collection/services/paymentService';
import LoadingSpinner from '../../../shared/components/LoadingSpinner';
import EmptyState from '../../../shared/components/EmptyState';
import PaymentTransactionCard from './PaymentTransactionCard';

interface PaymentTransaction {
  id: string;
  orderCode: string;
  campaignName: string;
  organizationName: string;
  amount: number;
  status: 'PAID' | 'CANCELLED' | 'EXPIRED';
  paidAt: string;
  description?: string;
}

const PaymentHistoryList: React.FC = () => {
  const [transactions, setTransactions] = useState<PaymentTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [dateFilter, setDateFilter] = useState({
    fromDate: '',
    toDate: '',
  });
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);

  const pageSize = 10;

  // Load payment history
  const loadPaymentHistory = async (page = 1) => {
    setLoading(true);
    try {
      const params: any = {
        page,
        limit: pageSize,
      };

      if (statusFilter !== 'all') {
        params.status = statusFilter;
      }

      if (dateFilter.fromDate) {
        params.fromDate = dateFilter.fromDate;
      }

      if (dateFilter.toDate) {
        params.toDate = dateFilter.toDate;
      }

      const response = await paymentService.getPaymentHistory(params);
      setTransactions(response.transactions);
      setTotal(response.total);
      setTotalPages(response.totalPages);
      setCurrentPage(page);
    } catch (err: any) {
      setError(err.message || 'Có lỗi xảy ra khi tải lịch sử thanh toán');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPaymentHistory(1);
  }, [statusFilter, dateFilter]);

  // Filter transactions by search term
  const filteredTransactions = transactions.filter(transaction =>
    transaction.campaignName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    transaction.organizationName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    transaction.orderCode.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handlePageChange = (page: number) => {
    loadPaymentHistory(page);
  };

  const handleDateFilterChange = (field: 'fromDate' | 'toDate', value: string) => {
    setDateFilter(prev => ({
      ...prev,
      [field]: value,
    }));
  };

  const clearFilters = () => {
    setSearchTerm('');
    setStatusFilter('all');
    setDateFilter({ fromDate: '', toDate: '' });
  };

  const exportHistory = async () => {
    try {
      // Implement export functionality
      console.log('Exporting payment history...');
    } catch (error) {
      console.error('Error exporting history:', error);
    }
  };

  if (loading && currentPage === 1) {
    return (
      <div className="flex justify-center items-center py-12">
        <LoadingSpinner />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Filters and Search */}
      <div className="bg-white rounded-lg border p-4 space-y-4">
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
          <input
            type="text"
            placeholder="Tìm kiếm theo tên đợt, tổ chức, mã đơn hàng..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
          />
        </div>

        {/* Filters Row */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {/* Status Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Trạng thái
            </label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            >
              <option value="all">Tất cả</option>
              <option value="PAID">Đã thanh toán</option>
              <option value="CANCELLED">Đã hủy</option>
              <option value="EXPIRED">Hết hạn</option>
            </select>
          </div>

          {/* From Date */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Từ ngày
            </label>
            <div className="relative">
              <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                type="date"
                value={dateFilter.fromDate}
                onChange={(e) => handleDateFilterChange('fromDate', e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              />
            </div>
          </div>

          {/* To Date */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Đến ngày
            </label>
            <div className="relative">
              <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                type="date"
                value={dateFilter.toDate}
                onChange={(e) => handleDateFilterChange('toDate', e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              />
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-end space-x-2">
            <button
              onClick={clearFilters}
              className="flex items-center px-3 py-2 text-sm text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              <Filter className="w-4 h-4 mr-1" />
              Xóa bộ lọc
            </button>
            <button
              onClick={exportHistory}
              className="flex items-center px-3 py-2 text-sm text-indigo-600 border border-indigo-300 rounded-lg hover:bg-indigo-50"
            >
              <Download className="w-4 h-4 mr-1" />
              Xuất file
            </button>
          </div>
        </div>
      </div>

      {/* Results Summary */}
      <div className="flex justify-between items-center text-sm text-gray-600">
        <span>
          Hiển thị {filteredTransactions.length} trong tổng số {total} giao dịch
        </span>
        {loading && currentPage > 1 && (
          <div className="flex items-center space-x-2">
            <LoadingSpinner size="sm" />
            <span>Đang tải...</span>
          </div>
        )}
      </div>

      {/* Transaction List */}
      {error ? (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-800">{error}</p>
          <button
            onClick={() => loadPaymentHistory(currentPage)}
            className="mt-2 text-red-600 hover:text-red-700 font-medium"
          >
            Thử lại
          </button>
        </div>
      ) : filteredTransactions.length === 0 ? (
        <EmptyState
          icon={FileText}
          title="Chưa có giao dịch nào"
          description="Bạn chưa có giao dịch thanh toán nào được thực hiện."
        />
      ) : (
        <div className="space-y-3">
          {filteredTransactions.map((transaction) => (
            <PaymentTransactionCard
              key={transaction.id}
              transaction={transaction}
            />
          ))}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex justify-center items-center space-x-4 mt-6">
          <button
            onClick={() => handlePageChange(currentPage - 1)}
            disabled={currentPage === 1}
            className="px-4 py-2 text-sm border border-gray-300 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
          >
            Trước
          </button>
          
          <div className="flex space-x-1">
            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
              const pageNum = Math.max(1, currentPage - 2) + i;
              if (pageNum > totalPages) return null;
              
              return (
                <button
                  key={pageNum}
                  onClick={() => handlePageChange(pageNum)}
                  className={`px-3 py-2 text-sm rounded-lg ${
                    currentPage === pageNum
                      ? 'bg-indigo-600 text-white'
                      : 'border border-gray-300 hover:bg-gray-50'
                  }`}
                >
                  {pageNum}
                </button>
              );
            })}
          </div>

          <button
            onClick={() => handlePageChange(currentPage + 1)}
            disabled={currentPage === totalPages}
            className="px-4 py-2 text-sm border border-gray-300 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
          >
            Sau
          </button>
        </div>
      )}
    </div>
  );
};

export default PaymentHistoryList;
