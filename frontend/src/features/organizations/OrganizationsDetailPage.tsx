import React, { useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Organization } from '../../shared/types/organization';
import OrganizationTreeItem from './components/OrganizationTreeItem';
import OrganizationTreeContainer from './components/OrganizationTreeContainer';
import OrganizationPageLayout from './components/OrganizationPageLayout';
import { OrganizationUserList } from './components/OrganizationUserList';
import { useOrganizationPage } from './hooks/useOrganizationPage';
import { useOrganizationImport } from './hooks/useOrganizationImport';
import { useMemberStats } from './hooks/useMemberStats';
import { useOrganizationSpecificStats } from './hooks/useOrganizationSpecificStats';
import { useBreadcrumbJSX } from './hooks/useBreadcrumbJSX';

const OrganizationsDetailPage: React.FC = () => {
  const { t } = useTranslation(['organizations', 'common']);
  const { type, code } = useParams<{ type: string; code: string }>();
  const level: 2 | 3 = type === 'clb_truong' ? 3 : 2;
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
    hideToast
  } = useOrganizationPage({
    type,
    code,
    isDetailPage: true
  });

  // ✅ Use breadcrumb JSX for better navigation
  const breadcrumbTitle = useBreadcrumbJSX({
    type,
    code,
    organizations,
    displayOrganization: organizations[0],
    isDetailPage: true,
    isSubDetailPage: false,
    isMembersPage: false
  });

  // Use member stats hook for clb_truong type
  const { memberStats, loading: memberStatsLoading, refreshMemberStats } = useMemberStats(
    organizations[0] || null,
    type === 'clb_truong'
  );

  // Enhanced refresh function that also refreshes member stats
  const handleRefreshAll = useCallback(async () => {
    await fetchData(); // Refresh main data
    if (type === 'clb_truong') {
      refreshMemberStats(); // Refresh member stats
    }
  }, [fetchData, type, refreshMemberStats]);

  // ✅ Use useOrganizationImport hook with specific organization
  const { importConfig, setIsImportModalOpen } = useOrganizationImport({
    level,
    organizationId: organizations[0]?.id,
    onSuccess: () => {
      // Don't refresh here, just show success message
      console.log('Import completed successfully');
    },
    onError: (error) => {
      console.error('Import error:', error.message);
    }
  });

  // ✅ Handle modal close with data refresh
  const handleImportModalClose = useCallback(() => {
    setIsImportModalOpen(false);
    // Refresh data when modal closes (after import is done)
    if (type === 'clb_truong') {
      handleRefreshAll();
    } else {
      fetchData();
    }
  }, [setIsImportModalOpen, type, handleRefreshAll, fetchData]);

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

  return (<OrganizationPageLayout organizations={organizations}
    title={breadcrumbTitle}
    subtitle={t('organizations:subtitle')}
    stats={organizationSpecificStats} memberStats={type === 'clb_truong' ? {
      ...memberStats,
      loading: memberStatsLoading,
    } : undefined}
    showMemberStats={type === 'clb_truong'}
    loading={loading} error={error}
    onRetry={type === 'clb_truong' ? handleRefreshAll : fetchData}
    showDropdownButton={true}
    importConfig={importConfig}
    dropdownLabel={t('organizations:addButton.dropdown')}
    toasts={toasts
      .filter(toast => toast.type === 'error' || toast.type === 'success' || toast.type === 'info')
      .map(({ type, ...rest }) => ({
        ...rest,
        type: type as 'error' | 'success' | 'info'
      }))
    } onCloseToast={hideToast} level={level}
    type={type}
    onRefreshData={type === 'clb_truong' ? handleRefreshAll : fetchData}
    onShowSuccess={handleMemberAdded}
    onImportModalClose={handleImportModalClose} // Add import modal close handler
  >      {type === 'clb_truong' ? (
    // Hiển thị danh sách thành viên cho clb_truong
    <OrganizationUserList
      organization={organizations[0]}
      onRefresh={handleRefreshAll}
      onShowSuccess={() => {
        handleMemberDelete();
      }}
      onShowError={(message) => {
        handleMemberAddError(message);
      }}
    />
  ) : (
    // Hiển thị cây tổ chức cho các type khác
    <OrganizationTreeContainer
      isEmpty={organizations.length === 0}
    >
      {organizations.map(org => renderOrganization(org))}
    </OrganizationTreeContainer>
  )}


  </OrganizationPageLayout>
  );
};

export default OrganizationsDetailPage;