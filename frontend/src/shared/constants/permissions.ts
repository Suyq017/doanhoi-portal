/**
 * Permission constants for the application
 * This file centralizes all permission-related constants for better maintainability
 */

// User permissions
export const USER_PERMISSIONS = {
    CREATE: 'users.create',
    VIEW_DETAILS: 'users.view_details',
    UPDATE: 'users.update',
    DELETE: 'users.delete',
    EXPORT: 'users.export',
    IMPORT: 'users.create', // Same as create permission
} as const;

// Department permissions
export const DEPARTMENT_PERMISSIONS = {
    CREATE: 'departments.create',
    VIEW_DETAILS: 'departments.view_details',
    UPDATE: 'departments.update',
    DELETE: 'departments.delete',
    EXPORT: 'departments.export',
} as const;

// Class permissions
export const CLASS_PERMISSIONS = {
    CREATE: 'classes.create',
    VIEW_DETAILS: 'classes.view_details',
    UPDATE: 'classes.update',
    DELETE: 'classes.delete',
    EXPORT: 'classes.export',
} as const;

// Organization permissions
export const ORGANIZATION_PERMISSIONS = {
    ACCESS: 'organizations.access',
    CREATE: 'organizations.create',
    READ: 'organizations.read',
    VIEW_DETAILS: 'organizations.view_details',
    UPDATE: 'organizations.update',
    DELETE: 'organizations.delete',
    EXPORT: 'organizations.export',
    VIEW_MEMBER_COUNT: 'organizations.view_member_count',
    ACCESS_CHILDREN: 'organizations.access_children',
    ADD_MEMBER: 'organizations.add_member',
    REMOVE_MEMBER: 'organizations.remove_member',
} as const;

// Role permissions
export const ROLE_PERMISSIONS = {
    CREATE: 'roles.create',
    VIEW_DETAILS: 'roles.view_details',
    UPDATE: 'roles.update',
    DELETE: 'roles.delete',
    ASSIGN: 'roles.assign',
} as const;

// System permissions
export const SYSTEM_PERMISSIONS = {
    ACCESS_ADMIN: 'system.access_admin',
    MANAGE_SETTINGS: 'system.manage_settings',
    VIEW_LOGS: 'system.view_logs',
} as const;

// Template permissions
export const TEMPLATE_PERMISSIONS = {
    ACCESS: 'templates.access',
    ADMIN_ACCESS: 'templates.admin.access',
    MANAGE: 'templates.manage',
} as const;

// Export all permissions for convenience
export const ALL_PERMISSIONS = {
    USER: USER_PERMISSIONS,
    DEPARTMENT: DEPARTMENT_PERMISSIONS,
    CLASS: CLASS_PERMISSIONS,
    ORGANIZATION: ORGANIZATION_PERMISSIONS,
    ROLE: ROLE_PERMISSIONS,
    SYSTEM: SYSTEM_PERMISSIONS,
    TEMPLATE: TEMPLATE_PERMISSIONS,
} as const;

// Type definitions
export type UserPermission = typeof USER_PERMISSIONS[keyof typeof USER_PERMISSIONS];
export type DepartmentPermission = typeof DEPARTMENT_PERMISSIONS[keyof typeof DEPARTMENT_PERMISSIONS];
export type ClassPermission = typeof CLASS_PERMISSIONS[keyof typeof CLASS_PERMISSIONS];
export type OrganizationPermission = typeof ORGANIZATION_PERMISSIONS[keyof typeof ORGANIZATION_PERMISSIONS];
export type RolePermission = typeof ROLE_PERMISSIONS[keyof typeof ROLE_PERMISSIONS];
export type SystemPermission = typeof SYSTEM_PERMISSIONS[keyof typeof SYSTEM_PERMISSIONS];
export type TemplatePermission = typeof TEMPLATE_PERMISSIONS[keyof typeof TEMPLATE_PERMISSIONS];

export type Permission =
    | UserPermission
    | DepartmentPermission
    | ClassPermission
    | OrganizationPermission
    | RolePermission
    | SystemPermission
    | TemplatePermission;

// Alternative export with different name to avoid conflicts
export type PermissionCode = Permission;
