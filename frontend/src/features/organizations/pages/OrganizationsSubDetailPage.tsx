/**
 * OrganizationsSubDetailPage - Sub-detail view for nested organizations
 * Refactored to use shared patterns and better separation of concerns
 */

import React, { useCallback, useState, useMemo } from 'react';
import { useParams, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

// Types
import { Organization } from '../../../shared/types/organization';
import { EMPTY_ORGANIZATION_STATS } from '../../../shared/hooks/queries';

// Components
import OrganizationTreeItem from '../components/OrganizationTreeItem';
import OrganizationPageLayout from '../components/OrganizationPageLayout';
import { OrganizationUserList } from '../components/OrganizationUserList';

// Hooks
import { useOrganizationPage } from '../hooks/useOrganizationPage';
import { useMemberStatsCalculation } from '../hooks/useMemberStatsCalculation';
import { useRefreshHandlers } from '../hooks/useRefreshHandlers';
import { useImportModal } from '../hooks/useImportModal';
import { usePageConfig } from '../hooks/usePageConfig';
import { useBreadcrumbJSX } from '../hooks/useBreadcrumbJSX';

// ========================
// SUB-COMPONENTS
// ========================

interface LoadingIndicatorProps {
  message?: string;
}

const LoadingIndicator: React.FC<LoadingIndicatorProps> = ({ message }) => (
  <div className="flex items-center justify-center py-4">
    <div className="w-8 h-8 border-b-2 rounded-full animate-spin border-doan-600"></div>
    {message && <span className="ml-2 text-gray-500">{message}</span>}
  </div>
);

interface EmptyStateProps {
  message: string;
}

const EmptyState: React.FC<EmptyStateProps> = ({ message }) => (
  <div className="text-center py-4 text-gray-500">{message}</div>
);

// ========================
// MAIN COMPONENT
// ========================

const OrganizationsSubDetailPage: React.FC = () => {
  const { t } = useTranslation(['organizations', 'common']);
  const { type, code } = useParams<{ type: string; code: string }>();
  const location = useLocation();

  // Check if URL hash is #members
  const forceShowMembers = location.hash === '#members';

  // Get page configuration
  const { level } = usePageConfig({ type, code });

  // State to trigger memberStats refresh
  const [memberStatsRefreshKey, setMemberStatsRefreshKey] = useState(0);

  // Organization page data - direct fetch by type/code
  const {
    organizations,
    stats,
    loading,
    error,
    toggleOrgExpanded,
    fetchData,
    handleMemberAdded,
    handleMemberAddError,
    handleBulkDeleteSuccess,
    handleBulkDeleteError,
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
    isSubDetailPage: true,
  });

  // Display organization is just the first organization (direct load)
  const displayOrganization = organizations[0];

  // Determine if should show user list
  const showUserList = useMemo(() => {
    if (forceShowMembers && displayOrganization) {
      return true;
    }
    return !organizations[0]?.children || organizations[0].children.length === 0;
  }, [forceShowMembers, displayOrganization, organizations]);

  // Setup refresh handlers
  const { handleRefreshAll, handleShowSuccess, handleShowError } = useRefreshHandlers({
    fetchData,
    handleBulkDeleteSuccess,
    handleBulkDeleteError,
  });

  // Success handler for organization creation
  const handleCreateSuccess = useCallback(
    (message: string) => {
      showSuccess(message);
    },
    [showSuccess]
  );

  // Member statistics (only when showing user list)
  const { memberStats, loading: memberStatsLoading } = useMemberStatsCalculation(
    showUserList ? displayOrganization : null,
    memberStatsRefreshKey
  );

  // Import modal with refresh callback
  const { importConfig, handleImportModalClose } = useImportModal({
    level,
    organizationId: displayOrganization?.id,
    onRefresh: () => {
      setMemberStatsRefreshKey((prev) => prev + 1);
      return fetchData();
    },
  });

  // Breadcrumb title
  const breadcrumbTitle = useBreadcrumbJSX({
    type,
    code,
    organizations,
    displayOrganization,
    isDetailPage: false,
    isSubDetailPage: true,
    isMembersPage: showUserList,
  });

  // Render organization tree item recursively
  const renderOrganization = useCallback(
    (org: Organization, treeLevel: number = 0, parentId?: string) => {
      const parentParams = {
        type: window.location.pathname.split('/')[3],
        code: window.location.pathname.split('/')[4],
      };

      return (
        <OrganizationTreeItem
          key={org.id}
          org={org}
          level={treeLevel}
          stats={stats || EMPTY_ORGANIZATION_STATS}
          onToggleExpand={toggleOrgExpanded}
          renderChildren={(child, childLevel) => renderOrganization(child, childLevel, org.id)}
          onMemberAdded={handleMemberAdded}
          onOrganizationUpdated={handleOrganizationUpdated}
          onMemberAddError={handleMemberAddError}
          onOrganizationDeleted={handleOrganizationDeleted}
          onDeleteError={handleDeleteError}
          parent={parentParams}
          parentOrgId={parentId}
        />
      );
    },
    [
      stats,
      toggleOrgExpanded,
      handleMemberAdded,
      handleOrganizationUpdated,
      handleMemberAddError,
      handleOrganizationDeleted,
      handleDeleteError,
    ]
  );

  // Render content based on state
  const renderContent = useCallback(() => {
    // If forceShowMembers but no org data, show loading or error
    if (forceShowMembers && !displayOrganization) {
      if (loading) {
        return <LoadingIndicator />;
      }
      return <EmptyState message={t('organizations:no_organization_found')} />;
    }

    // Show user list when appropriate
    if (showUserList && displayOrganization) {
      return (
        <OrganizationUserList
          organization={displayOrganization}
          onRefresh={fetchData}
          onShowSuccess={handleShowSuccess}
          onShowError={handleShowError}
        />
      );
    }

    return null;
  }, [
    forceShowMembers,
    displayOrganization,
    loading,
    showUserList,
    fetchData,
    handleShowSuccess,
    handleShowError,
    t,
  ]);

  // Filter toasts for proper type
  const filteredToasts = useMemo(() => {
    return toasts
      .filter((toast) => toast.type === 'error' || toast.type === 'success' || toast.type === 'info')
      .map(({ type, ...rest }) => ({
        ...rest,
        type: type as 'error' | 'success' | 'info',
      }));
  }, [toasts]);

  return (
    <OrganizationPageLayout
      title={breadcrumbTitle}
      subtitle={t('organizations:subtitle')}
      stats={stats || EMPTY_ORGANIZATION_STATS}
      memberStats={
        showUserList
          ? {
            ...memberStats,
            loading: memberStatsLoading,
          }
          : undefined
      }
      showMemberStats={showUserList}
      loading={loading}
      error={error}
      onRetry={handleRefreshAll}
      showDropdownButton={!showUserList}
      importConfig={importConfig}
      dropdownLabel={t('organizations:addButton.dropdown')}
      toasts={filteredToasts}
      onCloseToast={hideToast}
      level={level}
      onRefreshData={fetchData}
      onShowSuccess={handleCreateSuccess}
      onShowError={showError}
      onImportModalClose={handleImportModalClose}
      organizationId={displayOrganization?.id}
      organizationName={displayOrganization?.name}
    >
      {renderContent()}
    </OrganizationPageLayout>
  );
};

export default OrganizationsSubDetailPage;
