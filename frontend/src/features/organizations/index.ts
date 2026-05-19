/**
 * Organizations Feature - Main exports
 */

// ========================
// PAGE COMPONENTS
// ========================
export {
  OrganizationsPage,
  OrganizationsDetailPage,
  OrganizationsSubDetailPage
} from './pages';

// ========================
// COMPONENTS
// ========================
export * from './components';

// ========================
// HOOKS
// ========================
export {
  useOrganizationPage,
  useOrganizationPageState,
  useOrganizationPagePermissions,
  usePageConfig,
  useDisplayOrganization,
  useMemberStats,
  useMemberStatsCalculation,
  useOrganizationStats,
  useOrganizationMemberStats,
  useOrganizationSpecificStats,
  useBreadcrumb,
  useBreadcrumbJSX,
  useImportModal,
  useMemberImport,
  useOrganizationImport,
  useRefreshHandlers,
  useOrganizationTree,
  useOrganizationUserList,
  useFormState,
} from './hooks';

// Re-export types from hooks (avoiding conflict with types/)
export type {
  OrganizationPagePermissions,
  UseOrganizationPageStateOptions,
  UseOrganizationPageStateReturn,
  PageType,
} from './hooks';

// ========================
// TYPES (excluding duplicates already exported from components/hooks)
// ========================
export type {
  Organization,
  OrganizationType,
  CreateOrganizationRequest,
  UpdateOrganizationRequest,
  OrganizationPageConfig,
  OrganizationPageParams,
  OrganizationTreeItemProps,
  OrganizationPageLayoutConfig,
  UseOrganizationPageReturn,
  MemberStatsData,
} from './types';

// Re-export import types
export * from './types/organization-import.types';

// ========================
// CONTEXT
// ========================
export * from './context/OrganizationStatsContext';

// ========================
// UTILS
// ========================
export * from './utils/organizationUtils';