import React, { useState, useEffect } from 'react';
import { QrCode, Copy, CheckCircle, RefreshCw } from 'lucide-react';

interface QRCodeDisplayProps {
  paymentData: {
    qrCode: string;
    orderCode: string;
    amount: number;
    description?: string;
  };
  amount: number;
  onSuccess: () => void;
  onError: () => void;
}

const QRCodeDisplay: React.FC<QRCodeDisplayProps> = ({ 
  paymentData, 
  amount, 
  onSuccess, 
  onError 
}) => {
  const [copied, setCopied] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState(15 * 60); // 15 minutes in seconds
  const [checking, setChecking] = useState(false);

  // Countdown timer
  useEffect(() => {
    const timer = setInterval(() => {
      setTimeRemaining((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          onError();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [onError]);

  // Auto check payment status every 5 seconds
  useEffect(() => {
    const checkInterval = setInterval(async () => {
      await checkPaymentStatus();
    }, 5000);

    return () => clearInterval(checkInterval);
  }, []);

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

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  const checkPaymentStatus = async () => {
    if (checking) return;
    
    setChecking(true);
    try {
      // Here you would make an API call to check payment status
      // For now, we'll simulate a check
      console.log('Checking payment status for order:', paymentData.orderCode);
      
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Check if payment is completed (this would be real API response)
      // For demo purposes, randomly succeed after some time
      if (Math.random() > 0.95) { // 5% chance each check
        onSuccess();
      }
    } catch (error) {
      console.error('Error checking payment status:', error);
    } finally {
      setChecking(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Timer */}
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 text-center">
        <div className="text-yellow-800">
          <p className="text-sm font-medium">Thời gian còn lại</p>
          <p className="text-2xl font-bold">{formatTime(timeRemaining)}</p>
        </div>
      </div>

      {/* QR Code */}
      <div className="text-center">
        <div className="bg-white border-2 border-gray-200 rounded-lg p-6 inline-block">
          {paymentData.qrCode ? (
            <img 
              src={paymentData.qrCode} 
              alt="QR Code" 
              className="w-48 h-48 mx-auto"
            />
          ) : (
            <div className="w-48 h-48 bg-gray-100 rounded-lg flex items-center justify-center">
              <QrCode className="w-16 h-16 text-gray-400" />
            </div>
          )}
        </div>
      </div>

      {/* Payment Info */}
      <div className="bg-gray-50 rounded-lg p-4 space-y-3">
        <div className="flex justify-between items-center">
          <span className="text-sm text-gray-600">Mã đơn hàng:</span>
          <div className="flex items-center space-x-2">
            <span className="font-mono text-sm">{paymentData.orderCode}</span>
            <button
              onClick={() => copyToClipboard(paymentData.orderCode)}
              className="text-gray-500 hover:text-gray-700"
            >
              {copied ? (
                <CheckCircle className="w-4 h-4 text-green-500" />
              ) : (
                <Copy className="w-4 h-4" />
              )}
            </button>
          </div>
        </div>

        <div className="flex justify-between items-center">
          <span className="text-sm text-gray-600">Số tiền:</span>
          <span className="font-bold text-lg text-indigo-600">
            {formatCurrency(amount)}
          </span>
        </div>
      </div>

      {/* Instructions */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
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
        onClick={checkPaymentStatus}
        disabled={checking}
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

export default QRCodeDisplay;
