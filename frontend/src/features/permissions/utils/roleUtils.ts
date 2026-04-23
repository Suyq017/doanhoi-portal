import { Role } from '../services/roleService';

/**
 * Role validation utilities
 */

export const validateRole = (role: Partial<Role>): string[] => {
    const errors: string[] = [];

    if (!role.name || role.name.trim().length === 0) {
        errors.push('Tên vai trò là bắt buộc');
    }

    if (role.name && role.name.length > 255) {
        errors.push('Tên vai trò không được vượt quá 255 ký tự');
    }

    if (role.description && role.description.length > 1000) {
        errors.push('Mô tả không được vượt quá 1000 ký tự');
    }

    return errors;
};

export const isValidRoleName = (name: string): boolean => {
    // Role name should only contain lowercase letters, numbers, dots, and underscores
    const roleNameRegex = /^[a-z0-9._]+$/;
    return roleNameRegex.test(name);
};

export const sanitizeRoleName = (name: string): string => {
    return name
        .toLowerCase()
        .replace(/\s+/g, '_') // Replace spaces with underscores
        .replace(/[^a-z0-9._]/g, '') // Remove invalid characters
        .substring(0, 100); // Limit length
};

export const canDeleteRole = (role: Role): boolean => {
    return !role.isSystemRole;
};

export const canEditRole = (role: Role): boolean => {
    return !role.isSystemRole;
};

export const getRoleStatusKey = (isActive: boolean): string => {
    return isActive ? 'labels.active' : 'labels.inactive';
};

export const getRoleStatusColor = (isActive: boolean): string => {
    return isActive
        ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
        : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200';
};
