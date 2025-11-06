import { useState } from "react";
import { useTranslation } from 'react-i18next';
import { Plus } from "lucide-react";
import PaymentCampaignList from "../../components/admin/PaymentCampaignList";
import PaymentCampaignForm from "../../components/admin/PaymentCampaignForm";
import UserPermissionInfo from "../../components/admin/UserPermissionInfo";
import { Organization, PaymentCampaign } from "../../types";
import { PermissionGuard } from "@/shared/components/PermissionGuard";
import { useAccessibleOrganizations } from "@/shared/hooks/queries";
import { useToast } from '@/shared/hooks/useToast';
import { Toast } from '@/shared/components';

export const PaymentCampaignsPage = () => {
  const { t } = useTranslation('paymentCampaigns');

  // ✅ Use TanStack Query for accessible organizations
  const {
    data: rawAccessibleOrganizations = [],
    isLoading: pageLoading,
    error: orgsError
  } = useAccessibleOrganizations();

  // Map from service Organization type to fee-collection Organization type
  const accessibleOrganizations: Organization[] = (rawAccessibleOrganizations || []).map(org => ({
    id: org.id,
    name: org.name,
    code: org.code || '',
    type: org.type || '',
    parentId: org.parentId,
    level: 1,
    path: org.name,
    isActive: true,
    createdAt: org.createdAt || new Date().toISOString(),
    updatedAt: org.updatedAt || new Date().toISOString()
  }));

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingCampaign, setEditingCampaign] = useState<PaymentCampaign | null>(null);
  
  // ✅ Toast hook for success messages
  const { toasts, showSuccess, hideToast } = useToast();
  // ✅ Remove refreshTrigger - cache automatically updates via mutations

  const handleCreateCampaign = () => {
    setShowCreateModal(true);
  };

  const handleEditCampaign = (campaign: PaymentCampaign) => {
    setEditingCampaign(campaign);
    setShowEditModal(true);
  };

  const handleCloseModals = () => {
    setShowCreateModal(false);
    setShowEditModal(false);
    setEditingCampaign(null);
  };

  const handleCampaignSaved = () => {
    // ✅ Cache will be automatically invalidated by mutations
    // No need for manual refetch trigger
    handleCloseModals();
  };

  if (pageLoading) {
    return (
      <div className="">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
              {t('pageTitle')}
            </h1>
            <p className="mt-2 text-gray-600 dark:text-gray-400">
              {t('pageDescription')}
            </p>
          </div>
        </div>
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <div className="w-12 h-12 mx-auto border-b-2 rounded-full animate-spin border-doan-600"></div>
            <p className="mt-4 text-gray-600 dark:text-gray-400">
              {t('loading')}
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Show error if organizations failed to load
  if (orgsError) {
    return (
      <div className="">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
              {t('pageTitle')}
            </h1>
            <p className="mt-2 text-gray-600 dark:text-gray-400">
              {t('pageDescription')}
            </p>
          </div>
        </div>
        <div className="px-4 py-3 mt-6 text-red-700 border border-red-200 rounded bg-red-50 dark:bg-red-900 dark:border-red-800 dark:text-red-200">
          {t('loadingDescription')}
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="space-y-6">
        {/* User Permission Info */}
        <UserPermissionInfo />

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
              {t('pageTitle')}
            </h1>
            <p className="mt-2 text-gray-600 dark:text-gray-400">
              {t('pageDescription')}
            </p>
          </div>
          {/* Create Button - Only show if user has permission */}
          <PermissionGuard permission="payment-campaigns.create">
            <div className="mt-4 sm:mt-0">
              <button
                onClick={handleCreateCampaign}
                className="flex items-center gap-2 px-4 py-2 text-white transition-colors rounded-md bg-doan-500 hover:bg-doan-600 dark:bg-doan-600 dark:hover:bg-doan-700"
              >
                <Plus className="w-4 h-4" />
                {t('createNew')}
              </button>
            </div>
          </PermissionGuard>
        </div>

        {/* Payment Campaign List Component */}
        <PaymentCampaignList
          organizations={accessibleOrganizations}
          onEditCampaign={handleEditCampaign}
        />
      </div>
      {/* Create Campaign Modal - Permission guarded */}
      <PermissionGuard permission="payment-campaigns.create">
        {showCreateModal && (
          <div className="fixed inset-0 z-50 overflow-y-auto">
            <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
              <div className="fixed inset-0 bg-black bg-opacity-50" aria-hidden="true" onClick={handleCloseModals}></div>

              <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>

              <div className="inline-block w-full max-w-4xl p-6 my-8 overflow-hidden text-left align-middle transition-all transform bg-white border border-gray-300 rounded-lg shadow-xl dark:bg-gray-800 dark:border-gray-600">                <PaymentCampaignForm
                mode="create"
                onSave={handleCampaignSaved}
                onCancel={handleCloseModals}
                accessibleOrganizations={accessibleOrganizations}
                onShowSuccess={showSuccess}
              />
              </div>
            </div>
          </div>
        )}
      </PermissionGuard>

      {/* Edit Campaign Modal - Permission guarded */}
      <PermissionGuard permission="payment-campaigns.update">
        {showEditModal && editingCampaign && (
          <div className="fixed inset-0 z-50 overflow-y-auto">
            <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
              <div className="fixed inset-0 bg-black bg-opacity-50" aria-hidden="true" onClick={handleCloseModals}></div>

              <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>

              <div className="inline-block w-full max-w-4xl p-6 my-8 overflow-hidden text-left align-middle transition-all transform bg-white border border-gray-300 rounded-lg shadow-xl dark:bg-gray-800 dark:border-gray-600">                <PaymentCampaignForm
                campaign={editingCampaign}
                mode="edit"
                onSave={handleCampaignSaved}
                onCancel={handleCloseModals}
                accessibleOrganizations={accessibleOrganizations}
                onShowSuccess={showSuccess}
              />
              </div>
            </div>
          </div>
        )}
      </PermissionGuard>

      {/* Toast Container - Outside modal for proper z-index */}
      <div className="fixed top-4 right-4 z-[9999] space-y-2">
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
    </>
  );
};

export default PaymentCampaignsPage;
