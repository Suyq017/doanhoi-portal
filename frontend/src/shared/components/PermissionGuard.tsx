import React, { ReactNode } from 'react';
import { usePermissions } from '../hooks/usePermissions';

interface PermissionGuardProps {
    permission?: string;
    permissions?: string[];
    organizationId?: string;
    fallback?: ReactNode;
    children: ReactNode;
    requireAll?: boolean; // true = cần tất cả permissions, false = chỉ cần 1 permission
}

export const PermissionGuard: React.FC<PermissionGuardProps> = ({
    permission,
    permissions,
    organizationId,
    fallback = null,
    children,
    requireAll = false,
}) => {
    const { hasPermission, hasAnyPermission } = usePermissions();

    let hasAccess = false;

    if (permission) {
        hasAccess = hasPermission(permission, organizationId);
    } else if (permissions) {
        if (requireAll) {
            hasAccess = permissions.every(p => hasPermission(p, organizationId));
        } else {
            hasAccess = hasAnyPermission(permissions, organizationId);
        }
    } else {
        // No permission specified, show children
        hasAccess = true;
    }

    return hasAccess ? <>{children}</> : <>{fallback}</>;
};
