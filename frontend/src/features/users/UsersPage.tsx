import React, { useState } from "react";
import { Plus, Upload, Download } from "lucide-react";
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
} from "../../shared";
import { ExportModal, useExport, USER_EXPORT_FIELDS } from "../../shared/components/export";
import { userService } from "../../shared/services/userService";
import CreateUserModal from "./components/CreateUserModal";
import ViewUserModal from "./components/ViewUserModal";
import EditUserModal from "./components/EditUserModal";
import DeleteConfirmModal from "./components/DeleteConfirmModal";
import { useUserImportConfig } from "./hooks/useUserImportConfig";

const Users: React.FC = () => {
  const { t } = useTranslation(['users', 'common']);

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
  // User management (modals + actions) - ✅ Using shared hook
  const userManagement = useUserManagement({
    showSuccess,
    showError,
    onRefreshData: refreshUsers,
    createUser: userService.createUser.bind(userService),
    updateUser: userService.updateUser.bind(userService),
    deleteUser: userService.deleteUser.bind(userService),
  });

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
  });

  const handleExport = async (fields: string[]) => {
    await exportData(fields, 'users');
  };

  const {
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
    handleUpdateUser,
    confirmDeleteUser,
  } = userManagement;

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
  };

  // Import configuration
  const {
    importConfig,
    isImportModalOpen,
    openImportModal,
    closeImportModal
  } = useUserImportConfig({ onRefreshData: refreshUsers });

  const addDropdownOptions: DropdownOption[] = [
    {
      key: 'single',
      label: t('users:addButton.single', { defaultValue: t('common:actions.create') }),
      icon: <Plus className="w-4 h-4" />,
      description: t('users:addButton.singleDesc', { defaultValue: 'Tạo người dùng mới bằng form' }),
      onClick: openCreateModal
    },
    {
      key: 'fromFile',
      label: t('users:addButton.fromFile', { defaultValue: 'Import từ file Excel' }),
      icon: <Upload className="w-4 h-4" />,
      description: t('users:addButton.fromFileDesc', { defaultValue: 'Import nhiều người dùng từ file Excel' }),
      onClick: openImportModal
    },
    {
      key: 'export',
      label: t('users:addButton.export', { defaultValue: 'Xuất dữ liệu' }),
      icon: <Download className="w-4 h-4" />,
      description: t('users:addButton.exportDesc', { defaultValue: 'Xuất danh sách người dùng ra file Excel' }),
      onClick: () => setIsExportModalOpen(true)
    }
  ];

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
          </p>
        </div>
        <div className="mt-4 sm:mt-0">
          <AddDropdownButton
            label={t('users:addButton.dropdown', { defaultValue: t('common:actions.create') })}
            options={addDropdownOptions}
            loading={isCreating}
          />
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
          showSelection: true,
        }}
        onRetry={refreshUsers}
      />

      {/* Modals */}
      <CreateUserModal
        isOpen={isCreateModalOpen}
        onClose={closeModal}
        onSubmit={handleCreateUser}
        loading={isCreating}
      />

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
      />

      <ImportModal
        isOpen={isImportModalOpen}
        onClose={closeImportModal}
        config={importConfig}
      />

      <ExportModal
        isOpen={isExportModalOpen}
        onClose={() => setIsExportModalOpen(false)}
        onExport={handleExport}
        title="Xuất danh sách người dùng"
        description="Chọn các trường dữ liệu bạn muốn xuất ra file Excel"
        availableFields={USER_EXPORT_FIELDS}
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