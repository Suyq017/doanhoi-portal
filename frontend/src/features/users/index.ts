/**
 * Users feature barrel export
 * 
 * Exports:
 * - Pages: UsersPage
 * - Hooks: useUsersPage, useUserModals, useUserActions, etc.
 * - Types: User types and interfaces
 * - Components: User-specific components
 */

// Pages
export { UsersPage } from './pages';

// Hooks
export {
    useUsersPage,
    useUserModals,
    useUserActions,
    useUserImportConfig,
    useUserBatchImportConfig,
    useUserPagePermissions,
    useGrantRoles,
} from './hooks';

// Types
export type {
    User,
    CreateUserRequest,
    UserPagePermissions,
    UserModalType,
    UseUserModalsReturn,
    UseUserPageReturn,
} from './types';

// Components (for external use if needed)
export {
    UserPageHeader,
    AccessDeniedState,
    LoadingState,
    ErrorState,
    CreateUserModal,
    ViewUserModal,
    EditUserModal,
    DeleteConfirmModal,
    BulkDeleteConfirmModal,
    UserRoleAssignmentModal,
    GrantRolesModal,
    OrganizationCombobox,
    RoleCombobox,
    RoleManager,
    RoleBadge,
} from './components';
