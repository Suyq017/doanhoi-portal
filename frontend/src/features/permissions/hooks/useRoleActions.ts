import { useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { Role } from '../services/roleService';
import { UseRoleListReturn } from './useRoleList';
import { UseRoleModalsReturn } from './useRoleModals';
import { UseBulkSelectionReturn } from './useBulkSelection';

export interface UseRoleActionsParams {
    roleListHook: UseRoleListReturn;
    modalsHook: UseRoleModalsReturn;
    bulkSelectionHook: UseBulkSelectionReturn;
    showSuccess: (message: string) => void;
    showError: (message: string) => void;
    showWarning: (message: string) => void;
}

export interface UseRoleActionsReturn {
    handleCreateRole: () => void;
    handleCreateSuccess: (roleData: any) => Promise<void>;
    handleViewRole: (role: Role) => void;
    handleEditRole: (role: Role) => void;
    handleEditSuccess: (roleId: string, roleData: any) => Promise<void>;
    handleDeleteRole: (role: Role) => void;
    handleDeleteConfirm: () => Promise<void>;
    handleBulkDelete: () => void;
    handleBulkDeleteConfirm: () => Promise<void>;
    handleSeedDefaults: () => Promise<void>;
}

export const useRoleActions = ({
    roleListHook,
    modalsHook,
    bulkSelectionHook,
    showSuccess,
    showError,
    showWarning
}: UseRoleActionsParams): UseRoleActionsReturn => {
    const { t } = useTranslation('permissions');
    const { createRole, updateRole, deleteRole, bulkDeleteRoles, seedDefaults } = roleListHook;
    const { selectedRole, closeModal, openCreateModal, openViewModal, openEditModal, openDeleteModal, openBulkDeleteModal } = modalsHook;
    const { selectedItems, clearSelection, getSelectedCount } = bulkSelectionHook;

    const handleCreateRole = useCallback(() => {
        openCreateModal();
    }, [openCreateModal]); const handleCreateSuccess = useCallback(async (roleData: any) => {
        try {
            await createRole(roleData);
            closeModal();
            showSuccess(t('messages.createSuccess'));
        } catch (error) {
            showError(t('messages.createError'));
        }
    }, [createRole, closeModal, showSuccess, showError, t]);

    const handleViewRole = useCallback((role: Role) => {
        openViewModal(role);
    }, [openViewModal]);

    const handleEditRole = useCallback((role: Role) => {
        openEditModal(role);
    }, [openEditModal]); const handleEditSuccess = useCallback(async (roleId: string, roleData: any) => {
        console.log('=== DEBUG useRoleActions.handleEditSuccess ===');
        console.log('Role ID:', roleId);
        console.log('Role Data:', roleData);

        try {
            await updateRole(roleId, roleData);
            closeModal();
            showSuccess(t('messages.updateSuccess'));
        } catch (error) {
            console.error('=== ERROR in useRoleActions.handleEditSuccess ===');
            console.error('Error:', error);
            showError(t('messages.updateError'));
        }
    }, [updateRole, closeModal, showSuccess, showError, t]); const handleDeleteRole = useCallback((role: Role) => {
        if (role.isSystemRole) {
            showError(t('messages.systemRoleDeleteError'));
            return;
        }
        openDeleteModal(role);
    }, [openDeleteModal, showError, t]); const handleDeleteConfirm = useCallback(async () => {
        if (!selectedRole) return;

        try {
            await deleteRole(selectedRole.id);
            closeModal();
            showSuccess(t('messages.deleteSuccess'));
        } catch (error) {
            showError(t('messages.deleteError'));
        }
    }, [selectedRole, deleteRole, closeModal, showSuccess, showError, t]); const handleBulkDelete = useCallback(() => {
        const selectedCount = getSelectedCount();
        if (selectedCount === 0) {
            showWarning(t('messages.bulkDeleteWarning'));
            return;
        }
        openBulkDeleteModal();
    }, [getSelectedCount, showWarning, openBulkDeleteModal, t]); const handleBulkDeleteConfirm = useCallback(async () => {
        try {
            const roleIds = Array.from(selectedItems);
            const result = await bulkDeleteRoles(roleIds);

            closeModal();
            clearSelection();

            const message = result.deletedUserRoleAssignments > 0
                ? t('messages.bulkDeleteWithAssignmentsSuccess', {
                    roles: result.deletedRoles,
                    assignments: result.deletedUserRoleAssignments
                })
                : t('messages.bulkDeleteSuccess', { count: result.deletedRoles });

            showSuccess(message);
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : t('messages.deleteError');
            showError(errorMessage);
        }
    }, [selectedItems, bulkDeleteRoles, closeModal, clearSelection, showSuccess, showError, t]); const handleSeedDefaults = useCallback(async () => {
        if (confirm(t('messages.seedConfirm'))) {
            try {
                await seedDefaults();
                showSuccess(t('messages.seedSuccess'));
            } catch (error) {
                showError(t('messages.seedError'));
            }
        }
    }, [seedDefaults, showSuccess, showError, t]);

    return {
        handleCreateRole,
        handleCreateSuccess,
        handleViewRole,
        handleEditRole,
        handleEditSuccess,
        handleDeleteRole,
        handleDeleteConfirm,
        handleBulkDelete,
        handleBulkDeleteConfirm,
        handleSeedDefaults,
    };
};
