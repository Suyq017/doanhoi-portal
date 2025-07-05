import React, { useCallback, useMemo, useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ChevronRight } from 'lucide-react';
import { Organization } from '../../shared/types/organization';
import OrganizationTreeItem from './components/OrganizationTreeItem';
import OrganizationPageLayout from './components/OrganizationPageLayout';
import { useOrganizationPage } from './hooks/useOrganizationPage';
import { createOrganizationImportConfig, shouldShowUserList, getDisplayOrganization } from './utils/organizationUtils';
import { OrganizationUserList } from './components/OrganizationUserList';
import { organizationService } from '../../shared/services/organizationService';

const OrganizationsSubDetailPage: React.FC = () => {
    const { t } = useTranslation(['organizations', 'common']);
    const { type, code } = useParams<{ type: string; code: string }>();

    const level = 3;

    // State to trigger memberStats refresh
    const [refreshKey, setRefreshKey] = useState(0); const {
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
        handleBulkDeleteSuccess,
        handleBulkDeleteError,
        toasts,
        hideToast,
        getPageTitle
    } = useOrganizationPage({
        type,
        code,
        isSubDetailPage: true
    });
    const importConfig = createOrganizationImportConfig(3);
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
    ); const currentOrgName = useMemo(() => {
        return filteredOrg[0]?.name || '';
    }, [filteredOrg]);

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
        if (!showUserList || !displayOrganization) return;

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
    }, [showUserList, displayOrganization]);

    // Load stats when displayOrganization or refreshKey changes
    useEffect(() => {
        loadMemberStats();
    }, [loadMemberStats, refreshKey]);

    // Create combined refresh function that refreshes both data and stats  
    const handleRefreshAll = useCallback(async () => {
        await fetchData(); // Refresh main data
        setRefreshKey(prev => prev + 1); // Trigger memberStats refresh
    }, [fetchData]);

    // Create clickable breadcrumb title for sub-detail page
    const getBreadcrumbTitle = () => {
        const baseTitle = t('organizations:title');
        const parentOrg = organizations[0];

        if (parentOrg && displayOrganization) {
            return (
                <div className="flex items-center space-x-2">
                    <Link
                        to="/organizations"
                        className="text-gray-900 hover:text-gray-700 dark:text-white dark:hover:text-gray-300 hover:underline transition-colors"
                    >
                        {baseTitle}
                    </Link>
                    <ChevronRight className="w-4 h-4 text-gray-400" />
                    <Link
                        to={`/organizations/${window.location.pathname.split('/')[2]}/${window.location.pathname.split('/')[3]}`}
                        className="text-gray-900 hover:text-gray-700 dark:text-white dark:hover:text-gray-300 hover:underline transition-colors"
                    >
                        {parentOrg.name}
                    </Link>
                    <ChevronRight className="w-4 h-4 text-gray-400" />
                    <span className="text-gray-900 dark:text-white">{displayOrganization.name}</span>
                </div>
            );
        }

        return getPageTitle(currentOrgName);
    };

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

        return null;
    }; return (
        <OrganizationPageLayout
            title={getBreadcrumbTitle()}
            subtitle={t('organizations:subtitle')}
            stats={stats}
            memberStats={showUserList ? {
                ...memberStats,
                loading: memberStatsLoading,
            } : undefined}
            showMemberStats={showUserList}
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
            onCloseToast={hideToast}
            level={level}
            onRefreshData={handleRefreshAll}
            onShowSuccess={handleBulkDeleteSuccess}
            onShowError={handleBulkDeleteError}
        >

            {renderContent()}

        </OrganizationPageLayout>
    );
};

export default OrganizationsSubDetailPage;