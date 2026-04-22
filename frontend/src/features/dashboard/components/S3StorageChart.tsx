import React from 'react';
import { Pie } from 'react-chartjs-2';
import { useS3Statistics } from '@/shared/hooks/queries/useDashboardQueries';

interface S3StorageChartProps {
    organizationId?: string;
}

export const S3StorageChart: React.FC<S3StorageChartProps> = ({ organizationId }) => {
    const { data, isLoading, error } = useS3Statistics(organizationId);

    if (isLoading) {
        return (
            <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow dark:border dark:border-gray-700">
                <div className="animate-pulse">
                    <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-1/2 mb-4"></div>
                    <div className="h-64 bg-gray-200 dark:bg-gray-700 rounded"></div>
                </div>
            </div>
        );
    }

    // Check if data has error flag (from backend when no S3 config)
    if (error || !data || (data as any).error) {
        return (
            <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow dark:border dark:border-gray-700">
                <div className="text-center py-8">
                    <div className="text-yellow-500 mb-2">⚠️ Chưa cấu hình S3</div>
                    <div className="text-sm text-gray-500 dark:text-gray-400">
                        {(data as any)?.message || (error instanceof Error ? error.message : 'Vui lòng cấu hình S3 trong hệ thống')}
                    </div>
                </div>
            </div>
        );
    }

    const chartData = {
        labels: [
            `Avatars (${data.folderStats.avatars.percentage}%)`,
            `Documents (${data.folderStats.documents.percentage}%)`,
            `Images (${data.folderStats.images.percentage}%)`,
            `Others (${data.folderStats.others.percentage}%)`,
        ],
        datasets: [
            {
                label: 'Storage Usage',
                data: [
                    data.folderStats.avatars.size,
                    data.folderStats.documents.size,
                    data.folderStats.images.size,
                    data.folderStats.others.size,
                ],
                backgroundColor: [
                    'rgba(59, 130, 246, 0.8)',  // blue
                    'rgba(16, 185, 129, 0.8)',  // green
                    'rgba(245, 158, 11, 0.8)',  // yellow
                    'rgba(156, 163, 175, 0.8)', // gray
                ],
                borderWidth: 1,
            },
        ],
    };

    const isDarkMode = document.documentElement.classList.contains('dark');

    const options = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: {
                position: 'bottom' as const,
                labels: {
                    color: isDarkMode ? '#e5e7eb' : '#374151',
                },
            },
            title: {
                display: true,
                text: `S3 Storage Distribution - ${data.bucketName}`,
                color: isDarkMode ? '#f3f4f6' : '#111827',
            },
            tooltip: {
                callbacks: {
                    label: (context: any) => {
                        const label = context.label || '';
                        const value = context.parsed || 0;
                        const formatted = formatBytes(value);
                        return `${label}: ${formatted}`;
                    },
                },
                backgroundColor: isDarkMode ? '#374151' : '#ffffff',
                titleColor: isDarkMode ? '#f3f4f6' : '#111827',
                bodyColor: isDarkMode ? '#e5e7eb' : '#374151',
                borderColor: isDarkMode ? '#4b5563' : '#e5e7eb',
                borderWidth: 1,
            },
        },
    };

    return (
        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow dark:border dark:border-gray-700">
            <div className="mb-4">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Phân bổ dung lượng S3</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                    Tổng: {data.totalSizeFormatted} ({data.totalFiles} files)
                </p>
                <p className="text-xs text-gray-400 dark:text-gray-500">
                    Region: {data.region}
                </p>
            </div>
            <div style={{ height: '300px' }}>
                <Pie data={chartData} options={options} />
            </div>

            {/* Detail stats */}
            <div className="mt-4 grid grid-cols-2 gap-2 text-sm">
                <div className="border-l-4 border-blue-500 pl-2">
                    <div className="font-medium text-gray-900 dark:text-white">Avatars</div>
                    <div className="text-gray-600 dark:text-gray-400">
                        {data.folderStats.avatars.count} files • {data.folderStats.avatars.sizeFormatted}
                    </div>
                </div>
                <div className="border-l-4 border-green-500 pl-2">
                    <div className="font-medium text-gray-900 dark:text-white">Documents</div>
                    <div className="text-gray-600 dark:text-gray-400">
                        {data.folderStats.documents.count} files • {data.folderStats.documents.sizeFormatted}
                    </div>
                </div>
                <div className="border-l-4 border-yellow-500 pl-2">
                    <div className="font-medium text-gray-900 dark:text-white">Images</div>
                    <div className="text-gray-600 dark:text-gray-400">
                        {data.folderStats.images.count} files • {data.folderStats.images.sizeFormatted}
                    </div>
                </div>
                <div className="border-l-4 border-gray-500 pl-2">
                    <div className="font-medium text-gray-900 dark:text-white">Others</div>
                    <div className="text-gray-600 dark:text-gray-400">
                        {data.folderStats.others.count} files • {data.folderStats.others.sizeFormatted}
                    </div>
                </div>
            </div>
        </div>
    );
};

function formatBytes(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
}
