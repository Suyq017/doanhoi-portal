/**
 * Permission utility functions
 * This file contains helper functions for permission-based UI logic
 */

import { ALL_PERMISSIONS } from '../constants/permissions';

// Generic permission interface for components
export interface ComponentPermissions {
    canView: boolean;
    canEdit: boolean;
    canDelete: boolean;
    canCreate: boolean;
    canExport: boolean;
    showBulkActions: boolean;
    showActionColumn: boolean;
}

// Dropdown option with permission requirement
export interface PermissionBasedDropdownOption {
    key: string;
    label: string;
    icon?: React.ReactNode;
    description?: string;
    onClick: () => void;
    requiredPermission: string;
    enabled?: boolean;
}

/**
 * Filters dropdown options based on permission function
 * @param options - Array of dropdown options with permission requirements
 * @param hasPermission - Function to check if user has specific permission
 * @returns Filtered array of options
 */
export const filterDropdownOptionsByPermissions = (
    options: PermissionBasedDropdownOption[],
    hasPermission: (permission: string) => boolean
): PermissionBasedDropdownOption[] => {
    return options.filter(option => {
        if (!option.requiredPermission) return true;
        return hasPermission(option.requiredPermission);
    });
};

/**
 * Creates a standard permission object for table components
 * @param permissions - Object with specific permission flags
 * @returns ComponentPermissions object
 */
export const createComponentPermissions = (permissions: {
    canView?: boolean;
    canEdit?: boolean;
    canDelete?: boolean;
    canCreate?: boolean;
    canExport?: boolean;
}): ComponentPermissions => {
    const {
        canView = false,
        canEdit = false,
        canDelete = false,
        canCreate = false,
        canExport = false,
    } = permissions;

    return {
        canView,
        canEdit,
        canDelete,
        canCreate,
        canExport,
        showBulkActions: canDelete, // Bulk actions typically require delete permission
        showActionColumn: canView || canEdit || canDelete,
    };
};

/**
 * Creates table action configuration
 * @param permissions - Component permissions
 * @returns Actions configuration for table components
 */
export const createTableActions = (permissions: ComponentPermissions) => {
    return {
        showView: permissions.canView,
        showEdit: permissions.canEdit,
        showDelete: permissions.canDelete,
        showSelection: permissions.showBulkActions,
    };
};

/**
 * Determines if any action buttons should be shown
 * @param permissions - Component permissions
 * @returns Boolean indicating if action column should be displayed
 */
export const shouldShowActionColumn = (permissions: ComponentPermissions): boolean => {
    return permissions.showActionColumn;
};

/**
 * Gets empty state message based on permissions
 * @param hasViewPermission - Whether user can view items
 * @param hasCreatePermission - Whether user can create items
 * @param entityName - Name of the entity (e.g., 'users', 'departments')
 * @returns Appropriate empty state message
 */
export const getPermissionBasedEmptyMessage = (
    hasViewPermission: boolean,
    hasCreatePermission: boolean,
    entityName: string
): string => {
    if (!hasViewPermission) {
        return `Bạn không có quyền xem danh sách ${entityName}`;
    }

    if (!hasCreatePermission) {
        return `Không có ${entityName} nào. Liên hệ quản trị viên để thêm ${entityName}.`;
    }

    return `Không có ${entityName} nào. Hãy tạo ${entityName} đầu tiên.`;
};

/**
 * Creates permission-based dropdown options for add/action buttons
 * @param baseOptions - Base options without permission filtering
 * @param hasPermission - Function to check permissions
 * @returns Filtered options array
 */
export const createPermissionBasedDropdownOptions = (
    baseOptions: PermissionBasedDropdownOption[],
    hasPermission: (permission: string) => boolean
) => {
    return baseOptions
        .filter(option => !option.requiredPermission || hasPermission(option.requiredPermission))
        .map(option => ({
            ...option,
            enabled: option.enabled !== false, // Default to enabled unless explicitly disabled
        }));
};

/**
 * Checks if user has sufficient permissions to access a page/feature
 * @param requiredPermissions - Array of required permissions (user needs at least one)
 * @param hasPermission - Function to check individual permissions
 * @returns Boolean indicating access permission
 */
export const hasPageAccess = (
    requiredPermissions: string[],
    hasPermission: (permission: string) => boolean
): boolean => {
    if (requiredPermissions.length === 0) return true;
    return requiredPermissions.some(permission => hasPermission(permission));
};

/**
 * Utility to create user-specific permissions object
 * @param hasPermission - Permission check function
 * @returns User page specific permissions
 */
export const createUserPagePermissions = (hasPermission: (permission: string) => boolean) => {
    const canCreate = hasPermission(ALL_PERMISSIONS.USER.CREATE);
    const canView = hasPermission(ALL_PERMISSIONS.USER.VIEW_DETAILS);
    const canUpdate = hasPermission(ALL_PERMISSIONS.USER.UPDATE);
    const canDelete = hasPermission(ALL_PERMISSIONS.USER.DELETE);
    const canExport = hasPermission(ALL_PERMISSIONS.USER.EXPORT);

    return createComponentPermissions({
        canCreate,
        canView,
        canEdit: canUpdate,
        canDelete,
        canExport,
    });
};

/**
 * Utility to create class-specific permissions object
 * @param hasPermission - Permission check function
 * @returns Class page specific permissions
 */
export const createClassPagePermissions = (hasPermission: (permission: string) => boolean) => {
    const canCreate = hasPermission(ALL_PERMISSIONS.CLASS.CREATE);
    const canView = hasPermission(ALL_PERMISSIONS.CLASS.VIEW_DETAILS);
    const canUpdate = hasPermission(ALL_PERMISSIONS.CLASS.UPDATE);
    const canDelete = hasPermission(ALL_PERMISSIONS.CLASS.DELETE);
    const canExport = hasPermission(ALL_PERMISSIONS.CLASS.EXPORT);

    return createComponentPermissions({
        canCreate,
        canView,
        canEdit: canUpdate,
        canDelete,
        canExport,
    });
};

/**
 * Utility to create department-specific permissions object
 * @param hasPermission - Permission check function
 * @returns Department page specific permissions
 */
export const createDepartmentPagePermissions = (hasPermission: (permission: string) => boolean) => {
    const canCreate = hasPermission(ALL_PERMISSIONS.DEPARTMENT.CREATE);
    const canView = hasPermission(ALL_PERMISSIONS.DEPARTMENT.VIEW_DETAILS);
    const canUpdate = hasPermission(ALL_PERMISSIONS.DEPARTMENT.UPDATE);
    const canDelete = hasPermission(ALL_PERMISSIONS.DEPARTMENT.DELETE);
    const canExport = hasPermission(ALL_PERMISSIONS.DEPARTMENT.EXPORT);

    return createComponentPermissions({
        canCreate,
        canView,
        canEdit: canUpdate,
        canDelete,
        canExport,
    });
};

/**
 * Permission constants for easy reference
 */
export const PERMISSION_GROUPS = {
    CRUD: ['create', 'view_details', 'update', 'delete'],
    VIEW_ACTIONS: ['view_details', 'update', 'delete'],
    EDIT_ACTIONS: ['update', 'delete'],
    EXPORT_ACTIONS: ['export'],
} as const;
