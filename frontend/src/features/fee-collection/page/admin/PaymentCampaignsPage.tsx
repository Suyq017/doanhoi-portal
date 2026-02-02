// PaymentCampaignsPage - Admin Page
// Refactored with custom hooks and shared components

import { useTranslation } from 'react-i18next';
import { Plus } from "lucide-react";
import PaymentCampaignList from "../../components/admin/PaymentCampaignList";
import PaymentCampaignForm from "../../components/admin/PaymentCampaignForm";
import UserPermissionInfo from "../../components/admin/UserPermissionInfo";
import { PermissionGuard } from "@/shared/components/PermissionGuard";
import { usePaymentCampaignsPage } from '../../hooks';
import {
  PageHeader,
  LoadingState,
  ErrorState,
  ToastContainer,
  ModalWrapper
} from '../../components/shared';

export const PaymentCampaignsPage = () => {
  const { t } = useTranslation('paymentCampaigns');

  const {
    // State
    showCreateModal,
    showEditModal,
    editingCampaign,
    accessibleOrganizations,
    pageLoading,
    orgsError,

    // Actions
    handleCreateCampaign,
    handleEditCampaign,
    handleCloseModals,
    handleCampaignSaved,

    // Toast
    toasts,
    showSuccess,
    hideToast
  } = usePaymentCampaignsPage();

  // Loading state
  if (pageLoading) {
    return (
      <LoadingState
        title={t('pageTitle')}
        subtitle={t('pageDescription')}
      />
    );
  }

  // Error state
  if (orgsError) {
    return (
      <ErrorState
        title={t('pageTitle')}
        subtitle={t('pageDescription')}
        error={orgsError.message}
      />
    );
  }

  // Create button component
  const CreateButton = (
    <PermissionGuard permission="payment-campaigns.create">
      <button
        onClick={handleCreateCampaign}
        className="flex items-center gap-2 px-4 py-2 text-white transition-colors rounded-md bg-doan-500 hover:bg-doan-600 dark:bg-doan-600 dark:hover:bg-doan-700"
      >
        <Plus className="w-4 h-4" />
        {t('createNew')}
      </button>
    </PermissionGuard>
  );

  return (
    <>
      <div className="space-y-6">
        {/* User Permission Info */}
        <UserPermissionInfo />

        {/* Header */}
        <PageHeader
          title={t('pageTitle')}
          subtitle={t('pageDescription')}
          action={CreateButton}
        />

        {/* Payment Campaign List Component */}
        <PaymentCampaignList
          organizations={accessibleOrganizations}
          onEditCampaign={handleEditCampaign}
        />
      </div>

      {/* Create Campaign Modal */}
      <PermissionGuard permission="payment-campaigns.create">
        <ModalWrapper isOpen={showCreateModal} onClose={handleCloseModals}>
          <PaymentCampaignForm
            mode="create"
            onSave={handleCampaignSaved}
            onCancel={handleCloseModals}
            accessibleOrganizations={accessibleOrganizations}
            onShowSuccess={showSuccess}
          />
        </ModalWrapper>
      </PermissionGuard>

      {/* Edit Campaign Modal */}
      <PermissionGuard permission="payment-campaigns.update">
        <ModalWrapper isOpen={showEditModal && !!editingCampaign} onClose={handleCloseModals}>
          {editingCampaign && (
            <PaymentCampaignForm
              campaign={editingCampaign}
              mode="edit"
              onSave={handleCampaignSaved}
              onCancel={handleCloseModals}
              accessibleOrganizations={accessibleOrganizations}
              onShowSuccess={showSuccess}
            />
          )}
        </ModalWrapper>
      </PermissionGuard>

      {/* Toast Container */}
      <ToastContainer toasts={toasts} onHide={hideToast} />
    </>
  );
};

export default PaymentCampaignsPage;
