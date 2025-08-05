import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useToast } from '../../shared/hooks';
import { Toast } from '../../shared';
import {
  useRoleModals,
  useSearchFilters,
  useRoleList,
  useBulkSelection,
  useRoleActions
} from './hooks';
import CreateRoleModal from './components/CreateRoleModal';
import ViewRoleModal from './components/ViewRoleModal';
import EditRoleModal from './components/EditRoleModal';
import DeleteConfirmModal from './components/DeleteConfirmModal';
import BulkDeleteConfirmModal from './components/BulkDeleteConfirmModal';
import PageHeader from './components/PageHeader';
import SearchFilters from './components/SearchFilters';
import RolesTable from './components/RolesTable';
import Pagination from './components/Pagination';
import { LoadingState, ErrorState } from './components/PageStates';

const PermissionsPage: React.FC = () => {
  const { toasts, hideToast, showSuccess, showError, showWarning } = useToast();

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [limit] = useState(10);

  // Initialize hooks
  const modalsHook = useRoleModals();
  const searchFiltersHook = useSearchFilters(() => setCurrentPage(1));
  const roleListHook = useRoleList({
    searchTerm: searchFiltersHook.debouncedSearchTerm,
    statusFilter: searchFiltersHook.statusFilter,
    page: currentPage,
    limit
  });
  const bulkSelectionHook = useBulkSelection(
    roleListHook.roles,
    (role) => !role.isSystemRole
  ); const actionsHook = useRoleActions({
    roleListHook,
    modalsHook,
    bulkSelectionHook,
    showSuccess,
    showError,
    showWarning
  });

  // Maintain focus after search results update
  useEffect(() => {
    const { searchTerm, searchInputRef } = searchFiltersHook;
    const { loading } = roleListHook;

    if (searchTerm && document.activeElement !== searchInputRef.current) {
      const wasSearching = searchTerm.length > 0;
      if (wasSearching && !loading) {
        setTimeout(() => {
          if (searchInputRef.current && searchTerm) {
            searchInputRef.current.focus();
          }
        }, 0);
      }
    }
  }, [roleListHook.roles, roleListHook.loading, searchFiltersHook.searchTerm, searchFiltersHook.searchInputRef]);

  // Early returns for loading and error states
  if (roleListHook.loading && roleListHook.roles.length === 0) {
    return <LoadingState />;
  }

  if (roleListHook.error) {
    return <ErrorState error={roleListHook.error} onRetry={roleListHook.loadRoles} />;
  } return (
    <div className="space-y-6">
      {/* Header */}
      <PageHeader
        selectedCount={bulkSelectionHook.getSelectedCount()}
        onCreateClick={actionsHook.handleCreateRole}
        onBulkDeleteClick={actionsHook.handleBulkDelete}
        loading={roleListHook.loading}
      />

      {/* Filters */}
      <SearchFilters
        searchFilters={searchFiltersHook}
        currentPage={currentPage}
        setCurrentPage={setCurrentPage}
      />

      {/* Roles Table */}
      <RolesTable
        roles={roleListHook.roles}
        loading={roleListHook.loading}
        bulkSelection={bulkSelectionHook}
        searchTerm={searchFiltersHook.debouncedSearchTerm}
        onView={actionsHook.handleViewRole}
        onEdit={actionsHook.handleEditRole}
        onDelete={actionsHook.handleDeleteRole}
        onClearSearch={searchFiltersHook.handleClearSearch}
      />

      {/* Pagination */}
      <Pagination
        currentPage={currentPage}
        totalPages={roleListHook.totalPages}
        total={roleListHook.total}
        limit={limit}
        onPageChange={setCurrentPage}
      />

      {/* Modals */}      <CreateRoleModal
        isOpen={modalsHook.isCreateModalOpen}
        onClose={modalsHook.closeModal}
        onSubmit={actionsHook.handleCreateSuccess}
      />

      <ViewRoleModal
        isOpen={modalsHook.isViewModalOpen}
        onClose={modalsHook.closeModal}
        role={modalsHook.selectedRole}
      />

      <EditRoleModal
        isOpen={modalsHook.isEditModalOpen}
        onClose={modalsHook.closeModal}
        onSubmit={actionsHook.handleEditSuccess}
        role={modalsHook.selectedRole}
      />

      <DeleteConfirmModal
        isOpen={modalsHook.isDeleteModalOpen}
        onClose={modalsHook.closeModal}
        onConfirm={actionsHook.handleDeleteConfirm}
        role={modalsHook.selectedRole}
      />

      <BulkDeleteConfirmModal
        isOpen={modalsHook.isBulkDeleteModalOpen}
        onClose={modalsHook.closeModal}
        onConfirm={actionsHook.handleBulkDeleteConfirm} count={bulkSelectionHook.getSelectedCount()}
        loading={roleListHook.loading}
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

export default PermissionsPage;
