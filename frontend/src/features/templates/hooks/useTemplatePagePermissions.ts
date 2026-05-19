import { useMemo } from 'react';
import { usePermissions, createComponentPermissions, ComponentPermissions } from '../../../shared';

export interface TemplatePagePermissions extends ComponentPermissions {
    canManage: boolean;          // templates.manage
    canAccessAdmin: boolean;      // templates.admin.access
}

export const useTemplatePagePermissions = (): TemplatePagePermissions => {
    const permissions = usePermissions();

    return useMemo(() => {
        // Check individual permissions
        const canAccess = permissions.canAccessTemplates();
        const canManage = permissions.canManageTemplates();
        const canAccessAdmin = permissions.canAccessTemplatesAdmin();

        // Create base component permissions
        // For templates, we map manage to create/edit/delete since that's the granular level available
        const basePermissions = createComponentPermissions({
            canCreate: canManage,
            canView: canAccess,
            canEdit: canManage,
            canDelete: canManage,
            canExport: false, // Templates don't have export permission
        });

        return {
            ...basePermissions,
            canManage,
            canAccessAdmin,
        };
    }, [permissions]);
};
