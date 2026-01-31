// PaymentCampaignDetailPage - Admin Campaign Detail Page
// Refactored with custom hooks and shared components

import React from 'react';
import { Link } from 'react-router-dom';
import { Edit, ArrowLeft, Play, CheckCircle, X, Users, DollarSign, Calendar, Building, AlertCircle, Trash2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { ConfirmDialog } from '@/shared/components';
import PaymentCampaignForm from '../../components/admin/PaymentCampaignForm';
import TabNavigation from '../../components/admin/tabs/TabNavigation';
import StatisticsTab from '../../components/admin/tabs/StatisticsTab';
import FeeLevelTab from '../../components/admin/tabs/FeeLevelTab';
import MemberAssignmentTab from '../../components/admin/tabs/MemberAssignmentTab';
import PaymentHistoryTab from '../../components/admin/tabs/PaymentHistoryTab';
import PayOSConfigTab from '../../components/admin/tabs/PayOSConfigTab';
import { usePaymentCampaignDetail } from '../../hooks';
import { PaymentCampaign } from '../../types';
import {
  LoadingState,
  ErrorState,
  ToastContainer,
  ModalWrapper
} from '../../components/shared';

// =============================================================================
// Sub-components for better organization
// =============================================================================

interface CampaignHeaderProps {
  campaign: NonNullable<ReturnType<typeof usePaymentCampaignDetail>['campaign']>;
  onEdit: () => void;
  onStatusChange: (action: 'activate' | 'complete' | 'cancel') => void;
  onDelete: () => void;
  canActivate: boolean;
  actionLoading: boolean;
  feeLevelsCount: number;
  assignmentCount: number;
  getStatusColor: (status: PaymentCampaign['status']) => string;
  getStatusText: (status: PaymentCampaign['status']) => string;
  t: (key: string, options?: any) => string;
}

const CampaignHeader: React.FC<CampaignHeaderProps> = ({
  campaign,
  onEdit,
  onStatusChange,
  onDelete,
  canActivate,
  actionLoading,
  feeLevelsCount,
  assignmentCount,
  getStatusColor,
  getStatusText,
  t
}) => (
  <div className="flex items-center justify-between">
    <div className="flex items-center space-x-4">
      <Link
        to="/portal/admin/payment-campaigns"
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
            onClick={onEdit}
            className="inline-flex items-center px-3 py-2 text-gray-700 transition-colors border border-gray-300 rounded-md hover:bg-gray-50 dark:text-gray-200 dark:border-gray-600 dark:hover:bg-gray-700"
          >
            <Edit className="w-4 h-4 mr-1" />
            {t('actions.edit')}
          </button>
          <div className="relative">
            <button
              onClick={() => onStatusChange('activate')}
              disabled={actionLoading || !canActivate}
              className={`inline-flex items-center px-3 py-2 text-white transition-colors rounded-md disabled:opacity-50 disabled:cursor-not-allowed ${canActivate
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
                      {feeLevelsCount === 0 && <li>{t('activation.needsFeeLevels')}</li>}
                      {assignmentCount === 0 && <li>{t('activation.needsMembers')}</li>}
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
            onClick={() => onStatusChange('complete')}
            disabled={actionLoading}
            className="inline-flex items-center px-3 py-2 text-white transition-colors bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-50"
          >
            <CheckCircle className="w-4 h-4 mr-1" />
            {t('actions.complete')}
          </button>
          <button
            onClick={() => onStatusChange('cancel')}
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
          onClick={onDelete}
          disabled={actionLoading}
          className="inline-flex items-center px-3 py-2 text-white transition-colors bg-red-600 rounded-md hover:bg-red-700 disabled:opacity-50"
        >
          <Trash2 className="w-4 h-4 mr-1" />
          {t('actions.delete')}
        </button>
      )}
    </div>
  </div>
);

interface CampaignInfoCardProps {
  campaign: NonNullable<ReturnType<typeof usePaymentCampaignDetail>['campaign']>;
  t: (key: string) => string;
}

const CampaignInfoCard: React.FC<CampaignInfoCardProps> = ({ campaign, t }) => (
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
              {campaign.startDate.split('T')[0]} - {campaign.startDate.split('T')[1]?.substring(0, 5)}
            </div>
            <div>
              <span className="text-gray-500 text-s dark:text-gray-400">{t('detail.to')}: </span>
              {campaign.endDate.split('T')[0]} - {campaign.endDate.split('T')[1]?.substring(0, 5)}
            </div>
          </div>
        </div>
      </div>

      <div className="flex items-center space-x-3">
        <Users className="w-5 h-5 text-gray-400 dark:text-gray-500" />
        <div>
          <div className="text-sm text-gray-500 dark:text-gray-400">{t('detail.createdBy')}</div>
          <div className="font-medium text-gray-900 dark:text-white">
            {campaign.createdByUser?.familyName} {campaign.createdByUser?.givenName}
          </div>
          <div className='text-xs font-normal'>
            {campaign.createdByUser?.email} - {campaign.createdByUser?.code}
          </div>
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
);

interface ActivationErrorBannerProps {
  error: string | null;
  onDismiss: () => void;
  t: (key: string) => string;
}

const ActivationErrorBanner: React.FC<ActivationErrorBannerProps> = ({ error, onDismiss, t }) => {
  if (!error) return null;

  return (
    <div className="p-4 mt-6 border border-red-200 rounded-lg bg-red-50 dark:bg-red-900 dark:border-red-800">
      <div className="flex items-start space-x-3">
        <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5 dark:text-red-300" />
        <div>
          <h3 className="text-sm font-medium text-red-800 dark:text-red-200">{t('activation.cannotActivate')}</h3>
          <p className="mt-1 text-sm text-red-700 dark:text-red-300">{error}</p>
        </div>
        <button
          onClick={onDismiss}
          className="ml-auto text-red-400 hover:text-red-600 dark:text-red-300 dark:hover:text-red-200"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};

// =============================================================================
// Main Component
// =============================================================================

const PaymentCampaignDetailPage: React.FC = () => {
  const { t } = useTranslation('paymentCampaigns');

  const {
    // State
    campaign,
    feeLevels,
    loading,
    error,
    actionLoading,
    activationError,
    canActivate,
    showEditModal,
    currentTab,

    // Actions
    handleTabChange,
    handleEditCampaign,
    handleCloseEditModal,
    handleCampaignUpdated,
    handleStatusChange,
    handleDelete,
    setFeeLevels,
    setError,
    checkActivationRequirements,
    setActivationError,

    // Helpers
    getStatusColor,
    getStatusText,

    // Toast & Dialog
    toasts,
    confirmDialog,
    hideToast,
    showConfirm
  } = usePaymentCampaignDetail();

  // Loading state
  if (loading) {
    return (
      <LoadingState
        title={t('detail.title')}
        subtitle={t('detail.description')}
        message={t('detail.loadingMessage')}
      />
    );
  }

  // Error state
  if (error || !campaign) {
    return (
      <ErrorState
        title={t('detail.title')}
        subtitle={t('detail.description')}
        error={error || t('detail.notFound')}
        backLink="/portal/admin/payment-campaigns"
        backLabel={t('detail.backToList')}
      />
    );
  }

  // Calculate assignment count for header display
  const assignmentCount = campaign.assignments?.length || 0;

  return (
    <div className="container px-4 py-6 mx-auto">
      {/* Header */}
      <CampaignHeader
        campaign={campaign}
        onEdit={handleEditCampaign}
        onStatusChange={handleStatusChange}
        onDelete={handleDelete}
        canActivate={canActivate}
        actionLoading={actionLoading}
        feeLevelsCount={feeLevels.length}
        assignmentCount={assignmentCount}
        getStatusColor={getStatusColor}
        getStatusText={getStatusText}
        t={t}
      />

      {/* Activation Error Message */}
      <ActivationErrorBanner
        error={activationError}
        onDismiss={() => setActivationError(null)}
        t={t}
      />

      {/* Campaign Info */}
      <CampaignInfoCard campaign={campaign} t={t} />

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
                setTimeout(() => {
                  checkActivationRequirements();
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
                  t('confirmations.deletePayOSConfig.title'),
                  t('confirmations.deletePayOSConfig.message'),
                  {
                    confirmText: t('confirmations.deletePayOSConfig.confirm'),
                    cancelText: t('confirmations.deletePayOSConfig.cancel'),
                    variant: 'danger'
                  }
                );
              }}
            />
          )}
        </div>
      </div>

      {/* Toast Container */}
      <ToastContainer toasts={toasts} onHide={hideToast} />

      {/* Edit Campaign Modal */}
      <ModalWrapper isOpen={showEditModal} onClose={handleCloseEditModal}>
        <PaymentCampaignForm
          campaign={campaign}
          mode="edit"
          onSave={handleCampaignUpdated}
          onCancel={handleCloseEditModal}
        />
      </ModalWrapper>

      {/* Confirm Dialog */}
      <ConfirmDialog
        isOpen={confirmDialog.isOpen}
        title={confirmDialog.title}
        message={confirmDialog.message}
        confirmText={confirmDialog.confirmText}
        cancelText={confirmDialog.cancelText}
        variant={confirmDialog.variant}
        onConfirm={confirmDialog.onConfirm || (() => { })}
        onCancel={confirmDialog.onCancel || (() => { })}
      />
    </div>
  );
};

export default PaymentCampaignDetailPage;
