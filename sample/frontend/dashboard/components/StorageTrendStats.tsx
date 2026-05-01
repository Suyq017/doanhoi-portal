import React from 'react';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { TrendDataPoint } from '@/shared/services/dashboardService';

export type MetricType = 'storage' | 'bandwidth';

interface StorageTrendStatsProps {
    data: TrendDataPoint[];
    metric: MetricType;
    isLoading: boolean;
}

const StorageTrendStats: React.FC<StorageTrendStatsProps> = ({
    data,
    metric,
    isLoading,
}) => {
    const formatBytes = (bytes: number): string => {
        if (bytes === 0) return '0 B';
        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    };

    const getMetricValue = (point: TrendDataPoint): number => {
        return metric === 'storage' ? point.storage : point.totalBandwidth;
    };

    const calculateStats = () => {
        if (!data || data.length === 0) {
            return {
                min: 0,
                max: 0,
                avg: 0,
                trend: 0,
                trendDirection: 'neutral' as const,
            };
        }

        const values = data.map(getMetricValue);
        const min = Math.min(...values);
        const max = Math.max(...values);
        const avg = values.reduce((sum, val) => sum + val, 0) / values.length;

        // Calculate trend (percentage change from first to last)
        const firstValue = values[0];
        const lastValue = values[values.length - 1];
        const trend = firstValue === 0 ? 0 : ((lastValue - firstValue) / firstValue) * 100;

        const trendDirection = trend > 0 ? 'up' : trend < 0 ? 'down' : 'neutral';

        return { min, max, avg, trend, trendDirection };
    };

    const stats = calculateStats();

    const getTrendIcon = () => {
        switch (stats.trendDirection) {
            case 'up':
                return <TrendingUp className="h-4 w-4 text-green-500" />;
            case 'down':
                return <TrendingDown className="h-4 w-4 text-red-500" />;
            default:
                return <Minus className="h-4 w-4 text-gray-500" />;
        }
    };

    const getTrendColor = () => {
        switch (stats.trendDirection) {
            case 'up':
                return 'text-green-600 dark:text-green-400';
            case 'down':
                return 'text-red-600 dark:text-red-400';
            default:
                return 'text-gray-600 dark:text-gray-400';
        }
    };

    if (isLoading) {
        return (
            <div className="grid grid-cols-4 gap-4 mb-6">
                {[...Array(4)].map((_, i) => (
                    <div key={i} className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-sm">
                        <div className="animate-pulse">
                            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded mb-2"></div>
                            <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded"></div>
                        </div>
                    </div>
                ))}
            </div>
        );
    }
    const statItems = [
        {
            label: 'Giá trị nhỏ nhất',
            value: formatBytes(stats.min),
            color: 'text-blue-600 dark:text-blue-400',
        },
        {
            label: 'Giá trị lớn nhất',
            value: formatBytes(stats.max),
            color: 'text-purple-600 dark:text-purple-400',
        },
        {
            label: 'Giá trị trung bình',
            value: formatBytes(stats.avg),
            color: 'text-indigo-600 dark:text-indigo-400',
        },
        {
            label: 'Xu hướng',
            value: `${stats.trend >= 0 ? '+' : ''}${stats.trend.toFixed(1)}%`,
            color: getTrendColor(),
            icon: getTrendIcon(),
        },
    ];

    return (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            {statItems.map((item, index) => (
                <div
                    key={index}
                    className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700"
                >
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">
                                {item.label}
                            </p>
                            <p className={`text-lg font-semibold ${item.color}`}>
                                {item.value}
                            </p>
                        </div>
                        {item.icon && (
                            <div className="flex-shrink-0">
                                {item.icon}
                            </div>
                        )}
                    </div>
                </div>
            ))}
        </div>
    );
};

export default StorageTrendStats;
