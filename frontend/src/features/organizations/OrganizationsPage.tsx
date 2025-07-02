import React, { useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Organization } from '../../shared/types/organization';
import OrganizationTreeItem from './components/OrganizationTreeItem';
import OrganizationTreeContainer from './components/OrganizationTreeContainer';
import OrganizationPageLayout from './components/OrganizationPageLayout';
import CreateOrganizationModal, { CreateOrganizationData } from './components/CreateOrganizationModal';
import { useOrganizationPage } from './hooks/useOrganizationPage';

const Organizations: React.FC = () => {
  const { t } = useTranslation(['organizations', 'common']);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isCreating, setIsCreating] = useState(false);

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
  } = useOrganizationPage();

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

  const handleCreateOrganization = async (data: CreateOrganizationData) => {
    setIsCreating(true);
    try {
      // TODO: Call API to create organization
      console.log('Creating organization:', data);
      
      // Placeholder for API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Refresh data after creation
      await fetchData();
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <OrganizationPageLayout
      title={getPageTitle()}
      subtitle={t('organizations:subtitle')}
      stats={stats}
      loading={loading}
      error={error}
      onRetry={fetchData}
      showCreateButton={true}
      onCreateClick={() => setIsCreateModalOpen(true)}
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

      {/* Create Organization Modal */}
      <CreateOrganizationModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onSave={handleCreateOrganization}
        loading={isCreating}
        level={1}
      />
    </OrganizationPageLayout>
  );
};

export default Organizations;