import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Plus } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { CtxhActivity } from '../types';
import ActivityForm from '../components/ActivityForm';
import ActivityList from '../components/activity/ActivityList';
import { useToast } from '../../../shared/hooks';
import { Toast, ConfirmDialog } from '../../../shared/components';
import {
  useCreateActivity,
  useUpdateActivity,
  useDeleteActivity,
  useUserPrimaryOrganization,
} from '../../../shared/hooks/queries';

const ActivityManagement: React.FC = () => {
  const { t } = useTranslation('ctxh');

  // ActivityManagement component
  const navigate = useNavigate();
  const [showActivityForm, setShowActivityForm] = useState(false);
  const [editingActivity, setEditingActivity] = useState<CtxhActivity | null>(null);

  // Toast notifications
  const { toasts, hideToast, showSuccess, showError, confirmDialog, showConfirm } = useToast();

  // ✅ TanStack Query mutations
  const createMutation = useCreateActivity();
  const updateMutation = useUpdateActivity();
  const deleteMutation = useDeleteActivity();

  // ✅ Use cached query for user's primary organization
  const { data: primaryOrgData, isLoading: checkingPermissions } = useUserPrimaryOrganization();

  // User can create if they have a primary organization
  const canCreateActivity = primaryOrgData?.organization !== null;

  // Remove old useEffect - now handled by TanStack Query

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
      t('activity.deleteConfirm'),
      t('activity.deleteMessage', { name: activity.name }),
      {
        confirmText: t('activity.delete'),
        cancelText: t('category.cancel'),
        variant: 'danger'
      }
    );

    if (!confirmed) return;

    try {
      await deleteMutation.mutateAsync(activity.id);
      showSuccess(t('activity.deleted'));
      // ✅ Cache tự động refetch
    } catch (error: any) {
      console.error('Failed to delete activity:', error);

      // Handle different error formats
      let errorMessage = t('activity.deleteError');

      // The error message is now in error.message (thanks to updated apiClient)
      if (error.message) {
        // Check if it's the specific "has participants" error
        if (error.message.includes('sinh viên tham gia') || error.message.includes('participants')) {
          errorMessage = t('activity.deleteErrorHasParticipants');
        } else {
          // Use the full server error message
          errorMessage = error.message;
        }
      } else if (error.response?.data?.message) {
        // Fallback to response data message
        errorMessage = error.response.data.message;
      }

      showError(errorMessage);
    }
  };

  const handleViewActivity = (activity: CtxhActivity) => {
    navigate(`/ctxh/activities/${activity.id}`);
  };

  const handleActivitySaved = () => {
    setShowActivityForm(false);
    setEditingActivity(null);
    // ✅ Cache tự động refetch, không cần refreshTrigger
    showSuccess(editingActivity ? t('activity.updated') : t('activity.created'));
  };

  const handleActivitySubmit = async (data: any) => {
    try {
      if (editingActivity) {
        await updateMutation.mutateAsync({ id: editingActivity.id, data });
      } else {
        await createMutation.mutateAsync(data);
      }
      handleActivitySaved();
    } catch (error: any) {
      console.error('Failed to save activity:', error);

      // Handle specific server errors
      if (error.response?.data?.message) {
        const serverMessage = error.response.data.message;

        // Check if it's a duplicate error
        if (serverMessage.includes('duplicate') || serverMessage.includes('already exists') || serverMessage.includes('đã tồn tại')) {
          showError(t('activity.validation.duplicateNameCategory'));
        }
        // Check if it's a day limit exceeded error
        else if (serverMessage.includes('vượt quá giới hạn') || serverMessage.includes('exceed') || serverMessage.includes('limit')) {
          showError(t('activity.dayLimitExceeded') + ': ' + serverMessage);
        }
        // Show the original server message for other errors
        else {
          showError(serverMessage);
        }
      } else {
        showError(t('activity.saveError'));
      }
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
            {t('activity.title')}
          </h1>
          <p className="mt-2 text-gray-600 dark:text-gray-400">
            {t('activity.subtitle')}
          </p>
        </div>
        {!checkingPermissions && canCreateActivity && (
          <div className="mt-4 sm:mt-0">
            <button
              onClick={handleCreateActivity}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-doan-500 hover:bg-doan-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-doan-500"
            >
              <Plus className="mr-2 h-4 w-4" />
              {t('activity.create')}
            </button>
          </div>
        )}
      </div>

      {/* Activity List */}
      <ActivityList
        onCreateClick={handleCreateActivity}
        onEditClick={handleEditActivity}
        onDeleteClick={handleDeleteActivity}
        onViewClick={handleViewActivity}
        showToast={handleShowToast}
        permissions={{
          create: true,
          update: true,
          delete: true
        }}
      />

      {/* Activity Form Modal */}
      {showActivityForm && (
        <ActivityForm
          activity={editingActivity || undefined}
          title={editingActivity ? t('activity.edit') : t('activity.create')}
          isOpen={showActivityForm}
          onClose={() => {
            setShowActivityForm(false);
            setEditingActivity(null);
          }}
          onSubmit={handleActivitySubmit}
        />
      )}

      {/* Toasts */}
      <div className="fixed top-4 right-4 z-[9999] space-y-2">
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