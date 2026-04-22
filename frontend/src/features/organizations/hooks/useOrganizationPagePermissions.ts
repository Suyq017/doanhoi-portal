import { useMemo } from 'react';
import { usePermissions } from '../../../shared/hooks/usePermissions';
import { createComponentPermissions, ComponentPermissions } from '../../../shared/utils/permissionUtils';

export interface OrganizationPagePermissions extends ComponentPermissions {
    // Member management specific permissions
    canAddMember: boolean;
    canRemoveMember: boolean;
    canManageMembers: boolean;

    // Organization hierarchy permissions
    canAccessChildren: boolean;
    canViewMemberCount: boolean;

    // Tree view permissions
    canShowEyeIcon: boolean; // Based on membership OR flexible access_children permission (context/global) OR super admin (NO hasChildren check)
    canShowUsersIcon: boolean; // Based on view permissions
    canShowActionIcons: boolean; // Based on any edit permissions

    // Admin permissions
    isSuperAdmin: boolean; // Check if user is super admin

    // Grouped permissions
    hasAnyViewAction: boolean; // can view details OR manage members
    hasAnyEditAction: boolean; // can edit OR delete OR manage members
    hasAnyManagementAction: boolean; // can add/remove members OR edit OR delete
}

export const useOrganizationPagePermissions = (): OrganizationPagePermissions => {
    const permissions = usePermissions();

    return useMemo(() => {        // Check individual permissions
        const canCreate = permissions.canCreateOrganization();
        const canView = permissions.canViewOrganizationDetails();
        const canUpdate = permissions.canUpdateOrganization();
        const canDelete = permissions.canDeleteOrganization();
        const canExport = permissions.canExportOrganizations();

        // Create base component permissions
        const basePermissions = createComponentPermissions({
            canCreate,
            canView,
            canEdit: canUpdate,
            canDelete,
            canExport,
        });        // Organization-specific permissions
        const canAddMember = permissions.canAddOrganizationMember();
        const canRemoveMember = permissions.canRemoveOrganizationMember();
        const canManageMembers = permissions.canManageOrganizationMembers();
        const canAccessChildren = permissions.canAccessChildOrganizationsFlexible(); // Use flexible method
        const canViewMemberCount = permissions.canViewOrganizationDetails();

        // Check if user is super admin
        const isSuperAdmin = permissions.isSuperAdmin();        // Tree view permissions
        const canShowEyeIcon = isSuperAdmin || canAccessChildren; // Base permission check with flexible access_children, component will add membership check (NO hasChildren)
        const canShowUsersIcon = canViewMemberCount || canManageMembers;
        const canShowActionIcons = canUpdate || canDelete || canManageMembers;

        // Grouped permissions
        const hasAnyViewAction = canView || canManageMembers;
        const hasAnyEditAction = canUpdate || canDelete || canManageMembers;
        const hasAnyManagementAction = canAddMember || canRemoveMember || canUpdate || canDelete;

        return {
            ...basePermissions,
            canAddMember,
            canRemoveMember,
            canManageMembers,
            canAccessChildren,
            canViewMemberCount,
            isSuperAdmin,
            canShowEyeIcon,
            canShowUsersIcon,
            canShowActionIcons,
            hasAnyViewAction,
            hasAnyEditAction,
            hasAnyManagementAction,
        };
    }, [permissions]);
};
