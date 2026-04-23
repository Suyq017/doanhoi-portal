// Components
export * from './components';
export * from './components/export';
export { PermissionGuard } from './components/PermissionGuard';
export { ConditionalRender } from './components/ConditionalRender';
export { ProtectedRoute } from './components/ProtectedRoute';

// Hooks  
export * from './hooks';
export { usePermissions } from './hooks/usePermissions';

// Services
export * from './services';

// Types
export * from './types';
export type { UserRoleAssignment, RoleAssignmentItem } from './types/user';

// Constants - using explicit exports to avoid naming conflicts
export {
    USER_PERMISSIONS,
    DEPARTMENT_PERMISSIONS,
    CLASS_PERMISSIONS,
    ORGANIZATION_PERMISSIONS,
    ROLE_PERMISSIONS,
    SYSTEM_PERMISSIONS,
    ALL_PERMISSIONS,
    type UserPermission,
    type DepartmentPermission,
    type ClassPermission,
    type OrganizationPermission,
    type RolePermission,
    type SystemPermission,
    type PermissionCode, // Renamed to avoid conflict with Permission entity
} from './constants/permissions';

// Utils
export * from '../features/organizations/utils/organizationUtils';
export * from './utils/permissionUtils';
