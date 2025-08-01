import React, { useState, useEffect } from 'react';
import { CheckCircle, Clock, XCircle, AlertCircle, QrCode } from 'lucide-react';

interface PaymentTransaction {
  id: string;
  assignmentId: string;
  amount: number;
  status: 'PENDING' | 'PAID' | 'FAILED' | 'CANCELLED';
  payosOrderCode: number;
  checkoutUrl?: string;
  qrCode?: string;
  description: string;
  createdAt: string;
  paidAt?: string;
}

interface PaymentTransactionTrackerProps {
  transactionId: string;
  onStatusChange?: (status: string) => void;
}

export const PaymentTransactionTracker: React.FC<PaymentTransactionTrackerProps> = ({
  transactionId,
  onStatusChange
}) => {
  const [transaction, setTransaction] = useState<PaymentTransaction | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showQR, setShowQR] = useState(false);

  const fetchTransactionStatus = async () => {
    try {
      const response = await fetch(`/payment/transactions/${transactionId}`);
      if (!response.ok) throw new Error('Failed to fetch transaction');
      
      const result = await response.json();
      if (result.success) {
        setTransaction(result.data);
        onStatusChange?.(result.data.status);
      }
    } catch (err) {
      setError('Failed to load transaction status');
    } finally {
      setLoading(false);
    }
  };

  const checkPaymentStatus = async () => {
    if (!transaction?.payosOrderCode) return;
    
    try {
      const response = await fetch(`/payment/transactions/${transaction.payosOrderCode}/status`);
      if (!response.ok) throw new Error('Failed to check payment status');
      
      const result = await response.json();
      if (result.success) {
        await fetchTransactionStatus(); // Refresh transaction data
      }
    } catch (err) {
      console.error('Failed to check payment status:', err);
    }
  };

  useEffect(() => {
    fetchTransactionStatus();
    
    // Poll for status updates every 10 seconds for pending transactions
    const interval = setInterval(() => {
      if (transaction?.status === 'PENDING') {
        checkPaymentStatus();
      }
    }, 10000);

    return () => clearInterval(interval);
  }, [transactionId, transaction?.status]);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'PAID':
        return <CheckCircle className="w-6 h-6 text-green-500" />;
      case 'PENDING':
        return <Clock className="w-6 h-6 text-yellow-500" />;
      case 'FAILED':
        return <XCircle className="w-6 h-6 text-red-500" />;
      case 'CANCELLED':
        return <AlertCircle className="w-6 h-6 text-gray-500" />;
      default:
        return <Clock className="w-6 h-6 text-gray-400" />;
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'PAID':
        return 'Đã thanh toán';
      case 'PENDING':
        return 'Chờ thanh toán';
      case 'FAILED':
        return 'Thanh toán thất bại';
      case 'CANCELLED':
        return 'Đã hủy';
      default:
        return 'Không xác định';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'PAID':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'PENDING':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'FAILED':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'CANCELLED':
        return 'bg-gray-100 text-gray-800 border-gray-200';
      default:
        return 'bg-gray-100 text-gray-600 border-gray-200';
    }
  };

  const formatAmount = (amount: number) => {
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND'
    }).format(amount);
  };

  const formatDateTime = (dateString: string) => {
    return new Date(dateString).toLocaleString('vi-VN');
  };

  const openPaymentLink = () => {
    if (transaction?.checkoutUrl) {
      window.open(transaction.checkoutUrl, '_blank');
    }
  };

  if (loading) {
    return (
      <div className="p-6 bg-white rounded-lg border animate-pulse">
        <div className="flex items-center space-x-4">
          <div className="w-6 h-6 bg-gray-200 rounded-full"></div>
          <div className="h-4 bg-gray-200 rounded w-32"></div>
        </div>
        <div className="mt-4 space-y-2">
          <div className="h-3 bg-gray-200 rounded w-48"></div>
          <div className="h-3 bg-gray-200 rounded w-32"></div>
        </div>
      </div>
    );
  }

  if (error || !transaction) {
    return (
      <div className="p-6 bg-white rounded-lg border border-red-200">
        <div className="flex items-center space-x-2 text-red-600">
          <XCircle className="w-5 h-5" />
          <span className="font-medium">Lỗi tải dữ liệu</span>
        </div>
        <p className="text-sm text-red-500 mt-2">{error || 'Không thể tải thông tin giao dịch'}</p>
        <button
          onClick={fetchTransactionStatus}
          className="mt-3 px-4 py-2 bg-red-50 text-red-600 rounded hover:bg-red-100 text-sm"
        >
          Thử lại
        </button>
      </div>
    );
  }

  return (
    <div className="p-6 bg-white rounded-lg border">
      {/* Status Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-3">
          {getStatusIcon(transaction.status)}
          <div>
            <span className={`inline-flex px-3 py-1 rounded-full text-xs font-medium border ${getStatusColor(transaction.status)}`}>
              {getStatusText(transaction.status)}
            </span>
          </div>
        </div>
        
        {transaction.status === 'PENDING' && (
          <button
            onClick={checkPaymentStatus}
            className="text-sm text-blue-600 hover:text-blue-800 font-medium"
          >
            Kiểm tra trạng thái
          </button>
        )}
      </div>

      {/* Transaction Details */}
      <div className="space-y-3">
        <div className="flex justify-between items-center">
          <span className="text-sm text-gray-600">Số tiền:</span>
          <span className="font-semibold text-lg">{formatAmount(transaction.amount)}</span>
        </div>
        
        <div className="flex justify-between items-center">
          <span className="text-sm text-gray-600">Mã giao dịch:</span>
          <span className="font-mono text-sm">{transaction.payosOrderCode}</span>
        </div>

        <div className="flex justify-between items-center">
          <span className="text-sm text-gray-600">Thời gian tạo:</span>
          <span className="text-sm">{formatDateTime(transaction.createdAt)}</span>
        </div>

        {transaction.paidAt && (
          <div className="flex justify-between items-center">
            <span className="text-sm text-gray-600">Thời gian thanh toán:</span>
            <span className="text-sm text-green-600">{formatDateTime(transaction.paidAt)}</span>
          </div>
        )}

        {transaction.description && (
          <div className="pt-2 border-t">
            <span className="text-sm text-gray-600">Mô tả:</span>
            <p className="text-sm mt-1">{transaction.description}</p>
          </div>
        )}
      </div>

      {/* Payment Actions */}
      {transaction.status === 'PENDING' && (
        <div className="mt-6 space-y-3">
          <div className="flex space-x-3">
            {transaction.checkoutUrl && (
              <button
                onClick={openPaymentLink}
                className="flex-1 bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 font-medium"
              >
                Thanh toán ngay
              </button>
            )}
            
            {transaction.qrCode && (
              <button
                onClick={() => setShowQR(!showQR)}
                className="bg-gray-100 text-gray-700 py-2 px-4 rounded-lg hover:bg-gray-200 font-medium flex items-center space-x-2"
              >
                <QrCode className="w-4 h-4" />
                <span>QR Code</span>
              </button>
            )}
          </div>

          {/* QR Code Display */}
          {showQR && transaction.qrCode && (
            <div className="mt-4 p-4 bg-gray-50 rounded-lg text-center">
              <p className="text-sm text-gray-600 mb-3">Quét mã QR để thanh toán</p>
              <img
                src={transaction.qrCode}
                alt="QR Code thanh toán"
                className="mx-auto max-w-48 h-auto"
              />
            </div>
          )}

          {/* Auto-refresh notice */}
          <div className="text-xs text-gray-500 text-center">
            Trạng thái sẽ được cập nhật tự động sau khi thanh toán thành công
          </div>
        </div>
      )}

      {/* Success Message */}
      {transaction.status === 'PAID' && (
        <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-lg">
          <div className="flex items-center space-x-2 text-green-700">
            <CheckCircle className="w-4 h-4" />
            <span className="text-sm font-medium">Thanh toán thành công!</span>
          </div>
        </div>
      )}

      {/* Failed/Cancelled Message */}
      {(transaction.status === 'FAILED' || transaction.status === 'CANCELLED') && (
        <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg">
          <div className="flex items-center space-x-2 text-red-700">
            <XCircle className="w-4 h-4" />
            <span className="text-sm font-medium">
              {transaction.status === 'FAILED' ? 'Thanh toán thất bại' : 'Giao dịch đã bị hủy'}
            </span>
          </div>
        </div>
      )}
    </div>
  );
};
