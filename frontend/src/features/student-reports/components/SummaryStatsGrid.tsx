import React from 'react';
import { useTranslation } from 'react-i18next';
import { BarChart3 } from 'lucide-react';
import type { SummaryStatsGridProps } from '../types/components.types';

/**
 * SummaryStatsGrid Component
 * Displays a grid of summary statistics for CTXH days
 */
export const SummaryStatsGrid: React.FC<SummaryStatsGridProps> = ({
    report,
    formatDays,
    isAchieved,
    achievedText,
    notAchievedText,
    className = '',
}) => {
    const { t } = useTranslation('student-reports');

    const stats = [
        {
            value: formatDays(report?.ctxh_days_new_system),
            label: t('summary.newSystemDays'),
            bgClass: 'bg-green-50 dark:bg-green-900/20',
            colorClass: 'text-green-600 dark:text-green-400',
        },
        {
            value: formatDays(report?.ctxh_days_old_system),
            label: t('summary.oldSystemDays'),
            bgClass: 'bg-orange-50 dark:bg-orange-900/20',
            colorClass: 'text-orange-600 dark:text-orange-400',
        },
        {
            value: formatDays(report?.total_days_completed),
            label: t('summary.totalCTXHDays'),
            bgClass: 'bg-blue-50 dark:bg-blue-900/20',
            colorClass: 'text-blue-600 dark:text-blue-400',
        },
        {
            value: isAchieved ? achievedText : notAchievedText,
            label: t('summary.status'),
            bgClass: 'bg-purple-50 dark:bg-purple-900/20',
            colorClass: isAchieved
                ? 'text-green-600 dark:text-green-400'
                : 'text-red-600 dark:text-red-400',
        },
    ];

    return (
        <div className={`bg-white dark:bg-gray-800 shadow-sm rounded-lg p-6 ${className}`}>
            <h2 className="text-lg font-medium text-gray-900 dark:text-white mb-4 flex items-center">
                <BarChart3 className="h-5 w-5 mr-2" />
                {t('summary.title')}
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                {stats.map((stat, index) => (
                    <div key={index} className={`${stat.bgClass} rounded-lg p-4`}>
                        <div className={`text-2xl font-bold ${stat.colorClass}`}>
                            {stat.value}
                        </div>
                        <div className="text-sm text-gray-600 dark:text-gray-400">
                            {stat.label}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default SummaryStatsGrid;
