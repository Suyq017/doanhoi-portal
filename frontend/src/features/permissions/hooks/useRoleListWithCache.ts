import { useMemo } from 'react';
import {
    useRoleList as useRoleListQuery,
    useCreateRole,
    useUpdateRole,
    useDeleteRole,
    useBulkDeleteRoles,
    useSeedDefaultRoles,
    type RoleFilters
} from '@/shared/hooks/queries';
import type { Role } from '../services/roleService';

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
    loadRoles: () => Promise<void>; // ✅ Must return Promise for backward compatibility
    refreshRoles: () => Promise<void>; // ✅ Must return Promise for backward compatibility
    createRole: (roleData: any) => Promise<void>;
    updateRole: (roleId: string, roleData: any) => Promise<void>;
    deleteRole: (roleId: string) => Promise<void>;
    bulkDeleteRoles: (roleIds: string[]) => Promise<any>;
    seedDefaults: () => Promise<void>;
}

/**
 * ✅ TanStack Query version of useRoleList
 * Replaces the old manual state management with automatic caching
 */
export const useRoleListWithCache = ({
    searchTerm,
    statusFilter,
    page,
    limit
}: UseRoleListParams): UseRoleListReturn => {
    // Create stable filters object with useMemo
    const filters = useMemo<RoleFilters>(() => ({
        page,
        limit,
        search: searchTerm && searchTerm.trim() ? searchTerm.trim() : undefined,
        isActive: statusFilter !== '' ? statusFilter : undefined,
    }), [page, limit, searchTerm, statusFilter]);

    // ✅ Use TanStack Query for roles list
    const {
        data,
        isLoading: loading,
        error: queryError,
        refetch
    } = useRoleListQuery(filters);

    const roles = data?.data || [];
    const total = data?.total || 0;
    const totalPages = data?.totalPages || 1;
    const error = queryError ? (queryError instanceof Error ? queryError.message : 'Failed to load roles') : null;

    // ✅ Use TanStack Query mutations
    const createMutation = useCreateRole();
    const updateMutation = useUpdateRole();
    const deleteMutation = useDeleteRole();
    const bulkDeleteMutation = useBulkDeleteRoles();
    const seedDefaultsMutation = useSeedDefaultRoles();

    return {
        roles,
        total,
        totalPages,
        loading,
        error,
        loadRoles: async () => { await refetch(); }, // ✅ Return Promise for backward compatibility
        refreshRoles: async () => { await refetch(); }, // ✅ Return Promise for backward compatibility
        createRole: async (roleData: any) => {
            await createMutation.mutateAsync(roleData);
        },
        updateRole: async (roleId: string, roleData: any) => {
            await updateMutation.mutateAsync({ roleId, roleData });
        },
        deleteRole: async (roleId: string) => {
            await deleteMutation.mutateAsync(roleId);
        },
        bulkDeleteRoles: async (roleIds: string[]) => {
            return await bulkDeleteMutation.mutateAsync(roleIds);
        },
        seedDefaults: async () => {
            await seedDefaultsMutation.mutateAsync();
        },
    };
};
