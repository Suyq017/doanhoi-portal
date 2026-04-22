import React from 'react';
import { useTranslation } from 'react-i18next';
import { Plus } from 'lucide-react';

interface TemplateListHeaderProps {
    canManageTemplates: boolean;
    onNavigateToUpload: () => void;
}

export const TemplateListHeader: React.FC<TemplateListHeaderProps> = ({
    canManageTemplates,
    onNavigateToUpload,
}) => {
    const { t } = useTranslation(['templates']);

    return (
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
            <div>
                <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
                    {t('templates:adminTitle')}
                </h1>
                <p className="mt-2 text-gray-600 dark:text-gray-400">
                    {t('templates:adminSubtitle')}
                </p>
            </div>
            {canManageTemplates && (
                <div className="mt-4 sm:mt-0">
                    <button
                        onClick={onNavigateToUpload}
                        className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-doan-500 hover:bg-doan-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-doan-500"
                    >
                        <Plus className="mr-2 h-4 w-4" />
                        {t('templates:createTemplate')}
                    </button>
                </div>
            )}
        </div>
    );
};

export default TemplateListHeader;
