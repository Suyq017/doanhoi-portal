import React from 'react';
import { useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import OrganizationPageLayout from './components/OrganizationPageLayout';
import { useOrganizationPage } from './hooks/useOrganizationPage';
import { OrganizationUserList } from './components/OrganizationUserList';
import { useDisplayOrganization } from './hooks/useDisplayOrganization';
import { useMemberStatsCalculation } from './hooks/useMemberStatsCalculation';
import { useRefreshHandlers } from './hooks/useRefreshHandlers';
import { useImportModal } from './hooks/useImportModal';
import { usePageConfig } from './hooks/usePageConfig';
import { useBreadcrumbJSX } from './hooks/useBreadcrumbJSX';

const OrganizationMembersPage: React.FC = () => {
    const { t } = useTranslation(['organizations', 'common']);
    const { type, code, parentType, parentCode } = useParams<{
        type: string;
        code: string;
        parentType?: string;
        parentCode?: string;
    }>();

    // Get page configuration
    const { level, isSubDetailPage } = usePageConfig({
        type,
        code,
        parentType,
        parentCode
    });    // Organization page data
    const {
        organizations,
        stats,
        loading,
        error,
        fetchData,
        handleBulkDeleteSuccess,
        handleBulkDeleteError,
        toasts,
        hideToast,
        showSuccess,
        showError
    } = useOrganizationPage({
        type: isSubDetailPage ? parentType : type,
        code: isSubDetailPage ? parentCode : code,
        isDetailPage: !isSubDetailPage,
        isSubDetailPage: isSubDetailPage
    });

    // Get display organization
    const displayOrganization = useDisplayOrganization({
        organizations,
        type,
        code,
        parentType,
        parentCode,
        isSubDetailPage
    });    // Setup refresh handlers
    const {
        refreshKey,
        handleRefreshAll,
        handleShowSuccess,
        handleShowError
    } = useRefreshHandlers({
        fetchData,
        handleBulkDeleteSuccess,
        handleBulkDeleteError
    });

    // Success handler for organization creation
    const handleCreateSuccess = React.useCallback((message: string) => {
        showSuccess(message);
    }, [showSuccess]);

    // Member statistics
    const { memberStats, loading: memberStatsLoading } = useMemberStatsCalculation(
        displayOrganization,
        refreshKey
    );

    // Import modal with client-side processing enabled for better performance
    const { importConfig, handleImportModalClose } = useImportModal({
        level,
        organizationId: displayOrganization?.id,
        onRefresh: handleRefreshAll,
        useClientSideProcessing: true // Enable fast backend validation with bulk queries
    });    // Breadcrumb JSX for better navigation  
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
    });

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
        <OrganizationPageLayout
            title={breadcrumbTitle}
            subtitle={t('organizations:members.subtitle', { defaultValue: 'Quản lý danh sách thành viên' })}
            stats={stats}
            memberStats={{
                ...memberStats,
                loading: memberStatsLoading,
            }}
            showMemberStats={true}
            loading={loading}
            error={error}
            onRetry={handleRefreshAll}
            showDropdownButton={true}
            hideMnualAddOption={true} // Hide manual add option on members page
            importConfig={importConfig}
            toasts={toasts
                .filter(toast => toast.type === 'error' || toast.type === 'success' || toast.type === 'info')
                .map(({ type, ...rest }) => ({
                    ...rest,
                    type: type as 'error' | 'success' | 'info'
                }))
            } onCloseToast={hideToast}
            level={level}
            type={type}
            onRefreshData={handleRefreshAll}
            onShowSuccess={handleCreateSuccess}
            onShowError={showError}
            onImportModalClose={handleImportModalClose}
        >
            {renderContent()}
        </OrganizationPageLayout>
    );
};

export default OrganizationMembersPage;
