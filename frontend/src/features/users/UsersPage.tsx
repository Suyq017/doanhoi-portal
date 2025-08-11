import React, { useState } from "react";
import { Plus, Upload, Download, Shield, UserPlus } from "lucide-react";
import { useTranslation } from "react-i18next";
import {
  Toast,
  AddDropdownButton,
  DropdownOption,
  ImportModal,
  useUserList,
  UserTableWithFilter,
  useToast,
  useUserManagement,
  usePermissions,
  ConditionalRender,
  createPermissionBasedDropdownOptions,
  PermissionBasedDropdownOption,
  createTableActions,
  CreateUserRequest,
} from "../../shared";
import { ExportModal, useExport, USER_EXPORT_FIELDS } from "../../shared/components/export";
import { userService } from "../../shared/services/userService";
import CreateUserModal from "./components/CreateUserModal";
import ViewUserModal from "./components/ViewUserModal";
import EditUserModal from "./components/EditUserModal";
import DeleteConfirmModal from "./components/DeleteConfirmModal";
import UserRoleAssignmentModal from "./components/UserRoleAssignmentModal";
import GrantRolesModal from "./components/GrantRolesModal";
import { useUserImportConfig } from "./hooks/useUserImportConfig";
import { useUserPagePermissions } from "./hooks/useUserPagePermissions";

const Users: React.FC = () => {
  const { t } = useTranslation(['users', 'common']);
  const permissions = usePermissions();
  const userPermissions = useUserPagePermissions();

  // All hooks must be called at the top level
  // Toast notifications
  const { toasts, hideToast, showSuccess, showError } = useToast();

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
  // User management (modals + actions) - Using shared hook
  const userManagement = useUserManagement({
    showSuccess,
    showError,
    onRefreshData: refreshUsers,
    createUser: userService.createUser.bind(userService),
    updateUser: userService.updateUser.bind(userService),
    deleteUser: userService.deleteUser.bind(userService),
  });

  // Custom handleUpdateUser that doesn't auto-close modal or show success message
  // This allows EditUserModal to handle role assignments and manage success/error states
  const customHandleUpdateUser = async (userData: CreateUserRequest) => {
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

  // Export functionality
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const { exportData } = useExport({
    onSuccess: (fileName) => {
      showSuccess(`Xuất file thành công: ${fileName}`);
      setIsExportModalOpen(false);
    },
    onError: (error) => {
      showError(`Lỗi xuất file: ${error}`);
    },
  }); const {
    selectedUser,
    isCreateModalOpen,
    isViewModalOpen,
    isEditModalOpen,
    isDeleteModalOpen,
    isCreating,
    isUpdating,
    isDeleting,
    openCreateModal,
    closeModal,
    handleViewUser,
    handleEditUser,
    handleDeleteUser,
    handleCreateUser,
    confirmDeleteUser,
  } = userManagement;// Import functionality
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [isRoleAssignmentModalOpen, setIsRoleAssignmentModalOpen] = useState(false);
  const [isGrantRolesModalOpen, setIsGrantRolesModalOpen] = useState(false);
  const { importConfig } = useUserImportConfig({ onRefreshData: refreshUsers });

  // Page-level access control (after all hooks are called)
  if (!permissions.canAccessUsers()) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <Shield className="w-16 h-16 mx-auto mb-4 text-gray-400" />
          <h3 className="mb-2 text-lg font-medium text-gray-900 dark:text-white">
            {t('common:errors.accessDenied')}
          </h3>
          <p className="mb-4 text-gray-500 dark:text-gray-400">
            {t('common:errors.noPermissionToAccess')}
          </p>
          <button
            onClick={() => window.history.back()}
            className="px-4 py-2 text-gray-700 transition-colors bg-gray-100 rounded-md hover:bg-gray-200"
          >
            {t('common:actions.goBack')}
          </button>        </div>
      </div>
    );
  }

  const handleExport = async (fields: string[]) => {
    await exportData(fields, 'users');
  };

  // Bulk delete functionality
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
  };  // Filter dropdown options based on permissions
  const getFilteredDropdownOptions = (): DropdownOption[] => {
    const baseOptions: PermissionBasedDropdownOption[] = [
      {
        key: 'single',
        label: t('users:addButton.single', { defaultValue: t('common:actions.create') }),
        icon: <Plus className="w-4 h-4" />,
        description: t('users:addButton.singleDesc', { defaultValue: 'Tạo người dùng mới bằng form' }),
        onClick: openCreateModal,
        requiredPermission: 'canCreate'
      },
      {
        key: 'fromFile',
        label: t('users:addButton.fromFile', { defaultValue: 'Import từ file Excel' }),
        icon: <Upload className="w-4 h-4" />,
        description: t('users:addButton.fromFileDesc', { defaultValue: 'Import nhiều người dùng từ file Excel' }),
        onClick: () => setIsImportModalOpen(true),
        requiredPermission: 'canCreate'
      },
      {
        key: 'export',
        label: t('users:addButton.export', { defaultValue: 'Xuất dữ liệu' }),
        icon: <Download className="w-4 h-4" />,
        description: t('users:addButton.exportDesc', { defaultValue: 'Xuất danh sách người dùng ra file Excel' }),
        onClick: () => setIsExportModalOpen(true),
        requiredPermission: 'canExport'
      }
    ];

    return createPermissionBasedDropdownOptions(
      baseOptions,
      (permission: string) => {
        const permissionKey = permission as keyof typeof userPermissions;
        return userPermissions[permissionKey] === true;
      }
    );
  }; const addDropdownOptions = getFilteredDropdownOptions();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            {t('users:title')}
          </h1>
          <p className="mt-2 text-gray-600 dark:text-gray-400">
            {t('users:subtitle')}
          </p>        </div>        <div className="flex items-center mt-4 space-x-3 sm:mt-0">          {/* Grant Roles Button */}
          <button
            onClick={() => setIsGrantRolesModalOpen(true)}
            className="inline-flex items-center px-4 py-2 text-white transition-colors duration-200 rounded-md bg-doan-600 hover:bg-doan-700 focus:outline-none focus:ring-2 focus:ring-doan-500 focus:ring-offset-2"
          >
            <Shield className="w-5 h-5 mr-2" />
            <span className="font-medium">
              {t('users:actions.grantRoles', { defaultValue: 'Cấp vai trò' })}
            </span>
          </button>

          {/* Role Assignment Button */}
          <ConditionalRender condition={userPermissions.canManageRoles}>
            <button
              onClick={() => setIsRoleAssignmentModalOpen(true)}
              className="inline-flex items-center px-4 py-2 transition-colors border rounded-md border-doan-600 text-doan-600 hover:bg-doan-50 dark:hover:bg-doan-900/20"
            >
              <UserPlus className="w-4 h-4 mr-2" />
              {t('users:actions.assignRoles')}
            </button>
          </ConditionalRender>

          {/* Add User Dropdown */}
          <ConditionalRender condition={addDropdownOptions.length > 0}>
            <AddDropdownButton
              label={t('users:addButton.dropdown', { defaultValue: t('common:actions.create') })}
              options={addDropdownOptions}
              loading={isCreating}
            />
          </ConditionalRender>
        </div>
      </div>      
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
        }} tableProps={{
          onUserView: handleViewUser,
          onUserEdit: handleEditUser,
          onUserDelete: handleDeleteUser,
          onBulkDelete: handleBulkDelete,
          showSelection: userPermissions.showBulkActions,
          actions: createTableActions(userPermissions),
        }}
        permissions={{
          canView: userPermissions.canView,
          canEdit: userPermissions.canEdit,
          canDelete: userPermissions.canDelete,
          showBulkActions: userPermissions.showBulkActions,
        }}
        onRetry={refreshUsers}
      />

      {/* Modals */}
      <CreateUserModal
        isOpen={isCreateModalOpen}
        onClose={closeModal}
        onSubmit={handleCreateUser}
        loading={isCreating}
      />      <ViewUserModal
        isOpen={isViewModalOpen}
        onClose={closeModal}
        user={selectedUser}
      />      <EditUserModal
        isOpen={isEditModalOpen}
        onClose={closeModal}
        onSubmit={customHandleUpdateUser}
        user={selectedUser}
        loading={isUpdating}
        showSuccess={showSuccess}
        showError={showError}
        onRefreshData={refreshUsers}
      /><DeleteConfirmModal
        isOpen={isDeleteModalOpen}
        onClose={closeModal}
        onConfirm={confirmDeleteUser}
        user={selectedUser}
        loading={isDeleting}
      />

      <ImportModal
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
        config={importConfig}
      />      <ExportModal
        isOpen={isExportModalOpen}
        onClose={() => setIsExportModalOpen(false)}
        onExport={handleExport}
        title="Xuất danh sách người dùng"
        description="Chọn các trường dữ liệu bạn muốn xuất ra file Excel"
        availableFields={USER_EXPORT_FIELDS}
      />      <UserRoleAssignmentModal
        isOpen={isRoleAssignmentModalOpen}
        onClose={() => setIsRoleAssignmentModalOpen(false)}
        onSuccess={() => {
          showSuccess(t('users:messages.assignRolesSuccess'));
          refreshUsers();
        }}
      />      <GrantRolesModal
        isOpen={isGrantRolesModalOpen}
        onClose={() => setIsGrantRolesModalOpen(false)}
        onSuccess={() => {
          showSuccess(t('users:messages.grantRolesSuccess', { defaultValue: 'Cấp vai trò thành công' }));
          refreshUsers();
        }}
      />

      {/* Toast Notifications */}
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
  );
};

export default Users;