import React from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { HardDrive, AlertTriangle } from 'lucide-react';
import { useStorageStats } from '../hooks/useStorageStats';

// Hàm tiện ích để format bytes
const formatBytes = (bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
};

// Custom tooltip cho chart
const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
        const data = payload[0].payload;
        return (
            <div className="bg-white dark:bg-gray-800 p-3 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg">
                <p className="font-medium text-gray-900 dark:text-white">{data.name}</p>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                    {formatBytes(data.value)} ({data.percentage.toFixed(1)}%)
                </p>
            </div>
        );
    }
    return null;
};

const StorageUsageChart: React.FC = () => {
    const { storageStats, loading, error, refetch } = useStorageStats();

    if (loading) {
        return (
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-4">
                <div className="flex items-center justify-between mb-3">
                    <h3 className="text-base font-semibold text-gray-900 dark:text-white flex items-center">
                        <HardDrive className="w-4 h-4 mr-2 text-blue-600" />
                        Dung lượng S3
                    </h3>
                </div>
                <div className="flex items-center justify-center h-48">
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-4">
                <div className="flex items-center justify-between mb-3">
                    <h3 className="text-base font-semibold text-gray-900 dark:text-white flex items-center">
                        <HardDrive className="w-4 h-4 mr-2 text-blue-600" />
                        Dung lượng S3
                    </h3>
                    <button
                        onClick={refetch}
                        className="text-blue-600 hover:text-blue-700 text-xs"
                    >
                        Thử lại
                    </button>
                </div>
                <div className="flex items-center justify-center h-48 text-red-500">
                    <div className="text-center">
                        <AlertTriangle className="w-6 h-6 mx-auto mb-2" />
                        <p className="text-xs">{error}</p>
                    </div>
                </div>
            </div>
        );
    }

    if (!storageStats) {
        return null;
    }    // Chuẩn bị dữ liệu cho biểu đồ
    const usedPercentage = storageStats.usagePercentage;
    const availablePercentage = Math.max(0, 100 - usedPercentage);

    const chartData = [
        {
            name: 'Đã sử dụng',
            value: storageStats.usedSpace,
            percentage: usedPercentage,
            color: usedPercentage > 80 ? '#EF4444' : '#3B82F6',
        },
        {
            name: 'Còn trống',
            value: storageStats.availableSpace,
            percentage: availablePercentage,
            color: '#E5E7EB',
        },
    ];

    console.log('Storage chart data:', {
        usedSpace: formatBytes(storageStats.usedSpace),
        availableSpace: formatBytes(storageStats.availableSpace),
        totalSpace: formatBytes(storageStats.totalSpace),
        usagePercentage: usedPercentage,
        chartData
    });

    // Màu cảnh báo dựa trên mức sử dụng
    const getUsageColor = (percentage: number) => {
        if (percentage >= 90) return 'text-red-600';
        if (percentage >= 80) return 'text-orange-600';
        return 'text-green-600';
    };

    const getUsageIcon = (percentage: number) => {
        if (percentage >= 90) return <AlertTriangle className="w-4 h-4 text-red-600" />;
        return <HardDrive className="w-4 h-4 text-blue-600" />;
    };

    return (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-4">
            <div className="flex items-center justify-between mb-3">
                <h3 className="text-base font-semibold text-gray-900 dark:text-white flex items-center">
                    {getUsageIcon(storageStats.usagePercentage)}
                    <span className="ml-2">Dung lượng S3</span>
                </h3>
                <button
                    onClick={refetch}
                    className="text-blue-600 hover:text-blue-700 text-xs"
                >
                    Làm mới
                </button>
            </div>            <div className="grid grid-cols-1 gap-4">
                {/* Biểu đồ tròn và thông tin chi tiết */}
                <div className="flex items-center justify-between">
                    {/* Biểu đồ tròn */}
                    <div className="h-32 w-32 flex-shrink-0">
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie
                                    data={chartData}
                                    cx="50%"
                                    cy="50%"
                                    innerRadius={20}
                                    outerRadius={50}
                                    paddingAngle={2}
                                    dataKey="value"
                                >
                                    {chartData.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={entry.color} />
                                    ))}
                                </Pie>
                                <Tooltip content={<CustomTooltip />} />
                            </PieChart>
                        </ResponsiveContainer>
                    </div>

                    {/* Thông tin chi tiết */}
                    <div className="flex-1 ml-4 space-y-2">
                        {/* Phần trăm sử dụng */}
                        <div className="text-center">
                            <div className={`text-xl font-bold ${getUsageColor(storageStats.usagePercentage)}`}>
                                {storageStats.usagePercentage}%
                            </div>
                            <div className="text-xs text-gray-600 dark:text-gray-400">
                                Đã sử dụng
                            </div>
                        </div>

                        {/* Legend và thông tin chi tiết */}
                        <div className="space-y-1">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center">
                                    <div className="w-3 h-3 rounded-full bg-blue-500 mr-2"></div>
                                    <span className="text-xs text-gray-600 dark:text-gray-400">Đã dùng:</span>
                                </div>
                                <span className="text-xs font-medium text-gray-900 dark:text-white">
                                    {formatBytes(storageStats.usedSpace)}
                                </span>
                            </div>

                            <div className="flex items-center justify-between">
                                <div className="flex items-center">
                                    <div className="w-3 h-3 rounded-full bg-gray-300 mr-2"></div>
                                    <span className="text-xs text-gray-600 dark:text-gray-400">Còn lại:</span>
                                </div>
                                <span className="text-xs font-medium text-gray-900 dark:text-white">
                                    {formatBytes(storageStats.availableSpace)}
                                </span>
                            </div>

                            <div className="flex justify-between items-center pt-1 border-t border-gray-200 dark:border-gray-700">
                                <span className="text-xs font-medium text-gray-700 dark:text-gray-300">Tổng:</span>
                                <span className="text-xs font-bold text-gray-900 dark:text-white">
                                    {formatBytes(storageStats.totalSpace)}
                                </span>
                            </div>

                            <div className="flex justify-between items-center">
                                <span className="text-xs text-gray-600 dark:text-gray-400">Files:</span>
                                <span className="text-xs font-medium text-gray-900 dark:text-white">
                                    {storageStats.fileCount.toLocaleString()}
                                </span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Thanh tiến trình */}
                <div className="mt-3">
                    <div className="flex justify-between text-xs text-gray-600 dark:text-gray-400 mb-1">
                        <span>Tiến trình</span>
                        <span>{storageStats.usagePercentage}%</span>
                    </div>
                    <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-1.5">
                        <div
                            className={`h-1.5 rounded-full transition-all duration-300 ${storageStats.usagePercentage >= 90
                                ? 'bg-red-500'
                                : storageStats.usagePercentage >= 80
                                    ? 'bg-orange-500'
                                    : 'bg-blue-500'
                                }`}
                            style={{ width: `${Math.min(storageStats.usagePercentage, 100)}%` }}
                        ></div>
                    </div>
                </div>

                {/* Cảnh báo nếu dung lượng cao */}
                {storageStats.usagePercentage >= 80 && (
                    <div className={`mt-2 p-2 rounded text-center ${storageStats.usagePercentage >= 90
                        ? 'bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800'
                        : 'bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800'
                        }`}>
                        <span className={`text-xs ${storageStats.usagePercentage >= 90
                            ? 'text-red-700 dark:text-red-400'
                            : 'text-orange-700 dark:text-orange-400'
                            }`}>
                            {storageStats.usagePercentage >= 90
                                ? 'Dung lượng gần đầy!'
                                : 'Dung lượng cao'
                            }
                        </span>
                    </div>
                )}
            </div>
        </div>
    );
};

export default StorageUsageChart;
