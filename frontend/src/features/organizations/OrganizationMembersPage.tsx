import React, { useMemo, useState, useCallback, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ChevronRight } from 'lucide-react';
import OrganizationPageLayout from './components/OrganizationPageLayout';
import { useOrganizationPage } from './hooks/useOrganizationPage';
import { OrganizationUserList } from './components/OrganizationUserList';
import { organizationService } from '../../shared/services/organizationService';

const OrganizationMembersPage: React.FC = () => {
    const { t } = useTranslation(['organizations', 'common']);
    const { type, code, parentType, parentCode } = useParams<{
        type: string;
        code: string;
        parentType?: string;
        parentCode?: string;
    }>();    // Determine if this is a sub-detail page (has parent params)
    const isSubDetailPage = Boolean(parentType && parentCode);

    // State to trigger memberStats refresh
    const [refreshKey, setRefreshKey] = useState(0); const {
        organizations,
        stats,
        loading,
        error,
        fetchData,
        handleBulkDeleteSuccess,
        handleBulkDeleteError,
        toasts,
        hideToast
    } = useOrganizationPage({
        type: isSubDetailPage ? parentType : type,
        code: isSubDetailPage ? parentCode : code,
        isDetailPage: !isSubDetailPage,
        isSubDetailPage: isSubDetailPage
    });

    const displayOrganization = useMemo(() => {
        if (isSubDetailPage) {
            // Find the specific child organization
            const parentOrg = organizations[0];
            if (parentOrg && parentOrg.children) {
                return parentOrg.children.find(child =>
                    child.type === type && child.code === code
                ) || null;
            }
            return null;
        } else {
            // Direct organization
            return organizations.length > 0 ? organizations[0] : null;
        }
    }, [organizations, isSubDetailPage, type, code]);    // Custom memberStats with refresh capability
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
    }, [loadMemberStats, refreshKey]);

    // Create combined refresh function that refreshes both data and stats  
    const handleRefreshAll = useCallback(async () => {
        await fetchData(); // Refresh main data
        // Force memberStats refresh by incrementing key
        setRefreshKey(prev => prev + 1);
    }, [fetchData]);// Create page title similar to useOrganizationPage's getPageTitle
    const getPageTitle = () => {
        const baseTitle = t('organizations:title');
        const membersText = t('organizations:members.title', { defaultValue: 'Danh sách thành viên' });

        if (isSubDetailPage) {
            // For sub-detail: clickable breadcrumb
            const parentOrg = organizations[0];
            const childOrgName = displayOrganization?.name || '';

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
                        to={`/organizations/${parentType}/${parentCode}`}
                        className="text-gray-900 hover:text-gray-700 dark:text-white dark:hover:text-gray-300 hover:underline transition-colors"
                    >
                        {parentOrg?.name || ''}
                    </Link>
                    <ChevronRight className="w-4 h-4 text-gray-400" />
                    <Link
                        to={`/organizations/${parentType}/${parentCode}/${type}/${code}`}
                        className="text-gray-900 hover:text-gray-700 dark:text-white dark:hover:text-gray-300 hover:underline transition-colors"
                    >
                        {childOrgName}
                    </Link>
                    <ChevronRight className="w-4 h-4 text-gray-400" />
                    <span className="text-gray-900 dark:text-white">{membersText}</span>
                </div>
            );
        } else if (displayOrganization) {
            // For detail: clickable breadcrumb
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
                        to={`/organizations/${type}/${code}`}
                        className="text-gray-900 hover:text-gray-700 dark:text-white dark:hover:text-gray-300 hover:underline transition-colors"
                    >
                        {displayOrganization.name}
                    </Link>
                    <ChevronRight className="w-4 h-4 text-gray-400" />
                    <span className="text-gray-900 dark:text-white">{membersText}</span>
                </div>
            );
        }

        return `${baseTitle} - ${membersText}`;
    };

    // Create wrapper functions to handle the message format
    const handleShowSuccess = (message: string) => {
        handleBulkDeleteSuccess(message);
    };

    const handleShowError = (message: string) => {
        handleBulkDeleteError(message);
    }; const renderContent = () => {
        if (displayOrganization) {
            return (
                <OrganizationUserList
                    organization={displayOrganization}
                    onRefresh={handleRefreshAll}
                    onShowSuccess={handleShowSuccess}
                    onShowError={handleShowError}
                />
            );
        }

        return (
            <div className="text-center py-12">
                <p className="text-gray-500 dark:text-gray-400">
                    {t('organizations:members.notFound', { defaultValue: 'Không tìm thấy tổ chức' })}
                </p>
            </div>
        );
    }; return (
        <OrganizationPageLayout
            title={getPageTitle()}
            subtitle={t('organizations:members.subtitle', { defaultValue: 'Quản lý danh sách thành viên' })}
            stats={stats}
            memberStats={{
                ...memberStats,
                loading: memberStatsLoading,
            }}
            showMemberStats={true}
            loading={loading}
            error={error} onRetry={handleRefreshAll}
            showDropdownButton={false}
            toasts={toasts
                .filter(toast => toast.type === 'error' || toast.type === 'success' || toast.type === 'info')
                .map(({ type, ...rest }) => ({
                    ...rest,
                    type: type as 'error' | 'success' | 'info'
                }))
            }
            onCloseToast={hideToast}
            level={isSubDetailPage ? 3 : 2}
            type={type}
            onRefreshData={handleRefreshAll}
            onShowSuccess={handleBulkDeleteSuccess}
            onShowError={handleBulkDeleteError}
        >
            {renderContent()}
        </OrganizationPageLayout>
    );
};

export default OrganizationMembersPage;
