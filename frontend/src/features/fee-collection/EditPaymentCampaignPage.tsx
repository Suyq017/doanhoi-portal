import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import PaymentCampaignForm from './components/admin/PaymentCampaignForm';
import { PaymentCampaign } from './types';
import { paymentCampaignService } from '@/shared/services/fee-collection-service';

const EditPaymentCampaignPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [campaign, setCampaign] = useState<PaymentCampaign | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, [id]);

  const loadData = async () => {
    if (!id) {
      setError('ID đợt thu phí không hợp lệ');
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      // Load campaign
      const campaignResponse = await paymentCampaignService.getPaymentCampaignById(id);
      
      // Set campaign
      setCampaign(campaignResponse);
      
    } catch (err) {
      console.error('Error loading data:', err);
      setError(err instanceof Error ? err.message : 'Không thể tải dữ liệu');
    } finally {
      setLoading(false);
    }
  };

  const handleGoBack = () => {
    if (campaign) {
      navigate(`/admin/payment-campaigns/${campaign.id}`);
    } else {
      navigate('/admin/payment-campaigns');
    }
  };

  if (loading) {
    return (
      <div className="container px-4 py-6 mx-auto">
        <div className="flex items-center justify-center h-64">
          <div className="w-32 h-32 border-b-2 border-blue-600 rounded-full animate-spin"></div>
        </div>
      </div>
    );
  }

  if (error || !campaign) {
    return (
      <div className="container px-4 py-6 mx-auto">
        <div className="mb-6">
          <button
            onClick={handleGoBack}
            className="inline-flex items-center text-gray-600 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200"
          >
            <ArrowLeft className="w-4 h-4 mr-1" />
            Quay lại
          </button>
        </div>
        
        <div className="px-4 py-3 text-red-700 border border-red-200 rounded bg-red-50 dark:bg-red-900 dark:border-red-800 dark:text-red-200">
          {error || 'Không tìm thấy đợt thu phí'}
        </div>
      </div>
    );
  }

  // Check if campaign can be edited (only DRAFT status)
  if (campaign.status !== 'DRAFT') {
    return (
      <div className="container px-4 py-6 mx-auto">
        <div className="mb-6">
          <button
            onClick={handleGoBack}
            className="inline-flex items-center text-gray-600 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200"
          >
            <ArrowLeft className="w-4 h-4 mr-1" />
            Quay lại
          </button>
        </div>
        
        <div className="px-4 py-3 text-yellow-700 border border-yellow-200 rounded bg-yellow-50 dark:bg-yellow-900 dark:border-yellow-800 dark:text-yellow-200">
          <h3 className="font-medium">Không thể chỉnh sửa</h3>
          <p className="mt-1">
            Chỉ có thể chỉnh sửa đợt thu phí ở trạng thái "Nháp". 
            Đợt thu phí này đang ở trạng thái: {
              campaign.status === 'ACTIVE' ? 'Đang hoạt động' :
              campaign.status === 'COMPLETED' ? 'Hoàn thành' :
              campaign.status === 'CANCELLED' ? 'Đã hủy' : campaign.status
            }
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="container px-4 py-6 mx-auto">
      {/* Header */}
      <div className="mb-6">
        <button
          onClick={handleGoBack}
          className="inline-flex items-center mb-4 text-gray-600 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200"
        >
          <ArrowLeft className="w-4 h-4 mr-1" />
          Quay lại
        </button>
      </div>

      {/* Form */}
      <PaymentCampaignForm
        campaign={campaign}
        mode="edit"
      />
    </div>
  );
};

export default EditPaymentCampaignPage;
