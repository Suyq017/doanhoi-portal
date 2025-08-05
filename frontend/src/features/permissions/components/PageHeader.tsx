import React from 'react';
import { useTranslation } from 'react-i18next';
import { Plus, Trash } from 'lucide-react';

interface PageHeaderProps {
    selectedCount: number;
    onCreateClick: () => void;
    onBulkDeleteClick: () => void;
    loading?: boolean;
}

const PageHeader: React.FC<PageHeaderProps> = ({
    selectedCount,
    onCreateClick,
    onBulkDeleteClick,
    loading = false
}) => {
    const { t } = useTranslation('permissions');

    return (
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">            <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
                {t('title')}
            </h1>
            <p className="mt-2 text-gray-600 dark:text-gray-400">
                {t('subtitle')}
            </p>
        </div>
            <div className="mt-4 sm:mt-0 flex space-x-3">
                {/* Bulk Delete Button */}
                {selectedCount > 0 && (
                    <button
                        onClick={onBulkDeleteClick}
                        className="inline-flex items-center px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 focus:ring-2 focus:ring-red-500 focus:ring-offset-2 transition-colors"
                        disabled={loading}
                    >                        <Trash className="w-5 h-5 mr-2" />
                        {t('actions.delete')} {selectedCount} {selectedCount === 1 ? t('labels.role') : t('labels.roles')}
                    </button>
                )}
                <button
                    onClick={onCreateClick}
                    className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors"
                    disabled={loading}
                >                    <Plus className="w-5 h-5 mr-2" />
                    {t('actions.create')}
                </button>
            </div>
        </div>
    );
};

export default PageHeader;
