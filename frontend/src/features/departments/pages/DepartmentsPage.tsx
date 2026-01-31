/**
 * DepartmentsPage - Refactored departments page with separation of concerns
 * 
 * Principles applied:
 * 1. Separation of Concerns: Logic in hooks, UI in components
 * 2. Reusable Components: Composed from smaller, reusable pieces
 * 3. Custom Hooks: useDepartmentPage, useDepartmentModals, useDepartmentImport
 * 4. Type Safety: Strong typing for all props and return values
 */

import React from 'react';
import { useTranslation } from 'react-i18next';
import {
  Toast,
  useToast,
  ImportModal,
  ConfirmDialog,
} from '../../../shared';

// Hooks
import { useDepartmentPage, useDepartmentModals, useDepartmentImport } from '../hooks';

// Components
import {
  DepartmentPageHeader,
  DepartmentFilters,
  BulkActionsToolbar,
  DepartmentTable,
  DepartmentPagination,
} from '../components';

// Modals
import CreateDepartmentModal from '../components/CreateDepartmentModal';
import ViewDepartmentModal from '../components/ViewDepartmentModal';
import EditDepartmentModal from '../components/EditDepartmentModal';
import DeleteConfirmModal from '../components/DeleteConfirmModal';

/**
 * Loading state component
 */
const LoadingState: React.FC<{ title: string; subtitle: string }> = ({ title, subtitle }) => {
  const { t } = useTranslation(['common']);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">{title}</h1>
          <p className="mt-2 text-gray-600 dark:text-gray-400">{subtitle}</p>
        </div>
      </div>
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="w-12 h-12 mx-auto border-b-2 rounded-full animate-spin border-doan-600"></div>
          <p className="mt-4 text-gray-600 dark:text-gray-400">{t('common:states.loading')}</p>
        </div>
      </div>
    </div>
  );
};

/**
 * Error state component
 */
const ErrorState: React.FC<{
  title: string;
  subtitle: string;
  error: string;
  onRetry: () => void;
}> = ({ title, subtitle, error, onRetry }) => {
  const { t } = useTranslation(['common']);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">{title}</h1>
          <p className="mt-2 text-gray-600 dark:text-gray-400">{subtitle}</p>
        </div>
      </div>
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="mb-4 text-xl text-red-500">⚠️</div>
          <p className="text-red-600 dark:text-red-400">{error}</p>
          <button
            onClick={onRetry}
            className="px-4 py-2 mt-4 text-white rounded-lg bg-doan-600 hover:bg-doan-700"
          >
            {t('common:actions.retry')}
          </button>
        </div>
      </div>
    </div>
  );
};

/**
 * Main DepartmentsPage component
 */
const DepartmentsPage: React.FC = () => {
  const { t } = useTranslation(['departments', 'common']);
  const { toasts, hideToast } = useToast();

  // Page state and data management
  const pageState = useDepartmentPage();

  // Modal management
  const modals = useDepartmentModals();

  // Import functionality
  const importState = useDepartmentImport({
    onSuccess: () => {
      pageState.loadDepartments();
    },
  });

  // Page title and subtitle
  const pageTitle = t('departments:title');
  const pageSubtitle = t('departments:subtitle');

  // Loading state
  if (pageState.loading) {
    return <LoadingState title={pageTitle} subtitle={pageSubtitle} />;
  }

  // Error state
  if (pageState.error) {
    return (
      <ErrorState
        title={pageTitle}
        subtitle={pageSubtitle}
        error={pageState.error}
        onRetry={pageState.loadDepartments}
      />
    );
  }

  // Handle modal submit actions with CRUD from pageState
  const handleCreateSubmit = async (data: any) => {
    await pageState.handleCreate(data);
    modals.closeCreateModal();
  };

  const handleUpdateSubmit = async (data: any) => {
    if (modals.selectedDepartment) {
      await pageState.handleUpdate(modals.selectedDepartment.id, data);
      modals.closeEditModal();
    }
  };

  const handleDeleteConfirm = async () => {
    if (modals.selectedDepartment) {
      await pageState.handleDelete(modals.selectedDepartment.id);
      modals.closeDeleteModal();
    }
  };

  const handleBulkDeleteConfirm = async () => {
    await pageState.handleBulkDelete();
    modals.closeBulkDeleteModal();
  };

  return (
    <div className="space-y-6">
      {/* Header with Add Dropdown */}
      <DepartmentPageHeader
        loading={pageState.isCreating}
        onAddSingle={modals.openCreateModal}
        onAddFromFile={importState.openImportModal}
      />

      {/* Search and Filters */}
      <DepartmentFilters
        searchTerm={pageState.searchTerm}
        filterStatus={pageState.filterStatus}
        onSearchChange={pageState.setSearchTerm}
        onStatusChange={pageState.setFilterStatus}
      />

      {/* Bulk Actions Toolbar */}
      {pageState.isSomeSelected && (
        <BulkActionsToolbar
          selectedCount={pageState.selectedIds.length}
          onClearSelection={pageState.handleClearSelection}
          onBulkDelete={modals.openBulkDeleteModal}
        />
      )}

      {/* Departments Table */}
      <DepartmentTable
        departments={pageState.departments}
        selectedIds={pageState.selectedIds}
        isAllSelected={pageState.isAllSelected}
        loading={pageState.loading}
        onSelectAll={pageState.handleSelectAll}
        onSelectDepartment={pageState.handleSelectDepartment}
        onView={modals.openViewModal}
        onEdit={modals.openEditModal}
        onDelete={modals.openDeleteModal}
      />

      {/* Pagination */}
      <DepartmentPagination
        currentPage={pageState.currentPage}
        totalPages={pageState.totalPages}
        total={pageState.total}
        limit={pageState.limit}
        onPageChange={pageState.setCurrentPage}
      />

      {/* Create Modal */}
      <CreateDepartmentModal
        isOpen={modals.isCreateModalOpen}
        onClose={modals.closeCreateModal}
        onSubmit={handleCreateSubmit}
        loading={pageState.isCreating}
      />

      {/* View Modal */}
      {modals.selectedDepartment && (
        <ViewDepartmentModal
          isOpen={modals.isViewModalOpen}
          onClose={modals.closeViewModal}
          department={modals.selectedDepartment}
        />
      )}

      {/* Edit Modal */}
      {modals.selectedDepartment && (
        <EditDepartmentModal
          isOpen={modals.isEditModalOpen}
          onClose={modals.closeEditModal}
          onSubmit={handleUpdateSubmit}
          department={modals.selectedDepartment}
          loading={pageState.isUpdating}
        />
      )}

      {/* Delete Confirmation Modal */}
      {modals.selectedDepartment && (
        <DeleteConfirmModal
          isOpen={modals.isDeleteModalOpen}
          onClose={modals.closeDeleteModal}
          onConfirm={handleDeleteConfirm}
          departmentName={modals.selectedDepartment.name}
          loading={pageState.isDeleting}
        />
      )}

      {/* Bulk Delete Confirmation Dialog */}
      <ConfirmDialog
        isOpen={modals.showBulkDeleteModal}
        title={t('common:messages.confirm.bulkDelete')}
        message={t('common:messages.confirm.deleteMultiple', { count: pageState.selectedIds.length })}
        confirmText={t('common:actions.delete')}
        cancelText={t('common:actions.cancel')}
        variant="danger"
        onConfirm={handleBulkDeleteConfirm}
        onCancel={modals.closeBulkDeleteModal}
      />

      {/* Import Modal */}
      <ImportModal
        isOpen={importState.isImportModalOpen}
        onClose={importState.closeImportModal}
        config={importState.importConfig}
      />

      {/* Toast Notifications */}
      <div className="fixed top-4 right-4 z-[9999] space-y-2">
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

export default DepartmentsPage;
