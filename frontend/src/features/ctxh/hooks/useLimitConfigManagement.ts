import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useToast } from '../../../shared/hooks';
import {
    useCreateLimitConfig,
    useUpdateLimitConfig,
    useDeleteLimitConfig,
    useRestoreLimitConfig
} from '../../../shared/hooks/queries';
import {
    CtxhLimitConfig,
    CreateLimitConfigRequest,
    UpdateLimitConfigRequest,
    UseLimitConfigManagementReturn,
    ConfirmActionType
} from '../types';

/**
 * Translate error messages from server
 */
const translateError = (error: any, t: (key: string) => string): string => {
    const message = error?.message || error?.toString() || '';

    if (message.includes('tồn tại cấu hình') || message.includes('already exists')) {
        return t('limitConfig.errors.alreadyExists');
    }
    if (message.includes('không tìm thấy') || message.includes('not found')) {
        return t('limitConfig.errors.notFound');
    }
    if (message.includes('không có quyền') || message.includes('permission')) {
        return t('limitConfig.errors.noPermission');
    }

    return message || t('limitConfig.errors.unknown');
};

/**
 * Custom hook for Limit Config Management page
 * Handles all state and business logic for limit config CRUD operations
 */
export const useLimitConfigManagement = (): UseLimitConfigManagementReturn => {
    const { t } = useTranslation('ctxh');

    // Toast notifications
    const { toasts, hideToast, showSuccess, showError } = useToast();

    // TanStack Query mutations
    const createMutation = useCreateLimitConfig();
    const updateMutation = useUpdateLimitConfig();
    const deleteMutation = useDeleteLimitConfig();
    const restoreMutation = useRestoreLimitConfig();

    // State management
    const [selectedConfig, setSelectedConfig] = useState<CtxhLimitConfig | undefined>();
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [isConfirmDialogOpen, setIsConfirmDialogOpen] = useState(false);
    const [confirmAction, setConfirmAction] = useState<ConfirmActionType>(null);

    // Action handlers
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
                await updateMutation.mutateAsync({ id: selectedConfig.id, data: data as UpdateLimitConfigRequest });
                showSuccess(t('limitConfig.updated'));
            } else {
                await createMutation.mutateAsync(data as CreateLimitConfigRequest);
                showSuccess(t('limitConfig.created'));
            }

            setIsFormOpen(false);
            setSelectedConfig(undefined);
        } catch (error) {
            const errorMessage = translateError(error, t);
            showError(errorMessage);
            throw error;
        }
    };

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

            setIsConfirmDialogOpen(false);
            setSelectedConfig(undefined);
            setConfirmAction(null);
        } catch (error) {
            const errorMessage = translateError(error, t);
            showError(errorMessage);
        }
    };

    const handleCancelAction = () => {
        setIsConfirmDialogOpen(false);
        setSelectedConfig(undefined);
        setConfirmAction(null);
    };

    const handleShowToast = (type: 'success' | 'error' | 'info' | 'warning', message: string) => {
        if (type === 'success') {
            showSuccess(message);
        } else if (type === 'error') {
            showError(message);
        }
    };

    // Get confirmation dialog content
    const getDialogContent = () => {
        if (!selectedConfig) {
            return { title: '', message: '', variant: 'danger' as const };
        }

        if (confirmAction === 'delete') {
            return {
                title: t('limitConfig.deleteConfirm'),
                message: `${t('limitConfig.deleteMessage')}\n\n${t('limitConfig.organization')}: ${selectedConfig.organization?.name || 'N/A'}`,
                variant: 'danger' as const
            };
        }

        return {
            title: t('limitConfig.restoreConfirm'),
            message: `${t('limitConfig.restoreMessage')}\n\n${t('limitConfig.organization')}: ${selectedConfig.organization?.name || 'N/A'}`,
            variant: 'info' as const
        };
    };

    return {
        // State
        selectedConfig,
        isFormOpen,
        isConfirmDialogOpen,
        confirmAction,

        // Loading states
        isCreating: createMutation.isPending,
        isUpdating: updateMutation.isPending,
        isDeleting: deleteMutation.isPending,
        isRestoring: restoreMutation.isPending,

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
        dialogContent: getDialogContent(),

        // Toast
        toasts,
        hideToast
    };
};
