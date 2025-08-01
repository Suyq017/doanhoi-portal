import React, { useState, useEffect } from 'react';
import { QrCode, Clock, CheckCircle, AlertCircle, RefreshCw } from 'lucide-react';
import { usePaymentProcess } from '../../../features/fee-collection/hooks/usePaymentProcess';

interface PaymentTransactionTrackerProps {
  transactionId: string;
  onStatusChange: (status: string) => void;
}

export const PaymentTransactionTracker: React.FC<PaymentTransactionTrackerProps> = ({
  transactionId,
  onStatusChange
}) => {
  const [qrCode, setQrCode] = useState<string>('');
  const [orderCode, setOrderCode] = useState<string>('');
  const [amount, setAmount] = useState<number>(0);
  const [timeRemaining, setTimeRemaining] = useState(900); // 15 minutes
  const [status, setStatus] = useState<'PENDING' | 'PAID' | 'CANCELLED' | 'EXPIRED'>('PENDING');
  const [checking, setChecking] = useState(false);

  const { checkPaymentStatus } = usePaymentProcess();

  // Countdown timer
  useEffect(() => {
    if (status !== 'PENDING') return;

    const timer = setInterval(() => {
      setTimeRemaining((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          setStatus('EXPIRED');
          onStatusChange('EXPIRED');
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [status, onStatusChange]);

  // Auto check payment status
  useEffect(() => {
    if (status !== 'PENDING') return;

    const checkInterval = setInterval(async () => {
      await handleCheckStatus();
    }, 5000);

    return () => clearInterval(checkInterval);
  }, [status]);

  const formatTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND',
    }).format(amount);
  };

  const handleCheckStatus = async () => {
    if (checking || !orderCode) return;
    
    setChecking(true);
    try {
      const result = await checkPaymentStatus(orderCode);
      if (result.status !== status) {
        setStatus(result.status);
        onStatusChange(result.status);
      }
    } catch (error) {
      console.error('Error checking payment status:', error);
    } finally {
      setChecking(false);
    }
  };

  if (status === 'PAID') {
    return (
      <div className="bg-white rounded-lg shadow-sm p-6 text-center">
        <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <CheckCircle className="w-8 h-8 text-green-500" />
        </div>
        <h3 className="text-lg font-semibold text-gray-900 mb-2">Thanh toán thành công!</h3>
        <p className="text-gray-600">
          Giao dịch đã được xử lý thành công.
        </p>
      </div>
    );
  }

  if (status === 'EXPIRED') {
    return (
      <div className="bg-white rounded-lg shadow-sm p-6 text-center">
        <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <AlertCircle className="w-8 h-8 text-red-500" />
        </div>
        <h3 className="text-lg font-semibold text-gray-900 mb-2">Hết thời gian thanh toán</h3>
        <p className="text-gray-600">
          Vui lòng thử lại để tạo giao dịch mới.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-sm p-6">
      {/* Timer */}
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 text-center mb-6">
        <div className="text-yellow-800">
          <p className="text-sm font-medium">Thời gian còn lại</p>
          <p className="text-2xl font-bold">{formatTime(timeRemaining)}</p>
        </div>
      </div>

      {/* QR Code */}
      <div className="text-center mb-6">
        <div className="bg-white border-2 border-gray-200 rounded-lg p-6 inline-block">
          {qrCode ? (
            <img 
              src={qrCode} 
              alt="QR Code" 
              className="w-48 h-48 mx-auto"
            />
          ) : (
            <div className="w-48 h-48 bg-gray-100 rounded-lg flex items-center justify-center">
              <QrCode className="w-16 h-16 text-gray-400" />
              <div className="ml-2">
                <p className="text-gray-500 text-sm">Đang tạo mã QR...</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Payment Info */}
      {orderCode && (
        <div className="bg-gray-50 rounded-lg p-4 space-y-3 mb-6">
          <div className="flex justify-between items-center">
            <span className="text-sm text-gray-600">Mã đơn hàng:</span>
            <span className="font-mono text-sm">{orderCode}</span>
          </div>
          {amount > 0 && (
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">Số tiền:</span>
              <span className="font-bold text-lg text-indigo-600">
                {formatCurrency(amount)}
              </span>
            </div>
          )}
        </div>
      )}

      {/* Instructions */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
        <h4 className="font-medium text-blue-900 mb-2">Hướng dẫn thanh toán</h4>
        <ol className="text-sm text-blue-800 space-y-1 list-decimal list-inside">
          <li>Mở app ngân hàng trên điện thoại</li>
          <li>Chọn chức năng quét QR Code</li>
          <li>Quét mã QR trên màn hình</li>
          <li>Xác nhận thông tin và thanh toán</li>
        </ol>
      </div>

      {/* Manual Check Button */}
      <button
        onClick={handleCheckStatus}
        disabled={checking || !orderCode}
        className="w-full bg-gray-100 text-gray-700 py-3 px-4 rounded-lg hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
      >
        {checking ? (
          <>
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-600"></div>
            <span>Đang kiểm tra...</span>
          </>
        ) : (
          <>
            <RefreshCw className="w-4 h-4" />
            <span>Kiểm tra trạng thái thanh toán</span>
          </>
        )}
      </button>
    </div>
  );
};
