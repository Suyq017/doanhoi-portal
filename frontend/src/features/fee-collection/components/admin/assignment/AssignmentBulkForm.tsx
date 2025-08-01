import React, { useState, useEffect } from 'react';
import { Save, X, Users, AlertCircle, DollarSign } from 'lucide-react';
import { PaymentFeeLevel } from '../../../types';

interface AssignmentBulkFormProps {
  campaignId: string;
  selectedMemberIds: string[];
  feeLevels: PaymentFeeLevel[];
  campaignEndDate: string;
  onSubmit: (data: BulkAssignmentData) => void;
  onCancel: () => void;
  loading?: boolean;
}

interface BulkAssignmentData {
  campaignId: string;
  userIds: string[];
  feeLevelId?: string;
  customAmount?: number;
  notes?: string;
  useCustomAmount: boolean;
}

const AssignmentBulkForm: React.FC<AssignmentBulkFormProps> = ({
  campaignId,
  selectedMemberIds,
  feeLevels,
  campaignEndDate,
  onSubmit,
  onCancel,
  loading = false
}) => {
  const [formData, setFormData] = useState<BulkAssignmentData>({
    campaignId,
    userIds: selectedMemberIds,
    feeLevelId: '',
    customAmount: 0,
    notes: '',
    useCustomAmount: false
  });

  const [selectedFeeLevel, setSelectedFeeLevel] = useState<PaymentFeeLevel | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setFormData(prev => ({ ...prev, userIds: selectedMemberIds }));
  }, [selectedMemberIds]);

  useEffect(() => {
    if (formData.feeLevelId) {
      const feeLevel = feeLevels.find(level => level.id === formData.feeLevelId);
      setSelectedFeeLevel(feeLevel || null);
      if (feeLevel && !formData.useCustomAmount) {
        setFormData(prev => ({ ...prev, customAmount: feeLevel.amount }));
      }
    } else {
      setSelectedFeeLevel(null);
    }
  }, [formData.feeLevelId, feeLevels, formData.useCustomAmount]);

  const handleFeeLevelChange = (feeLevelId: string) => {
    setFormData(prev => ({ ...prev, feeLevelId }));
    setError(null);
  };

  const handleCustomAmountToggle = (useCustom: boolean) => {
    setFormData(prev => ({
      ...prev,
      useCustomAmount: useCustom,
      customAmount: useCustom ? prev.customAmount : (selectedFeeLevel?.amount || 0)
    }));
  };

  const handleAmountChange = (amount: number) => {
    setFormData(prev => ({ ...prev, customAmount: amount }));
    setError(null);
  };

  const handleNotesChange = (notes: string) => {
    setFormData(prev => ({ ...prev, notes }));
  };

  const validateForm = (): boolean => {
    if (formData.userIds.length === 0) {
      setError('Vui lòng chọn ít nhất một thành viên');
      return false;
    }

    if (!formData.feeLevelId && !formData.useCustomAmount) {
      setError('Vui lòng chọn mức phí hoặc nhập số tiền tùy chỉnh');
      return false;
    }

    if ((formData.customAmount || 0) <= 0) {
      setError('Số tiền phải lớn hơn 0');
      return false;
    }

    return true;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!validateForm()) return;

    const submitData = {
      ...formData,
      // Chỉ gửi feeLevelId nếu không dùng custom amount
      feeLevelId: formData.useCustomAmount ? undefined : formData.feeLevelId
    };

    onSubmit(submitData);
  };

  const formatAmount = (amount: number) => {
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND'
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('vi-VN');
  };

  const getTotalAmount = () => {
    return (formData.customAmount || 0) * formData.userIds.length;
  };

  return (
    <div className="bg-white border rounded-lg">
      <div className="bg-gray-50 px-6 py-4 border-b">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-medium text-gray-900">
              Phân Công Hàng Loạt
            </h3>
            <p className="text-sm text-gray-600 mt-1">
              Phân công đóng phí cho {formData.userIds.length} thành viên đã chọn
            </p>
          </div>
          <div className="flex items-center space-x-2">
            <Users className="w-5 h-5 text-gray-400" />
            <span className="text-sm text-gray-600">{formData.userIds.length} người</span>
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="p-6 space-y-6">
        {/* Due Date Info */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-start space-x-3">
            <AlertCircle className="w-5 h-5 text-blue-600 mt-0.5" />
            <div>
              <h4 className="text-sm font-medium text-blue-900">Thông Tin Hạn Thanh Toán</h4>
              <p className="text-sm text-blue-700 mt-1">
                Hạn thanh toán sẽ được tự động đặt theo ngày kết thúc của đợt đóng phí: {' '}
                <span className="font-medium">{formatDate(campaignEndDate)}</span>
              </p>
            </div>
          </div>
        </div>

        {/* Fee Level Selection */}
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Chọn Mức Phí
            </label>
            <select
              value={formData.feeLevelId}
              onChange={(e) => handleFeeLevelChange(e.target.value)}
              disabled={formData.useCustomAmount || loading}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
            >
              <option value="">Chọn mức phí có sẵn...</option>
              {feeLevels.map(level => (
                <option key={level.id} value={level.id}>
                  {level.levelName} - {formatAmount(level.amount)}
                  {level.description && ` (${level.description})`}
                </option>
              ))}
            </select>
          </div>

          {/* Selected Fee Level Info */}
          {selectedFeeLevel && !formData.useCustomAmount && (
            <div className="bg-gray-50 rounded-lg p-4">
              <h4 className="text-sm font-medium text-gray-900 mb-2">
                Thông Tin Mức Phí Đã Chọn
              </h4>
              <div className="space-y-2 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-gray-600">Tên mức phí:</span>
                  <span className="font-medium">{selectedFeeLevel.levelName}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-600">Số tiền:</span>
                  <span className="font-medium text-blue-600">{formatAmount(selectedFeeLevel.amount)}</span>
                </div>
                {selectedFeeLevel.description && (
                  <div>
                    <span className="text-gray-600">Mô tả:</span>
                    <p className="text-gray-900 mt-1">{selectedFeeLevel.description}</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Custom Amount Option */}
          <div className="border-t pt-4">
            <div className="flex items-center space-x-3 mb-4">
              <input
                type="checkbox"
                id="useCustomAmount"
                checked={formData.useCustomAmount}
                onChange={(e) => handleCustomAmountToggle(e.target.checked)}
                disabled={loading}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
              <label htmlFor="useCustomAmount" className="text-sm font-medium text-gray-700">
                Sử dụng số tiền tùy chỉnh (ghi đè mức phí có sẵn)
              </label>
            </div>

            {formData.useCustomAmount && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Số Tiền Tùy Chỉnh <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                  <input
                    type="number"
                    value={formData.customAmount}
                    onChange={(e) => handleAmountChange(parseFloat(e.target.value) || 0)}
                    disabled={loading}
                    min="1000"
                    step="1000"
                    className="w-full pl-12 pr-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Nhập số tiền..."
                  />
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  Số tiền hiển thị: {formatAmount(formData.customAmount || 0)}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Notes */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Ghi Chú
          </label>
          <textarea
            value={formData.notes}
            onChange={(e) => handleNotesChange(e.target.value)}
            disabled={loading}
            rows={3}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Ghi chú thêm cho assignment này..."
          />
        </div>

        {/* Summary */}
        <div className="bg-gray-50 rounded-lg p-4">
          <h4 className="text-sm font-medium text-gray-900 mb-3">Tổng Kết Phân Công</h4>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-gray-600">Số lượng thành viên:</span>
                <span className="font-medium">{formData.userIds.length}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Số tiền mỗi người:</span>
                <span className="font-medium text-blue-600">{formatAmount(formData.customAmount || 0)}</span>
              </div>
            </div>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-gray-600">Hạn thanh toán:</span>
                <span className="font-medium">{formatDate(campaignEndDate)}</span>
              </div>
              <div className="flex justify-between border-t pt-2">
                <span className="text-gray-900 font-medium">Tổng số tiền:</span>
                <span className="font-bold text-green-600">{formatAmount(getTotalAmount())}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="flex items-start space-x-3">
              <AlertCircle className="w-5 h-5 text-red-600 mt-0.5" />
              <div>
                <h4 className="text-sm font-medium text-red-900">Có lỗi xảy ra</h4>
                <p className="text-sm text-red-700 mt-1">{error}</p>
              </div>
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center justify-end space-x-4 pt-4 border-t">
          <button
            type="button"
            onClick={onCancel}
            disabled={loading}
            className="px-4 py-2 text-gray-700 border border-gray-300 rounded-md hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <X className="w-4 h-4 mr-2 inline" />
            Hủy
          </button>
          <button
            type="submit"
            disabled={loading || formData.userIds.length === 0}
            className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
          >
            {loading ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                Đang xử lý...
              </>
            ) : (
              <>
                <Save className="w-4 h-4 mr-2" />
                Phân Công ({formData.userIds.length} người)
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
};

export default AssignmentBulkForm;
