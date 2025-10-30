import React from 'react';
import { Users, Building, FileText, Shield } from 'lucide-react';
import { DashboardStats as StatsType } from '../../../shared/services/dashboardService';

interface DashboardStatsProps {
    stats: StatsType | null;
    loading: boolean;
}

const DashboardStats: React.FC<DashboardStatsProps> = ({ stats, loading }) => {
    // Stats configuration
    const statsConfig = [
        {
            name: 'Tổng Người Dùng',
            value: stats?.totalUsers?.toLocaleString() || '0',
            icon: Users,
            color: 'bg-blue-500',
            description: 'Tổng số người dùng trong hệ thống'
        },
        {
            name: 'Nhân Viên Hệ Thống',
            value: stats?.totalStaff?.toLocaleString() || '0',
            icon: Shield,
            color: 'bg-green-500',
            description: 'Admin và Staff trong hệ thống'
        },
        {
            name: 'Tổng Tổ Chức',
            value: stats?.organizationCount?.toLocaleString() || '0',
            icon: Building,
            color: 'bg-purple-500',
            description: 'Số lượng tổ chức đã đăng ký'
        },
        {
            name: 'Tổng Văn Bản',
            value: stats?.totalDocuments?.toLocaleString() || '0',
            icon: FileText,
            color: 'bg-orange-500',
            description: 'Văn bản đi và đến trong hệ thống'
        },
    ];

    if (loading) {
        return (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {[1, 2, 3, 4].map((i) => (
                    <div key={i} className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 animate-pulse">
                        <div className="flex items-center">
                            <div className="w-12 h-12 bg-gray-300 dark:bg-gray-600 rounded-xl"></div>
                            <div className="ml-4 flex-1">
                                <div className="h-4 bg-gray-300 dark:bg-gray-600 rounded mb-2"></div>
                                <div className="h-8 bg-gray-300 dark:bg-gray-600 rounded mb-1"></div>
                                <div className="h-3 bg-gray-300 dark:bg-gray-600 rounded"></div>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        );
    }

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {statsConfig.map((stat) => {
                const Icon = stat.icon;
                return (
                    <div
                        key={stat.name}
                        className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 hover:shadow-lg transition-all duration-300 group"
                    >
                        <div className="flex items-center">
                            <div className={`p-3 rounded-xl ${stat.color} shadow-lg group-hover:scale-110 transition-transform duration-300`}>
                                <Icon className="w-6 h-6 text-white" />
                            </div>
                            <div className="ml-4 flex-1">
                                <p className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">
                                    {stat.name}
                                </p>
                                <p className="text-3xl font-bold text-gray-900 dark:text-white mb-1">
                                    {stat.value}
                                </p>
                                <p className="text-xs text-gray-500 dark:text-gray-400">
                                    {stat.description}
                                </p>
                            </div>
                        </div>
                    </div>
                );
            })}
        </div>
    );
};

export default DashboardStats;
