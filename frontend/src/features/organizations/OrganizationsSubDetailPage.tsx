import React, { useCallback, useMemo, useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Organization } from '../../shared/types/organization';
import OrganizationTreeItem from './components/OrganizationTreeItem';
import OrganizationPageLayout from './components/OrganizationPageLayout';
import { useOrganizationPage } from './hooks/useOrganizationPage';
import { shouldShowUserList, getDisplayOrganization } from './utils/organizationUtils';
import { OrganizationUserList } from './components/OrganizationUserList';
import { useOrganizationImport } from './hooks/useOrganizationImport';
import { organizationService } from '../../shared/services/organizationService';
import { useBreadcrumbJSX } from './hooks/useBreadcrumbJSX';

const OrganizationsSubDetailPage: React.FC = () => {
    const { t } = useTranslation(['organizations', 'common']);
    const { parentType, parentCode, type, code } = useParams<{
        parentType: string;
        parentCode: string;
        type: string;
        code: string;
    }>();
    const level = 3;

    // State to trigger memberStats refresh
    const [memberStatsRefreshKey, setMemberStatsRefreshKey] = useState(0); const {
        organizations,
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
        hideToast } = useOrganizationPage({
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

    const showUserList = useMemo(() =>
        shouldShowUserList(filteredOrg, level),
        [filteredOrg, level]
    );

    const displayOrganization = useMemo(() =>
        getDisplayOrganization(filteredOrg),
        [filteredOrg]
    );    // ✅ Use useOrganizationImport hook for sub-detail
    const { importConfig, setIsImportModalOpen } = useOrganizationImport({
        level,
        organizationId: displayOrganization?.id,
        onSuccess: () => {
            // Don't refresh here, just show success message
            console.log('Import completed successfully');
        },
        onError: (error) => {
            console.error('Import error:', error.message);
        }
    });

    // ✅ Use breadcrumb JSX for better navigation
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
    });

    // ✅ Custom memberStats with refresh capability
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
        if (!displayOrganization) return;

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
    }, [displayOrganization]);

    // Load stats when displayOrganization or refreshKey changes
    useEffect(() => {
        loadMemberStats();
    }, [loadMemberStats, memberStatsRefreshKey]);

    // ✅ Update combined refresh function for both data and member stats
    const handleRefreshAll = useCallback(async () => {
        await fetchData(); // Refresh main data
        // Force memberStats refresh by incrementing key
        setMemberStatsRefreshKey(prev => prev + 1);
    }, [fetchData]);    // ✅ Update modal close handler to use combined refresh
    const handleImportModalClose = useCallback(() => {
        setIsImportModalOpen(false);
        // Refresh data when modal closes (after import is done)
        handleRefreshAll();
    }, [setIsImportModalOpen, handleRefreshAll]);

    // ✅ Create wrapper functions to handle success/error messages with delayed refresh
    const handleShowSuccess = useCallback((message: string) => {
        handleBulkDeleteSuccess(message);
        // Delay refresh to allow toast to be visible
        setTimeout(() => {
            handleRefreshAll();
        }, 1500); // 1.5 seconds delay
    }, [handleBulkDeleteSuccess, handleRefreshAll]);

    const handleShowError = useCallback((message: string) => {
        handleBulkDeleteError(message);
    }, [handleBulkDeleteError]);

    const renderOrganization = useCallback((org: Organization, level: number = 0) => {
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
            }))
        } onCloseToast={hideToast}
        level={level}
        onShowSuccess={handleBulkDeleteSuccess}
        onShowError={handleBulkDeleteError}
        onImportModalClose={handleImportModalClose} // Add import modal close handler
        organizationId={displayOrganization?.id}
        organizationName={displayOrganization?.name}
    >

        {renderContent()}

    </OrganizationPageLayout>
    );
};

export default OrganizationsSubDetailPage;