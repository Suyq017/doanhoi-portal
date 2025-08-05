import React, { useState, useEffect } from 'react';
import { useParams, Link, useSearchParams } from 'react-router-dom';
import { Edit, ArrowLeft, Play, CheckCircle, X, Users, DollarSign, Calendar, Building, AlertCircle } from 'lucide-react';
import { useToast } from '@/shared/hooks/useToast';
import { PaymentCampaign, PaymentFeeLevel } from './types';
import { paymentCampaignService, paymentFeeLevelService, paymentAssignmentService } from '@/shared/services/fee-collection-service';
import Toast from '@/shared/components/Toast';
import TabNavigation from './components/admin/tabs/TabNavigation';
import StatisticsTab from './components/admin/tabs/StatisticsTab';
import FeeLevelTab from './components/admin/tabs/FeeLevelTab';
import MemberAssignmentTab from './components/admin/tabs/MemberAssignmentTab';
import PayOSConfigTab from './components/admin/tabs/PayOSConfigTab';

const PaymentCampaignDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [searchParams, setSearchParams] = useSearchParams();
  const { toasts, showSuccess, showError, hideToast } = useToast();
  const [campaign, setCampaign] = useState<PaymentCampaign | null>(null);
  const [feeLevels, setFeeLevels] = useState<PaymentFeeLevel[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [activationError, setActivationError] = useState<string | null>(null);
  const [_assignmentCount, setAssignmentCount] = useState(0); // Keep for future use
  const [canActivate, setCanActivate] = useState(false);
  
  // Tab state
  const currentTab = searchParams.get('tab') || 'statistics';
  
  const handleTabChange = (tabId: string) => {
    setSearchParams({ tab: tabId });
  };

  useEffect(() => {
    if (id) {
      loadCampaignData();
    }
  }, [id]);

  // Refresh activation requirements when feeLevels change
  useEffect(() => {
    if (id && feeLevels.length >= 0) {
      checkActivationRequirements(id, feeLevels);
    }
  }, [id, feeLevels]);

  const loadCampaignData = async () => {
    if (!id) return;
    
    try {
      setLoading(true);
      setError(null);
      setActivationError(null);
      
      const [campaignResponse, feeLevelsResponse] : any = await Promise.all([
        paymentCampaignService.getPaymentCampaignById(id),
        paymentFeeLevelService.getFeeLevelsByCampaign(id)
      ]);
      
      setCampaign(campaignResponse);
      setFeeLevels(feeLevelsResponse);
      
      // Check assignments for activation requirements
      await checkActivationRequirements(id, feeLevelsResponse);
      
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load campaign data');
    } finally {
      setLoading(false);
    }
  };

  const checkActivationRequirements = async (campaignId: string, currentFeeLevels: PaymentFeeLevel[]) => {
    try {
      // Check if there are fee levels
      const hasFeeLevels = currentFeeLevels && currentFeeLevels.length > 0;
      
      // Check if there are member assignments
      let hasAssignments = false;
      try {
        const assignmentsResponse : any = await paymentAssignmentService.getAssignmentsByCampaign(campaignId);
        const assignments = assignmentsResponse.data?.assignments || [];
        setAssignmentCount(assignments.length);
        hasAssignments = assignments.length > 0;
      } catch (err) {
        // If assignments fail to load, just set count to 0
        setAssignmentCount(0);
        hasAssignments = false;
      }
      
      // All requirements must be met for activation
      setCanActivate(hasFeeLevels && hasAssignments);
      
    } catch (err) {
      console.error('Error checking activation requirements:', err);
      setCanActivate(false);
    }
  };

  const handleStatusChange = async (action: 'activate' | 'complete' | 'cancel') => {
    if (!campaign) return;
    
    // Check activation requirements for activate action
    if (action === 'activate' && !canActivate) {
      const missingRequirements = [];
      if (!feeLevels || feeLevels.length === 0) {
        missingRequirements.push('Chưa có mức phí nào được tạo');
      }
      if (_assignmentCount === 0) {
        missingRequirements.push('Chưa có thành viên nào được phân công');
      }
      // Note: PayOS config check would go here if needed
      
      setActivationError(`Không thể kích hoạt đợt thu phí: ${missingRequirements.join(', ')}`);
      return;
    }
    
    try {
      setActionLoading(true);
      setActivationError(null);
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
      
      // Handle response properly - it might be response.data or just response
      const updatedCampaign = response?.data || response;
      
      if (updatedCampaign) {
        setCampaign(updatedCampaign);
        
        // Show success message with toast
        const actionMessages = {
          activate: 'Đợt thu phí đã được kích hoạt thành công!',
          complete: 'Đợt thu phí đã được hoàn thành thành công!',
          cancel: 'Đợt thu phí đã được hủy thành công!'
        };
        showSuccess(actionMessages[action]);
      } else {
        console.warn('No campaign data received from API response');
        showError('Không thể cập nhật trạng thái đợt thu phí. Vui lòng thử lại.');
      }
      
    } catch (err) {
      console.error('Error in handleStatusChange:', err);
      const errorMessage = err instanceof Error ? err.message : `Failed to ${action} campaign`;
      
      if (action === 'activate') {
        setActivationError(`Không thể kích hoạt: ${errorMessage}`);
      } else {
        showError(`Không thể ${action === 'complete' ? 'hoàn thành' : 'hủy'}: ${errorMessage}`);
      }
      
      // Reload campaign data to ensure UI is in sync
      if (id) {
        await loadCampaignData();
      }
    } finally {
      setActionLoading(false);
    }
  };

  const getStatusColor = (status: PaymentCampaign['status']) => {
    switch (status) {
      case 'DRAFT': return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300';
      case 'ACTIVE': return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
      case 'COMPLETED': return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200';
      case 'CANCELLED': return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200';
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300';
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
        <div className="px-4 py-3 text-red-700 border border-red-200 rounded bg-red-50 dark:bg-red-900 dark:border-red-800 dark:text-red-200">
          {error || 'Campaign not found'}
        </div>
        <Link
          to="/admin/payment-campaigns"
          className="inline-flex items-center mt-4 text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"
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
            className="text-gray-600 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{campaign.name}</h1>
            <div className="flex items-center mt-1 space-x-2">
              <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(campaign.status)}`}>
                {getStatusText(campaign.status)}
              </span>
              <span className="text-sm text-gray-500 dark:text-gray-400">
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
                className="inline-flex items-center px-3 py-2 text-gray-700 transition-colors border border-gray-300 rounded-md hover:bg-gray-50 dark:text-gray-200 dark:border-gray-600 dark:hover:bg-gray-700"
              >
                <Edit className="w-4 h-4 mr-1" />
                Chỉnh sửa
              </Link>
              <div className="relative">
                <button
                  onClick={() => handleStatusChange('activate')}
                  disabled={actionLoading || !canActivate}
                  className={`inline-flex items-center px-3 py-2 text-white transition-colors rounded-md disabled:opacity-50 disabled:cursor-not-allowed ${
                    canActivate 
                      ? 'bg-green-600 hover:bg-green-700' 
                      : 'bg-gray-400'
                  }`}
                  title={!canActivate ? 'Cần có đầy đủ mức phí, thành viên và cấu hình PayOS' : ''}
                >
                  <Play className="w-4 h-4 mr-1" />
                  Kích hoạt
                </button>
                {!canActivate && (
                  <div className="absolute right-0 z-10 w-64 p-2 mt-1 text-xs text-yellow-700 bg-yellow-100 border border-yellow-200 rounded-md shadow-lg dark:bg-yellow-900 dark:border-yellow-800 dark:text-yellow-200">
                    <div className="flex items-start space-x-1">
                      <AlertCircle className="w-3 h-3 mt-0.5 flex-shrink-0" />
                      <div>
                        Cần có:
                        <ul className="mt-1 ml-2 list-disc">
                          {(!feeLevels || feeLevels.length === 0) && <li>Tạo mức phí</li>}
                          {_assignmentCount === 0 && <li>Phân công thành viên</li>}
                          <li>Cấu hình PayOS</li>
                        </ul>
                      </div>
                    </div>
                  </div>
                )}
              </div>
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

      {/* Activation Error Message */}
      {activationError && (
        <div className="p-4 border border-red-200 rounded-lg bg-red-50 dark:bg-red-900 dark:border-red-800">
          <div className="flex items-start space-x-3">
            <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5 dark:text-red-300" />
            <div>
              <h3 className="text-sm font-medium text-red-800 dark:text-red-200">Không thể kích hoạt</h3>
              <p className="mt-1 text-sm text-red-700 dark:text-red-300">{activationError}</p>
            </div>
            <button
              onClick={() => setActivationError(null)}
              className="ml-auto text-red-400 hover:text-red-600 dark:text-red-300 dark:hover:text-red-200"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Campaign Info */}
      <div className="p-6 bg-white border rounded-lg dark:bg-gray-800 dark:border-gray-700">
        <h2 className="mb-4 text-lg font-medium text-gray-900 dark:text-white">Thông Tin Đợt Đóng Phí</h2>
        
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
          <div className="flex items-center space-x-3">
            <Building className="w-5 h-5 text-gray-400 dark:text-gray-500" />
            <div>
              <div className="text-sm text-gray-500 dark:text-gray-400">Tổ chức</div>
              <div className="font-medium text-gray-900 dark:text-white">{campaign.organization?.name}</div>
            </div>
          </div>

          <div className="flex items-center space-x-3">
            <Calendar className="w-5 h-5 text-gray-400 dark:text-gray-500" />
            <div>
              <div className="text-sm text-gray-500 dark:text-gray-400">Thời gian</div>
              <div className="font-medium text-gray-900 dark:text-white">
                <div className="mb-1">
                  <span className="text-gray-500 text-s dark:text-gray-400">Từ: </span>
                  {new Date(campaign.startDate).toLocaleDateString('vi-VN', {
                    day: '2-digit',
                    month: '2-digit', 
                    year: 'numeric'
                  })} - {new Date(campaign.startDate).toLocaleTimeString('vi-VN', {
                    hour: '2-digit',
                    minute: '2-digit',
                    hour12: false
                  })}
                </div>
                <div>
                  <span className="text-gray-500 text-s dark:text-gray-400">Đến: </span>
                  {new Date(campaign.endDate).toLocaleDateString('vi-VN', {
                    day: '2-digit',
                    month: '2-digit',
                    year: 'numeric'
                  })} - {new Date(campaign.endDate).toLocaleTimeString('vi-VN', {
                    hour: '2-digit',
                    minute: '2-digit',
                    hour12: false
                  })}
                </div>
              </div>
            </div>
          </div>

          <div className="flex items-center space-x-3">
            <Users className="w-5 h-5 text-gray-400 dark:text-gray-500" />
            <div>
              <div className="text-sm text-gray-500 dark:text-gray-400">Người tạo</div>
              <div className="font-medium text-gray-900 dark:text-white">{campaign.createdByUser?.familyName} {campaign.createdByUser?.givenName}</div>
            </div>
          </div>

          <div className="flex items-center space-x-3">
            <DollarSign className="w-5 h-5 text-gray-400 dark:text-gray-500" />
            <div>
              <div className="text-sm text-gray-500 dark:text-gray-400">Số mức phí</div>
              <div className="font-medium text-gray-900 dark:text-white">{campaign.feeLevels?.length || 0} mức</div>
            </div>
          </div>
        </div>

        {campaign.description && (
          <div className="mt-6">
            <div className="mb-1 text-sm text-gray-500 dark:text-gray-400">Mô tả</div>
            <div className="text-gray-900 dark:text-white">{campaign.description}</div>
          </div>
        )}
      </div>

      {/* Tab Navigation and Content */}
      <div className="bg-white border rounded-lg dark:bg-gray-800 dark:border-gray-700">
        <TabNavigation 
          activeTab={currentTab} 
          onTabChange={handleTabChange} 
        />
        
        <div className="p-6">
          {currentTab === 'statistics' && (
            <StatisticsTab campaign={campaign} />
          )}
          
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

      {/* Toast Container */}
      <div className="fixed z-50 space-y-4 top-4 right-4">
        {toasts.map((toast) => (
          <Toast
            key={toast.id}
            type={toast.type}
            message={toast.message}
            duration={toast.duration}
            onClose={() => hideToast(toast.id)}
          />
        ))}
      </div>
    </div>
  );
};

export default PaymentCampaignDetailPage;
