/**
 * Departments feature barrel export
 * 
 * Exports:
 * - Pages: DepartmentsPage
 * - Hooks: useDepartmentPage, useDepartmentModals, useDepartmentImport
 * - Types: Department types and interfaces
 * - Components: Department-specific components
 */

// Pages
export { DepartmentsPage } from './pages';

// Hooks
export {
  useDepartmentPage,
  useDepartmentModals,
  useDepartmentImport,
} from './hooks';

// Types
export type {
  Department,
  DepartmentPagePermissions,
  UseDepartmentPageReturn,
  UseDepartmentModalsReturn,
} from './types';

// Components (for external use if needed)
export {
  DepartmentPageHeader,
  DepartmentFilters,
  BulkActionsToolbar,
  DepartmentTable,
  DepartmentPagination,
} from './components';
