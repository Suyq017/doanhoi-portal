import React from 'react';
import { useTranslation } from 'react-i18next';
import { useCategoryManagement } from '../hooks';
import { CategoryManagementHeader, ToastContainer } from '../components/shared';
import CategoryList from '../components/category/CategoryList';
import CategoryForm from '../components/category/CategoryForm';
import CategoryDetailModal from '../components/category/CategoryDetailModal';
import ConfirmDialog from '../../../shared/components/ConfirmDialog';

/**
 * Category Management Page
 * Refactored with separation of concerns using custom hook
 */
const CategoryManagement: React.FC = () => {
  const { t } = useTranslation('ctxh');
  
  const {
    // State
    selectedCategory,
    isFormOpen,
    isConfirmDialogOpen,
    isDetailModalOpen,
    
    // Loading states
    isCreating,
    isUpdating,
    
    // Actions
    handleCreateClick,
    handleEditClick,
    handleDeleteClick,
    handleViewDetailClick,
    handleFormClose,
    handleFormSave,
    handleConfirmAction,
    handleCancelAction,
    handleShowToast,
    handleDetailModalClose,
    
    // Dialog content
    dialogContent,
    
    // Permissions
    permissions,
    
    // Toast
    toasts,
    hideToast
  } = useCategoryManagement();

  return (
    <div className="space-y-6">
      {/* Header */}
      <CategoryManagementHeader
        title={t('category.title')}
        subtitle={t('category.subtitle')}
        canCreate={permissions.create}
        onCreateClick={handleCreateClick}
        createButtonLabel={t('category.create')}
      />

      {/* Category List */}
      <CategoryList
        onCreateClick={handleCreateClick}
        onEditClick={handleEditClick}
        onDeleteClick={handleDeleteClick}
        onViewDetailClick={handleViewDetailClick}
        showToast={handleShowToast}
        permissions={permissions}
      />

      {/* Category Form Modal */}
      <CategoryForm
        isOpen={isFormOpen}
        category={selectedCategory}
        onSave={handleFormSave}
        onClose={handleFormClose}
        loading={isCreating || isUpdating}
      />

      {/* Category Detail Modal */}
      <CategoryDetailModal
        isOpen={isDetailModalOpen}
        category={selectedCategory}
        onClose={handleDetailModalClose}
      />

      {/* Confirm Dialog */}
      <ConfirmDialog
        isOpen={isConfirmDialogOpen}
        title={dialogContent.title}
        message={dialogContent.message}
        variant={dialogContent.variant}
        confirmText={t('common:actions.confirm')}
        cancelText={t('category.cancel')}
        onConfirm={handleConfirmAction}
        onCancel={handleCancelAction}
      />

      {/* Toast Notifications */}
      <ToastContainer toasts={toasts} onHide={hideToast} />
    </div>
  );
};

export default CategoryManagement;
