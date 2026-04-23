import { useState, useCallback } from 'react';
import { UseOldSystemImportReturn } from '../types';

/**
 * Custom hook for CTXH Old System Import page
 * Handles import modal state and callbacks
 */
export const useOldSystemImport = (): UseOldSystemImportReturn => {
    const [isImportModalOpen, setIsImportModalOpen] = useState(false);
    const [modalKey, setModalKey] = useState(0);

    const openImportModal = useCallback(() => {
        setModalKey(prev => prev + 1); // Force remount modal
        setIsImportModalOpen(true);
    }, []);

    const closeImportModal = useCallback(() => {
        setIsImportModalOpen(false);
    }, []);

    const handleImportSuccess = useCallback((result: any) => {
        console.log('Import completed:', result);
        // Optionally show success toast or redirect
    }, []);

    const handleImportError = useCallback((error: Error) => {
        console.error('Import failed:', error);
        // Optionally show error toast
    }, []);

    return {
        isImportModalOpen,
        modalKey,
        openImportModal,
        closeImportModal,
        handleImportSuccess,
        handleImportError
    };
};
