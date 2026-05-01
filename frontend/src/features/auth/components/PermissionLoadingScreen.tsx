import React from 'react';
import { useTranslation } from 'react-i18next';

/**
 * PermissionLoadingScreen - Loading screen displayed while checking user permissions
 */
const PermissionLoadingScreen: React.FC = () => {
    const { t } = useTranslation(['auth', 'common']);

    return (
        <div className="flex items-center justify-center min-h-[400px]">
            <div className="text-center">
                <div className="animate-spin rounded-full h-10 w-10 border-4 border-gray-200 dark:border-gray-700 border-t-doan-500 dark:border-t-doan-400 mx-auto mb-4"></div>
                <p className="text-gray-600 dark:text-gray-400 font-medium">
                    {t('auth:loading.checkingPermissions', { defaultValue: 'Đang kiểm tra quyền truy cập...' })}
                </p>
            </div>
        </div>
    );
};

export { PermissionLoadingScreen };
export default PermissionLoadingScreen;
