/**
 * User components barrel export
 */

// Page layout components
export { UserPageHeader } from './UserPageHeader';
export type { UserPageHeaderProps } from './UserPageHeader';

export { AccessDeniedState, LoadingState, ErrorState } from './PageStates';
export type { ErrorStateProps } from './PageStates';

// Modal components
export { default as CreateUserModal } from './CreateUserModal';
export { default as ViewUserModal } from './ViewUserModal';
export { default as EditUserModal } from './EditUserModal';
export { default as DeleteConfirmModal } from './DeleteConfirmModal';
export { default as BulkDeleteConfirmModal } from './BulkDeleteConfirmModal';
export { default as UserRoleAssignmentModal } from './UserRoleAssignmentModal';
export { default as GrantRolesModal } from './GrantRolesModal';

// Form components
export { default as OrganizationCombobox } from './OrganizationCombobox';
export { default as OrganizationManager } from './OrganizationManager';
export { default as RoleCombobox } from './RoleCombobox';
export { default as RoleManager } from './RoleManager';
export { default as RoleBadge } from './RoleBadge';
export { default as RoleAssignmentItem } from './RoleAssignmentItem';
export { default as RoleAssignmentManager } from './RoleAssignmentManager';
export { default as UserSearchCombobox } from './UserSearchCombobox';

// Multi-select components
export { default as MultiSelectOrganizationCombobox } from './MultiSelectOrganizationCombobox';
export { default as MultiSelectRoleCombobox } from './MultiSelectRoleCombobox';
export { default as OrganizationRoleCombobox } from './OrganizationRoleCombobox';

// Permission/Role management components
export { default as PermissionsOrganizationManager } from './PermissionsOrganizationManager';
export { default as PermissionsOrganizationRow } from './PermissionsOrganizationRow';
export { default as RolesOrganizationManager } from './RolesOrganizationManager';
export { default as RolesOrganizationRow } from './RolesOrganizationRow';
