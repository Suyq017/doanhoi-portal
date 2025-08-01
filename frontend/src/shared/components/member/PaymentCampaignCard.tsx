import React, { useState } from 'react';
import { Calendar, User, Clock, CheckCircle, AlertTriangle, CreditCard, ExternalLink } from 'lucide-react';
import { PaymentAssignment } from '../../types';
import FeeLevelSelector from './FeeLevelSelector';
import PaymentQRCode from './PaymentQRCode';

interface PaymentCampaignCardProps {
  assignment: PaymentAssignment;
  onPaymentComplete?: () => void;
}

const PaymentCampaignCard: React.FC<PaymentCampaignCardProps> = ({ 
  assignment, 
  onPaymentComplete 
}) => {
  const [showPayment, setShowPayment] = useState(false);
  const [selectedFeeLevel, setSelectedFeeLevel] = useState(assignment.feeLevel?.id || '');

  const getStatusIcon = (status: PaymentAssignment['status']) => {
    switch (status) {
      case 'PENDING': return <Clock className="w-4 h-4 text-yellow-500" />;
      case 'PAID': return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'OVERDUE': return <AlertTriangle className="w-4 h-4 text-red-500" />;
      case 'EXEMPTED': return <CheckCircle className="w-4 h-4 text-blue-500" />;
      default: return null;
    }
  };

  const getStatusClass = (status: PaymentAssignment['status']) => {
    switch (status) {
      case 'PENDING': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'PAID': return 'bg-green-100 text-green-800 border-green-200';
      case 'OVERDUE': return 'bg-red-100 text-red-800 border-red-200';
      case 'EXEMPTED': return 'bg-blue-100 text-blue-800 border-blue-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getStatusText = (status: PaymentAssignment['status']) => {
    switch (status) {
      case 'PENDING': return 'Chờ đóng';
      case 'PAID': return 'Đã đóng';
      case 'OVERDUE': return 'Quá hạn';
      case 'EXEMPTED': return 'Miễn đóng';
      default: return status;
    }
  };

  const formatAmount = (amount: number) => {
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND'
    }).format(amount);
  };

  const getAmount = () => {
    return assignment.customAmount || assignment.feeLevel?.amount || 0;
  };

  const isOverdue = assignment.dueDate && new Date(assignment.dueDate) < new Date() && assignment.status === 'PENDING';

  const handlePayment = () => {
    if (assignment.status === 'PENDING') {
      setShowPayment(true);
    }
  };

  const handlePaymentSuccess = () => {
    setShowPayment(false);
    onPaymentComplete?.();
  };

  return (
    <div className={`bg-white rounded-lg border-2 transition-all duration-200 ${
      isOverdue ? 'border-red-200 bg-red-50' : 
      assignment.status === 'PAID' ? 'border-green-200 bg-green-50' :
      'border-gray-200 hover:border-gray-300'
    }`}>
      <div className="p-6">
        {/* Header */}
        <div className="flex items-start justify-between mb-4">
          <div className="flex-1">
            <h3 className="text-lg font-semibold text-gray-900 mb-1">
              {assignment.campaign?.name}
            </h3>
            <p className="text-sm text-gray-600 mb-2">
              {assignment.campaign?.description}
            </p>
            
            {/* Campaign Info */}
            <div className="flex items-center space-x-4 text-sm text-gray-500">
              <div className="flex items-center">
                <User className="w-4 h-4 mr-1" />
                <span>{assignment.campaign?.organization?.name}</span>
              </div>
              
              {assignment.campaign?.startDate && assignment.campaign?.endDate && (
                <div className="flex items-center">
                  <Calendar className="w-4 h-4 mr-1" />
                  <span>
                    {new Date(assignment.campaign.startDate).toLocaleDateString('vi-VN')} - 
                    {new Date(assignment.campaign.endDate).toLocaleDateString('vi-VN')}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Status Badge */}
          <div className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium border ${getStatusClass(assignment.status)}`}>
            {getStatusIcon(assignment.status)}
            <span className="ml-1">{getStatusText(assignment.status)}</span>
          </div>
        </div>

        {/* Amount and Fee Level */}
        <div className="bg-gray-50 rounded-lg p-4 mb-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-700">Số tiền cần đóng</span>
            <span className="text-lg font-bold text-gray-900">
              {formatAmount(getAmount())}
            </span>
          </div>
          
          {assignment.feeLevel && (
            <div className="text-sm text-gray-600">
              <span className="font-medium">Mức phí:</span> {assignment.feeLevel.levelName}
              {assignment.feeLevel.description && (
                <span className="ml-2">- {assignment.feeLevel.description}</span>
              )}
            </div>
          )}
          
          {assignment.note && (
            <div className="text-sm text-gray-600 mt-1">
              <span className="font-medium">Ghi chú:</span> {assignment.note}
            </div>
          )}
        </div>

        {/* Due Date Warning */}
        {assignment.dueDate && assignment.status === 'PENDING' && (
          <div className={`flex items-center p-3 rounded-lg mb-4 ${
            isOverdue ? 'bg-red-100 text-red-800' : 'bg-yellow-100 text-yellow-800'
          }`}>
            <AlertTriangle className="w-4 h-4 mr-2" />
            <span className="text-sm">
              {isOverdue ? 'Đã quá hạn đóng: ' : 'Hạn đóng: '}
              {new Date(assignment.dueDate).toLocaleDateString('vi-VN')}
            </span>
          </div>
        )}

        {/* Payment Information */}
        {assignment.status === 'PAID' && assignment.paidAt && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-3 mb-4">
            <div className="flex items-center text-green-800">
              <CheckCircle className="w-4 h-4 mr-2" />
              <span className="text-sm font-medium">
                Đã thanh toán vào {new Date(assignment.paidAt).toLocaleDateString('vi-VN')}
              </span>
            </div>
          </div>
        )}

        {/* Fee Level Selector (if campaign has multiple fee levels) */}
        {assignment.campaign?.feeLevels && assignment.campaign.feeLevels.length > 1 && assignment.status === 'PENDING' && (
          <div className="mb-4">
            <FeeLevelSelector
              feeLevels={assignment.campaign.feeLevels}
              selectedId={selectedFeeLevel}
              onSelect={setSelectedFeeLevel}
              currentAmount={getAmount()}
            />
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center justify-between pt-4 border-t border-gray-200">
          <div className="text-sm text-gray-500">
            Được phân công bởi: {assignment.assignedByUser?.fullName || 'N/A'}
          </div>

          <div className="flex items-center space-x-3">
            {assignment.status === 'PENDING' && (
              <button
                onClick={handlePayment}
                className={`inline-flex items-center px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                  isOverdue 
                    ? 'bg-red-600 text-white hover:bg-red-700' 
                    : 'bg-blue-600 text-white hover:bg-blue-700'
                }`}
              >
                <CreditCard className="w-4 h-4 mr-1" />
                {isOverdue ? 'Đóng ngay' : 'Thanh toán'}
              </button>
            )}

            {assignment.status === 'PAID' && assignment.transaction && (
              <button
                className="inline-flex items-center px-3 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
              >
                <ExternalLink className="w-4 h-4 mr-1" />
                Xem giao dịch
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Payment Modal */}
      {showPayment && assignment.campaign && (
        <PaymentQRCode
          assignment={assignment}
          feeLevelId={selectedFeeLevel}
          onClose={() => setShowPayment(false)}
          onSuccess={handlePaymentSuccess}
        />
      )}
    </div>
  );
};

export default PaymentCampaignCard;
