import React from 'react';
import { useTranslation } from 'react-i18next';
import { useActivityManagement } from '../hooks';
import { ActivityManagementHeader } from '../components/shared';
import { ToastContainer } from '../components/shared';
import ActivityForm from '../components/ActivityForm';
import ActivityList from '../components/activity/ActivityList';
import { ConfirmDialog } from '../../../shared/components';

/**
 * Activity Management Page
 * Refactored with separation of concerns using custom hook
 */
const ActivityManagement: React.FC = () => {
  const { t } = useTranslation('ctxh');
  
  const {
    // State
    showActivityForm,
    editingActivity,
    checkingPermissions,
    canCreateActivity,
    
    // Actions
    handleCreateActivity,
    handleEditActivity,
    handleDeleteActivity,
    handleViewActivity,
    handleActivitySubmit,
    handleCloseForm,
    handleShowToast,
    
    // Permissions
    permissions,
    
    // Toast
    toasts,
    hideToast,
    confirmDialog
  } = useActivityManagement();

  return (
    <div className="space-y-6">
      {/* Header */}
      <ActivityManagementHeader
        title={t('activity.title')}
        subtitle={t('activity.subtitle')}
        canCreate={canCreateActivity}
        checkingPermissions={checkingPermissions}
        onCreateClick={handleCreateActivity}
        createButtonLabel={t('activity.create')}
      />

      {/* Activity List */}
      <ActivityList
        onCreateClick={handleCreateActivity}
        onEditClick={handleEditActivity}
        onDeleteClick={handleDeleteActivity}
        onViewClick={handleViewActivity}
        showToast={handleShowToast}
        permissions={permissions}
      />

      {/* Activity Form Modal */}
      {showActivityForm && (
        <ActivityForm
          activity={editingActivity || undefined}
          title={editingActivity ? t('activity.edit') : t('activity.create')}
          isOpen={showActivityForm}
          onClose={handleCloseForm}
          onSubmit={handleActivitySubmit}
        />
      )}

      {/* Confirm Dialog */}
      {confirmDialog && (
        <ConfirmDialog
          isOpen={confirmDialog.isOpen}
          title={confirmDialog.title}
          message={confirmDialog.message}
          variant={confirmDialog.variant}
          confirmText={confirmDialog.confirmText}
          cancelText={confirmDialog.cancelText}
          onConfirm={confirmDialog.onConfirm}
          onCancel={confirmDialog.onCancel}
        />
      )}

      {/* Toast Notifications */}
      <ToastContainer toasts={toasts} onHide={hideToast} />
    </div>
  );
};

export default ActivityManagement;
