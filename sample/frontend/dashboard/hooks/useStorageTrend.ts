import { useQuery } from '@tanstack/react-query';
import { dashboardService, TrendDataPoint, TimeRange } from '../../../shared/services/dashboardService';
import { performanceUtils } from '../../../shared/utils/cacheUtils';
import { queryKeys } from '../../../shared/cache/queryKeys';
import { cacheConfig } from '../../../shared/cache/cacheConfig';

interface UseStorageTrendReturn {
    data: TrendDataPoint[];
    loading: boolean;
    error: string | null;
    refetch: () => Promise<void>;
}

export const useStorageTrend = (timeRange: TimeRange): UseStorageTrendReturn => {
    const query = useQuery({
        queryKey: queryKeys.dashboard.combinedTrend(timeRange),
        queryFn: async () => {
            const timer = performanceUtils.startTimer(`Combined Trend API (${timeRange})`);
            try {
                console.log(`Fetching combined trend data for timeRange: ${timeRange}`);
                const trendData = await dashboardService.getCombinedTrend(timeRange);

                console.log('Received trend data:', {
                    dataLength: trendData.length,
                    firstPoint: trendData[0],
                    lastPoint: trendData[trendData.length - 1]
                });

                performanceUtils.measureCacheHit(`combinedTrend-${timeRange}`, false);
                return trendData;
            } finally {
                timer();
            }
        },
        staleTime: cacheConfig.trends.staleTime,
        gcTime: cacheConfig.trends.gcTime,
        retry: 1,
        retryDelay: 1000,
        // Auto-refetch every 5 minutes when component is active
        refetchInterval: 5 * 60 * 1000,
        refetchIntervalInBackground: false,
        select: (data: TrendDataPoint[]) => {
            performanceUtils.measureCacheHit(`combinedTrend-${timeRange}`, true);
            return data;
        },
    });

    return {
        data: query.data || [],
        loading: query.isLoading,
        error: query.error?.message || null,
        refetch: async () => {
            await query.refetch();
        },
    };
};

// Hook để fetch các loại trend khác nhau
export const useStorageTrendOnly = (timeRange: TimeRange) => {
    return useQuery({
        queryKey: queryKeys.dashboard.storageTrend(timeRange),
        queryFn: () => dashboardService.getStorageTrend(timeRange),
        staleTime: cacheConfig.trends.staleTime,
        gcTime: cacheConfig.trends.gcTime,
    });
};

export const useBandwidthTrend = (timeRange: TimeRange) => {
    return useQuery({
        queryKey: queryKeys.dashboard.bandwidthTrend(timeRange),
        queryFn: () => dashboardService.getBandwidthTrend(timeRange),
        staleTime: cacheConfig.trends.staleTime,
        gcTime: cacheConfig.trends.gcTime,
    });
};
