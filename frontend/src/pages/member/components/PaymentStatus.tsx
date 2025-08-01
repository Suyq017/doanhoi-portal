import React from 'react';
import { CheckCircle, Clock, AlertTriangle, Ban } from 'lucide-react';

interface PaymentStatusProps {
  status: 'PENDING' | 'PAID' | 'OVERDUE' | 'EXEMPTED';
  amount?: number;
  dueDate?: string;
  showDetails?: boolean;
}

export const PaymentStatus: React.FC<PaymentStatusProps> = ({
  status,
  amount,
  dueDate,
  showDetails = false
}) => {
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND',
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('vi-VN');
  };

  const getStatusConfig = () => {
    switch (status) {
      case 'PAID':
        return {
          icon: CheckCircle,
          text: 'Đã thanh toán',
          color: 'text-green-600',
          bgColor: 'bg-green-50',
          borderColor: 'border-green-200'
        };
      case 'PENDING':
        return {
          icon: Clock,
          text: 'Chờ thanh toán',
          color: 'text-yellow-600',
          bgColor: 'bg-yellow-50',
          borderColor: 'border-yellow-200'
        };
      case 'OVERDUE':
        return {
          icon: AlertTriangle,
          text: 'Quá hạn',
          color: 'text-red-600',
          bgColor: 'bg-red-50',
          borderColor: 'border-red-200'
        };
      case 'EXEMPTED':
        return {
          icon: Ban,
          text: 'Miễn đóng',
          color: 'text-gray-600',
          bgColor: 'bg-gray-50',
          borderColor: 'border-gray-200'
        };
      default:
        return {
          icon: Clock,
          text: 'Không xác định',
          color: 'text-gray-600',
          bgColor: 'bg-gray-50',
          borderColor: 'border-gray-200'
        };
    }
  };

  const config = getStatusConfig();
  const StatusIcon = config.icon;

  if (!showDetails) {
    return (
      <div className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${config.color} ${config.bgColor}`}>
        <StatusIcon className="w-4 h-4 mr-1" />
        {config.text}
      </div>
    );
  }

  return (
    <div className={`border rounded-lg p-4 ${config.borderColor} ${config.bgColor}`}>
      <div className="flex items-center space-x-3">
        <div className={`p-2 rounded-full ${config.bgColor}`}>
          <StatusIcon className={`w-5 h-5 ${config.color}`} />
        </div>
        <div className="flex-1">
          <h4 className={`font-medium ${config.color}`}>
            Trạng thái: {config.text}
          </h4>
          
          {showDetails && (
            <div className="mt-2 space-y-1 text-sm text-gray-600">
              {amount && (
                <p>
                  <span className="font-medium">Số tiền:</span> {formatCurrency(amount)}
                </p>
              )}
              
              {dueDate && (
                <p>
                  <span className="font-medium">Hạn đóng:</span> {formatDate(dueDate)}
                </p>
              )}
              
              {status === 'PENDING' && dueDate && (
                <p className="text-yellow-600">
                  {new Date(dueDate) < new Date() ? 
                    'Đã quá hạn thanh toán' : 
                    `Còn ${Math.ceil((new Date(dueDate).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))} ngày`
                  }
                </p>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
