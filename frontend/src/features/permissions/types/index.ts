/**
 * Permission Types - Định nghĩa tất cả types cho permissions feature
 */

// Re-export from service
export type {
  Permission,
  Role,
  RoleQueryParams,
  RoleListResponse,
  CreateRoleRequest,
  UpdateRoleRequest,
  AssignRoleRequest,
  RoleAssignment,
  GrantRolesRequest,
} from '../services/roleService';

// ========================
// COMPONENT PROPS TYPES
// ========================

export interface PageHeaderProps {
  selectedCount: number;
  onCreateClick: () => void;
  onBulkDeleteClick: () => void;
  loading?: boolean;
}

export interface SearchFiltersProps {
  searchFilters: UseSearchFiltersReturn;
  currentPage: number;
  setCurrentPage: (page: number) => void;
}

export interface RolesTableProps {
  roles: Role[];
  loading: boolean;
  bulkSelection: UseBulkSelectionReturn<Role>;
  searchTerm: string;
  onView: (role: Role) => void;
  onEdit: (role: Role) => void;
  onDelete: (role: Role) => void;
  onClearSearch: () => void;
}

export interface PaginationProps {
  currentPage: number;
  totalPages: number;
  total: number;
  limit: number;
  onPageChange: (page: number) => void;
}

export interface LoadingStateProps {
  message?: string;
}

export interface ErrorStateProps {
  error: string;
  onRetry: () => void;
}

// ========================
// HOOK RETURN TYPES
// ========================

import type { Role } from '../services/roleService';

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

  // Computed states
  isCreateModalOpen: boolean;
  isViewModalOpen: boolean;
  isEditModalOpen: boolean;
  isDeleteModalOpen: boolean;
  isBulkDeleteModalOpen: boolean;
}

export interface UseSearchFiltersReturn {
  searchTerm: string;
  debouncedSearchTerm: string;
  statusFilter: boolean | '';
  searchInputRef: React.RefObject<HTMLInputElement>;
  setSearchTerm: (value: string) => void;
  setStatusFilter: (value: boolean | '') => void;
  handleClearSearch: () => void;
}

export interface UseRoleListParams {
  searchTerm: string;
  statusFilter: boolean | '';
  page: number;
  limit: number;
}

export interface UseRoleListReturn {
  // Data state
  roles: Role[];
  total: number;
  totalPages: number;
  loading: boolean;
  error: string | null;

  // Actions
  loadRoles: () => Promise<void>;
  refreshRoles: () => Promise<void>;
  createRole: (roleData: any) => Promise<void>;
  updateRole: (roleId: string, roleData: any) => Promise<void>;
  deleteRole: (roleId: string) => Promise<void>;
  bulkDeleteRoles: (roleIds: string[]) => Promise<any>;
  seedDefaults: () => Promise<void>;
}

export interface UseBulkSelectionReturn<T> {
  selectedItems: Set<string>;
  isAllSelected: boolean;
  isSomeSelected: boolean;
  toggleItem: (id: string) => void;
  toggleAll: () => void;
  clearSelection: () => void;
  isSelected: (id: string) => boolean;
  getSelectedIds: () => string[];
  getSelectedCount: () => number;
  getSelectableItems: () => T[];
}

export interface UseRoleActionsParams {
  roleListHook: UseRoleListReturn;
  modalsHook: UseRoleModalsReturn;
  bulkSelectionHook: UseBulkSelectionReturn<Role>;
  showSuccess: (message: string) => void;
  showError: (message: string) => void;
  showWarning: (message: string) => void;
}

export interface UseRoleActionsReturn {
  handleCreateRole: () => void;
  handleViewRole: (role: Role) => void;
  handleEditRole: (role: Role) => void;
  handleDeleteRole: (role: Role) => void;
  handleBulkDelete: () => void;
  handleCreateSuccess: (roleData: any) => Promise<void>;
  handleEditSuccess: (roleData: any) => Promise<void>;
  handleDeleteConfirm: () => Promise<void>;
  handleBulkDeleteConfirm: () => Promise<void>;
}

// ========================
// PAGE STATE TYPE
// ========================

export interface PermissionsPageState {
  currentPage: number;
  limit: number;
}
