import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Organization } from '../../../shared/types/organization';

interface BreadcrumbConfig {
    type?: string;
    code?: string;
    parentType?: string;
    parentCode?: string;
    isDetailPage?: boolean;
    isSubDetailPage?: boolean;
    isMembersPage?: boolean;
    organizations: Organization[];
    displayOrganization?: Organization | null;
    customName?: string;
}

export const useBreadcrumb = (config: BreadcrumbConfig) => {
    const { t } = useTranslation(['organizations']);

    return useMemo(() => {
        const baseTitle = t('organizations:title');
        const membersText = t('organizations:members.title', { defaultValue: 'Danh sách thành viên' });

        const {
            isDetailPage,
            isSubDetailPage,
            isMembersPage,
            organizations,
            displayOrganization,
            customName
        } = config;

        // Main organizations page
        if (!isDetailPage && !isSubDetailPage && !isMembersPage) {
            return baseTitle;
        }

        // Sub-detail members page
        if (isSubDetailPage && isMembersPage) {
            return `${baseTitle} > ${organizations[0]?.name || ''} > ${displayOrganization?.name || ''} > ${membersText}`;
        }

        // Detail members page
        if (isDetailPage && isMembersPage && displayOrganization) {
            return `${baseTitle} > ${displayOrganization.name} > ${membersText}`;
        }

        // Sub-detail page
        if (isSubDetailPage) {
            const parentOrg = organizations[0];
            if (parentOrg && displayOrganization) {
                return `${baseTitle} > ${parentOrg.name} > ${displayOrganization.name}`;
            }
            return `${baseTitle} - ${customName || ''}`;
        }

        // Detail page
        if (isDetailPage && displayOrganization) {
            return `${baseTitle} > ${displayOrganization.name}`;
        }

        return baseTitle;
    }, [config, t]);
};
