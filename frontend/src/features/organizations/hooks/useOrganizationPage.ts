import { useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { Organization } from '../../../shared/types/organization';
import { useOrganizationTree } from './useOrganizationTree';
import {
    useOrganizationStats,
    useUpdateOrganization,
    useInvalidateOrganizations,
} from '../../../shared/hooks/queries/useOrganizationQueries';
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

    // Determine tree type
    let treeType: 'main' | 'detail' | 'subdetail' = 'main';
    if (isSubDetailPage) treeType = 'subdetail';
    else if (isDetailPage) treeType = 'detail';

    // React Query hooks
    const {
        organizations,
        loading: loadingTree,
        error: treeError,
        toggleOrgExpanded,
        refetch: refetchTree,
    } = useOrganizationTree({
        type: treeType,
        organizationType: type,
        organizationCode: code,
        maxDepth: isSubDetailPage ? 1 : 2,
    });

    const {
        data: stats,
        isLoading: loadingStats,
        error: statsError,
        refetch: refetchStats,
    } = useOrganizationStats();

    // Mutations
    const updateOrgMutation = useUpdateOrganization();
    const { invalidateStats, invalidateTrees } = useInvalidateOrganizations();

    // Combined loading & error states
    const loading = loadingTree || loadingStats;
    const error = treeError || statsError?.message || null;

    // Refetch all data
    const fetchData = useCallback(async () => {
        await Promise.all([refetchTree(), refetchStats()]);
    }, [refetchTree, refetchStats]);

    // ========================
    // EVENT HANDLERS
    // ========================

    /**
     * Handle member added
     */
    const handleMemberAdded = useCallback(async () => {
        showSuccess(t('common:messages.success.add'));

        // Only invalidate stats (tree doesn't change)
        setTimeout(() => {
            invalidateStats();
        }, 150);
    }, [invalidateStats, showSuccess, t]);

    /**
     * Handle member delete
     */
    const handleMemberDelete = useCallback(async () => {
        showSuccess(t('common:messages.success.delete'));

        // Only invalidate stats (tree doesn't change)
        setTimeout(() => {
            invalidateStats();
        }, 150);
    }, [invalidateStats, showSuccess, t]);

    const handleMemberAddError = useCallback((error: string) => {
        showError(error);
    }, [showError]);

    /**
     * ✅ OPTIMIZED: Update organization with optimistic update
     * React Query handles cache update automatically
     */
    const handleOrganizationUpdated = useCallback(async (updatedOrg?: Organization) => {
        try {
            if (updatedOrg) {
                // Extract only the fields that are allowed in UpdateOrganizationDto
                const updateData = {
                    name: updatedOrg.name,
                    code: updatedOrg.code,
                    type: updatedOrg.type,
                    description: updatedOrg.description,
                    parentId: updatedOrg.parentId,
                };

                // Backend update with React Query's optimistic update
                await updateOrgMutation.mutateAsync({
                    id: updatedOrg.id,
                    data: updateData,
                });

                showSuccess(t('common:messages.success.update'));
            } else {
                // Fallback: refetch
                await fetchData();
                showSuccess(t('common:messages.success.update'));
            }
        } catch (error) {
            showError(t('common:messages.error.update'));
        }
    }, [updateOrgMutation, fetchData, showSuccess, showError, t]);

    /**
     * Handle organization deleted
     */
    const handleOrganizationDeleted = useCallback(async () => {
        try {
            showSuccess(t('common:messages.success.delete'));

            // Invalidate all (org structure changed)
            setTimeout(() => {
                invalidateTrees();
                invalidateStats();
            }, 150);
        } catch (error) {
            showError(t('common:messages.error.delete'));
        }
    }, [invalidateTrees, invalidateStats, showSuccess, showError, t]);

    const handleDeleteError = useCallback((error: string) => {
        showError(error);
    }, [showError]);

    const handleBulkDeleteSuccess = useCallback((message: string) => {
        showSuccess(message);
        setTimeout(() => {
            invalidateStats();
        }, 150);
    }, [invalidateStats, showSuccess]);

    const handleBulkDeleteError = useCallback((error: string) => {
        showError(error);
    }, [showError]);

    /**
     * Handle organization created
     */
    const handleOrganizationCreated = useCallback(async (message?: string) => {
        showSuccess(message || t('organizations:messages.createSuccess'));

        // Invalidate all (new org added)
        setTimeout(() => {
            invalidateTrees();
            invalidateStats();
        }, 150);
    }, [invalidateTrees, invalidateStats, showSuccess, t]);

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
    }, []);

    return {
        organizations,
        stats,
        loading,
        error,
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
        showSuccess,
        showError,
        getPageTitle,
        renderOrganization
    };
};