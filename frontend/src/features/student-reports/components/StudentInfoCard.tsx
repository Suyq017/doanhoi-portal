import React from 'react';
import { useTranslation } from 'react-i18next';
import { User } from 'lucide-react';
import type { StudentInfoCardProps } from '../types/components.types';

/**
 * StudentInfoCard Component
 * Displays student information including name, code, email, and total CTXH days
 */
export const StudentInfoCard: React.FC<StudentInfoCardProps> = ({
    report,
    displayName,
    displayEmail,
    formatDays,
    className = '',
}) => {
    const { t } = useTranslation('student-reports');

    return (
        <div className={`bg-white dark:bg-gray-800 shadow-sm rounded-lg p-6 ${className}`}>
            <h2 className="text-lg font-medium text-gray-900 dark:text-white mb-4 flex items-center">
                <User className="h-5 w-5 mr-2" />
                {t('studentInfo.title')}
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                    <label className="text-sm font-medium text-gray-500 dark:text-gray-400">
                        {t('studentInfo.name')}
                    </label>
                    <div className="text-lg font-semibold text-gray-900 dark:text-white">
                        {displayName}
                    </div>
                </div>
                <div>
                    <label className="text-sm font-medium text-gray-500 dark:text-gray-400">
                        {t('studentInfo.code')}
                    </label>
                    <div className="text-lg font-semibold text-gray-900 dark:text-white">
                        {report?.student_code || t('studentInfo.unknown')}
                    </div>
                </div>
                <div>
                    <label className="text-sm font-medium text-gray-500 dark:text-gray-400">
                        {t('studentInfo.email')}
                    </label>
                    <div className="text-lg font-semibold text-gray-900 dark:text-white">
                        {displayEmail}
                    </div>
                </div>
                <div>
                    <label className="text-sm font-medium text-gray-500 dark:text-gray-400">
                        {t('summary.totalDays')}
                    </label>
                    <div className="text-2xl font-bold text-green-600 dark:text-green-400">
                        {formatDays(report?.total_days_completed)} {t('summary.days')}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default StudentInfoCard;
