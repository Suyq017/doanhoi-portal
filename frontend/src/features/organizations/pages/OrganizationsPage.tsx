/**
 * OrganizationsPage - Main organizations listing page
 * Refactored to use shared patterns and better separation of concerns
 */

import React, { useCallback } from 'react';
import { useTranslation } from 'react-i18next';

// Types
import { Organization } from '../../../shared/types/organization';
import { EMPTY_ORGANIZATION_STATS } from '../../../shared/hooks/queries';

// Components
import OrganizationTreeItem from '../components/OrganizationTreeItem';
import OrganizationTreeContainer from '../components/OrganizationTreeContainer';
import OrganizationPageLayout from '../components/OrganizationPageLayout';

// Hooks
import { useOrganizationPageState } from '../hooks/useOrganizationPageState';

// ========================
// CONSTANTS
// ========================

const PAGE_LEVEL = 2;

// ========================
// COMPONENT
// ========================

const OrganizationsPage: React.FC = () => {
  const { t } = useTranslation(['organizations', 'common']);

  // Use consolidated page state hook
  const {
    sortedOrganizations,
    stats,
    loading,
    error,
    breadcrumbTitle,
    importConfig,
    toasts,
    toggleOrgExpanded,
    fetchData,
    handleMemberAdded,
    handleMemberAddError,
    handleOrganizationUpdated,
    handleOrganizationDeleted,
    handleDeleteError,
    handleShowSuccess,
    handleShowError,
    handleImportModalClose,
    hideToast,
  } = useOrganizationPageState({
    pageType: 'main',
    level: PAGE_LEVEL,
  });

  // Render organization tree item recursively
  const renderOrganization = useCallback(
    (org: Organization, level: number = 0, parentId?: string) => {
      return (
        <OrganizationTreeItem
          key={org.id}
          org={org}
          level={level}
          stats={stats || EMPTY_ORGANIZATION_STATS}
          onToggleExpand={toggleOrgExpanded}
          renderChildren={(child, childLevel) => renderOrganization(child, childLevel, org.id)}
          onMemberAdded={handleMemberAdded}
          onOrganizationUpdated={handleOrganizationUpdated}
          onMemberAddError={handleMemberAddError}
          onOrganizationDeleted={handleOrganizationDeleted}
          onDeleteError={handleDeleteError}
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

  return (
    <OrganizationPageLayout
      organizations={sortedOrganizations}
      title={breadcrumbTitle}
      subtitle={t('organizations:subtitle')}
      stats={stats || EMPTY_ORGANIZATION_STATS}
      loading={loading}
      error={error}
      onRetry={fetchData}
      showDropdownButton={true}
      importConfig={importConfig}
      toasts={toasts}
      onCloseToast={hideToast}
      level={PAGE_LEVEL}
      onRefreshData={fetchData}
      onShowSuccess={handleShowSuccess}
      onShowError={handleShowError}
      onImportModalClose={handleImportModalClose}
    >
      <OrganizationTreeContainer isEmpty={sortedOrganizations.length === 0}>
        {sortedOrganizations.map((org) => renderOrganization(org))}
      </OrganizationTreeContainer>
    </OrganizationPageLayout>
  );
};

export default OrganizationsPage;
