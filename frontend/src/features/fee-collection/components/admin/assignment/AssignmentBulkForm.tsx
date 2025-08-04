import React, { useState, useEffect } from 'react';
import { Save, X, Users, AlertCircle } from 'lucide-react';
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
  dueDate: string;
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
    useCustomAmount: false,
    dueDate: campaignEndDate
  });

  const [selectedFeeLevel, setSelectedFeeLevel] = useState<PaymentFeeLevel | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setFormData(prev => ({ ...prev, userIds: selectedMemberIds }));
  }, [selectedMemberIds]);

  useEffect(() => {
    setFormData(prev => ({ ...prev, dueDate: campaignEndDate }));
  }, [campaignEndDate]);

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

    if (!formData.dueDate) {
      setError('Ngày đáo hạn không hợp lệ');
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

    console.log('Submitting bulk assignment data:', submitData);
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
    <div className="bg-white border rounded-lg dark:bg-gray-800 dark:border-gray-700">
      <div className="px-6 py-4 border-b bg-gray-50 dark:bg-gray-700 dark:border-gray-600">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-medium text-gray-900 dark:text-white">
              Phân Công Hàng Loạt
            </h3>
            <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
              Phân công đóng phí cho {formData.userIds.length} thành viên đã chọn
            </p>
          </div>
          <div className="flex items-center space-x-2">
            <Users className="w-5 h-5 text-gray-400 dark:text-gray-500" />
            <span className="text-sm text-gray-600 dark:text-gray-400">{formData.userIds.length} người</span>
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="p-6 space-y-6">
        {/* Due Date Info */}
        <div className="p-4 border border-blue-200 rounded-lg bg-blue-50 dark:bg-blue-900 dark:border-blue-800">
          <div className="flex items-start space-x-3">
            <AlertCircle className="w-5 h-5 text-blue-600 dark:text-blue-400 mt-0.5" />
            <div>
              <h4 className="text-sm font-medium text-blue-900 dark:text-blue-200">Thông Tin Hạn Thanh Toán</h4>
              <p className="mt-1 text-sm text-blue-700 dark:text-blue-300">
                Hạn thanh toán sẽ được tự động đặt theo ngày kết thúc của đợt đóng phí: {' '}
                <span className="font-medium">{formatDate(campaignEndDate)}</span>
              </p>
            </div>
          </div>
        </div>

        {/* Fee Level Selection */}
        <div className="space-y-4">
          <div>
            <label className="block mb-2 text-sm font-medium text-gray-700 dark:text-gray-300">
              Chọn Mức Phí
            </label>
            <select
              value={formData.feeLevelId}
              onChange={(e) => handleFeeLevelChange(e.target.value)}
              disabled={formData.useCustomAmount || loading}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed dark:bg-gray-700 dark:border-gray-600 dark:text-white dark:disabled:bg-gray-600"
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
            <div className="p-4 rounded-lg bg-gray-50 dark:bg-gray-700">
              <h4 className="mb-2 text-sm font-medium text-gray-900 dark:text-white">
                Thông Tin Mức Phí Đã Chọn
              </h4>
              <div className="space-y-2 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-gray-600 dark:text-gray-400">Tên mức phí:</span>
                  <span className="font-medium dark:text-white">{selectedFeeLevel.levelName}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-600 dark:text-gray-400">Số tiền:</span>
                  <span className="font-medium text-blue-600 dark:text-blue-400">{formatAmount(selectedFeeLevel.amount)}</span>
                </div>
                {selectedFeeLevel.description && (
                  <div>
                    <span className="text-gray-600 dark:text-gray-400">Mô tả:</span>
                    <p className="mt-1 text-gray-900 dark:text-white">{selectedFeeLevel.description}</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Custom Amount Option */}
          <div className="space-y-3">
            <div className="flex items-center">
              <input
                id="useCustomAmount"
                type="checkbox"
                checked={formData.useCustomAmount}
                onChange={(e) => handleCustomAmountToggle(e.target.checked)}
                disabled={loading}
                className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:focus:ring-blue-400"
              />
              <label htmlFor="useCustomAmount" className="ml-2 text-sm font-medium text-gray-700 dark:text-gray-300">
                Sử dụng số tiền tùy chỉnh
              </label>
            </div>

            {formData.useCustomAmount && (
              <div>
                <label className="block mb-1 text-sm font-medium text-gray-700 dark:text-gray-300">
                  Số tiền tùy chỉnh (VND)
                </label>
                <input
                  type="number"
                  min="0"
                  step="1000"
                  value={formData.customAmount || ''}
                  onChange={(e) => handleAmountChange(Number(e.target.value))}
                  disabled={loading}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                  placeholder="Nhập số tiền..."
                />
              </div>
            )}
          </div>

          {/* Notes Section */}
          <div>
            <label className="block mb-1 text-sm font-medium text-gray-700 dark:text-gray-300">
              Ghi chú (tùy chọn)
            </label>
            <textarea
              value={formData.notes || ''}
              onChange={(e) => handleNotesChange(e.target.value)}
              disabled={loading}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
              placeholder="Nhập ghi chú cho assignment này..."
            />
          </div>
        </div>

        {/* Summary */}
        <div className="p-4 rounded-lg bg-gray-50 dark:bg-gray-700">
          <h4 className="mb-3 text-sm font-medium text-gray-900 dark:text-white">Tổng Kết Phân Công</h4>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-gray-600 dark:text-gray-400">Số lượng thành viên:</span>
                <span className="font-medium dark:text-white">{formData.userIds.length}</span>
              </div>
              <div className="flex justify-between pt-2 border-t dark:border-gray-600">
                <span className="text-gray-600 dark:text-gray-400">Số tiền mỗi người:</span>
                <span className="font-medium text-blue-600 dark:text-blue-400">{formatAmount(formData.customAmount || 0)}</span>
              </div>
            </div>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-gray-600 dark:text-gray-400">Hạn thanh toán:</span>
                <span className="font-medium dark:text-white">{formatDate(campaignEndDate)}</span>
              </div>
              <div className="flex justify-between pt-2 border-t dark:border-gray-600">
                <span className="font-medium text-gray-900 dark:text-white">Tổng số tiền:</span>
                <span className="font-bold text-green-600 dark:text-green-400">{formatAmount(getTotalAmount())}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="p-4 border border-red-200 rounded-lg bg-red-50 dark:bg-red-900 dark:border-red-800">
            <div className="flex items-start space-x-3">
              <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400 mt-0.5" />
              <div>
                <h4 className="text-sm font-medium text-red-900 dark:text-red-200">Có lỗi xảy ra</h4>
                <p className="mt-1 text-sm text-red-700 dark:text-red-300">{error}</p>
              </div>
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center justify-end pt-4 space-x-4 border-t dark:border-gray-600">
          <button
            type="button"
            onClick={onCancel}
            disabled={loading}
            className="px-4 py-2 text-gray-700 transition-colors border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed dark:text-gray-300 dark:border-gray-600 dark:hover:bg-gray-700"
          >
            <X className="inline w-4 h-4 mr-2" />
            Hủy
          </button>
          <button
            type="submit"
            disabled={loading || formData.userIds.length === 0}
            className="flex items-center px-6 py-2 text-white transition-colors bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed dark:bg-blue-500 dark:hover:bg-blue-600"
          >
            {loading ? (
              <>
                <div className="w-4 h-4 mr-2 border-b-2 border-white rounded-full animate-spin"></div>
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
