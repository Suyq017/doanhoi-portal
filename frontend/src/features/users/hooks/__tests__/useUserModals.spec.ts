import { describe, it, expect } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useUserModals } from '../useUserModals';
import type { User } from '@/shared/types';

const mockUser: User = {
  id: 'user-1',
  code: 'USR001',
  email: 'user@example.com',
  familyName: 'Nguyen',
  givenName: 'Van A',
  phone: '0123456789',
  userType: 'student',
  membershipStatus: 'doan_vien',
  isActive: true,
  createdAt: '2024-01-01',
  updatedAt: '2024-01-01',
};

const mockUser2: User = {
  id: 'user-2',
  code: 'USR002',
  email: 'user2@example.com',
  familyName: 'Tran',
  givenName: 'Van B',
  phone: '0987654321',
  userType: 'staff',
  membershipStatus: 'hoi_vien',
  isActive: true,
  createdAt: '2024-01-01',
  updatedAt: '2024-01-01',
};

describe('useUserModals', () => {
  it('should initialize with closed modal and null selected user', () => {
    const { result } = renderHook(() => useUserModals());

    expect(result.current.activeModal).toBeNull();
    expect(result.current.selectedUser).toBeNull();
    expect(result.current.isCreateModalOpen).toBe(false);
    expect(result.current.isViewModalOpen).toBe(false);
    expect(result.current.isEditModalOpen).toBe(false);
    expect(result.current.isDeleteModalOpen).toBe(false);
  });

  it('should open create modal', () => {
    const { result } = renderHook(() => useUserModals());

    act(() => {
      result.current.openCreateModal();
    });

    expect(result.current.activeModal).toBe('create');
    expect(result.current.selectedUser).toBeNull();
    expect(result.current.isCreateModalOpen).toBe(true);
    expect(result.current.isViewModalOpen).toBe(false);
    expect(result.current.isEditModalOpen).toBe(false);
    expect(result.current.isDeleteModalOpen).toBe(false);
  });

  it('should open view modal with selected user', () => {
    const { result } = renderHook(() => useUserModals());

    act(() => {
      result.current.openViewModal(mockUser);
    });

    expect(result.current.activeModal).toBe('view');
    expect(result.current.selectedUser).toEqual(mockUser);
    expect(result.current.isViewModalOpen).toBe(true);
    expect(result.current.isCreateModalOpen).toBe(false);
    expect(result.current.isEditModalOpen).toBe(false);
    expect(result.current.isDeleteModalOpen).toBe(false);
  });

  it('should open edit modal with selected user', () => {
    const { result } = renderHook(() => useUserModals());

    act(() => {
      result.current.openEditModal(mockUser);
    });

    expect(result.current.activeModal).toBe('edit');
    expect(result.current.selectedUser).toEqual(mockUser);
    expect(result.current.isEditModalOpen).toBe(true);
    expect(result.current.isCreateModalOpen).toBe(false);
    expect(result.current.isViewModalOpen).toBe(false);
    expect(result.current.isDeleteModalOpen).toBe(false);
  });

  it('should open delete modal with selected user', () => {
    const { result } = renderHook(() => useUserModals());

    act(() => {
      result.current.openDeleteModal(mockUser);
    });

    expect(result.current.activeModal).toBe('delete');
    expect(result.current.selectedUser).toEqual(mockUser);
    expect(result.current.isDeleteModalOpen).toBe(true);
    expect(result.current.isCreateModalOpen).toBe(false);
    expect(result.current.isViewModalOpen).toBe(false);
    expect(result.current.isEditModalOpen).toBe(false);
  });

  it('should close modal and clear selected user', () => {
    const { result } = renderHook(() => useUserModals());

    act(() => {
      result.current.openViewModal(mockUser);
    });

    expect(result.current.activeModal).toBe('view');
    expect(result.current.selectedUser).toEqual(mockUser);

    act(() => {
      result.current.closeModal();
    });

    expect(result.current.activeModal).toBeNull();
    expect(result.current.selectedUser).toBeNull();
    expect(result.current.isViewModalOpen).toBe(false);
  });

  it('should switch between different modal types', () => {
    const { result } = renderHook(() => useUserModals());

    act(() => {
      result.current.openCreateModal();
    });
    expect(result.current.isCreateModalOpen).toBe(true);

    act(() => {
      result.current.openViewModal(mockUser);
    });
    expect(result.current.isCreateModalOpen).toBe(false);
    expect(result.current.isViewModalOpen).toBe(true);

    act(() => {
      result.current.openEditModal(mockUser);
    });
    expect(result.current.isViewModalOpen).toBe(false);
    expect(result.current.isEditModalOpen).toBe(true);

    act(() => {
      result.current.closeModal();
    });
    expect(result.current.isEditModalOpen).toBe(false);
  });

  it('should update selected user when opening view modal with different user', () => {
    const { result } = renderHook(() => useUserModals());

    act(() => {
      result.current.openViewModal(mockUser);
    });
    expect(result.current.selectedUser).toEqual(mockUser);

    act(() => {
      result.current.openViewModal(mockUser2);
    });
    expect(result.current.selectedUser).toEqual(mockUser2);
    expect(result.current.activeModal).toBe('view');
  });

  it('should handle rapid modal opens and closes', () => {
    const { result } = renderHook(() => useUserModals());

    act(() => {
      result.current.openCreateModal();
      result.current.closeModal();
      result.current.openViewModal(mockUser);
      result.current.openEditModal(mockUser);
      result.current.closeModal();
    });

    expect(result.current.activeModal).toBeNull();
    expect(result.current.selectedUser).toBeNull();
  });

  it('should clear user when opening create modal', () => {
    const { result } = renderHook(() => useUserModals());

    act(() => {
      result.current.openViewModal(mockUser);
    });
    expect(result.current.selectedUser).toEqual(mockUser);

    act(() => {
      result.current.openCreateModal();
    });
    expect(result.current.activeModal).toBe('create');
    expect(result.current.selectedUser).toBeNull();
  });

  it('should have correct boolean flags for each modal type', () => {
    const { result } = renderHook(() => useUserModals());

    act(() => {
      result.current.openCreateModal();
    });
    expect(result.current.isCreateModalOpen).toBe(true);
    expect(result.current.isViewModalOpen).toBe(false);
    expect(result.current.isEditModalOpen).toBe(false);
    expect(result.current.isDeleteModalOpen).toBe(false);

    act(() => {
      result.current.openDeleteModal(mockUser);
    });
    expect(result.current.isCreateModalOpen).toBe(false);
    expect(result.current.isViewModalOpen).toBe(false);
    expect(result.current.isEditModalOpen).toBe(false);
    expect(result.current.isDeleteModalOpen).toBe(true);
  });
});
