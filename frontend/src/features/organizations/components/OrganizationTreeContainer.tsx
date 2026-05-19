import React, { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';

interface OrganizationTreeContainerProps {
    title?: string;
    children: ReactNode;
    emptyMessage?: string;
    isEmpty?: boolean;
}

const OrganizationTreeContainer: React.FC<OrganizationTreeContainerProps> = ({
    title = 'organizations:tree.treeOrganization',
    children,
    emptyMessage,
    isEmpty = false
}) => {
    const { t } = useTranslation(['organizations', 'common']);

    return (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
                <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                    {t(title)}
                </h3>
            </div>

            <div className="divide-y divide-gray-200 dark:divide-gray-700">
                {isEmpty ? (
                    <div className="text-center py-12">
                        <div className="text-gray-500 dark:text-gray-400">
                            {emptyMessage || t('common:messages.empty.noResults')}
                        </div>
                    </div>
                ) : (
                    children
                )}
            </div>
        </div>
    );
};

export default OrganizationTreeContainer;