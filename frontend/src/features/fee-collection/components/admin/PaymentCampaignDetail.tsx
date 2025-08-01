import React, { useState, useEffect } from 'react';
import { useParams, Link, useSearchParams } from 'react-router-dom';
import { Edit, ArrowLeft, Play, CheckCircle, X, Users, DollarSign, Calendar, Building } from 'lucide-react';
import { PaymentCampaign, PaymentFeeLevel } from '../../types';
import { paymentCampaignService } from '../../services/paymentCampaignService';
import { paymentFeeLevelService } from '../../services/paymentFeeLevelService';
import TabNavigation from './tabs/TabNavigation';
import FeeLevelTab from './tabs/FeeLevelTab';
import MemberAssignmentTab from './tabs/MemberAssignmentTab';
import PayOSConfigTab from './tabs/PayOSConfigTab';

const PaymentCampaignDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [searchParams, setSearchParams] = useSearchParams();
  const [campaign, setCampaign] = useState<PaymentCampaign | null>(null);
  const [feeLevels, setFeeLevels] = useState<PaymentFeeLevel[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  
  // Tab state
  const currentTab = searchParams.get('tab') || 'fee-levels';
  
  const handleTabChange = (tabId: string) => {
    setSearchParams({ tab: tabId });
  };

  useEffect(() => {
    if (id) {
      loadCampaignData();
    }
  }, [id]);

  const loadCampaignData = async () => {
    if (!id) return;
    
    try {
      setLoading(true);
      const [campaignResponse, feeLevelsResponse] : any = await Promise.all([
        paymentCampaignService.getPaymentCampaignById(id),
        paymentFeeLevelService.getFeeLevelsByCampaign(id)
      ]);
      setCampaign(campaignResponse);
      setFeeLevels(feeLevelsResponse);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load campaign data');
    } finally {
      setLoading(false);
    }
  };

  const handleStatusChange = async (action: 'activate' | 'complete' | 'cancel') => {
    if (!campaign) return;
    
    try {
      setActionLoading(true);
      let response;
      
      switch (action) {
        case 'activate':
          response = await paymentCampaignService.activatePaymentCampaign(campaign.id);
          break;
        case 'complete':
          response = await paymentCampaignService.completePaymentCampaign(campaign.id);
          break;
        case 'cancel':
          response = await paymentCampaignService.cancelPaymentCampaign(campaign.id);
          break;
      }
      
      setCampaign(response.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update campaign status');
    } finally {
      setActionLoading(false);
    }
  };

  const getStatusColor = (status: PaymentCampaign['status']) => {
    switch (status) {
      case 'DRAFT': return 'bg-gray-100 text-gray-800';
      case 'ACTIVE': return 'bg-green-100 text-green-800';
      case 'COMPLETED': return 'bg-blue-100 text-blue-800';
      case 'CANCELLED': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusText = (status: PaymentCampaign['status']) => {
    switch (status) {
      case 'DRAFT': return 'Nháp';
      case 'ACTIVE': return 'Đang hoạt động';
      case 'COMPLETED': return 'Hoàn thành';
      case 'CANCELLED': return 'Đã hủy';
      default: return status;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-32 h-32 border-b-2 border-blue-600 rounded-full animate-spin"></div>
      </div>
    );
  }

  if (error || !campaign) {
    return (
      <div className="container px-4 py-6 mx-auto">
        <div className="px-4 py-3 text-red-700 border border-red-200 rounded bg-red-50">
          {error || 'Campaign not found'}
        </div>
        <Link
          to="/admin/payment-campaigns"
          className="inline-flex items-center mt-4 text-blue-600 hover:text-blue-800"
        >
          <ArrowLeft className="w-4 h-4 mr-1" />
          Quay lại danh sách
        </Link>
      </div>
    );
  }

  return (
    <div className="container px-4 py-6 mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Link
            to="/admin/payment-campaigns"
            className="text-gray-600 hover:text-gray-800"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{campaign.name}</h1>
            <div className="flex items-center mt-1 space-x-2">
              <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(campaign.status)}`}>
                {getStatusText(campaign.status)}
              </span>
              <span className="text-sm text-gray-500">
                {campaign.organization?.name}
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          {campaign.status === 'DRAFT' && (
            <>
              <Link
                to={`/admin/payment-campaigns/${campaign.id}/edit`}
                className="inline-flex items-center px-3 py-2 text-gray-700 transition-colors border border-gray-300 rounded-md hover:bg-gray-50"
              >
                <Edit className="w-4 h-4 mr-1" />
                Chỉnh sửa
              </Link>
              <button
                onClick={() => handleStatusChange('activate')}
                disabled={actionLoading}
                className="inline-flex items-center px-3 py-2 text-white transition-colors bg-green-600 rounded-md hover:bg-green-700 disabled:opacity-50"
              >
                <Play className="w-4 h-4 mr-1" />
                Kích hoạt
              </button>
            </>
          )}
          
          {campaign.status === 'ACTIVE' && (
            <>
              <button
                onClick={() => handleStatusChange('complete')}
                disabled={actionLoading}
                className="inline-flex items-center px-3 py-2 text-white transition-colors bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-50"
              >
                <CheckCircle className="w-4 h-4 mr-1" />
                Hoàn thành
              </button>
              <button
                onClick={() => handleStatusChange('cancel')}
                disabled={actionLoading}
                className="inline-flex items-center px-3 py-2 text-white transition-colors bg-red-600 rounded-md hover:bg-red-700 disabled:opacity-50"
              >
                <X className="w-4 h-4 mr-1" />
                Hủy
              </button>
            </>
          )}
        </div>
      </div>

      {/* Campaign Info */}
      <div className="p-6 bg-white border rounded-lg">
        <h2 className="mb-4 text-lg font-medium text-gray-900">Thông Tin Đợt Đóng Phí</h2>
        
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
          <div className="flex items-center space-x-3">
            <Building className="w-5 h-5 text-gray-400" />
            <div>
              <div className="text-sm text-gray-500">Tổ chức</div>
              <div className="font-medium">{campaign.organization?.name}</div>
            </div>
          </div>

          <div className="flex items-center space-x-3">
            <Calendar className="w-5 h-5 text-gray-400" />
            <div>
              <div className="text-sm text-gray-500">Thời gian</div>
              <div className="font-medium">
                {new Date(campaign.startDate).toLocaleDateString('vi-VN')} - {new Date(campaign.endDate).toLocaleDateString('vi-VN')}
              </div>
            </div>
          </div>

          <div className="flex items-center space-x-3">
            <Users className="w-5 h-5 text-gray-400" />
            <div>
              <div className="text-sm text-gray-500">Người tạo</div>
              <div className="font-medium">{campaign.createdByUser?.familyName} {campaign.createdByUser?.givenName}</div>
            </div>
          </div>

          <div className="flex items-center space-x-3">
            <DollarSign className="w-5 h-5 text-gray-400" />
            <div>
              <div className="text-sm text-gray-500">Số mức phí</div>
              <div className="font-medium">{campaign.feeLevels?.length || 0} mức</div>
            </div>
          </div>
        </div>

        {campaign.description && (
          <div className="mt-6">
            <div className="mb-1 text-sm text-gray-500">Mô tả</div>
            <div className="text-gray-900">{campaign.description}</div>
          </div>
        )}
      </div>

      {/* Tab Navigation and Content */}
      <div className="bg-white border rounded-lg">
        <TabNavigation 
          activeTab={currentTab} 
          onTabChange={handleTabChange} 
        />
        
        <div className="p-6">
          {currentTab === 'fee-levels' && (
            <FeeLevelTab 
              campaign={campaign}
              feeLevels={feeLevels}
              onFeeLevelsChange={setFeeLevels}
              onError={setError}
            />
          )}
          
          {currentTab === 'member-assignments' && (
            <MemberAssignmentTab campaign={campaign} />
          )}
          
          {currentTab === 'payos-config' && (
            <PayOSConfigTab campaign={campaign} />
          )}
        </div>
      </div>
    </div>
  );
};

export default PaymentCampaignDetail;
