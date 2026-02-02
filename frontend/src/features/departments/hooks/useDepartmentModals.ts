/**
 * useDepartmentModals - Custom hook for managing department modals state
 */

import { useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { departmentService, useToast } from '../../../shared';
import { Department } from '../../../shared/types/department';
import { UseDepartmentModalsReturn } from '../types';

export const useDepartmentModals = (): UseDepartmentModalsReturn => {
  const { t } = useTranslation(['common']);
  const { showError } = useToast();

  // Modal states
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [showBulkDeleteModal, setShowBulkDeleteModal] = useState(false);

  // Selected department for view/edit/delete
  const [selectedDepartment, setSelectedDepartment] = useState<Department | null>(null);

  // Create modal handlers
  const openCreateModal = useCallback(() => {
    setIsCreateModalOpen(true);
  }, []);

  const closeCreateModal = useCallback(() => {
    setIsCreateModalOpen(false);
  }, []);

  // View modal handlers
  const openViewModal = useCallback(
    async (department: Department) => {
      try {
        const fullDepartment = await departmentService.getDepartmentById(department.id);
        setSelectedDepartment(fullDepartment);
        setIsViewModalOpen(true);
      } catch (error) {
        console.error('Error loading department details:', error);
        showError(t('common:messages.error.load'));
      }
    },
    [showError, t]
  );

  const closeViewModal = useCallback(() => {
    setIsViewModalOpen(false);
    setSelectedDepartment(null);
  }, []);

  // Edit modal handlers
  const openEditModal = useCallback(
    async (department: Department) => {
      try {
        const fullDepartment = await departmentService.getDepartmentById(department.id);
        setSelectedDepartment(fullDepartment);
        setIsEditModalOpen(true);
      } catch (error) {
        console.error('Error loading department details:', error);
        showError(t('common:messages.error.load'));
      }
    },
    [showError, t]
  );

  const closeEditModal = useCallback(() => {
    setIsEditModalOpen(false);
    setSelectedDepartment(null);
  }, []);

  // Delete modal handlers
  const openDeleteModal = useCallback((department: Department) => {
    setSelectedDepartment(department);
    setIsDeleteModalOpen(true);
  }, []);

  const closeDeleteModal = useCallback(() => {
    setIsDeleteModalOpen(false);
    setSelectedDepartment(null);
  }, []);

  // Bulk delete modal handlers
  const openBulkDeleteModal = useCallback(() => {
    setShowBulkDeleteModal(true);
  }, []);

  const closeBulkDeleteModal = useCallback(() => {
    setShowBulkDeleteModal(false);
  }, []);

  return {
    // Modal states
    isCreateModalOpen,
    isViewModalOpen,
    isEditModalOpen,
    isDeleteModalOpen,
    showBulkDeleteModal,

    // Selected department
    selectedDepartment,

    // Actions
    openCreateModal,
    closeCreateModal,
    openViewModal,
    closeViewModal,
    openEditModal,
    closeEditModal,
    openDeleteModal,
    closeDeleteModal,
    openBulkDeleteModal,
    closeBulkDeleteModal,
  };
};

export default useDepartmentModals;
