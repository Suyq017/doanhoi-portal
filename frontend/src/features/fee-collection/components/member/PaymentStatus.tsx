import React from 'react';
import { CheckCircle, Clock, XCircle, AlertTriangle, AlertCircle, DollarSign } from 'lucide-react';

interface PaymentStatusProps {
  status: 'PENDING' | 'PAID' | 'FAILED' | 'CANCELLED' | 'OVERDUE' | 'EXEMPTED';
  amount?: number;
  dueDate?: string;
  paidAt?: string;
  size?: 'sm' | 'md' | 'lg';
  showDetails?: boolean;
  className?: string;
}

export const PaymentStatus: React.FC<PaymentStatusProps> = ({
  status,
  amount,
  dueDate,
  paidAt,
  size = 'md',
  showDetails = false,
  className = ''
}) => {
  const getStatusConfig = (status: string) => {
    switch (status) {
      case 'PAID':
        return {
          icon: CheckCircle,
          text: 'Đã thanh toán',
          color: 'text-green-600',
          bgColor: 'bg-green-100',
          borderColor: 'border-green-200',
          description: 'Thanh toán đã được xác nhận'
        };
      case 'PENDING':
        return {
          icon: Clock,
          text: 'Chờ thanh toán',
          color: 'text-yellow-600',
          bgColor: 'bg-yellow-100',
          borderColor: 'border-yellow-200',
          description: 'Đang chờ thực hiện thanh toán'
        };
      case 'OVERDUE':
        return {
          icon: AlertTriangle,
          text: 'Quá hạn',
          color: 'text-red-600',
          bgColor: 'bg-red-100',
          borderColor: 'border-red-200',
          description: 'Đã quá thời hạn thanh toán'
        };
      case 'FAILED':
        return {
          icon: XCircle,
          text: 'Thất bại',
          color: 'text-red-600',
          bgColor: 'bg-red-100',
          borderColor: 'border-red-200',
          description: 'Giao dịch không thành công'
        };
      case 'CANCELLED':
        return {
          icon: AlertCircle,
          text: 'Đã hủy',
          color: 'text-gray-600',
          bgColor: 'bg-gray-100',
          borderColor: 'border-gray-200',
          description: 'Giao dịch đã bị hủy'
        };
      case 'EXEMPTED':
        return {
          icon: AlertCircle,
          text: 'Miễn đóng',
          color: 'text-blue-600',
          bgColor: 'bg-blue-100',
          borderColor: 'border-blue-200',
          description: 'Được miễn đóng phí'
        };
      default:
        return {
          icon: Clock,
          text: 'Không xác định',
          color: 'text-gray-600',
          bgColor: 'bg-gray-100',
          borderColor: 'border-gray-200',
          description: 'Trạng thái không xác định'
        };
    }
  };

  const getSizeClasses = (size: string) => {
    switch (size) {
      case 'sm':
        return {
          container: 'px-2 py-1',
          icon: 'w-3 h-3',
          text: 'text-xs',
          badge: 'text-xs'
        };
      case 'lg':
        return {
          container: 'px-4 py-3',
          icon: 'w-6 h-6',
          text: 'text-base',
          badge: 'text-sm'
        };
      default: // md
        return {
          container: 'px-3 py-2',
          icon: 'w-4 h-4',
          text: 'text-sm',
          badge: 'text-xs'
        };
    }
  };

  const formatAmount = (amount: number) => {
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND'
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('vi-VN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    });
  };

  const isOverdue = () => {
    if (!dueDate || status === 'PAID' || status === 'EXEMPTED') return false;
    return new Date(dueDate) < new Date();
  };

  const getDaysUntilDue = () => {
    if (!dueDate) return null;
    const due = new Date(dueDate);
    const now = new Date();
    const diffTime = due.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  const config = getStatusConfig(status);
  const sizeClasses = getSizeClasses(size);
  const Icon = config.icon;
  const daysUntilDue = getDaysUntilDue();

  if (!showDetails) {
    // Simple badge view
    return (
      <span className={`inline-flex items-center space-x-1 rounded-full border font-medium ${config.bgColor} ${config.color} ${config.borderColor} ${sizeClasses.container} ${sizeClasses.badge} ${className}`}>
        <Icon className={sizeClasses.icon} />
        <span>{config.text}</span>
      </span>
    );
  }

  // Detailed view
  return (
    <div className={`rounded-lg border p-4 ${config.bgColor} ${config.borderColor} ${className}`}>
      <div className="flex items-center space-x-3">
        <div className={`p-2 rounded-full bg-white ${config.color}`}>
          <Icon className="w-5 h-5" />
        </div>
        
        <div className="flex-1">
          <div className="flex items-center justify-between">
            <h3 className={`font-semibold ${config.color} ${sizeClasses.text}`}>
              {config.text}
            </h3>
            
            {amount && (
              <div className="flex items-center space-x-1 text-gray-700">
                <DollarSign className="w-4 h-4" />
                <span className="font-semibold">{formatAmount(amount)}</span>
              </div>
            )}
          </div>
          
          <p className={`text-gray-600 mt-1 ${size === 'sm' ? 'text-xs' : 'text-sm'}`}>
            {config.description}
          </p>

          {/* Date information */}
          <div className="mt-2 space-y-1 text-xs text-gray-600">
            {paidAt && (
              <div>
                <span className="font-medium">Đã thanh toán:</span>
                <span className="ml-1 text-green-600">{formatDate(paidAt)}</span>
              </div>
            )}
            
            {dueDate && status !== 'PAID' && status !== 'EXEMPTED' && (
              <div>
                <span className="font-medium">Hạn thanh toán:</span>
                <span className={`ml-1 ${isOverdue() ? 'text-red-600 font-medium' : 'text-gray-600'}`}>
                  {formatDate(dueDate)}
                </span>
                
                {daysUntilDue !== null && (
                  <span className={`ml-2 ${daysUntilDue < 0 ? 'text-red-600' : daysUntilDue <= 3 ? 'text-yellow-600' : 'text-gray-500'}`}>
                    {daysUntilDue < 0 
                      ? `(Quá hạn ${Math.abs(daysUntilDue)} ngày)`
                      : daysUntilDue === 0
                      ? '(Hết hạn hôm nay)'
                      : `(Còn ${daysUntilDue} ngày)`
                    }
                  </span>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Progress indicator for pending payments */}
      {status === 'PENDING' && daysUntilDue !== null && daysUntilDue >= 0 && (
        <div className="mt-3">
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div 
              className={`h-2 rounded-full transition-all duration-300 ${
                daysUntilDue <= 3 ? 'bg-red-400' : daysUntilDue <= 7 ? 'bg-yellow-400' : 'bg-green-400'
              }`}
              style={{ 
                width: daysUntilDue <= 0 ? '100%' : `${Math.max(10, 100 - (daysUntilDue * 10))}%` 
              }}
            />
          </div>
          <p className="text-xs text-gray-500 mt-1">
            {daysUntilDue <= 3 ? 'Sắp hết hạn' : daysUntilDue <= 7 ? 'Gần hết hạn' : 'Còn thời gian'}
          </p>
        </div>
      )}
    </div>
  );
};

// Utility component for status comparison
interface PaymentStatusComparisonProps {
  statuses: Array<{
    label: string;
    status: PaymentStatusProps['status'];
    count: number;
    amount?: number;
  }>;
}

export const PaymentStatusComparison: React.FC<PaymentStatusComparisonProps> = ({ statuses }) => {
  const total = statuses.reduce((sum, item) => sum + item.count, 0);
  const totalAmount = statuses.reduce((sum, item) => sum + (item.amount || 0), 0);

  const formatAmount = (amount: number) => {
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND'
    }).format(amount);
  };

  return (
    <div className="bg-white rounded-lg border p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">Tổng quan trạng thái</h3>
      
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        {statuses.map((item, index) => {
          const percentage = total > 0 ? (item.count / total) * 100 : 0;
          
          return (
            <div key={index} className="text-center">
              <PaymentStatus status={item.status} size="sm" />
              <div className="mt-2">
                <p className="text-2xl font-bold text-gray-900">{item.count}</p>
                <p className="text-sm text-gray-600">{percentage.toFixed(1)}%</p>
                {item.amount && (
                  <p className="text-xs text-gray-500 mt-1">{formatAmount(item.amount)}</p>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <div className="border-t pt-4">
        <div className="flex justify-between text-sm">
          <span className="text-gray-600">Tổng số:</span>
          <span className="font-semibold">{total} giao dịch</span>
        </div>
        {totalAmount > 0 && (
          <div className="flex justify-between text-sm mt-1">
            <span className="text-gray-600">Tổng tiền:</span>
            <span className="font-semibold">{formatAmount(totalAmount)}</span>
          </div>
        )}
      </div>
    </div>
  );
};
