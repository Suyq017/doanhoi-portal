import React from 'react';
import { Building, Users } from 'lucide-react';
import { useTranslation } from 'react-i18next';

export interface OrganizationStatsProps {
    doanCount: number;
    hoiCount: number;
    clbCount: number;
    totalMembers: number;
    loading?: boolean;
    type?: string; // ✅ Thêm prop type để tùy chỉnh hiển thị
}

const OrganizationStats: React.FC<OrganizationStatsProps> = ({
    doanCount,
    hoiCount,
    clbCount,
    totalMembers,
    loading = false,
    type
}) => {
    const { t, i18n } = useTranslation(['organizations', 'common']);

    // Tùy chỉnh stats hiển thị dựa vào type
    const getVisibleStats = () => {
        if (type === 'lien_chi_hoi') {
            return [
                {
                    key: 'hoi',
                    label: t('organizations:stats.hoi_organizations'),
                    value: hoiCount,
                    bgColor: 'bg-hsv-500'
                },
                {
                    key: 'clb',
                    label: t('organizations:stats.clb_organizations'),
                    value: clbCount,
                    bgColor: 'bg-green-500'
                },
                {
                    key: 'members',
                    label: t('organizations:stats.total_members'),
                    value: totalMembers,
                    bgColor: 'bg-purple-500',
                    icon: 'users'
                }
            ];
        }

        if (type === 'doan_co_so') {
            return [
                {
                    key: 'doan',
                    label: t('organizations:stats.doan_organizations'),
                    value: doanCount,
                    bgColor: 'bg-doan-500'
                },
                {
                    key: 'members',
                    label: t('organizations:stats.total_members'),
                    value: totalMembers,
                    bgColor: 'bg-purple-500',
                    icon: 'users'
                }
            ];
        }

        // Default: hiển thị tất cả stats
        return [
            {
                key: 'doan',
                label: t('organizations:stats.doan_organizations'),
                value: doanCount,
                bgColor: 'bg-doan-500'
            },
            {
                key: 'hoi',
                label: t('organizations:stats.hoi_organizations'),
                value: hoiCount,
                bgColor: 'bg-hsv-500'
            },
            {
                key: 'clb',
                label: t('organizations:stats.clb_organizations'),
                value: clbCount,
                bgColor: 'bg-green-500'
            },
            {
                key: 'members',
                label: t('organizations:stats.total_members'),
                value: totalMembers,
                bgColor: 'bg-purple-500',
                icon: 'users'
            }
        ];
    };

    const visibleStats = getVisibleStats();
    const gridCols = visibleStats.length === 2 ? 'md:grid-cols-2' :
        visibleStats.length === 3 ? 'md:grid-cols-3' : 'md:grid-cols-4';

    return (
        <div className={`grid grid-cols-1 ${gridCols} gap-6`} key={i18n.language}>
            {visibleStats.map((stat) => (
                <div key={stat.key} className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
                    <div className="flex items-center">
                        <div className={`p-3 rounded-lg ${stat.bgColor}`}>
                            {stat.icon === 'users' ? (
                                <Users className="w-6 h-6 text-white" />
                            ) : (
                                <Building className="w-6 h-6 text-white" />
                            )}
                        </div>
                        <div className="ml-4">
                            <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                                {stat.label}
                            </p>
                            <p className="text-2xl font-semibold text-gray-900 dark:text-white">
                                {loading ? (
                                    <span className="inline-block w-8 h-6 bg-gray-200 dark:bg-gray-700 animate-pulse rounded"></span>
                                ) : (
                                    stat.key === 'members' ? stat.value.toLocaleString() : stat.value
                                )}
                            </p>
                        </div>
                    </div>
                </div>
            ))}        </div>
    );
};

export default OrganizationStats;