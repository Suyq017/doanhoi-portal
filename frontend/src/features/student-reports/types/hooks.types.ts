import type { StudentReport } from './types';

/**
 * Student info state interface
 */
export interface StudentInfoState {
    name?: string;
    email?: string;
}

/**
 * Status display configuration
 */
export interface StatusDisplayConfig {
    text: string;
    className: string;
    icon: React.ReactElement;
}

/**
 * Return type for useStudentReportsPage hook
 */
export interface UseStudentReportsPageReturn {
    // Data
    report: StudentReport | undefined;
    studentInfo: StudentInfoState;
    studentCode: string;

    // Loading states
    isLoading: boolean;

    // Helpers
    formatDays: (days: number | null | undefined) => string;
    getStatusDisplay: (status: string) => React.ReactElement;

    // Computed values
    isCtxhAchieved: boolean;
    displayName: string;
    displayEmail: string;
}
