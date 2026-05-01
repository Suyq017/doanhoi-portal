/**
 * useUsersPage - Unified hook for users page state management
 * 
 * Consolidates all page-level state and logic into a single hook
 */

import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
    useToast,
    useUserList,
    useUserManagement,
    CreateUserRequest,
} from '../../../shared';
import { useExport } from '../../../shared/components/export';
import { userService } from '../../../shared/services/userService';
import { useUserPagePermissions } from './useUserPagePermissions';
import { useUserBatchImportConfig } from './useUserBatchImportConfig';
import type { UseUserPageReturn, UserModalType } from '../types';

export const useUsersPage = (): UseUserPageReturn => {
    const { t } = useTranslation(['users', 'common']);
    const { toasts, hideToast, showSuccess, showError } = useToast();

    // Permissions
    const permissions = useUserPagePermissions();

    // User list management
    const userListHook = useUserList({
        initialLimit: 10,
        autoLoad: true,
    });

    const {
        users,
        total,
        loading,
        error,
        currentPage,
        limit,
        totalPages,
        searchTerm,
        filterType,
        filterStatus,
        setSearchTerm,
        setFilterType,
        setFilterStatus,
        setCurrentPage,
        refreshUsers,
    } = userListHook;

    // User management (modals + actions)
    const userManagement = useUserManagement({
        showSuccess,
        showError,
        onRefreshData: refreshUsers,
        createUser: userService.createUser.bind(userService),
        updateUser: userService.updateUser.bind(userService),
        deleteUser: userService.deleteUser.bind(userService),
    });

    // Extended modal states
    const [isImportModalOpen, setIsImportModalOpen] = useState(false);
    const [isExportModalOpen, setIsExportModalOpen] = useState(false);
    const [isRoleAssignmentModalOpen, setIsRoleAssignmentModalOpen] = useState(false);
    const [isGrantRolesModalOpen, setIsGrantRolesModalOpen] = useState(false);

    // Export functionality
    const { exportData } = useExport({
        onSuccess: (fileName) => {
            showSuccess(t('users:messages.exportSuccess', { fileName, defaultValue: `Xuất file thành công: ${fileName}` }));
            setIsExportModalOpen(false);
        },
        onError: (error) => {
            showError(t('users:messages.exportError', { error, defaultValue: `Lỗi xuất file: ${error}` }));
        },
    });

    // Import configuration
    const importConfig = useUserBatchImportConfig({
        onRefreshData: refreshUsers,
        useBatchProcessing: true,
    });

    // Handle export
    const handleExport = async (fields: string[]) => {
        await exportData(fields, 'users');
    };

    // Handle bulk delete
    const handleBulkDelete = async (userIds: string[]) => {
        try {
            await userService.deleteUsers(userIds);
            showSuccess(t('users:messages.bulkDeleteSuccess', {
                count: userIds.length,
                defaultValue: `Đã xóa ${userIds.length} người dùng thành công`
            }));
            refreshUsers();
        } catch (error) {
            showError(t('users:messages.bulkDeleteError', {
                defaultValue: 'Có lỗi xảy ra khi xóa người dùng'
            }));
        }
    };

    // Custom update handler for EditUserModal
    const handleUpdateUser = async (userData: CreateUserRequest) => {
        if (!userManagement.selectedUser) {
            console.error('selectedUser not provided');
            return;
        }

        try {
            await userService.updateUser(userManagement.selectedUser.id, userData);
            console.log('User basic info updated successfully');
        } catch (error) {
            console.error('Error updating user basic info:', error);
            throw error;
        }
    };

    // Modal handlers
    const modals = {
        activeModal: null as UserModalType,
        selectedUser: userManagement.selectedUser,

        isCreateModalOpen: userManagement.isCreateModalOpen,
        isViewModalOpen: userManagement.isViewModalOpen,
        isEditModalOpen: userManagement.isEditModalOpen,
        isDeleteModalOpen: userManagement.isDeleteModalOpen,
        isImportModalOpen,
        isExportModalOpen,
        isRoleAssignmentModalOpen,
        isGrantRolesModalOpen,

        openCreateModal: userManagement.openCreateModal,
        openViewModal: userManagement.handleViewUser,
        openEditModal: userManagement.handleEditUser,
        openDeleteModal: userManagement.handleDeleteUser,
        openImportModal: () => setIsImportModalOpen(true),
        openExportModal: () => setIsExportModalOpen(true),
        openRoleAssignmentModal: () => setIsRoleAssignmentModalOpen(true),
        openGrantRolesModal: () => setIsGrantRolesModalOpen(true),
        closeModal: () => {
            userManagement.closeModal();
            setIsImportModalOpen(false);
            setIsExportModalOpen(false);
            setIsRoleAssignmentModalOpen(false);
            setIsGrantRolesModalOpen(false);
        },
        closeImportModal: () => setIsImportModalOpen(false),
        closeExportModal: () => setIsExportModalOpen(false),
        closeRoleAssignmentModal: () => setIsRoleAssignmentModalOpen(false),
        closeGrantRolesModal: () => setIsGrantRolesModalOpen(false),
    };

    return {
        // Toast
        toasts,
        hideToast,
        showSuccess,
        showError,

        // Permissions
        permissions,

        // User list
        users,
        total,
        loading,
        error,
        currentPage,
        totalPages,
        limit,
        searchTerm,
        filterType,
        filterStatus,
        setSearchTerm,
        setFilterType,
        setFilterStatus,
        setCurrentPage,
        refreshUsers,

        // Modals
        modals,

        // Actions
        isCreating: userManagement.isCreating,
        isUpdating: userManagement.isUpdating,
        isDeleting: userManagement.isDeleting,
        handleCreateUser: userManagement.handleCreateUser,
        handleUpdateUser,
        handleDeleteUser: userManagement.confirmDeleteUser,
        handleBulkDelete,

        // Import/Export
        importConfig,
        handleExport,
    };
};

export default useUsersPage;
