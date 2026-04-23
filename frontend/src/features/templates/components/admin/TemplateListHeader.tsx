import React from 'react';
import { useTranslation } from 'react-i18next';
import { AlertCircle, Loader2, Plus } from 'lucide-react';

interface TemplateListHeaderProps {
    canManageTemplates: boolean;
    onNavigateToUpload: () => void;
    hasActiveS3Config: boolean;
    isCheckingS3Config: boolean;
}

export const TemplateListHeader: React.FC<TemplateListHeaderProps> = ({
    canManageTemplates,
    onNavigateToUpload,
    hasActiveS3Config,
    isCheckingS3Config,
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
                <div className="mt-4 sm:mt-0 flex items-center gap-3">
                    {!isCheckingS3Config && !hasActiveS3Config && (
                        <div className="inline-flex items-center gap-2 rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-xs font-medium text-amber-800 dark:border-amber-700 dark:bg-amber-900/30 dark:text-amber-200">
                            <AlertCircle className="h-4 w-4" />
                            {t('templates:messages.s3ConfigMissingShort')}
                        </div>
                    )}
                    <button
                        onClick={onNavigateToUpload}
                        disabled={isCheckingS3Config}
                        className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-doan-500 hover:bg-doan-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-doan-500"
                    >
                        {isCheckingS3Config ? (
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        ) : (
                            <Plus className="mr-2 h-4 w-4" />
                        )}
                        {t('templates:createTemplate')}
                    </button>
                </div>
            )}
        </div>
    );
};

export default TemplateListHeader;
