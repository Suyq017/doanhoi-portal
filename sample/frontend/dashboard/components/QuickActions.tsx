import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Users, Building, ArrowRight } from 'lucide-react';
import { usePermissions } from '../../../shared/hooks/usePermissions';
import { PERMISSIONS } from '../../../shared/utils/permissions';

const QuickActions: React.FC = () => {
    const navigate = useNavigate();
    const { hasPermission } = usePermissions();

    const allQuickActions = [
        {
            title: 'Quản Lý Người Dùng',
            description: 'Xem danh sách và quản lý người dùng',
            icon: Users,
            color: 'bg-blue-500',
            onClick: () => navigate('/users'),
            permission: PERMISSIONS.MANAGE_USERS
        },
        {
            title: 'Quản Lý Tổ Chức',
            description: 'Xem danh sách và quản lý tổ chức',
            icon: Building,
            color: 'bg-purple-500',
            onClick: () => navigate('/organizations'),
            permission: PERMISSIONS.VIEW_ORGANIZATIONS
        }
    ];

    // Filter actions based on user permissions
    const quickActions = allQuickActions.filter(action => hasPermission(action.permission)); return (
        <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-6 flex items-center">
                <ArrowRight className="w-5 h-5 mr-2 text-blue-600" />
                Thao Tác Nhanh
            </h3>

            {quickActions.length === 0 ? (
                <div className="text-center py-8">
                    <p className="text-gray-500 dark:text-gray-400">
                        Không có thao tác nhanh khả dụng cho vai trò của bạn.
                    </p>
                </div>
            ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {quickActions.map((action) => {
                        const Icon = action.icon;
                        return (
                            <button
                                key={action.title}
                                onClick={action.onClick}
                                className="group p-4 text-left rounded-xl border border-gray-200 dark:border-gray-600 hover:border-blue-300 dark:hover:border-blue-500 hover:shadow-md transition-all duration-200 bg-gradient-to-br from-gray-50 to-white dark:from-gray-700 dark:to-gray-800"
                            >
                                <div className="flex items-start">
                                    <div className={`p-2 rounded-lg ${action.color} group-hover:scale-110 transition-transform duration-200`}>
                                        <Icon className="w-5 h-5 text-white" />
                                    </div>
                                    <div className="ml-3 flex-1">
                                        <h4 className="text-sm font-semibold text-gray-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                                            {action.title}
                                        </h4>
                                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                            {action.description}
                                        </p>
                                    </div>
                                    <ArrowRight className="w-4 h-4 text-gray-400 group-hover:text-blue-500 group-hover:translate-x-1 transition-all duration-200" />
                                </div>
                            </button>
                        );
                    })}
                </div>
            )}
        </div>
    );
};

export default QuickActions;
