import React from 'react';
import { CreditCard, CheckCircle, Building2, Calendar } from 'lucide-react';
import { PaymentAssignment } from '../../../features/fee-collection/types';
import PaymentStatusBadge from './PaymentStatusBadge';

interface PaymentAssignmentCardProps {
  assignment: PaymentAssignment;
  onPayment: (assignment: PaymentAssignment) => void;
}

const PaymentAssignmentCard: React.FC<PaymentAssignmentCardProps> = ({ assignment, onPayment }) => {
  const amount = assignment.customAmount || assignment.feeLevel?.amount || 0;
  const isPayable = assignment.status === 'PENDING' || assignment.status === 'OVERDUE';
  
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND',
    }).format(amount);
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return null;
    return new Date(dateString).toLocaleDateString('vi-VN');
  };

  return (
    <div className="bg-white border rounded-lg p-6 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          {/* Campaign Info */}
          <div className="flex items-start space-x-3">
            <div className="p-2 bg-indigo-50 rounded-lg">
              <CreditCard className="w-5 h-5 text-indigo-600" />
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-medium text-gray-900 mb-1">
                {assignment.campaign?.name || 'Đợt đóng phí'}
              </h3>
              {assignment.campaign?.description && (
                <p className="text-gray-600 text-sm mb-2">
                  {assignment.campaign.description}
                </p>
              )}
              
              {/* Organization */}
              <div className="flex items-center text-sm text-gray-500 mb-2">
                <Building2 className="w-4 h-4 mr-1" />
                <span>{assignment.campaign?.organization?.name || 'Tổ chức'}</span>
              </div>

              {/* Fee Level */}
              {assignment.feeLevel && (
                <div className="text-sm text-gray-600 mb-2">
                  <span className="font-medium">Mức phí:</span> {assignment.feeLevel.levelName}
                  {assignment.feeLevel.description && (
                    <span className="text-gray-500"> - {assignment.feeLevel.description}</span>
                  )}
                </div>
              )}

              {/* Due Date */}
              {assignment.dueDate && (
                <div className="flex items-center text-sm text-gray-500 mb-2">
                  <Calendar className="w-4 h-4 mr-1" />
                  <span>Hạn đóng: {formatDate(assignment.dueDate)}</span>
                </div>
              )}

              {/* Note */}
              {assignment.note && (
                <div className="text-sm text-gray-600 mb-2">
                  <span className="font-medium">Ghi chú:</span> {assignment.note}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right Side - Amount and Actions */}
        <div className="flex flex-col items-end space-y-3">
          {/* Status Badge */}
          <PaymentStatusBadge status={assignment.status} />

          {/* Amount */}
          <div className="text-right">
            <div className="text-2xl font-bold text-gray-900">
              {formatCurrency(amount)}
            </div>
            {assignment.customAmount && assignment.feeLevel && (
              <div className="text-sm text-gray-500">
                (Mức gốc: {formatCurrency(assignment.feeLevel.amount)})
              </div>
            )}
          </div>

          {/* Payment Button */}
          {isPayable && (
            <button
              onClick={() => onPayment(assignment)}
              className="bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-700 transition-colors flex items-center space-x-2"
            >
              <CreditCard className="w-4 h-4" />
              <span>Thanh Toán</span>
            </button>
          )}

          {assignment.status === 'PAID' && (
            <div className="flex items-center text-green-600 text-sm">
              <CheckCircle className="w-4 h-4 mr-1" />
              <span>Đã thanh toán</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default PaymentAssignmentCard;
