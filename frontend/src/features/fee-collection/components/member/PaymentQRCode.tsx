import React, { useState, useEffect } from 'react';
import { X, Clock, CheckCircle, AlertTriangle, Copy, ExternalLink } from 'lucide-react';
import { PaymentAssignment } from '../../types';

interface PaymentQRCodeProps {
  assignment: PaymentAssignment;
  feeLevelId?: string;
  onClose: () => void;
  onSuccess: () => void;
}

interface PaymentLink {
  id: string;
  orderCode: string;
  qrCode: string;
  paymentUrl: string;
  amount: number;
  status: 'PENDING' | 'PAID' | 'CANCELLED' | 'EXPIRED';
  expiresAt: string;
}

const PaymentQRCode: React.FC<PaymentQRCodeProps> = ({
  assignment,
  feeLevelId,
  onClose,
  onSuccess
}) => {
  const [paymentLink, setPaymentLink] = useState<PaymentLink | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [timeLeft, setTimeLeft] = useState<number>(0);
  const [copied, setCopied] = useState(false);

  // Simulate payment link creation (replace with actual PayOS API call)
  useEffect(() => {
    createPaymentLink();
  }, []);

  // Timer for payment expiration
  useEffect(() => {
    if (paymentLink?.expiresAt) {
      const interval = setInterval(() => {
        const now = new Date().getTime();
        const expiry = new Date(paymentLink.expiresAt).getTime();
        const remaining = Math.max(0, expiry - now);
        
        setTimeLeft(remaining);
        
        if (remaining === 0) {
          setPaymentLink(prev => prev ? { ...prev, status: 'EXPIRED' } : null);
        }
      }, 1000);

      return () => clearInterval(interval);
    }
  }, [paymentLink?.expiresAt]);

  const createPaymentLink = async () => {
    try {
      setLoading(true);
      setError(null);

      // Get amount from fee level or assignment
      const amount = feeLevelId 
        ? assignment.campaign?.feeLevels?.find(level => level.id === feeLevelId)?.amount || 0
        : assignment.customAmount || assignment.feeLevel?.amount || 0;

      // Simulate API call to create PayOS payment link
      // In real implementation, this would call your backend PayOS service
      await new Promise(resolve => setTimeout(resolve, 1500));

      const mockPaymentLink: PaymentLink = {
        id: `payment_${Date.now()}`,
        orderCode: `ORDER_${Date.now()}`,
        qrCode: `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=https://pay.payos.vn/web/payment-${Date.now()}`,
        paymentUrl: `https://pay.payos.vn/web/payment-${Date.now()}`,
        amount,
        status: 'PENDING',
        expiresAt: new Date(Date.now() + 15 * 60 * 1000).toISOString() // 15 minutes
      };

      setPaymentLink(mockPaymentLink);
    } catch (err) {
      setError('Không thể tạo link thanh toán. Vui lòng thử lại.');
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

  const formatTime = (milliseconds: number) => {
    const minutes = Math.floor(milliseconds / 60000);
    const seconds = Math.floor((milliseconds % 60000) / 1000);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy to clipboard:', err);
    }
  };

  const openPaymentUrl = () => {
    if (paymentLink?.paymentUrl) {
      window.open(paymentLink.paymentUrl, '_blank');
    }
  };

  const checkPaymentStatus = async () => {
    // Simulate payment status check
    // In real implementation, this would call your backend to check PayOS status
    setLoading(true);
    
    try {
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Simulate random payment success for demo
      if (Math.random() > 0.5) {
        setPaymentLink(prev => prev ? { ...prev, status: 'PAID' } : null);
        setTimeout(() => {
          onSuccess();
        }, 2000);
      }
    } catch (err) {
      console.error('Payment status check failed:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-md w-full max-h-screen overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">
            Thanh toán
          </h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6">
          {/* Campaign Info */}
          <div className="mb-6">
            <h4 className="font-medium text-gray-900 mb-1">
              {assignment.campaign?.name}
            </h4>
            <p className="text-sm text-gray-600">
              {assignment.campaign?.organization?.name}
            </p>
          </div>

          {loading && !paymentLink ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-3"></div>
              <p className="text-sm text-gray-600">Đang tạo link thanh toán...</p>
            </div>
          ) : error ? (
            <div className="text-center py-8">
              <AlertTriangle className="w-12 h-12 text-red-500 mx-auto mb-3" />
              <p className="text-sm text-red-600 mb-4">{error}</p>
              <button
                onClick={createPaymentLink}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
              >
                Thử lại
              </button>
            </div>
          ) : paymentLink ? (
            <>
              {/* Amount */}
              <div className="bg-gray-50 rounded-lg p-4 mb-6">
                <div className="text-center">
                  <div className="text-sm text-gray-600 mb-1">Số tiền thanh toán</div>
                  <div className="text-2xl font-bold text-gray-900">
                    {formatAmount(paymentLink.amount)}
                  </div>
                </div>
              </div>

              {/* Payment Status */}
              {paymentLink.status === 'PAID' ? (
                <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
                  <div className="flex items-center text-green-800">
                    <CheckCircle className="w-5 h-5 mr-2" />
                    <span className="font-medium">Thanh toán thành công!</span>
                  </div>
                  <p className="text-sm text-green-700 mt-1">
                    Giao dịch đã được xử lý thành công.
                  </p>
                </div>
              ) : paymentLink.status === 'EXPIRED' ? (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
                  <div className="flex items-center text-red-800">
                    <AlertTriangle className="w-5 h-5 mr-2" />
                    <span className="font-medium">Link thanh toán đã hết hạn</span>
                  </div>
                  <p className="text-sm text-red-700 mt-1">
                    Vui lòng tạo link thanh toán mới.
                  </p>
                  <button
                    onClick={createPaymentLink}
                    className="mt-3 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors text-sm"
                  >
                    Tạo link mới
                  </button>
                </div>
              ) : (
                <>
                  {/* Timer */}
                  <div className="flex items-center justify-center mb-4">
                    <Clock className="w-4 h-4 text-orange-500 mr-2" />
                    <span className="text-sm text-orange-600">
                      Thời gian còn lại: {formatTime(timeLeft)}
                    </span>
                  </div>

                  {/* QR Code */}
                  <div className="text-center mb-6">
                    <div className="inline-block p-4 bg-white border-2 border-gray-200 rounded-lg">
                      <img
                        src={paymentLink.qrCode}
                        alt="QR Code thanh toán"
                        className="w-48 h-48 mx-auto"
                      />
                    </div>
                    <p className="text-sm text-gray-600 mt-3">
                      Quét mã QR để thanh toán bằng ứng dụng ngân hàng
                    </p>
                  </div>

                  {/* Payment URL */}
                  <div className="mb-6">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Hoặc sao chép link thanh toán
                    </label>
                    <div className="flex items-center space-x-2">
                      <input
                        type="text"
                        value={paymentLink.paymentUrl}
                        readOnly
                        className="flex-1 px-3 py-2 border border-gray-300 rounded-md text-sm bg-gray-50 text-gray-600"
                      />
                      <button
                        onClick={() => copyToClipboard(paymentLink.paymentUrl)}
                        className="px-3 py-2 border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
                        title="Sao chép"
                      >
                        <Copy className="w-4 h-4" />
                      </button>
                      <button
                        onClick={openPaymentUrl}
                        className="px-3 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
                        title="Mở trong tab mới"
                      >
                        <ExternalLink className="w-4 h-4" />
                      </button>
                    </div>
                    {copied && (
                      <p className="text-sm text-green-600 mt-1">Đã sao chép!</p>
                    )}
                  </div>

                  {/* Check Payment Button */}
                  <div className="text-center">
                    <button
                      onClick={checkPaymentStatus}
                      disabled={loading}
                      className="px-6 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50 transition-colors"
                    >
                      {loading ? (
                        <div className="flex items-center">
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                          Đang kiểm tra...
                        </div>
                      ) : (
                        'Tôi đã thanh toán'
                      )}
                    </button>
                    <p className="text-xs text-gray-500 mt-2">
                      Nhấn sau khi hoàn tất thanh toán
                    </p>
                  </div>
                </>
              )}

              {/* Order Code */}
              <div className="mt-6 pt-4 border-t border-gray-200">
                <div className="text-xs text-gray-500">
                  Mã đơn hàng: {paymentLink.orderCode}
                </div>
              </div>
            </>
          ) : null}
        </div>
      </div>
    </div>
  );
};

export default PaymentQRCode;
