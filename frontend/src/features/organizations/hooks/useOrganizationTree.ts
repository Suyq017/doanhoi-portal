import { useState, useCallback, useEffect } from 'react';
import { Organization } from '../../../shared/types/organization';
import { toggleExpanded } from '../utils/organizationUtils';
import {
    useOrganizationTreeMain,
    useOrganizationTreeDetail,
    useOrganizationTreeSubDetail,
} from '../../../shared/hooks/queries/useOrganizationQueries';

interface UseOrganizationTreeOptions {
    type?: 'main' | 'detail' | 'subdetail';
    organizationType?: string;
    organizationCode?: string;
    maxDepth?: number;
}

export const useOrganizationTree = (options: UseOrganizationTreeOptions = {}) => {
    const {
        type = 'main',
        organizationType,
        organizationCode,
        maxDepth = 2
    } = options;

    // Local state for expand/collapse (not cached)
    const [organizations, setOrganizations] = useState<Organization[]>([]);

    // Select the appropriate query based on type
    const mainQuery = useOrganizationTreeMain(maxDepth);
    const detailQuery = useOrganizationTreeDetail(
        organizationType || '',
        organizationCode || '',
        maxDepth,
        { enabled: type === 'detail' && !!(organizationType && organizationCode) }
    );
    const subDetailQuery = useOrganizationTreeSubDetail(
        organizationType || '',
        organizationCode || '',
        1,
        { enabled: type === 'subdetail' && !!(organizationType && organizationCode) }
    );

    // Select active query
    let activeQuery;
    if (type === 'detail') {
        activeQuery = detailQuery;
    } else if (type === 'subdetail') {
        activeQuery = subDetailQuery;
    } else {
        activeQuery = mainQuery;
    }

    const { data, isLoading, error, refetch } = activeQuery;

    // Update local state when data changes (for expand/collapse)
    useEffect(() => {
        if (data) {
            setOrganizations(data);
        }
    }, [data]);

    /**
     * Toggle organization expanded state (local only)
     */
    const toggleOrgExpanded = useCallback((id: string) => {
        setOrganizations(prev => toggleExpanded(id, prev));
    }, []);

    return {
        organizations,
        loading: isLoading,
        error: error?.message || null,
        refetch,
        toggleOrgExpanded,
    };
};