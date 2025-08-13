import React, { useCallback, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Organization } from '../../shared/types/organization';
import { useAuth } from '../auth/context/AuthContext';
import OrganizationTreeItem from './components/OrganizationTreeItem';
import OrganizationTreeContainer from './components/OrganizationTreeContainer';
import OrganizationPageLayout from './components/OrganizationPageLayout';
import { useOrganizationPage } from './hooks/useOrganizationPage';
import { useRefreshHandlers } from './hooks/useRefreshHandlers';
import { useImportModal } from './hooks/useImportModal';
import { useBreadcrumbJSX } from './hooks/useBreadcrumbJSX';
import { sortOrganizationsByMembership } from './utils/organizationUtils';

const Organizations: React.FC = () => {
  const { t } = useTranslation(['organizations', 'common']);
  const { auth } = useAuth();
  const level = 2;
  // Organization page data
  const {
    organizations,
    stats,
    loading,
    error,
    toggleOrgExpanded,
    fetchData,
    handleMemberAdded,
    handleMemberAddError,
    handleOrganizationUpdated,
    handleOrganizationDeleted,
    handleDeleteError,
    toasts,
    hideToast,
    showSuccess,
    showError
  } = useOrganizationPage();

  // Helper function to check user membership
  const isUserInOrganization = useCallback((organizationId: string): boolean => {
    if (!auth.user?.organizations) return false;
    return auth.user.organizations.some(userOrg =>
      userOrg.organizationId === organizationId && userOrg.isActive
    );
  }, [auth.user?.organizations]);

  // Sort organizations to prioritize user's membership
  const sortedOrganizations = useMemo(() => {
    if (!organizations.length) return organizations;
    return sortOrganizationsByMembership(organizations, isUserInOrganization);
  }, [organizations, isUserInOrganization]);  // Setup refresh handlers for organization creation
  const {
    handleOrganizationCreatedWrapper: handleRefreshData
  } = useRefreshHandlers({
    fetchData
  });
  // Success handler for showing toast (without triggering refresh)
  const handleShowSuccess = useCallback((message: string) => {
    showSuccess(message);
  }, [showSuccess]);

  // Import modal
  const { importConfig, handleImportModalClose } = useImportModal({
    level,
    organizationId: undefined, // For main page, no specific organization
    onRefresh: fetchData
  });

  // Use breadcrumb JSX for better navigation
  const breadcrumbTitle = useBreadcrumbJSX({
    organizations,
    isDetailPage: false,
    isSubDetailPage: false,
    isMembersPage: false
  });

  const renderOrganization = useCallback((org: Organization, level: number = 0) => {
    return (
      <OrganizationTreeItem
        key={org.id}
        org={org}
        level={level}
        stats={stats}
        onToggleExpand={toggleOrgExpanded}
        renderChildren={renderOrganization}
        onMemberAdded={handleMemberAdded}
        onOrganizationUpdated={handleOrganizationUpdated}
        onMemberAddError={handleMemberAddError}
        onOrganizationDeleted={handleOrganizationDeleted}
        onDeleteError={handleDeleteError}
      />
    );
  }, [
    stats,
    toggleOrgExpanded,
    handleMemberAdded,
    handleOrganizationUpdated,
    handleMemberAddError,
    handleOrganizationDeleted,
    handleDeleteError
  ]);
  return (<OrganizationPageLayout
    organizations={sortedOrganizations} // Use sorted organizations
    title={breadcrumbTitle}
    subtitle={t('organizations:subtitle')}
    stats={stats}
    loading={loading}
    error={error}
    onRetry={fetchData}
    showDropdownButton={true}
    importConfig={importConfig}
    toasts={toasts
      .filter(toast => toast.type === 'error' || toast.type === 'success' || toast.type === 'info')
      .map(({ type, ...rest }) => ({
        ...rest,
        type: type as 'error' | 'success' | 'info'
      }))} onCloseToast={hideToast} level={level}    // Organization creation handlers
    onRefreshData={handleRefreshData}
    onShowSuccess={handleShowSuccess}
    onShowError={showError}
    onImportModalClose={handleImportModalClose}
  >
    <OrganizationTreeContainer
      isEmpty={sortedOrganizations.length === 0} // Use sorted organizations
    >
      {sortedOrganizations.map(org => renderOrganization(org))} {/* Use sorted organizations */}
    </OrganizationTreeContainer>
  </OrganizationPageLayout>
  );
};

export default Organizations;


