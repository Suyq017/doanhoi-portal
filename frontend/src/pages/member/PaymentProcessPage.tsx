import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, CreditCard, CheckCircle } from 'lucide-react';
import { useMyPaymentAssignments } from '../../features/fee-collection/hooks/useMyPaymentAssignments';
import { usePaymentProcess } from '../../features/fee-collection/hooks/usePaymentProcess';
import type { PaymentAssignment } from '../../features/fee-collection/types';

export const PaymentProcessPage: React.FC = () => {
  const { assignmentId } = useParams<{ assignmentId: string }>();
  const navigate = useNavigate();
  const [assignment, setAssignment] = useState<PaymentAssignment | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const { assignments } = useMyPaymentAssignments();
  const { createPayment, loading: paymentLoading, error: paymentError } = usePaymentProcess();

  useEffect(() => {
    if (assignmentId && assignments.length > 0) {
      fetchAssignment();
    }
  }, [assignmentId, assignments]);

  const fetchAssignment = async () => {
    try {
      setLoading(true);
      setError(null);

      // Find assignment from the list
      const found = assignments.find(a => a.id === assignmentId);
      if (found) {
        setAssignment(found);
      } else {
        setError('Không tìm thấy thông tin phân công đóng phí');
      }
    } catch (err) {
      setError('Không thể tải thông tin phân công');
    } finally {
      setLoading(false);
    }
  };

  const handleStartPayment = async () => {
    if (!assignment) return;

    try {
      const amount = assignment.customAmount || assignment.feeLevel?.amount || 0;
      const paymentData = await createPayment(assignment.id, amount);
      
      if (paymentData) {
        // Redirect to payment URL or show success
        alert('Thanh toán đã được tạo thành công!');
        navigate('/member/payment');
      }
    } catch (err) {
      setError('Không thể tạo thanh toán');
    }
  };

  const formatAmount = (amount: number) => {
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND'
    }).format(amount);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Đang tải thông tin...</p>
        </div>
      </div>
    );
  }

  if (error || !assignment) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="bg-white p-8 rounded-lg shadow-sm max-w-md w-full text-center">
          <div className="text-red-500 mb-4">
            <svg className="w-16 h-16 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.5 0L4.268 19.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          </div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Lỗi</h2>
          <p className="text-gray-600 mb-6">{error || 'Không tìm thấy thông tin thanh toán'}</p>
          <button
            onClick={() => navigate('/payment/my-campaigns')}
            className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 font-medium"
          >
            Quay lại
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center space-x-4 mb-8">
          <button
            onClick={() => navigate('/member/payment')}
            className="p-2 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Thanh toán phí</h1>
            {assignment && <p className="text-gray-600">{assignment.campaign?.name}</p>}
          </div>
        </div>

        {/* Payment Details */}
        {assignment && (
          <div className="bg-white rounded-lg shadow-sm p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Thông tin đóng phí</h2>
            
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-700">Tổ chức:</label>
                  <p className="text-gray-900">{assignment.campaign?.organization?.name}</p>
                </div>
                
                <div>
                  <label className="text-sm font-medium text-gray-700">Đợt đóng phí:</label>
                  <p className="text-gray-900">{assignment.campaign?.name}</p>
                </div>
                
                {assignment.feeLevel && (
                  <div>
                    <label className="text-sm font-medium text-gray-700">Mức phí:</label>
                    <p className="text-gray-900">{assignment.feeLevel.levelName}</p>
                  </div>
                )}
                
                <div>
                  <label className="text-sm font-medium text-gray-700">Số tiền:</label>
                  <p className="text-xl font-semibold text-blue-600">
                    {formatAmount(assignment.customAmount || assignment.feeLevel?.amount || 0)}
                  </p>
                </div>
              </div>

              {assignment.campaign?.description && (
                <div>
                  <label className="text-sm font-medium text-gray-700">Mô tả:</label>
                  <p className="text-gray-600 mt-1">{assignment.campaign.description}</p>
                </div>
              )}

              {assignment.feeLevel?.description && (
                <div>
                  <label className="text-sm font-medium text-gray-700">Chi tiết mức phí:</label>
                  <p className="text-gray-600 mt-1">{assignment.feeLevel.description}</p>
                </div>
              )}

              {assignment.note && (
                <div>
                  <label className="text-sm font-medium text-gray-700">Ghi chú:</label>
                  <p className="text-gray-600 mt-1">{assignment.note}</p>
                </div>
              )}

              {assignment.dueDate && (
                <div>
                  <label className="text-sm font-medium text-gray-700">Hạn đóng:</label>
                  <p className="text-gray-900">
                    {new Date(assignment.dueDate).toLocaleDateString('vi-VN')}
                  </p>
                </div>
              )}
            </div>

            {/* Status Badge */}
            <div className="mt-6">
              <div className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
                assignment.status === 'PAID' ? 'text-green-600 bg-green-50' :
                assignment.status === 'PENDING' ? 'text-yellow-600 bg-yellow-50' :
                assignment.status === 'OVERDUE' ? 'text-red-600 bg-red-50' :
                'text-gray-600 bg-gray-50'
              }`}>
                <CheckCircle className="w-4 h-4 mr-1" />
                {assignment.status === 'PAID' ? 'Đã thanh toán' :
                 assignment.status === 'PENDING' ? 'Chờ thanh toán' :
                 assignment.status === 'OVERDUE' ? 'Quá hạn' :
                 'Miễn đóng'}
              </div>
            </div>

            {assignment.status === 'PENDING' && (
              <div className="mt-6 flex justify-end space-x-3">
                <button
                  onClick={() => navigate('/member/payment')}
                  className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-medium"
                >
                  Hủy
                </button>
                <button
                  onClick={handleStartPayment}
                  disabled={paymentLoading}
                  className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium flex items-center space-x-2 disabled:opacity-50"
                >
                  <CreditCard className="w-4 h-4" />
                  <span>{paymentLoading ? 'Đang xử lý...' : 'Thanh toán ngay'}</span>
                </button>
              </div>
            )}

            {paymentError && (
              <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-red-600 text-sm">{paymentError}</p>
              </div>
            )}

            {assignment.status === 'PAID' && (
              <div className="mt-6 text-center">
                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <CheckCircle className="w-8 h-8 text-green-500" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Đã thanh toán</h3>
                <p className="text-gray-600">
                  Phí này đã được thanh toán thành công.
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
