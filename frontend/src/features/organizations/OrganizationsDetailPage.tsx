import React, { useCallback, useMemo } from 'react';
import { useParams, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Organization } from '../../shared/types/organization';
import OrganizationTreeItem from './components/OrganizationTreeItem';
import OrganizationTreeContainer from './components/OrganizationTreeContainer';
import OrganizationPageLayout from './components/OrganizationPageLayout';
import { OrganizationUserList } from './components/OrganizationUserList';
import { useOrganizationPage } from './hooks/useOrganizationPage';
import { useDisplayOrganization } from './hooks/useDisplayOrganization';
import { useMemberStats } from './hooks/useMemberStats';
import { useRefreshHandlers } from './hooks/useRefreshHandlers';
import { useImportModal } from './hooks/useImportModal';
import { usePageConfig } from './hooks/usePageConfig';
import { useOrganizationSpecificStats } from './hooks/useOrganizationSpecificStats';
import { useBreadcrumbJSX } from './hooks/useBreadcrumbJSX';
import { sortOrganizationsByMembership } from './utils/organizationUtils';
import { useAuth } from '../auth/context/AuthContext';

const OrganizationsDetailPage: React.FC = () => {
  const { t } = useTranslation(['organizations', 'common']);
  const { type, code } = useParams<{ type: string; code: string }>();
  const location = useLocation();
  const auth = useAuth();

  // Check if URL hash is #members
  const forceShowMembers = location.hash === '#members';

  // Debug logs
  React.useEffect(() => {
    console.log('🔍 Detail Page Debug:', {
      forceShowMembers,
      hash: location.hash,
      pathname: location.pathname
    });
  }, [forceShowMembers, location.hash, location.pathname]);

  // Get page configuration
  const { level, shouldShowMemberStats } = usePageConfig({
    type,
    code
  });
  // Organization page data
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
    showError
  } = useOrganizationPage({
    type,
    code,
    isDetailPage: true
  });

  // Get display organization
  const displayOrganization = useDisplayOrganization({
    organizations,
    type,
    code
  });

  // Use member stats hook for organizations that should show them
  const { memberStats, loading: memberStatsLoading, refreshMemberStats } = useMemberStats(
    displayOrganization,
    shouldShowMemberStats
  );
  // Setup refresh handlers
  const { handleRefreshAll } = useRefreshHandlers({
    fetchData,
    refreshMemberStats: shouldShowMemberStats ? refreshMemberStats : undefined
  });

  // Success handler for organization creation
  const handleShowSuccess = useCallback((message: string) => {
    showSuccess(message);
  }, [showSuccess]);

  // Import modal with client-side processing for fast backend validation
  const { importConfig, handleImportModalClose } = useImportModal({
    level,
    organizationId: displayOrganization?.id,
    onRefresh: shouldShowMemberStats ? handleRefreshAll : fetchData,
    useClientSideProcessing: true // Enable fast backend validation with bulk queries
  });

  // Helper function to check if user is in organization
  const isUserInOrganization = useCallback((organizationId: string): boolean => {
    if (!auth.auth.user?.organizations) return false;
    return auth.auth.user.organizations.some((userOrg: any) =>
      userOrg.organizationId === organizationId && userOrg.isActive
    );
  }, [auth.auth.user?.organizations]);

  // Sort organizations to prioritize user's membership
  const sortedOrganizations = useMemo(() => {
    return sortOrganizationsByMembership(organizations, isUserInOrganization);
  }, [organizations, isUserInOrganization]);

  // Calculate shouldShowMembers early for conditional rendering and breadcrumb
  const shouldShowMembers = (forceShowMembers || sortedOrganizations.length === 0) && displayOrganization;

  // Use breadcrumb JSX for better navigation
  const breadcrumbTitle = useBreadcrumbJSX({
    type,
    code,
    organizations,
    displayOrganization,
    isDetailPage: true,
    isSubDetailPage: false,
    isMembersPage: !!shouldShowMembers
  });

  // Calculate stats specific to this organization
  const organizationSpecificStats = useOrganizationSpecificStats(organizations, stats);

  const renderOrganization = useCallback((org: Organization, level: number = 0) => {
    return (
      <OrganizationTreeItem
        key={org.id}
        org={org}
        level={level} stats={organizationSpecificStats}
        onToggleExpand={toggleOrgExpanded}
        renderChildren={renderOrganization}
        onMemberAdded={handleMemberAdded}
        onOrganizationUpdated={handleOrganizationUpdated}
        onMemberAddError={handleMemberAddError}
        onOrganizationDeleted={handleOrganizationDeleted}
        onDeleteError={handleDeleteError}
        parent={{ type, code }}
      />
    );
  }, [
    organizationSpecificStats,
    toggleOrgExpanded,
    handleMemberAdded,
    handleOrganizationUpdated,
    handleMemberAddError,
    handleOrganizationDeleted,
    handleDeleteError,
    type,
    code
  ]); 

  return (
    <OrganizationPageLayout
      organizations={organizations}
      title={breadcrumbTitle}
      subtitle={t('organizations:subtitle')}
      stats={organizationSpecificStats}
      memberStats={shouldShowMemberStats ? {
        ...memberStats,
        loading: memberStatsLoading,
      } : undefined}
      showMemberStats={shouldShowMemberStats}
      loading={loading}
      error={error}
      onRetry={shouldShowMemberStats ? handleRefreshAll : fetchData}
      showDropdownButton={!shouldShowMembers}
      importConfig={importConfig}
      dropdownLabel={t('organizations:addButton.dropdown')}
      toasts={toasts
        .filter(toast => toast.type === 'error' || toast.type === 'success' || toast.type === 'info')
        .map(({ type, ...rest }) => ({
          ...rest,
          type: type as 'error' | 'success' | 'info'
        }))
      } onCloseToast={hideToast}
      level={level}
      type={type}
      onRefreshData={shouldShowMemberStats ? handleRefreshAll : fetchData}
      onShowSuccess={handleShowSuccess}
      onShowError={showError}
      onImportModalClose={handleImportModalClose}
    >
      {(() => {
        console.log('📊 Render Decision:', {
          forceShowMembers,
          sortedOrganizationsLength: sortedOrganizations.length,
          hasDisplayOrganization: !!displayOrganization,
          shouldShowMembers,
          displayOrgId: displayOrganization?.id,
          displayOrgName: displayOrganization?.name
        });

        return shouldShowMembers ? (
          // Show user list when: 1) forced by query param OR 2) organization has no children
          <OrganizationUserList
            organization={displayOrganization!}
            onRefresh={handleRefreshAll}
            onShowSuccess={() => {
              handleMemberDelete();
            }}
            onShowError={(message) => {
              handleMemberAddError(message);
            }}
          />
        ) : (
          // Show organization tree when organization has children (and not forced to show members)
          <OrganizationTreeContainer
            isEmpty={sortedOrganizations.length === 0}
          >
            {sortedOrganizations.map(org => renderOrganization(org))}
          </OrganizationTreeContainer>
        );
      })()}
    </OrganizationPageLayout>
  );
};

export default OrganizationsDetailPage;