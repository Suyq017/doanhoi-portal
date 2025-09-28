import React, { useState } from 'react';
import { Plus } from 'lucide-react';
import { CtxhLimitConfig, CreateLimitConfigRequest, UpdateLimitConfigRequest } from '../types';
import { limitConfigService } from '../services/limitConfigService';
import { getErrorMessage } from '../utils';
import LimitConfigList from '../components/limit-config/LimitConfigList';
import LimitConfigForm from '../components/limit-config/LimitConfigForm';
import ConfirmDialog from '../../../shared/components/ConfirmDialog';
import { Toast } from '../../../shared/components';
import { useToast } from '../../../shared/hooks';

const LimitConfigManagement: React.FC = () => {
  // Toast notifications
  const { toasts, hideToast, showSuccess, showError } = useToast();
  
  // State management
  const [selectedConfig, setSelectedConfig] = useState<CtxhLimitConfig | undefined>();
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isConfirmDialogOpen, setIsConfirmDialogOpen] = useState(false);
  const [confirmAction, setConfirmAction] = useState<'delete' | 'restore' | null>(null);
  const [loading, setLoading] = useState(false);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

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
    setLoading(true);
    try {
      if (selectedConfig) {
        // Update existing config
        await limitConfigService.update(selectedConfig.id, data as UpdateLimitConfigRequest);
        showSuccess('Cập nhật cấu hình thành công');
      } else {
        // Create new config
        await limitConfigService.create(data as CreateLimitConfigRequest);
        showSuccess('Tạo cấu hình thành công');
      }
      
      setIsFormOpen(false);
      setSelectedConfig(undefined);
      // Trigger refresh of LimitConfigList
      setRefreshTrigger(prev => prev + 1);
    } catch (error) {
      const errorMessage = getErrorMessage(error);
      showError(errorMessage);
      throw error; // Re-throw to let the form handle it
    } finally {
      setLoading(false);
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

    setLoading(true);
    try {
      if (confirmAction === 'delete') {
        await limitConfigService.delete(selectedConfig.id);
        showSuccess('Đã xóa cấu hình thành công');
      } else if (confirmAction === 'restore') {
        await limitConfigService.restore(selectedConfig.id);
        showSuccess('Đã khôi phục cấu hình thành công');
      }
      
      // Trigger refresh
      setRefreshTrigger(prev => prev + 1);
    } catch (error) {
      const errorMessage = getErrorMessage(error);
      showError(errorMessage);
    } finally {
      setLoading(false);
      setIsConfirmDialogOpen(false);
      setSelectedConfig(undefined);
      setConfirmAction(null);
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
        title: 'Xóa cấu hình',
        message: `Bạn có chắc chắn muốn xóa

Tên tổ chức: ${selectedConfig.organization?.name || 'N/A'}`,
        variant: 'danger' as const
      };
    }

    return {
      title: 'Khôi phục cấu hình',
      message: `Bạn có chắc chắn muốn khôi phục

Tên tổ chức: ${selectedConfig.organization?.name || 'N/A'}`,
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
            Cấu hình giới hạn CTXH
          </h1>
          <p className="mt-2 text-gray-600 dark:text-gray-400">
            Quản lý cấu hình giới hạn số ngày CTXH cho các tổ chức
          </p>
        </div>
        <div className="mt-4 sm:mt-0">
          <button
            onClick={handleCreateClick}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-doan-500 hover:bg-doan-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-doan-500"
          >
            <Plus className="mr-2 h-4 w-4" />
            Tạo cấu hình mới
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
        refreshTrigger={refreshTrigger}
      />

      {/* Limit Config Form Modal */}
      <LimitConfigForm
        isOpen={isFormOpen}
        config={selectedConfig}
        onSave={handleFormSave}
        onClose={handleFormClose}
        loading={loading}
      />

      {/* Confirm Dialog */}
      <ConfirmDialog
        isOpen={isConfirmDialogOpen}
        title={dialogContent.title}
        message={dialogContent.message}
        variant={dialogContent.variant}
        confirmText={confirmAction === 'delete' ? 'Xóa' : 'Khôi phục'}
        cancelText="Hủy"
        onConfirm={handleConfirmAction}
        onCancel={handleCancelAction}
      />

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
    </div>
  );
};

export default LimitConfigManagement;