import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useToast, usePermissions } from '../../../shared/hooks';
import {
    useCreateActivity,
    useUpdateActivity,
    useDeleteActivity,
    useUserPrimaryOrganization,
} from '../../../shared/hooks/queries';
import { CtxhActivity, UseActivityManagementReturn } from '../types';

/**
 * Custom hook for Activity Management page
 * Handles all state and business logic for activity CRUD operations
 */
export const useActivityManagement = (): UseActivityManagementReturn => {
    const { t } = useTranslation('ctxh');
    const navigate = useNavigate();

    // Form state
    const [showActivityForm, setShowActivityForm] = useState(false);
    const [editingActivity, setEditingActivity] = useState<CtxhActivity | null>(null);

    // Toast notifications
    const { toasts, hideToast, showSuccess, showError, confirmDialog, showConfirm } = useToast();

    // TanStack Query mutations
    const createMutation = useCreateActivity();
    const updateMutation = useUpdateActivity();
    const deleteMutation = useDeleteActivity();

    // User's primary organization (for permission check)
    const { data: primaryOrgData, isLoading: checkingPermissions } = useUserPrimaryOrganization();

    // Get permissions
    const {
        canCreateCtxhActivity,
        canUpdateCtxhActivity,
        canDeleteCtxhActivity,
        isSuperAdmin
    } = usePermissions();

    // Super admin always allowed, others need organization
    const canCreateActivity = isSuperAdmin()
        ? canCreateCtxhActivity()
        : (primaryOrgData?.organization !== null && canCreateCtxhActivity());

    // Action handlers
    const handleCreateActivity = () => {
        setEditingActivity(null);
        setShowActivityForm(true);
    };

    const handleEditActivity = (activity: CtxhActivity) => {
        setEditingActivity(activity);
        setShowActivityForm(true);
    };

    const handleDeleteActivity = async (activity: CtxhActivity) => {
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
        } catch (error: any) {
            console.error('Failed to delete activity:', error);

            let errorMessage = t('activity.deleteError');
            if (error.message) {
                if (error.message.includes('sinh viên tham gia') || error.message.includes('participants')) {
                    errorMessage = t('activity.deleteErrorHasParticipants');
                } else {
                    errorMessage = error.message;
                }
            } else if (error.response?.data?.message) {
                errorMessage = error.response.data.message;
            }

            showError(errorMessage);
        }
    };

    const handleViewActivity = (activity: CtxhActivity) => {
        navigate(`/portal/ctxh/activities/${activity.id}`);
    };

    const handleActivitySubmit = async (data: any) => {
        try {
            if (editingActivity) {
                await updateMutation.mutateAsync({ id: editingActivity.id, data });
            } else {
                await createMutation.mutateAsync(data);
            }
            setShowActivityForm(false);
            setEditingActivity(null);
            showSuccess(editingActivity ? t('activity.updated') : t('activity.created'));
        } catch (error: any) {
            const errorMessage = error.message || error.response?.data?.message || error.response?.data?.error;
            if (errorMessage) {
                showError(errorMessage);
            } else {
                showError(t('activity.saveError'));
            }
            throw error;
        }
    };

    const handleCloseForm = () => {
        setShowActivityForm(false);
        setEditingActivity(null);
    };

    const handleShowToast = (type: 'success' | 'error' | 'info', message: string) => {
        if (type === 'success') {
            showSuccess(message);
        } else if (type === 'error') {
            showError(message);
        }
    };

    return {
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
        permissions: {
            create: canCreateCtxhActivity(),
            update: canUpdateCtxhActivity(),
            delete: canDeleteCtxhActivity()
        },

        // Toast
        toasts,
        hideToast,
        confirmDialog
    };
};
