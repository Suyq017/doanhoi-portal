import { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { PermissionLoadingScreen } from './PermissionLoadingScreen';
import { AccessDeniedScreen } from './AccessDeniedScreen';

interface EnhancedProtectedRouteProps {
    children: ReactNode;
    requiredPermissions?: string[];
    requireAllPermissions?: boolean; // true = AND, false = OR
    fallbackComponent?: ReactNode;
}

export const EnhancedProtectedRoute = ({
    children,
    requiredPermissions = [],
    requireAllPermissions = true,
    fallbackComponent
}: EnhancedProtectedRouteProps) => {
    const { auth, hasPermission } = useAuth();
    const location = useLocation();

    // Show loading screen while checking authentication
    if (auth.isLoading) {
        return <PermissionLoadingScreen />;
    }

    // Redirect to login if not authenticated
    if (!auth.isAuthenticated) {
        return <Navigate to="/login" state={{ from: location }} replace />;
    }
    // Check permissions if required
    if (requiredPermissions.length > 0) {
        // Show loading while permissions are being fetched
        if (auth.permissionsLoading) {
            return <PermissionLoadingScreen />;
        }

        const hasRequiredPermissions = requireAllPermissions
            ? requiredPermissions.every(permission => hasPermission(permission))
            : requiredPermissions.some(permission => hasPermission(permission));

        if (!hasRequiredPermissions) {
            return fallbackComponent || <AccessDeniedScreen requiredPermissions={requiredPermissions} />;
        }
    }

    return <>{children}</>;
};

export default EnhancedProtectedRoute;
