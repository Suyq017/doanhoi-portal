import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Plus } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { CtxhActivity } from '../types';
import { activityService } from '../services';
import ActivityForm from '../components/ActivityForm';
import ActivityList from '../components/activity/ActivityList';
import { useToast } from '../../../shared/hooks';
import { Toast, ConfirmDialog } from '../../../shared/components';
import { organizationService } from '../../../shared/services';

const ActivityManagement: React.FC = () => {
  const { t } = useTranslation('ctxh');

  // ActivityManagement component
  const navigate = useNavigate();
  const [showActivityForm, setShowActivityForm] = useState(false);
  const [editingActivity, setEditingActivity] = useState<CtxhActivity | null>(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [canCreateActivity, setCanCreateActivity] = useState(true);
  const [checkingPermissions, setCheckingPermissions] = useState(true);

  // Toast notifications
  const { toasts, hideToast, showSuccess, showError, confirmDialog, showConfirm } = useToast();

  // Check if user can create activities (not Level 3 organization)
  useEffect(() => {
    const checkCreatePermission = async () => {
      try {
        setCheckingPermissions(true);
        const response = await organizationService.getCtxhActivityAccessibleOrganizations();

        // User can create if they have at least one accessible organization
        // - Super Admin / Level 1: organizations.length > 0, fixedOrganization = null
        // - Level 2: organizations.length = 1, fixedOrganization = Organization
        // - Level 3 / No permission: organizations.length = 0
        const canCreate = response.organizations.length > 0;
        setCanCreateActivity(canCreate);

        console.log('[ActivityManagement] Create permission check:', {
          organizationsCount: response.organizations.length,
          fixedOrganization: response.fixedOrganization?.name || 'null',
          canCreate: canCreate
        });
      } catch (error) {
        console.error('Failed to check create permission:', error);
        // Default to false for safety
        setCanCreateActivity(false);
      } finally {
        setCheckingPermissions(false);
      }
    };

    checkCreatePermission();
  }, []);

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
      await activityService.delete(activity.id);
      setRefreshTrigger(prev => prev + 1);
      showSuccess(t('activity.deleted'));
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
    setRefreshTrigger(prev => prev + 1);
    showSuccess(editingActivity ? t('activity.updated') : t('activity.created'));
  };

  const handleActivitySubmit = async (data: any) => {
    try {
      if (editingActivity) {
        await activityService.update(editingActivity.id, data);
      } else {
        await activityService.create(data);
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
        refreshTrigger={refreshTrigger}
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