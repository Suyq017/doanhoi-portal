import { useState, useEffect } from 'react';
import { usePermissions } from '../../../shared/hooks/usePermissions';

// Cache for CTXH permissions to prevent loading flash on route changes
let cachedCtxhPermissions: CtxhPermissions | null = null;

export interface CtxhPermissions {
  // Activities permissions
  activities: {
    view: boolean;
    create: boolean;
    update: boolean;
    delete: boolean;
    manage_participants: boolean;
  };
  // Categories permissions
  categories: {
    view: boolean;
    create: boolean;
    update: boolean;
    delete: boolean;
  };
  // Reports permissions
  reports: {
    view: boolean;
    generate: boolean;
    export: boolean;
  };
  // Config permissions
  config: {
    view: boolean;
    manage: boolean;
  };
  // Loading state
  loading: boolean;
}

const defaultCtxhPermissions: CtxhPermissions = {
  activities: {
    view: false,
    create: false,
    update: false,
    delete: false,
    manage_participants: false,
  },
  categories: {
    view: false,
    create: false,
    update: false,
    delete: false,
  },
  reports: {
    view: false,
    generate: false,
    export: false,
  },
  config: {
    view: false,
    manage: false,
  },
  loading: true,
};

export const useCtxhPermissions = () => {
  const permissions = usePermissions();
  // Use cached permissions if available to prevent loading flash
  const [ctxhPermissions, setCtxhPermissions] = useState<CtxhPermissions>(
    cachedCtxhPermissions || defaultCtxhPermissions
  );

  useEffect(() => {
    const checkPermissions = async () => {
      try {
        // Only show loading if we don't have cached permissions
        if (!cachedCtxhPermissions) {
          setCtxhPermissions(prev => ({ ...prev, loading: true }));
        }
        
        // If permissions are still loading, wait
        if (permissions.permissionsLoading) {
          return;
        }
        
        // Activity permissions - DON'T include hasCtxhAccess
        const canViewActivities = 
          permissions.hasPermission('activity.view', permissions.currentOrganizationId) ||
          permissions.hasPermission('ctxh.activities.view', permissions.currentOrganizationId);
        
        const canCreateActivities = 
          permissions.hasPermission('activity.create', permissions.currentOrganizationId) ||
          permissions.hasPermission('ctxh.activities.create', permissions.currentOrganizationId);
        
        const canUpdateActivities = 
          permissions.hasPermission('activity.update', permissions.currentOrganizationId) ||
          permissions.hasPermission('ctxh.activities.update', permissions.currentOrganizationId);
        
        const canDeleteActivities = 
          permissions.hasPermission('activity.delete', permissions.currentOrganizationId) ||
          permissions.hasPermission('ctxh.activities.delete', permissions.currentOrganizationId);

        const canManageParticipants = 
          permissions.hasPermission('ctxh.activities.manage_participants', permissions.currentOrganizationId);

        // Category permissions - DON'T include hasCtxhAccess
        const canViewCategories = 
          permissions.hasPermission('category.view', permissions.currentOrganizationId) ||
          permissions.hasPermission('ctxh.categories.view', permissions.currentOrganizationId);
        
        const canCreateCategories = 
          permissions.hasPermission('category.create', permissions.currentOrganizationId) ||
          permissions.hasPermission('ctxh.categories.create', permissions.currentOrganizationId);
        
        const canUpdateCategories = 
          permissions.hasPermission('category.update', permissions.currentOrganizationId) ||
          permissions.hasPermission('ctxh.categories.update', permissions.currentOrganizationId);
        
        const canDeleteCategories = 
          permissions.hasPermission('category.delete', permissions.currentOrganizationId) ||
          permissions.hasPermission('ctxh.categories.delete', permissions.currentOrganizationId);

        // Reports permissions - DON'T include hasCtxhAccess
        // Everyone can view their own reports, no permission check needed
        const canViewReports = true;
        
        const canGenerateReports = 
          permissions.hasPermission('reports.generate', permissions.currentOrganizationId) ||
          permissions.hasPermission('ctxh.reports.generate', permissions.currentOrganizationId);

        const canExportReports = 
          permissions.hasPermission('ctxh.reports.export', permissions.currentOrganizationId);

        // Config permissions - DON'T include hasCtxhAccess
        const canViewConfig = 
          permissions.hasPermission('config.view', permissions.currentOrganizationId) ||
          permissions.hasPermission('ctxh.config.view', permissions.currentOrganizationId);
        
        const canManageConfig = 
          permissions.hasPermission('config.manage', permissions.currentOrganizationId) ||
          permissions.hasPermission('ctxh.config.manage', permissions.currentOrganizationId);

        const newPermissions: CtxhPermissions = {
          activities: {
            view: canViewActivities,
            create: canCreateActivities,
            update: canUpdateActivities,
            delete: canDeleteActivities,
            manage_participants: canManageParticipants,
          },
          categories: {
            view: canViewCategories,
            create: canCreateCategories,
            update: canUpdateCategories,
            delete: canDeleteCategories,
          },
          reports: {
            view: canViewReports,
            generate: canGenerateReports,
            export: canExportReports,
          },
          config: {
            view: canViewConfig,
            manage: canManageConfig,
          },
          loading: false,
        };

        // Cache the permissions
        cachedCtxhPermissions = newPermissions;
        setCtxhPermissions(newPermissions);

      } catch (error) {
        console.error('[useCtxhPermissions] Error checking permissions:', error);
        setCtxhPermissions(prev => ({ ...prev, loading: false }));
      }
    };

    checkPermissions();
  }, [permissions.permissionsLoading, permissions.currentOrganizationId, permissions.userPermissions]);

  return ctxhPermissions;
};