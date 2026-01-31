/**
 * useOrganizationPageState - Custom hook for managing organization page state and handlers
 * This hook consolidates common logic used across OrganizationsPage, OrganizationsDetailPage, 
 * and OrganizationsSubDetailPage
 */

import { useCallback, useMemo } from 'react';
import { useLocation } from 'react-router-dom';
import { useAuth } from '../../auth/context/AuthContext';
import { Organization, OrganizationStats as StatsType } from '../../../shared/types/organization';
import { useOrganizationPage } from './useOrganizationPage';
import { useRefreshHandlers } from './useRefreshHandlers';
import { useImportModal } from './useImportModal';
import { useBreadcrumbJSX } from './useBreadcrumbJSX';
import { sortOrganizationsByMembership } from '../utils/organizationUtils';
import { EMPTY_ORGANIZATION_STATS } from '../../../shared/hooks/queries';
import { ToastMessage } from '../components/OrganizationPageLayout';

// ========================
// TYPES
// ========================

export type PageType = 'main' | 'detail' | 'subdetail';

export interface UseOrganizationPageStateOptions {
  type?: string;
  code?: string;
  pageType: PageType;
  level: number;
  forceShowMembers?: boolean;
}

export interface UseOrganizationPageStateReturn {
  // Data
  organizations: Organization[];
  sortedOrganizations: Organization[];
  displayOrganization: Organization | undefined;
  stats: StatsType;
  loading: boolean;
  error: string | null;

  // UI Configuration
  breadcrumbTitle: React.ReactNode;
  shouldShowMembers: boolean;

  // Import
  importConfig: any;

  // Handlers
  toggleOrgExpanded: (id: string) => void;
  fetchData: () => Promise<void>;
  handleRefreshAll: () => Promise<void>;
  handleMemberAdded: () => Promise<void>;
  handleMemberDelete: () => Promise<void>;
  handleMemberAddError: (error: string) => void;
  handleOrganizationUpdated: (updatedOrg?: Organization) => Promise<void>;
  handleOrganizationDeleted: () => Promise<void>;
  handleDeleteError: (error: string) => void;
  handleShowSuccess: (message: string) => void;
  handleShowError: (message: string) => void;
  handleImportModalClose: () => void;

  // Toast
  toasts: ToastMessage[];
  hideToast: (id: string) => void;

  // Utils
  isUserInOrganization: (organizationId: string) => boolean;
}

// ========================
// HOOK
// ========================

export const useOrganizationPageState = (
  options: UseOrganizationPageStateOptions
): UseOrganizationPageStateReturn => {
  const { type, code, pageType, level, forceShowMembers = false } = options;
  const { auth } = useAuth();
  const location = useLocation();

  // Determine page configuration
  const isDetailPage = pageType === 'detail';
  const isSubDetailPage = pageType === 'subdetail';

  // Organization page data from main hook
  const {
    organizations,
    stats,
    loading,
    error,
    toggleOrgExpanded,
    fetchData,
    handleMemberAdded,
    handleMemberDelete,
    handleMemberAddError,
    handleOrganizationUpdated,
    handleOrganizationDeleted,
    handleDeleteError,
    toasts,
    hideToast,
    showSuccess,
    showError,
  } = useOrganizationPage({
    type,
    code,
    isDetailPage,
    isSubDetailPage,
  });

  // Helper function to check user membership
  const isUserInOrganization = useCallback(
    (organizationId: string): boolean => {
      if (!auth.user?.organizations) return false;
      return auth.user.organizations.some(
        (userOrg) => userOrg.organizationId === organizationId && userOrg.isActive
      );
    },
    [auth.user?.organizations]
  );

  // Sort organizations to prioritize user's membership
  const sortedOrganizations = useMemo(() => {
    if (!organizations.length) return organizations;
    return sortOrganizationsByMembership(organizations, isUserInOrganization);
  }, [organizations, isUserInOrganization]);

  // Get display organization for detail/subdetail pages
  const displayOrganization = useMemo(() => {
    if (pageType === 'main') return undefined;
    return organizations[0];
  }, [organizations, pageType]);

  // Calculate if should show members
  const shouldShowMembers = useMemo(() => {
    if (pageType === 'main') return false;

    const hasForceShowMembers = forceShowMembers || location.hash === '#members';
    const hasNoChildren = sortedOrganizations.length === 0 ||
      (!sortedOrganizations[0]?.children || sortedOrganizations[0].children.length === 0);

    return (hasForceShowMembers || hasNoChildren) && !!displayOrganization;
  }, [pageType, forceShowMembers, location.hash, sortedOrganizations, displayOrganization]);

  // Setup refresh handlers
  const { handleRefreshAll } = useRefreshHandlers({
    fetchData,
  });

  // Import modal configuration
  const { importConfig, handleImportModalClose } = useImportModal({
    level: level as 2 | 3,
    organizationId: displayOrganization?.id,
    onRefresh: fetchData,
    useClientSideProcessing: true,
  });

  // Breadcrumb title
  const breadcrumbTitle = useBreadcrumbJSX({
    type,
    code,
    organizations,
    displayOrganization,
    isDetailPage,
    isSubDetailPage,
    isMembersPage: shouldShowMembers,
  });

  // Success/Error handlers
  const handleShowSuccess = useCallback(
    (message: string) => {
      showSuccess(message);
    },
    [showSuccess]
  );

  const handleShowError = useCallback(
    (message: string) => {
      showError(message);
    },
    [showError]
  );

  // Filter and map toasts for proper type
  const filteredToasts: ToastMessage[] = useMemo(() => {
    return toasts
      .filter((toast) => toast.type === 'error' || toast.type === 'success' || toast.type === 'info')
      .map(({ type, ...rest }) => ({
        ...rest,
        type: type as 'error' | 'success' | 'info',
      }));
  }, [toasts]);

  return {
    // Data
    organizations,
    sortedOrganizations,
    displayOrganization,
    stats: stats || EMPTY_ORGANIZATION_STATS,
    loading,
    error,

    // UI Configuration
    breadcrumbTitle,
    shouldShowMembers,

    // Import
    importConfig,

    // Handlers
    toggleOrgExpanded,
    fetchData,
    handleRefreshAll,
    handleMemberAdded,
    handleMemberDelete,
    handleMemberAddError,
    handleOrganizationUpdated,
    handleOrganizationDeleted,
    handleDeleteError,
    handleShowSuccess,
    handleShowError,
    handleImportModalClose,

    // Toast
    toasts: filteredToasts,
    hideToast,

    // Utils
    isUserInOrganization,
  };
};

export default useOrganizationPageState;
