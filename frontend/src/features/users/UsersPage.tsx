import React from "react";
import { Plus, Upload } from "lucide-react";
import { useTranslation } from "react-i18next";
import {
  Toast,
  AddDropdownButton,
  DropdownOption,
  ImportModal,
  useUserList,
  UserTableWithFilter,
  useToast,
} from "../../shared";
import CreateUserModal from "./components/CreateUserModal";
import ViewUserModal from "./components/ViewUserModal";
import EditUserModal from "./components/EditUserModal";
import DeleteConfirmModal from "./components/DeleteConfirmModal";
import { useUserImportConfig } from "./hooks/useUserImportConfig";
import { useUserModals } from "./hooks/useUserModals";
import { useUserActions } from "./hooks/useUserActions";

const Users: React.FC = () => {
  const { t } = useTranslation(['users', 'common']);
  // Toast notifications
  const { toasts, hideToast, showSuccess, showError } = useToast();

  // Custom hooks for user management
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
    isCreating,
    isUpdating,
    isDeleting,
  } = userListHook;

  // Modal management
  const modalsHook = useUserModals();
  const {
    selectedUser,
    isCreateModalOpen,
    isViewModalOpen,
    isEditModalOpen,
    isDeleteModalOpen,
    openCreateModal,
    closeModal,
  } = modalsHook;
  // User actions
  const {
    handleCreateUser,
    handleViewUser,
    handleEditUser,
    handleUpdateUser,
    handleDeleteUser,
    confirmDeleteUser,
  } = useUserActions({
    userListHook,
    modalsHook,
    showSuccess,
    showError
  });

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
        }}
        tableProps={{
          onUserView: handleViewUser,
          onUserEdit: handleEditUser,
          onUserDelete: handleDeleteUser,
        }} onRetry={refreshUsers}
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