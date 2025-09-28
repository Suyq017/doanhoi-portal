import React, { useState } from 'react';
import { Plus } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { CtxhActivity } from '../types';
import { activityService } from '../services';
import ActivityForm from '../components/ActivityForm';
import ActivityList from '../components/activity/ActivityList';
import { useToast } from '../../../shared/hooks';
import { Toast, ConfirmDialog } from '../../../shared/components';

const ActivityManagement: React.FC = () => {
  // ActivityManagement component
  const navigate = useNavigate();
  const [showActivityForm, setShowActivityForm] = useState(false);
  const [editingActivity, setEditingActivity] = useState<CtxhActivity | null>(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  // Toast notifications
  const { toasts, hideToast, showSuccess, showError, confirmDialog, showConfirm } = useToast();

  const handleCreateActivity = () => {
    setEditingActivity(null);
    setShowActivityForm(true);
  };

  const handleEditActivity = (activity: CtxhActivity) => {
    setEditingActivity(activity);
    setShowActivityForm(true);
  };

  const handleDeleteActivity = async (activity: CtxhActivity) => {
    // Deleting activity
    
    const confirmed = await showConfirm(
      'Xác nhận xóa',
      `Bạn có chắc chắn muốn xóa hoạt động "${activity.name}" không?`,
      {
        confirmText: 'Xóa',
        cancelText: 'Hủy',
        variant: 'danger'
      }
    );

    if (!confirmed) return;

    try {
      await activityService.delete(activity.id);
      setRefreshTrigger(prev => prev + 1);
      showSuccess('Đã xóa hoạt động thành công!');
    } catch (error) {
      console.error('Failed to delete activity:', error);
      showError('Có lỗi xảy ra khi xóa hoạt động!');
    }
  };

  const handleViewActivity = (activity: CtxhActivity) => {
    navigate(`/ctxh/activities/${activity.id}`);
  };

  const handleActivitySaved = () => {
    setShowActivityForm(false);
    setEditingActivity(null);
    setRefreshTrigger(prev => prev + 1);
    showSuccess(editingActivity ? 'Đã cập nhật hoạt động thành công!' : 'Đã tạo hoạt động mới thành công!');
  };

  const handleActivitySubmit = async (data: any) => {
    try {
      if (editingActivity) {
        await activityService.update(editingActivity.id, data);
      } else {
        await activityService.create(data);
      }
      handleActivitySaved();
    } catch (error) {
      console.error('Failed to save activity:', error);
      showError('Có lỗi xảy ra khi lưu hoạt động!');
      throw error;
    }
  };

  const handleShowToast = (type: 'success' | 'error' | 'info', message: string) => {
    if (type === 'success') {
      showSuccess(message);
    } else if (type === 'error') {
      showError(message);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            Quản lý hoạt động CTXH
          </h1>
          <p className="mt-2 text-gray-600 dark:text-gray-400">
            Quản lý các hoạt động công tác xã hội của trường
          </p>
        </div>
        <div className="mt-4 sm:mt-0">
          <button
            onClick={handleCreateActivity}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-doan-500 hover:bg-doan-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-doan-500"
          >
            <Plus className="mr-2 h-4 w-4" />
            Tạo hoạt động mới
          </button>
        </div>
      </div>

      {/* Activity List */}
      <ActivityList
        onCreateClick={handleCreateActivity}
        onEditClick={handleEditActivity}
        onDeleteClick={handleDeleteActivity}
        onViewClick={handleViewActivity}
        showToast={handleShowToast}
        refreshTrigger={refreshTrigger}
      />

      {/* Activity Form Modal */}
      {showActivityForm && (
        <ActivityForm
          activity={editingActivity || undefined}
          title={editingActivity ? 'Chỉnh sửa hoạt động' : 'Tạo hoạt động mới'}
          isOpen={showActivityForm}
          onClose={() => {
            setShowActivityForm(false);
            setEditingActivity(null);
          }}
          onSubmit={handleActivitySubmit}
        />
      )}

      {/* Toasts */}
      <div className="fixed top-4 right-4 z-50 space-y-4">
        {toasts.map((toast) => (
          <Toast
            key={toast.id}
            type={toast.type}
            message={toast.message}
            onClose={() => hideToast(toast.id)}
          />
        ))}
      </div>

      {/* Confirm Dialog */}
      {confirmDialog.isOpen && (
        <ConfirmDialog
          isOpen={confirmDialog.isOpen}
          title={confirmDialog.title}
          message={confirmDialog.message}
          confirmText={confirmDialog.confirmText}
          cancelText={confirmDialog.cancelText}
          variant={confirmDialog.variant}
          onConfirm={confirmDialog.onConfirm!}
          onCancel={confirmDialog.onCancel!}
        />
      )}
    </div>
  );
};

export default ActivityManagement;