/**
 * useSystemConfigPermissions - Hook for system config permission management
 */

import { useMemo } from 'react';
import { useAuth } from '../../auth/context/AuthContext';
import type { UseSystemConfigPermissionsReturn } from '../types';

export const useSystemConfigPermissions = (): UseSystemConfigPermissionsReturn => {
    const { hasPermission } = useAuth();

    return useMemo(() => ({
        canAccess: hasPermission('system-config.access'),
        canEdit: hasPermission('system-config.edit'),
        canViewS3Config: hasPermission('system-config.s3.view'),
        canEditS3Config: hasPermission('system-config.s3.edit'),
    }), [hasPermission]);
};

export default useSystemConfigPermissions;
