import { useMemo } from 'react';
import { Organization } from '../../../shared/types/organization';

interface UseDisplayOrganizationParams {
    organizations: Organization[];
    type?: string;
    code?: string;
    parentType?: string;
    parentCode?: string;
    isSubDetailPage?: boolean;
}

/**
 * Hook to get the organization that should be displayed
 * Handles both direct organization and sub-organization lookup
 */
export const useDisplayOrganization = ({
    organizations,
    type,
    code,
    isSubDetailPage
}: UseDisplayOrganizationParams) => {
    return useMemo(() => {
        if (!organizations.length) return null;

        if (isSubDetailPage && type && code) {
            // Find the specific child organization
            const parentOrg = organizations[0];
            if (parentOrg && parentOrg.children) {
                return parentOrg.children.find(child =>
                    child.type === type && child.code === code
                ) || null;
            }
            return null;
        } else {
            // Direct organization
            return organizations.length > 0 ? organizations[0] : null;
        }
    }, [organizations, isSubDetailPage, type, code]);
};
