import { useMemo } from 'react';
import { usePermissions, createComponentPermissions, ComponentPermissions } from '../../../shared';

export interface ClassPagePermissions extends ComponentPermissions {
    canImport: boolean;        // classes.create (same as create)

    // Grouped permissions
    hasAnyViewAction: boolean; // can view OR edit OR delete
    hasAnyEditAction: boolean; // can edit OR delete
}

export const useClassPagePermissions = (): ClassPagePermissions => {
    const permissions = usePermissions();

    return useMemo(() => {
        // Check individual permissions
        const canCreate = permissions.canCreateClass();
        const canView = permissions.canViewClassDetails();
        const canUpdate = permissions.canUpdateClass();
        const canDelete = permissions.canDeleteClass();
        const canExport = permissions.canExportClasses();

        // Create base component permissions
        const basePermissions = createComponentPermissions({
            canCreate,
            canView,
            canEdit: canUpdate,
            canDelete,
            canExport,
        });

        // Add class-specific permissions
        const canImport = canCreate; // Same as create permission
        const hasAnyViewAction = canView || canUpdate || canDelete;
        const hasAnyEditAction = canUpdate || canDelete;

        return {
            ...basePermissions,
            canImport,
            hasAnyViewAction,
            hasAnyEditAction,
        };
    }, [permissions]);
};
