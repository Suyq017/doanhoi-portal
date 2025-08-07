import { useState, useEffect } from "react";
import { Plus, Shield } from "lucide-react";
import PaymentCampaignList from "../../components/admin/PaymentCampaignList";
import PaymentCampaignForm from "../../components/admin/PaymentCampaignForm";
import UserPermissionInfo from "../../components/admin/UserPermissionInfo";
import { Organization, PaymentCampaign } from "../../types";
import { usePermissions } from "@/shared/hooks/usePermissions";
import { PermissionGuard } from "@/shared/components/PermissionGuard";
import { paymentCampaignService } from "@/shared/services/fee-collection-service";

export const PaymentCampaignsPage = () => {
  const permissions = usePermissions();
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [accessibleOrganizations, setAccessibleOrganizations] = useState<Organization[]>([]);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingCampaign, setEditingCampaign] = useState<PaymentCampaign | null>(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  // Page-level access control
  if (!permissions.canAccessPaymentCampaigns()) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <Shield className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
            Không có quyền truy cập
          </h3>
          <p className="text-gray-500 dark:text-gray-400">
            Bạn không có quyền truy cập trang quản lý đóng phí.
          </p>
        </div>
      </div>
    );
  } useEffect(() => {
    const loadAccessibleOrganizations = async () => {
      // Prevent loading if already loaded
      if (accessibleOrganizations.length > 0) return;

      try {
        // Only load if we have permissions
        if (permissions.canAccessPaymentCampaigns()) {
          const orgs = await paymentCampaignService.getAccessibleOrganizations();
          // Filter and validate organizations
          const validOrgs = orgs.filter(org => org && org.id && org.name);
          setAccessibleOrganizations(validOrgs);
          setOrganizations(validOrgs); // Also set organizations for backward compatibility
        }
      } catch (error) {
        console.error('Failed to load accessible organizations:', error);        // Fallback to permissions-based organizations only if we haven't tried before
        if (accessibleOrganizations.length === 0) {
          const fallbackOrgs = permissions.getAccessibleOrganizations();
          // Type assertion since we know the structure but getAccessibleOrganizations returns empty array  
          const validFallbackOrgs = (fallbackOrgs as Organization[]).filter(org => org && org.id && org.name);
          setAccessibleOrganizations(validFallbackOrgs);
          setOrganizations(validFallbackOrgs);
        }
      }
    };

    // Only call if permissions are loaded, we can access payment campaigns, and haven't loaded orgs yet
    if (!permissions.permissionsLoading && permissions.canAccessPaymentCampaigns() && accessibleOrganizations.length === 0) {
      loadAccessibleOrganizations();
    }
  }, [permissions.permissionsLoading, accessibleOrganizations.length]); // More stable dependencies

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
  return (
    <>
      <div className="space-y-6">
        {/* User Permission Info */}
        <UserPermissionInfo />

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
              Quản Lý Thu Phí
            </h1>
            <p className="mt-2 text-gray-600 dark:text-gray-400">
              Quản lý các đợt thu phí của hội
            </p>
          </div>          {/* Create Button - Only show if user has permission */}
          <PermissionGuard permission="payment-campaigns.create">
            <div className="mt-4 sm:mt-0">
              <button
                onClick={handleCreateCampaign}
                className="flex items-center gap-2 px-4 py-2 text-white transition-colors rounded-md bg-doan-500 hover:bg-doan-600 dark:bg-doan-600 dark:hover:bg-doan-700"
              >
                <Plus className="w-4 h-4" />
                Tạo Đợt Mới
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
      </div>      {/* Create Campaign Modal - Permission guarded */}
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
