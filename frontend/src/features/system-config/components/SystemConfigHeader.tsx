/**
 * SystemConfigHeader - Page header component for system config
 */

import React from 'react';
import { Settings, RefreshCw } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import type { SystemConfigHeaderProps } from '../types';

export const SystemConfigHeader: React.FC<SystemConfigHeaderProps> = ({
    isRefreshing,
    onRefresh,
}) => {
    const { t } = useTranslation(['common', 'systemConfig']);

    return (
        <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
                <Settings className="w-8 h-8 text-gray-700 dark:text-gray-300" />
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                        {t('systemConfig:title')}
                    </h1>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                        {t('systemConfig:subtitle')}
                    </p>
                </div>
            </div>

            {/* Refresh Button */}
            <button
                onClick={onRefresh}
                disabled={isRefreshing}
                className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 dark:bg-gray-800 dark:text-gray-300 dark:border-gray-600 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                title={t('common:actions.refresh')}
            >
                <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
                {isRefreshing ? t('common:states.loading') : t('common:actions.refresh')}
            </button>
        </div>
    );
};

export default SystemConfigHeader;
