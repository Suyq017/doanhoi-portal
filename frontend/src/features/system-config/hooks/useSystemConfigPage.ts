/**
 * useSystemConfigPage - Unified hook for system config page state management
 * 
 * Note: Permission checking is handled by EnhancedProtectedRoute in App.tsx
 * This hook only manages page-specific state
 */

import { useState } from 'react';
import { useInvalidateSystemConfig } from '@/shared/hooks/queries/useSystemConfigQueries';
import type { UseSystemConfigPageReturn } from '../types';

export const useSystemConfigPage = (): UseSystemConfigPageReturn => {
    const { refetchAll } = useInvalidateSystemConfig();
    const [isRefreshing, setIsRefreshing] = useState(false);

    // Handle manual refresh
    const handleRefresh = async () => {
        setIsRefreshing(true);
        try {
            await refetchAll();
        } finally {
            setIsRefreshing(false);
        }
    };

    return {
        isCheckingPermission: false, // Always false - permission checked by route
        hasAccess: true, // Always true - we're here means we have access
        isRefreshing,
        handleRefresh,
    };
};

export default useSystemConfigPage;
