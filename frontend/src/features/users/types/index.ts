/**
 * User Types - Định nghĩa tất cả types cho users feature
 */

import type { User, CreateUserRequest } from '../../../shared/types';

// Re-export from shared types
export type { User, CreateUserRequest } from '../../../shared/types';

// ========================
// PERMISSION TYPES
// ========================

export interface UserPagePermissions {
    canCreate: boolean;
    canView: boolean;
    canEdit: boolean;
    canDelete: boolean;
    canExport: boolean;
    canImport: boolean;
    canManageRoles: boolean;
    showActionColumn: boolean;
    showBulkActions: boolean;
    hasAnyViewAction: boolean;
    hasAnyEditAction: boolean;
}

// ========================
// COMPONENT PROPS TYPES
// ========================

export interface UserPageHeaderProps {
    onCreateClick: () => void;
    onImportClick: () => void;
    onExportClick: () => void;
    onGrantRolesClick?: () => void;
    onAssignRolesClick?: () => void;
    isCreating?: boolean;
    permissions: UserPagePermissions;
}

export interface UserFiltersProps {
    searchTerm: string;
    filterType: string;
    filterStatus: string;
    onSearchChange: (value: string) => void;
    onTypeChange: (value: string) => void;
    onStatusChange: (value: string) => void;
}

export interface UserPaginationProps {
    currentPage: number;
    totalPages: number;
    total: number;
    limit: number;
    onPageChange: (page: number) => void;
}

// ========================
// HOOK RETURN TYPES
// ========================

export type UserModalType = 'create' | 'view' | 'edit' | 'delete' | 'import' | 'export' | 'roleAssignment' | 'grantRoles' | null;

export interface UseUserModalsReturn {
    // States
    activeModal: UserModalType;
    selectedUser: User | null;

    // Modal states
    isCreateModalOpen: boolean;
    isViewModalOpen: boolean;
    isEditModalOpen: boolean;
    isDeleteModalOpen: boolean;
    isImportModalOpen: boolean;
    isExportModalOpen: boolean;
    isRoleAssignmentModalOpen: boolean;
    isGrantRolesModalOpen: boolean;

    // Actions
    openCreateModal: () => void;
    openViewModal: (user: User) => void;
    openEditModal: (user: User) => void;
    openDeleteModal: (user: User) => void;
    openImportModal: () => void;
    openExportModal: () => void;
    openRoleAssignmentModal: () => void;
    openGrantRolesModal: () => void;
    closeModal: () => void;
    closeImportModal: () => void;
    closeExportModal: () => void;
    closeRoleAssignmentModal: () => void;
    closeGrantRolesModal: () => void;
}

export interface UseUserListReturn {
    // Data
    users: User[];
    total: number;
    loading: boolean;
    error: string | null;

    // Pagination
    currentPage: number;
    totalPages: number;
    limit: number;

    // Filters
    searchTerm: string;
    filterType: string;
    filterStatus: string;

    // Actions
    setSearchTerm: (value: string) => void;
    setFilterType: (value: string) => void;
    setFilterStatus: (value: string) => void;
    setCurrentPage: (page: number) => void;
    refreshUsers: () => void;
}

export interface UseUserActionsParams {
    showSuccess: (message: string) => void;
    showError: (message: string) => void;
    onRefreshData: () => void;
}

export interface UseUserActionsReturn {
    // Loading states
    isCreating: boolean;
    isUpdating: boolean;
    isDeleting: boolean;

    // Actions
    handleCreateUser: (data: CreateUserRequest) => Promise<void>;
    handleUpdateUser: (userId: string, data: CreateUserRequest) => Promise<void>;
    handleDeleteUser: (userId: string) => Promise<void>;
    handleBulkDelete: (userIds: string[]) => Promise<void>;
}

export interface UseUserPageReturn {
    // Toast
    toasts: any[];
    hideToast: (id: string) => void;
    showSuccess: (message: string) => void;
    showError: (message: string) => void;

    // Permissions
    permissions: UserPagePermissions;

    // User list
    users: User[];
    total: number;
    loading: boolean;
    error: string | null;
    currentPage: number;
    totalPages: number;
    limit: number;
    searchTerm: string;
    filterType: string;
    filterStatus: string;
    setSearchTerm: (value: string) => void;
    setFilterType: (value: string) => void;
    setFilterStatus: (value: string) => void;
    setCurrentPage: (page: number) => void;
    refreshUsers: () => void;

    // Modals
    modals: UseUserModalsReturn;

    // Actions
    isCreating: boolean;
    isUpdating: boolean;
    isDeleting: boolean;
    handleCreateUser: (data: CreateUserRequest) => Promise<void>;
    handleUpdateUser: (data: CreateUserRequest) => Promise<void>;
    handleDeleteUser: () => Promise<void>;
    handleBulkDelete: (userIds: string[]) => Promise<void>;

    // Import/Export
    importConfig: any;
    handleExport: (fields: string[]) => Promise<void>;
}
