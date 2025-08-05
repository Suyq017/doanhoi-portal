import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Save, X, ChevronDown } from 'lucide-react';
import { 
  PaymentCampaign, 
  CreatePaymentCampaignDto, 
  UpdatePaymentCampaignDto, 
} from '../../types';
import { paymentCampaignService } from '@/shared/services/fee-collection-service';
import OrganizationSelector from './OrganizationSelector';

interface PaymentCampaignBasicFormData {
  organizationId: string;
  organizationName: string;
  name: string;
  description: string;
  startDate: string;
  startTime: string;
  endDate: string;
  endTime: string;
}

interface PaymentCampaignFormProps {
  campaign?: PaymentCampaign;
  mode: 'create' | 'edit';
}

const PaymentCampaignForm: React.FC<PaymentCampaignFormProps> = ({ 
  campaign, 
  mode 
}) => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showOrganizationSelector, setShowOrganizationSelector] = useState(false);
  
  const [formData, setFormData] = useState<PaymentCampaignBasicFormData>({
    organizationId: campaign?.organizationId || '',
    organizationName: campaign?.organization?.name || '',
    name: campaign?.name || '',
    description: campaign?.description || '',
    startDate: campaign?.startDate ? campaign.startDate.split('T')[0] : '',
    startTime: campaign?.startDate ? campaign.startDate.split('T')[1]?.substring(0, 5) || '00:00' : '00:00',
    endDate: campaign?.endDate ? campaign.endDate.split('T')[0] : '',
    endTime: campaign?.endDate ? campaign.endDate.split('T')[1]?.substring(0, 5) || '23:59' : '23:59',
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
    
    if (!formData.startTime) {
      setError('Vui lòng chọn giờ bắt đầu');
      return false;
    }
    
    // Validate time format for startTime
    const timeRegex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/;
    if (!timeRegex.test(formData.startTime)) {
      setError('Giờ bắt đầu không đúng định dạng (HH:MM)');
      return false;
    }
    
    if (!formData.endDate) {
      setError('Vui lòng chọn ngày kết thúc');
      return false;
    }
    
    if (!formData.endTime) {
      setError('Vui lòng chọn giờ kết thúc');
      return false;
    }
    
    // Validate time format for endTime
    if (!timeRegex.test(formData.endTime)) {
      setError('Giờ kết thúc không đúng định dạng (HH:MM)');
      return false;
    }
    
    const startDateTime = new Date(`${formData.startDate}T${formData.startTime}`);
    const endDateTime = new Date(`${formData.endDate}T${formData.endTime}`);
    
    if (startDateTime >= endDateTime) {
      setError('Thời gian bắt đầu phải trước thời gian kết thúc');
      return false;
    }
    
    return true;
  };

  const handleOrganizationSelect = (organizationId: string, organizationName: string) => {
    setFormData(prev => ({ 
      ...prev, 
      organizationId, 
      organizationName 
    }));
    setShowOrganizationSelector(false);
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
          startDate: `${formData.startDate}T${formData.startTime}:00`,
          endDate: `${formData.endDate}T${formData.endTime}:00`
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
          startDate: `${formData.startDate}T${formData.startTime}:00`,
          endDate: `${formData.endDate}T${formData.endTime}:00`
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
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
          {mode === 'create' ? 'Tạo Đợt Đóng Phí Mới' : 'Chỉnh Sửa Đợt Đóng Phí'}
        </h1>
      </div>

      {/* Error Message */}
      {error && (
        <div className="px-4 py-3 text-red-700 border border-red-200 rounded bg-red-50 dark:bg-red-900 dark:border-red-800 dark:text-red-200">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Basic Information */}
        <div className="p-6 bg-white border rounded-lg dark:bg-gray-800 dark:border-gray-700">
          <h2 className="mb-4 text-lg font-medium text-gray-900 dark:text-white">Thông Tin Cơ Bản</h2>
          
          {/* Row 1: Tổ chức và Tên đợt đóng phí */}
          <div className="grid grid-cols-1 gap-4 mb-4 md:grid-cols-2">
            <div>
              <label className="block mb-1 text-sm font-medium text-gray-700 dark:text-gray-300">
                Tổ chức <span className="text-red-500">*</span>
              </label>
              <button
                type="button"
                onClick={() => setShowOrganizationSelector(true)}
                disabled={mode === 'edit'} // Don't allow changing organization in edit mode
                className="w-full px-3 py-2 text-left border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-between hover:bg-gray-50 dark:hover:bg-gray-600"
              >
                <span className={formData.organizationName ? 'text-gray-900 dark:text-white' : 'text-gray-500 dark:text-gray-400'}>
                  {formData.organizationName || 'Chọn tổ chức'}
                </span>
                <ChevronDown className="w-4 h-4 text-gray-400" />
              </button>
            </div>

            <div>
              <label className="block mb-1 text-sm font-medium text-gray-700 dark:text-gray-300">
                Tên đợt đóng phí <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                placeholder="VD: Đóng phí học kỳ 1 năm 2024"
                required
              />
            </div>
          </div>

          {/* Row 2: Ngày bắt đầu và Giờ bắt đầu */}
          <div className="grid grid-cols-1 gap-4 mb-4 md:grid-cols-2">
            <div>
              <label className="block mb-1 text-sm font-medium text-gray-700 dark:text-gray-300">
                Ngày bắt đầu <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                value={formData.startDate}
                onChange={(e) => setFormData(prev => ({ ...prev, startDate: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                required
              />
            </div>

            <div>
              <label className="block mb-1 text-sm font-medium text-gray-700 dark:text-gray-300">
                Giờ bắt đầu <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={formData.startTime}
                onChange={(e) => setFormData(prev => ({ ...prev, startTime: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                placeholder="HH:MM (VD: 08:00)"
                pattern="^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$"
                required
              />
            </div>
          </div>

          {/* Row 3: Ngày kết thúc và Giờ kết thúc */}
          <div className="grid grid-cols-1 gap-4 mb-4 md:grid-cols-2">
            <div>
              <label className="block mb-1 text-sm font-medium text-gray-700 dark:text-gray-300">
                Ngày kết thúc <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                value={formData.endDate}
                onChange={(e) => setFormData(prev => ({ ...prev, endDate: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                required
              />
            </div>

            <div>
              <label className="block mb-1 text-sm font-medium text-gray-700 dark:text-gray-300">
                Giờ kết thúc <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={formData.endTime}
                onChange={(e) => setFormData(prev => ({ ...prev, endTime: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                placeholder="HH:MM (VD: 17:30)"
                pattern="^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$"
                required
              />
            </div>
          </div>

          {/* Row 4: Mô tả */}
          <div>
            <label className="block mb-1 text-sm font-medium text-gray-700 dark:text-gray-300">
              Mô tả
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
              placeholder="Mô tả chi tiết về đợt đóng phí này..."
            />
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end space-x-4">
          <button
            type="button"
            onClick={handleCancel}
            className="px-4 py-2 text-gray-700 transition-colors border border-gray-300 rounded-md hover:bg-gray-50 dark:text-gray-300 dark:border-gray-600 dark:hover:bg-gray-700"
          >
            <X className="inline w-4 h-4 mr-2" />
            Hủy
          </button>
          <button
            type="submit"
            disabled={loading}
            className="px-4 py-2 text-white transition-colors bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-50 dark:bg-blue-500 dark:hover:bg-blue-600"
          >
            <Save className="inline w-4 h-4 mr-2" />
            {loading ? 'Đang lưu...' : 'Lưu'}
          </button>
        </div>
      </form>

      {/* Organization Selector Modal */}
      {showOrganizationSelector && (
        <OrganizationSelector
          selectedOrganizationId={formData.organizationId}
          onOrganizationSelect={handleOrganizationSelect}
          onClose={() => setShowOrganizationSelector(false)}
          disabled={mode === 'edit'}
        />
      )}
    </div>
  );
};

export default PaymentCampaignForm;
