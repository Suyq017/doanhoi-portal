import React from 'react';
import { X, Shield, Eye, Users, Building, LayoutDashboard, Building2, GraduationCap } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { type Role } from '../services/roleService';

interface ViewRoleModalProps {
    isOpen: boolean;
    onClose: () => void;
    role: Role | null;
}

const PERMISSION_ICONS = {
    dashboard: LayoutDashboard,
    users: Users,
    organizations: Building,
    departments: Building2,
    classes: GraduationCap,
    permissions: Shield,
};

const ViewRoleModal: React.FC<ViewRoleModalProps> = ({
    isOpen,
    onClose,
    role,
}) => {
    const { t } = useTranslation('permissions');

    if (!isOpen || !role) return null;

    // Group permissions by category
    const groupedPermissions = role.permissions?.reduce((acc, permission) => {
        const category = permission.category || 'other';
        if (!acc[category]) {
            acc[category] = [];
        }
        acc[category].push(permission);
        return acc;
    }, {} as Record<string, any[]>) || {}; const getCategoryName = (category: string) => {
        const names = {
            dashboard: t('permissions.categories.dashboard'),
            users: t('permissions.categories.users'),
            organizations: t('permissions.categories.organizations'),
            departments: t('permissions.categories.departments'),
            classes: t('permissions.categories.classes'),
            permissions: t('permissions.categories.permissions'),
            ctxh: t('permissions.categories.ctxh'),
            payments: t('permissions.categories.payments'),
            'my-payments': t('permissions.categories.myPayments'),
            reports: t('permissions.categories.reports'),
        };
        return names[category as keyof typeof names] || category;
    };

    const getCategoryColor = (category: string) => {
        const colors = {
            dashboard: 'text-blue-600 bg-blue-50 dark:bg-blue-900/20',
            users: 'text-green-600 bg-green-50 dark:bg-green-900/20',
            organizations: 'text-purple-600 bg-purple-50 dark:bg-purple-900/20',
            departments: 'text-orange-600 bg-orange-50 dark:bg-orange-900/20',
            classes: 'text-red-600 bg-red-50 dark:bg-red-900/20',
            permissions: 'text-yellow-600 bg-yellow-50 dark:bg-yellow-900/20',
            ctxh: 'text-teal-600 bg-teal-50 dark:bg-teal-900/20',
            payments: 'text-indigo-600 bg-indigo-50 dark:bg-indigo-900/20',
            'my-payments': 'text-cyan-600 bg-cyan-50 dark:bg-cyan-900/20',
            reports: 'text-pink-600 bg-pink-50 dark:bg-pink-900/20',
        };
        return colors[category as keyof typeof colors] || 'text-gray-600 bg-gray-50 dark:bg-gray-700';
    };

    return (
        <div className="fixed inset-0 z-50 overflow-y-auto">
            <div className="flex items-center justify-center min-h-screen px-4 py-8">
                <div className="fixed inset-0 transition-opacity bg-gray-900 bg-opacity-75" onClick={onClose} />

                <div className="relative w-full max-w-5xl bg-white dark:bg-gray-800 shadow-2xl rounded-xl">
                    {/* Header */}
                    <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
                        <div className="flex items-center">
                            <div className="w-10 h-10 bg-gray-100 dark:bg-gray-700 rounded-lg flex items-center justify-center mr-4">
                                <Eye className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                            </div>
                            <div>
                                <h3 className="text-xl font-semibold text-gray-900 dark:text-white">{t('titles.view')}</h3>
                                <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">{t('messages.viewDescription', 'Xem thông tin và quyền của vai trò')}</p>
                            </div>
                        </div>
                        <button
                            onClick={onClose}
                            className="text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 transition-colors p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"
                        >
                            <X className="w-6 h-6" />
                        </button>
                    </div>

                    {/* Main Content */}
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 p-6">
                        {/* Left Column - Basic Information */}
                        <div className="lg:col-span-2 space-y-6">                            <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-6">                                <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-6 flex items-center">
                            <div className="w-3 h-3 bg-blue-500 rounded-full mr-3"></div>
                            {t('labels.roleInfo', 'Thông tin vai trò')}
                        </h4>{/* Role Name & Display Name Row */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                                {/* Role Name */}
                                <div className="space-y-2">                                    <label className="text-sm font-medium text-gray-600 dark:text-gray-400 uppercase tracking-wide">
                                    {t('fields.name')}
                                </label>
                                    <div className="flex items-center space-x-3">
                                        <div className="flex-1">
                                            <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-lg px-4 py-3 shadow-sm">
                                                <span className="text-gray-900 dark:text-white font-mono text-sm font-medium">
                                                    {role.name}
                                                </span>
                                            </div>
                                        </div>
                                        {role.isSystemRole && (
                                            <div className="flex-shrink-0">
                                                <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200 border border-red-200 dark:border-red-800">
                                                    <Shield className="w-3 h-3 mr-1" />
                                                    {t('labels.system')}
                                                </span>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* Display Name */}
                                <div className="space-y-2">
                                    <label className="text-sm font-medium text-gray-600 dark:text-gray-400 uppercase tracking-wide">
                                        {t('fields.displayName')}
                                    </label>
                                    <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-lg px-4 py-3 shadow-sm">
                                        <span className="text-gray-900 dark:text-white font-medium">
                                            {role.displayName}
                                        </span>
                                    </div>                                </div>
                            </div>

                            {/* Description */}
                            {role.description && (
                                <div className="space-y-2 mb-6">                                    <label className="text-sm font-medium text-gray-600 dark:text-gray-400 uppercase tracking-wide">
                                    {t('fields.description')}
                                </label><div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-lg px-4 py-3 shadow-sm">
                                        <p className="text-gray-700 dark:text-gray-300 text-sm leading-relaxed">
                                            {role.description}
                                        </p>
                                    </div>
                                </div>
                            )}
                        </div>

                            {/* Permissions */}
                            <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-6">
                                <div className="flex items-center justify-between mb-4">                                    <h4 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center">
                                    <div className="w-3 h-3 bg-indigo-500 rounded-full mr-3"></div>
                                    {t('labels.permissionAccess')}
                                </h4>
                                    <div className="text-sm text-gray-500 dark:text-gray-400">
                                        {t('labels.total')}: <span className="font-medium text-indigo-600 dark:text-indigo-400">{role.permissions?.length || 0}</span> {t('labels.permissions')}
                                    </div>
                                </div>

                                {Object.keys(groupedPermissions).length === 0 ? (
                                    <div className="text-center py-8">
                                        <Shield className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                                        <p className="text-gray-500 dark:text-gray-400">{t('messages.noPermissions', 'Vai trò này chưa có quyền nào')}</p>
                                    </div>
                                ) : (
                                    <div className="space-y-4 max-h-80 overflow-y-auto pr-2">
                                        {Object.entries(groupedPermissions).map(([category, permissions]) => {
                                            const Icon = PERMISSION_ICONS[category as keyof typeof PERMISSION_ICONS] || Shield;
                                            const colorClass = getCategoryColor(category);

                                            return (
                                                <div key={category} className={`border rounded-lg p-4 ${colorClass.includes('bg-') ? colorClass : `bg-gray-100 dark:bg-gray-800`}`}>
                                                    <div className="flex items-center mb-3">
                                                        <Icon className={`w-5 h-5 mr-2 ${colorClass.split(' ')[0]}`} />
                                                        <h5 className={`font-medium ${colorClass.split(' ')[0]}`}>
                                                            {getCategoryName(category)}
                                                        </h5>
                                                        <span className="ml-2 px-2 py-0.5 text-xs bg-white dark:bg-gray-700 text-gray-600 dark:text-gray-300 rounded-full">
                                                            {permissions.length}
                                                        </span>
                                                    </div>
                                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                                                        {permissions.map((permission) => (
                                                            <div key={permission.id} className="flex items-center p-2 bg-white dark:bg-gray-800 rounded-md shadow-sm">
                                                                <div className="flex-1 min-w-0">
                                                                    <div className="text-sm font-medium text-gray-900 dark:text-white truncate">
                                                                        {permission.name}
                                                                    </div>
                                                                    <div className="text-xs text-gray-500 dark:text-gray-400 font-mono truncate">
                                                                        {permission.code}
                                                                    </div>
                                                                </div>
                                                                {permission.context === 'system' && (<span className="ml-2 px-1.5 py-0.5 text-xs bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300 rounded flex-shrink-0">
                                                                    {t('labels.system')}
                                                                </span>
                                                                )}
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Right Column - Summary */}
                        <div className="lg:col-span-1">
                            <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-6 sticky top-6">                                <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-6 flex items-center">
                                <div className="w-3 h-3 bg-green-500 rounded-full mr-3"></div>
                                {t('labels.summary', 'Tóm tắt')}
                            </h4>

                                <div className="space-y-4">
                                    <div className="bg-white dark:bg-gray-800 rounded-lg p-4 shadow-sm border border-gray-200 dark:border-gray-600">                                        <div className="flex items-center justify-between mb-2">
                                        <span className="text-sm text-gray-600 dark:text-gray-400">{t('labels.role')}</span>
                                        {role.isSystemRole && (
                                            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200">
                                                <Shield className="w-3 h-3 mr-1" />
                                                {t('labels.system')}
                                            </span>
                                        )}
                                    </div>
                                        <div className="font-semibold text-gray-900 dark:text-white">{role.displayName}</div>
                                        <div className="text-sm text-gray-500 dark:text-gray-400 font-mono">{role.name}</div>
                                    </div>                                    <div className="bg-white dark:bg-gray-800 rounded-lg p-4 shadow-sm border border-gray-200 dark:border-gray-600">
                                        <div className="text-sm text-gray-600 dark:text-gray-400 mb-2">{t('labels.status')}</div>
                                        <div className="flex items-center">
                                            <div className={`w-2 h-2 rounded-full mr-2 ${role.isActive ? 'bg-green-500' : 'bg-red-500'}`}></div>
                                            <span className={`text-sm font-medium ${role.isActive ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                                                {role.isActive ? t('labels.active') : t('labels.inactive')}
                                            </span>
                                        </div>
                                    </div>                                    <div className="bg-white dark:bg-gray-800 rounded-lg p-4 shadow-sm border border-gray-200 dark:border-gray-600">
                                        <div className="text-sm text-gray-600 dark:text-gray-400 mb-2">{t('labels.permissions')}</div>
                                        <div className="text-2xl font-bold text-indigo-600 dark:text-indigo-400">
                                            {role.permissions?.length || 0}
                                        </div>
                                        <div className="text-sm text-gray-500 dark:text-gray-400">{t('labels.permissionsAssigned', 'quyền được gán')}</div>
                                    </div>                                    <div className="bg-white dark:bg-gray-800 rounded-lg p-4 shadow-sm border border-gray-200 dark:border-gray-600">
                                        <div className="text-sm text-gray-600 dark:text-gray-400 mb-2">{t('labels.createdAt', 'Ngày tạo')}</div>
                                        <div className="text-sm font-medium text-gray-900 dark:text-white">
                                            {new Date(role.createdAt).toLocaleDateString('vi-VN', {
                                                day: '2-digit',
                                                month: '2-digit',
                                                year: 'numeric'
                                            })}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>                    </div>
                </div>
            </div>
        </div>
    );
};

export default ViewRoleModal;
