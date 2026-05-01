import { useQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query';
import { classService } from '../../services/classService';
import { Class, ClassQueryParams, CreateClassRequest, UpdateClassRequest, ClassesResponse } from '../../types/class';

/**
 * ========================
 * CACHE KEYS
 * ========================
 */
export const classKeys = {
    all: ['classes'] as const,
    lists: () => [...classKeys.all, 'list'] as const,
    list: (filters: ClassQueryParams) => [...classKeys.lists(), filters] as const,
    details: () => [...classKeys.all, 'detail'] as const,
    detail: (classId: string) => [...classKeys.details(), classId] as const,
};

/**
 * ========================
 * CACHE CONFIGURATION
 * ========================
 */
const CLASS_CACHE_CONFIG = {
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
 * Hook to fetch paginated class list with filters
 * 
 * Features:
 * - Automatic caching per page + filter combination
 * - keepPreviousData for smooth pagination (no loading spinner)
 * - Background refetch when data becomes stale
 * 
 * Usage:
 * const { data, isLoading, isFetching } = useClassListQuery({
 *   page: 1,
 *   limit: 10,
 *   search: 'IT',
 *   year: 2024
 * });
 */
export const useClassListQuery = (params: ClassQueryParams = {}) => {
    return useQuery({
        queryKey: classKeys.list(params),
        queryFn: async () => {
            const response = await classService.getClasses(params);
            return response;
        },
        ...CLASS_CACHE_CONFIG.list,
        placeholderData: keepPreviousData, // CRITICAL: Smooth pagination
    });
};

/**
 * Hook to fetch single class detail
 * 
 * Features:
 * - Separate cache from list
 * - Longer stale time (class detail ít thay đổi)
 * 
 * Usage:
 * const { data: classData, isLoading } = useClassDetailQuery(classId);
 */
export const useClassDetailQuery = (classId: string, options?: { enabled?: boolean }) => {
    return useQuery({
        queryKey: classKeys.detail(classId),
        queryFn: async () => {
            const classData = await classService.getClass(classId);
            return classData;
        },
        ...CLASS_CACHE_CONFIG.detail,
        enabled: options?.enabled ?? !!classId,
    });
};

/**
 * Hook to fetch all classes (for dropdowns, selects)
 * 
 * Features:
 * - No pagination (limit: 1000)
 * - Longer cache time since it's used for reference
 * - Returns only active classes by default
 * 
 * Usage:
 * const { data: classes = [], isLoading } = useAllClassesQuery();
 */
export const useAllClassesQuery = (includeInactive: boolean = false) => {
    return useQuery({
        queryKey: [...classKeys.all, 'all', includeInactive],
        queryFn: async () => {
            const response = await classService.getClasses({
                limit: 1000,
                page: 1,
                ...(includeInactive ? {} : { isActive: true })
            });
            return response.classes;
        },
        staleTime: 5 * 60 * 1000,      // 5 minutes (longer since reference data)
        gcTime: 15 * 60 * 1000,         // 15 minutes
        refetchOnWindowFocus: false,    // Don't refetch on focus for reference data
    });
};

/**
 * ========================
 * MUTATION HOOKS
 * ========================
 */

/**
 * Hook to create new class
 * 
 * Features:
 * - Invalidate all list queries (class có thể xuất hiện ở nhiều pages)
 * - Refetch current page to show new class
 * 
 * Usage:
 * const { mutate: createClass, isPending } = useCreateClassMutation();
 * createClass(classData, {
 *   onSuccess: () => toast.success('Created!'),
 *   onError: (error) => toast.error(error.message)
 * });
 */
export const useCreateClassMutation = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (classData: CreateClassRequest) =>
            classService.createClass(classData),

        onSuccess: () => {
            // Invalidate all list queries
            // Lý do: Class mới có thể xuất hiện ở bất kỳ page nào (search, filter)
            queryClient.invalidateQueries({
                queryKey: classKeys.lists()
            });
        },

        onError: (error) => {
            console.error('Failed to create class:', error);
        },
    });
};

/**
 * Hook to update class
 * 
 * Features:
 * - Optimistic update: Update cache immediately
 * - Rollback if API fails
 * - Invalidate affected list queries
 * 
 * Usage:
 * const { mutate: updateClass } = useUpdateClassMutation();
 * updateClass({ id: 'class-123', data: { name: 'New Name' } });
 */
export const useUpdateClassMutation = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: ({ id, data }: { id: string; data: UpdateClassRequest }) =>
            classService.updateClass(id, data),

        // Optimistic update
        onMutate: async ({ id, data }) => {
            // Cancel outgoing refetches (tránh overwrite optimistic update)
            await queryClient.cancelQueries({
                queryKey: classKeys.detail(id)
            });

            // Snapshot previous value (để rollback nếu fail)
            const previousClass = queryClient.getQueryData(classKeys.detail(id));

            // Optimistically update detail cache
            queryClient.setQueryData(
                classKeys.detail(id),
                (old: Class | undefined) => {
                    if (!old) return old;
                    return { ...old, ...data };
                }
            );

            // Optimistically update in list caches
            queryClient.setQueriesData(
                { queryKey: classKeys.lists() },
                (old: ClassesResponse | undefined) => {
                    if (!old) return old;
                    return {
                        ...old,
                        classes: old.classes.map(cls =>
                            cls.id === id ? { ...cls, ...data } : cls
                        )
                    };
                }
            );

            return { previousClass };
        },

        onError: (_err, { id }, context) => {
            // Rollback on error
            if (context?.previousClass) {
                queryClient.setQueryData(
                    classKeys.detail(id),
                    context.previousClass
                );
            }
            console.error('Failed to update class:', _err);
        },

        onSettled: (_data, _error, { id }) => {
            // Always refetch to sync với server
            queryClient.invalidateQueries({
                queryKey: classKeys.detail(id)
            });
            queryClient.invalidateQueries({
                queryKey: classKeys.lists()
            });
        },
    });
};

/**
 * Hook to delete class
 * 
 * Features:
 * - Optimistic update: Remove from cache immediately
 * - Rollback if API fails
 * - Smart invalidation: Only refetch affected pages
 * 
 * Usage:
 * const { mutate: deleteClass } = useDeleteClassMutation();
 * deleteClass('class-123');
 */
export const useDeleteClassMutation = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (classId: string) => classService.deleteClass(classId),

        // Optimistic update
        onMutate: async (classId) => {
            // Cancel outgoing queries
            await queryClient.cancelQueries({
                queryKey: classKeys.lists()
            });

            // Snapshot previous lists
            const previousLists = queryClient.getQueriesData({
                queryKey: classKeys.lists()
            });

            // Optimistically remove from all list caches
            queryClient.setQueriesData(
                { queryKey: classKeys.lists() },
                (old: ClassesResponse | undefined) => {
                    if (!old) return old;
                    return {
                        ...old,
                        classes: old.classes.filter(cls => cls.id !== classId),
                        total: old.total - 1,
                    };
                }
            );

            return { previousLists };
        },

        onError: (_err, _classId, context) => {
            // Rollback on error
            if (context?.previousLists) {
                context.previousLists.forEach(([queryKey, data]) => {
                    queryClient.setQueryData(queryKey, data);
                });
            }
            console.error('Failed to delete class:', _err);
        },

        onSettled: () => {
            // Refetch all lists to sync with server
            queryClient.invalidateQueries({
                queryKey: classKeys.lists()
            });
        },
    });
};

/**
 * Hook to bulk delete classes
 * 
 * Features:
 * - Remove multiple classes from cache
 * - Refetch all affected pages
 * 
 * Usage:
 * const { mutate: bulkDelete } = useBulkDeleteClassesMutation();
 * bulkDelete(['class-1', 'class-2', 'class-3']);
 */
export const useBulkDeleteClassesMutation = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (classIds: string[]) => classService.bulkDeleteClasses(classIds),

        onMutate: async (classIds) => {
            await queryClient.cancelQueries({
                queryKey: classKeys.lists()
            });

            const previousLists = queryClient.getQueriesData({
                queryKey: classKeys.lists()
            });

            // Remove all selected classes from caches
            queryClient.setQueriesData(
                { queryKey: classKeys.lists() },
                (old: ClassesResponse | undefined) => {
                    if (!old) return old;
                    return {
                        ...old,
                        classes: old.classes.filter(cls => !classIds.includes(cls.id)),
                        total: old.total - classIds.length,
                    };
                }
            );

            return { previousLists };
        },

        onError: (_err, _classIds, context) => {
            if (context?.previousLists) {
                context.previousLists.forEach(([queryKey, data]) => {
                    queryClient.setQueryData(queryKey, data);
                });
            }
            console.error('Failed to bulk delete classes:', _err);
        },

        onSettled: () => {
            queryClient.invalidateQueries({
                queryKey: classKeys.lists()
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
 * Hook to manually invalidate class caches
 * 
 * Usage:
 * const { invalidateAll, invalidateLists } = useInvalidateClasses();
 * 
 * // After import classes
 * invalidateLists();
 * 
 * // After department update (có thể ảnh hưởng tất cả)
 * invalidateAll();
 */
export const useInvalidateClasses = () => {
    const queryClient = useQueryClient();

    return {
        // Invalidate all class-related queries
        invalidateAll: () => {
            queryClient.invalidateQueries({
                queryKey: classKeys.all
            });
        },

        // Invalidate only list queries
        invalidateLists: () => {
            queryClient.invalidateQueries({
                queryKey: classKeys.lists()
            });
        },

        // Invalidate specific class detail
        invalidateDetail: (classId: string) => {
            queryClient.invalidateQueries({
                queryKey: classKeys.detail(classId)
            });
        },

        // Force refetch (bypass cache)
        refetchLists: () => {
            queryClient.refetchQueries({
                queryKey: classKeys.lists()
            });
        },
    };
};

/**
 * Hook to prefetch next page (optional optimization)
 * 
 * Usage:
 * const { prefetchNextPage } = usePrefetchClasses();
 * 
 * // When user is on page 2, prefetch page 3
 * prefetchNextPage({ page: 3, limit: 10 });
 */
export const usePrefetchClasses = () => {
    const queryClient = useQueryClient();

    return {
        prefetchNextPage: (params: ClassQueryParams) => {
            queryClient.prefetchQuery({
                queryKey: classKeys.list(params),
                queryFn: () => classService.getClasses(params),
                staleTime: CLASS_CACHE_CONFIG.list.staleTime,
            });
        },
    };
};
