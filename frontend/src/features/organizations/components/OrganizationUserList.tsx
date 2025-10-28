import React from 'react';
import { useTranslation } from 'react-i18next';
import { UserTableWithFilter, useToast, Toast, useUserManagement } from '../../../shared';
import { useOrganizationUserList } from '../hooks/useOrganizationUserList';
import { Organization } from '../../../shared/types/organization';
import { User } from '../../../shared/types/user';
import { organizationService } from '../../../shared/services/organizationService';
import { userService } from '../../../shared/services/userService';
// Import modals from users feature
import ViewUserModal from '../../users/components/ViewUserModal';
import EditUserModal from '../../users/components/EditUserModal';
import DeleteConfirmModal from '../../users/components/DeleteConfirmModal';

interface OrganizationUserListProps {
    organization: Organization;
    onRefresh?: () => void;
    onShowSuccess?: (message: string) => void;
    onShowError?: (message: string) => void;
}

export const OrganizationUserList: React.FC<OrganizationUserListProps> = ({
    organization,
    onRefresh,
    onShowSuccess,
    onShowError,
}) => {
    const { t } = useTranslation(['organizations', 'users', 'common']);    // Use parent toast handlers if provided, otherwise fallback to local toast
    const { toasts, hideToast, showSuccess: localShowSuccess, showError: localShowError } = useToast();
    const showSuccess = onShowSuccess || localShowSuccess;
    const showError = onShowError || localShowError;    // Organization user list data
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
    } = useOrganizationUserList(organization.id);// Custom delete handler for organization context (remove from org)
    const handleRemoveFromOrganization = async (user: User) => {
        try {
            await organizationService.removeUserFromOrganization(organization.id, user.id);

            // Show success message immediately since we're using parent toast
            showSuccess(t('organizations:messages.success.removeMember'));

            // Refresh data
            await refreshUsers();
            // ✅ Refresh organization tree to update member stats
            if (onRefresh) {
                await onRefresh();
            }
        } catch (error) {
            showError(t('organizations:messages.error.removeMember'));
            console.error('Error removing user from organization:', error);
        }
    };    // Bulk remove users from organization
    const handleBulkRemoveFromOrganization = async (userIds: string[]) => {
        try {
            await organizationService.removeUsersFromOrganization(organization.id, userIds);            // Show success message immediately since we're using parent toast
            showSuccess(t('organizations:messages.success.bulkRemoveMembers', {
                count: userIds.length
            }));

            // Refresh data
            await refreshUsers();
            // ✅ Refresh organization tree to update member stats
            if (onRefresh) {
                await onRefresh();
            }

            console.log('Bulk remove process completed');
        } catch (error) {
            console.error('Error in bulk remove:', error);
            showError(t('organizations:messages.error.bulkRemoveMembers'));
            console.error('Error bulk removing users from organization:', error);
        }
    };    // Combined refresh handler for both local data and parent org tree
    const handleDataRefresh = async () => {
        await refreshUsers();
        // ✅ Also refresh organization tree to update member stats  
        if (onRefresh) {
            await onRefresh();
        }
    };

    // User management with custom organization context - ✅ Using shared hook
    const userManagement = useUserManagement({
        showSuccess,
        showError,
        onRefreshData: handleDataRefresh, // ✅ Use combined refresh handler
        // No create/update for organization context, only view and remove
        updateUser: userService.updateUser.bind(userService),
        customDeleteHandler: handleRemoveFromOrganization,
        customDeleteSuccessMessage: t('organizations:messages.success.removeMember'),
        customDeleteErrorMessage: t('organizations:messages.error.removeMember'),
    });

    const {
        selectedUser,
        isViewModalOpen,
        isEditModalOpen,
        isDeleteModalOpen,
        isUpdating,
        isDeleting,
        closeModal,
        handleViewUser,
        handleEditUser,
        handleDeleteUser,
        handleUpdateUser,
        confirmDeleteUser,
    } = userManagement;

    return (
        <div className="space-y-6">
            <div className="bg-white border border-gray-200 rounded-lg shadow-sm p-6 dark:bg-gray-800 dark:border-gray-700">
                <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-6 sm:gap-10">

                    {/* Left: Tên tổ chức và subtitle */}
                    <div className="flex-1">
                        <h2 className="text-2xl font-semibold text-gray-900 dark:text-white leading-snug">
                            {t('organizations:members.title', { organizationName: organization.name })}
                        </h2>
                        <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
                            {t('organizations:members.subtitle')} • {total} {t('organizations:members.members')}
                        </p>
                    </div>

                    {/* Right: Mã & Loại tổ chức */}
                    <div className="flex flex-col items-start sm:items-end gap-2 text-sm">
                        <div className="px-3 py-1 bg-gray-100 dark:bg-gray-700 rounded-lg">
                            <span className="text-gray-500 dark:text-gray-400 font-medium mr-1">
                                {t('organizations:fields.code')}:
                            </span>
                            <span className="text-gray-700 dark:text-gray-200 font-semibold">
                                {organization.code}
                            </span>
                        </div>
                        <div className="px-3 py-1 bg-gray-100 dark:bg-gray-700 rounded-lg">
                            <span className="text-gray-500 dark:text-gray-400 font-medium mr-1">
                                {t('organizations:fields.type')}:
                            </span>
                            <span className="text-gray-700 dark:text-gray-200 font-semibold">
                                {t(`organizations:types.${organization.type}`)}
                            </span>
                        </div>
                    </div>

                </div>
            </div>

            {/* User Table */}
            <UserTableWithFilter
                users={users}
                loading={loading}
                error={error}
                filterProps={{
                    searchTerm,
                    filterType,
                    filterStatus,
                    onSearchChange: setSearchTerm,
                    onTypeChange: setFilterType,
                    onStatusChange: setFilterStatus,
                    showAdvancedFilters: true,
                }}
                paginationProps={{
                    currentPage,
                    totalPages,
                    total,
                    limit,
                    onPageChange: setCurrentPage,
                }} tableProps={{
                    onUserView: handleViewUser,
                    onUserEdit: handleEditUser,
                    onUserDelete: handleDeleteUser, // This will be "remove from org"
                    onBulkDelete: handleBulkRemoveFromOrganization,
                    showSelection: true,
                    actionConfig: {
                        showView: true,
                        showEdit: true, // Can edit user info
                        showDelete: true, // "Remove from organization"
                    },
                    emptyMessage: t('organizations:members.noMembers'),
                }}
                onRetry={refreshUsers}
                showFilters={true}
                showPagination={true}
            />

            {/* Modals - Same as UsersPage */}
            <ViewUserModal
                isOpen={isViewModalOpen}
                onClose={closeModal}
                user={selectedUser}
            />

            <EditUserModal
                isOpen={isEditModalOpen}
                onClose={closeModal}
                onSubmit={handleUpdateUser}
                user={selectedUser}
                loading={isUpdating}
            />

            <DeleteConfirmModal
                isOpen={isDeleteModalOpen}
                onClose={closeModal}
                onConfirm={confirmDeleteUser}
                user={selectedUser}
                loading={isDeleting}
            />            {/* Toast Notifications - Only show if using local toast (no parent handlers) */}
            <div className="fixed top-4 right-4 z-[9999]">
                {!onShowSuccess && !onShowError && toasts.map((toast) => {
                    console.log('Rendering toast:', toast);
                    return (
                        <Toast
                            key={toast.id}
                            type={toast.type}
                            message={toast.message}
                            duration={toast.duration}
                            onClose={() => hideToast(toast.id)}
                        />
                    );
                })}
            </div>
        </div>
    );
};