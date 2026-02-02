/**
 * useDashboardStats - Custom hook for fetching and managing dashboard statistics
 */

import { useQuery } from '@tanstack/react-query';
import { dashboardService } from '../services/dashboardService';
import { DashboardStats, UseDashboardStatsReturn } from '../types';

export const DASHBOARD_STATS_QUERY_KEY = ['dashboardStats'];

export const useDashboardStats = (enabled: boolean = true): UseDashboardStatsReturn => {
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: DASHBOARD_STATS_QUERY_KEY,
    queryFn: () => dashboardService.getStats(),
    enabled,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  return {
    stats: data,
    isLoading,
    error: error as Error | null,
    refetch,
  };
};

export default useDashboardStats;
