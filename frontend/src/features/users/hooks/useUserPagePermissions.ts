import { useMemo } from 'react';
import { usePermissions, createUserPagePermissions, ComponentPermissions, ALL_PERMISSIONS } from '../../../shared';

export interface UserPagePermissions extends ComponentPermissions {
    canImport: boolean;        // users.create (same as create)
    canManageRoles: boolean;   // users.roles.manage

    // Grouped permissions
    hasAnyViewAction: boolean; // can view OR edit OR delete
    hasAnyEditAction: boolean; // can edit OR delete
}

export const useUserPagePermissions = (): UserPagePermissions => {
    const permissions = usePermissions();

    return useMemo(() => {
        // Create base component permissions using utility
        const basePermissions = createUserPagePermissions((permission: string) => {
            switch (permission) {
                case ALL_PERMISSIONS.USER.CREATE:
                    return permissions.canCreateUser();
                case ALL_PERMISSIONS.USER.VIEW_DETAILS:
                    return permissions.canViewUserDetails();
                case ALL_PERMISSIONS.USER.UPDATE:
                    return permissions.canUpdateUser();
                case ALL_PERMISSIONS.USER.DELETE:
                    return permissions.canDeleteUser();
                case ALL_PERMISSIONS.USER.EXPORT:
                    return permissions.canExportUsers();
                default:
                    return false;
            }
        });        // Add user-specific permissions
        const canImport = basePermissions.canCreate; // Same as create permission
        const canManageRoles = permissions.canManageUserRoles();
        const hasAnyViewAction = basePermissions.canView || basePermissions.canEdit || basePermissions.canDelete;
        const hasAnyEditAction = basePermissions.canEdit || basePermissions.canDelete;

        return {
            ...basePermissions,
            canImport,
            canManageRoles,
            hasAnyViewAction,
            hasAnyEditAction,
        };
    }, [permissions]);
};
