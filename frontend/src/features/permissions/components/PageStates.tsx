import React from 'react';
import { useTranslation } from 'react-i18next';

interface LoadingStateProps {
    title?: string;
    subtitle?: string;
}

const LoadingState: React.FC<LoadingStateProps> = ({
    title,
    subtitle
}) => {
    const { t } = useTranslation('permissions');

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
                <div>                    <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
                    {title || t('title')}
                </h1>
                    <p className="mt-2 text-gray-600 dark:text-gray-400">
                        {subtitle || t('subtitle')}
                    </p>
                </div>
            </div>
            <div className="flex items-center justify-center min-h-[400px]">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            </div>
        </div>
    );
};

interface ErrorStateProps {
    error: string;
    onRetry: () => void;
}

const ErrorState: React.FC<ErrorStateProps> = ({ error, onRetry }) => {
    const { t } = useTranslation('permissions');

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
                <div>                    <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
                    {t('title')}
                </h1>
                    <p className="mt-2 text-gray-600 dark:text-gray-400">
                        {t('subtitle')}
                    </p>
                </div>
            </div>
            <div className="flex items-center justify-center min-h-[400px]">
                <div className="text-center">
                    <div className="text-red-500 text-xl mb-4">⚠️</div>
                    <p className="text-red-600 dark:text-red-400">{error}</p>
                    <button
                        onClick={onRetry}
                        className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                    >
                        {t('actions.retry', 'Thử lại')}
                    </button>
                </div>
            </div>
        </div>
    );
};

export { LoadingState, ErrorState };
