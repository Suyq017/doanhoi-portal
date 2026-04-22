/**
 * Query Key Factory for Student Reports
 * 
 * Hierarchical structure:
 * - ['studentReports'] - Base key for all student report queries
 * - ['studentReports', 'myReport', studentCode, filters] - Individual student report
 * - ['studentReports', 'summary', studentCode] - Dashboard summary
 * - ['studentReports', 'system', filters] - System-wide reports (admin)
 */

import { StudentReportQueryParams } from '../../../features/student-reports/types';

export const studentReportKeys = {
    // Base key - invalidate this to clear ALL student report caches
    all: ['studentReports'] as const,

    // My Report queries (student's own report)
    myReports: () => [...studentReportKeys.all, 'myReport'] as const,
    myReport: (studentCode: string, filters?: StudentReportQueryParams) =>
        [...studentReportKeys.myReports(), studentCode, filters] as const,

    // Dashboard summary queries
    summaries: () => [...studentReportKeys.all, 'summary'] as const,
    summary: (studentCode: string) =>
        [...studentReportKeys.summaries(), studentCode] as const,

    // System-wide reports (admin only)
    systemReports: () => [...studentReportKeys.all, 'system'] as const,
    systemReport: (filters?: StudentReportQueryParams) =>
        [...studentReportKeys.systemReports(), filters] as const,
};
