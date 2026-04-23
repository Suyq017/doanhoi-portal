import { useCallback, useState } from 'react';

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

    // State for refresh key to trigger member stats refresh
    const [refreshKey, setRefreshKey] = useState(0);

    const incrementRefreshKey = useCallback(() => {
        setRefreshKey(prev => prev + 1);
    }, []);

    // Combined refresh function that refreshes both data and stats
    const handleRefreshAll = useCallback(async () => {
        await fetchData();
        if (refreshMemberStats) {
            refreshMemberStats();
        } else {
            // Force memberStats refresh by incrementing key
            incrementRefreshKey();
        }
    }, [fetchData, refreshMemberStats, incrementRefreshKey]);

    // Success/Error handlers for user operations with delayed refresh
    const handleShowSuccess = useCallback((message: string) => {
        if (handleBulkDeleteSuccess) {
            handleBulkDeleteSuccess(message);
        }
        // Delay refresh to allow toast to be visible
        setTimeout(() => {
            handleRefreshAll();
        }, 1500); // 1.5 seconds delay
    }, [handleBulkDeleteSuccess, handleRefreshAll]);

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
    }, [handleOrganizationCreateError]); return {
        refreshKey,
        handleRefreshAll,
        handleShowSuccess,
        handleShowError,
        handleOrganizationCreatedWrapper,
        handleOrganizationCreateErrorWrapper,
        incrementRefreshKey
    };
};
