import { useMemo } from 'react';
import { usePermissions, createComponentPermissions, ComponentPermissions } from '../../../shared';

export interface DepartmentPagePermissions extends ComponentPermissions {
    canImport: boolean;        // departments.create (same as create)

    // Grouped permissions
    hasAnyViewAction: boolean; // can view OR edit OR delete
    hasAnyEditAction: boolean; // can edit OR delete
}

export const useDepartmentPagePermissions = (): DepartmentPagePermissions => {
    const permissions = usePermissions();

    return useMemo(() => {
        // Check individual permissions
        const canCreate = permissions.canCreateDepartment();
        const canView = permissions.canViewDepartmentDetails();
        const canUpdate = permissions.canUpdateDepartment();
        const canDelete = permissions.canDeleteDepartment();
        const canExport = permissions.canExportDepartments();

        // Create base component permissions
        const basePermissions = createComponentPermissions({
            canCreate,
            canView,
            canEdit: canUpdate,
            canDelete,
            canExport,
        });

        // Add department-specific permissions
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
