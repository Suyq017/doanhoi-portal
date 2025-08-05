import React from 'react';
import { useTranslation } from 'react-i18next';

/**
 * AppLoadingScreen - Main application loading screen
 * Displayed while the app is initializing
 */
export const AppLoadingScreen: React.FC = () => {
    const { t } = useTranslation('common');

    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
            <div className="text-center">
                <div className="relative">
                    {/* Animated logo or spinner */}
                    <div className="animate-spin rounded-full h-16 w-16 border-4 border-gray-200 border-t-doan-500 mx-auto mb-6"></div>

                    {/* Pulsing background circle */}
                    <div className="absolute top-0 left-1/2 transform -translate-x-1/2 w-16 h-16 rounded-full bg-doan-100 dark:bg-doan-900 opacity-20 animate-ping"></div>
                </div>

                <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                    {t('loading.initializing', { defaultValue: 'Đang khởi tạo ứng dụng...' })}
                </h2>

                <p className="text-gray-600 dark:text-gray-400 text-sm">
                    {t('loading.pleaseWait', { defaultValue: 'Vui lòng đợi trong giây lát' })}
                </p>
            </div>
        </div>
    );
};

export default AppLoadingScreen;
