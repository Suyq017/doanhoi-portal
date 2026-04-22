import React from 'react';

export type MetricType = 'storage' | 'bandwidth';
export type TimeRange = 'week' | 'month' | 'year';

interface StorageTrendHeaderProps {
    activeMetric: MetricType;
    onMetricChange: (metric: MetricType) => void;
    activeTimeRange: TimeRange;
    onTimeRangeChange: (range: TimeRange) => void;
    onRefresh: () => void;
    isLoading: boolean;
}

const StorageTrendHeader: React.FC<StorageTrendHeaderProps> = ({
    activeMetric,
    onMetricChange,
    activeTimeRange,
    onTimeRangeChange,
}) => {
    const metricOptions = [
        { key: 'storage' as const, label: 'Dung Lượng Sử Dụng', color: 'text-blue-600' },
        { key: 'bandwidth' as const, label: 'Băng Thông Sử Dụng', color: 'text-green-600' },
    ];

    const timeRangeOptions = [
        { key: 'week' as const, label: 'Tuần Này' },
        { key: 'month' as const, label: 'Tháng Này' },
        { key: 'year' as const, label: 'Năm Nay' },
    ]; return (
        <div className="flex items-center justify-between mb-4">
            {/* Metric Toggle - Bên trái */}
            <div className="flex items-center space-x-2">
                <div className="flex bg-gray-100 dark:bg-gray-800 rounded-lg p-1">
                    {metricOptions.map((option) => (
                        <button
                            key={option.key}
                            onClick={() => onMetricChange(option.key)}
                            className={`px-3 py-1 text-sm font-medium rounded-md transition-colors ${activeMetric === option.key
                                ? 'bg-white dark:bg-gray-700 shadow-sm text-gray-900 dark:text-white'
                                : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                                }`}
                        >
                            {option.label}
                        </button>
                    ))}
                </div>
            </div>

            {/* Time Range Filter - Bên phải */}
            <div className="flex items-center space-x-2">
                <div className="flex bg-gray-100 dark:bg-gray-800 rounded-lg p-1">
                    {timeRangeOptions.map((option) => (
                        <button
                            key={option.key}
                            onClick={() => onTimeRangeChange(option.key)}
                            className={`px-3 py-1 text-sm font-medium rounded-md transition-colors ${activeTimeRange === option.key
                                ? 'bg-white dark:bg-gray-700 shadow-sm text-gray-900 dark:text-white'
                                : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                                }`}
                        >
                            {option.label}
                        </button>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default StorageTrendHeader;
