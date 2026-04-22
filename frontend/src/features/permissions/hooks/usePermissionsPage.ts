/**
 * usePermissionsPage - Unified hook for permissions page state management
 * 
 * Consolidates all page-level state and logic into a single hook
 */

import { useState, useEffect } from 'react';
import { useToast } from '../../../shared/hooks';
import {
  useRoleModals,
  useSearchFilters,
  useRoleListWithCache,
  useBulkSelection,
  useRoleActions,
} from './index';
import type { Role } from '../services/roleService';

export interface UsePermissionsPageReturn {
  // Toast
  toasts: ReturnType<typeof useToast>['toasts'];
  hideToast: ReturnType<typeof useToast>['hideToast'];

  // Pagination
  currentPage: number;
  limit: number;
  setCurrentPage: (page: number) => void;

  // Role list data
  roles: Role[];
  total: number;
  totalPages: number;
  loading: boolean;
  error: string | null;
  refreshRoles: () => Promise<void>;

  // Search & filters
  searchFilters: ReturnType<typeof useSearchFilters>;

  // Bulk selection
  bulkSelection: ReturnType<typeof useBulkSelection>;

  // Modals
  modals: ReturnType<typeof useRoleModals>;

  // Actions
  actions: ReturnType<typeof useRoleActions>;
}

export const usePermissionsPage = (): UsePermissionsPageReturn => {
  const { toasts, hideToast, showSuccess, showError, showWarning } = useToast();

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [limit] = useState(10);

  // Initialize hooks with callbacks
  const searchFilters = useSearchFilters(() => setCurrentPage(1));

  const roleList = useRoleListWithCache({
    searchTerm: searchFilters.debouncedSearchTerm,
    statusFilter: searchFilters.statusFilter,
    page: currentPage,
    limit,
  });

  const bulkSelection = useBulkSelection(
    roleList.roles,
    (role) => !role.isSystemRole
  );

  const modals = useRoleModals();

  const actions = useRoleActions({
    roleListHook: roleList,
    modalsHook: modals,
    bulkSelectionHook: bulkSelection,
    showSuccess,
    showError,
    showWarning,
  });

  // Maintain focus after search results update
  useEffect(() => {
    const { searchTerm, searchInputRef } = searchFilters;
    const { loading } = roleList;

    if (searchTerm && document.activeElement !== searchInputRef.current) {
      const wasSearching = searchTerm.length > 0;
      if (wasSearching && !loading) {
        setTimeout(() => {
          if (searchInputRef.current && searchTerm) {
            searchInputRef.current.focus();
          }
        }, 0);
      }
    }
  }, [roleList.roles, roleList.loading, searchFilters.searchTerm, searchFilters.searchInputRef]);

  return {
    // Toast
    toasts,
    hideToast,

    // Pagination
    currentPage,
    limit,
    setCurrentPage,

    // Role list data
    roles: roleList.roles,
    total: roleList.total,
    totalPages: roleList.totalPages,
    loading: roleList.loading,
    error: roleList.error,
    refreshRoles: roleList.refreshRoles,

    // Hooks
    searchFilters,
    bulkSelection,
    modals,
    actions,
  };
};

export default usePermissionsPage;
