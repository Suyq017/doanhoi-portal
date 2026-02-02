/**
 * SystemConfig feature barrel export
 * 
 * Exports:
 * - Pages: SystemConfigPage
 * - Hooks: useSystemConfigPage, useSystemConfigPermissions
 * - Types: SystemConfig types and interfaces
 * - Components: SystemConfig-specific components
 */

// Pages
export { SystemConfigPage } from './pages';

// Hooks
export {
    useSystemConfigPage,
    useSystemConfigPermissions,
} from './hooks';

// Types
export type {
    SystemConfigPermissions,
    SystemConfigHeaderProps,
    UseSystemConfigPageReturn,
    UseSystemConfigPermissionsReturn,
} from './types';

// Components (for external use if needed)
export {
    SystemConfigHeader,
    LoadingState,
    AccessDeniedState,
} from './components';
