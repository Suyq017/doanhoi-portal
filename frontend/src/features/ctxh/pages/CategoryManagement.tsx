import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { CtxhCategory, CreateCategoryRequest, UpdateCategoryRequest } from '../types';
import { categoryService } from '../services/categoryService';
import { getErrorMessage } from '../utils';
import CategoryList from '../components/category/CategoryList';
import CategoryForm from '../components/category/CategoryForm';
import CategoryDetailModal from '../components/category/CategoryDetailModal';
import ConfirmDialog from '../../../shared/components/ConfirmDialog';
import { Toast } from '../../../shared/components';
import { useToast } from '../../../shared/hooks';
import { Plus } from 'lucide-react';

const CategoryManagement: React.FC = () => {
  const { t } = useTranslation('ctxh');

  // Toast notifications
  const { toasts, hideToast, showSuccess, showError } = useToast();

  // State management
  const [selectedCategory, setSelectedCategory] = useState<CtxhCategory | undefined>();
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isConfirmDialogOpen, setIsConfirmDialogOpen] = useState(false);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [confirmAction, setConfirmAction] = useState<'delete' | 'restore' | null>(null);
  const [loading, setLoading] = useState(false);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  // Toast wrapper for CategoryList
  const handleShowToast = (type: 'success' | 'error' | 'info', message: string) => {
    if (type === 'success') {
      showSuccess(message);
    } else if (type === 'error') {
      showError(message);
    }
  };

  // Form handlers
  const handleCreateClick = () => {
    setSelectedCategory(undefined);
    setIsFormOpen(true);
  };

  const handleEditClick = (category: CtxhCategory) => {
    setSelectedCategory(category);
    setIsFormOpen(true);
  };

  const handleFormClose = () => {
    setIsFormOpen(false);
    setSelectedCategory(undefined);
  };

  const handleFormSave = async (data: CreateCategoryRequest | UpdateCategoryRequest) => {
    setLoading(true);
    try {
      if (selectedCategory) {
        // Update existing category
        await categoryService.update(selectedCategory.id, data as UpdateCategoryRequest);
        showSuccess(t('category.updated'));
      } else {
        // Create new category
        await categoryService.create(data as CreateCategoryRequest);
        showSuccess(t('category.created'));
      }

      setIsFormOpen(false);
      setSelectedCategory(undefined);
      // Trigger refresh of CategoryList
      setRefreshTrigger(prev => prev + 1);
    } catch (error) {
      const errorMessage = getErrorMessage(error);
      showError(errorMessage);
      throw error; // Re-throw to let the form handle it
    } finally {
      setLoading(false);
    }
  };

  // Delete handler
  const handleDeleteClick = (category: CtxhCategory) => {
    setSelectedCategory(category);
    setConfirmAction('delete');
    setIsConfirmDialogOpen(true);
  };

  // View detail handler
  const handleViewDetailClick = (category: CtxhCategory) => {
    setSelectedCategory(category);
    setIsDetailModalOpen(true);
  };

  const handleConfirmAction = async () => {
    if (!selectedCategory || !confirmAction) return;

    setLoading(true);
    try {
      if (confirmAction === 'delete') {
        await categoryService.delete(selectedCategory.id);
        showSuccess(t('category.deleted'));
      } else if (confirmAction === 'restore') {
        await categoryService.restore(selectedCategory.id);
        showSuccess(t('category.restored'));
      }

      // Trigger refresh of CategoryList
      setRefreshTrigger(prev => prev + 1);
    } catch (error) {
      const errorMessage = getErrorMessage(error);
      showError(errorMessage);
    } finally {
      setLoading(false);
      setIsConfirmDialogOpen(false);
      setSelectedCategory(undefined);
      setConfirmAction(null);
    }
  };

  const handleCancelAction = () => {
    setIsConfirmDialogOpen(false);
    setSelectedCategory(undefined);
    setConfirmAction(null);
  };

  // Get confirmation dialog content
  const getConfirmDialogContent = () => {
    if (!selectedCategory || !confirmAction) return { title: '', message: '', variant: 'warning' as const };

    if (confirmAction === 'delete') {
      return {
        title: t('category.delete'),
        message: t('category.deleteConfirm') + ` "${selectedCategory.name}"?`,
        variant: 'danger' as const
      };
    } else {
      return {
        title: t('category.restore'),
        message: t('category.restoreConfirm') + ` "${selectedCategory.name}"?`,
        variant: 'info' as const
      };
    }
  };

  const dialogContent = getConfirmDialogContent();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            {t('category.title')}
          </h1>
          <p className="mt-2 text-gray-600 dark:text-gray-400">
            {t('category.subtitle')}
          </p>
        </div>
        <div className="mt-4 sm:mt-0">
          {/* Updated to match department button color */}
          <button
            onClick={handleCreateClick}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-doan-500 hover:bg-doan-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-doan-500"
          >
            <Plus className="mr-2 h-4 w-4" />
            {t('category.create')}
          </button>
        </div>
      </div>

      {/* Category List */}
      <CategoryList
        onCreateClick={handleCreateClick}
        onEditClick={handleEditClick}
        onDeleteClick={handleDeleteClick}
        onViewDetailClick={handleViewDetailClick}
        showToast={handleShowToast}
        refreshTrigger={refreshTrigger}
      />

      {/* Category Form Modal */}
      <CategoryForm
        isOpen={isFormOpen}
        category={selectedCategory}
        onSave={handleFormSave}
        onClose={handleFormClose}
        loading={loading}
      />

      {/* Category Detail Modal */}
      <CategoryDetailModal
        isOpen={isDetailModalOpen}
        category={selectedCategory}
        onClose={() => {
          setIsDetailModalOpen(false);
          setSelectedCategory(undefined);
        }}
      />

      {/* Confirm Dialog */}
      <ConfirmDialog
        isOpen={isConfirmDialogOpen}
        title={dialogContent.title}
        message={dialogContent.message}
        variant={dialogContent.variant}
        confirmText={confirmAction === 'delete' ? t('common.delete') : t('category.restore')}
        cancelText={t('common.cancel')}
        onConfirm={handleConfirmAction}
        onCancel={handleCancelAction}
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
    </div>
  );
};

export default CategoryManagement;