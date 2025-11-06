import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Plus } from 'lucide-react';
import { CtxhLimitConfig, CreateLimitConfigRequest, UpdateLimitConfigRequest } from '../types';
import LimitConfigList from '../components/limit-config/LimitConfigList';
import LimitConfigForm from '../components/limit-config/LimitConfigForm';
import ConfirmDialog from '../../../shared/components/ConfirmDialog';
import { Toast } from '../../../shared/components';
import { useToast } from '../../../shared/hooks';
import {
  useCreateLimitConfig,
  useUpdateLimitConfig,
  useDeleteLimitConfig,
  useRestoreLimitConfig
} from '../../../shared/hooks/queries';

const LimitConfigManagement: React.FC = () => {
  const { t } = useTranslation('ctxh');

  // Translate error messages from server
  const translateError = (error: any): string => {
    const message = error?.message || error?.toString() || '';

    // Common server error patterns
    if (message.includes('tồn tại cấu hình') || message.includes('already exists')) {
      return t('limitConfig.errors.alreadyExists');
    }
    if (message.includes('không tìm thấy') || message.includes('not found')) {
      return t('limitConfig.errors.notFound');
    }
    if (message.includes('không có quyền') || message.includes('permission')) {
      return t('limitConfig.errors.noPermission');
    }

    // Return original message if no translation found
    return message || t('limitConfig.errors.unknown');
  };

  // Toast notifications
  const { toasts, hideToast, showSuccess, showError } = useToast();

  // ✅ TanStack Query mutations
  const createMutation = useCreateLimitConfig();
  const updateMutation = useUpdateLimitConfig();
  const deleteMutation = useDeleteLimitConfig();
  const restoreMutation = useRestoreLimitConfig();

  // State management
  const [selectedConfig, setSelectedConfig] = useState<CtxhLimitConfig | undefined>();
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isConfirmDialogOpen, setIsConfirmDialogOpen] = useState(false);
  const [confirmAction, setConfirmAction] = useState<'delete' | 'restore' | null>(null);

  // Toast wrapper for LimitConfigList  
  const handleShowToast = (type: 'success' | 'error' | 'info' | 'warning', message: string) => {
    if (type === 'success') {
      showSuccess(message);
    } else if (type === 'error') {
      showError(message);
    }
  };

  // Form handlers
  const handleCreateClick = () => {
    setSelectedConfig(undefined);
    setIsFormOpen(true);
  };

  const handleEditClick = (config: CtxhLimitConfig) => {
    setSelectedConfig(config);
    setIsFormOpen(true);
  };

  const handleFormClose = () => {
    setIsFormOpen(false);
    setSelectedConfig(undefined);
  };

  const handleFormSave = async (data: CreateLimitConfigRequest | UpdateLimitConfigRequest) => {
    try {
      if (selectedConfig) {
        // Update existing config
        await updateMutation.mutateAsync({ id: selectedConfig.id, data: data as UpdateLimitConfigRequest });
        showSuccess(t('limitConfig.updated'));
      } else {
        // Create new config
        await createMutation.mutateAsync(data as CreateLimitConfigRequest);
        showSuccess(t('limitConfig.created'));
      }

      setIsFormOpen(false);
      setSelectedConfig(undefined);
      // ✅ Cache tự động refetch - không cần refreshTrigger
    } catch (error) {
      const errorMessage = translateError(error);
      showError(errorMessage);
      throw error; // Re-throw to let the form handle it
    }
  };

  // Delete/Restore handlers
  const handleDeleteClick = (config: CtxhLimitConfig) => {
    setSelectedConfig(config);
    setConfirmAction('delete');
    setIsConfirmDialogOpen(true);
  };

  const handleRestoreClick = (config: CtxhLimitConfig) => {
    setSelectedConfig(config);
    setConfirmAction('restore');
    setIsConfirmDialogOpen(true);
  };

  const handleConfirmAction = async () => {
    if (!selectedConfig || !confirmAction) return;

    try {
      if (confirmAction === 'delete') {
        await deleteMutation.mutateAsync(selectedConfig.id);
        showSuccess(t('limitConfig.deleted'));
      } else if (confirmAction === 'restore') {
        await restoreMutation.mutateAsync(selectedConfig.id);
        showSuccess(t('limitConfig.restored'));
      }

      // Close dialog
      setIsConfirmDialogOpen(false);
      setSelectedConfig(undefined);
      setConfirmAction(null);
      // ✅ Cache tự động refetch
    } catch (error) {
      const errorMessage = translateError(error);
      showError(errorMessage);
    }
  };

  const handleCancelAction = () => {
    setIsConfirmDialogOpen(false);
    setSelectedConfig(undefined);
    setConfirmAction(null);
  };

  // Confirm dialog content
  const getDialogContent = () => {
    if (!selectedConfig) return { title: '', message: '', variant: 'danger' as const };

    if (confirmAction === 'delete') {
      return {
        title: t('limitConfig.deleteConfirm'),
        message: `${t('limitConfig.deleteMessage')}

${t('limitConfig.organization')}: ${selectedConfig.organization?.name || 'N/A'}`,
        variant: 'danger' as const
      };
    }

    return {
      title: t('limitConfig.restoreConfirm'),
      message: `${t('limitConfig.restoreMessage')}

${t('limitConfig.organization')}: ${selectedConfig.organization?.name || 'N/A'}`,
      variant: 'info' as const
    };
  };

  const dialogContent = getDialogContent();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            {t('limitConfig.title')}
          </h1>
          <p className="mt-2 text-gray-600 dark:text-gray-400">
            {t('limitConfig.subtitle')}
          </p>
        </div>
        <div className="mt-4 sm:mt-0">
          <button
            onClick={handleCreateClick}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-doan-500 hover:bg-doan-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-doan-500"
          >
            <Plus className="mr-2 h-4 w-4" />
            {t('limitConfig.create')}
          </button>
        </div>
      </div>

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
        loading={createMutation.isPending || updateMutation.isPending}
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
        loading={deleteMutation.isPending || restoreMutation.isPending}
      />

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
    </div>
  );
};

export default LimitConfigManagement;