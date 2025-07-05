import React, { useCallback, useMemo, useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ChevronRight } from 'lucide-react';
import { Organization } from '../../shared/types/organization';
import OrganizationTreeItem from './components/OrganizationTreeItem';
import OrganizationTreeContainer from './components/OrganizationTreeContainer';
import OrganizationPageLayout from './components/OrganizationPageLayout';
import { createOrganizationImportConfig } from './utils/organizationUtils';
import { useOrganizationPage } from './hooks/useOrganizationPage';
import { OrganizationUserList } from './components/OrganizationUserList';
import { organizationService } from '../../shared/services/organizationService';

const OrganizationsDetailPage: React.FC = () => {
  const { t } = useTranslation(['organizations', 'common']);
  const { type, code } = useParams<{ type: string; code: string }>();
  const level = 2;

  // State to trigger memberStats refresh
  const [refreshKey, setRefreshKey] = useState(0);

  const {
    organizations,
    stats,
    loading,
    error,
    toggleOrgExpanded,
    fetchData, handleMemberAdded,
    handleMemberAddError,
    handleOrganizationUpdated,
    handleOrganizationDeleted,
    handleDeleteError,
    handleBulkDeleteSuccess,
    handleBulkDeleteError,
    handleOrganizationCreated,
    handleOrganizationCreateError,
    toasts,
    hideToast,
    getPageTitle
  } = useOrganizationPage({
    type,
    code,
    isDetailPage: true
  });
  const importConfig = createOrganizationImportConfig(2, organizations[0]?.id);

  // Check if should show user list (no children and not restricted org types)
  const shouldShowMembers = useMemo(() => {
    if (!organizations.length) return false;
    const org = organizations[0];

    // Don't show for lien_chi_hoi and doan_co_so
    if (org.type === 'lien_chi_hoi' || org.type === 'doan_co_so') {
      return false;
    }

    // Show if no children or all children are empty
    return !org.children || org.children.length === 0;
  }, [organizations]);
  const displayOrganization = useMemo(() => {
    return organizations.length > 0 ? organizations[0] : null;
  }, [organizations]);

  // Custom memberStats with refresh capability  
  const [memberStats, setMemberStats] = useState({
    doanVienCount: 0,
    hoiVienCount: 0,
    bothMemberCount: 0,
    nonMemberCount: 0,
    totalMembers: 0,
  });
  const [memberStatsLoading, setMemberStatsLoading] = useState(false);

  // Load memberStats function
  const loadMemberStats = useCallback(async () => {
    if (!shouldShowMembers || !displayOrganization) return;

    try {
      setMemberStatsLoading(true);
      const members = await organizationService.getOrganizationMembers(displayOrganization.id);

      let doanVienCount = 0;
      let hoiVienCount = 0;
      let bothMemberCount = 0;
      let nonMemberCount = 0;

      members.forEach(member => {
        const user = member.user;
        const isDoanVien = user.membershipStatus === 'doan_vien' || user.membershipStatus === 'both';
        const isHoiVien = user.membershipStatus === 'hoi_vien' || user.membershipStatus === 'both';

        if (user.membershipStatus === 'both') {
          bothMemberCount++;
        } else if (isDoanVien) {
          doanVienCount++;
        } else if (isHoiVien) {
          hoiVienCount++;
        } else {
          nonMemberCount++;
        }
      });

      setMemberStats({
        doanVienCount,
        hoiVienCount,
        bothMemberCount,
        nonMemberCount,
        totalMembers: members.length,
      });
    } catch (err) {
      console.error('Error loading member stats:', err);
    } finally {
      setMemberStatsLoading(false);
    }
  }, [shouldShowMembers, displayOrganization]);

  // Load stats when displayOrganization or refreshKey changes
  useEffect(() => {
    loadMemberStats();
  }, [loadMemberStats, refreshKey]);

  // Create combined refresh function that refreshes both data and stats  
  const handleRefreshAll = useCallback(async () => {
    await fetchData(); // Refresh main data
    setRefreshKey(prev => prev + 1); // Trigger memberStats refresh
  }, [fetchData]);
  // Create custom stats based on organization type
  const getCustomStats = useMemo(() => {
    if (!displayOrganization) return stats;

    const orgType = displayOrganization.type;

    if (orgType === 'doan_co_so') {
      // For doan_co_so: count only doan organizations within this doan_co_so
      const countDoanChildren = (org: Organization): number => {
        if (!org.children) return 0;
        return org.children.filter(child =>
          child.type === 'chi_doan' || child.type === 'doan_co_so'
        ).length;
      };

      const doanChildrenCount = countDoanChildren(displayOrganization);

      return {
        ...stats,
        doanStats: { ...stats.doanStats, total: doanChildrenCount },
        hoiStats: { ...stats.hoiStats, total: 0 }, // Hide hoi stats
        clbStats: { ...stats.clbStats, total: 0 }, // Hide clb stats
        totalMembers: displayOrganization.memberCount || 0 // Use org's member count
      };
    } else if (orgType === 'lien_chi_hoi') {
      // For lien_chi_hoi: count only hoi + clb organizations within this lien_chi_hoi
      const countHoiClbChildren = (org: Organization): { hoiCount: number; clbCount: number } => {
        if (!org.children) return { hoiCount: 0, clbCount: 0 };

        const hoiCount = org.children.filter(child =>
          child.type === 'chi_hoi' || child.type === 'lien_chi_hoi'
        ).length;

        const clbCount = org.children.filter(child =>
          child.type === 'clb_khoa' || child.type === 'clb_truong'
        ).length;

        return { hoiCount, clbCount };
      };

      const { hoiCount, clbCount } = countHoiClbChildren(displayOrganization);

      return {
        ...stats,
        doanStats: { ...stats.doanStats, total: 0 }, // Hide doan stats
        hoiStats: { ...stats.hoiStats, total: hoiCount },
        clbStats: { ...stats.clbStats, total: clbCount },
        totalMembers: displayOrganization.memberCount || 0 // Use org's member count
      };
    }

    return stats;
  }, [stats, displayOrganization]);

  // Create clickable breadcrumb title
  const getBreadcrumbTitle = () => {
    const baseTitle = t('organizations:title');

    if (displayOrganization) {
      return (
        <div className="flex items-center space-x-2">
          <Link
            to="/organizations"
            className="text-gray-900 hover:text-gray-700 dark:text-white dark:hover:text-gray-300 hover:underline transition-colors"
          >
            {baseTitle}
          </Link>
          <ChevronRight className="w-4 h-4 text-gray-400" />
          <span className="text-gray-900 dark:text-white">{displayOrganization.name}</span>
        </div>
      );
    }

    return getPageTitle();
  };
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
  const renderContent = () => {
    // If should show members, render user list
    if (shouldShowMembers && displayOrganization) {
      // Create wrapper functions to handle the message format
      const handleShowSuccess = (message: string) => {
        handleBulkDeleteSuccess(message);
      };

      const handleShowError = (message: string) => {
        handleBulkDeleteError(message);
      }; return (
        <OrganizationUserList
          organization={displayOrganization}
          onRefresh={handleRefreshAll}
          onShowSuccess={handleShowSuccess}
          onShowError={handleShowError}
        />
      );
    }

    // Otherwise render organization tree
    return (
      <OrganizationTreeContainer isEmpty={organizations.length === 0}>
        {organizations.map(org => renderOrganization(org))}
      </OrganizationTreeContainer>
    );
  };
  return (<OrganizationPageLayout
    organizations={organizations}
    title={getBreadcrumbTitle()}
    subtitle={t('organizations:subtitle')}
    stats={getCustomStats}
    memberStats={shouldShowMembers ? {
      ...memberStats,
      loading: memberStatsLoading,
    } : undefined}
    showMemberStats={shouldShowMembers}
    loading={loading}
    error={error} onRetry={handleRefreshAll}
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
    onCloseToast={hideToast} level={level}
    type={type}
    onRefreshData={handleOrganizationCreated}
    onShowSuccess={handleOrganizationCreated}
    onShowError={handleOrganizationCreateError}
  >
    {renderContent()}
  </OrganizationPageLayout>
  );
};

export default OrganizationsDetailPage;