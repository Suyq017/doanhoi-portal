import React from 'react';
import { Activity } from 'lucide-react';

interface SystemStatusProps {
    loading: boolean;
}

const SystemStatus: React.FC<SystemStatusProps> = ({ loading }) => {
    const statusItems = [
        {
            label: 'Hệ Thống Hoạt Động',
            status: 'Bình Thường',
            color: 'green',
            bgColor: 'bg-green-50 dark:bg-green-900/20',
            borderColor: 'border-green-200 dark:border-green-700',
            textColor: 'text-green-600 dark:text-green-400',
            dotColor: 'bg-green-500'
        },
        {
            label: 'Cơ Sở Dữ Liệu',
            status: 'Kết Nối Tốt',
            color: 'blue',
            bgColor: 'bg-blue-50 dark:bg-blue-900/20',
            borderColor: 'border-blue-200 dark:border-blue-700',
            textColor: 'text-blue-600 dark:text-blue-400',
            dotColor: 'bg-blue-500'
        },
        {
            label: 'API Response',
            status: loading ? 'Đang tải...' : '< 200ms',
            color: 'orange',
            bgColor: 'bg-orange-50 dark:bg-orange-900/20',
            borderColor: 'border-orange-200 dark:border-orange-700',
            textColor: 'text-orange-600 dark:text-orange-400',
            dotColor: 'bg-orange-500'
        }
    ];

    return (
        <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-6 flex items-center">
                <Activity className="w-5 h-5 mr-2 text-green-600" />
                Trạng Thái Hệ Thống
            </h3>
            <div className="space-y-4">
                {statusItems.map((item, index) => (
                    <div key={index} className={`flex items-center justify-between p-3 ${item.bgColor} rounded-lg border ${item.borderColor}`}>
                        <div className="flex items-center">
                            <div className={`w-3 h-3 ${item.dotColor} rounded-full mr-3`}></div>
                            <span className="text-sm font-medium text-gray-900 dark:text-white">
                                {item.label}
                            </span>
                        </div>
                        <span className={`text-xs font-medium ${item.textColor}`}>
                            {item.status}
                        </span>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default SystemStatus;
