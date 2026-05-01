import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { roleService, type Role } from '@/features/permissions/services/roleService';

// ==================== QUERY KEYS ====================
export const roleKeys = {
    all: ['roles'] as const,
    lists: () => [...roleKeys.all, 'list'] as const,
    list: (filters: RoleFilters) => [...roleKeys.lists(), filters] as const,
    details: () => [...roleKeys.all, 'detail'] as const,
    detail: (id: string) => [...roleKeys.details(), id] as const,
};

// ==================== INTERFACES ====================
export interface RoleFilters {
    page: number;
    limit: number;
    search?: string;
    isActive?: boolean | '';
}

export interface RoleListResponse {
    data: Role[];
    total: number;
    totalPages: number;
    page: number;
    limit: number;
}

// ==================== QUERY HOOKS ====================

/**
 * Hook to get roles list with filters
 * Cache: 3 minutes stale time, 10 minutes gc time
 */
export const useRoleList = (filters: RoleFilters) => {
    return useQuery({
        queryKey: roleKeys.list(filters),
        queryFn: async (): Promise<RoleListResponse> => {
            console.log('🔍 [Roles] API Call - Fetching roles with filters:', filters);

            let params: any = {
                page: filters.page,
                limit: filters.limit,
            };

            // Only add search if it has value
            if (filters.search && filters.search.trim()) {
                params.search = filters.search.trim();
            }

            // Only add isActive if it's a boolean (not empty string)
            if (filters.isActive !== '' && filters.isActive !== undefined) {
                params.isActive = filters.isActive;
            }

            let response;
            try {
                response = await roleService.getRoles(params);
            } catch (err: any) {
                // If error with isActive filter, try without it
                if (err.message.includes('400') && filters.isActive !== '') {
                    const { isActive, ...paramsWithoutFilter } = params;
                    response = await roleService.getRoles(paramsWithoutFilter);

                    // Apply frontend filtering if backend doesn't support it
                    if (response && response.data) {
                        response.data = response.data.filter((role: Role) => role.isActive === filters.isActive);
                        response.total = response.data.length;
                        response.totalPages = Math.ceil(response.data.length / params.limit);
                    }
                } else {
                    throw err;
                }
            }

            console.log('✅ [Roles] API Response:', response);

            if (response && response.data) {
                return {
                    data: response.data,
                    total: response.total || 0,
                    totalPages: response.totalPages || 1,
                    page: filters.page,
                    limit: filters.limit,
                };
            }

            return {
                data: [],
                total: 0,
                totalPages: 1,
                page: filters.page,
                limit: filters.limit,
            };
        },
        staleTime: 3 * 60 * 1000, // 3 minutes
        gcTime: 10 * 60 * 1000, // 10 minutes
        refetchOnMount: false,
        refetchOnWindowFocus: false,
    });
};

/**
 * Hook to get role by ID
 * Cache: 5 minutes stale time, 15 minutes gc time
 */
export const useRole = (id: string) => {
    return useQuery({
        queryKey: roleKeys.detail(id),
        queryFn: async () => {
            const response = await roleService.getRoleById(id);
            return response;
        },
        staleTime: 5 * 60 * 1000, // 5 minutes
        gcTime: 15 * 60 * 1000, // 15 minutes
        refetchOnMount: false,
        refetchOnWindowFocus: false,
        enabled: !!id,
    });
};

// ==================== MUTATION HOOKS ====================

/**
 * Hook to create a new role
 */
export const useCreateRole = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (roleData: any) => {
            const response = await roleService.createRole(roleData);
            return response;
        },
        onSuccess: () => {
            // Invalidate all role list queries
            queryClient.invalidateQueries({ queryKey: roleKeys.lists() });
        },
    });
};

/**
 * Hook to update a role
 */
export const useUpdateRole = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async ({ roleId, roleData }: { roleId: string; roleData: any }) => {
            const response = await roleService.updateRole(roleId, roleData);
            return response;
        },
        onSuccess: (_, variables) => {
            // Invalidate specific role detail
            queryClient.invalidateQueries({ queryKey: roleKeys.detail(variables.roleId) });
            // Invalidate all role lists
            queryClient.invalidateQueries({ queryKey: roleKeys.lists() });
        },
    });
};

/**
 * Hook to delete a role
 */
export const useDeleteRole = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (roleId: string) => {
            const response = await roleService.deleteRole(roleId);
            return response;
        },
        onSuccess: () => {
            // Invalidate all role queries
            queryClient.invalidateQueries({ queryKey: roleKeys.all });
        },
    });
};

/**
 * Hook to bulk delete roles
 */
export const useBulkDeleteRoles = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (roleIds: string[]) => {
            const response = await roleService.bulkDeleteRoles(roleIds);
            return response;
        },
        onSuccess: () => {
            // Invalidate all role queries
            queryClient.invalidateQueries({ queryKey: roleKeys.all });
        },
    });
};

/**
 * Hook to seed default roles
 */
export const useSeedDefaultRoles = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async () => {
            const response = await roleService.seedDefaults();
            return response;
        },
        onSuccess: () => {
            // Invalidate all role queries
            queryClient.invalidateQueries({ queryKey: roleKeys.all });
        },
    });
};
