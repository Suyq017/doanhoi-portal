import type { StudentReport, ActivityParticipation, ParticipationStatus } from './types';

/**
 * Props for StudentInfoCard component
 */
export interface StudentInfoCardProps {
    report: StudentReport;
    displayName: string;
    displayEmail: string;
    formatDays: (days: number | null | undefined) => string;
    className?: string;
}

/**
 * Summary stat item interface
 */
export interface SummaryStatItem {
    label: string;
    value: string | number;
    colorClass: string;
    bgClass: string;
}

/**
 * Props for SummaryStatsGrid component
 */
export interface SummaryStatsGridProps {
    report: StudentReport;
    formatDays: (days: number | null | undefined) => string;
    isAchieved: boolean;
    achievedText: string;
    notAchievedText: string;
    className?: string;
}

/**
 * Props for ActivitiesTable component
 */
export interface ActivitiesTableProps {
    activities: ActivityParticipation[];
    formatDays: (days: number | null | undefined) => string;
    getStatusDisplay: (status: string) => React.ReactElement;
    className?: string;
}

/**
 * Props for StatusBadge component
 */
export interface StatusBadgeProps {
    status: ParticipationStatus | string;
    variant?: 'default' | 'compact';
    className?: string;
}

/**
 * Props for LoadingState component
 */
export interface LoadingStateProps {
    className?: string;
}

/**
 * Props for EmptyState component
 */
export interface EmptyStateProps {
    title: string;
    description: string;
    icon?: React.ReactNode;
    className?: string;
}

/**
 * Props for PageHeader component
 */
export interface PageHeaderProps {
    title: string;
    subtitle: string;
    className?: string;
}
