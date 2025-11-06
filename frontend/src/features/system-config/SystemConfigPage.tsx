import React, { useEffect } from 'react';
import { Settings, RefreshCw } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../auth/context/AuthContext';
import AwsS3ConfigSection from '../dashboard/components/AwsS3ConfigSection';
import { useInvalidateSystemConfig } from '@/shared/hooks/queries/useSystemConfigQueries';

const SystemConfigPage: React.FC = () => {
    const { t } = useTranslation(['common', 'systemConfig']);
    const navigate = useNavigate();
    const { auth, hasPermission } = useAuth();
    const [isCheckingPermission, setIsCheckingPermission] = React.useState(true);
    const { refetchAll } = useInvalidateSystemConfig();
    const [isRefreshing, setIsRefreshing] = React.useState(false);

    useEffect(() => {
        const checkPermission = async () => {
            try {
                if (!auth.user) {
                    navigate('/admin-doan-hoi/login');
                    return;
                }

                const hasAccess = hasPermission('system-config.access');
                if (!hasAccess) {
                    navigate('/');
                }
            } catch (error) {
                console.error('Permission check failed:', error);
                navigate('/');
            } finally {
                setIsCheckingPermission(false);
            }
        };

        checkPermission();
    }, [auth, hasPermission, navigate]);

    // Handle manual refresh
    const handleRefresh = async () => {
        setIsRefreshing(true);
        try {
            await refetchAll();
        } finally {
            setIsRefreshing(false);
        }
    };

    if (isCheckingPermission) {
        return (
            <div className="flex items-center justify-center h-screen">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            </div>
        );
    }

    return (
        <div className="p-6 space-y-6">
            {/* Header */}
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
                    onClick={handleRefresh}
                    disabled={isRefreshing}
                    className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 dark:bg-gray-800 dark:text-gray-300 dark:border-gray-600 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    title={t('common:actions.refresh')}
                >
                    <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
                    {isRefreshing ? t('common:states.loading') : t('common:actions.refresh')}
                </button>
            </div>

            {/* AWS S3 Configuration Section */}
            <AwsS3ConfigSection />
        </div>
    );
};

export default SystemConfigPage;
