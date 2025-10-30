import { useQuery, useQueryClient } from '@tanstack/react-query';
import { dashboardService, StorageStats } from '../../../shared/services/dashboardService';
import { performanceUtils } from '../../../shared/utils/cacheUtils';
import { queryKeys } from '../../../shared/cache/queryKeys';
import { cacheConfig } from '../../../shared/cache/cacheConfig';

interface UseStorageStatsReturn {
    storageStats: StorageStats | null;
    loading: boolean;
    error: string | null;
    refetch: () => Promise<void>;
}

export const useStorageStats = (): UseStorageStatsReturn => {
    const query = useQuery({
        queryKey: queryKeys.dashboard.storage,
        queryFn: async () => {
            const timer = performanceUtils.startTimer('Storage Stats API');
            try {
                const data = await dashboardService.getStorageStats();
                performanceUtils.measureCacheHit('storageStats', false);
                return data;
            } finally {
                timer();
            }
        },
        staleTime: cacheConfig.storage.staleTime,
        gcTime: cacheConfig.storage.gcTime,
        retry: 1,
        retryDelay: 1000,
        select: (data: StorageStats) => {
            performanceUtils.measureCacheHit('storageStats', true);
            return data;
        },
    });

    return {
        storageStats: query.data || null,
        loading: query.isLoading,
        error: query.error?.message || null,
        refetch: async () => {
            await query.refetch();
        },
    };
};

// Hook để invalidate storage cache (dùng khi upload file)
export const useInvalidateStorageCache = () => {
    const queryClient = useQueryClient();

    return {
        invalidateStorage: () => {
            queryClient.invalidateQueries({ queryKey: queryKeys.dashboard.storage });
            queryClient.invalidateQueries({ queryKey: ['storageTrend'] });
        },
        invalidateAll: () => {
            queryClient.invalidateQueries({ queryKey: ['dashboardStats'] });
            queryClient.invalidateQueries({ queryKey: ['storageStats'] });
            queryClient.invalidateQueries({ queryKey: ['storageTrend'] });
        }
    };
};
