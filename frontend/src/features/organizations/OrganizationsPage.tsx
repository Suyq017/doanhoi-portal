import React, { useCallback, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Organization } from '../../shared/types/organization';
import { useAuth } from '../auth/context/AuthContext';
import OrganizationTreeItem from './components/OrganizationTreeItem';
import OrganizationTreeContainer from './components/OrganizationTreeContainer';
import OrganizationPageLayout from './components/OrganizationPageLayout';
import { useOrganizationPage } from './hooks/useOrganizationPage';
import { useOrganizationImport } from './hooks/useOrganizationImport';
import { useBreadcrumbJSX } from './hooks/useBreadcrumbJSX';

const Organizations: React.FC = () => {
  const { t } = useTranslation(['organizations', 'common']);
  const { auth } = useAuth();
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

  // Helper function để check user có thuộc organization không
  const isUserInOrganization = useCallback((organizationId: string): boolean => {
    if (!auth.user?.organizations) return false;

    return auth.user.organizations.some(userOrg =>
      userOrg.organizationId === organizationId && userOrg.isActive
    );
  }, [auth.user?.organizations]);
  // Sắp xếp organizations để ưu tiên những tổ chức user thuộc về
  const sortedOrganizations = useMemo(() => {
    if (!organizations.length) return organizations;

    const sortOrganizations = (orgs: Organization[]): Organization[] => {
      return [...orgs]
        .map(org => ({
          ...org,
          children: org.children ? sortOrganizations(org.children) : undefined
        }))
        .sort((a, b) => {
          const aIsMember = isUserInOrganization(a.id);
          const bIsMember = isUserInOrganization(b.id);

          // Ưu tiên organizations mà user thuộc về lên đầu
          if (aIsMember && !bIsMember) return -1;
          if (!aIsMember && bIsMember) return 1;

          // Nếu cùng membership status, giữ nguyên thứ tự alphabetical
          return a.name.localeCompare(b.name);
        });
    };

    const sorted = sortOrganizations(organizations);

    // Debug log để xem kết quả sắp xếp
    console.log('🔄 Organizations sorted by membership:',
      sorted.map(org => ({
        name: org.name,
        isMember: isUserInOrganization(org.id)
      }))
    );

    return sorted;
  }, [organizations, isUserInOrganization]);

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
      isEmpty={sortedOrganizations.length === 0} // Use sorted organizations
    >
      {sortedOrganizations.map(org => renderOrganization(org))} {/* Use sorted organizations */}
    </OrganizationTreeContainer>
  </OrganizationPageLayout>
  );
};

export default Organizations;


