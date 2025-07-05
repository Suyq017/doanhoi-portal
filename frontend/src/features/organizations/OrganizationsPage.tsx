import React, { useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { Organization } from '../../shared/types/organization';
import OrganizationTreeItem from './components/OrganizationTreeItem';
import OrganizationTreeContainer from './components/OrganizationTreeContainer';
import OrganizationPageLayout from './components/OrganizationPageLayout';
import { useOrganizationPage } from './hooks/useOrganizationPage';
import { createOrganizationImportConfig } from './utils/organizationUtils';

const Organizations: React.FC = () => {
  const { t } = useTranslation(['organizations', 'common']);

  const importConfig = createOrganizationImportConfig(2);
  const level = 2; const {
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
    handleOrganizationCreated,
    handleOrganizationCreateError,
    toasts,
    hideToast,
    getPageTitle
  } = useOrganizationPage();  // ✅ Organization creation success handler
  const handleOrganizationCreatedWrapper = useCallback(async () => {
    // Use the hook's function which shows toast AND refreshes data
    await handleOrganizationCreated();
  }, [handleOrganizationCreated]);

  // ✅ Organization creation error handler  
  const handleOrganizationCreateErrorWrapper = useCallback((error: string) => {
    // Use the hook's function which shows toast
    handleOrganizationCreateError(error);
  }, [handleOrganizationCreateError]);
  const renderOrganization = useCallback((org: Organization, level: number = 0) => {
    return (
      <OrganizationTreeItem
        key={org.id}
        org={org}
        level={level}
        stats={stats}
        onToggleExpand={toggleOrgExpanded}
        renderChildren={renderOrganization} onMemberAdded={handleMemberAdded}
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
  return (
    <OrganizationPageLayout
      organizations={organizations}
      title={getPageTitle()}
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
        }))
      }
      onCloseToast={hideToast} level={level}
      // ✅ Fix callbacks cho organization creation
      onRefreshData={handleOrganizationCreatedWrapper}
      onShowSuccess={handleOrganizationCreatedWrapper}
      onShowError={handleOrganizationCreateErrorWrapper}
    >
      <OrganizationTreeContainer
        key={`org-tree-${organizations.length}-${stats.totalMembers}`}
        isEmpty={organizations.length === 0}
      >
        {organizations.map(org => renderOrganization(org))}
      </OrganizationTreeContainer>
    </OrganizationPageLayout>
  );
};

export default Organizations;