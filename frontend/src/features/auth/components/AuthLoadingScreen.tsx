import React from 'react';
import { useTranslation } from 'react-i18next';

/**
 * AuthLoadingScreen - Loading screen displayed while checking authentication status
 */
const AuthLoadingScreen: React.FC = () => {
    const { t } = useTranslation(['auth', 'common']);

    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
            <div className="text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-doan-500 mx-auto mb-4"></div>
                <p className="text-gray-600 dark:text-gray-400 text-lg font-medium">
                    {t('auth:loading.checkingAuthentication', { defaultValue: 'Đang kiểm tra đăng nhập...' })}
                </p>
                <p className="text-gray-500 dark:text-gray-500 text-sm mt-2">
                    {t('auth:loading.pleaseWait', { defaultValue: 'Vui lòng đợi trong giây lát' })}
                </p>
            </div>
        </div>
    );
};

export { AuthLoadingScreen };
export default AuthLoadingScreen;
