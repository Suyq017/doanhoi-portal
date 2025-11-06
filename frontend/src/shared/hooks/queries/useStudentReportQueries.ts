import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { studentReportsService } from '../../../features/student-reports/services/studentReportsService';
import { studentReportKeys } from './studentReportKeys';
import {
    StudentReportQueryParams,
    ExportOptions,
} from '../../../features/student-reports/types';

/**
 * ========================
 * QUERY HOOKS - DATA FETCHING
 * ========================
 */

/**
 * Hook for fetching student's own report
 * Cache key: ['studentReports', 'myReport', studentCode, filters]
 * 
 * Features:
 * - Smart caching per student code and filter combination
 * - Background refetch for fresh data
 * - Automatic retry on failure
 * 
 * @param studentCode - Student code (MSSV)
 * @param filters - Optional filters (period, dates, status, etc.)
 * @param options - Query options (enabled, etc.)
 */
export const useStudentReport = (
    studentCode: string,
    filters: StudentReportQueryParams = {},
    options?: { enabled?: boolean }
) => {
    return useQuery({
        queryKey: studentReportKeys.myReport(studentCode, filters),
        queryFn: async () => {
            const report = await studentReportsService.getMyReport(studentCode, filters);
            return report;
        },
        staleTime: 3 * 60 * 1000, // 3 minutes (report data thay đổi khi hoàn thành hoạt động)
        gcTime: 10 * 60 * 1000,   // 10 minutes
        enabled: options?.enabled ?? !!studentCode, // Only fetch if studentCode is provided
    });
};

/**
 * Hook for fetching dashboard summary
 * Cache key: ['studentReports', 'summary', studentCode]
 * 
 * Features:
 * - Lightweight summary for dashboard
 * - Longer stale time (less frequent updates)
 */
export const useStudentReportSummary = (
    studentCode: string,
    options?: { enabled?: boolean }
) => {
    return useQuery({
        queryKey: studentReportKeys.summary(studentCode),
        queryFn: async () => {
            const summary = await studentReportsService.getDashboardSummary(studentCode);
            return summary;
        },
        staleTime: 5 * 60 * 1000, // 5 minutes (summary ít thay đổi hơn)
        gcTime: 15 * 60 * 1000,   // 15 minutes
        enabled: options?.enabled ?? !!studentCode,
    });
};

/**
 * Hook for fetching system-wide reports (admin only)
 * Cache key: ['studentReports', 'system', filters]
 * 
 * Features:
 * - Admin view of all student reports
 * - Cache by filter combination
 */
export const useSystemReports = (
    filters: StudentReportQueryParams = {},
    options?: { enabled?: boolean }
) => {
    return useQuery({
        queryKey: studentReportKeys.systemReport(filters),
        queryFn: async () => {
            const reports = await studentReportsService.getSystemReport(filters);
            return reports;
        },
        staleTime: 5 * 60 * 1000, // 5 minutes
        gcTime: 15 * 60 * 1000,   // 15 minutes
        enabled: options?.enabled ?? true,
    });
};

/**
 * ========================
 * MUTATION HOOKS - DATA MODIFICATION
 * ========================
 */

/**
 * Hook for exporting report (PDF/Excel)
 * 
 * Note: This is a mutation because it generates a file (side effect)
 * We don't cache the blob, but we track the mutation state
 */
export const useExportReport = () => {
    return useMutation({
        mutationFn: async ({
            studentCode,
            options
        }: {
            studentCode: string | undefined;
            options: ExportOptions
        }) => {
            const blob = await studentReportsService.exportReport(studentCode, options);
            return blob;
        },
        // No cache invalidation needed for exports
    });
};

/**
 * ========================
 * UTILITY HOOKS
 * ========================
 */

/**
 * Hook to manually invalidate and refetch student report caches
 * Useful after completing an activity or updating participation status
 */
export const useInvalidateStudentReports = () => {
    const queryClient = useQueryClient();

    return {
        /**
         * Invalidate specific student's report
         */
        invalidateStudentReport: (studentCode: string) => {
            queryClient.invalidateQueries({
                queryKey: studentReportKeys.myReport(studentCode)
            });
        },

        /**
         * Invalidate specific student's summary
         */
        invalidateSummary: (studentCode: string) => {
            queryClient.invalidateQueries({
                queryKey: studentReportKeys.summary(studentCode)
            });
        },

        /**
         * Invalidate both report and summary for a student
         */
        invalidateAll: (studentCode: string) => {
            queryClient.invalidateQueries({
                queryKey: studentReportKeys.myReports()
            });
            queryClient.invalidateQueries({
                queryKey: studentReportKeys.summary(studentCode)
            });
        },

        /**
         * Invalidate system-wide reports (admin)
         */
        invalidateSystemReports: () => {
            queryClient.invalidateQueries({
                queryKey: studentReportKeys.systemReports()
            });
        },

        /**
         * Clear all student report caches
         */
        clearAll: () => {
            queryClient.invalidateQueries({
                queryKey: studentReportKeys.all
            });
        },
    };
};

/**
 * Hook to prefetch student report
 * Useful for optimizing navigation or predictive loading
 * 
 * @example
 * const { prefetchReport } = usePrefetchStudentReport();
 * // Prefetch when hovering over link
 * <Link onMouseEnter={() => prefetchReport(studentCode)}>
 */
export const usePrefetchStudentReport = () => {
    const queryClient = useQueryClient();

    return {
        prefetchReport: async (
            studentCode: string,
            filters: StudentReportQueryParams = {}
        ) => {
            await queryClient.prefetchQuery({
                queryKey: studentReportKeys.myReport(studentCode, filters),
                queryFn: () => studentReportsService.getMyReport(studentCode, filters),
                staleTime: 3 * 60 * 1000,
            });
        },

        prefetchSummary: async (studentCode: string) => {
            await queryClient.prefetchQuery({
                queryKey: studentReportKeys.summary(studentCode),
                queryFn: () => studentReportsService.getDashboardSummary(studentCode),
                staleTime: 5 * 60 * 1000,
            });
        },
    };
};
