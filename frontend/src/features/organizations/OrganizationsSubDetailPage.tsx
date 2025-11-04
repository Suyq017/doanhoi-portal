import React, { useCallback, useMemo, useState } from 'react';
import { useParams, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Organization } from '../../shared/types/organization';
import OrganizationTreeItem from './components/OrganizationTreeItem';
import OrganizationPageLayout from './components/OrganizationPageLayout';
import { useOrganizationPage } from './hooks/useOrganizationPage';
import { OrganizationUserList } from './components/OrganizationUserList';
import { useMemberStatsCalculation } from './hooks/useMemberStatsCalculation';
import { useRefreshHandlers } from './hooks/useRefreshHandlers';
import { useImportModal } from './hooks/useImportModal';
import { usePageConfig } from './hooks/usePageConfig';
import { useBreadcrumbJSX } from './hooks/useBreadcrumbJSX';
import { EMPTY_ORGANIZATION_STATS } from '../../shared/hooks/queries';

const OrganizationsSubDetailPage: React.FC = () => {
    const { t } = useTranslation(['organizations', 'common']);
    const { type, code } = useParams<{
        type: string;
        code: string;
    }>();
    const location = useLocation();

    // Check if URL hash is #members
    const forceShowMembers = location.hash === '#members';

    // Get page configuration
    const { level } = usePageConfig({
        type,
        code
    });

    // State to trigger memberStats refresh
    const [memberStatsRefreshKey, setMemberStatsRefreshKey] = useState(0);

    // ✅ SIMPLIFIED: Direct fetch by type/code (no parent!)
    const { organizations,
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
        showError
    } = useOrganizationPage({
        type,      // ← Current org type/code (not parent!)
        code,      // ← Direct load!
        isSubDetailPage: true
    });

    /**
     * ❌ REMOVED: filteredOrg useMemo - No filter needed!
     * Organization is already correct from direct load
     */
    // const filteredOrg = useMemo(() => { ... }, [organizations, type, code]);

    /**
     * ✅ SIMPLIFIED: displayOrganization is just organizations[0]
     */
    const displayOrganization = organizations[0];

    /**
     * ✅ SIMPLIFIED: Show user list if forced or no children
     * No need for sortedFilteredOrg anymore
     */
    const showUserList = useMemo(() => {
        const result = forceShowMembers && displayOrganization
            ? true
            : (!organizations[0]?.children || organizations[0].children.length === 0);

        console.log('🔍 SubDetail Page - Show User List:', {
            forceShowMembers,
            hash: location.hash,
            hasDisplayOrg: !!displayOrganization,
            showUserList: result,
            organizationsLength: organizations.length
        });

        return result;
    }, [forceShowMembers, displayOrganization, organizations, location.hash]);

    // Setup refresh handlers
    const {
        handleRefreshAll,
        handleShowSuccess,
        handleShowError
    } = useRefreshHandlers({
        fetchData,
        handleBulkDeleteSuccess,
        handleBulkDeleteError
    });

    // Success handler for organization creation
    const handleCreateSuccess = useCallback((message: string) => {
        showSuccess(message);
    }, [showSuccess]);

    // Member statistics (only when showing user list)
    const { memberStats, loading: memberStatsLoading } = useMemberStatsCalculation(
        showUserList ? displayOrganization : null,
        memberStatsRefreshKey
    );

    // Import modal
    const { importConfig, handleImportModalClose } = useImportModal({
        level,
        organizationId: displayOrganization?.id,
        onRefresh: () => {
            setMemberStatsRefreshKey(prev => prev + 1);
            return fetchData();
        }
    });

    // Use breadcrumb JSX for better navigation
    const breadcrumbTitle = useBreadcrumbJSX({
        type,
        code,
        organizations,
        displayOrganization,
        isDetailPage: false,
        isSubDetailPage: true,
        isMembersPage: showUserList
    });

    const renderOrganization = useCallback((org: Organization, _level: number = 0, parentId?: string) => {
        const parentParams = {
            type: window.location.pathname.split('/')[2],
            code: window.location.pathname.split('/')[3]
        };

        return (
            <OrganizationTreeItem
                key={org.id}
                org={org}
                level={_level}
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
    }, [
        stats,
        toggleOrgExpanded,
        handleMemberAdded,
        handleOrganizationUpdated,
        handleMemberAddError,
        handleOrganizationDeleted,
        handleDeleteError
    ]);

    const renderContent = () => {
        // If forceShowMembers is true but we don't have org data, show loading or error
        if (forceShowMembers && !displayOrganization) {
            if (loading) {
                return <div className="text-center py-4">{t('common:loading')}</div>;
            }
            return (
                <div className="text-center py-4 text-gray-500">
                    {t('organizations:no_organization_found')}
                </div>
            );
        }

        if (showUserList && displayOrganization) {
            return (
                <OrganizationUserList
                    organization={displayOrganization}
                    onRefresh={fetchData} // Use regular fetchData for normal refresh
                    onShowSuccess={handleShowSuccess} // Handle success with delayed refresh
                    onShowError={handleShowError} // Handle error messages
                />
            );
        }

        return null;
    };


    return (<OrganizationPageLayout
        title={breadcrumbTitle}
        subtitle={t('organizations:subtitle')}
        stats={stats || EMPTY_ORGANIZATION_STATS}
        memberStats={showUserList ? {
            ...memberStats,
            loading: memberStatsLoading,
        } : undefined} showMemberStats={showUserList}
        loading={loading}
        error={error || null}
        onRetry={handleRefreshAll} // Use combined refresh for retry
        showDropdownButton={!showUserList}
        importConfig={importConfig}
        dropdownLabel={t('organizations:addButton.dropdown')}
        toasts={toasts
            .filter(toast => toast.type === 'error' || toast.type === 'success' || toast.type === 'info')
            .map(({ type, ...rest }) => ({
                ...rest,
                type: type as 'error' | 'success' | 'info'
            }))} onCloseToast={hideToast}
        level={level}
        onRefreshData={fetchData}
        onShowSuccess={handleCreateSuccess}
        onShowError={showError}
        onImportModalClose={handleImportModalClose} // Add import modal close handler
        organizationId={displayOrganization?.id}
        organizationName={displayOrganization?.name}
    >

        {renderContent()}

    </OrganizationPageLayout>
    );
};

export default OrganizationsSubDetailPage;