import { useQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query';
import { userService } from '../../services/userService';
import { User, UserQueryParams, CreateUserRequest, UpdateUserRequest, UsersResponse } from '../../types/user';

/**
 * ========================
 * CACHE KEYS
 * ========================
 */
export const userKeys = {
    all: ['users'] as const,
    lists: () => [...userKeys.all, 'list'] as const,
    list: (filters: UserQueryParams) => [...userKeys.lists(), filters] as const,
    details: () => [...userKeys.all, 'detail'] as const,
    detail: (userId: string) => [...userKeys.details(), userId] as const,
};

/**
 * ========================
 * CACHE CONFIGURATION
 * ========================
 */
const USER_CACHE_CONFIG = {
    list: {
        staleTime: 2 * 60 * 1000,      // 2 minutes
        gcTime: 10 * 60 * 1000,        // 10 minutes (was cacheTime in v4)
        refetchOnWindowFocus: true,
        refetchOnMount: false,
    },
    detail: {
        staleTime: 5 * 60 * 1000,      // 5 minutes
        gcTime: 10 * 60 * 1000,        // 10 minutes
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
 * Hook to fetch paginated user list with filters
 * 
 * Features:
 * - Automatic caching per page + filter combination
 * - keepPreviousData for smooth pagination (no loading spinner)
 * - Background refetch when data becomes stale
 * 
 * Usage:
 * const { data, isLoading, isFetching } = useUserListQuery({
 *   page: 1,
 *   limit: 10,
 *   search: 'nguyen',
 *   userType: 'student'
 * });
 */
export const useUserListQuery = (params: UserQueryParams = {}) => {
    return useQuery({
        queryKey: userKeys.list(params),
        queryFn: async () => {
            const response = await userService.getUsers(params);
            return response;
        },
        ...USER_CACHE_CONFIG.list,
        placeholderData: keepPreviousData, // CRITICAL: Smooth pagination
    });
};

/**
 * Hook to fetch single user detail
 * 
 * Features:
 * - Separate cache from list
 * - Longer stale time (user detail ít thay đổi)
 * 
 * Usage:
 * const { data: user, isLoading } = useUserDetailQuery(userId);
 */
export const useUserDetailQuery = (userId: string, options?: { enabled?: boolean }) => {
    return useQuery({
        queryKey: userKeys.detail(userId),
        queryFn: async () => {
            const user = await userService.getUserById(userId);
            return user;
        },
        ...USER_CACHE_CONFIG.detail,
        enabled: options?.enabled ?? !!userId,
    });
};

/**
 * ========================
 * MUTATION HOOKS
 * ========================
 */

/**
 * Hook to create new user
 * 
 * Features:
 * - Invalidate all list queries (user có thể xuất hiện ở nhiều pages)
 * - Refetch current page to show new user
 * 
 * Usage:
 * const { mutate: createUser, isPending } = useCreateUserMutation();
 * createUser(userData, {
 *   onSuccess: () => toast.success('Created!'),
 *   onError: (error) => toast.error(error.message)
 * });
 */
export const useCreateUserMutation = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (userData: CreateUserRequest) =>
            userService.createUser(userData),

        onSuccess: () => {
            // Invalidate all list queries
            // Lý do: User mới có thể xuất hiện ở bất kỳ page nào (search, filter)
            queryClient.invalidateQueries({
                queryKey: userKeys.lists()
            });
        },

        onError: (error) => {
            console.error('Failed to create user:', error);
        },
    });
};

/**
 * Hook to update user
 * 
 * Features:
 * - Optimistic update: Update cache immediately
 * - Rollback if API fails
 * - Invalidate affected list queries
 * 
 * Usage:
 * const { mutate: updateUser } = useUpdateUserMutation();
 * updateUser({ id: 'user-123', data: { familyName: 'New Name' } });
 */
export const useUpdateUserMutation = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: ({ id, data }: { id: string; data: UpdateUserRequest }) =>
            userService.updateUser(id, data),

        // Optimistic update
        onMutate: async ({ id, data }) => {
            // Cancel outgoing refetches (tránh overwrite optimistic update)
            await queryClient.cancelQueries({
                queryKey: userKeys.detail(id)
            });

            // Snapshot previous value (để rollback nếu fail)
            const previousUser = queryClient.getQueryData(userKeys.detail(id));

            // Optimistically update detail cache
            queryClient.setQueryData(
                userKeys.detail(id),
                (old: User | undefined) => {
                    if (!old) return old;
                    return { ...old, ...data };
                }
            );

            // Optimistically update in list caches
            queryClient.setQueriesData(
                { queryKey: userKeys.lists() },
                (old: UsersResponse | undefined) => {
                    if (!old) return old;
                    return {
                        ...old,
                        users: old.users.map(user =>
                            user.id === id ? { ...user, ...data } : user
                        )
                    };
                }
            );

            return { previousUser };
        },

        onError: (_err, { id }, context) => {
            // Rollback on error
            if (context?.previousUser) {
                queryClient.setQueryData(
                    userKeys.detail(id),
                    context.previousUser
                );
            }
            console.error('Failed to update user:', _err);
        },

        onSettled: (_data, _error, { id }) => {
            // Always refetch to sync với server
            queryClient.invalidateQueries({
                queryKey: userKeys.detail(id)
            });
            queryClient.invalidateQueries({
                queryKey: userKeys.lists()
            });
        },
    });
};

/**
 * Hook to delete user
 * 
 * Features:
 * - Optimistic update: Remove from cache immediately
 * - Rollback if API fails
 * - Smart invalidation: Only refetch affected pages
 * 
 * Usage:
 * const { mutate: deleteUser } = useDeleteUserMutation();
 * deleteUser('user-123');
 */
export const useDeleteUserMutation = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (userId: string) => userService.deleteUser(userId),

        // Optimistic update
        onMutate: async (userId) => {
            // Cancel outgoing queries
            await queryClient.cancelQueries({
                queryKey: userKeys.lists()
            });

            // Snapshot previous lists
            const previousLists = queryClient.getQueriesData({
                queryKey: userKeys.lists()
            });

            // Optimistically remove from all list caches
            queryClient.setQueriesData(
                { queryKey: userKeys.lists() },
                (old: UsersResponse | undefined) => {
                    if (!old) return old;
                    return {
                        ...old,
                        users: old.users.filter(user => user.id !== userId),
                        total: old.total - 1,
                    };
                }
            );

            return { previousLists };
        },

        onError: (_err, _userId, context) => {
            // Rollback on error
            if (context?.previousLists) {
                context.previousLists.forEach(([queryKey, data]) => {
                    queryClient.setQueryData(queryKey, data);
                });
            }
            console.error('Failed to delete user:', _err);
        },

        onSettled: () => {
            // Refetch all lists to sync with server
            queryClient.invalidateQueries({
                queryKey: userKeys.lists()
            });
        },
    });
};

/**
 * Hook to bulk delete users
 * 
 * Features:
 * - Remove multiple users from cache
 * - Refetch all affected pages
 * 
 * Usage:
 * const { mutate: bulkDelete } = useBulkDeleteUsersMutation();
 * bulkDelete(['user-1', 'user-2', 'user-3']);
 */
export const useBulkDeleteUsersMutation = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (userIds: string[]) => userService.deleteUsers(userIds),

        onMutate: async (userIds) => {
            await queryClient.cancelQueries({
                queryKey: userKeys.lists()
            });

            const previousLists = queryClient.getQueriesData({
                queryKey: userKeys.lists()
            });

            // Remove all selected users from caches
            queryClient.setQueriesData(
                { queryKey: userKeys.lists() },
                (old: UsersResponse | undefined) => {
                    if (!old) return old;
                    return {
                        ...old,
                        users: old.users.filter(user => !userIds.includes(user.id)),
                        total: old.total - userIds.length,
                    };
                }
            );

            return { previousLists };
        },

        onError: (_err, _userIds, context) => {
            if (context?.previousLists) {
                context.previousLists.forEach(([queryKey, data]) => {
                    queryClient.setQueryData(queryKey, data);
                });
            }
            console.error('Failed to bulk delete users:', _err);
        },

        onSettled: () => {
            queryClient.invalidateQueries({
                queryKey: userKeys.lists()
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
 * Hook to manually invalidate user caches
 * 
 * Usage:
 * const { invalidateAll, invalidateLists } = useInvalidateUsers();
 * 
 * // After import users
 * invalidateLists();
 * 
 * // After role assignment (có thể ảnh hưởng tất cả)
 * invalidateAll();
 */
export const useInvalidateUsers = () => {
    const queryClient = useQueryClient();

    return {
        // Invalidate all user-related queries
        invalidateAll: () => {
            queryClient.invalidateQueries({
                queryKey: userKeys.all
            });
        },

        // Invalidate only list queries
        invalidateLists: () => {
            queryClient.invalidateQueries({
                queryKey: userKeys.lists()
            });
        },

        // Invalidate specific user detail
        invalidateDetail: (userId: string) => {
            queryClient.invalidateQueries({
                queryKey: userKeys.detail(userId)
            });
        },

        // Force refetch (bypass cache)
        refetchLists: () => {
            queryClient.refetchQueries({
                queryKey: userKeys.lists()
            });
        },
    };
};

/**
 * Hook to prefetch next page (optional optimization)
 * 
 * Usage:
 * const { prefetchNextPage } = usePrefetchUsers();
 * 
 * // When user is on page 2, prefetch page 3
 * prefetchNextPage({ page: 3, limit: 10 });
 */
export const usePrefetchUsers = () => {
    const queryClient = useQueryClient();

    return {
        prefetchNextPage: (params: UserQueryParams) => {
            queryClient.prefetchQuery({
                queryKey: userKeys.list(params),
                queryFn: () => userService.getUsers(params),
                staleTime: USER_CACHE_CONFIG.list.staleTime,
            });
        },
    };
};
