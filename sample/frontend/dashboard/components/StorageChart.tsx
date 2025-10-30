import React from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts';
import { HardDrive, Database, AlertTriangle, Download, Upload, Wifi } from 'lucide-react';
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
                    {formatBytes(data.value)} ({data.percentage}%)
                </p>
            </div>
        );
    }
    return null;
};

const StorageChart: React.FC = () => {
    const { storageStats, loading, error, refetch } = useStorageStats();

    if (loading) {
        return (
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
                <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center">
                        <Database className="w-5 h-5 mr-2 text-blue-600" />
                        Dung lượng S3
                    </h3>
                </div>
                <div className="flex items-center justify-center h-64">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
                <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center">
                        <Database className="w-5 h-5 mr-2 text-blue-600" />
                        Dung lượng S3
                    </h3>
                    <button
                        onClick={refetch}
                        className="text-blue-600 hover:text-blue-700 text-sm"
                    >
                        Thử lại
                    </button>
                </div>
                <div className="flex items-center justify-center h-64 text-red-500">
                    <div className="text-center">
                        <AlertTriangle className="w-8 h-8 mx-auto mb-2" />
                        <p className="text-sm">{error}</p>
                    </div>
                </div>
            </div>
        );
    }

    if (!storageStats) {
        return null;
    }

    // Chuẩn bị dữ liệu cho biểu đồ
    const chartData = [
        {
            name: 'Đã sử dụng',
            value: storageStats.usedSpace,
            percentage: storageStats.usagePercentage,
            color: storageStats.usagePercentage > 80 ? '#EF4444' : '#3B82F6', // Đỏ nếu > 80%, xanh bình thường
        },
        {
            name: 'Còn trống',
            value: storageStats.availableSpace,
            percentage: Math.round(100 - storageStats.usagePercentage),
            color: '#E5E7EB',
        },
    ];

    // Màu cảnh báo dựa trên mức sử dụng
    const getUsageColor = (percentage: number) => {
        if (percentage >= 90) return 'text-red-600';
        if (percentage >= 80) return 'text-orange-600';
        return 'text-green-600';
    };

    const getUsageIcon = (percentage: number) => {
        if (percentage >= 90) return <AlertTriangle className="w-5 h-5 text-red-600" />;
        return <HardDrive className="w-5 h-5 text-blue-600" />;
    }; return (
        <div className="space-y-6">
            {/* Storage Usage Card */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
                <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center">
                        {getUsageIcon(storageStats.usagePercentage)}
                        <span className="ml-2">Dung lượng S3</span>
                    </h3>
                    <button
                        onClick={refetch}
                        className="text-blue-600 hover:text-blue-700 text-sm"
                    >
                        Làm mới
                    </button>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Biểu đồ tròn */}
                    <div className="h-64">
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie
                                    data={chartData}
                                    cx="50%"
                                    cy="50%"
                                    innerRadius={60}
                                    outerRadius={100}
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
                    <div className="space-y-4">
                        <div className="text-center">
                            <div className={`text-3xl font-bold ${getUsageColor(storageStats.usagePercentage)}`}>
                                {storageStats.usagePercentage}%
                            </div>
                            <div className="text-sm text-gray-600 dark:text-gray-400">
                                Đã sử dụng
                            </div>
                        </div>

                        <div className="space-y-3">
                            <div className="flex justify-between items-center">
                                <span className="text-sm text-gray-600 dark:text-gray-400">Đã sử dụng:</span>
                                <span className="font-medium text-gray-900 dark:text-white">
                                    {formatBytes(storageStats.usedSpace)}
                                </span>
                            </div>

                            <div className="flex justify-between items-center">
                                <span className="text-sm text-gray-600 dark:text-gray-400">Còn lại:</span>
                                <span className="font-medium text-gray-900 dark:text-white">
                                    {formatBytes(storageStats.availableSpace)}
                                </span>
                            </div>

                            <div className="flex justify-between items-center">
                                <span className="text-sm text-gray-600 dark:text-gray-400">Tổng dung lượng:</span>
                                <span className="font-medium text-gray-900 dark:text-white">
                                    {formatBytes(storageStats.totalSpace)}
                                </span>
                            </div>

                            <div className="flex justify-between items-center pt-2 border-t border-gray-200 dark:border-gray-700">
                                <span className="text-sm text-gray-600 dark:text-gray-400">Số file:</span>
                                <span className="font-medium text-gray-900 dark:text-white">
                                    {storageStats.fileCount.toLocaleString()}
                                </span>
                            </div>
                        </div>

                        {/* Thanh tiến trình */}
                        <div className="mt-4">
                            <div className="flex justify-between text-sm text-gray-600 dark:text-gray-400 mb-1">
                                <span>Tiến trình sử dụng</span>
                                <span>{storageStats.usagePercentage}%</span>
                            </div>
                            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                                <div
                                    className={`h-2 rounded-full transition-all duration-300 ${storageStats.usagePercentage >= 90
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
                            <div className={`mt-3 p-3 rounded-lg ${storageStats.usagePercentage >= 90
                                ? 'bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800'
                                : 'bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800'
                                }`}>
                                <div className="flex items-center">
                                    <AlertTriangle className={`w-4 h-4 mr-2 ${storageStats.usagePercentage >= 90 ? 'text-red-600' : 'text-orange-600'
                                        }`} />
                                    <span className={`text-sm ${storageStats.usagePercentage >= 90 ? 'text-red-700 dark:text-red-400' : 'text-orange-700 dark:text-orange-400'
                                        }`}>
                                        {storageStats.usagePercentage >= 90
                                            ? 'Dung lượng gần đầy! Cần dọn dẹp file.'
                                            : 'Dung lượng đang cao, nên theo dõi.'
                                        }
                                    </span>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Bandwidth Usage Card */}
            <BandwidthChart storageStats={storageStats} />
        </div>
    );
};

// Bandwidth Chart Component
interface BandwidthChartProps {
    storageStats: any; // StorageStats type
}

const BandwidthChart: React.FC<BandwidthChartProps> = ({ storageStats }) => {
    // Dữ liệu cho biểu đồ bandwidth
    const bandwidthData = [
        {
            name: 'Upload (IN)',
            value: storageStats.bandwidthIn,
            color: '#10B981', // Green
            icon: <Upload className="w-4 h-4" />
        },
        {
            name: 'Download (OUT)',
            value: storageStats.bandwidthOut,
            color: '#3B82F6', // Blue
            icon: <Download className="w-4 h-4" />
        }
    ];

    const getBandwidthColor = (percentage: number) => {
        if (percentage >= 90) return 'text-red-600';
        if (percentage >= 80) return 'text-orange-600';
        return 'text-green-600';
    };

    const totalBandwidthUsed = storageStats.bandwidthIn + storageStats.bandwidthOut;
    const bandwidthRemaining = Math.max(0, storageStats.bandwidthLimit - totalBandwidthUsed);

    return (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
            <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center">
                    <Wifi className="w-5 h-5 mr-2 text-blue-600" />
                    Băng thông S3 (Tháng này)
                </h3>
                <div className={`text-sm font-medium ${getBandwidthColor(storageStats.bandwidthUsagePercentage)}`}>
                    {storageStats.bandwidthUsagePercentage}% đã sử dụng
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Biểu đồ cột bandwidth */}
                <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={bandwidthData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                            <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                            <XAxis
                                dataKey="name"
                                tick={{ fontSize: 12 }}
                                className="text-gray-600 dark:text-gray-400"
                            />
                            <YAxis
                                tickFormatter={(value) => formatBytes(value)}
                                tick={{ fontSize: 12 }}
                                className="text-gray-600 dark:text-gray-400"
                            />
                            <Tooltip
                                formatter={(value: number) => [formatBytes(value), '']}
                                labelStyle={{ color: '#374151' }}
                                contentStyle={{
                                    backgroundColor: 'rgb(255 255 255)',
                                    border: '1px solid rgb(209 213 219)',
                                    borderRadius: '0.5rem'
                                }}
                            />
                            <Bar dataKey="value" fill="#3B82F6" radius={[4, 4, 0, 0]}>
                                {bandwidthData.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={entry.color} />
                                ))}
                            </Bar>
                        </BarChart>
                    </ResponsiveContainer>
                </div>

                {/* Thông tin chi tiết bandwidth */}
                <div className="space-y-4">
                    <div className="text-center">
                        <div className={`text-3xl font-bold ${getBandwidthColor(storageStats.bandwidthUsagePercentage)}`}>
                            {formatBytes(totalBandwidthUsed)}
                        </div>
                        <div className="text-sm text-gray-600 dark:text-gray-400">
                            Tổng băng thông đã dùng
                        </div>
                    </div>

                    <div className="space-y-3">
                        <div className="flex justify-between items-center">
                            <span className="text-sm text-gray-600 dark:text-gray-400 flex items-center">
                                <Upload className="w-4 h-4 mr-1 text-green-600" />
                                Upload (IN):
                            </span>
                            <span className="font-medium text-gray-900 dark:text-white">
                                {formatBytes(storageStats.bandwidthIn)}
                            </span>
                        </div>

                        <div className="flex justify-between items-center">
                            <span className="text-sm text-gray-600 dark:text-gray-400 flex items-center">
                                <Download className="w-4 h-4 mr-1 text-blue-600" />
                                Download (OUT):
                            </span>
                            <span className="font-medium text-gray-900 dark:text-white">
                                {formatBytes(storageStats.bandwidthOut)}
                            </span>
                        </div>

                        <div className="flex justify-between items-center">
                            <span className="text-sm text-gray-600 dark:text-gray-400">Còn lại:</span>
                            <span className="font-medium text-gray-900 dark:text-white">
                                {formatBytes(bandwidthRemaining)}
                            </span>
                        </div>

                        <div className="flex justify-between items-center pt-2 border-t border-gray-200 dark:border-gray-700">
                            <span className="text-sm text-gray-600 dark:text-gray-400">Giới hạn tháng:</span>
                            <span className="font-medium text-gray-900 dark:text-white">
                                {formatBytes(storageStats.bandwidthLimit)}
                            </span>
                        </div>
                    </div>

                    {/* Thanh tiến trình bandwidth */}
                    <div className="mt-4">
                        <div className="flex justify-between text-sm text-gray-600 dark:text-gray-400 mb-1">
                            <span>Băng thông đã dùng</span>
                            <span>{storageStats.bandwidthUsagePercentage}%</span>
                        </div>
                        <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                            <div
                                className={`h-2 rounded-full transition-all duration-300 ${storageStats.bandwidthUsagePercentage >= 90
                                    ? 'bg-red-500'
                                    : storageStats.bandwidthUsagePercentage >= 80
                                        ? 'bg-orange-500'
                                        : 'bg-blue-500'
                                    }`}
                                style={{ width: `${Math.min(storageStats.bandwidthUsagePercentage, 100)}%` }}
                            ></div>
                        </div>
                    </div>

                    {/* Cảnh báo nếu bandwidth cao */}
                    {storageStats.bandwidthUsagePercentage >= 80 && (
                        <div className={`mt-3 p-3 rounded-lg ${storageStats.bandwidthUsagePercentage >= 90
                            ? 'bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800'
                            : 'bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800'
                            }`}>
                            <div className="flex items-center">
                                <AlertTriangle className={`w-4 h-4 mr-2 ${storageStats.bandwidthUsagePercentage >= 90 ? 'text-red-600' : 'text-orange-600'
                                    }`} />
                                <span className={`text-sm ${storageStats.bandwidthUsagePercentage >= 90 ? 'text-red-700 dark:text-red-400' : 'text-orange-700 dark:text-orange-400'
                                    }`}>
                                    {storageStats.bandwidthUsagePercentage >= 90
                                        ? 'Băng thông gần hết! Sẽ giảm tốc độ sau khi vượt giới hạn.'
                                        : 'Băng thông đang cao, nên theo dõi sử dụng.'
                                    }
                                </span>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default StorageChart;
