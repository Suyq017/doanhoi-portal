import React, { useState } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { TrendingUp } from 'lucide-react';
import { useStorageTrend } from '../hooks/useStorageTrend';
import { TimeRange } from '@/shared/services/dashboardService';
import { filterChartData } from '../utils/chartUtils';

// Component imports
import StorageTrendHeader, { MetricType } from '@/features/dashboard/components/StorageTrendHeader';
import StorageTrendStats from '@/features/dashboard/components/StorageTrendStats';

// Format bytes helper function
const formatBytes = (bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

// Format date for chart labels
const formatDate = (dateStr: string, timeRange: TimeRange): string => {
    const date = new Date(dateStr);

    switch (timeRange) {
        case 'week':
            return date.toLocaleDateString('vi-VN', { weekday: 'short', day: 'numeric', month: 'numeric' });
        case 'month':
            return date.toLocaleDateString('vi-VN', { day: 'numeric', month: 'short' });
        case 'year':
            // Hiển thị tháng cho trục X khi lọc theo năm
            return date.toLocaleDateString('vi-VN', { month: 'short' });
        default:
            return date.toLocaleDateString('vi-VN');
    }
};

// Custom tooltip component
const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
        const originalDate = payload[0]?.payload?.originalDate;
        const displayDate = originalDate ? new Date(originalDate).toLocaleDateString('vi-VN', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        }) : label;

        return (
            <div className="bg-white dark:bg-gray-800 p-4 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg">
                <p className="font-medium text-gray-900 dark:text-white mb-2">
                    {displayDate}
                </p>
                <div className="space-y-1">
                    {payload.map((entry: any, index: number) => (
                        <p key={index} style={{ color: entry.color }} className="text-sm">
                            <span className="font-medium">{entry.name}:</span> {formatBytes(entry.value)}
                        </p>
                    ))}
                </div>
            </div>
        );
    }
    return null;
};

const StorageTrendChart: React.FC = () => {
    const [metric, setMetric] = useState<MetricType>('storage');
    const [timeRange, setTimeRange] = useState<TimeRange>('week');
    const { data, loading, error, refetch } = useStorageTrend(timeRange);    // Transform data for chart display with validation
    // Lọc bỏ những ngày trong tương lai chưa có dữ liệu thực tế
    const chartData = data && data.length > 0 ?
        filterChartData(data, {
            dateField: 'date',
            excludeFuture: true,
            excludeEmpty: false // Giữ lại những ngày có giá trị 0 vì có thể là dữ liệu hợp lệ
        }).map(point => ({
            ...point,
            date: formatDate(point.date, timeRange),
            originalDate: point.date,
        })) : [];


    if (loading) {
        return (
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
                <div className="flex items-center justify-between mb-6">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center">
                        <TrendingUp className="w-5 h-5 mr-2 text-blue-600" />
                        Xu hướng S3
                    </h3>
                </div>
                <div className="flex items-center justify-center h-96">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                    <span className="ml-3 text-gray-600 dark:text-gray-400">Đang tải dữ liệu...</span>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
                <div className="flex items-center justify-between mb-6">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center">
                        <TrendingUp className="w-5 h-5 mr-2 text-blue-600" />
                        Xu hướng S3
                    </h3>
                    <button
                        onClick={refetch}
                        className="text-blue-600 hover:text-blue-700 text-sm"                    >
                        Thử lại
                    </button>
                </div>
                <div className="flex items-center justify-center h-96 text-red-500">
                    <div className="text-center">
                        <p className="text-sm">{error}</p>
                        <p className="text-xs text-gray-500 mt-2">Kiểm tra console để xem chi tiết lỗi</p>
                    </div>
                </div>
            </div>
        );
    }

    if (!loading && chartData.length === 0) {
        return (
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
                <div className="flex items-center justify-between mb-6">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center">
                        <TrendingUp className="w-5 h-5 mr-2 text-blue-600" />
                        Xu hướng S3
                    </h3>
                    <button
                        onClick={refetch}
                        className="text-blue-600 hover:text-blue-700 text-sm"
                    >
                        Làm mới
                    </button>
                </div>
                <div className="flex items-center justify-center h-96 text-gray-500">
                    <div className="text-center">
                        <p className="text-sm">Không có dữ liệu xu hướng</p>
                        <p className="text-xs text-gray-400 mt-2">Vui lòng kiểm tra kết nối S3 hoặc thử lại</p>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
            {/* Header with controls */}
            <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center">
                    <TrendingUp className="w-5 h-5 mr-2 text-blue-600" />
                    Xu hướng S3
                </h3>
            </div>

            <StorageTrendHeader
                activeMetric={metric}
                onMetricChange={setMetric}
                activeTimeRange={timeRange}
                onTimeRangeChange={setTimeRange}
                onRefresh={refetch}
                isLoading={loading}
            />

            {/* Stats summary */}
            <StorageTrendStats
                data={data}
                metric={metric} isLoading={loading}
            />

            {/* Chart container */}
            <div className="h-96 mt-6">
                <ResponsiveContainer width="100%" height="100%">
                    <LineChart
                        data={chartData}
                        margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                    >
                        <CartesianGrid
                            strokeDasharray="3 3"
                            className="opacity-30"
                            stroke="#e5e7eb"
                        />
                        <XAxis
                            dataKey="date"
                            tick={{ fontSize: 12 }}
                            className="text-gray-600 dark:text-gray-400"
                            axisLine={{ stroke: '#e5e7eb' }}
                            tickLine={{ stroke: '#e5e7eb' }}
                        />
                        <YAxis
                            tickFormatter={formatBytes}
                            tick={{ fontSize: 12 }}
                            className="text-gray-600 dark:text-gray-400"
                            axisLine={{ stroke: '#e5e7eb' }}
                            tickLine={{ stroke: '#e5e7eb' }} />
                        <Tooltip
                            content={<CustomTooltip />}
                        />
                        <Legend
                            wrapperStyle={{ paddingTop: '20px' }}
                        />

                        {metric === 'storage' ? (
                            <Line
                                type="monotone"
                                dataKey="storage"
                                stroke="#3B82F6"
                                strokeWidth={3}
                                dot={{ fill: '#3B82F6', strokeWidth: 2, r: 4 }}
                                activeDot={{ r: 6, stroke: '#3B82F6', strokeWidth: 2 }}
                                name="Dung lượng sử dụng" />
                        ) : (
                            <>
                                <Line
                                    type="monotone"
                                    dataKey="bandwidthIn"
                                    stroke="#10B981"
                                    strokeWidth={2}
                                    dot={{ fill: '#10B981', strokeWidth: 2, r: 3 }}
                                    name="Tải lên (IN)"
                                />
                                <Line
                                    type="monotone"
                                    dataKey="bandwidthOut"
                                    stroke="#F59E0B"
                                    strokeWidth={2}
                                    dot={{ fill: '#F59E0B', strokeWidth: 2, r: 3 }}
                                    name="Tải xuống (OUT)"
                                />
                                <Line
                                    type="monotone"
                                    dataKey="totalBandwidth"
                                    stroke="#8B5CF6"
                                    strokeWidth={3}
                                    dot={{ fill: '#8B5CF6', strokeWidth: 2, r: 4 }}
                                    activeDot={{ r: 6, stroke: '#8B5CF6', strokeWidth: 2 }}
                                    name="Tổng băng thông"
                                />
                            </>
                        )}
                    </LineChart>
                </ResponsiveContainer>
            </div>
        </div>
    );
};

export default StorageTrendChart;
