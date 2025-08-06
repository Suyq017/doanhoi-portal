import { useState, useEffect } from "react";
import { Plus } from "lucide-react";
import PaymentCampaignList from "../../components/admin/PaymentCampaignList";
import PaymentCampaignForm from "../../components/admin/PaymentCampaignForm";
import { Organization, PaymentCampaign } from "../../types";

export const PaymentCampaignsPage = () => {
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingCampaign, setEditingCampaign] = useState<PaymentCampaign | null>(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  useEffect(() => {
    // Load organizations if needed
    // For now, using empty array
    setOrganizations([]);
  }, []);

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
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
              Quản Lý Thu Phí
            </h1>
            <p className="mt-2 text-gray-600 dark:text-gray-400">
              Quản lý các đợt thu phí của hội
            </p>
          </div>
          <div className="mt-4 sm:mt-0">
            <button
              onClick={handleCreateCampaign}
              className="flex items-center gap-2 px-4 py-2 text-white transition-colors rounded-md bg-doan-500 hover:bg-doan-600 dark:bg-doan-600 dark:hover:bg-doan-700"
            >
              <Plus className="w-4 h-4" />
              Tạo Đợt Mới
            </button>
          </div>
        </div>

        {/* Payment Campaign List Component */}
        <PaymentCampaignList 
          organizations={organizations} 
          onEditCampaign={handleEditCampaign}
          refreshTrigger={refreshTrigger}
        />
      </div>

      {/* Create Campaign Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 transition-opacity bg-gray-500 bg-opacity-75" aria-hidden="true" onClick={handleCloseModals}></div>
            
            <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>
            
            <div className="inline-block w-full max-w-4xl p-6 my-8 overflow-hidden text-left align-middle transition-all transform bg-white border border-gray-300 rounded-lg shadow-xl dark:bg-gray-800 dark:border-gray-600">
              <PaymentCampaignForm 
                mode="create"
                onSave={handleCampaignSaved}
                onCancel={handleCloseModals}
              />
            </div>
          </div>
        </div>
      )}

      {/* Edit Campaign Modal */}
      {showEditModal && editingCampaign && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 transition-opacity bg-gray-500 bg-opacity-75" aria-hidden="true" onClick={handleCloseModals}></div>
            
            <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>
            
            <div className="inline-block w-full max-w-4xl p-6 my-8 overflow-hidden text-left align-middle transition-all transform bg-white border border-gray-300 rounded-lg shadow-xl dark:bg-gray-800 dark:border-gray-600">
              <PaymentCampaignForm 
                campaign={editingCampaign}
                mode="edit"
                onSave={handleCampaignSaved}
                onCancel={handleCloseModals}
              />
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default PaymentCampaignsPage;
