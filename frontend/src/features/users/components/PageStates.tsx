/**
 * Page state components for Users feature
 */

import React from 'react';
import { Shield } from 'lucide-react';
import { useTranslation } from 'react-i18next';

/**
 * Access Denied State
 */
export const AccessDeniedState: React.FC = () => {
    const { t } = useTranslation(['common']);

    return (
        <div className="flex items-center justify-center min-h-[400px]">
            <div className="text-center">
                <Shield className="w-16 h-16 mx-auto mb-4 text-gray-400" />
                <h3 className="mb-2 text-lg font-medium text-gray-900 dark:text-white">
                    {t('common:errors.accessDenied')}
                </h3>
                <p className="mb-4 text-gray-500 dark:text-gray-400">
                    {t('common:errors.noPermissionToAccess')}
                </p>
                <button
                    onClick={() => window.history.back()}
                    className="px-4 py-2 text-gray-700 transition-colors bg-gray-100 rounded-md hover:bg-gray-200"
                >
                    {t('common:actions.goBack')}
                </button>
            </div>
        </div>
    );
};

/**
 * Loading State
 */
export const LoadingState: React.FC<{ message?: string }> = ({ message }) => {
    const { t } = useTranslation(['common']);

    return (
        <div className="flex items-center justify-center min-h-[400px]">
            <div className="text-center">
                <div className="w-12 h-12 mx-auto border-4 rounded-full animate-spin border-gray-200 dark:border-gray-700 border-t-doan-500 dark:border-t-doan-400"></div>
                <p className="mt-4 text-gray-600 dark:text-gray-400">
                    {message || t('common:states.loading')}
                </p>
            </div>
        </div>
    );
};

/**
 * Error State
 */
export interface ErrorStateProps {
    error: string;
    onRetry?: () => void;
}

export const ErrorState: React.FC<ErrorStateProps> = ({ error, onRetry }) => {
    const { t } = useTranslation(['common']);

    return (
        <div className="flex items-center justify-center min-h-[400px]">
            <div className="text-center">
                <div className="mb-4 text-xl text-red-500">⚠️</div>
                <p className="text-red-600 dark:text-red-400">{error}</p>
                {onRetry && (
                    <button
                        onClick={onRetry}
                        className="px-4 py-2 mt-4 text-white rounded-lg bg-doan-600 hover:bg-doan-700"
                    >
                        {t('common:actions.retry')}
                    </button>
                )}
            </div>
        </div>
    );
};

export default { AccessDeniedState, LoadingState, ErrorState };
