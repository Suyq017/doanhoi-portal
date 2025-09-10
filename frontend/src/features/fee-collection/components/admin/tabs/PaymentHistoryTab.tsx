import React, { useState, useEffect } from 'react';
import { Search, Filter, User, CheckCircle, XCircle } from 'lucide-react';
import { PaymentCampaign } from '../../../types';
import { UserTablePagination } from '../../../../../shared/components/UserTable/UserTablePagination';
import { useTranslation } from 'react-i18next';

interface PaymentHistory {
  id: string;
  order_code: number;
  amount: number;
  status: 'PAID' | 'CANCELLED';
  payment_method: 'MANUAL' | 'ONLINE';
  paid_at: string | null;
  client_id: string | null;
  api_key: string | null;
  checksum_key: string | null;
  created_at: string;
  assignment: {
    id: string;
    user: {
      id: string;
      code: string;
      familyName: string;
      givenName: string;
    };
    feeLevel: {
      levelName: string;
    } | null;
  };
}

interface PaymentHistoryTabProps {
  campaign: PaymentCampaign;
}

interface PaymentHistoryFilters {
  search: string;
  status: string;
}

const PaymentHistoryTab: React.FC<PaymentHistoryTabProps> = ({ campaign }) => {
  const { t } = useTranslation(['paymentHistory', 'common']);
  const [paymentHistory, setPaymentHistory] = useState<PaymentHistory[]>([]);
  const [loading, setLoading] = useState(false);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 0
  });
  const [filters, setFilters] = useState<PaymentHistoryFilters>({
    search: '',
    status: 'PAID'
  });
  const [showFilters, setShowFilters] = useState(false);

  // Fetch payment history data
  useEffect(() => {
    fetchPaymentHistory();
  }, [campaign.id, pagination.page, filters]);

  const fetchPaymentHistory = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: pagination.page.toString(),
        limit: pagination.limit.toString(),
        search: filters.search,
        status: filters.status
      });

      const response = await fetch(`${import.meta.env.VITE_BACKEND_API_URL}/api/payment-admin/payment-history/${campaign.id}?${params}`);
      const result = await response.json();

      if (result.success) {
        setPaymentHistory(result.data.items);
        setPagination(prev => ({
          ...prev,
          total: result.data.total,
          totalPages: result.data.totalPages
        }));
      }
    } catch (error) {
      console.error('Error fetching payment history:', error);
      setPaymentHistory([]);
    } finally {
      setLoading(false);
    }
  };

  const formatAmount = (amount: number) => {
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND'
    }).format(amount);
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleString('vi-VN');
  };

  const getDisplayDate = (history: PaymentHistory) => {
    if (history.status === 'CANCELLED') {
      return formatDate(history.created_at);
    }
    return formatDate(history.paid_at);
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'PAID':
        return <CheckCircle className="w-4 h-4 text-green-600" />;
      case 'CANCELLED':
        return <XCircle className="w-4 h-4 text-red-600" />;
      default:
        return <CheckCircle className="w-4 h-4 text-green-600" />;
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'PAID': return t('paymentHistory:status.paid');
      case 'CANCELLED': return t('paymentHistory:status.cancelled');
      default: return t('paymentHistory:status.paid');
    }
  };

  const getStatusClass = (status: string) => {
    switch (status) {
      case 'PAID':
        return 'bg-green-50 text-green-800 border-green-200 dark:bg-green-900 dark:text-green-200 dark:border-green-800';
      case 'CANCELLED':
        return 'bg-red-50 text-red-800 border-red-200 dark:bg-red-900 dark:text-red-200 dark:border-red-800';
      default:
        return 'bg-green-50 text-green-800 border-green-200 dark:bg-green-900 dark:text-green-200 dark:border-green-800';
    }
  };

  const getPaymentMethodText = (paymentMethod: string) => {
    switch (paymentMethod) {
      case 'MANUAL': return t('paymentHistory:paymentMethod.manual');
      case 'ONLINE': return t('paymentHistory:paymentMethod.online');
      default: return t('paymentHistory:paymentMethod.online');
    }
  };

  const getPaymentMethodClass = (paymentMethod: string) => {
    switch (paymentMethod) {
      case 'MANUAL':
        return 'bg-blue-50 text-blue-800 border-blue-200 dark:bg-blue-900 dark:text-blue-200 dark:border-blue-800';
      case 'ONLINE':
        return 'bg-purple-50 text-purple-800 border-purple-200 dark:bg-purple-900 dark:text-purple-200 dark:border-purple-800';
      default:
        return 'bg-purple-50 text-purple-800 border-purple-200 dark:bg-purple-900 dark:text-purple-200 dark:border-purple-800';
    }
  };

  const handleFilterChange = (key: keyof PaymentHistoryFilters, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value }));
    setPagination(prev => ({ ...prev, page: 1 })); // Reset to first page when filtering
  };

  const clearFilters = () => {
    setFilters({
      search: '',
      status: 'PAID'
    });
    setPagination(prev => ({ ...prev, page: 1 }));
  };

  const handlePageChange = (newPage: number) => {
    setPagination(prev => ({ ...prev, page: newPage }));
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-medium text-gray-900 dark:text-white">
            {t('paymentHistory:title')}
          </h3>
          <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
            {t('paymentHistory:description')}
          </p>
        </div>
        
        <div className="flex items-center space-x-3">
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 dark:bg-gray-800 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700 ${
              showFilters ? 'ring-2 ring-blue-500' : ''
            }`}
          >
            <Filter className="w-4 h-4 mr-2" />
            {t('paymentHistory:filters.title')}
          </button>
        </div>
      </div>

      {/* Filters */}
      {showFilters && (
        <div className="p-4 bg-white border rounded-lg dark:bg-gray-800 dark:border-gray-700">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            {/* Search */}
            <div>
              <label className="block mb-1 text-sm font-medium text-gray-700 dark:text-gray-300">
                {t('paymentHistory:filters.search')}
              </label>
              <div className="relative">
                <Search className="absolute w-4 h-4 text-gray-400 transform -translate-y-1/2 left-3 top-1/2" />
                <input
                  type="text"
                  placeholder={t('paymentHistory:filters.searchPlaceholder')}
                  value={filters.search}
                  onChange={(e) => handleFilterChange('search', e.target.value)}
                  className="w-full py-2 pl-10 pr-3 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                />
              </div>
            </div>

            {/* Status Filter */}
            <div>
              <label className="block mb-1 text-sm font-medium text-gray-700 dark:text-gray-300">
                {t('paymentHistory:filters.status')}
              </label>
              <select
                value={filters.status}
                onChange={(e) => handleFilterChange('status', e.target.value)}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
              >
                <option value="all">{t('paymentHistory:filters.statusOptions.all')}</option>
                <option value="PAID">{t('paymentHistory:filters.statusOptions.paid')}</option>
                <option value="CANCELLED">{t('paymentHistory:filters.statusOptions.cancelled')}</option>
              </select>
            </div>

            {/* Clear Filters */}
            <div className="flex items-end">
              <button
                onClick={clearFilters}
                className="px-3 py-2 text-sm text-gray-600 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200"
              >
                {t('paymentHistory:filters.clear')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Payment History Table */}
      <div className="overflow-hidden bg-white border rounded-lg dark:bg-gray-800 dark:border-gray-700">
        {loading ? (
          <div className="flex items-center justify-center p-12">
            <div className="w-8 h-8 border-b-2 border-blue-600 rounded-full animate-spin dark:border-blue-400"></div>
          </div>
        ) : paymentHistory.length === 0 ? (
          <div className="p-12 text-center">
            <User className="w-12 h-12 mx-auto mb-4 text-gray-400 dark:text-gray-500" />
            <h3 className="mb-2 text-lg font-medium text-gray-900 dark:text-white">
              {t('paymentHistory:empty.title')}
            </h3>
            <p className="text-gray-500 dark:text-gray-400">
              {filters.search || filters.status !== 'PAID' ? t('paymentHistory:empty.noResults') : t('paymentHistory:empty.noPayments')}
            </p>
          </div>
        ) : (
          <>
            {/* Table Header */}
            <div className="px-6 py-3 border-b bg-gray-50 dark:bg-gray-700 dark:border-gray-600">
              <div className="grid grid-cols-6 gap-4 text-xs font-medium tracking-wider text-gray-500 uppercase dark:text-gray-400">
                <div className="col-span-1">{t('paymentHistory:table.orderCode')}</div>
                <div className="col-span-1">{t('paymentHistory:table.member')}</div>
                <div className="col-span-1">{t('paymentHistory:table.amount')}</div>
                <div className="col-span-1">{t('paymentHistory:table.status')}</div>
                <div className="col-span-1">{t('paymentHistory:table.paymentMethod')}</div>
                <div className="col-span-1">{t('paymentHistory:table.paymentTime')}</div>
              </div>
            </div>

            {/* Table Body */}
            <div className="divide-y divide-gray-200 dark:divide-gray-700">
              {paymentHistory.map((history) => (
                <div key={history.id} className="px-6 py-4 hover:bg-gray-50 dark:hover:bg-gray-700">
                  {/* Main Row */}
                  <div className="grid items-center grid-cols-6 gap-4">
                    {/* Order Code */}
                    <div className="font-mono text-sm text-gray-900 dark:text-white">
                      {history.order_code}
                    </div>

                    {/* Member Info */}
                    <div className="flex items-center space-x-3">
                      <div>
                        <div className="text-sm font-medium text-gray-900 dark:text-white">
                          {history.assignment.user.familyName} {history.assignment.user.givenName}
                        </div>
                        <div className="text-xs text-gray-500 dark:text-gray-400">
                          {history.assignment.user.code}
                        </div>
                      </div>
                    </div>

                    {/* Amount */}
                    <div className="text-sm font-medium text-gray-900 dark:text-white">
                      {formatAmount(history.amount)}
                    </div>

                    {/* Status */}
                    <div>
                      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium border ${getStatusClass(history.status)}`}>
                        {getStatusIcon(history.status)}
                        <span className="ml-1">{getStatusText(history.status)}</span>
                      </span>
                    </div>

                    {/* Payment Method */}
                    <div>
                      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium border ${getPaymentMethodClass(history.payment_method)}`}>
                        {getPaymentMethodText(history.payment_method)}
                      </span>
                    </div>

                    {/* Paid At */}
                    <div className="text-sm text-gray-500 dark:text-gray-400">
                      {getDisplayDate(history)}
                    </div>
                  </div>
                  {history.status === 'PAID' && (
                    /* Config Information Row */
                    <div className="grid grid-cols-3 gap-4 p-3 mt-3 rounded-md bg-gray-50 dark:bg-gray-700">
                      {/* Client ID */}
                      <div>
                        <div className="mb-1 text-xs font-medium text-gray-600 dark:text-gray-400">{t('paymentHistory:table.clientId')}</div>
                        <div className="font-mono text-xs text-gray-900 break-all dark:text-white">
                          {history.client_id || '-'}
                        </div>
                      </div>

                      {/* API Key */}
                      <div>
                        <div className="mb-1 text-xs font-medium text-gray-600 dark:text-gray-400">{t('paymentHistory:table.apiKey')}</div>
                        <div className="font-mono text-xs text-gray-900 break-all dark:text-white">
                          {history.api_key || '-'}
                        </div>
                      </div>

                      {/* Checksum Key */}
                      <div>
                        <div className="mb-1 text-xs font-medium text-gray-600 dark:text-gray-400">{t('paymentHistory:table.checksumKey')}</div>
                        <div className="font-mono text-xs text-gray-900 break-all dark:text-white">
                          {history.checksum_key || '-'}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      {/* Pagination */}
      <UserTablePagination
        currentPage={pagination.page}
        totalPages={pagination.totalPages}
        total={pagination.total}
        limit={pagination.limit}
        onPageChange={handlePageChange}
      />
    </div>
  );
};

export default PaymentHistoryTab;
