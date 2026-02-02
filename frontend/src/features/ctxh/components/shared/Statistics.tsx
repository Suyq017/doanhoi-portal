import React from 'react';
import { StatCardProps, StatisticsGridProps, CompletionRateProps } from '../../types';

/**
 * Single stat card component
 */
export const StatCard: React.FC<StatCardProps> = ({ value, label, colorClass }) => {
    return (
        <div className={`${colorClass} p-4 rounded-lg`}>
            <div className="text-2xl font-bold">{value}</div>
            <div className="text-sm text-gray-600 dark:text-gray-300">{label}</div>
        </div>
    );
};

/**
 * Statistics grid for activity overview
 */
export const StatisticsGrid: React.FC<StatisticsGridProps & {
    labels: {
        total: string;
        completed: string;
        participating: string;
        loading?: string;
    };
}> = ({ statistics, isLoading, labels }) => {
    if (isLoading) {
        return (
            <div className="text-center py-8">
                <div className="inline-block animate-spin rounded-full h-6 w-6 border-4 border-gray-200 dark:border-gray-600 border-t-doan-500 dark:border-t-doan-400"></div>
                {labels.loading && (
                    <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">{labels.loading}</p>
                )}
            </div>
        );
    }

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-full overflow-hidden">
            <StatCard
                value={statistics.total}
                label={labels.total}
                colorClass="bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400"
            />
            <StatCard
                value={statistics.completed}
                label={labels.completed}
                colorClass="bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400"
            />
            <StatCard
                value={statistics.registered}
                label={labels.participating}
                colorClass="bg-yellow-50 dark:bg-yellow-900/20 text-yellow-600 dark:text-yellow-400"
            />
        </div>
    );
};

/**
 * Completion rate details
 */
export const CompletionRateDetails: React.FC<CompletionRateProps & {
    labels: {
        completionRate: string;
        participatingStudents: string;
        students: string;
    };
}> = ({ completed, total, registered, labels }) => {
    const completionRate = total > 0 ? Math.round((completed / total) * 100) : 0;

    return (
        <div className="mt-8">
            <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                    <div>
                        <span className="font-medium text-gray-700 dark:text-gray-300">{labels.completionRate}:</span>
                        <span className="ml-2 text-gray-600 dark:text-gray-400">
                            {completionRate}%
                        </span>
                    </div>
                    <div>
                        <span className="font-medium text-gray-700 dark:text-gray-300">{labels.participatingStudents}:</span>
                        <span className="ml-2 text-gray-600 dark:text-gray-400">
                            {registered} {labels.students}
                        </span>
                    </div>
                </div>
            </div>
        </div>
    );
};
