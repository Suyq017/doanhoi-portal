import React from 'react';
import { CheckCircle, Clock, AlertCircle, XCircle } from 'lucide-react';

interface PaymentStatusBadgeProps {
  status: 'PENDING' | 'PAID' | 'OVERDUE' | 'EXEMPTED';
}

const PaymentStatusBadge: React.FC<PaymentStatusBadgeProps> = ({ status }) => {
  const getStatusConfig = () => {
    switch (status) {
      case 'PAID':
        return {
          icon: CheckCircle,
          text: 'Đã đóng',
          className: 'bg-green-100 text-green-800'
        };
      case 'PENDING':
        return {
          icon: Clock,
          text: 'Chưa đóng',
          className: 'bg-yellow-100 text-yellow-800'
        };
      case 'OVERDUE':
        return {
          icon: AlertCircle,
          text: 'Quá hạn',
          className: 'bg-red-100 text-red-800'
        };
      case 'EXEMPTED':
        return {
          icon: XCircle,
          text: 'Miễn đóng',
          className: 'bg-gray-100 text-gray-800'
        };
      default:
        return {
          icon: Clock,
          text: 'Không xác định',
          className: 'bg-gray-100 text-gray-800'
        };
    }
  };

  const { icon: Icon, text, className } = getStatusConfig();

  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${className}`}>
      <Icon className="w-3 h-3 mr-1" />
      {text}
    </span>
  );
};

export default PaymentStatusBadge;
