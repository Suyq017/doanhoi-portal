import { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useOrganizationTree } from './useOrganizationTree';
import { useOrganizationStatsContext } from '../context/OrganizationStatsContext';
import { useToast } from '../../../shared';

interface UseOrganizationPageOptions {
    type?: string;
    code?: string;
    isDetailPage?: boolean;
    isSubDetailPage?: boolean;
}

export const useOrganizationPage = (options: UseOrganizationPageOptions = {}) => {
    const { type, code, isDetailPage = false, isSubDetailPage = false } = options;
    const { t } = useTranslation(['organizations', 'common']);
    const { toasts, hideToast, showSuccess, showError } = useToast();
    const [loading, setLoading] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);

    const {
        organizations,
        loading: loadingTree,
        error: treeError,
        fetchOrganizationTree,
        fetchAllLevel1Children,
        fetchOrganizationDetail,
        fetchOrganizationSubDetail,
        toggleOrgExpanded
    } = useOrganizationTree();

    const { stats, loading: loadingStats, error: statsError, fetchStats } = useOrganizationStatsContext();

    // Determine which fetch method to use
    const fetchData = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            if (isSubDetailPage && type && code) {
                // Case: SubDetailPage
                const parentParts = window.location.pathname.split('/');
                const parentType = parentParts[2];
                const parentCode = parentParts[3];
                const childType = parentParts[4];
                const childCode = parentParts[5];

                if (parentType && parentCode && childType && childCode) {
                    await fetchOrganizationSubDetail(parentType, parentCode);
                }
            } else if (isDetailPage && type && code) {
                // Case: DetailPage
                await fetchOrganizationDetail(type, code);
            } else {
                // Case: Main page
                const orgs = await fetchOrganizationTree();
                await fetchAllLevel1Children(orgs);
            }

            // Always fetch stats
            await fetchStats();
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Có lỗi xảy ra khi tải dữ liệu');
        } finally {
            setLoading(false);
        }
    }, [isDetailPage, isSubDetailPage, type, code]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);    // Handlers
    const handleMemberAdded = useCallback(async () => {
        showSuccess(t('common:messages.success.add'));
        // Small delay to allow toast to render before refresh
        setTimeout(async () => {
            await fetchStats();
            await fetchData();
        }, 150);
    }, [fetchStats, fetchData, showSuccess, t]);

    const handleMemberDelete = useCallback(async () => {
        showSuccess(t('common:messages.success.delete'));
        // Small delay to allow toast to render before refresh
        setTimeout(async () => {
            await fetchStats();
            await fetchData();
        }, 150);
    }, [fetchStats, fetchData, showSuccess, t]);

    const handleMemberAddError = useCallback((error: string) => {
        showError(error);
    }, [showError]);

    const handleOrganizationUpdated = useCallback(async () => {
        try {
            await fetchData();
            showSuccess(t('common:messages.success.update'));
        } catch (error) {
            showError(t('common:messages.error.update'));
        }
    }, [fetchData, showSuccess, showError, t]);

    const handleOrganizationDeleted = useCallback(async () => {
        try {
            await fetchData();
            showSuccess(t('common:messages.success.delete'));
        } catch (error) {
            showError(t('common:messages.error.delete'));
        }
    }, [fetchData, showSuccess, showError, t]); const handleDeleteError = useCallback((error: string) => {
        showError(error);
    }, [showError]); const handleBulkDeleteSuccess = useCallback((message: string) => {
        fetchStats();
        showSuccess(message);
    }, [fetchStats, showSuccess]); const handleBulkDeleteError = useCallback((error: string) => {
        showError(error);
    }, [showError]);

    const handleOrganizationCreated = useCallback(async (message?: string) => {
        showSuccess(message || t('organizations:messages.createSuccess'));
        // Small delay to allow toast to render before refresh
        setTimeout(async () => {
            await fetchStats();
            await fetchData();
        }, 150);
    }, [fetchStats, fetchData, showSuccess, t]);

    const handleOrganizationCreateError = useCallback((error: string) => {
        showError(error);
    }, [showError]);

    // Get page title based on context
    const getPageTitle = useCallback((customName?: string) => {
        if (isSubDetailPage) {

            return `${t('organizations:title')}  ${organizations[0]?.name || ''}  ${customName}`;
        } else if (isDetailPage) {
            return `${t('organizations:title')}  ${organizations[0]?.name || ''}`;
        }
        return t('organizations:title');
    }, [t, organizations, isDetailPage, isSubDetailPage]);

    // Render organization tree
    const renderOrganization = useCallback(() => {
        return null;
    }, []); return {
        organizations,
        stats,
        loading: loading || loadingTree || loadingStats,
        error: error || treeError || statsError,
        toggleOrgExpanded,
        fetchData,
        handleMemberAdded,
        handleMemberDelete,
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
        getPageTitle,
        renderOrganization
    };
};