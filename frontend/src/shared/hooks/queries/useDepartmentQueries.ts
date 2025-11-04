import { useQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query';
import { departmentService } from '../../services/departmentService';
import { Department, DepartmentQueryParams, CreateDepartmentRequest, UpdateDepartmentRequest, DepartmentsResponse } from '../../types/department';

/**
 * ========================
 * CACHE KEYS
 * ========================
 */
export const departmentKeys = {
    all: ['departments'] as const,
    lists: () => [...departmentKeys.all, 'list'] as const,
    list: (filters: DepartmentQueryParams) => [...departmentKeys.lists(), filters] as const,
    details: () => [...departmentKeys.all, 'detail'] as const,
    detail: (departmentId: string) => [...departmentKeys.details(), departmentId] as const,
};

/**
 * ========================
 * CACHE CONFIGURATION
 * ========================
 */
const DEPARTMENT_CACHE_CONFIG = {
    list: {
        staleTime: 2 * 60 * 1000,      // 2 minutes
        gcTime: 10 * 60 * 1000,         // 10 minutes
        refetchOnWindowFocus: true,
        refetchOnMount: false,
    },
    detail: {
        staleTime: 5 * 60 * 1000,      // 5 minutes
        gcTime: 10 * 60 * 1000,         // 10 minutes
        refetchOnWindowFocus: true,
        refetchOnMount: false,
    },
};

/**
 * ========================
 * QUERY HOOKS
 * ========================
 */

/**
 * Hook to fetch paginated department list with filters
 * 
 * Features:
 * - Automatic caching per page + filter combination
 * - keepPreviousData for smooth pagination (no loading spinner)
 * - Background refetch when data becomes stale
 * 
 * Usage:
 * const { data, isLoading, isFetching } = useDepartmentListQuery({
 *   page: 1,
 *   limit: 10,
 *   search: 'IT',
 *   isActive: true
 * });
 */
export const useDepartmentListQuery = (params: DepartmentQueryParams = {}) => {
    return useQuery({
        queryKey: departmentKeys.list(params),
        queryFn: async () => {
            const response = await departmentService.getDepartments(params);
            return response;
        },
        ...DEPARTMENT_CACHE_CONFIG.list,
        placeholderData: keepPreviousData, // CRITICAL: Smooth pagination
    });
};

/**
 * Hook to fetch single department detail
 * 
 * Features:
 * - Separate cache from list
 * - Longer stale time (department detail ít thay đổi)
 * 
 * Usage:
 * const { data: department, isLoading } = useDepartmentDetailQuery(departmentId);
 */
export const useDepartmentDetailQuery = (departmentId: string, options?: { enabled?: boolean }) => {
    return useQuery({
        queryKey: departmentKeys.detail(departmentId),
        queryFn: async () => {
            const department = await departmentService.getDepartmentById(departmentId);
            return department;
        },
        ...DEPARTMENT_CACHE_CONFIG.detail,
        enabled: options?.enabled ?? !!departmentId,
    });
};

/**
 * ========================
 * MUTATION HOOKS
 * ========================
 */

/**
 * Hook to create new department
 * 
 * Features:
 * - Invalidate all list queries (department có thể xuất hiện ở nhiều pages)
 * - Refetch current page to show new department
 * 
 * Usage:
 * const { mutate: createDepartment, isPending } = useCreateDepartmentMutation();
 * createDepartment(departmentData, {
 *   onSuccess: () => toast.success('Created!'),
 *   onError: (error) => toast.error(error.message)
 * });
 */
export const useCreateDepartmentMutation = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (departmentData: CreateDepartmentRequest) =>
            departmentService.createDepartment(departmentData),

        onSuccess: () => {
            // Invalidate all list queries
            // Lý do: Department mới có thể xuất hiện ở bất kỳ page nào (search, filter)
            queryClient.invalidateQueries({
                queryKey: departmentKeys.lists()
            });
        },

        onError: (error) => {
            console.error('Failed to create department:', error);
        },
    });
};

/**
 * Hook to update department
 * 
 * Features:
 * - Optimistic update: Update cache immediately
 * - Rollback if API fails
 * - Invalidate affected list queries
 * 
 * Usage:
 * const { mutate: updateDepartment } = useUpdateDepartmentMutation();
 * updateDepartment({ id: 'dept-123', data: { name: 'New Name' } });
 */
export const useUpdateDepartmentMutation = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: ({ id, data }: { id: string; data: UpdateDepartmentRequest }) =>
            departmentService.updateDepartment(id, data),

        // Optimistic update
        onMutate: async ({ id, data }) => {
            // Cancel outgoing refetches (tránh overwrite optimistic update)
            await queryClient.cancelQueries({
                queryKey: departmentKeys.detail(id)
            });

            // Snapshot previous value (để rollback nếu fail)
            const previousDepartment = queryClient.getQueryData(departmentKeys.detail(id));

            // Optimistically update detail cache
            queryClient.setQueryData(
                departmentKeys.detail(id),
                (old: Department | undefined) => {
                    if (!old) return old;
                    return { ...old, ...data };
                }
            );

            // Optimistically update in list caches
            queryClient.setQueriesData(
                { queryKey: departmentKeys.lists() },
                (old: DepartmentsResponse | undefined) => {
                    if (!old) return old;
                    return {
                        ...old,
                        departments: old.departments.map(dept =>
                            dept.id === id ? { ...dept, ...data } : dept
                        )
                    };
                }
            );

            return { previousDepartment };
        },

        onError: (_err, { id }, context) => {
            // Rollback on error
            if (context?.previousDepartment) {
                queryClient.setQueryData(
                    departmentKeys.detail(id),
                    context.previousDepartment
                );
            }
            console.error('Failed to update department:', _err);
        },

        onSettled: (_data, _error, { id }) => {
            // Always refetch to sync với server
            queryClient.invalidateQueries({
                queryKey: departmentKeys.detail(id)
            });
            queryClient.invalidateQueries({
                queryKey: departmentKeys.lists()
            });
        },
    });
};

/**
 * Hook to delete department
 * 
 * Features:
 * - Optimistic update: Remove from cache immediately
 * - Rollback if API fails
 * - Smart invalidation: Only refetch affected pages
 * 
 * Usage:
 * const { mutate: deleteDepartment } = useDeleteDepartmentMutation();
 * deleteDepartment('dept-123');
 */
export const useDeleteDepartmentMutation = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (departmentId: string) => departmentService.deleteDepartment(departmentId),

        // Optimistic update
        onMutate: async (departmentId) => {
            // Cancel outgoing queries
            await queryClient.cancelQueries({
                queryKey: departmentKeys.lists()
            });

            // Snapshot previous lists
            const previousLists = queryClient.getQueriesData({
                queryKey: departmentKeys.lists()
            });

            // Optimistically remove from all list caches
            queryClient.setQueriesData(
                { queryKey: departmentKeys.lists() },
                (old: DepartmentsResponse | undefined) => {
                    if (!old) return old;
                    return {
                        ...old,
                        departments: old.departments.filter(dept => dept.id !== departmentId),
                        total: old.total - 1,
                    };
                }
            );

            return { previousLists };
        },

        onError: (_err, _departmentId, context) => {
            // Rollback on error
            if (context?.previousLists) {
                context.previousLists.forEach(([queryKey, data]) => {
                    queryClient.setQueryData(queryKey, data);
                });
            }
            console.error('Failed to delete department:', _err);
        },

        onSettled: () => {
            // Refetch all lists to sync with server
            queryClient.invalidateQueries({
                queryKey: departmentKeys.lists()
            });
        },
    });
};

/**
 * Hook to bulk delete departments
 * 
 * Features:
 * - Remove multiple departments from cache
 * - Refetch all affected pages
 * 
 * Usage:
 * const { mutate: bulkDelete } = useBulkDeleteDepartmentsMutation();
 * bulkDelete(['dept-1', 'dept-2', 'dept-3']);
 */
export const useBulkDeleteDepartmentsMutation = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (departmentIds: string[]) => departmentService.bulkDeleteDepartments(departmentIds),

        onMutate: async (departmentIds) => {
            await queryClient.cancelQueries({
                queryKey: departmentKeys.lists()
            });

            const previousLists = queryClient.getQueriesData({
                queryKey: departmentKeys.lists()
            });

            // Remove all selected departments from caches
            queryClient.setQueriesData(
                { queryKey: departmentKeys.lists() },
                (old: DepartmentsResponse | undefined) => {
                    if (!old) return old;
                    return {
                        ...old,
                        departments: old.departments.filter(dept => !departmentIds.includes(dept.id)),
                        total: old.total - departmentIds.length,
                    };
                }
            );

            return { previousLists };
        },

        onError: (_err, _departmentIds, context) => {
            if (context?.previousLists) {
                context.previousLists.forEach(([queryKey, data]) => {
                    queryClient.setQueryData(queryKey, data);
                });
            }
            console.error('Failed to bulk delete departments:', _err);
        },

        onSettled: () => {
            queryClient.invalidateQueries({
                queryKey: departmentKeys.lists()
            });
        },
    });
};

/**
 * ========================
 * UTILITY HOOKS
 * ========================
 */

/**
 * Hook to manually invalidate department caches
 * 
 * Usage:
 * const { invalidateAll, invalidateLists } = useInvalidateDepartments();
 * 
 * // After import departments
 * invalidateLists();
 * 
 * // After organization update (có thể ảnh hưởng tất cả)
 * invalidateAll();
 */
export const useInvalidateDepartments = () => {
    const queryClient = useQueryClient();

    return {
        // Invalidate all department-related queries
        invalidateAll: () => {
            queryClient.invalidateQueries({
                queryKey: departmentKeys.all
            });
        },

        // Invalidate only list queries
        invalidateLists: () => {
            queryClient.invalidateQueries({
                queryKey: departmentKeys.lists()
            });
        },

        // Invalidate specific department detail
        invalidateDetail: (departmentId: string) => {
            queryClient.invalidateQueries({
                queryKey: departmentKeys.detail(departmentId)
            });
        },

        // Force refetch (bypass cache)
        refetchLists: () => {
            queryClient.refetchQueries({
                queryKey: departmentKeys.lists()
            });
        },
    };
};

/**
 * Hook to prefetch next page (optional optimization)
 * 
 * Usage:
 * const { prefetchNextPage } = usePrefetchDepartments();
 * 
 * // When user is on page 2, prefetch page 3
 * prefetchNextPage({ page: 3, limit: 10 });
 */
export const usePrefetchDepartments = () => {
    const queryClient = useQueryClient();

    return {
        prefetchNextPage: (params: DepartmentQueryParams) => {
            queryClient.prefetchQuery({
                queryKey: departmentKeys.list(params),
                queryFn: () => departmentService.getDepartments(params),
                staleTime: DEPARTMENT_CACHE_CONFIG.list.staleTime,
            });
        },
    };
};
