import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Save, X } from 'lucide-react';
import { 
  PaymentCampaign, 
  CreatePaymentCampaignDto, 
  UpdatePaymentCampaignDto,
  Organization 
} from '../../types';
import { paymentCampaignService } from '@/shared/services/fee-collection-service';

interface PaymentCampaignBasicFormData {
  organizationId: string;
  name: string;
  description: string;
  startDate: string;
  endDate: string;
}

interface PaymentCampaignFormProps {
  campaign?: PaymentCampaign;
  organizations: Organization[];
  mode: 'create' | 'edit';
}

const PaymentCampaignForm: React.FC<PaymentCampaignFormProps> = ({ 
  campaign, 
  organizations, 
  mode 
}) => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const [formData, setFormData] = useState<PaymentCampaignBasicFormData>({
    organizationId: campaign?.organizationId || '',
    name: campaign?.name || '',
    description: campaign?.description || '',
    startDate: campaign?.startDate ? campaign.startDate.split('T')[0] : '',
    endDate: campaign?.endDate ? campaign.endDate.split('T')[0] : '',
  });

  const validateForm = (): boolean => {
    if (!formData.organizationId) {
      setError('Vui lòng chọn tổ chức');
      return false;
    }
    
    if (!formData.name.trim()) {
      setError('Vui lòng nhập tên đợt đóng phí');
      return false;
    }
    
    if (!formData.startDate) {
      setError('Vui lòng chọn ngày bắt đầu');
      return false;
    }
    
    if (!formData.endDate) {
      setError('Vui lòng chọn ngày kết thúc');
      return false;
    }
    
    if (new Date(formData.startDate) >= new Date(formData.endDate)) {
      setError('Ngày bắt đầu phải trước ngày kết thúc');
      return false;
    }
    
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) return;
    
    try {
      setLoading(true);
      setError(null);
      
      if (mode === 'create') {
        // Create campaign only
        const campaignData: CreatePaymentCampaignDto = {
          organizationId: formData.organizationId,
          name: formData.name,
          description: formData.description,
          startDate: formData.startDate,
          endDate: formData.endDate
        };
        
        const campaignResponse = await paymentCampaignService.createPaymentCampaign(campaignData);
        const newCampaign : any = campaignResponse;
        
        // Navigate to detail page to add fee levels
        navigate(`/admin/payment-campaigns/${newCampaign.id}`);
      } else if (campaign) {
        // Update campaign
        const updateData: UpdatePaymentCampaignDto = {
          name: formData.name,
          description: formData.description,
          startDate: formData.startDate,
          endDate: formData.endDate
        };
        
        await paymentCampaignService.updatePaymentCampaign(campaign.id, updateData);
        navigate(`/admin/payment-campaigns/${campaign.id}`);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save campaign');
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    if (mode === 'edit' && campaign) {
      navigate(`/admin/payment-campaigns/${campaign.id}`);
    } else {
      navigate('/admin/payment-campaigns');
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">
          {mode === 'create' ? 'Tạo Đợt Đóng Phí Mới' : 'Chỉnh Sửa Đợt Đóng Phí'}
        </h1>
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
          <h2 className="mb-4 text-lg font-medium text-gray-900">Thông Tin Cơ Bản</h2>
          
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div>
              <label className="block mb-1 text-sm font-medium text-gray-700">
                Tổ chức <span className="text-red-500">*</span>
              </label>
              <select
                value={formData.organizationId}
                onChange={(e) => setFormData(prev => ({ ...prev, organizationId: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
                disabled={mode === 'edit'} // Don't allow changing organization in edit mode
              >
                <option value="">Chọn tổ chức</option>
                {organizations.map(org => (
                  <option key={org.id} value={org.id}>{org.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block mb-1 text-sm font-medium text-gray-700">
                Tên đợt đóng phí <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="VD: Đóng phí học kỳ 1 năm 2024"
                required
              />
            </div>

            <div>
              <label className="block mb-1 text-sm font-medium text-gray-700">
                Ngày bắt đầu <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                value={formData.startDate}
                onChange={(e) => setFormData(prev => ({ ...prev, startDate: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>

            <div>
              <label className="block mb-1 text-sm font-medium text-gray-700">
                Ngày kết thúc <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                value={formData.endDate}
                onChange={(e) => setFormData(prev => ({ ...prev, endDate: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>
          </div>

          <div className="mt-4">
            <label className="block mb-1 text-sm font-medium text-gray-700">
              Mô tả
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Mô tả chi tiết về đợt đóng phí này..."
            />
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
            disabled={loading}
            className="px-4 py-2 text-white transition-colors bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-50"
          >
            <Save className="inline w-4 h-4 mr-2" />
            {loading ? 'Đang lưu...' : 'Lưu'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default PaymentCampaignForm;
