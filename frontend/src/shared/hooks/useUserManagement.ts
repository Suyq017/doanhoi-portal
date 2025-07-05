import { useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { User, CreateUserRequest } from '../types/user';

export interface UseUserManagementOptions {
    showSuccess: (message: string) => void;
    showError: (message: string) => void;
    onUserCreated?: (user: User) => void;
    onUserUpdated?: (user: User) => void;
    onUserDeleted?: (userId: string) => void;
    onRefreshData?: () => Promise<void>;
    // Context-specific handlers
    createUser?: (userData: CreateUserRequest) => Promise<User>;
    updateUser?: (userId: string, userData: CreateUserRequest) => Promise<User>;
    deleteUser?: (userId: string) => Promise<void>;
    // Custom delete handler (for organization context - remove from org)
    customDeleteHandler?: (user: User) => Promise<void>;
    customDeleteSuccessMessage?: string;
    customDeleteErrorMessage?: string;
}

export interface UseUserManagementReturn {
    // Modal states
    selectedUser: User | null;
    isCreateModalOpen: boolean;
    isViewModalOpen: boolean;
    isEditModalOpen: boolean;
    isDeleteModalOpen: boolean;

    // Loading states
    isCreating: boolean;
    isUpdating: boolean;
    isDeleting: boolean;

    // Modal handlers
    openCreateModal: () => void;
    closeModal: () => void;

    // User action handlers
    handleViewUser: (user: User) => void;
    handleEditUser: (user: User) => void;
    handleDeleteUser: (user: User) => void;
    handleCreateUser: (userData: CreateUserRequest) => Promise<void>;
    handleUpdateUser: (userData: CreateUserRequest) => Promise<void>;
    confirmDeleteUser: () => Promise<void>;
}

export const useUserManagement = (options: UseUserManagementOptions): UseUserManagementReturn => {
    const { t } = useTranslation(['users', 'common', 'organizations']);

    const {
        showSuccess,
        showError,
        onUserCreated,
        onUserUpdated,
        onUserDeleted,
        onRefreshData,
        createUser,
        updateUser,
        deleteUser,
        customDeleteHandler,
        customDeleteSuccessMessage,
        customDeleteErrorMessage,
    } = options;

    // Modal states
    const [selectedUser, setSelectedUser] = useState<User | null>(null);
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [isViewModalOpen, setIsViewModalOpen] = useState(false);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);

    // Loading states
    const [isCreating, setIsCreating] = useState(false);
    const [isUpdating, setIsUpdating] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);

    // Modal handlers
    const openCreateModal = useCallback(() => {
        setIsCreateModalOpen(true);
    }, []);

    const closeModal = useCallback(() => {
        setIsCreateModalOpen(false);
        setIsViewModalOpen(false);
        setIsEditModalOpen(false);
        setIsDeleteModalOpen(false);
        setSelectedUser(null);
    }, []);

    // User action handlers
    const handleViewUser = useCallback((user: User) => {
        setSelectedUser(user);
        setIsViewModalOpen(true);
    }, []);

    const handleEditUser = useCallback((user: User) => {
        setSelectedUser(user);
        setIsEditModalOpen(true);
    }, []);

    const handleDeleteUser = useCallback((user: User) => {
        setSelectedUser(user);
        setIsDeleteModalOpen(true);
    }, []);

    const handleCreateUser = useCallback(async (userData: CreateUserRequest) => {
        if (!createUser) {
            console.error('createUser function not provided');
            return;
        }

        try {
            setIsCreating(true);
            const newUser = await createUser(userData);

            closeModal();
            showSuccess(t('common:messages.success.create'));

            if (onUserCreated) {
                onUserCreated(newUser);
            }

            if (onRefreshData) {
                await onRefreshData();
            }
        } catch (error) {
            console.error('Error creating user:', error);
            showError(t('common:messages.error.create'));
            throw error; // Re-throw to let modal handle it if needed
        } finally {
            setIsCreating(false);
        }
    }, [createUser, closeModal, showSuccess, showError, t, onUserCreated, onRefreshData]);

    const handleUpdateUser = useCallback(async (userData: CreateUserRequest) => {
        if (!selectedUser || !updateUser) {
            console.error('selectedUser or updateUser function not provided');
            return;
        }

        try {
            setIsUpdating(true);
            const updatedUser = await updateUser(selectedUser.id, userData);

            closeModal();
            showSuccess(t('common:messages.success.update'));

            if (onUserUpdated) {
                onUserUpdated(updatedUser);
            }

            if (onRefreshData) {
                await onRefreshData();
            }
        } catch (error) {
            console.error('Error updating user:', error);
            showError(t('common:messages.error.update'));
            throw error;
        } finally {
            setIsUpdating(false);
        }
    }, [selectedUser, updateUser, closeModal, showSuccess, showError, t, onUserUpdated, onRefreshData]);

    const confirmDeleteUser = useCallback(async () => {
        if (!selectedUser) {
            console.error('selectedUser not provided');
            return;
        }

        try {
            setIsDeleting(true);

            // Use custom delete handler if provided (for organization context)
            if (customDeleteHandler) {
                await customDeleteHandler(selectedUser);
                showSuccess(customDeleteSuccessMessage || t('common:messages.success.delete'));
            } else if (deleteUser) {
                await deleteUser(selectedUser.id);
                showSuccess(t('common:messages.success.delete'));
            } else {
                console.error('No delete function provided');
                return;
            }

            closeModal();

            if (onUserDeleted) {
                onUserDeleted(selectedUser.id);
            }

            if (onRefreshData) {
                await onRefreshData();
            }
        } catch (error) {
            console.error('Error deleting user:', error);
            const errorMessage = customDeleteErrorMessage || t('common:messages.error.delete');
            showError(errorMessage);
        } finally {
            setIsDeleting(false);
        }
    }, [
        selectedUser,
        customDeleteHandler,
        deleteUser,
        closeModal,
        showSuccess,
        showError,
        t,
        onUserDeleted,
        onRefreshData,
        customDeleteSuccessMessage,
        customDeleteErrorMessage,
    ]);

    return {
        // Modal states
        selectedUser,
        isCreateModalOpen,
        isViewModalOpen,
        isEditModalOpen,
        isDeleteModalOpen,

        // Loading states
        isCreating,
        isUpdating,
        isDeleting,

        // Modal handlers
        openCreateModal,
        closeModal,

        // User action handlers
        handleViewUser,
        handleEditUser,
        handleDeleteUser,
        handleCreateUser,
        handleUpdateUser,
        confirmDeleteUser,
    };
};