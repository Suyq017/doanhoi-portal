import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { CheckCircle, XCircle, Clock, AlertTriangle, RefreshCw } from 'lucide-react';
import { paymentService } from '../../features/fee-collection/services/paymentService';

interface PaymentStatus {
  id: string;
  orderCode: number;
  amount: number;
  description: string;
  status: string;
  createdAt: string;
  transactions?: Array<{
    reference: string;
    amount: number;
    accountNumber: string;
    description: string;
    transactionDateTime: string;
  }>;
}

export const PaymentResultPage: React.FC = () => {
  const { orderCode } = useParams<{ orderCode: string }>();
  const navigate = useNavigate();
  
  const [paymentStatus, setPaymentStatus] = useState<PaymentStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [checking, setChecking] = useState(false);

  useEffect(() => {
    if (orderCode) {
      checkPaymentStatus();
      
      // Auto-refresh every 5 seconds if status is pending
      const interval = setInterval(() => {
        if (paymentStatus?.status === 'PENDING') {
          checkPaymentStatus();
        }
      }, 5000);

      return () => clearInterval(interval);
    }
  }, [orderCode, paymentStatus?.status]);

  const checkPaymentStatus = async () => {
    if (!orderCode) return;
    
    try {
      setChecking(true);
      setError(null);

      // Call PayOS service để check status (không cần organizationId)
      const response : any = await paymentService.checkPaymentStatus(orderCode);
      setPaymentStatus(response?.data);
      
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Có lỗi xảy ra');
    } finally {
      setLoading(false);
      setChecking(false);
    }
  };

  const getStatusDisplay = (status: string) => {
    switch (status?.toUpperCase()) {
      case 'PAID':
        return {
          icon: <CheckCircle className="w-16 h-16 text-green-500" />,
          title: 'Thanh toán thành công!',
          message: 'Giao dịch của bạn đã được xử lý thành công.',
          bgColor: 'bg-green-50',
          borderColor: 'border-green-200',
          textColor: 'text-green-800'
        };
      case 'CANCELLED':
        return {
          icon: <XCircle className="w-16 h-16 text-red-500" />,
          title: 'Thanh toán đã bị hủy',
          message: 'Giao dịch đã bị hủy.',
          bgColor: 'bg-red-50',
          borderColor: 'border-red-200',
          textColor: 'text-red-800'
        };
      case 'EXPIRED':
        return {
          icon: <AlertTriangle className="w-16 h-16 text-orange-500" />,
          title: 'Thanh toán đã hết hạn',
          message: 'Link thanh toán đã hết hạn.',
          bgColor: 'bg-orange-50',
          borderColor: 'border-orange-200',
          textColor: 'text-orange-800'
        };
      default:
        return {
          icon: <Clock className="w-16 h-16 text-blue-500" />,
          title: 'Đang xử lý thanh toán',
          message: 'Giao dịch đang được xử lý, vui lòng đợi.',
          bgColor: 'bg-blue-50',
          borderColor: 'border-blue-200',
          textColor: 'text-blue-800'
        };
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="text-center">
          <div className="w-8 h-8 mx-auto mb-4 border-b-2 border-blue-600 rounded-full animate-spin"></div>
          <p className="text-gray-600">Đang kiểm tra trạng thái thanh toán...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="w-full max-w-md p-8 mx-4 bg-white rounded-lg shadow-lg">
          <div className="text-center">
            <XCircle className="w-16 h-16 mx-auto mb-4 text-red-500" />
            <h1 className="mb-2 text-xl font-bold text-gray-900">Có lỗi xảy ra</h1>
            <p className="mb-6 text-gray-600">{error}</p>
            <div className="space-y-3">
              <button
                onClick={checkPaymentStatus}
                className="flex items-center justify-center w-full px-4 py-2 space-x-2 text-white bg-blue-600 rounded-lg hover:bg-blue-700"
              >
                <RefreshCw className="w-4 h-4" />
                <span>Thử lại</span>
              </button>
              <button
                onClick={() => navigate('/payment/my-campaigns')}
                className="w-full px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
              >
                Quay về trang chủ
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!paymentStatus) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="w-full max-w-md p-8 mx-4 bg-white rounded-lg shadow-lg">
          <div className="text-center">
            <AlertTriangle className="w-16 h-16 mx-auto mb-4 text-orange-500" />
            <h1 className="mb-2 text-xl font-bold text-gray-900">Không tìm thấy giao dịch</h1>
            <p className="mb-6 text-gray-600">Mã giao dịch không hợp lệ hoặc đã bị xóa.</p>
            <button
              onClick={() => navigate('/payment/my-campaigns')}
              className="w-full px-4 py-2 text-white bg-blue-600 rounded-lg hover:bg-blue-700"
            >
              Quay về trang chủ
            </button>
          </div>
        </div>
      </div>
    );
  }

  const statusDisplay = getStatusDisplay(paymentStatus.status);

  return (
    <div className="min-h-screen py-8 bg-gray-50">
      <div className="max-w-md px-4 mx-auto">
        <div className="overflow-hidden bg-white rounded-lg shadow-lg">
          {/* Header */}
          <div className="px-6 py-4 border-b bg-gray-50">
            <h1 className="text-lg font-semibold text-gray-900">
              Kết quả thanh toán PayOS
            </h1>
          </div>

          {/* Status Display */}
          <div className="p-6">
            <div className="mb-6 text-center">
              {statusDisplay.icon}
              <h2 className="mt-4 mb-2 text-xl font-bold text-gray-900">
                {statusDisplay.title}
              </h2>
              <p className="text-gray-600">
                {statusDisplay.message}
              </p>
            </div>

            {/* Transaction Details */}
            <div className={`${statusDisplay.bgColor} ${statusDisplay.borderColor} border rounded-lg p-4 mb-6`}>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Mã giao dịch:</span>
                  <span className="font-mono text-sm font-medium">{paymentStatus.orderCode}</span>
                </div>
                
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Số tiền:</span>
                  <span className="text-lg font-bold text-indigo-600">
                    {new Intl.NumberFormat('vi-VN', {
                      style: 'currency',
                      currency: 'VND'
                    }).format(paymentStatus.amount)}
                  </span>
                </div>

                <div className="flex items-start justify-between">
                  <span className="text-sm text-gray-600">Mô tả:</span>
                  <span className="flex-1 ml-2 text-sm text-right">{paymentStatus.description}</span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Thời gian tạo:</span>
                  <span className="text-sm">
                    {new Date(paymentStatus.createdAt).toLocaleString('vi-VN')}
                  </span>
                </div>

                {/* Payment Transaction Info */}
                {paymentStatus.transactions && paymentStatus.transactions.length > 0 && (
                  <div className="pt-3 border-t border-gray-200">
                    <div className="mb-2 text-sm font-medium text-gray-700">Thông tin giao dịch:</div>
                    {paymentStatus.transactions.map((tx, index) => (
                      <div key={index} className="space-y-1 text-sm">
                        <div className="flex justify-between">
                          <span className="text-gray-600">Số tài khoản:</span>
                          <span>{tx.accountNumber}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Thời gian:</span>
                          <span>{new Date(tx.transactionDateTime).toLocaleString('vi-VN')}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Auto-refresh indicator */}
            {paymentStatus.status === 'PENDING' && (
              <div className="flex items-center justify-center mb-6 space-x-2">
                <RefreshCw className={`w-4 h-4 text-blue-500 ${checking ? 'animate-spin' : ''}`} />
                <span className="text-sm text-gray-600">
                  {checking ? 'Đang kiểm tra...' : 'Tự động cập nhật mỗi 5 giây'}
                </span>
              </div>
            )}

            {/* Action Buttons */}
            <div className="space-y-3">
              {paymentStatus.status !== 'PAID' && (
                <button
                  onClick={checkPaymentStatus}
                  disabled={checking}
                  className="flex items-center justify-center w-full px-4 py-3 space-x-2 font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50"
                >
                  {checking ? (
                    <>
                      <div className="w-4 h-4 border-b-2 border-white rounded-full animate-spin"></div>
                      <span>Đang kiểm tra...</span>
                    </>
                  ) : (
                    <>
                      <RefreshCw className="w-4 h-4" />
                      <span>Kiểm tra lại</span>
                    </>
                  )}
                </button>
              )}

              {paymentStatus.status === 'PAID' && (
                <button
                  onClick={() => navigate('/payment/history')}
                  className="w-full px-4 py-3 font-medium text-white bg-green-600 rounded-lg hover:bg-green-700"
                >
                  Xem lịch sử thanh toán
                </button>
              )}

              {(paymentStatus.status === 'CANCELLED' || paymentStatus.status === 'EXPIRED') && (
                <button
                  onClick={() => navigate('/payment/my-campaigns')}
                  className="w-full px-4 py-3 font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700"
                >
                  Thử thanh toán lại
                </button>
              )}

              <button
                onClick={() => navigate('/payment/my-campaigns')}
                className="w-full px-4 py-3 font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
              >
                Quay về trang chủ
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
