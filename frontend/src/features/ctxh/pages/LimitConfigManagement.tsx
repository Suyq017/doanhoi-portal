import React from 'react';
import { useTranslation } from 'react-i18next';
import { useLimitConfigManagement } from '../hooks';
import { LimitConfigManagementHeader, ToastContainer } from '../components/shared';
import LimitConfigList from '../components/limit-config/LimitConfigList';
import LimitConfigForm from '../components/limit-config/LimitConfigForm';
import ConfirmDialog from '../../../shared/components/ConfirmDialog';

/**
 * Limit Config Management Page
 * Refactored with separation of concerns using custom hook
 */
const LimitConfigManagement: React.FC = () => {
  const { t } = useTranslation('ctxh');
  
  const {
    // State
    selectedConfig,
    isFormOpen,
    isConfirmDialogOpen,
    confirmAction,
    
    // Loading states
    isCreating,
    isUpdating,
    isDeleting,
    isRestoring,
    
    // Actions
    handleCreateClick,
    handleEditClick,
    handleDeleteClick,
    handleRestoreClick,
    handleFormClose,
    handleFormSave,
    handleConfirmAction,
    handleCancelAction,
    handleShowToast,
    
    // Dialog content
    dialogContent,
    
    // Toast
    toasts,
    hideToast
  } = useLimitConfigManagement();

  return (
    <div className="space-y-6">
      {/* Header */}
      <LimitConfigManagementHeader
        title={t('limitConfig.title')}
        subtitle={t('limitConfig.subtitle')}
        onCreateClick={handleCreateClick}
        createButtonLabel={t('limitConfig.create')}
      />

      {/* Limit Config List */}
      <LimitConfigList
        onCreateClick={handleCreateClick}
        onEditClick={handleEditClick}
        onDeleteClick={handleDeleteClick}
        onRestoreClick={handleRestoreClick}
        showToast={handleShowToast}
      />

      {/* Limit Config Form Modal */}
      <LimitConfigForm
        isOpen={isFormOpen}
        config={selectedConfig}
        onSave={handleFormSave}
        onClose={handleFormClose}
        loading={isCreating || isUpdating}
      />

      {/* Confirm Dialog */}
      <ConfirmDialog
        isOpen={isConfirmDialogOpen}
        title={dialogContent.title}
        message={dialogContent.message}
        variant={dialogContent.variant}
        confirmText={confirmAction === 'delete' ? t('limitConfig.delete') : t('limitConfig.restore')}
        cancelText={t('common.cancel')}
        onConfirm={handleConfirmAction}
        onCancel={handleCancelAction}
        loading={isDeleting || isRestoring}
      />

      {/* Toast Notifications */}
      <ToastContainer toasts={toasts} onHide={hideToast} />
    </div>
  );
};

export default LimitConfigManagement;
