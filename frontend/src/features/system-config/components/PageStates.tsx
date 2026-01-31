/**
 * Page state components for SystemConfig feature
 */

import React from 'react';
import { useTranslation } from 'react-i18next';

/**
 * Loading State - Permission check loading
 */
export const LoadingState: React.FC<{ message?: string }> = ({ message }) => {
    return (
        <div className="flex items-center justify-center h-screen">
            <div className="text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-4 border-gray-200 dark:border-gray-700 border-t-doan-500 dark:border-t-doan-400 mx-auto"></div>
                {message && (
                    <p className="mt-4 text-gray-600 dark:text-gray-400">{message}</p>
                )}
            </div>
        </div>
    );
};

/**
 * Access Denied State
 */
export const AccessDeniedState: React.FC<{ onGoBack?: () => void }> = ({ onGoBack }) => {
    const { t } = useTranslation(['common']);

    return (
        <div className="flex items-center justify-center min-h-[400px]">
            <div className="text-center">
                <div className="w-16 h-16 mx-auto mb-4 text-gray-400">
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
                    </svg>
                </div>
                <h3 className="mb-2 text-lg font-medium text-gray-900 dark:text-white">
                    {t('common:errors.accessDenied')}
                </h3>
                <p className="mb-4 text-gray-500 dark:text-gray-400">
                    {t('common:errors.noPermissionToAccess')}
                </p>
                {onGoBack && (
                    <button
                        onClick={onGoBack}
                        className="px-4 py-2 text-gray-700 transition-colors bg-gray-100 rounded-md hover:bg-gray-200"
                    >
                        {t('common:actions.goBack')}
                    </button>
                )}
            </div>
        </div>
    );
};

export default { LoadingState, AccessDeniedState };
