import React from 'react';
import { Building, Users } from 'lucide-react';
import { useTranslation } from 'react-i18next';

export interface OrganizationStatsProps {
    doanCount: number;
    hoiCount: number;
    clbCount: number;
    totalMembers: number;
    loading?: boolean;
}

const OrganizationStats: React.FC<OrganizationStatsProps> = ({
    doanCount,
    hoiCount,
    clbCount,
    totalMembers,
    loading = false
}) => {
    const { t, i18n } = useTranslation(['organizations', 'common']);

    return (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6" key={i18n.language}>
            <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
                <div className="flex items-center">
                    <div className="p-3 rounded-lg bg-doan-500">
                        <Building className="w-6 h-6 text-white" />
                    </div>
                    <div className="ml-4">
                        <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                            {t('organizations:stats.doan_organizations')}
                        </p>
                        <p className="text-2xl font-semibold text-gray-900 dark:text-white">
                            {loading ? (
                                <span className="inline-block w-8 h-6 bg-gray-200 dark:bg-gray-700 animate-pulse rounded"></span>
                            ) : (
                                doanCount
                            )}
                        </p>
                    </div>
                </div>
            </div>

            <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
                <div className="flex items-center">
                    <div className="p-3 rounded-lg bg-hsv-500">
                        <Building className="w-6 h-6 text-white" />
                    </div>
                    <div className="ml-4">
                        <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                            {t('organizations:stats.hoi_organizations')}
                        </p>
                        <p className="text-2xl font-semibold text-gray-900 dark:text-white">
                            {loading ? (
                                <span className="inline-block w-8 h-6 bg-gray-200 dark:bg-gray-700 animate-pulse rounded"></span>
                            ) : (
                                hoiCount
                            )}
                        </p>
                    </div>
                </div>
            </div>

            <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
                <div className="flex items-center">
                    <div className="p-3 rounded-lg bg-green-500">
                        <Building className="w-6 h-6 text-white" />
                    </div>
                    <div className="ml-4">
                        <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                            {t('organizations:stats.clb_organizations')}
                        </p>
                        <p className="text-2xl font-semibold text-gray-900 dark:text-white">
                            {loading ? (
                                <span className="inline-block w-8 h-6 bg-gray-200 dark:bg-gray-700 animate-pulse rounded"></span>
                            ) : (
                                clbCount
                            )}
                        </p>
                    </div>
                </div>
            </div>

            <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
                <div className="flex items-center">
                    <div className="p-3 rounded-lg bg-purple-500">
                        <Users className="w-6 h-6 text-white" />
                    </div>
                    <div className="ml-4">
                        <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                            {t('organizations:stats.total_members')}
                        </p>
                        <p className="text-2xl font-semibold text-gray-900 dark:text-white">
                            {loading ? (
                                <span className="inline-block w-8 h-6 bg-gray-200 dark:bg-gray-700 animate-pulse rounded"></span>
                            ) : (
                                totalMembers.toLocaleString()
                            )}
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default OrganizationStats;