import React, { useState, useEffect } from 'react';
import { PaymentCampaign } from '../../../types';
import MemberSelector from '../assignment/MemberSelector';
import AssignmentBulkForm from '../assignment/AssignmentBulkForm';
import AssignmentList from '../assignment/AssignmentList';
import { paymentAssignmentService, paymentFeeLevelService } from '@/shared/services/fee-collection-service';

interface MemberAssignmentTabProps {
  campaign: PaymentCampaign;
}

const MemberAssignmentTab: React.FC<MemberAssignmentTabProps> = ({ campaign }) => {
  const [assignments, setAssignments] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [showBulkCreate, setShowBulkCreate] = useState(false);
  const [selectedMemberIds, setSelectedMemberIds] = useState<string[]>([]);
  const [feeLevels, setFeeLevels] = useState<any[]>([]);

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
      const response : any = await paymentAssignmentService.getAssignmentsByCampaign(campaign.id);
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
      const response : any = await paymentFeeLevelService.getFeeLevelsByCampaign(campaign.id);
      setFeeLevels(response || []);
    } catch (error) {
      console.error('Error fetching fee levels:', error);
      setFeeLevels([]);
    }
  };

  const handleBulkCreate = () => {
    setShowBulkCreate(true);
  };

  const handleExport = async () => {
    try {
      // Create export data structure
      const exportData = {
        campaign: campaign.name,
        assignments: assignments
      };
      
      // TODO: Implement actual Excel export
      console.log('Export data:', exportData);
      
      // For now, create a JSON download
      const dataStr = JSON.stringify(exportData, null, 2);
      const dataBlob = new Blob([dataStr], { type: 'application/json' });
      const url = URL.createObjectURL(dataBlob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `assignment-report-${campaign.name}-${new Date().toISOString().split('T')[0]}.json`;
      link.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error exporting assignments:', error);
      // TODO: Show error message to user
    }
  };

  const handleMemberSelect = (memberIds: string[]) => {
    setSelectedMemberIds(memberIds);
  };

  const handleBulkCreateSubmit = async (formData: any) => {
    try {
      // Create array of assignment DTOs for backend
      const assignments = selectedMemberIds.map(userId => ({
        campaignId: campaign.id,
        userId: userId,
        feeLevelId: formData.feeLevelId,
        amount: formData.customAmount,
        notes: formData.notes || 'Assignment hàng loạt',
        dueDate: formData.dueDate,
      }));

      const response = await paymentAssignmentService.createMultipleAssignments(assignments);
      
      // Add new assignments to the list
      const newAssignments = (response as any).data || response || [];
      setAssignments(prev => [...prev, ...newAssignments]);
      setShowBulkCreate(false);
      setSelectedMemberIds([]);
      
      // Refresh data
      await fetchAssignments();
    } catch (error) {
      console.error('Error creating bulk assignments:', error);
      // TODO: Show error message to user
    }
  };

  const handleAssignmentDelete = async (assignmentId: string) => {
    try {
      await paymentAssignmentService.deleteAssignment(assignmentId);
      setAssignments(prev => prev.filter(assignment => assignment.id !== assignmentId));
    } catch (error) {
      console.error('Error deleting assignment:', error);
      // TODO: Show error message to user
    }
  };

  return (
    <div className="space-y-6">
      {/* Assignment List */}
      <AssignmentList
        campaign={campaign}
        assignments={assignments}
        loading={loading}
        onDeleteAssignment={readOnly ? undefined : handleAssignmentDelete}
        onExportList={handleExport}
        onBulkCreate={readOnly ? undefined : handleBulkCreate}
        campaignEndDate={campaign.endDate}
        feeLevelsCount={feeLevels.length}
        readOnly={readOnly}
      />

      {/* Bulk Create Modal */}
      {showBulkCreate && (
        <div className="fixed inset-0 z-50 w-full h-full overflow-y-auto bg-gray-600 bg-opacity-50 dark:bg-gray-900 dark:bg-opacity-75">
          <div className="relative w-11/12 max-w-6xl p-5 mx-auto bg-white border rounded-md shadow-lg top-20 dark:bg-gray-800 dark:border-gray-700">
            <div className="mt-3">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                  Phân Công Thành Viên Đóng Phí
                  {readOnly && (
                    <span className="ml-2 text-orange-600 dark:text-orange-400">
                      (Chỉ xem - đợt đã {campaign.status === 'COMPLETED' ? 'hoàn thành' : 'hủy'})
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
                  <span className="sr-only">Đóng</span>
                  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                {/* Member Selection */}
                <div>
                  <h4 className="mb-3 font-medium text-gray-900 text-md dark:text-white">
                    Chọn Thành Viên
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
                    Thiết Lập Mức Phí
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
    </div>
  );
};

export default MemberAssignmentTab;
