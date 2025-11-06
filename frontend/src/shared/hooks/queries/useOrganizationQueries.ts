import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { organizationService } from '../../services/organizationService';
import { Organization, CreateOrganizationRequest, UpdateOrganizationRequest, OrganizationStats } from '../../types/organization';
import { CACHE_CONFIG } from '../../config/queryClient';

/**
 * Empty stats fallback for when data hasn't loaded yet
 */
export const EMPTY_ORGANIZATION_STATS: OrganizationStats = {
    doanStats: {
        total: 0,
        doanTruong: 0,
        doanCoSo: 0,
        chiDoan: 0,
        members: {
            total: 0,
            doanTruong: 0,
            doanCoSo: 0,
            chiDoan: 0,
        },
    },
    hoiStats: {
        total: 0,
        hoiSinhVienTruong: 0,
        lienChiHoi: 0,
        chiHoi: 0,
        members: {
            total: 0,
            hoiSinhVienTruong: 0,
            lienChiHoi: 0,
            chiHoi: 0,
        },
    },
    clbStats: {
        total: 0,
        clbTruong: 0,
        clbKhoa: 0,
        members: {
            total: 0,
            clbTruong: 0,
            clbKhoa: 0,
        },
    },
    totalMembers: 0,
};

/**
 * ========================
 * QUERY KEYS
 * ========================
 */
export const organizationKeys = {
    all: ['organizations'] as const,

    // Tree queries
    trees: () => [...organizationKeys.all, 'tree'] as const,
    treeMain: (maxDepth: number) => [...organizationKeys.trees(), 'main', { maxDepth }] as const,
    treeDetail: (type: string, code: string, maxDepth: number) =>
        [...organizationKeys.trees(), 'detail', type, code, { maxDepth }] as const,
    treeSubDetail: (type: string, code: string, maxDepth: number) =>
        [...organizationKeys.trees(), 'subdetail', type, code, { maxDepth }] as const,

    // Stats query
    stats: () => [...organizationKeys.all, 'stats'] as const,

    // List query (for dropdowns/comboboxes)
    list: () => [...organizationKeys.all, 'list', 'all'] as const,

    // Detail query
    detail: (type: string, code: string) =>
        [...organizationKeys.all, 'detail', type, code] as const,

    // User's primary organization query
    userPrimary: () => [...organizationKeys.all, 'user-primary'] as const,
};

/**
 * ========================
 * QUERY HOOKS
 * ========================
 */

/**
 * Hook for Main Page - Tree with depth limit
 * Cache key: ['organizations', 'tree', 'main', { maxDepth: 2 }]
 */
export const useOrganizationTreeMain = (maxDepth: number = 2) => {
    return useQuery({
        queryKey: organizationKeys.treeMain(maxDepth),
        queryFn: () => organizationService.getOrganizationTreeWithDepth(maxDepth),
        ...CACHE_CONFIG.organizations.tree,

        // Transform response - auto-expand level 1
        select: (data: Organization[]) => {
            return data.map(org => ({
                ...org,
                isExpanded: true,
                children: org.children?.map(child => ({
                    ...child,
                    isExpanded: false
                }))
            }));
        },
    });
};

/**
 * Hook for Detail Page - Specific org tree
 * Cache key: ['organizations', 'tree', 'detail', type, code, { maxDepth: 2 }]
 */
export const useOrganizationTreeDetail = (
    type: string,
    code: string,
    maxDepth: number = 2,
    options?: { enabled?: boolean }
) => {
    return useQuery({
        queryKey: organizationKeys.treeDetail(type, code, maxDepth),
        queryFn: () => organizationService.getOrganizationTreeByTypeCode(type, code, maxDepth),
        ...CACHE_CONFIG.organizations.tree,
        enabled: !!(type && code) && (options?.enabled !== false),

        // Transform to array for consistent structure
        select: (data: Organization) => {
            return [{
                ...data,
                isExpanded: true
            }];
        },
    });
};

/**
 * Hook for SubDetail Page - Direct org load
 * Cache key: ['organizations', 'tree', 'subdetail', type, code, { maxDepth: 1 }]
 */
export const useOrganizationTreeSubDetail = (
    type: string,
    code: string,
    maxDepth: number = 1,
    options?: { enabled?: boolean }
) => {
    return useQuery({
        queryKey: organizationKeys.treeSubDetail(type, code, maxDepth),
        queryFn: () => organizationService.getOrganizationByTypeCode(type, code, {
            includeChildren: true,
            maxDepth
        }),
        ...CACHE_CONFIG.organizations.tree,
        enabled: !!(type && code) && (options?.enabled !== false),

        // Transform to array
        select: (data: Organization) => {
            return [{
                ...data,
                isExpanded: true
            }];
        },
    });
};

/**
 * Hook for Stats - Shared across all pages
 * Cache key: ['organizations', 'stats']
 */
export const useOrganizationStats = () => {
    return useQuery({
        queryKey: organizationKeys.stats(),
        queryFn: () => organizationService.getOrganizationStats(),
        ...CACHE_CONFIG.organizations.stats,
        refetchOnMount: false, // Don't refetch if cache is still fresh
    });
};

/**
 * Hook for fetching flat list of all organizations (for comboboxes/selectors)
 * Cache key: ['organizations', 'list', 'all']
 * 
 * Use cases:
 * - CreateUserModal organization selector
 * - Any other combobox/dropdown that needs organization list
 * 
 * Benefits:
 * - Shared cache across all components
 * - Auto-refetch when stale (5min)
 * - Client-side filtering (no API spam)
 */
export const useOrganizationList = (options?: {
    enabled?: boolean;
}) => {
    return useQuery({
        queryKey: organizationKeys.list(),
        queryFn: () => organizationService.getOrganizations(),

        // Cache config
        staleTime: 5 * 60 * 1000,  // 5 minutes (orgs don't change often)
        gcTime: 30 * 60 * 1000,    // 30 minutes (keep in memory)

        // Refetch strategy
        refetchOnMount: false,      // Don't refetch if cache is fresh
        refetchOnWindowFocus: false, // Don't refetch on tab switch

        // Optional enable control
        enabled: options?.enabled !== false,

        // Transform to ensure consistent structure
        select: (data: Organization[]) => {
            // Sort alphabetically for better UX
            return [...data].sort((a, b) =>
                a.name.localeCompare(b.name, 'vi')
            );
        },
    });
};

/**
 * Hook for fetching user's primary organization
 * Cache key: ['organizations', 'user-primary']
 * 
 * Use cases:
 * - ActivityManagement - check if user can create activities
 * - Any component that needs to know user's primary org
 * 
 * Benefits:
 * - Cached for 10 minutes (rarely changes)
 * - Shared across all components
 * - Auto-refetch when stale
 */
export const useUserPrimaryOrganization = (options?: {
    enabled?: boolean;
}) => {
    return useQuery({
        queryKey: organizationKeys.userPrimary(),
        queryFn: () => organizationService.getUserPrimaryOrganization(),

        // Cache config - primary org rarely changes
        staleTime: 10 * 60 * 1000,  // 10 minutes
        gcTime: 30 * 60 * 1000,     // 30 minutes

        // Refetch strategy
        refetchOnMount: false,       // Don't refetch if cache is fresh
        refetchOnWindowFocus: false, // Don't refetch on tab switch

        // Optional enable control
        enabled: options?.enabled !== false,
    });
};

/**
 * ========================
 * MUTATION HOOKS
 * ========================
 */

/**
 * Hook for creating organization
 */
export const useCreateOrganization = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (data: CreateOrganizationRequest) => organizationService.createOrganization(data),

        onSuccess: () => {
            // Invalidate all tree caches (count changed)
            queryClient.invalidateQueries({ queryKey: organizationKeys.trees() });
            // Invalidate stats (count changed)
            queryClient.invalidateQueries({ queryKey: organizationKeys.stats() });
            // Invalidate list (new organization added)
            queryClient.invalidateQueries({ queryKey: organizationKeys.list() });
        },
    });
};

/**
 * Hook for updating organization
 * Optimized with fast optimistic updates and no unnecessary refetch
 */
export const useUpdateOrganization = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: ({ id, data }: { id: string; data: UpdateOrganizationRequest }) =>
            organizationService.updateOrganization(id, data),

        // Optimistic update - ONLY update active cache
        onMutate: async ({ id, data }) => {
            // Cancel outgoing refetches for trees
            await queryClient.cancelQueries({ queryKey: organizationKeys.trees() });

            // Get all tree caches
            const previousTrees = queryClient.getQueriesData({
                queryKey: organizationKeys.trees()
            });

            // Fast recursive update with early exit
            const updateRecursive = (orgs: Organization[]): Organization[] => {
                for (let i = 0; i < orgs.length; i++) {
                    const org = orgs[i];

                    if (org.id === id) {
                        // Found it! Update and return immediately
                        const newOrgs = [...orgs];
                        newOrgs[i] = { ...org, ...data };
                        return newOrgs;
                    }

                    // Only recurse if has children
                    if (org.children && org.children.length > 0) {
                        const updatedChildren = updateRecursive(org.children);
                        // If children changed, update this org
                        if (updatedChildren !== org.children) {
                            const newOrgs = [...orgs];
                            newOrgs[i] = { ...org, children: updatedChildren };
                            return newOrgs;
                        }
                    }
                }

                return orgs; // No change
            };

            // Only update caches that have data
            previousTrees.forEach(([queryKey, oldData]) => {
                if (oldData && Array.isArray(oldData)) {
                    const newData = updateRecursive(oldData);
                    // Only set if actually changed
                    if (newData !== oldData) {
                        queryClient.setQueryData(queryKey, newData);
                    }
                }
            });

            return { previousTrees };
        },

        // Rollback on error
        onError: (_err, _variables, context) => {
            if (context?.previousTrees) {
                context.previousTrees.forEach(([queryKey, data]) => {
                    queryClient.setQueryData(queryKey, data);
                });
            }
        },

        // ✅ OPTIMIZATION: Don't refetch on success - trust optimistic update
        // The backend returns updated data, React Query uses it automatically
        // Only invalidate if you need to refetch related data (we don't)
        onSuccess: () => {
            // No-op - optimistic update is already correct
            // If backend returns different data, React Query will use it
        },
    });
};

/**
 * Hook for deleting organization
 */
export const useDeleteOrganization = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (id: string) => organizationService.deleteOrganization(id),

        onSuccess: () => {
            // Invalidate all (org no longer exists)
            queryClient.invalidateQueries({ queryKey: organizationKeys.all });
        },
    });
};

/**
 * Hook for adding member to organization
 */
export const useAddMember = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: ({ orgId, userId, role }: { orgId: string; userId: string; role?: string }) =>
            organizationService.addUserToOrganization(orgId, userId, role),

        onSuccess: () => {
            // Only invalidate stats (member count changed)
            queryClient.invalidateQueries({ queryKey: organizationKeys.stats() });
        },
    });
};

/**
 * Hook for removing member from organization
 */
export const useRemoveMember = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: ({ orgId, userId }: { orgId: string; userId: string }) =>
            organizationService.removeUserFromOrganizationSafely(orgId, userId),

        onSuccess: () => {
            // Only invalidate stats (member count changed)
            queryClient.invalidateQueries({ queryKey: organizationKeys.stats() });
        },
    });
};

/**
 * ========================
 * UTILITY HOOKS
 * ========================
 */

/**
 * Hook to manually invalidate caches
 */
export const useInvalidateOrganizations = () => {
    const queryClient = useQueryClient();

    return {
        invalidateAll: () => {
            queryClient.invalidateQueries({ queryKey: organizationKeys.all });
        },

        invalidateTrees: () => {
            queryClient.invalidateQueries({ queryKey: organizationKeys.trees() });
        },

        invalidateStats: () => {
            queryClient.invalidateQueries({ queryKey: organizationKeys.stats() });
        },

        invalidateList: () => {
            queryClient.invalidateQueries({ queryKey: organizationKeys.list() });
        },

        invalidateTreeMain: (maxDepth: number = 2) => {
            queryClient.invalidateQueries({ queryKey: organizationKeys.treeMain(maxDepth) });
        },
    };
};
