import { useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { User, CreateUserRequest } from '../../../shared';
import { UseUserListReturn } from '../../../shared/hooks/useUserList';
import { UseUserModalsReturn } from './useUserModals';

interface UseUserActionsParams {
    userListHook: UseUserListReturn;
    modalsHook: UseUserModalsReturn;
    showSuccess: (message: string) => void;
    showError: (message: string) => void;
}

export interface UseUserActionsReturn {
    handleCreateUser: (userData: CreateUserRequest) => Promise<void>;
    handleViewUser: (user: User) => void;
    handleEditUser: (user: User) => void;
    handleUpdateUser: (userData: CreateUserRequest) => Promise<void>;
    handleDeleteUser: (user: User) => void;
    confirmDeleteUser: () => Promise<void>;
}

export const useUserActions = ({
    userListHook,
    modalsHook,
    showSuccess,
    showError
}: UseUserActionsParams): UseUserActionsReturn => {
    const { t } = useTranslation(['users', 'common']);

    const { createUser, updateUser, deleteUser } = userListHook;
    const { selectedUser, closeModal, openViewModal, openEditModal, openDeleteModal } = modalsHook;

    const handleCreateUser = useCallback(async (userData: CreateUserRequest) => {
        try {
            await createUser(userData);
            closeModal();
            showSuccess(t('common:messages.success.create'));
        } catch (error) {
            showError(t('common:messages.error.create'));
            throw error; // Re-throw to let modal handle the error
        }
    }, [createUser, closeModal, showSuccess, showError, t]);

    const handleViewUser = useCallback((user: User) => {
        openViewModal(user);
    }, [openViewModal]);

    const handleEditUser = useCallback((user: User) => {
        openEditModal(user);
    }, [openEditModal]);

    const handleUpdateUser = useCallback(async (userData: CreateUserRequest) => {
        if (!selectedUser) return;

        try {
            await updateUser(selectedUser.id, userData);
            closeModal();
            showSuccess(t('common:messages.success.update'));
        } catch (error) {
            showError(t('common:messages.error.update'));
            throw error;
        }
    }, [selectedUser, updateUser, closeModal, showSuccess, showError, t]);

    const handleDeleteUser = useCallback((user: User) => {
        openDeleteModal(user);
    }, [openDeleteModal]);

    const confirmDeleteUser = useCallback(async () => {
        if (!selectedUser) return;

        try {
            await deleteUser(selectedUser.id);
            closeModal();
            showSuccess(t('common:messages.success.delete'));
        } catch (error) {
            showError(t('common:messages.error.delete'));
        }
    }, [selectedUser, deleteUser, closeModal, showSuccess, showError, t]);

    return {
        handleCreateUser,
        handleViewUser,
        handleEditUser,
        handleUpdateUser,
        handleDeleteUser,
        confirmDeleteUser,
    };
};
