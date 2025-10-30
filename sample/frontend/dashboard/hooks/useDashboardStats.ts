import { useQuery } from '@tanstack/react-query';
import { dashboardService, DashboardStats } from '../../../shared/services/dashboardService';
import { performanceUtils } from '../../../shared/utils/cacheUtils';
import { queryKeys } from '../../../shared/cache/queryKeys';
import { cacheConfig } from '../../../shared/cache/cacheConfig';

export const useDashboardStats = () => {
    return useQuery({
        queryKey: queryKeys.dashboard.stats,
        queryFn: async () => {
            const timer = performanceUtils.startTimer('Dashboard Stats API');
            try {
                const data = await dashboardService.getDashboardStats();
                performanceUtils.measureCacheHit('dashboardStats', false);
                return data;
            } finally {
                timer();
            }
        },
        staleTime: cacheConfig.dashboard.staleTime,
        gcTime: cacheConfig.dashboard.gcTime,
        retry: 1,
        retryDelay: 1000,
        // Transform error để maintain backward compatibility
        select: (data: DashboardStats) => {
            performanceUtils.measureCacheHit('dashboardStats', true);
            return data;
        },
    });
};

// Backward compatibility wrapper cho components cũ
export const useDashboardStatsLegacy = () => {
    const query = useDashboardStats();

    return {
        stats: query.data || null,
        loading: query.isLoading,
        error: query.error?.message || null,
        refetch: query.refetch
    };
};
