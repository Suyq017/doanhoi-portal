import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { PaymentCampaign } from '../../../types';
import MemberSelector from '../assignment/MemberSelector';
import AssignmentBulkForm from '../assignment/AssignmentBulkForm';
import AssignmentList from '../assignment/AssignmentList';
import { paymentAssignmentService, paymentFeeLevelService } from '@/shared/services/fee-collection-service';
import { useToast } from '@/shared/hooks/useToast';
import { Toast } from '@/shared/components';
import { ExportModal, useExport, ASSIGNMENT_EXPORT_FIELDS } from '@/shared/components/export';

interface MemberAssignmentTabProps {
  campaign: PaymentCampaign;
  onAssignmentsChange?: () => void; // Callback to notify parent when assignments change
}

const MemberAssignmentTab: React.FC<MemberAssignmentTabProps> = ({ campaign, onAssignmentsChange }) => {
  const { t } = useTranslation('memberAssignments');
  const [assignments, setAssignments] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [showBulkCreate, setShowBulkCreate] = useState(false);
  const [selectedMemberIds, setSelectedMemberIds] = useState<string[]>([]);
  const [feeLevels, setFeeLevels] = useState<any[]>([]);
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const { toasts, showSuccess, showError, hideToast } = useToast();

  // Export functionality
  const { exportData } = useExport({
    campaignId: campaign.id,
    campaignName: campaign.name,
    onSuccess: (fileName) => {
      showSuccess(t('export.success', { fileName }));
      setIsExportModalOpen(false);
    },
    onError: (error) => {
      showError(t('export.error', { error }));
    },
  });

  // Check if campaign is in read-only state
  const readOnly = campaign.status === 'COMPLETED' || campaign.status === 'CANCELLED';

  // Fetch assignments and fee levels
  useEffect(() => {
    fetchAssignments();
    fetchFeeLevels();
  }, [campaign.id]);

  const fetchAssignments = async () => {
    setLoading(true);
    try {
      const response: any = await paymentAssignmentService.getAssignmentsByCampaign(campaign.id);
      // Backend returns { success: true, data: [...] } or { data: [...] }
      const assignments = response.data?.assignments || [];
      setAssignments(Array.isArray(assignments) ? assignments : []);
    } catch (error) {
      console.error('Error fetching assignments:', error);
      setAssignments([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchFeeLevels = async () => {
    try {
      const response: any = await paymentFeeLevelService.getFeeLevelsByCampaign(campaign.id);
      setFeeLevels(response || []);
    } catch (error) {
      console.error('Error fetching fee levels:', error);
      setFeeLevels([]);
    }
  };

  const handleBulkCreate = () => {
    setShowBulkCreate(true);
  };

  const handleExport = async (fields: string[]) => {
    await exportData(fields, 'assignments');
  };

  const handleOpenExportModal = () => {
    setIsExportModalOpen(true);
  };

  const handleMemberSelect = (memberIds: string[]) => {
    setSelectedMemberIds(memberIds);
  };

  const handleBulkCreateSubmit = async (formData: any) => {
    try {
      // Get user data from localStorage
      const userData = localStorage.getItem('user');
      if (!userData) {
        throw new Error('User not authenticated');
      }
      const user = JSON.parse(userData);
      if (!user?.id) {
        throw new Error('User ID not found');
      }

      // Create array of assignment DTOs for backend
      const assignments = selectedMemberIds.map(userId => ({
        campaignId: campaign.id,
        userId: userId,
        feeLevelId: formData.feeLevelId,
        notes: formData.notes,
        dueDate: formData.dueDate,
      }));

      console.log('Creating assignments with user ID:', user.id);
      console.log('Assignments data:', assignments);

      // Call the bulk create API with assignments array and userId
      const response = await paymentAssignmentService.createMultipleAssignments(assignments, user.id);

      // Handle response
      const newAssignments = (response as any).data || response || [];
      setAssignments(prev => [...prev, ...newAssignments]);
      setShowBulkCreate(false);
      setSelectedMemberIds([]);

      // Show success toast
      showSuccess(t('bulkAssignment.success', { count: selectedMemberIds.length }));

      // Refresh data and notify parent
      await fetchAssignments();
      if (onAssignmentsChange) {
        onAssignmentsChange();
      }
    } catch (error) {
      console.error('Error creating bulk assignments:', error);
      showError(t('bulkAssignment.error'));
    }
  };

  const handleAssignmentDelete = async (assignmentId: string) => {
    try {
      await paymentAssignmentService.deleteAssignment(assignmentId);
      setAssignments(prev => prev.filter(assignment => assignment.id !== assignmentId));
      showSuccess(t('deleteAssignment.success'));

      // Notify parent about changes
      if (onAssignmentsChange) {
        onAssignmentsChange();
      }
    } catch (error) {
      console.error('Error deleting assignment:', error);
      showError(t('deleteAssignment.error'));
    }
  };

  const handleMarkAsPaid = async (assignmentId: string) => {
    try {
      // Update assignment status in local state
      setAssignments(prev => prev.map(assignment =>
        assignment.id === assignmentId
          ? { ...assignment, status: 'PAID', paidAt: new Date().toISOString() }
          : assignment
      ));

      // Notify parent about changes
      if (onAssignmentsChange) {
        onAssignmentsChange();
      }
    } catch (error) {
      console.error('Error marking assignment as paid:', error);
      // Revert the local state change on error
      fetchAssignments();
    }
  };

  return (
    <div>
      {/* Assignment List */}
      <AssignmentList
        campaign={campaign}
        assignments={assignments}
        loading={loading}
        onDeleteAssignment={readOnly ? undefined : handleAssignmentDelete}
        onMarkAsPaid={readOnly ? undefined : handleMarkAsPaid}
        onExportList={handleOpenExportModal}
        onBulkCreate={readOnly ? undefined : handleBulkCreate}
        campaignEndDate={campaign.endDate}
        feeLevelsCount={feeLevels.length}
        readOnly={readOnly}
      />

      {/* Bulk Create Modal */}
      {showBulkCreate && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-gray-600 bg-opacity-50 dark:bg-gray-900 dark:bg-opacity-75">
          <div className="relative w-11/12 max-w-6xl p-5 mx-auto bg-white border rounded-md shadow-lg top-20 dark:bg-gray-800 dark:border-gray-700">
            <div className="mt-3">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                  {t('title')}
                  {readOnly && (
                    <span className="ml-2 text-orange-600 dark:text-orange-400">
                      ({t('readOnlyMode')} {campaign.status === 'COMPLETED' ? t('completed') : t('cancelled')})
                    </span>
                  )}
                </h3>
                <button
                  onClick={() => {
                    setShowBulkCreate(false);
                    setSelectedMemberIds([]);
                  }}
                  className="text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300"
                >
                  <span className="sr-only">{t('memberAssignmentTab:close')}</span>
                  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                {/* Member Selection */}
                <div>
                  <h4 className="mb-3 font-medium text-gray-900 text-md dark:text-white">
                    {t('memberAssignmentTab:selectMembers')}
                  </h4>
                  <MemberSelector
                    organizationId={campaign.organizationId}
                    selectedMemberIds={selectedMemberIds}
                    onMemberSelectionChange={handleMemberSelect}
                  />
                </div>

                {/* Assignment Form */}
                <div>
                  <h4 className="mb-3 font-medium text-gray-900 text-md dark:text-white">
                    {t('memberAssignmentTab:setupFeeLevel')}
                  </h4>
                  <AssignmentBulkForm
                    campaignId={campaign.id}
                    selectedMemberIds={selectedMemberIds}
                    feeLevels={feeLevels}
                    campaignEndDate={campaign.endDate}
                    onSubmit={handleBulkCreateSubmit}
                    onCancel={() => {
                      setShowBulkCreate(false);
                      setSelectedMemberIds([]);
                    }}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Toast Container */}
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

      {/* Export Modal */}
      <ExportModal
        isOpen={isExportModalOpen}
        onClose={() => setIsExportModalOpen(false)}
        onExport={handleExport}
        title="Xuất danh sách phân công"
        description="Chọn các trường dữ liệu bạn muốn xuất ra file Excel"
        availableFields={ASSIGNMENT_EXPORT_FIELDS}
      />
    </div>
  );
};

export default MemberAssignmentTab;
