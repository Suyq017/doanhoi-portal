import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useToast } from '../../../shared/hooks';
import { useCtxhPermissions } from './useCtxhPermissions';
import {
    useCreateCategory,
    useUpdateCategory,
    useDeleteCategory,
    useRestoreCategory,
} from '../../../shared/hooks/queries';
import { getErrorMessage } from '../utils';
import {
    CtxhCategory,
    CreateCategoryRequest,
    UpdateCategoryRequest,
    UseCategoryManagementReturn,
    ConfirmActionType
} from '../types';

/**
 * Custom hook for Category Management page
 * Handles all state and business logic for category CRUD operations
 */
export const useCategoryManagement = (): UseCategoryManagementReturn => {
    const { t } = useTranslation('ctxh');
    const ctxhPermissions = useCtxhPermissions();

    // Toast notifications
    const { toasts, hideToast, showSuccess, showError } = useToast();

    // TanStack Query mutations
    const createMutation = useCreateCategory();
    const updateMutation = useUpdateCategory();
    const deleteMutation = useDeleteCategory();
    const restoreMutation = useRestoreCategory();

    // State management
    const [selectedCategory, setSelectedCategory] = useState<CtxhCategory | undefined>();
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [isConfirmDialogOpen, setIsConfirmDialogOpen] = useState(false);
    const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
    const [confirmAction, setConfirmAction] = useState<ConfirmActionType>(null);

    // Action handlers
    const handleCreateClick = () => {
        setSelectedCategory(undefined);
        setIsFormOpen(true);
    };

    const handleEditClick = (category: CtxhCategory) => {
        setSelectedCategory(category);
        setIsFormOpen(true);
    };

    const handleFormClose = () => {
        setIsFormOpen(false);
        setSelectedCategory(undefined);
    };

    const handleFormSave = async (data: CreateCategoryRequest | UpdateCategoryRequest) => {
        try {
            if (selectedCategory) {
                await updateMutation.mutateAsync({ id: selectedCategory.id, data: data as UpdateCategoryRequest });
                showSuccess(t('category.updated'));
            } else {
                await createMutation.mutateAsync(data as CreateCategoryRequest);
                showSuccess(t('category.created'));
            }

            setIsFormOpen(false);
            setSelectedCategory(undefined);
        } catch (error) {
            const errorMessage = getErrorMessage(error);
            showError(errorMessage);
            throw error;
        }
    };

    const handleDeleteClick = (category: CtxhCategory) => {
        setSelectedCategory(category);
        setConfirmAction('delete');
        setIsConfirmDialogOpen(true);
    };

    const handleViewDetailClick = (category: CtxhCategory) => {
        setSelectedCategory(category);
        setIsDetailModalOpen(true);
    };

    const handleDetailModalClose = () => {
        setIsDetailModalOpen(false);
        setSelectedCategory(undefined);
    };

    const handleConfirmAction = async () => {
        if (!selectedCategory || !confirmAction) return;

        try {
            if (confirmAction === 'delete') {
                await deleteMutation.mutateAsync(selectedCategory.id);
                showSuccess(t('category.deleted'));
            } else if (confirmAction === 'restore') {
                await restoreMutation.mutateAsync(selectedCategory.id);
                showSuccess(t('category.restored'));
            }
        } catch (error) {
            const errorMessage = getErrorMessage(error);
            showError(errorMessage);
        } finally {
            setIsConfirmDialogOpen(false);
            setSelectedCategory(undefined);
            setConfirmAction(null);
        }
    };

    const handleCancelAction = () => {
        setIsConfirmDialogOpen(false);
        setSelectedCategory(undefined);
        setConfirmAction(null);
    };

    const handleShowToast = (type: 'success' | 'error' | 'info', message: string) => {
        if (type === 'success') {
            showSuccess(message);
        } else if (type === 'error') {
            showError(message);
        }
    };

    // Get confirmation dialog content
    const getDialogContent = () => {
        if (!selectedCategory || !confirmAction) {
            return { title: '', message: '', variant: 'warning' as const };
        }

        if (confirmAction === 'delete') {
            return {
                title: t('category.delete'),
                message: t('category.deleteConfirm') + ` "${selectedCategory.name}"?`,
                variant: 'danger' as const
            };
        } else {
            return {
                title: t('category.restore'),
                message: t('category.restoreConfirm') + ` "${selectedCategory.name}"?`,
                variant: 'info' as const
            };
        }
    };

    return {
        // State
        selectedCategory,
        isFormOpen,
        isConfirmDialogOpen,
        isDetailModalOpen,
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
        handleViewDetailClick,
        handleFormClose,
        handleFormSave,
        handleConfirmAction,
        handleCancelAction,
        handleShowToast,
        handleDetailModalClose,

        // Dialog content
        dialogContent: getDialogContent(),

        // Permissions
        permissions: {
            create: ctxhPermissions.categories.create,
            update: ctxhPermissions.categories.update,
            delete: ctxhPermissions.categories.delete
        },

        // Toast
        toasts,
        hideToast
    };
};
