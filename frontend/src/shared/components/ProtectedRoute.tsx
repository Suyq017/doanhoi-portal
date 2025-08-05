import React, { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { Shield } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { usePermissions } from '../hooks/usePermissions';

interface ProtectedRouteProps {
    children: ReactNode;
    requiredPermission?: string;
    requiredPermissions?: string[];
    requireAll?: boolean;
    fallbackPath?: string;
    showAccessDenied?: boolean;
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({
    children,
    requiredPermission,
    requiredPermissions,
    requireAll = false,
    fallbackPath = '/dashboard',
    showAccessDenied = true,
}) => {
    const { t } = useTranslation('common');
    const { hasPermission, hasAnyPermission, user } = usePermissions();
    const location = useLocation();

    // If user is not authenticated, redirect to login
    if (!user) {
        return <Navigate to="/login" state={{ from: location }} replace />;
    }

    let hasAccess = true;

    if (requiredPermission) {
        hasAccess = hasPermission(requiredPermission);
    } else if (requiredPermissions) {
        if (requireAll) {
            hasAccess = requiredPermissions.every(permission => hasPermission(permission));
        } else {
            hasAccess = hasAnyPermission(requiredPermissions);
        }
    }

    if (!hasAccess) {
        if (showAccessDenied) {
            return (
                <div className="flex items-center justify-center min-h-[400px]">
                    <div className="text-center">
                        <Shield className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                        <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                            {t('errors.accessDenied')}
                        </h3>
                        <p className="text-gray-500 dark:text-gray-400 mb-4">
                            {t('errors.noPermissionToAccess')}
                        </p>
                        <button
                            onClick={() => window.history.back()}
                            className="px-4 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 transition-colors"
                        >
                            {t('actions.goBack')}
                        </button>
                    </div>
                </div>
            );
        } else {
            return <Navigate to={fallbackPath} replace />;
        }
    }

    return <>{children}</>;
};
