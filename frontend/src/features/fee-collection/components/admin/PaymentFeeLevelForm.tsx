import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Save, X, ArrowLeft } from 'lucide-react';
import { 
  PaymentFeeLevel, 
  CreatePaymentFeeLevelDto, 
  UpdatePaymentFeeLevelDto,
  PaymentCampaign 
} from '../../types';
import { paymentFeeLevelService } from '../../services/paymentFeeLevelService';
import { paymentCampaignService } from '../../services/paymentCampaignService';

interface PaymentFeeLevelFormProps {
  mode: 'create' | 'edit';
}

interface FeeLevelFormData {
  levelName: string;
  amount: number;
  description: string;
  note: string;
  isDefault: boolean;
  orderIndex: number;
}

const PaymentFeeLevelForm: React.FC<PaymentFeeLevelFormProps> = ({ mode }) => {
  const { campaignId, id } = useParams<{ campaignId: string; id?: string }>();
  const navigate = useNavigate();
  const [campaign, setCampaign] = useState<PaymentCampaign | null>(null);
  const [feeLevel, setFeeLevel] = useState<PaymentFeeLevel | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const [formData, setFormData] = useState<FeeLevelFormData>({
    levelName: '',
    amount: 0,
    description: '',
    note: '',
    isDefault: false,
    orderIndex: 0
  });

  useEffect(() => {
    if (campaignId) {
      loadData();
    }
  }, [campaignId, id]);

  const loadData = async () => {
    if (!campaignId) return;
    
    try {
      setLoading(true);
      const campaignResponse = await paymentCampaignService.getPaymentCampaignById(campaignId);
      setCampaign(campaignResponse.data);

      if (mode === 'edit' && id) {
        const feeLevelResponse = await paymentFeeLevelService.getFeeLevelById(campaignId, id);
        const levelData = feeLevelResponse.data;
        setFeeLevel(levelData);
        setFormData({
          levelName: levelData.levelName,
          amount: levelData.amount,
          description: levelData.description,
          note: levelData.note,
          isDefault: levelData.isDefault,
          orderIndex: levelData.orderIndex
        });
      } else {
        // For create mode, get next order index
        const feeLevelsResponse = await paymentFeeLevelService.getFeeLevelsByCampaign(campaignId);
        setFormData(prev => ({
          ...prev,
          orderIndex: feeLevelsResponse.data.length
        }));
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load data');
    } finally {
      setLoading(false);
    }
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
    
    if (!validateForm() || !campaignId) return;
    
    try {
      setSaving(true);
      setError(null);
      
      if (mode === 'create') {
        const createData: CreatePaymentFeeLevelDto = {
          levelName: formData.levelName,
          amount: formData.amount,
          description: formData.description,
          note: formData.note,
          isDefault: formData.isDefault,
          orderIndex: formData.orderIndex
        };
        
        await paymentFeeLevelService.createFeeLevel(campaignId, createData);
      } else if (id) {
        const updateData: UpdatePaymentFeeLevelDto = {
          levelName: formData.levelName,
          amount: formData.amount,
          description: formData.description,
          note: formData.note,
          isDefault: formData.isDefault,
          orderIndex: formData.orderIndex
        };
        
        await paymentFeeLevelService.updateFeeLevel(campaignId, id, updateData);
      }
      
      navigate(`/admin/payment-campaigns/${campaignId}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save fee level');
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    navigate(`/admin/payment-campaigns/${campaignId}`);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-32 h-32 border-b-2 border-blue-600 rounded-full animate-spin"></div>
      </div>
    );
  }

  if (error && !campaign) {
    return (
      <div className="space-y-4">
        <div className="px-4 py-3 text-red-700 border border-red-200 rounded bg-red-50">
          {error}
        </div>
        <button
          onClick={() => navigate('/admin/payment-campaigns')}
          className="inline-flex items-center text-blue-600 hover:text-blue-800"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Quay lại danh sách
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <button
            onClick={() => navigate(`/admin/payment-campaigns/${campaignId}`)}
            className="inline-flex items-center text-gray-600 hover:text-gray-800"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Quay lại
          </button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              {mode === 'create' ? 'Thêm Mức Phí' : 'Chỉnh Sửa Mức Phí'}
            </h1>
            <p className="text-sm text-gray-600">{campaign?.name}</p>
          </div>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="px-4 py-3 text-red-700 border border-red-200 rounded bg-red-50">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Basic Information */}
        <div className="p-6 bg-white border rounded-lg">
          <h2 className="mb-4 text-lg font-medium text-gray-900">Thông Tin Mức Phí</h2>
          
          <div className="space-y-4">
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
                type="number"
                value={formData.amount}
                onChange={(e) => setFormData(prev => ({ ...prev, amount: Number(e.target.value) }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="50000"
                min="1"
                required
              />
            </div>

            <div>
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

            <div>
              <label className="block mb-1 text-sm font-medium text-gray-700">
                Ghi chú chi tiết
              </label>
              <textarea
                value={formData.note}
                onChange={(e) => setFormData(prev => ({ ...prev, note: e.target.value }))}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Ghi chú chi tiết, điều kiện áp dụng..."
              />
            </div>

            <div>
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={formData.isDefault}
                  onChange={(e) => setFormData(prev => ({ ...prev, isDefault: e.target.checked }))}
                  className="text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                />
                <span className="ml-2 text-sm text-gray-700">Đặt làm mức phí mặc định</span>
              </label>
              <p className="mt-1 text-xs text-gray-500">
                Mức phí mặc định sẽ được chọn tự động khi tạo phân công mới
              </p>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end space-x-4">
          <button
            type="button"
            onClick={handleCancel}
            className="px-4 py-2 text-gray-700 transition-colors border border-gray-300 rounded-md hover:bg-gray-50"
          >
            <X className="inline w-4 h-4 mr-2" />
            Hủy
          </button>
          <button
            type="submit"
            disabled={saving}
            className="px-4 py-2 text-white transition-colors bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-50"
          >
            <Save className="inline w-4 h-4 mr-2" />
            {saving ? 'Đang lưu...' : 'Lưu'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default PaymentFeeLevelForm;
