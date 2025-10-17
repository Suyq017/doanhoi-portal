import { useCallback } from 'react';
import { useOrganizationImport } from './useOrganizationImport';

interface UseImportModalParams {
    level: 2 | 3;
    organizationId?: string;
    onRefresh: () => Promise<void>;
    useClientSideProcessing?: boolean; // Enable fast backend validation
}

interface UseImportModalResult {
    importConfig: ReturnType<typeof useOrganizationImport>['importConfig'];
    handleImportModalClose: () => void;
}

/**
 * Hook to handle import modal configuration and close behavior
 * Provides unified import modal logic for different page types
 */
export const useImportModal = ({
    level,
    organizationId,
    onRefresh,
    useClientSideProcessing = false
}: UseImportModalParams): UseImportModalResult => {
    const { importConfig, setIsImportModalOpen } = useOrganizationImport({
        level,
        organizationId,
        useClientSideProcessing,
        onSuccess: () => {
            console.log('Import completed successfully');
        },
        onError: (error) => {
            console.error('Import error:', error.message);
        }
    });

    const handleImportModalClose = useCallback(() => {
        setIsImportModalOpen(false);
        // Refresh data when modal closes (after import is done)
        onRefresh();
    }, [setIsImportModalOpen, onRefresh]);

    return {
        importConfig,
        handleImportModalClose
    };
};
