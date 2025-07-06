import { useCallback } from 'react';

interface RefreshConfig {
    fetchData: () => Promise<void>;
    refreshMemberStats?: () => void;
    handleBulkDeleteSuccess?: (message: string) => void;
    handleBulkDeleteError?: (message: string) => void;
    handleOrganizationCreated?: () => Promise<void>;
    handleOrganizationCreateError?: (error: string) => void;
}

export const useRefreshHandlers = (config: RefreshConfig) => {
    const {
        fetchData,
        refreshMemberStats,
        handleBulkDeleteSuccess,
        handleBulkDeleteError,
        handleOrganizationCreated,
        handleOrganizationCreateError
    } = config;

    // Combined refresh function that refreshes both data and stats
    const handleRefreshAll = useCallback(async () => {
        await fetchData();
        if (refreshMemberStats) {
            refreshMemberStats();
        }
    }, [fetchData, refreshMemberStats]);

    // Success/Error handlers for user operations
    const handleShowSuccess = useCallback((message: string) => {
        if (handleBulkDeleteSuccess) {
            handleBulkDeleteSuccess(message);
        }
    }, [handleBulkDeleteSuccess]);

    const handleShowError = useCallback((message: string) => {
        if (handleBulkDeleteError) {
            handleBulkDeleteError(message);
        }
    }, [handleBulkDeleteError]);

    // Organization creation handlers
    const handleOrganizationCreatedWrapper = useCallback(async () => {
        if (handleOrganizationCreated) {
            await handleOrganizationCreated();
        } else {
            await handleRefreshAll();
        }
    }, [handleOrganizationCreated, handleRefreshAll]);

    const handleOrganizationCreateErrorWrapper = useCallback((error: string) => {
        if (handleOrganizationCreateError) {
            handleOrganizationCreateError(error);
        }
    }, [handleOrganizationCreateError]);

    return {
        handleRefreshAll,
        handleShowSuccess,
        handleShowError,
        handleOrganizationCreatedWrapper,
        handleOrganizationCreateErrorWrapper
    };
};
