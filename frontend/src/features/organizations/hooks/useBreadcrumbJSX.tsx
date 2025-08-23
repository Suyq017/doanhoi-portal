import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { ChevronRight } from 'lucide-react';
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

export const useBreadcrumbJSX = (config: BreadcrumbConfig) => {
    const { t } = useTranslation(['organizations']);

    return useMemo(() => {
        const baseTitle = t('organizations:title');
        const membersText = t('organizations:members.title', { defaultValue: 'Danh sách thành viên' });

        const {
            type,
            code,
            parentType,
            parentCode,
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
            const parentOrg = organizations[0];
            const childOrgName = displayOrganization?.name || '';

            return (
                <div className="flex items-center space-x-2">
                    <Link
                        to="/organizations"
                        className="text-gray-900 hover:text-gray-700 dark:text-white dark:hover:text-gray-300 hover:underline transition-colors"
                    >
                        {baseTitle}
                    </Link>
                    <ChevronRight className="w-4 h-4 text-gray-400" />
                    <Link
                        to={`/organizations/${parentType}/${parentCode}`}
                        className="text-gray-900 hover:text-gray-700 dark:text-white dark:hover:text-gray-300 hover:underline transition-colors"
                    >
                        {parentOrg?.name || ''}
                    </Link>
                    <ChevronRight className="w-4 h-4 text-gray-400" />
                    <Link
                        to={`/organizations/${parentType}/${parentCode}/${type}/${code}`}
                        className="text-gray-900 hover:text-gray-700 dark:text-white dark:hover:text-gray-300 hover:underline transition-colors"
                    >
                        {childOrgName}
                    </Link>
                    <ChevronRight className="w-4 h-4 text-gray-400" />
                    <span className="text-gray-900 dark:text-white">{membersText}</span>
                </div>
            );
        }

        // Detail members page
        if (isDetailPage && isMembersPage && displayOrganization) {
            return (
                <div className="flex items-center space-x-2">
                    <Link
                        to="/organizations"
                        className="text-gray-900 hover:text-gray-700 dark:text-white dark:hover:text-gray-300 hover:underline transition-colors"
                    >
                        {baseTitle}
                    </Link>
                    <ChevronRight className="w-4 h-4 text-gray-400" />
                    <Link
                        to={`/organizations/${type}/${code}`}
                        className="text-gray-900 hover:text-gray-700 dark:text-white dark:hover:text-gray-300 hover:underline transition-colors"
                    >
                        {displayOrganization.name}
                    </Link>
                    <ChevronRight className="w-4 h-4 text-gray-400" />
                    <span className="text-gray-900 dark:text-white">{membersText}</span>
                </div>
            );
        }

        // Sub-detail page
        if (isSubDetailPage) {
            const parentOrg = organizations[0];
            const pathParts = window.location.pathname.split('/');
            const parentTypeFromPath = pathParts[2];
            const parentCodeFromPath = pathParts[3];

            if (parentOrg && displayOrganization) {
                return (
                    <div className="flex items-center space-x-2">
                        <Link
                            to="/organizations"
                            className="text-gray-900 hover:text-gray-700 dark:text-white dark:hover:text-gray-300 hover:underline transition-colors"
                        >
                            {baseTitle}
                        </Link>
                        <ChevronRight className="w-4 h-4 text-gray-400" />
                        <Link
                            to={`/organizations/${parentTypeFromPath}/${parentCodeFromPath}`}
                            className="text-gray-900 hover:text-gray-700 dark:text-white dark:hover:text-gray-300 hover:underline transition-colors"
                        >
                            {parentOrg.name}
                        </Link>
                        <ChevronRight className="w-4 h-4 text-gray-400" />
                        <span className="text-gray-900 dark:text-white">{displayOrganization.name}</span>
                    </div>
                );
            }
            return `${baseTitle} - ${customName || ''}`;
        }

        // Detail page
        if (isDetailPage && displayOrganization) {
            return (
                <div className="flex items-center space-x-2">
                    <Link
                        to="/organizations"
                        className="text-gray-900 hover:text-gray-700 dark:text-white dark:hover:text-gray-300 hover:underline transition-colors"
                    >
                        {baseTitle}
                    </Link>
                    <ChevronRight className="w-4 h-4 text-gray-400" />
                    <span className="text-gray-900 dark:text-white">{displayOrganization.name}</span>
                </div>
            );
        }

        return baseTitle;
    }, [config, t]);
};
