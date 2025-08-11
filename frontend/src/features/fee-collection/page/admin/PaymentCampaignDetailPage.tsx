import React, { useState, useEffect } from 'react';
import { useParams, Link, useSearchParams, useNavigate } from 'react-router-dom';
import { Edit, ArrowLeft, Play, CheckCircle, X, Users, DollarSign, Calendar, Building, AlertCircle, Trash2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useToast } from '@/shared/hooks/useToast';
import { PaymentCampaign, PaymentFeeLevel } from '../../types';
import { paymentCampaignService, paymentFeeLevelService, paymentAssignmentService } from '@/shared/services/fee-collection-service';
import { Toast, ConfirmDialog } from '@/shared/components';
import PaymentCampaignForm from '../../components/admin/PaymentCampaignForm';
import TabNavigation from '../../components/admin/tabs/TabNavigation';
import StatisticsTab from '../../components/admin/tabs/StatisticsTab';
import FeeLevelTab from '../../components/admin/tabs/FeeLevelTab';
import MemberAssignmentTab from '../../components/admin/tabs/MemberAssignmentTab';
import PaymentHistoryTab from '../../components/admin/tabs/PaymentHistoryTab';
import PayOSConfigTab from '../../components/admin/tabs/PayOSConfigTab';

const PaymentCampaignDetailPage: React.FC = () => {
  const { t } = useTranslation('paymentCampaigns');
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { toasts, confirmDialog, showSuccess, showError, showConfirm, hideToast } = useToast();
  const [campaign, setCampaign] = useState<PaymentCampaign | null>(null);
  const [feeLevels, setFeeLevels] = useState<PaymentFeeLevel[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [activationError, setActivationError] = useState<string | null>(null);
  const [_assignmentCount, setAssignmentCount] = useState(0); // Keep for future use
  const [canActivate, setCanActivate] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  
  // Tab state
  const currentTab = searchParams.get('tab') || 'statistics';
  
  const handleTabChange = (tabId: string) => {
    setSearchParams({ tab: tabId });
  };

  const handleEditCampaign = () => {
    setShowEditModal(true);
  };

  const handleCloseEditModal = () => {
    setShowEditModal(false);
  };

  const handleCampaignUpdated = () => {
    setShowEditModal(false);
    // Reload campaign data to reflect changes
    if (id) {
      loadCampaignData();
    }
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
      console.log('Checking activation requirements:', { hasFeeLevels, feeLevelsCount: currentFeeLevels?.length || 0 });
      
      // Check if there are member assignments
      let hasAssignments = false;
      try {
        const assignmentsResponse : any = await paymentAssignmentService.getAssignmentsByCampaign(campaignId);
        const assignments = assignmentsResponse.data?.assignments || [];
        setAssignmentCount(assignments.length);
        hasAssignments = assignments.length > 0;
        console.log('Assignment check result:', { hasAssignments, assignmentCount: assignments.length });
      } catch (err) {
        // If assignments fail to load, just set count to 0
        setAssignmentCount(0);
        hasAssignments = false;
        console.log('Failed to load assignments:', err);
      }
      
      // All requirements must be met for activation
      const canActivateResult = hasFeeLevels && hasAssignments;
      console.log('Final activation result:', { hasFeeLevels, hasAssignments, canActivate: canActivateResult });
      setCanActivate(canActivateResult);
      
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
        missingRequirements.push(t('activation.noFeeLevels'));
      }
      if (_assignmentCount === 0) {
        missingRequirements.push(t('activation.noMembers'));
      }
      // Note: PayOS config check would go here if needed
      
      setActivationError(t('activation.error', { requirements: missingRequirements.join(', ') }));
      return;
    }

    // Show confirmation dialog for activate action
    if (action === 'activate') {
      const shouldActivate = await showConfirm(
        t('confirmations.activate.title'),
        t('confirmations.activate.message'),
        {
          confirmText: t('confirmations.activate.confirm'),
          cancelText: t('confirmations.activate.cancel'),
          variant: 'warning'
        }
      );
      
      if (!shouldActivate) return;
    }

    // Show confirmation dialog for cancel action
    if (action === 'cancel') {
      const shouldCancel = await showConfirm(
        t('confirmations.cancelCampaign.title'),
        t('confirmations.cancelCampaign.message'),
        {
          confirmText: t('confirmations.cancelCampaign.confirm'),
          cancelText: t('confirmations.cancelCampaign.cancel'),
          variant: 'danger'
        }
      );
      
      if (!shouldCancel) return;
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
          activate: t('messages.activateSuccess'),
          complete: t('messages.completeSuccess'),
          cancel: t('messages.cancelSuccess')
        };
        showSuccess(actionMessages[action]);
      } else {
        console.warn('No campaign data received from API response');
        showError(t('messages.errorStatusUpdate'));
      }
      
    } catch (err) {
      console.error('Error in handleStatusChange:', err);
      const errorMessage = err instanceof Error ? err.message : `Failed to ${action} campaign`;
      
      if (action === 'activate') {
        setActivationError(t('messages.errorActivate', { error: errorMessage }));
      } else {
        const errorKey = action === 'complete' ? 'messages.errorComplete' : 'messages.errorCancel';
        showError(t(errorKey, { error: errorMessage }));
      }
      
      // Reload campaign data to ensure UI is in sync
      if (id) {
        await loadCampaignData();
      }
    } finally {
      setActionLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!campaign || !id) return;

    // Use custom confirm dialog
    const shouldDelete = await showConfirm(
      t('confirmations.delete.title'),
      t('confirmations.delete.message'),
      {
        confirmText: t('confirmations.delete.confirm'),
        cancelText: t('confirmations.delete.cancel'),
        variant: 'danger'
      }
    );
    
    if (!shouldDelete) return;
    
    try {
      setActionLoading(true);
      await paymentCampaignService.deletePaymentCampaign(id);
      showSuccess(t('messages.deleteSuccess'));
      
      // Navigate back to campaigns list after successful deletion
      navigate('/admin/payment-campaigns');
    } catch (err) {
      console.error('Error in handleDelete:', err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to delete campaign';
      showError(t('messages.errorDelete', { error: errorMessage }));
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
      case 'DRAFT': return t('status.draft');
      case 'ACTIVE': return t('status.active');
      case 'COMPLETED': return t('status.completed');
      case 'CANCELLED': return t('status.cancelled');
      default: return status;
    }
  };

  if (loading) {
    return (
      <div className="">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
              {t('detail.title')}
            </h1>
            <p className="mt-2 text-gray-600 dark:text-gray-400">
              {t('detail.description')}
            </p>
          </div>
        </div>
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <div className="w-12 h-12 mx-auto border-b-2 rounded-full animate-spin border-doan-600"></div>
            <p className="mt-4 text-gray-600 dark:text-gray-400">
              {t('detail.loadingMessage')}
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (error || !campaign) {
    return (
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
              {t('detail.title')}
            </h1>
            <p className="mt-2 text-gray-600 dark:text-gray-400">
              {t('detail.description')}
            </p>
          </div>
        </div>
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <div className="mb-4 text-xl text-red-500">⚠️</div>
            <p className="text-red-600 dark:text-red-400">{error || t('detail.notFound')}</p>
            <Link
              to="/admin/payment-campaigns"
              className="inline-flex items-center px-4 py-2 mt-4 text-white rounded-lg bg-doan-600 hover:bg-doan-700"
            >
              <ArrowLeft className="w-4 h-4 mr-1" />
              {t('detail.backToList')}
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container px-4 py-6 mx-auto">
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
              <button
                onClick={handleEditCampaign}
                className="inline-flex items-center px-3 py-2 text-gray-700 transition-colors border border-gray-300 rounded-md hover:bg-gray-50 dark:text-gray-200 dark:border-gray-600 dark:hover:bg-gray-700"
              >
                <Edit className="w-4 h-4 mr-1" />
                {t('actions.edit')}
              </button>
              <div className="relative">
                <button
                  onClick={() => handleStatusChange('activate')}
                  disabled={actionLoading || !canActivate}
                  className={`inline-flex items-center px-3 py-2 text-white transition-colors rounded-md disabled:opacity-50 disabled:cursor-not-allowed ${
                    canActivate 
                      ? 'bg-green-600 hover:bg-green-700' 
                      : 'bg-gray-400'
                  }`}
                  title={!canActivate ? t('activation.requirements') : ''}
                >
                  <Play className="w-4 h-4 mr-1" />
                  {t('actions.activate')}
                </button>
                {!canActivate && (
                  <div className="absolute right-0 z-10 w-64 p-2 mt-1 text-xs text-yellow-700 bg-yellow-100 border border-yellow-200 rounded-md shadow-lg dark:bg-yellow-900 dark:border-yellow-800 dark:text-yellow-200">
                    <div className="flex items-start space-x-1">
                      <AlertCircle className="w-3 h-3 mt-0.5 flex-shrink-0" />
                      <div>
                        {t('activation.needsTitle')}
                        <ul className="mt-1 ml-2 list-disc">
                          {(!feeLevels || feeLevels.length === 0) && <li>{t('activation.needsFeeLevels')}</li>}
                          {_assignmentCount === 0 && <li>{t('activation.needsMembers')}</li>}
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
                {t('actions.complete')}
              </button>
              <button
                onClick={() => handleStatusChange('cancel')}
                disabled={actionLoading}
                className="inline-flex items-center px-3 py-2 text-white transition-colors bg-red-600 rounded-md hover:bg-red-700 disabled:opacity-50"
              >
                <X className="w-4 h-4 mr-1" />
                {t('actions.cancel')}
              </button>
            </>
          )}

          {(campaign.status === 'CANCELLED' || campaign.status === 'COMPLETED') && (
            <button
              onClick={handleDelete}
              disabled={actionLoading}
              className="inline-flex items-center px-3 py-2 text-white transition-colors bg-red-600 rounded-md hover:bg-red-700 disabled:opacity-50"
            >
              <Trash2 className="w-4 h-4 mr-1" />
              {t('actions.delete')}
            </button>
          )}
        </div>
      </div>

      {/* Activation Error Message */}
      {activationError && (
        <div className="p-4 mt-6 border border-red-200 rounded-lg bg-red-50 dark:bg-red-900 dark:border-red-800">
          <div className="flex items-start space-x-3">
            <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5 dark:text-red-300" />
            <div>
              <h3 className="text-sm font-medium text-red-800 dark:text-red-200">{t('activation.cannotActivate')}</h3>
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
      <div className="p-6 mt-6 bg-white border rounded-lg dark:bg-gray-800 dark:border-gray-700">
        <h2 className="mb-4 text-lg font-medium text-gray-900 dark:text-white">{t('detail.campaignInfo')}</h2>
        
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
          <div className="flex items-center space-x-3">
            <Building className="w-5 h-5 text-gray-400 dark:text-gray-500" />
            <div>
              <div className="text-sm text-gray-500 dark:text-gray-400">{t('detail.organization')}</div>
              <div className="font-medium text-gray-900 dark:text-white">{campaign.organization?.name}</div>
            </div>
          </div>

          <div className="flex items-center space-x-3">
            <Calendar className="w-5 h-5 text-gray-400 dark:text-gray-500" />
            <div>
              <div className="text-sm text-gray-500 dark:text-gray-400">{t('detail.timeframe')}</div>
              <div className="font-medium text-gray-900 dark:text-white">
                <div className="mb-1">
                  <span className="text-gray-500 text-s dark:text-gray-400">{t('detail.from')}: </span>
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
                  <span className="text-gray-500 text-s dark:text-gray-400">{t('detail.to')}: </span>
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
              <div className="text-sm text-gray-500 dark:text-gray-400">{t('detail.createdBy')}</div>
              <div className="font-medium text-gray-900 dark:text-white">{campaign.createdByUser?.familyName} {campaign.createdByUser?.givenName}</div>
            </div>
          </div>

          <div className="flex items-center space-x-3">
            <DollarSign className="w-5 h-5 text-gray-400 dark:text-gray-500" />
            <div>
              <div className="text-sm text-gray-500 dark:text-gray-400">{t('detail.feeLevelsCount')}</div>
              <div className="font-medium text-gray-900 dark:text-white">{campaign.feeLevels?.length || 0} {t('detail.levels')}</div>
            </div>
          </div>
        </div>

        {campaign.description && (
          <div className="mt-6">
            <div className="mb-1 text-sm text-gray-500 dark:text-gray-400">{t('detail.descriptionLabel')}</div>
            <div className="text-gray-900 dark:text-white">{campaign.description}</div>
          </div>
        )}
      </div>

      {/* Tab Navigation and Content */}
      <div className="mt-6 bg-white border rounded-lg dark:bg-gray-800 dark:border-gray-700">
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
            <MemberAssignmentTab 
              campaign={campaign} 
              onAssignmentsChange={async () => {
                // Refresh activation requirements when assignments change
                console.log('Assignments changed, refreshing activation requirements...');
                // Add a small delay to ensure backend has processed the changes
                setTimeout(() => {
                  if (id) {
                    checkActivationRequirements(id, feeLevels);
                  }
                }, 500);
              }}
            />
          )}
          
          {currentTab === 'payment-history' && (
            <PaymentHistoryTab campaign={campaign} />
          )}
          
          {currentTab === 'payos-config' && (
            <PayOSConfigTab 
              campaign={campaign} 
              onConfirmDelete={async () => {
                return await showConfirm(
                  'Xóa cấu hình PayOS',
                  'Bạn có chắc chắn muốn xóa cấu hình PayOS này? Hành động này không thể hoàn tác.',
                  {
                    confirmText: 'Xóa',
                    cancelText: 'Hủy',
                    variant: 'danger'
                  }
                );
              }}
            />
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

      {/* Edit Campaign Modal */}
      {showEditModal && campaign && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 transition-opacity bg-gray-500 bg-opacity-75" aria-hidden="true" onClick={handleCloseEditModal}></div>
            
            <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>
            
            <div className="inline-block w-full max-w-4xl p-6 my-8 overflow-hidden text-left align-middle transition-all transform bg-white border border-gray-300 rounded-lg shadow-xl dark:bg-gray-800 dark:border-gray-600">
              <PaymentCampaignForm 
                campaign={campaign}
                mode="edit"
                onSave={handleCampaignUpdated}
                onCancel={handleCloseEditModal}
              />
            </div>
          </div>
        </div>
      )}

      {/* Confirm Dialog */}
      <ConfirmDialog
        isOpen={confirmDialog.isOpen}
        title={confirmDialog.title}
        message={confirmDialog.message}
        confirmText={confirmDialog.confirmText}
        cancelText={confirmDialog.cancelText}
        variant={confirmDialog.variant}
        onConfirm={confirmDialog.onConfirm || (() => {})}
        onCancel={confirmDialog.onCancel || (() => {})}
      />
    </div>
  );
};

export default PaymentCampaignDetailPage;
