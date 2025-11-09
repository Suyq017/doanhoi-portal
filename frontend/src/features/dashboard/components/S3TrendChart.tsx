import React from 'react';
import { Line } from 'react-chartjs-2';
import { useS3Statistics } from '@/shared/hooks/queries/useDashboardQueries';

interface S3TrendChartProps {
    organizationId?: string;
}

export const S3TrendChart: React.FC<S3TrendChartProps> = ({ organizationId }) => {
    const { data, isLoading, error } = useS3Statistics(organizationId);

    if (isLoading) {
        return (
            <div className="bg-white p-6 rounded-lg shadow">
                <div className="animate-pulse">
                    <div className="h-6 bg-gray-200 rounded w-1/2 mb-4"></div>
                    <div className="h-80 bg-gray-200 rounded"></div>
                </div>
            </div>
        );
    }

    // Check if data has error flag (from backend when no S3 config)
    if (error || !data || (data as any).error) {
        return (
            <div className="bg-white p-6 rounded-lg shadow">
                <div className="text-center py-8">
                    <div className="text-yellow-500 mb-2">⚠️ Chưa cấu hình S3</div>
                    <div className="text-sm text-gray-500">
                        {(data as any)?.message || (error instanceof Error ? error.message : 'Vui lòng cấu hình S3 trong hệ thống')}
                    </div>
                </div>
            </div>
        );
    }

    // Check if we have monthly data
    if (!data.monthlyStats || data.monthlyStats.length === 0) {
        return (
            <div className="bg-white p-6 rounded-lg shadow">
                <div className="text-center py-8">
                    <div className="text-gray-500 mb-2">📊 Chưa có dữ liệu thống kê</div>
                    <div className="text-sm text-gray-400">
                        Dữ liệu sẽ được hiển thị khi có files trong bucket
                    </div>
                </div>
            </div>
        );
    }

    const chartData = {
        labels: data.monthlyStats.map(stat => {
            const [year, month] = stat.month.split('-');
            return `${month}/${year}`;
        }),
        datasets: [
            {
                label: 'Storage Size (GB)',
                data: data.monthlyStats.map(stat => stat.size / (1024 * 1024 * 1024)), // Convert to GB
                borderColor: 'rgb(59, 130, 246)',
                backgroundColor: 'rgba(59, 130, 246, 0.1)',
                tension: 0.3,
                yAxisID: 'y',
            },
            {
                label: 'File Count',
                data: data.monthlyStats.map(stat => stat.count),
                borderColor: 'rgb(16, 185, 129)',
                backgroundColor: 'rgba(16, 185, 129, 0.1)',
                tension: 0.3,
                yAxisID: 'y1',
            },
        ],
    };

    const options = {
        responsive: true,
        maintainAspectRatio: false,
        interaction: {
            mode: 'index' as const,
            intersect: false,
        },
        plugins: {
            legend: {
                position: 'top' as const,
            },
            title: {
                display: true,
                text: 'S3 Storage Trend (Last 12 Months)',
            },
        },
        scales: {
            y: {
                type: 'linear' as const,
                display: true,
                position: 'left' as const,
                title: {
                    display: true,
                    text: 'Storage (GB)',
                },
            },
            y1: {
                type: 'linear' as const,
                display: true,
                position: 'right' as const,
                title: {
                    display: true,
                    text: 'File Count',
                },
                grid: {
                    drawOnChartArea: false,
                },
            },
        },
    };

    return (
        <div className="bg-white p-6 rounded-lg shadow">
            <div style={{ height: '350px' }}>
                <Line data={chartData} options={options} />
            </div>
        </div>
    );
};
