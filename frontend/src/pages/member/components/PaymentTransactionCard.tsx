import React from 'react';
import { Calendar, Building, CreditCard, CheckCircle, XCircle, Clock } from 'lucide-react';

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

interface PaymentTransactionCardProps {
  transaction: PaymentTransaction;
}

const PaymentTransactionCard: React.FC<PaymentTransactionCardProps> = ({ transaction }) => {
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND',
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('vi-VN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getStatusConfig = (status: PaymentTransaction['status']) => {
    switch (status) {
      case 'PAID':
        return {
          icon: CheckCircle,
          text: 'Đã thanh toán',
          className: 'text-green-700 bg-green-100',
          iconColor: 'text-green-600',
        };
      case 'CANCELLED':
        return {
          icon: XCircle,
          text: 'Đã hủy',
          className: 'text-red-700 bg-red-100',
          iconColor: 'text-red-600',
        };
      case 'EXPIRED':
        return {
          icon: Clock,
          text: 'Hết hạn',
          className: 'text-gray-700 bg-gray-100',
          iconColor: 'text-gray-600',
        };
      default:
        return {
          icon: Clock,
          text: 'Không xác định',
          className: 'text-gray-700 bg-gray-100',
          iconColor: 'text-gray-600',
        };
    }
  };

  const statusConfig = getStatusConfig(transaction.status);
  const StatusIcon = statusConfig.icon;

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between">
        {/* Main Content */}
        <div className="flex-1 space-y-3">
          {/* Header */}
          <div className="flex items-start justify-between">
            <div>
              <h3 className="font-medium text-gray-900">{transaction.campaignName}</h3>
              <div className="flex items-center text-sm text-gray-600 mt-1">
                <Building className="w-4 h-4 mr-1" />
                <span>{transaction.organizationName}</span>
              </div>
            </div>
            
            {/* Status Badge */}
            <div className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${statusConfig.className}`}>
              <StatusIcon className={`w-4 h-4 mr-1 ${statusConfig.iconColor}`} />
              {statusConfig.text}
            </div>
          </div>

          {/* Transaction Details */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-3 border-t border-gray-100">
            <div>
              <div className="text-xs text-gray-500 uppercase tracking-wide font-medium mb-1">
                Mã giao dịch
              </div>
              <div className="flex items-center text-sm">
                <CreditCard className="w-4 h-4 text-gray-400 mr-2" />
                <span className="font-mono">{transaction.orderCode}</span>
              </div>
            </div>

            <div>
              <div className="text-xs text-gray-500 uppercase tracking-wide font-medium mb-1">
                Số tiền
              </div>
              <div className="text-lg font-bold text-indigo-600">
                {formatCurrency(transaction.amount)}
              </div>
            </div>

            <div>
              <div className="text-xs text-gray-500 uppercase tracking-wide font-medium mb-1">
                Thời gian
              </div>
              <div className="flex items-center text-sm text-gray-600">
                <Calendar className="w-4 h-4 mr-2" />
                <span>{formatDate(transaction.paidAt)}</span>
              </div>
            </div>
          </div>

          {/* Description */}
          {transaction.description && (
            <div className="pt-3 border-t border-gray-100">
              <div className="text-xs text-gray-500 uppercase tracking-wide font-medium mb-1">
                Ghi chú
              </div>
              <p className="text-sm text-gray-600">{transaction.description}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default PaymentTransactionCard;
