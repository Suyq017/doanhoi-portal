import { useState, useCallback } from 'react';
import { User } from '../../../shared/types';

export type ModalType = 'create' | 'view' | 'edit' | 'delete' | null;

export interface UseUserModalsReturn {
    // States
    activeModal: ModalType;
    selectedUser: User | null;

    // Actions
    openCreateModal: () => void;
    openViewModal: (user: User) => void;
    openEditModal: (user: User) => void;
    openDeleteModal: (user: User) => void;
    closeModal: () => void;

    // Computed states for backward compatibility
    isCreateModalOpen: boolean;
    isViewModalOpen: boolean;
    isEditModalOpen: boolean;
    isDeleteModalOpen: boolean;
}

export const useUserModals = (): UseUserModalsReturn => {
    const [activeModal, setActiveModal] = useState<ModalType>(null);
    const [selectedUser, setSelectedUser] = useState<User | null>(null);

    const openCreateModal = useCallback(() => {
        setActiveModal('create');
        setSelectedUser(null);
    }, []);

    const openViewModal = useCallback((user: User) => {
        setActiveModal('view');
        setSelectedUser(user);
    }, []);

    const openEditModal = useCallback((user: User) => {
        setActiveModal('edit');
        setSelectedUser(user);
    }, []);

    const openDeleteModal = useCallback((user: User) => {
        setActiveModal('delete');
        setSelectedUser(user);
    }, []);

    const closeModal = useCallback(() => {
        setActiveModal(null);
        setSelectedUser(null);
    }, []);

    return {
        // States
        activeModal,
        selectedUser,

        // Actions
        openCreateModal,
        openViewModal,
        openEditModal,
        openDeleteModal,
        closeModal,

        // Computed states for backward compatibility
        isCreateModalOpen: activeModal === 'create',
        isViewModalOpen: activeModal === 'view',
        isEditModalOpen: activeModal === 'edit',
        isDeleteModalOpen: activeModal === 'delete',
    };
};
