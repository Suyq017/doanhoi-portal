/**
 * Utility functions for handling organization type/code paths
 */
import { Organization } from '../../../shared/types/organization';

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
