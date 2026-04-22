/**
 * useDepartmentPage - Custom hook for department page data and state management
 */

import { useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useDepartmentList } from '../../../shared/hooks/useDepartmentList';
import { useToast, CreateDepartmentRequest } from '../../../shared';
import { UseDepartmentPageReturn } from '../types';

export const useDepartmentPage = (): UseDepartmentPageReturn => {
  const { t } = useTranslation(['departments', 'common']);
  const { showSuccess, showError } = useToast();

  // React Query hook for department list
  const {
    departments,
    total,
    loading,
    error: queryError,
    currentPage,
    limit,
    totalPages,
    searchTerm,
    filterStatus,
    setSearchTerm,
    setFilterStatus,
    setCurrentPage,
    loadDepartments,
    createDepartment: createDepartmentMutation,
    updateDepartment: updateDepartmentMutation,
    deleteDepartment: deleteDepartmentMutation,
    bulkDeleteDepartments: bulkDeleteDepartmentsMutation,
    isCreating,
    isUpdating,
    isDeleting,
  } = useDepartmentList({ initialLimit: 10 });

  const error = queryError || null;

  // Selection state
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  // Selection helpers
  const isAllSelected = departments.length > 0 && selectedIds.length === departments.length;
  const isSomeSelected = selectedIds.length > 0;

  // Selection handlers
  const handleSelectAll = useCallback(() => {
    if (isAllSelected) {
      setSelectedIds([]);
    } else {
      setSelectedIds(departments.map((dept) => dept.id));
    }
  }, [isAllSelected, departments]);

  const handleSelectDepartment = useCallback((departmentId: string) => {
    setSelectedIds((prev) =>
      prev.includes(departmentId)
        ? prev.filter((id) => id !== departmentId)
        : [...prev, departmentId]
    );
  }, []);

  const handleClearSelection = useCallback(() => {
    setSelectedIds([]);
  }, []);

  // CRUD handlers
  const handleCreate = useCallback(
    async (departmentData: CreateDepartmentRequest) => {
      try {
        await createDepartmentMutation(departmentData);
        showSuccess(t('common:messages.success.create'));
      } catch (error) {
        console.error('Error creating department:', error);
        showError(t('common:messages.error.create'));
        throw error;
      }
    },
    [createDepartmentMutation, showSuccess, showError, t]
  );

  const handleUpdate = useCallback(
    async (id: string, departmentData: CreateDepartmentRequest) => {
      try {
        await updateDepartmentMutation(id, departmentData);
        showSuccess(t('common:messages.success.update'));
      } catch (error) {
        console.error('Error updating department:', error);
        showError(t('common:messages.error.update'));
        throw error;
      }
    },
    [updateDepartmentMutation, showSuccess, showError, t]
  );

  const handleDelete = useCallback(
    async (id: string) => {
      try {
        await deleteDepartmentMutation(id);
        showSuccess(t('common:messages.success.delete'));
      } catch (error) {
        console.error('Error deleting department:', error);
        showError(t('common:messages.error.delete'));
        throw error;
      }
    },
    [deleteDepartmentMutation, showSuccess, showError, t]
  );

  const handleBulkDelete = useCallback(async () => {
    try {
      await bulkDeleteDepartmentsMutation(selectedIds);
      showSuccess(t('common:messages.success.bulkDelete', { count: selectedIds.length }));
      setSelectedIds([]);
    } catch (error) {
      console.error('Error deleting departments:', error);
      showError(t('common:messages.error.bulkDelete'));
      throw error;
    }
  }, [bulkDeleteDepartmentsMutation, selectedIds, showSuccess, showError, t]);

  return {
    // Data
    departments,
    total,
    loading,
    error,

    // Pagination
    currentPage,
    totalPages,
    limit,

    // Filters
    searchTerm,
    filterStatus,

    // Selection
    selectedIds,
    isAllSelected,
    isSomeSelected,

    // Actions
    setSearchTerm,
    setFilterStatus,
    setCurrentPage,
    handleSelectAll,
    handleSelectDepartment,
    handleClearSelection,

    // CRUD
    handleCreate,
    handleUpdate,
    handleDelete,
    handleBulkDelete,
    loadDepartments,

    // UI States
    isCreating,
    isUpdating,
    isDeleting,
  };
};

export default useDepartmentPage;
