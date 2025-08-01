import React, { useState, useEffect } from 'react';
import { Plus, Download } from 'lucide-react';
import { PaymentCampaign } from '../../../types';
import AssignmentStatistics from '../assignment/AssignmentStatistics';
import MemberSelector from '../assignment/MemberSelector';
import AssignmentBulkForm from '../assignment/AssignmentBulkForm';
import AssignmentList from '../assignment/AssignmentList';
import { paymentAssignmentService } from '@/features/fee-collection/services/paymentAssignmentService';
import { paymentFeeLevelService } from '@/features/fee-collection/services/paymentFeeLevelService';

interface MemberAssignmentTabProps {
  campaign: PaymentCampaign;
}

interface AssignmentStats {
  totalAssignments: number;
  pendingCount: number;
  paidCount: number;
  overdueCount: number;
  exemptedCount: number;
  totalPaidAmount: number;
  totalAmount: number;
  averageAmount: number;
  paymentRate: number;
}

const MemberAssignmentTab: React.FC<MemberAssignmentTabProps> = ({ campaign }) => {
  const [assignments, setAssignments] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [showBulkCreate, setShowBulkCreate] = useState(false);
  const [selectedMemberIds, setSelectedMemberIds] = useState<string[]>([]);
  const [feeLevels, setFeeLevels] = useState<any[]>([]);
  const [stats, setStats] = useState<AssignmentStats>({
    totalAssignments: 0,
    pendingCount: 0,
    paidCount: 0,
    overdueCount: 0,
    exemptedCount: 0,
    totalPaidAmount: 0,
    totalAmount: 0,
    averageAmount: 0,
    paymentRate: 0
  });

  // Fetch assignments and fee levels
  useEffect(() => {
    fetchAssignments();
    fetchFeeLevels();
    fetchStatistics();
  }, [campaign.id]);

  const fetchStatistics = async () => {
    try {
      const response = await paymentAssignmentService.getCampaignStatistics(campaign.id);
      // Backend returns { success: true, data: {...} }
      const statsData = (response as any).data || response;
      if (statsData) {
        setStats({
          totalAssignments: statsData.totalAssignments || 0,
          pendingCount: statsData.totalPending || 0,
          paidCount: statsData.totalPaid || 0,
          overdueCount: statsData.totalOverdue || 0,
          exemptedCount: statsData.totalExempted || 0,
          totalPaidAmount: statsData.paidAmount || 0,
          totalAmount: statsData.totalAmount || 0,
          averageAmount: statsData.totalAssignments > 0 ? 
            statsData.totalAmount / statsData.totalAssignments : 0,
          paymentRate: statsData.paymentRate || 0
        });
      }
    } catch (error) {
      console.error('Error fetching statistics:', error);
      // Fall back to calculating from local data
      calculateStats();
    }
  };

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

  const calculateStats = () => {
    // Calculate stats from assignments
    const totalAssignments = assignments.length;
    const pendingCount = assignments.filter(a => a.status === 'PENDING').length;
    const paidCount = assignments.filter(a => a.status === 'PAID').length;
    const overdueCount = assignments.filter(a => a.status === 'OVERDUE').length;
    const exemptedCount = assignments.filter(a => a.status === 'EXEMPTED').length;
    
    const totalPaidAmount = assignments
      .filter(a => a.status === 'PAID')
      .reduce((sum, a) => sum + a.amount, 0);
    
    const totalAmount = assignments.reduce((sum, a) => sum + a.amount, 0);
    const averageAmount = totalAssignments > 0 ? totalAmount / totalAssignments : 0;
    const paymentRate = totalAssignments > 0 ? (paidCount / totalAssignments) * 100 : 0;

    setStats({
      totalAssignments,
      pendingCount,
      paidCount,
      overdueCount,
      exemptedCount,
      totalPaidAmount,
      totalAmount,
      averageAmount,
      paymentRate
    });
  };

  // Recalculate stats when assignments change
  useEffect(() => {
    calculateStats();
  }, [assignments]);

  const handleBulkCreate = () => {
    setShowBulkCreate(true);
  };

  const handleExport = async () => {
    try {
      // Get assignment statistics and export data
      const statsResponse = await paymentAssignmentService.getCampaignStatistics(campaign.id);
      
      // Create export data structure
      const exportData = {
        campaign: campaign.name,
        statistics: (statsResponse as any).data || statsResponse,
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
        amount: formData.customAmount, // Changed from customAmount to amount
        notes: formData.notes || 'Assignment hàng loạt' // Changed from note to notes
      }));

      console.log('Sending bulk assignments:', assignments); // Debug log

      const response = await paymentAssignmentService.createMultipleAssignments(assignments);
      
      console.log('Bulk assignment response:', response); // Debug log
      
      // Add new assignments to the list
      const newAssignments = (response as any).data || response || [];
      setAssignments(prev => [...prev, ...newAssignments]);
      setShowBulkCreate(false);
      setSelectedMemberIds([]);
      
      // Refresh data and statistics
      await Promise.all([
        fetchAssignments(),
        fetchStatistics()
      ]);
    } catch (error) {
      console.error('Error creating bulk assignments:', error);
      // TODO: Show error message to user
    }
  };

  const handleAssignmentEdit = (assignment: any) => {
    // Handle editing logic - could open a modal for editing
    console.log('Edit assignment:', assignment);
  };

  const handleAssignmentDelete = async (assignmentId: string) => {
    try {
      await paymentAssignmentService.deleteAssignment(assignmentId);
      setAssignments(prev => prev.filter(assignment => assignment.id !== assignmentId));
      
      // Refresh statistics after deletion
      fetchStatistics();
    } catch (error) {
      console.error('Error deleting assignment:', error);
      // TODO: Show error message to user
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-medium text-gray-900">
            Phân Công Thu Phí Thành Viên
          </h3>
          <p className="mt-1 text-sm text-gray-600">
            Quản lý việc phân công thu phí cho từng thành viên trong tổ chức "{campaign.organization?.name || campaign.organizationId}"
          </p>
        </div>
        <div className="flex space-x-3">
          <button
            onClick={handleExport}
            disabled={loading || assignments.length === 0}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Download className="inline w-4 h-4 mr-2" />
            Xuất File
          </button>
          <button
            onClick={handleBulkCreate}
            disabled={loading || feeLevels.length === 0}
            className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Plus className="inline w-4 h-4 mr-2" />
            Tạo Assignment Hàng Loạt
          </button>
        </div>
      </div>

      {/* Fee Levels Status */}
      {feeLevels.length === 0 && !loading && (
        <div className="p-4 border border-yellow-200 rounded-md bg-yellow-50">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="w-5 h-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-yellow-800">
                Chưa có mức phí nào được thiết lập
              </h3>
              <p className="mt-1 text-sm text-yellow-700">
                Vui lòng thiết lập ít nhất một mức phí ở tab "Mức Phí" trước khi tạo assignment.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Statistics */}
      <AssignmentStatistics
        campaignId={campaign.id}
        stats={stats}
        campaignEndDate={campaign.endDate}
        loading={loading}
      />

      {/* Assignment List */}
      <AssignmentList
        assignments={assignments}
        loading={loading}
        onEditAssignment={handleAssignmentEdit}
        onDeleteAssignment={handleAssignmentDelete}
        onExportList={handleExport}
        campaignEndDate={campaign.endDate}
      />

      {/* Bulk Create Modal */}
      {showBulkCreate && (
        <div className="fixed inset-0 z-50 w-full h-full overflow-y-auto bg-gray-600 bg-opacity-50">
          <div className="relative w-11/12 max-w-6xl p-5 mx-auto bg-white border rounded-md shadow-lg top-20">
            <div className="mt-3">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-medium text-gray-900">
                  Tạo Assignment Hàng Loạt
                </h3>
                <button
                  onClick={() => {
                    setShowBulkCreate(false);
                    setSelectedMemberIds([]);
                  }}
                  className="text-gray-400 hover:text-gray-600"
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
                  <h4 className="mb-3 font-medium text-gray-900 text-md">
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
                  <h4 className="mb-3 font-medium text-gray-900 text-md">
                    Thiết Lập Assignment
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
