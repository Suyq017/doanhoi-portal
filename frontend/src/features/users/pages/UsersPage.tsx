/**
 * UsersPage - Refactored users page with separation of concerns
 * 
 * Principles applied:
 * 1. Separation of Concerns: Logic in hooks, UI in components
 * 2. Reusable Components: Composed from smaller, reusable pieces
 * 3. Custom Hooks: useUsersPage consolidates all state management
 * 4. Type Safety: Strong typing for all props and return values
 */

import React from 'react';
import { useTranslation } from 'react-i18next';
import {
    Toast,
    usePermissions,
    ImportModal,
    UserTableWithFilter,
    createTableActions,
} from '../../../shared';
import { ExportModal, USER_EXPORT_FIELDS } from '../../../shared/components/export';

// Hooks
import { useUsersPage } from '../hooks';

// Components
import {
    UserPageHeader,
    AccessDeniedState,
    CreateUserModal,
    ViewUserModal,
    EditUserModal,
    DeleteConfirmModal,
    UserRoleAssignmentModal,
    GrantRolesModal,
} from '../components';

/**
 * Main UsersPage component
 */
const UsersPage: React.FC = () => {
    const { t } = useTranslation(['users', 'common']);
    const globalPermissions = usePermissions();

    // Use unified page hook for all state management
    const {
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
        isCreating,
        isUpdating,
        isDeleting,
        handleCreateUser,
        handleUpdateUser,
        handleDeleteUser,
        handleBulkDelete,

        // Import/Export
        importConfig,
        handleExport,
    } = useUsersPage();

    // Page-level access control
    if (!globalPermissions.canAccessUsers()) {
        return <AccessDeniedState />;
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <UserPageHeader
                onCreateClick={modals.openCreateModal}
                onImportClick={modals.openImportModal}
                onExportClick={modals.openExportModal}
                onGrantRolesClick={modals.openGrantRolesModal}
                onAssignRolesClick={modals.openRoleAssignmentModal}
                isCreating={isCreating}
                permissions={permissions}
            />

            {/* User Table with Filters */}
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
                }}
                paginationProps={{
                    currentPage,
                    totalPages,
                    total,
                    limit,
                    onPageChange: setCurrentPage,
                }}
                tableProps={{
                    onUserView: modals.openViewModal,
                    onUserEdit: modals.openEditModal,
                    onUserDelete: modals.openDeleteModal,
                    onBulkDelete: handleBulkDelete,
                    showSelection: permissions.showBulkActions,
                    actions: createTableActions(permissions),
                }}
                permissions={{
                    canView: permissions.canView,
                    canEdit: permissions.canEdit,
                    canDelete: permissions.canDelete,
                    showBulkActions: permissions.showBulkActions,
                }}
                onRetry={refreshUsers}
            />

            {/* Modals */}
            <CreateUserModal
                isOpen={modals.isCreateModalOpen}
                onClose={modals.closeModal}
                onSubmit={handleCreateUser}
                loading={isCreating}
            />

            <ViewUserModal
                isOpen={modals.isViewModalOpen}
                onClose={modals.closeModal}
                user={modals.selectedUser}
            />

            <EditUserModal
                isOpen={modals.isEditModalOpen}
                onClose={modals.closeModal}
                onSubmit={handleUpdateUser}
                user={modals.selectedUser}
                loading={isUpdating}
                showSuccess={showSuccess}
                showError={showError}
                onRefreshData={async () => { refreshUsers(); }}
            />

            <DeleteConfirmModal
                isOpen={modals.isDeleteModalOpen}
                onClose={modals.closeModal}
                onConfirm={handleDeleteUser}
                user={modals.selectedUser}
                loading={isDeleting}
            />

            <ImportModal
                isOpen={modals.isImportModalOpen}
                onClose={modals.closeImportModal}
                config={importConfig}
            />

            <ExportModal
                isOpen={modals.isExportModalOpen}
                onClose={modals.closeExportModal}
                onExport={handleExport}
                title={t('users:export.title', { defaultValue: 'Xuất danh sách người dùng' })}
                description={t('users:export.description', { defaultValue: 'Chọn các trường dữ liệu bạn muốn xuất ra file Excel' })}
                availableFields={USER_EXPORT_FIELDS}
            />

            <UserRoleAssignmentModal
                isOpen={modals.isRoleAssignmentModalOpen}
                onClose={modals.closeRoleAssignmentModal}
                onSuccess={() => {
                    showSuccess(t('users:messages.assignRolesSuccess'));
                    refreshUsers();
                }}
            />

            <GrantRolesModal
                isOpen={modals.isGrantRolesModalOpen}
                onClose={modals.closeGrantRolesModal}
                onSuccess={() => {
                    showSuccess(t('users:messages.grantRolesSuccess', { defaultValue: 'Cấp vai trò thành công' }));
                    refreshUsers();
                }}
            />

            {/* Toast Notifications */}
            <div className="fixed top-4 right-4 z-[9999]">
                {toasts.map((toast) => (
                    <Toast
                        key={toast.id}
                        type={toast.type}
                        message={toast.message}
                        duration={toast.duration}
                        onClose={() => hideToast(toast.id)}
                    />
                ))}
            </div>
        </div>
    );
};

export default UsersPage;
