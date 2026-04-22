/**
 * Department Types - Định nghĩa tất cả types cho departments feature
 */

import { Department } from '../../../shared/types/department';

// Re-export shared types
export type { Department } from '../../../shared/types/department';

// ========================
// COMPONENT PROPS TYPES
// ========================

export interface DepartmentPageHeaderProps {
  title?: string;
  subtitle?: string;
  showAddButton?: boolean;
  addButtonLoading?: boolean;
  onAddSingle?: () => void;
  onAddFromFile?: () => void;
}

export interface DepartmentFiltersProps {
  searchTerm: string;
  filterStatus: string;
  onSearchChange: (value: string) => void;
  onStatusChange: (value: string) => void;
}

export interface DepartmentTableProps {
  departments: Department[];
  selectedIds: string[];
  isAllSelected: boolean;
  onSelectAll: () => void;
  onSelectDepartment: (id: string) => void;
  onView: (department: Department) => void;
  onEdit: (department: Department) => void;
  onDelete: (department: Department) => void;
  loading?: boolean;
}

export interface BulkActionsToolbarProps {
  selectedCount: number;
  onClearSelection: () => void;
  onBulkDelete: () => void;
}

export interface DepartmentPaginationProps {
  currentPage: number;
  totalPages: number;
  total: number;
  limit: number;
  onPageChange: (page: number) => void;
}

// ========================
// HOOK RETURN TYPES
// ========================

export interface DepartmentPagePermissions {
  canCreate: boolean;
  canView: boolean;
  canEdit: boolean;
  canDelete: boolean;
  canExport: boolean;
  canImport: boolean;
  showActionColumn: boolean;
  hasAnyViewAction: boolean;
  hasAnyEditAction: boolean;
}

export interface UseDepartmentPageReturn {
  // Data
  departments: Department[];
  total: number;
  loading: boolean;
  error: string | null;

  // Pagination
  currentPage: number;
  totalPages: number;
  limit: number;

  // Filters
  searchTerm: string;
  filterStatus: string;

  // Selection
  selectedIds: string[];
  isAllSelected: boolean;
  isSomeSelected: boolean;

  // Actions
  setSearchTerm: (value: string) => void;
  setFilterStatus: (value: string) => void;
  setCurrentPage: (page: number) => void;
  handleSelectAll: () => void;
  handleSelectDepartment: (id: string) => void;
  handleClearSelection: () => void;

  // CRUD
  handleCreate: (data: any) => Promise<void>;
  handleUpdate: (id: string, data: any) => Promise<void>;
  handleDelete: (id: string) => Promise<void>;
  handleBulkDelete: () => Promise<void>;
  loadDepartments: () => void;

  // UI States
  isCreating: boolean;
  isUpdating: boolean;
  isDeleting: boolean;
}

export interface UseDepartmentModalsReturn {
  // Modal states
  isCreateModalOpen: boolean;
  isViewModalOpen: boolean;
  isEditModalOpen: boolean;
  isDeleteModalOpen: boolean;
  showBulkDeleteModal: boolean;

  // Selected department
  selectedDepartment: Department | null;

  // Actions
  openCreateModal: () => void;
  closeCreateModal: () => void;
  openViewModal: (department: Department) => Promise<void>;
  closeViewModal: () => void;
  openEditModal: (department: Department) => Promise<void>;
  closeEditModal: () => void;
  openDeleteModal: (department: Department) => void;
  closeDeleteModal: () => void;
  openBulkDeleteModal: () => void;
  closeBulkDeleteModal: () => void;
}
