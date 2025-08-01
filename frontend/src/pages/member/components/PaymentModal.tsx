import React, { useState } from 'react';
import { X, CreditCard, QrCode, CheckCircle, AlertCircle, Clock } from 'lucide-react';
import { PaymentAssignment } from '../../../features/fee-collection/types';
import QRCodeDisplay from './QRCodeDisplay';
import { usePaymentProcess } from '../../../features/fee-collection/hooks/usePaymentProcess';

interface PaymentModalProps {
  assignment: PaymentAssignment;
  onSuccess: () => void;
  onClose: () => void;
}

const PaymentModal: React.FC<PaymentModalProps> = ({ assignment, onSuccess, onClose }) => {
  const [step, setStep] = useState<'info' | 'qr' | 'processing' | 'success' | 'error'>('info');
  const [paymentData, setPaymentData] = useState<any>(null);
  
  const { createPayment, checkPaymentStatus, loading } = usePaymentProcess();

  const amount = assignment.customAmount || assignment.feeLevel?.amount || 0;

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND',
    }).format(amount);
  };

  const handleCreatePayment = async () => {
    try {
      const payment = await createPayment(assignment.id, amount);
      setPaymentData(payment);
      setStep('qr');
    } catch (error) {
      console.error('Error creating payment:', error);
      setStep('error');
    }
  };

  const handlePaymentSuccess = () => {
    setStep('success');
    setTimeout(() => {
      onSuccess();
    }, 2000);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-md w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <h3 className="text-lg font-medium text-gray-900">
            Thanh Toán Phí
          </h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {step === 'info' && (
            <div className="space-y-4">
              {/* Payment Info */}
              <div className="bg-gray-50 rounded-lg p-4">
                <h4 className="font-medium text-gray-900 mb-2">Thông tin thanh toán</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Đợt đóng phí:</span>
                    <span className="font-medium">{assignment.campaign?.name}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Tổ chức:</span>
                    <span>{assignment.campaign?.organization?.name}</span>
                  </div>
                  {assignment.feeLevel && (
                    <div className="flex justify-between">
                      <span className="text-gray-600">Mức phí:</span>
                      <span>{assignment.feeLevel.levelName}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-lg font-bold border-t pt-2">
                    <span>Số tiền:</span>
                    <span className="text-indigo-600">{formatCurrency(amount)}</span>
                  </div>
                </div>
              </div>

              {/* Payment Note */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex">
                  <CreditCard className="w-5 h-5 text-blue-600 mt-0.5" />
                  <div className="ml-3">
                    <h4 className="text-sm font-medium text-blue-900">
                      Thanh toán qua PayOS
                    </h4>
                    <p className="text-sm text-blue-700 mt-1">
                      Sau khi nhấn "Tạo QR Code", bạn sẽ có thể quét mã QR bằng app ngân hàng để thanh toán.
                    </p>
                  </div>
                </div>
              </div>

              {/* Action Button */}
              <button
                onClick={handleCreatePayment}
                disabled={loading}
                className="w-full bg-indigo-600 text-white py-3 px-4 rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
              >
                {loading ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    <span>Đang tạo...</span>
                  </>
                ) : (
                  <>
                    <QrCode className="w-4 h-4" />
                    <span>Tạo QR Code Thanh Toán</span>
                  </>
                )}
              </button>
            </div>
          )}

          {step === 'qr' && paymentData && (
            <QRCodeDisplay
              paymentData={paymentData}
              amount={amount}
              onSuccess={handlePaymentSuccess}
              onError={() => setStep('error')}
            />
          )}

          {step === 'processing' && (
            <div className="text-center py-8">
              <Clock className="w-12 h-12 text-blue-500 mx-auto mb-4 animate-pulse" />
              <h4 className="text-lg font-medium text-gray-900 mb-2">
                Đang xử lý thanh toán
              </h4>
              <p className="text-gray-600">
                Vui lòng đợi trong giây lát...
              </p>
            </div>
          )}

          {step === 'success' && (
            <div className="text-center py-8">
              <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-4" />
              <h4 className="text-lg font-medium text-gray-900 mb-2">
                Thanh toán thành công!
              </h4>
              <p className="text-gray-600">
                Phí của bạn đã được thanh toán thành công.
              </p>
            </div>
          )}

          {step === 'error' && (
            <div className="text-center py-8">
              <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
              <h4 className="text-lg font-medium text-gray-900 mb-2">
                Có lỗi xảy ra
              </h4>
              <p className="text-gray-600 mb-4">
                Không thể tạo thanh toán. Vui lòng thử lại.
              </p>
              <button
                onClick={() => setStep('info')}
                className="bg-gray-600 text-white px-4 py-2 rounded-lg hover:bg-gray-700"
              >
                Thử lại
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default PaymentModal;
