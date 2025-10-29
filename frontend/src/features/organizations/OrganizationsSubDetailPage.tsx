import React, { useCallback, useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Organization } from '../../shared/types/organization';
import OrganizationTreeItem from './components/OrganizationTreeItem';
import OrganizationPageLayout from './components/OrganizationPageLayout';
import { useOrganizationPage } from './hooks/useOrganizationPage';
import { shouldShowUserList, getDisplayOrganization, sortOrganizationsByMembership } from './utils/organizationUtils';
import { OrganizationUserList } from './components/OrganizationUserList';
import { useMemberStatsCalculation } from './hooks/useMemberStatsCalculation';
import { useRefreshHandlers } from './hooks/useRefreshHandlers';
import { useImportModal } from './hooks/useImportModal';
import { usePageConfig } from './hooks/usePageConfig';
import { useBreadcrumbJSX } from './hooks/useBreadcrumbJSX';
import { useAuth } from '../auth/context/AuthContext';

const OrganizationsSubDetailPage: React.FC = () => {
    const { t } = useTranslation(['organizations', 'common']);
    const { parentType, parentCode, type, code } = useParams<{
        parentType: string;
        parentCode: string;
        type: string;
        code: string;
    }>();
    const auth = useAuth();

    // Get page configuration
    const { level } = usePageConfig({
        type,
        code,
        parentType,
        parentCode
    });

    // State to trigger memberStats refresh
    const [memberStatsRefreshKey, setMemberStatsRefreshKey] = useState(0); const { organizations,
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
        type: parentType,
        code: parentCode,
        isSubDetailPage: true
    });

    const filteredOrg = useMemo(() => {
        if (!type || !code || !organizations.length) return [];

        const filtered = organizations[0]?.children?.filter(child => {
            return child.type === type && child.code === code;
        }) || [];

        return filtered;
    }, [organizations, type, code]);

    // Helper function to check if user is in organization
    const isUserInOrganization = useCallback((organizationId: string): boolean => {
        if (!auth.auth.user?.organizations) return false;
        return auth.auth.user.organizations.some((userOrg: any) =>
            userOrg.organizationId === organizationId && userOrg.isActive
        );
    }, [auth.auth.user?.organizations]);

    // Sort filtered organizations to prioritize user's membership
    const sortedFilteredOrg = useMemo(() => {
        return sortOrganizationsByMembership(filteredOrg, isUserInOrganization);
    }, [filteredOrg, isUserInOrganization]);

    const showUserList = useMemo(() =>
        shouldShowUserList(sortedFilteredOrg, level),
        [sortedFilteredOrg, level]
    );

    const displayOrganization = useMemo(() =>
        getDisplayOrganization(sortedFilteredOrg),
        [sortedFilteredOrg]
    );

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
    });    // Use breadcrumb JSX for better navigation
    const breadcrumbTitle = useBreadcrumbJSX({
        type,
        code,
        parentType,
        parentCode,
        organizations,
        displayOrganization,
        isDetailPage: false,
        isSubDetailPage: true,
        isMembersPage: false
    }); const renderOrganization = useCallback((org: Organization, level: number = 0) => {
        const parentParams = {
            type: window.location.pathname.split('/')[2],
            code: window.location.pathname.split('/')[3]
        };

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
                parent={parentParams}

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
    ]); const renderContent = () => {
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
        stats={stats}
        memberStats={showUserList ? {
            ...memberStats,
            loading: memberStatsLoading,
        } : undefined} showMemberStats={showUserList}
        loading={loading}
        error={error}
        onRetry={handleRefreshAll} // Use combined refresh for retry
        showDropdownButton={true}
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