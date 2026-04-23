import React, { useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTemplateListPage } from '../../hooks';
import {
  LoadingState,
  ErrorState,
  TemplateListHeader,
  TemplateListFilters,
  TemplateTable,
  TemplateEmptyState,
} from '../../components/admin';
import { Toast, ConfirmDialog, Pagination } from '@/shared/components';

const TemplateListPage: React.FC = () => {
  const navigate = useNavigate();
  const statusDropdownRef = useRef<HTMLDivElement>(null);
  
  const {
    templates,
    total,
    totalPages,
    isLoading,
    error,
    filters,
    statusOptions,
    setSearchInput,
    setStatusFilter,
    setCurrentPage,
    setLimit,
    handleDelete,
    statusDropdownOpen,
    setStatusDropdownOpen,
    permissions,
    toasts,
    hideToast,
    confirmDialog,
  } = useTemplateListPage();

  const handleNavigateToUpload = () => {
    navigate('/portal/admin/templates/upload');
  };

  const handleConfigure = (id: string) => {
    navigate(`/portal/admin/templates/${id}/configure`);
  };

  return (
    <div className="space-y-6">
      <ConfirmDialog
        isOpen={confirmDialog.isOpen}
        title={confirmDialog.title}
        message={confirmDialog.message}
        confirmText={confirmDialog.confirmText}
        cancelText={confirmDialog.cancelText}
        variant={confirmDialog.variant}
        onConfirm={confirmDialog.onConfirm || (() => {})}
        onCancel={confirmDialog.onCancel || (() => {})}
      />

      {/* Toasts */}
      <div className="fixed top-4 right-4 z-[9999] space-y-2">
        {toasts.map((toast) => (
          <Toast
            key={toast.id}
            type={toast.type}
            message={toast.message}
            onClose={() => hideToast(toast.id)}
          />
        ))}
      </div>

      {/* Header */}
      <TemplateListHeader
        canManageTemplates={permissions.canManageTemplates}
        onNavigateToUpload={handleNavigateToUpload}
      />

      {/* Filters */}
      <TemplateListFilters
        searchInput={filters.searchInput}
        onSearchChange={setSearchInput}
        statusFilter={filters.statusFilter}
        statusOptions={statusOptions}
        onStatusChange={setStatusFilter}
        statusDropdownOpen={statusDropdownOpen}
        onStatusDropdownOpenChange={setStatusDropdownOpen}
        statusDropdownRef={statusDropdownRef}
      />

      {/* Content */}
      <div className="overflow-hidden bg-white border border-gray-200 rounded-lg shadow-sm dark:bg-gray-800 dark:border-gray-700">
        {isLoading && <LoadingState />}

        {error && <ErrorState error={error} />}

        {!isLoading && !error && templates.length === 0 && (
          <TemplateEmptyState
            canManageTemplates={permissions.canManageTemplates}
            onNavigateToUpload={handleNavigateToUpload}
          />
        )}

        {!isLoading && !error && templates.length > 0 && (
          <>
            <TemplateTable
              templates={templates}
              canManageTemplates={permissions.canManageTemplates}
              onConfigure={handleConfigure}
              onDelete={handleDelete}
              isDeleting={false}
            />

            <Pagination
              currentPage={filters.currentPage}
              totalPages={totalPages}
              total={total}
              limit={filters.limit}
              onPageChange={setCurrentPage}
              showLimitSelector={true}
              onLimitChange={setLimit}
            />
          </>
        )}
      </div>
    </div>
  );
};

export default TemplateListPage;
