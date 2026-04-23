import { LayoutDashboard, Users, Building, Building2, GraduationCap, Shield } from 'lucide-react';
import { Permission } from '../services/roleService';

/**
 * Permission group configurations and utilities
 */

export interface PermissionGroup {
    id: string;
    name: string;
    icon: any;
    color: string;
    description: string;
}

export const PERMISSION_GROUPS: PermissionGroup[] = [
    {
        id: 'dashboard',
        name: 'Bảng điều khiển',
        icon: LayoutDashboard,
        color: 'blue',
        description: 'Quyền truy cập vào trang chủ và thống kê'
    },
    {
        id: 'users',
        name: 'Quản lý người dùng',
        icon: Users,
        color: 'green',
        description: 'Quyền quản lý thông tin người dùng'
    },
    {
        id: 'organizations',
        name: 'Quản lý tổ chức',
        icon: Building,
        color: 'purple',
        description: 'Quyền quản lý các tổ chức và thành viên'
    },
    {
        id: 'departments',
        name: 'Quản lý đơn vị',
        icon: Building2,
        color: 'orange',
        description: 'Quyền quản lý các đơn vị trong tổ chức'
    },
    {
        id: 'classes',
        name: 'Quản lý lớp học',
        icon: GraduationCap,
        color: 'red',
        description: 'Quyền quản lý các lớp học và hoạt động'
    },
    {
        id: 'permissions',
        name: 'Quản lý phân quyền',
        icon: Shield,
        color: 'indigo',
        description: 'Quyền quản lý vai trò và phân quyền'
    }
];

export const PERMISSION_ICONS = {
    dashboard: LayoutDashboard,
    users: Users,
    organizations: Building,
    departments: Building2,
    classes: GraduationCap,
    permissions: Shield,
};

export const getPermissionGroup = (groupId: string): PermissionGroup | undefined => {
    return PERMISSION_GROUPS.find(group => group.id === groupId);
};

export const getGroupPermissions = (permissions: Permission[], groupId: string): Permission[] => {
    return permissions.filter(p => p.category === groupId);
};

export const sortPermissions = (permissions: Permission[]): Permission[] => {
    return permissions.sort((a, b) => {
        // Access permissions first
        if (a.code.endsWith('.access') && !b.code.endsWith('.access')) return -1;
        if (!a.code.endsWith('.access') && b.code.endsWith('.access')) return 1;
        return a.sortOrder - b.sortOrder;
    });
};

export const isAccessPermission = (permission: Permission): boolean => {
    return permission.code.endsWith('.access');
};

export const getGroupSelectionState = (
    permissions: Permission[],
    selectedPermissionIds: string[],
    groupId: string
): 'none' | 'partial' | 'all' => {
    const groupPermissions = getGroupPermissions(permissions, groupId);
    const selectedCount = groupPermissions.filter(p => selectedPermissionIds.includes(p.id)).length;

    if (selectedCount === 0) return 'none';
    if (selectedCount === groupPermissions.length) return 'all';
    return 'partial';
};

export const getCategoryName = (category: string): string => {
    const group = getPermissionGroup(category);
    return group?.name || category;
};

export const getCategoryColor = (category: string): string => {
    const colors = {
        dashboard: 'text-blue-600 bg-blue-50 dark:bg-blue-900/20',
        users: 'text-green-600 bg-green-50 dark:bg-green-900/20',
        organizations: 'text-purple-600 bg-purple-50 dark:bg-purple-900/20',
        departments: 'text-orange-600 bg-orange-50 dark:bg-orange-900/20',
        classes: 'text-red-600 bg-red-50 dark:bg-red-900/20',
        permissions: 'text-yellow-600 bg-yellow-50 dark:bg-yellow-900/20',
    };
    return colors[category as keyof typeof colors] || 'text-gray-600 bg-gray-50 dark:bg-gray-700';
};

export const getColorClasses = () => {
    // Simplified gray-based color scheme for consistency
    return {
        bg: 'bg-gray-50 dark:bg-gray-700',
        border: 'border-gray-200 dark:border-gray-600',
        text: 'text-gray-700 dark:text-gray-300',
        icon: 'text-gray-500 dark:text-gray-400'
    };
};
