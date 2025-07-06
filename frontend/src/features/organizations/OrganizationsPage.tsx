import React, { useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { Organization } from '../../shared/types/organization';
import OrganizationTreeItem from './components/OrganizationTreeItem';
import OrganizationTreeContainer from './components/OrganizationTreeContainer';
import OrganizationPageLayout from './components/OrganizationPageLayout';
import { useOrganizationPage } from './hooks/useOrganizationPage';
import { useOrganizationImport } from './hooks/useOrganizationImport';
import { useBreadcrumbJSX } from './hooks/useBreadcrumbJSX';

const Organizations: React.FC = () => {
  const { t } = useTranslation(['organizations', 'common']);
  const level = 2;
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
    hideToast
  } = useOrganizationPage();

  // ✅ Use breadcrumb JSX for better navigation
  const breadcrumbTitle = useBreadcrumbJSX({
    organizations,
    isDetailPage: false,
    isSubDetailPage: false,
    isMembersPage: false
  });

  // ✅ Organization creation success handler
  const handleOrganizationCreated = useCallback(async () => {
    // Fetch lại data để cập nhật tree
    await fetchData();
  }, [fetchData]);

  // ✅ Organization creation error handler  
  const handleOrganizationCreateError = useCallback((error: string) => {
    console.error('Error creating organization:', error);
    // Error đã được handle trong modal, không cần làm gì thêm
  }, []);  // ✅ Use useOrganizationImport hook instead of createOrganizationImport
  const { importConfig, setIsImportModalOpen } = useOrganizationImport({
    level,
    organizationId: undefined, // For main page, no specific organization
    onSuccess: () => {
      // Don't refresh here, just show success message
      console.log('Import completed successfully');
    },
    onError: (error) => handleOrganizationCreateError(error.message)
  });

  // ✅ Handle modal close with data refresh
  const handleImportModalClose = useCallback(() => {
    setIsImportModalOpen(false);
    // Refresh data when modal closes (after import is done)
    fetchData();
  }, [setIsImportModalOpen, fetchData]);

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
    organizations={organizations}
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
      }))
    }
    onCloseToast={hideToast} level={level}
    // ✅ Fix callbacks cho organization creation
    onRefreshData={handleOrganizationCreated}
    onShowSuccess={handleOrganizationCreated}
    onShowError={handleOrganizationCreateError}
    onImportModalClose={handleImportModalClose} // Add import modal close handler
  >
    <OrganizationTreeContainer
      isEmpty={organizations.length === 0}
    >
      {organizations.map(org => renderOrganization(org))}
    </OrganizationTreeContainer>
  </OrganizationPageLayout>
  );
};

export default Organizations;