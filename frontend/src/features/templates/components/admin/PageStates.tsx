import React from 'react';
import { useTranslation } from 'react-i18next';



// Loading State
export const LoadingState: React.FC = () => {
    const { t } = useTranslation(['templates']);
    return (
        <div className="flex items-center justify-center min-h-[400px]">
            <div className="text-center">
                <div className="w-12 h-12 mx-auto border-4 rounded-full animate-spin border-gray-200 dark:border-gray-700 border-t-doan-500 dark:border-t-doan-400"></div>
                <p className="mt-4 text-gray-600 dark:text-gray-400">
                    {t('templates:messages.loadingTemplates')}
                </p>
            </div>
        </div>
    );
};

// Full Page Loading
export const FullPageLoading: React.FC = () => {
    return (
        <div className="flex justify-center items-center h-screen">
            <div className="animate-spin rounded-full h-12 w-12 border-4 border-gray-200 dark:border-gray-700 border-t-doan-500 dark:border-t-doan-400"></div>
        </div>
    );
};

// Error State
interface ErrorStateProps {
    error: Error | null;
}

export const ErrorState: React.FC<ErrorStateProps> = ({ error }) => {
    const { t } = useTranslation(['common']);
    return (
        <div className="p-12 text-center">
            <div className="text-red-500 dark:text-red-400">
                {t('common:messages.error.load')}: {error?.message || t('common:messages.error.unknown')}
            </div>
        </div>
    );
};
