import { useAuth } from '../../features/auth/context/AuthContext';

export const usePermissions = () => {
    const { auth, hasPermission, hasAnyPermission } = useAuth();
    const { currentOrganizationId, permissionsLoading } = auth;

    return {
        // Dashboard permissions
        canAccessDashboard: () => hasPermission('dashboard.access', currentOrganizationId),        // Users permissions
        canAccessUsers: () => hasPermission('users.access', currentOrganizationId),
        canCreateUser: () => hasPermission('users.create', currentOrganizationId),
        canViewUserDetails: () => hasPermission('users.view_details', currentOrganizationId),
        canUpdateUser: () => hasPermission('users.update', currentOrganizationId),
        canDeleteUser: () => hasPermission('users.delete', currentOrganizationId),
        canExportUsers: () => hasPermission('users.export', currentOrganizationId),
        canManageUserRoles: () => hasPermission('users.roles.manage', currentOrganizationId),

        // Organizations permissions
        canAccessOrganizations: () => hasPermission('organizations.access', currentOrganizationId),
        canCreateOrganization: () => hasPermission('organizations.create'), // System-wide permission
        canViewOrganizationDetails: () => hasPermission('organizations.view_member_count', currentOrganizationId),
        canAccessChildOrganizations: () => hasPermission('organizations.access_children', currentOrganizationId),
        canUpdateOrganization: () => hasPermission('organizations.update', currentOrganizationId),
        canDeleteOrganization: () => hasPermission('organizations.delete', currentOrganizationId),
        canManageOrganizationMembers: () => hasAnyPermission([
            'organizations.add_member',
            'organizations.remove_member'
        ], currentOrganizationId),        // Departments permissions
        canAccessDepartments: () => hasPermission('departments.access', currentOrganizationId),
        canCreateDepartment: () => hasPermission('departments.create', currentOrganizationId),
        canViewDepartmentDetails: () => hasPermission('departments.view_details', currentOrganizationId),
        canUpdateDepartment: () => hasPermission('departments.update', currentOrganizationId),
        canDeleteDepartment: () => hasPermission('departments.delete', currentOrganizationId),
        canExportDepartments: () => hasPermission('departments.export', currentOrganizationId),

        // Classes permissions
        canAccessClasses: () => hasPermission('classes.access', currentOrganizationId),
        canCreateClass: () => hasPermission('classes.create', currentOrganizationId),
        canViewClassDetails: () => hasPermission('classes.view_details', currentOrganizationId),
        canUpdateClass: () => hasPermission('classes.update', currentOrganizationId),
        canDeleteClass: () => hasPermission('classes.delete', currentOrganizationId),
        canExportClasses: () => hasPermission('classes.export', currentOrganizationId),

        // Permissions management
        canAccessPermissions: () => hasPermission('permissions.access'), // System-wide
        canCreateRole: () => hasPermission('permissions.create'),
        canUpdateRole: () => hasPermission('permissions.update'),
        canDeleteRole: () => hasPermission('permissions.delete'),
        canViewRoleDetails: () => hasPermission('permissions.view_details'),

        // Generic permission check
        hasPermission,
        hasAnyPermission,

        // User and auth info
        user: auth.user,
        userRoles: auth.userRoles,
        userPermissions: auth.userPermissions,
        currentOrganizationId,
        permissionsLoading,
        isAuthenticated: auth.isAuthenticated,
    };
};
