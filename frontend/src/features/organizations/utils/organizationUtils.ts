
import { Organization } from '../../../shared/types/organization';

// Remove unused interface
// interface UseOrganizationImportConfigOptions removed

export const toggleExpanded = (id: string, orgs: Organization[]): Organization[] => {
    return orgs.map(org => {
        if (org.id === id) {
            return { ...org, isExpanded: !org.isExpanded };
        }
        if (org.children) {
            return { ...org, children: toggleExpanded(id, org.children) };
        }
        return org;
    });
};

export const createOrganizationPath = (type: string, code: string): string => {
    return `/organizations/${type}/${code}`;
};

export const createOrganizationSubPath = (
    type: string,
    code: string,
    childType: string,
    childCode: string
): string => {
    return `/organizations/${type}/${code}/${childType}/${childCode}`;
};

export const parseOrganizationPath = (path: string): {
    type?: string;
    code?: string;
    childType?: string;
    childCode?: string;
} => {
    const segments = path.split('/').filter(Boolean);

    if (segments.length < 3) return {};

    if (segments.length === 3) {
        return {
            type: segments[1],
            code: segments[2]
        };
    }

    if (segments.length === 5) {
        return {
            type: segments[1],
            code: segments[2],
            childType: segments[3],
            childCode: segments[4]
        };
    }

    return {};
};

export const getOrgTypeText = (type: string): string => {
    const typeMap: { [key: string]: string } = {
        'doan_truong': 'Đoàn Trường',
        'doan_co_so': 'Đoàn Cơ sở',
        'chi_doan': 'Chi Đoàn',
        'hoi_sinh_vien_truong': 'Hội SV Trường',
        'lien_chi_hoi': 'Liên Chi Hội',
        'chi_hoi': 'Chi Hội',
        'clb_truong': 'CLB Trường',
        'clb_khoa': 'CLB Khoa'
    };
    return typeMap[type] || type;
};

export const getOrgTypeColor = (type: string): string => {
    if (type.includes('doan')) {
        return 'bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-900 dark:text-blue-300 dark:border-blue-700';
    } else if (type.includes('hoi') || type.includes('clb')) {
        return 'bg-green-100 text-green-800 border-green-200 dark:bg-green-900 dark:text-green-300 dark:border-green-700';
    }
    return 'bg-gray-100 text-gray-800 border-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:border-gray-600';
};


export const isLeafOrganization = (org: Organization): boolean => {
    // Check if organization has no children
    return !org.children || org.children.length === 0;
};


export const shouldShowUserList = (organizations: Organization[], level: number): boolean => {
    if (organizations.length === 0) return false;

    // For level 3 (chi đoàn, chi hội), always show user list if no children
    if (level >= 3) {
        return organizations.every(org => isLeafOrganization(org));
    }

    // For level 2 (DetailPage), show user list if the main organization has no children
    if (level === 2) {
        return organizations.length === 1 && isLeafOrganization(organizations[0]);
    }

    // For other levels, only show if explicitly no children
    return organizations.every(org => isLeafOrganization(org));
};

export const getDisplayOrganization = (organizations: Organization[]): Organization | null => {
    return organizations.length === 1 ? organizations[0] : null;
};

export const countByType = (org: Organization): { doanCount: number; hoiCount: number; clbCount: number } => {
    let doanCount = 0;
    let hoiCount = 0;
    let clbCount = 0;

    if (org.children) {
        org.children.forEach(child => {
            // Count current level
            if (child.type === 'chi_doan' || child.type === 'doan_co_so') {
                doanCount++;
            } else if (child.type === 'chi_hoi' || child.type === 'lien_chi_hoi') {
                hoiCount++;
            } else if (child.type === 'clb_khoa' || child.type === 'clb_truong') {
                clbCount++;
            }

            // Count recursively for nested children
            const childCounts = countByType(child);
            doanCount += childCounts.doanCount;
            hoiCount += childCounts.hoiCount;
            clbCount += childCounts.clbCount;
        });
    }

    return { doanCount, hoiCount, clbCount };
};

/**
 * Determine the level of an organization type
 */
export const getOrganizationLevel = (type: string): 2 | 3 => {
    return type === 'clb_truong' ? 3 : 2;
};

/**
 * Check if organization type should show member statistics
 */
export const shouldShowMemberStats = (type?: string): boolean => {
    return type === 'clb_truong';
};

/**
 * Sort organizations to prioritize user's membership
 */
export const sortOrganizationsByMembership = (
    organizations: Organization[],
    isUserInOrganization: (orgId: string) => boolean
): Organization[] => {
    const sortOrganizations = (orgs: Organization[]): Organization[] => {
        return [...orgs]
            .map(org => ({
                ...org,
                children: org.children ? sortOrganizations(org.children) : undefined
            }))
            .sort((a, b) => {
                const aIsMember = isUserInOrganization(a.id);
                const bIsMember = isUserInOrganization(b.id);

                // Prioritize organizations user belongs to
                if (aIsMember && !bIsMember) return -1;
                if (!aIsMember && bIsMember) return 1;

                // If same membership status, maintain alphabetical order
                return a.name.localeCompare(b.name);
            });
    };

    return sortOrganizations(organizations);
};

/**
 * Find organization by type and code in a tree structure
 */
export const findOrganizationInTree = (
    organizations: Organization[],
    type: string,
    code: string
): Organization | null => {
    for (const org of organizations) {
        if (org.type === type && org.code === code) {
            return org;
        }
        if (org.children) {
            const found = findOrganizationInTree(org.children, type, code);
            if (found) return found;
        }
    }
    return null;
};

/**
 * Check if current page is a members page based on URL
 */
export const isMembersPage = (pathname: string): boolean => {
    return pathname.includes('/members');
};

/**
 * Check if current organization should show user list by default
 */
export const shouldShowUserListByDefault = (type?: string): boolean => {
    return type === 'clb_truong';
};

