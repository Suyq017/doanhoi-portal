import React, { useMemo, useState, useCallback, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import OrganizationPageLayout from './components/OrganizationPageLayout';
import { useOrganizationPage } from './hooks/useOrganizationPage';
import { OrganizationUserList } from './components/OrganizationUserList';
import { organizationService } from '../../shared/services/organizationService';
import { useOrganizationImport } from './hooks/useOrganizationImport';
import { useBreadcrumbJSX } from './hooks/useBreadcrumbJSX';

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
    }, [organizations, isSubDetailPage, type, code]);

    // Custom memberStats with refresh capability
    const [memberStats, setMemberStats] = useState({
        doanVienCount: 0,
        hoiVienCount: 0,
        bothMemberCount: 0,
        nonMemberCount: 0,
        totalMembers: 0,
    });
    const [memberStatsLoading, setMemberStatsLoading] = useState(false);

    // Load memberStats function - get all members for stats calculation
    const loadMemberStats = useCallback(async () => {
        if (!displayOrganization) return;

        try {
            setMemberStatsLoading(true);
            // Get first page to know total count
            const firstPageResponse = await organizationService.getOrganizationMembers(displayOrganization.id, 1, 10);
            const totalMembers = firstPageResponse.total;
            
            // If we have many members, we need to fetch all pages for accurate stats
            let allMembers = [...firstPageResponse.members];
            const totalPages = firstPageResponse.totalPages;
            
            // Fetch remaining pages if needed
            if (totalPages > 1) {
                const promises = [];
                for (let page = 2; page <= totalPages; page++) {
                    promises.push(organizationService.getOrganizationMembers(displayOrganization.id, page, 10));
                }
                const additionalResponses = await Promise.all(promises);
                additionalResponses.forEach(response => {
                    allMembers.push(...response.members);
                });
            }

            let doanVienCount = 0;
            let hoiVienCount = 0;
            let bothMemberCount = 0;
            let nonMemberCount = 0;

            allMembers.forEach(member => {
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
                totalMembers,
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
    }, [fetchData]);

    // ✅ Add import config for member page
    const { importConfig, setIsImportModalOpen } = useOrganizationImport({
        level: isSubDetailPage ? 3 : 2,
        organizationId: displayOrganization?.id,
        onSuccess: () => {
            // Don't refresh here, just show success message
            console.log('Import completed successfully');
        },
        onError: (error) => {
            console.error('Import error:', error.message);
        }
    });    // ✅ Handle modal close with data refresh
    const handleImportModalClose = useCallback(() => {
        setIsImportModalOpen(false);
        // Refresh data when modal closes (after import is done)
        handleRefreshAll();
    }, [setIsImportModalOpen, handleRefreshAll]);    // ✅ Use breadcrumb JSX for better navigation  
    const breadcrumbTitle = useBreadcrumbJSX({
        type,
        code,
        parentType,
        parentCode,
        organizations,
        displayOrganization,
        isDetailPage: !isSubDetailPage,
        isSubDetailPage,
        isMembersPage: true
    });// Create wrapper functions to handle the message format
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
    const renderContent = () => {
        if (displayOrganization) {
            return (
                <OrganizationUserList
                    organization={displayOrganization}
                    onRefresh={fetchData} // Use regular fetchData for normal refresh
                    onShowSuccess={handleShowSuccess} // Handle success with delayed refresh
                    onShowError={handleShowError} // Handle error messages
                />
            );
        }

        return (
            <div className="py-12 text-center">
                <p className="text-gray-500 dark:text-gray-400">
                    {t('organizations:members.notFound', { defaultValue: 'Không tìm thấy tổ chức' })}
                </p>
            </div>
        );
    }; return (
        <OrganizationPageLayout title={breadcrumbTitle}
            subtitle={t('organizations:members.subtitle', { defaultValue: 'Quản lý danh sách thành viên' })}
            stats={stats}
            memberStats={{
                ...memberStats,
                loading: memberStatsLoading,
            }}
            showMemberStats={true}
            loading={loading} error={error} onRetry={handleRefreshAll}
            showDropdownButton={true} // Enable dropdown for import
            importConfig={importConfig} // Add import config
            toasts={toasts
                .filter(toast => toast.type === 'error' || toast.type === 'success' || toast.type === 'info')
                .map(({ type, ...rest }) => ({
                    ...rest,
                    type: type as 'error' | 'success' | 'info'
                }))
            }
            onCloseToast={hideToast}
            level={isSubDetailPage ? 3 : 2}
            type={type} onRefreshData={handleRefreshAll}
            onShowSuccess={handleBulkDeleteSuccess}
            onShowError={handleBulkDeleteError}
            onImportModalClose={handleImportModalClose} // Add import modal close handler
        >
            {renderContent()}
        </OrganizationPageLayout>
    );
};

export default OrganizationMembersPage;
