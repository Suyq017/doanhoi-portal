import { useQuery } from '@tanstack/react-query';
import { dashboardService } from '../../services/dashboardService';

export const useDashboardStats = () => {
    return useQuery({
        queryKey: ['dashboard-stats'],
        queryFn: () => dashboardService.getDashboardStats(),
        staleTime: 5 * 60 * 1000, // 5 phút
        gcTime: 10 * 60 * 1000, // 10 phút
    });
};

export const useRecentActivities = () => {
    return useQuery({
        queryKey: ['recent-activities'],
        queryFn: () => dashboardService.getRecentActivities(),
        staleTime: 2 * 60 * 1000, // 2 phút
        gcTime: 5 * 60 * 1000,
    });
};

export const useS3Statistics = (organizationId?: string) => {
    return useQuery({
        queryKey: ['s3-statistics', organizationId],
        queryFn: () => dashboardService.getS3Statistics(organizationId),
        staleTime: 5 * 60 * 1000, // 5 phút
        gcTime: 10 * 60 * 1000, // 10 phút
    });
};
