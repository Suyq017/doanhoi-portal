/**
 * OrganizationsDetailPage - Organization detail view with children or member list
 * Refactored to use shared patterns and better separation of concerns
 */

import React, { useCallback, useMemo } from 'react';
import { useParams, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

// Types
import { Organization } from '../../../shared/types/organization';

// Components
import OrganizationTreeItem from '../components/OrganizationTreeItem';
import OrganizationTreeContainer from '../components/OrganizationTreeContainer';
import OrganizationPageLayout from '../components/OrganizationPageLayout';
import { OrganizationUserList } from '../components/OrganizationUserList';

// Hooks
import { useOrganizationPageState } from '../hooks/useOrganizationPageState';
import { usePageConfig } from '../hooks/usePageConfig';
import { useMemberStats } from '../hooks/useMemberStats';
import { useOrganizationSpecificStats } from '../hooks/useOrganizationSpecificStats';
import { useRefreshHandlers } from '../hooks/useRefreshHandlers';
import { useImportModal } from '../hooks/useImportModal';

// ========================
// COMPONENT
// ========================

const OrganizationsDetailPage: React.FC = () => {
  const { t } = useTranslation(['organizations', 'common']);
  const { type, code } = useParams<{ type: string; code: string }>();
  const location = useLocation();

  // Check if URL hash is #members
  const forceShowMembers = location.hash === '#members';

  // Get page configuration
  const { level, shouldShowMemberStats } = usePageConfig({ type, code });

  // Use consolidated page state hook
  const {
    organizations,
    sortedOrganizations,
    displayOrganization,
    stats,
    loading,
    error,
    breadcrumbTitle,
    shouldShowMembers,
    toasts,
    toggleOrgExpanded,
    fetchData,
    handleMemberAdded,
    handleMemberDelete,
    handleMemberAddError,
    handleOrganizationUpdated,
    handleOrganizationDeleted,
    handleDeleteError,
    handleShowSuccess,
    handleShowError,
    hideToast,
  } = useOrganizationPageState({
    type,
    code,
    pageType: 'detail',
    level,
    forceShowMembers,
  });

  // Use member stats hook for organizations that should show them
  const { memberStats, loading: memberStatsLoading, refreshMemberStats } = useMemberStats(
    displayOrganization ?? null,
    shouldShowMemberStats
  );

  // Setup refresh handlers
  const { handleRefreshAll } = useRefreshHandlers({
    fetchData,
    refreshMemberStats: shouldShowMemberStats ? refreshMemberStats : undefined,
  });

  // Import modal configuration
  const { importConfig, handleImportModalClose } = useImportModal({
    level,
    organizationId: displayOrganization?.id,
    onRefresh: shouldShowMemberStats ? handleRefreshAll : fetchData,
    useClientSideProcessing: true,
  });

  // Calculate stats specific to this organization
  const organizationSpecificStats = useOrganizationSpecificStats(organizations, stats);

  // Render organization tree item recursively
  const renderOrganization = useCallback(
    (org: Organization, treeLevel: number = 0, parentId?: string) => {
      return (
        <OrganizationTreeItem
          key={org.id}
          org={org}
          level={treeLevel}
          stats={organizationSpecificStats}
          onToggleExpand={toggleOrgExpanded}
          renderChildren={(child, childLevel) => renderOrganization(child, childLevel, org.id)}
          onMemberAdded={handleMemberAdded}
          onOrganizationUpdated={handleOrganizationUpdated}
          onMemberAddError={handleMemberAddError}
          onOrganizationDeleted={handleOrganizationDeleted}
          onDeleteError={handleDeleteError}
          parent={{ type, code }}
          parentOrgId={parentId}
        />
      );
    },
    [
      organizationSpecificStats,
      toggleOrgExpanded,
      handleMemberAdded,
      handleOrganizationUpdated,
      handleMemberAddError,
      handleOrganizationDeleted,
      handleDeleteError,
      type,
      code,
    ]
  );

  // Render content based on whether to show members or tree
  const renderContent = useMemo(() => {
    if (shouldShowMembers && displayOrganization) {
      return (
        <OrganizationUserList
          organization={displayOrganization}
          onRefresh={handleRefreshAll}
          onShowSuccess={() => handleMemberDelete()}
          onShowError={(message) => handleMemberAddError(message)}
        />
      );
    }

    return (
      <OrganizationTreeContainer isEmpty={sortedOrganizations.length === 0}>
        {sortedOrganizations.map((org) => renderOrganization(org))}
      </OrganizationTreeContainer>
    );
  }, [
    shouldShowMembers,
    displayOrganization,
    sortedOrganizations,
    renderOrganization,
    handleRefreshAll,
    handleMemberDelete,
    handleMemberAddError,
  ]);

  return (
    <OrganizationPageLayout
      organizations={organizations}
      title={breadcrumbTitle}
      subtitle={t('organizations:subtitle')}
      stats={organizationSpecificStats}
      memberStats={
        shouldShowMemberStats
          ? {
            ...memberStats,
            loading: memberStatsLoading,
          }
          : undefined
      }
      showMemberStats={shouldShowMemberStats}
      loading={loading}
      error={error}
      onRetry={shouldShowMemberStats ? handleRefreshAll : fetchData}
      showDropdownButton={!shouldShowMembers}
      importConfig={importConfig}
      dropdownLabel={t('organizations:addButton.dropdown')}
      toasts={toasts}
      onCloseToast={hideToast}
      level={level}
      type={type}
      onRefreshData={shouldShowMemberStats ? handleRefreshAll : fetchData}
      onShowSuccess={handleShowSuccess}
      onShowError={handleShowError}
      onImportModalClose={handleImportModalClose}
    >
      {renderContent}
    </OrganizationPageLayout>
  );
};

export default OrganizationsDetailPage;
