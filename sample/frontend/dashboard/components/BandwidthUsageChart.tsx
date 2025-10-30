import React from 'react';
import { BarChart, Bar, ResponsiveContainer, Tooltip, XAxis, YAxis, Cell } from 'recharts';
import { Wifi, AlertTriangle } from 'lucide-react';
import { useStorageStats } from '../hooks/useStorageStats';

// Hàm tiện ích để format bytes
const formatBytes = (bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
};

const BandwidthUsageChart: React.FC = () => {
    const { storageStats, loading, error, refetch } = useStorageStats();

    if (loading) {
        return (
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-4">
                <div className="flex items-center justify-between mb-3">
                    <h3 className="text-base font-semibold text-gray-900 dark:text-white flex items-center">
                        <Wifi className="w-4 h-4 mr-2 text-blue-600" />
                        Băng thông S3
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
                        <Wifi className="w-4 h-4 mr-2 text-blue-600" />
                        Băng thông S3
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
    }

    // Dữ liệu cho biểu đồ bandwidth
    const bandwidthData = [
        {
            name: 'Upload',
            value: storageStats.bandwidthIn,
            color: '#10B981', // Green
        },
        {
            name: 'Download',
            value: storageStats.bandwidthOut,
            color: '#3B82F6', // Blue
        }
    ];

    const getBandwidthColor = (percentage: number) => {
        if (percentage >= 90) return 'text-red-600';
        if (percentage >= 80) return 'text-orange-600';
        return 'text-green-600';
    }; const totalBandwidthUsed = storageStats.bandwidthIn + storageStats.bandwidthOut;

    return (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-4">            <div className="flex items-center justify-between mb-3">
            <h3 className="text-base font-semibold text-gray-900 dark:text-white flex items-center">
                <Wifi className="w-4 h-4 mr-2 text-blue-600" />
                Băng thông tổng thể
            </h3>
            <div className={`text-xs font-medium ${getBandwidthColor(storageStats.bandwidthUsagePercentage)}`}>
                {formatBytes(totalBandwidthUsed)}
            </div>
        </div>            <div className="grid grid-cols-1 gap-4">
                {/* Biểu đồ cột và thông tin chi tiết */}
                <div className="flex items-center justify-between">
                    {/* Biểu đồ cột bandwidth */}
                    <div className="h-32 w-32 flex-shrink-0">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={bandwidthData} margin={{ top: 5, right: 5, left: 5, bottom: 5 }}>
                                <XAxis
                                    dataKey="name"
                                    tick={{ fontSize: 8 }}
                                    className="text-gray-600 dark:text-gray-400"
                                    axisLine={false}
                                    tickLine={false}
                                />
                                <YAxis hide />
                                <Tooltip
                                    formatter={(value: number) => [formatBytes(value), '']}
                                    labelStyle={{ color: '#374151' }}
                                    contentStyle={{
                                        backgroundColor: 'rgb(255 255 255)',
                                        border: '1px solid rgb(209 213 219)',
                                        borderRadius: '0.5rem',
                                        fontSize: '12px'
                                    }}
                                />
                                <Bar dataKey="value" radius={[2, 2, 0, 0]}>
                                    {bandwidthData.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={entry.color} />
                                    ))}
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    </div>

                    {/* Thông tin chi tiết bandwidth */}
                    <div className="flex-1 ml-4 space-y-2">
                        <div className="text-center">
                            <div className="text-xl font-bold text-blue-600">
                                {formatBytes(totalBandwidthUsed)}
                            </div>
                            <div className="text-xs text-gray-600 dark:text-gray-400">
                                Tổng băng thông
                            </div>
                        </div>

                        <div className="space-y-1">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center">
                                    <div className="w-3 h-3 rounded-full bg-green-500 mr-2"></div>
                                    <span className="text-xs text-gray-600 dark:text-gray-400">Upload:</span>
                                </div>
                                <span className="text-xs font-medium text-gray-900 dark:text-white">
                                    {formatBytes(storageStats.bandwidthIn)}
                                </span>
                            </div>

                            <div className="flex items-center justify-between">
                                <div className="flex items-center">
                                    <div className="w-3 h-3 rounded-full bg-blue-500 mr-2"></div>
                                    <span className="text-xs text-gray-600 dark:text-gray-400">Download:</span>
                                </div>
                                <span className="text-xs font-medium text-gray-900 dark:text-white">
                                    {formatBytes(storageStats.bandwidthOut)}
                                </span>
                            </div>

                            <div className="flex justify-between items-center pt-1 border-t border-gray-200 dark:border-gray-700">
                                <span className="text-xs font-medium text-gray-700 dark:text-gray-300">Tổng cộng:</span>
                                <span className="text-xs font-bold text-gray-900 dark:text-white">
                                    {formatBytes(totalBandwidthUsed)}
                                </span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Thống kê bổ sung */}
                <div className="mt-3 p-2 bg-gray-50 dark:bg-gray-700/50 rounded">
                    <div className="text-center">
                        <span className="text-xs text-gray-600 dark:text-gray-400">
                            Tỷ lệ Upload/Download: {storageStats.bandwidthOut > 0 ?
                                (storageStats.bandwidthIn / storageStats.bandwidthOut).toFixed(1) :
                                '∞'
                            }
                        </span>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default BandwidthUsageChart;
