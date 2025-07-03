import React, { useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Organization } from '../../shared/types/organization';
import OrganizationTreeItem from './components/OrganizationTreeItem';
import OrganizationTreeContainer from './components/OrganizationTreeContainer';
import OrganizationPageLayout from './components/OrganizationPageLayout';
import { createOrganizationImportConfig } from './utils/organizationUtils';
import { useOrganizationPage } from './hooks/useOrganizationPage';

const OrganizationsDetailPage: React.FC = () => {
  const { t } = useTranslation(['organizations', 'common']);
  const { type, code } = useParams<{ type: string; code: string }>();
  const importConfig = createOrganizationImportConfig(2);

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
    getPageTitle
  } = useOrganizationPage({
    type,
    code,
    isDetailPage: true
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
        parent={{ type, code }}
      />
    );
  }, [
    stats,
    toggleOrgExpanded,
    handleMemberAdded,
    handleOrganizationUpdated,
    handleMemberAddError,
    handleOrganizationDeleted,
    handleDeleteError,
    type,
    code
  ]);


  console.log('OrganizationsDetailPage', organizations, type, code);
  return (
    <OrganizationPageLayout
      title={getPageTitle()}
      subtitle={t('organizations:subtitle')}
      stats={stats}
      loading={loading}
      error={error}
      onRetry={fetchData}
      showDropdownButton={true}
      importConfig={importConfig}
      dropdownLabel={t('organizations:addButton.dropdown')}
      toasts={toasts
        .filter(toast => toast.type === 'error' || toast.type === 'success' || toast.type === 'info')
        .map(({ type, ...rest }) => ({
          ...rest,
          type: type as 'error' | 'success' | 'info'
        }))
      }
      onCloseToast={hideToast}
    >
      <OrganizationTreeContainer
        isEmpty={organizations.length === 0}
      >
        {organizations.map(org => renderOrganization(org))}
      </OrganizationTreeContainer>


    </OrganizationPageLayout>
  );
};

export default OrganizationsDetailPage;