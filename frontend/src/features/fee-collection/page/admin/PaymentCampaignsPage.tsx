import { useState, useEffect } from "react";
import { useTranslation } from 'react-i18next';
import { Plus } from "lucide-react";
import PaymentCampaignList from "../../components/admin/PaymentCampaignList";
import PaymentCampaignForm from "../../components/admin/PaymentCampaignForm";
import UserPermissionInfo from "../../components/admin/UserPermissionInfo";
import { Organization, PaymentCampaign } from "../../types";
import { PermissionGuard } from "@/shared/components/PermissionGuard";
import { organizationService } from "@/shared/services/organizationService";

export const PaymentCampaignsPage = () => {
  const { t } = useTranslation('paymentCampaigns'); const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [accessibleOrganizations, setAccessibleOrganizations] = useState<Organization[]>([]);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingCampaign, setEditingCampaign] = useState<PaymentCampaign | null>(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [pageLoading, setPageLoading] = useState(true);
  useEffect(() => {
    const initializePage = async () => {
      setPageLoading(true);
      await loadAccessibleOrganizations();
      setPageLoading(false);
    };

    initializePage();
  }, []);
  const loadAccessibleOrganizations = async () => {
    try {
      // Use getAccessibleOrganizations to only get organizations user has payment-campaigns.create permission for
      const orgs = await organizationService.getAccessibleOrganizations();

      // Map from shared Organization type to fee-collection Organization type
      const mappedOrgs: Organization[] = (orgs || []).map(org => ({
        id: org.id,
        name: org.name,
        code: org.code || '',
        type: org.type || '',
        parentId: org.parentId,
        level: 1, // Default level if not provided
        path: org.name, // Use name as path if no path available
        isActive: true, // Default to true if not provided
        createdAt: org.createdAt || new Date().toISOString(),
        updatedAt: org.updatedAt || new Date().toISOString()
      }));

      setOrganizations(mappedOrgs);
      setAccessibleOrganizations(mappedOrgs);
    } catch (error) {
      console.error('[PaymentCampaignsPage] Error loading organizations with create permission:', error);

      // If the accessible organizations endpoint fails (e.g., user not authenticated or no permissions),
      // fall back to loading all organizations as a safety measure
      try {
        const allOrgs = await organizationService.getOrganizations();
        const mappedAllOrgs: Organization[] = (allOrgs || []).map(org => ({
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
        setOrganizations(mappedAllOrgs);
        setAccessibleOrganizations(mappedAllOrgs);
      } catch (fallbackError) {
        console.error('[PaymentCampaignsPage] Fallback also failed:', fallbackError);
        setOrganizations([]);
        setAccessibleOrganizations([]);
      }
    }
  };

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
    setRefreshTrigger(prev => prev + 1);
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
          </div>          {/* Create Button - Only show if user has permission */}
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
          organizations={organizations}
          onEditCampaign={handleEditCampaign}
          refreshTrigger={refreshTrigger}
        />
      </div>
      {/* Create Campaign Modal - Permission guarded */}
      <PermissionGuard permission="payment-campaigns.create">
        {showCreateModal && (
          <div className="fixed inset-0 z-50 overflow-y-auto">
            <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
              <div className="fixed inset-0 transition-opacity bg-gray-500 bg-opacity-75" aria-hidden="true" onClick={handleCloseModals}></div>

              <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>

              <div className="inline-block w-full max-w-4xl p-6 my-8 overflow-hidden text-left align-middle transition-all transform bg-white border border-gray-300 rounded-lg shadow-xl dark:bg-gray-800 dark:border-gray-600">                <PaymentCampaignForm
                mode="create"
                onSave={handleCampaignSaved}
                onCancel={handleCloseModals}
                accessibleOrganizations={accessibleOrganizations}
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
              <div className="fixed inset-0 transition-opacity bg-gray-500 bg-opacity-75" aria-hidden="true" onClick={handleCloseModals}></div>

              <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>

              <div className="inline-block w-full max-w-4xl p-6 my-8 overflow-hidden text-left align-middle transition-all transform bg-white border border-gray-300 rounded-lg shadow-xl dark:bg-gray-800 dark:border-gray-600">                <PaymentCampaignForm
                campaign={editingCampaign}
                mode="edit"
                onSave={handleCampaignSaved}
                onCancel={handleCloseModals}
                accessibleOrganizations={accessibleOrganizations}
              />
              </div>
            </div>
          </div>
        )}
      </PermissionGuard>
    </>
  );
};

export default PaymentCampaignsPage;
