import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
    awsS3ConfigService,
    type AwsS3Config,
    type CreateAwsS3ConfigRequest,
    type UpdateAwsS3ConfigRequest
} from '../../services/awsS3ConfigService';

/**
 * ========================
 * QUERY KEYS
 * ========================
 */
export const systemConfigKeys = {
    all: ['systemConfig'] as const,

    // AWS S3 configs
    awsS3: () => [...systemConfigKeys.all, 'awsS3'] as const,
    awsS3List: () => [...systemConfigKeys.awsS3(), 'list'] as const,
    awsS3Active: () => [...systemConfigKeys.awsS3(), 'active'] as const,
    awsS3Detail: (id: string) => [...systemConfigKeys.awsS3(), 'detail', id] as const,
};

/**
 * ========================
 * CACHE CONFIGURATION
 * ========================
 */
const SYSTEM_CONFIG_CACHE = {
    // System config changes infrequently, but needs to be fresh
    staleTime: 2 * 60 * 1000, // 2 minutes - shorter for critical config
    cacheTime: 5 * 60 * 1000, // 5 minutes
    refetchOnWindowFocus: false, // Don't auto-refetch on window focus
    refetchOnMount: false, // Use cache if available
};

/**
 * ========================
 * QUERY HOOKS
 * ========================
 */

/**
 * Hook to fetch all AWS S3 configurations
 * Cache key: ['systemConfig', 'awsS3', 'list']
 */
export const useAwsS3ConfigList = () => {
    return useQuery({
        queryKey: systemConfigKeys.awsS3List(),
        queryFn: async () => {
            const response = await awsS3ConfigService.getAllConfigs();
            return response;
        },
        ...SYSTEM_CONFIG_CACHE,
    });
};

/**
 * Hook to fetch active AWS S3 configuration
 * Cache key: ['systemConfig', 'awsS3', 'active']
 */
export const useAwsS3ConfigActive = () => {
    return useQuery({
        queryKey: systemConfigKeys.awsS3Active(),
        queryFn: async () => {
            const response = await awsS3ConfigService.getActiveConfig();
            return response;
        },
        ...SYSTEM_CONFIG_CACHE,
        // Active config is critical, keep staleTime shorter
        staleTime: 1 * 60 * 1000, // 1 minute
    });
};

/**
 * Hook to fetch single AWS S3 configuration by ID
 * Cache key: ['systemConfig', 'awsS3', 'detail', id]
 * Note: Currently fetches all configs and filters by ID since API doesn't have getById endpoint
 */
export const useAwsS3ConfigDetail = (id: string, options?: { enabled?: boolean }) => {
    return useQuery({
        queryKey: systemConfigKeys.awsS3Detail(id),
        queryFn: async () => {
            const configs = await awsS3ConfigService.getAllConfigs();
            return configs.find(config => config.id === id) || null;
        },
        ...SYSTEM_CONFIG_CACHE,
        enabled: options?.enabled ?? !!id,
    });
};

/**
 * ========================
 * MUTATION HOOKS
 * ========================
 */

/**
 * Hook for creating AWS S3 configuration
 */
export const useCreateAwsS3Config = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (data: CreateAwsS3ConfigRequest) =>
            awsS3ConfigService.createConfig(data),

        onSuccess: () => {
            // Invalidate list to show new config
            queryClient.invalidateQueries({
                queryKey: systemConfigKeys.awsS3List()
            });

            // If new config is active, invalidate active query
            queryClient.invalidateQueries({
                queryKey: systemConfigKeys.awsS3Active()
            });
        },

        onError: (error) => {
            console.error('Failed to create AWS S3 config:', error);
        },
    });
};

/**
 * Hook for updating AWS S3 configuration
 * Supports optimistic updates
 */
export const useUpdateAwsS3Config = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: ({ id, data }: { id: string; data: UpdateAwsS3ConfigRequest }) =>
            awsS3ConfigService.updateConfig(id, data),

        // Optimistic update
        onMutate: async ({ id, data }) => {
            // Cancel outgoing refetches
            await queryClient.cancelQueries({
                queryKey: systemConfigKeys.awsS3List()
            });
            await queryClient.cancelQueries({
                queryKey: systemConfigKeys.awsS3Detail(id)
            });

            // Snapshot previous values
            const previousList = queryClient.getQueryData(systemConfigKeys.awsS3List());
            const previousDetail = queryClient.getQueryData(systemConfigKeys.awsS3Detail(id));

            // Optimistically update list
            queryClient.setQueryData(
                systemConfigKeys.awsS3List(),
                (old: AwsS3Config[] | undefined) => {
                    if (!old) return old;
                    return old.map(config =>
                        config.id === id ? { ...config, ...data } : config
                    );
                }
            );

            // Optimistically update detail
            queryClient.setQueryData(
                systemConfigKeys.awsS3Detail(id),
                (old: AwsS3Config | undefined) => {
                    if (!old) return old;
                    return { ...old, ...data };
                }
            );

            return { previousList, previousDetail };
        },

        onError: (_err, variables, context) => {
            // Rollback on error
            if (context?.previousList) {
                queryClient.setQueryData(
                    systemConfigKeys.awsS3List(),
                    context.previousList
                );
            }
            if (context?.previousDetail) {
                queryClient.setQueryData(
                    systemConfigKeys.awsS3Detail(variables.id),
                    context.previousDetail
                );
            }
            console.error('Failed to update AWS S3 config:', _err);
        },

        onSettled: (data, _error, variables) => {
            // Always refetch to ensure sync with server
            queryClient.invalidateQueries({
                queryKey: systemConfigKeys.awsS3List()
            });
            queryClient.invalidateQueries({
                queryKey: systemConfigKeys.awsS3Detail(variables.id)
            });

            // If updated config is active, invalidate active query
            if (data?.isActive) {
                queryClient.invalidateQueries({
                    queryKey: systemConfigKeys.awsS3Active()
                });
            }
        },
    });
};

/**
 * Hook for deleting AWS S3 configuration
 */
export const useDeleteAwsS3Config = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (id: string) => awsS3ConfigService.deleteConfig(id),

        // Optimistic update
        onMutate: async (deletedId) => {
            await queryClient.cancelQueries({
                queryKey: systemConfigKeys.awsS3List()
            });

            const previousList = queryClient.getQueryData(systemConfigKeys.awsS3List());

            // Optimistically remove from list
            queryClient.setQueryData(
                systemConfigKeys.awsS3List(),
                (old: AwsS3Config[] | undefined) => {
                    if (!old) return old;
                    return old.filter(config => config.id !== deletedId);
                }
            );

            return { previousList };
        },

        onError: (_err, _deletedId, context) => {
            // Rollback on error
            if (context?.previousList) {
                queryClient.setQueryData(
                    systemConfigKeys.awsS3List(),
                    context.previousList
                );
            }
            console.error('Failed to delete AWS S3 config:', _err);
        },

        onSettled: () => {
            queryClient.invalidateQueries({
                queryKey: systemConfigKeys.awsS3List()
            });
            queryClient.invalidateQueries({
                queryKey: systemConfigKeys.awsS3Active()
            });
        },
    });
};

/**
 * Hook for testing AWS S3 configuration connection
 */
export const useTestAwsS3Config = () => {
    return useMutation({
        mutationFn: (id: string) => awsS3ConfigService.testConfig(id),
        onError: (error) => {
            console.error('Failed to test AWS S3 config:', error);
        },
    });
};

/**
 * ========================
 * UTILITY HOOKS
 * ========================
 */

/**
 * Hook to manually invalidate system config caches
 */
export const useInvalidateSystemConfig = () => {
    const queryClient = useQueryClient();

    return {
        // Invalidate all system config caches
        invalidateAll: () => {
            queryClient.invalidateQueries({
                queryKey: systemConfigKeys.all
            });
        },

        // Invalidate only AWS S3 caches
        invalidateAwsS3: () => {
            queryClient.invalidateQueries({
                queryKey: systemConfigKeys.awsS3()
            });
        },

        // Invalidate only AWS S3 list
        invalidateAwsS3List: () => {
            queryClient.invalidateQueries({
                queryKey: systemConfigKeys.awsS3List()
            });
        },

        // Invalidate active config
        invalidateActive: () => {
            queryClient.invalidateQueries({
                queryKey: systemConfigKeys.awsS3Active()
            });
        },

        // Force refetch (bypass cache)
        refetchAll: () => {
            queryClient.refetchQueries({
                queryKey: systemConfigKeys.all
            });
        },
    };
};

/**
 * Hook to prefetch system config data
 * Useful for preloading data before user navigates to page
 */
export const usePrefetchSystemConfig = () => {
    const queryClient = useQueryClient();

    return {
        prefetchAwsS3List: () => {
            queryClient.prefetchQuery({
                queryKey: systemConfigKeys.awsS3List(),
                queryFn: () => awsS3ConfigService.getAllConfigs(),
                staleTime: SYSTEM_CONFIG_CACHE.staleTime,
            });
        },

        prefetchActive: () => {
            queryClient.prefetchQuery({
                queryKey: systemConfigKeys.awsS3Active(),
                queryFn: () => awsS3ConfigService.getActiveConfig(),
                staleTime: SYSTEM_CONFIG_CACHE.staleTime,
            });
        },
    };
};
