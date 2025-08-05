import { useState, useCallback } from 'react';
import { Role } from '../services/roleService';

export type RoleModalType = 'create' | 'view' | 'edit' | 'delete' | 'bulkDelete' | null;

export interface UseRoleModalsReturn {
    // States
    activeModal: RoleModalType;
    selectedRole: Role | null;

    // Actions
    openCreateModal: () => void;
    openViewModal: (role: Role) => void;
    openEditModal: (role: Role) => void;
    openDeleteModal: (role: Role) => void;
    openBulkDeleteModal: () => void;
    closeModal: () => void;

    // Computed states for backward compatibility
    isCreateModalOpen: boolean;
    isViewModalOpen: boolean;
    isEditModalOpen: boolean;
    isDeleteModalOpen: boolean;
    isBulkDeleteModalOpen: boolean;
}

export const useRoleModals = (): UseRoleModalsReturn => {
    const [activeModal, setActiveModal] = useState<RoleModalType>(null);
    const [selectedRole, setSelectedRole] = useState<Role | null>(null);

    const openCreateModal = useCallback(() => {
        setActiveModal('create');
        setSelectedRole(null);
    }, []);

    const openViewModal = useCallback((role: Role) => {
        setActiveModal('view');
        setSelectedRole(role);
    }, []);

    const openEditModal = useCallback((role: Role) => {
        setActiveModal('edit');
        setSelectedRole(role);
    }, []);

    const openDeleteModal = useCallback((role: Role) => {
        setActiveModal('delete');
        setSelectedRole(role);
    }, []);

    const openBulkDeleteModal = useCallback(() => {
        setActiveModal('bulkDelete');
        setSelectedRole(null);
    }, []);

    const closeModal = useCallback(() => {
        setActiveModal(null);
        setSelectedRole(null);
    }, []);

    return {
        activeModal,
        selectedRole,
        openCreateModal,
        openViewModal,
        openEditModal,
        openDeleteModal,
        openBulkDeleteModal,
        closeModal,
        isCreateModalOpen: activeModal === 'create',
        isViewModalOpen: activeModal === 'view',
        isEditModalOpen: activeModal === 'edit',
        isDeleteModalOpen: activeModal === 'delete',
        isBulkDeleteModalOpen: activeModal === 'bulkDelete',
    };
};
