import { useMemo } from 'react';

interface PageConfigParams {
    type?: string;
    code?: string;
    parentType?: string;
    parentCode?: string;
}

interface PageConfig {
    level: 2 | 3;
    isSubDetailPage: boolean;
    isDetailPage: boolean;
    shouldShowMemberStats: boolean;
    shouldShowUserList: boolean;
}

/**
 * Hook to determine page configuration based on URL parameters
 * Centralizes logic for determining page type, level, and what to show
 */
export const usePageConfig = ({
    type,
    code,
    parentType,
    parentCode
}: PageConfigParams): PageConfig => {
    return useMemo(() => {
        const isSubDetailPage = Boolean(parentType && parentCode);
        const isDetailPage = Boolean(type && code && !isSubDetailPage);

        // Determine level based on organization type
        const level: 2 | 3 = type === 'clb_truong' ? 3 : 2;

        // CLB organizations show member stats and user list
        const shouldShowMemberStats = type === 'clb_truong';
        const shouldShowUserList = type === 'clb_truong';

        return {
            level,
            isSubDetailPage,
            isDetailPage,
            shouldShowMemberStats,
            shouldShowUserList
        };
    }, [type, code, parentType, parentCode]);
};
