import React, { useState, useEffect } from 'react';
import { Plus, Edit, Trash2, Star, StarOff, Save, X } from 'lucide-react';
import { 
  PaymentFeeLevel, 
  CreatePaymentFeeLevelDto, 
  UpdatePaymentFeeLevelDto 
} from '../../types';
import { paymentFeeLevelService } from '../../services/paymentFeeLevelService';

interface FeeLevelManagerProps {
  campaignId: string;
  readOnly?: boolean;
  onFeeLevelsChange?: (feeLevels: PaymentFeeLevel[]) => void;
}

interface FeeLevelFormData {
  levelName: string;
  amount: number;
  description: string;
  note: string;
  isDefault: boolean;
}

const FeeLevelManager: React.FC<FeeLevelManagerProps> = ({ campaignId, readOnly = false, onFeeLevelsChange }) => {
  const [feeLevels, setFeeLevels] = useState<PaymentFeeLevel[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [formData, setFormData] = useState<FeeLevelFormData>({
    levelName: '',
    amount: 0,
    description: '',
    note: '',
    isDefault: false
  });

  useEffect(() => {
    loadFeeLevels();
  }, [campaignId]);

  const loadFeeLevels = async () => {
    try {
      setLoading(true);
      const response : any = await paymentFeeLevelService.getFeeLevelsByCampaign(campaignId);
      const sortedFeeLevels = response?.sort((a: { orderIndex: number; }, b: { orderIndex: number; }) => a.orderIndex - b.orderIndex);
      setFeeLevels(sortedFeeLevels);
      
      // Notify parent component about fee levels change
      if (onFeeLevelsChange) {
        onFeeLevelsChange(sortedFeeLevels);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load fee levels');
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      levelName: '',
      amount: 0,
      description: '',
      note: '',
      isDefault: false
    });
    setEditingId(null);
    setIsCreating(false);
  };

  const startCreate = () => {
    resetForm();
    setIsCreating(true);
  };

  const startEdit = (feeLevel: PaymentFeeLevel) => {
    setFormData({
      levelName: feeLevel.levelName,
      amount: feeLevel.amount,
      description: feeLevel.description,
      note: feeLevel.note,
      isDefault: feeLevel.isDefault
    });
    setEditingId(feeLevel.id);
    setIsCreating(false);
  };

  const validateForm = (): boolean => {
    if (!formData.levelName.trim()) {
      setError('Vui lòng nhập tên mức phí');
      return false;
    }
    
    if (formData.amount <= 0) {
      setError('Số tiền phải lớn hơn 0');
      return false;
    }
    
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) return;
    
    try {
      setError(null);
      
      if (isCreating) {
        const createData: CreatePaymentFeeLevelDto = {
          levelName: formData.levelName,
          amount: formData.amount,
          description: formData.description,
          note: formData.note,
          isDefault: formData.isDefault,
          orderIndex: feeLevels.length
        };
        
        await paymentFeeLevelService.createFeeLevel(campaignId, createData);
      } else if (editingId) {
        const updateData: UpdatePaymentFeeLevelDto = {
          levelName: formData.levelName,
          amount: formData.amount,
          description: formData.description,
          note: formData.note,
          isDefault: formData.isDefault
        };
        
        await paymentFeeLevelService.updateFeeLevel(campaignId, editingId, updateData);
      }
      
      resetForm();
      loadFeeLevels();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save fee level');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Bạn có chắc chắn muốn xóa mức phí này?')) return;
    
    try {
      await paymentFeeLevelService.deleteFeeLevel(campaignId, id);
      loadFeeLevels();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete fee level');
    }
  };

  const handleSetDefault = async (id: string) => {
    try {
      await paymentFeeLevelService.setDefaultFeeLevel(campaignId, id);
      loadFeeLevels();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to set default fee level');
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
      <div className="flex items-center justify-center h-32">
        <div className="w-8 h-8 border-b-2 border-blue-600 rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-medium text-gray-900">Mức Phí</h3>
        {!readOnly && (
          <button
            onClick={startCreate}
            className="inline-flex items-center px-3 py-2 text-white transition-colors bg-blue-600 rounded-md hover:bg-blue-700"
          >
            <Plus className="w-4 h-4 mr-1" />
            Thêm Mức Phí
          </button>
        )}
      </div>

      {/* Error Message */}
      {error && (
        <div className="px-4 py-3 text-red-700 border border-red-200 rounded bg-red-50">
          {error}
        </div>
      )}

      {/* Create/Edit Form */}
      {(isCreating || editingId) && !readOnly && (
        <form onSubmit={handleSubmit} className="p-4 border rounded-lg bg-gray-50">
          <h4 className="mb-3 font-medium text-gray-900">
            {isCreating ? 'Thêm Mức Phí Mới' : 'Chỉnh Sửa Mức Phí'}
          </h4>
          
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div>
              <label className="block mb-1 text-sm font-medium text-gray-700">
                Tên mức phí <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={formData.levelName}
                onChange={(e) => setFormData(prev => ({ ...prev, levelName: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="VD: Sinh viên chính quy"
                required
              />
            </div>

            <div>
              <label className="block mb-1 text-sm font-medium text-gray-700">
                Số tiền (VNĐ) <span className="text-red-500">*</span>
              </label>
              <input
                onChange={(e) => setFormData(prev => ({ ...prev, amount: Number(e.target.value) }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="50.000"
                min="1"
                required
              />
            </div>

            <div className="md:col-span-2">
              <label className="block mb-1 text-sm font-medium text-gray-700">
                Mô tả
              </label>
              <input
                type="text"
                value={formData.description}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Mô tả ngắn gọn về mức phí này"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block mb-1 text-sm font-medium text-gray-700">
                Ghi chú chi tiết
              </label>
              <textarea
                value={formData.note}
                onChange={(e) => setFormData(prev => ({ ...prev, note: e.target.value }))}
                rows={2}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Ghi chú chi tiết, điều kiện áp dụng..."
              />
            </div>

            <div className="md:col-span-2">
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={formData.isDefault}
                  onChange={(e) => setFormData(prev => ({ ...prev, isDefault: e.target.checked }))}
                  className="text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                />
                <span className="ml-2 text-sm text-gray-700">Đặt làm mức phí mặc định</span>
              </label>
            </div>
          </div>

          <div className="flex items-center justify-end mt-4 space-x-3">
            <button
              type="button"
              onClick={resetForm}
              className="px-3 py-2 text-gray-700 transition-colors border border-gray-300 rounded-md hover:bg-gray-50"
            >
              <X className="inline w-4 h-4 mr-1" />
              Hủy
            </button>
            <button
              type="submit"
              className="px-3 py-2 text-white transition-colors bg-blue-600 rounded-md hover:bg-blue-700"
            >
              <Save className="inline w-4 h-4 mr-1" />
              Lưu
            </button>
          </div>
        </form>
      )}

      {/* Fee Levels List */}
      {feeLevels.length === 0 ? (
        <div className="py-8 text-center text-gray-500">
          Chưa có mức phí nào
        </div>
      ) : (
        <div className="space-y-3">
          {feeLevels.map((level) => (
            <div key={level.id} className="p-4 bg-white border border-gray-200 rounded-lg">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center space-x-2">
                    <h4 className="font-medium text-gray-900">{level.levelName}</h4>
                    {level.isDefault && (
                      <span className="inline-flex items-center px-2 py-1 text-xs font-medium text-yellow-800 bg-yellow-100 rounded-full">
                        <Star className="w-3 h-3 mr-1" />
                        Mặc định
                      </span>
                    )}
                  </div>
                  
                  <div className="mt-1 text-lg font-semibold text-blue-600">
                    {formatAmount(level.amount)}
                  </div>
                  
                  {level.description && (
                    <div className="mt-1 text-sm text-gray-600">
                      {level.description}
                    </div>
                  )}
                  
                  {level.note && (
                    <div className="p-2 mt-2 text-sm text-gray-500 rounded bg-gray-50">
                      {level.note}
                    </div>
                  )}
                </div>

                {!readOnly && (
                  <div className="flex items-center ml-4 space-x-2">
                    {!level.isDefault && (
                      <button
                        onClick={() => handleSetDefault(level.id)}
                        className="text-yellow-600 hover:text-yellow-800"
                        title="Đặt làm mặc định"
                      >
                        <StarOff className="w-4 h-4" />
                      </button>
                    )}
                    
                    <button
                      onClick={() => startEdit(level)}
                      className="text-blue-600 hover:text-blue-800"
                      title="Chỉnh sửa"
                    >
                      <Edit className="w-4 h-4" />
                    </button>
                    
                    <button
                      onClick={() => handleDelete(level.id)}
                      className="text-red-600 hover:text-red-800"
                      title="Xóa"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default FeeLevelManager;
