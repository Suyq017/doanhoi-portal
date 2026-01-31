/**
 * PermissionsPage - Refactored permissions page with separation of concerns
 * 
 * Principles applied:
 * 1. Separation of Concerns: Logic in hooks, UI in components
 * 2. Reusable Components: Composed from smaller, reusable pieces
 * 3. Custom Hooks: usePermissionsPage consolidates all state management
 * 4. Type Safety: Strong typing for all props and return values
 */

import React from 'react';
import { Toast } from '../../../shared';
import { usePermissionsPage } from '../hooks';

// Components
import CreateRoleModal from '../components/CreateRoleModal';
import ViewRoleModal from '../components/ViewRoleModal';
import EditRoleModal from '../components/EditRoleModal';
import DeleteConfirmModal from '../components/DeleteConfirmModal';
import BulkDeleteConfirmModal from '../components/BulkDeleteConfirmModal';
import PageHeader from '../components/PageHeader';
import SearchFilters from '../components/SearchFilters';
import RolesTable from '../components/RolesTable';
import Pagination from '../components/Pagination';
import { LoadingState, ErrorState } from '../components/PageStates';

/**
 * Main PermissionsPage component
 */
const PermissionsPage: React.FC = () => {
  // Use unified page hook for all state management
  const {
    // Toast
    toasts,
    hideToast,

    // Pagination
    currentPage,
    limit,
    setCurrentPage,

    // Role list data
    roles,
    totalPages,
    total,
    loading,
    error,
    refreshRoles,

    // Hooks
    searchFilters,
    bulkSelection,
    modals,
    actions,
  } = usePermissionsPage();

  // Early returns for loading and error states
  if (loading && roles.length === 0) {
    return <LoadingState />;
  }

  if (error) {
    return <ErrorState error={error} onRetry={refreshRoles} />;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <PageHeader
        selectedCount={bulkSelection.getSelectedCount()}
        onCreateClick={actions.handleCreateRole}
        onBulkDeleteClick={actions.handleBulkDelete}
        loading={loading}
      />

      {/* Filters */}
      <SearchFilters
        searchFilters={searchFilters}
        currentPage={currentPage}
        setCurrentPage={setCurrentPage}
      />

      {/* Roles Table */}
      <RolesTable
        roles={roles}
        loading={loading}
        bulkSelection={bulkSelection}
        searchTerm={searchFilters.debouncedSearchTerm}
        onView={actions.handleViewRole}
        onEdit={actions.handleEditRole}
        onDelete={actions.handleDeleteRole}
        onClearSearch={searchFilters.handleClearSearch}
      />

      {/* Pagination */}
      <Pagination
        currentPage={currentPage}
        totalPages={totalPages}
        total={total}
        limit={limit}
        onPageChange={setCurrentPage}
      />

      {/* Modals */}
      <CreateRoleModal
        isOpen={modals.isCreateModalOpen}
        onClose={modals.closeModal}
        onSubmit={actions.handleCreateSuccess}
      />

      <ViewRoleModal
        isOpen={modals.isViewModalOpen}
        onClose={modals.closeModal}
        role={modals.selectedRole}
      />

      <EditRoleModal
        isOpen={modals.isEditModalOpen}
        onClose={modals.closeModal}
        onSubmit={actions.handleEditSuccess}
        role={modals.selectedRole}
      />

      <DeleteConfirmModal
        isOpen={modals.isDeleteModalOpen}
        onClose={modals.closeModal}
        onConfirm={actions.handleDeleteConfirm}
        role={modals.selectedRole}
      />

      <BulkDeleteConfirmModal
        isOpen={modals.isBulkDeleteModalOpen}
        onClose={modals.closeModal}
        onConfirm={actions.handleBulkDeleteConfirm}
        count={bulkSelection.getSelectedCount()}
        loading={loading}
      />

      {/* Toast Notifications */}
      <div className="fixed top-4 right-4 z-[9999] space-y-2 pointer-events-none">
        <div className="space-y-2 pointer-events-auto">
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
    </div>
  );
};

export default PermissionsPage;
