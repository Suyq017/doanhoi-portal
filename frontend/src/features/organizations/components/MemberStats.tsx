import React from 'react';
import { Users, UserCheck, UserX, UserPlus } from 'lucide-react';
import { useTranslation } from 'react-i18next';

export interface MemberStatsProps {
    doanVienCount: number;      // Số đoàn viên
    hoiVienCount: number;       // Số hội viên  
    bothMemberCount: number;    // Số thành viên vừa là đoàn viên vừa là hội viên
    nonMemberCount: number;     // Số thành viên chưa tham gia
    totalMembers: number;       // Tổng số thành viên
    loading?: boolean;
}

const MemberStats: React.FC<MemberStatsProps> = ({
    doanVienCount,
    hoiVienCount,
    bothMemberCount,
    nonMemberCount,
    totalMembers,
    loading = false
}) => {
    const { t, i18n } = useTranslation(['organizations', 'common']);

    return (
        <div className="grid grid-cols-1 md:grid-cols-5 gap-6" key={i18n.language}>
            {/* Đoàn viên */}
            <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
                <div className="flex items-center">
                    <div className="p-3 rounded-lg bg-doan-500">
                        <UserCheck className="w-6 h-6 text-white" />
                    </div>
                    <div className="ml-4">
                        <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                            {t('organizations:memberStats.doanVien')}
                        </p>
                        <p className="text-2xl font-semibold text-gray-900 dark:text-white">
                            {loading ? (
                                <span className="inline-block w-8 h-6 bg-gray-200 dark:bg-gray-700 animate-pulse rounded"></span>
                            ) : (
                                doanVienCount.toLocaleString()
                            )}
                        </p>
                    </div>
                </div>
            </div>

            {/* Hội viên */}
            <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
                <div className="flex items-center">
                    <div className="p-3 rounded-lg bg-hsv-500">
                        <UserCheck className="w-6 h-6 text-white" />
                    </div>
                    <div className="ml-4">
                        <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                            {t('organizations:memberStats.hoiVien')}
                        </p>
                        <p className="text-2xl font-semibold text-gray-900 dark:text-white">
                            {loading ? (
                                <span className="inline-block w-8 h-6 bg-gray-200 dark:bg-gray-700 animate-pulse rounded"></span>
                            ) : (
                                hoiVienCount.toLocaleString()
                            )}
                        </p>
                    </div>
                </div>
            </div>

            {/* Cả đoàn viên và hội viên */}
            <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
                <div className="flex items-center">
                    <div className="p-3 rounded-lg bg-blue-500">
                        <UserPlus className="w-6 h-6 text-white" />
                    </div>
                    <div className="ml-4">
                        <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                            {t('organizations:memberStats.bothMember')}
                        </p>
                        <p className="text-2xl font-semibold text-gray-900 dark:text-white">
                            {loading ? (
                                <span className="inline-block w-8 h-6 bg-gray-200 dark:bg-gray-700 animate-pulse rounded"></span>
                            ) : (
                                bothMemberCount.toLocaleString()
                            )}
                        </p>
                    </div>
                </div>
            </div>

            {/* Chưa tham gia */}
            <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
                <div className="flex items-center">
                    <div className="p-3 rounded-lg bg-gray-500">
                        <UserX className="w-6 h-6 text-white" />
                    </div>
                    <div className="ml-4">
                        <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                            {t('organizations:memberStats.nonMember')}
                        </p>
                        <p className="text-2xl font-semibold text-gray-900 dark:text-white">
                            {loading ? (
                                <span className="inline-block w-8 h-6 bg-gray-200 dark:bg-gray-700 animate-pulse rounded"></span>
                            ) : (
                                nonMemberCount.toLocaleString()
                            )}
                        </p>
                    </div>
                </div>
            </div>

            {/* Tổng số thành viên */}
            <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
                <div className="flex items-center">
                    <div className="p-3 rounded-lg bg-purple-500">
                        <Users className="w-6 h-6 text-white" />
                    </div>
                    <div className="ml-4">
                        <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                            {t('organizations:memberStats.totalMembers')}
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

export default MemberStats;