import React, { useState, useEffect } from 'react';
import { Save, X, Users, AlertCircle } from 'lucide-react';
import { PaymentFeeLevel } from '../../../types';
import SearchableCombobox from '@/shared/components/SearchableCombobox';

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
  feeLevelId: string;
  notes?: string;
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
    notes: '',
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
    } else {
      setSelectedFeeLevel(null);
    }
  }, [formData.feeLevelId, feeLevels]);

  const handleFeeLevelChange = (feeLevelId: string) => {
    setFormData(prev => ({ ...prev, feeLevelId }));
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

    if (!formData.feeLevelId) {
      setError('Vui lòng chọn mức phí');
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

    console.log('Submitting bulk assignment data:', formData);
    onSubmit(formData);
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
    return selectedFeeLevel ? selectedFeeLevel.amount * formData.userIds.length : 0;
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

        {/* Fee Level Selection */}
        <div className="space-y-4">
          <div>
            <label className="block mb-2 text-sm font-medium text-gray-700 dark:text-gray-300">
              Chọn Mức Phí
            </label>
            <SearchableCombobox
              value={formData.feeLevelId}
              onChange={handleFeeLevelChange}
              options={feeLevels.map(level => ({
                value: level.id,
                label: `${level.levelName} - ${formatAmount(level.amount)}${level.description ? ` (${level.description})` : ''}`
              }))}
              placeholder="Chọn mức phí có sẵn..."
              disabled={loading}
              className="w-full"
            />
          </div>

          {/* Selected Fee Level Info */}
          {selectedFeeLevel && (
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
              placeholder="Nhập ghi chú cho đợt phân công này..."
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
                <span className="font-medium text-blue-600 dark:text-blue-400">
                  {selectedFeeLevel ? formatAmount(selectedFeeLevel.amount) : 'Chưa chọn'}
                </span>
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
