/**
 * useDashboardPermission - Custom hook for dashboard access permission
 * 
 * Note: Permission checking is now handled by EnhancedProtectedRoute in App.tsx
 * This hook is kept for backward compatibility but returns immediate access
 */

import { UseDashboardPermissionReturn } from '../types';

export const useDashboardPermission = (
  _redirectPath: string = '/portal/student-reports'
): UseDashboardPermissionReturn => {
  // Permission is already checked by EnhancedProtectedRoute
  // If we reach this point, user has access
  return {
    hasAccess: true,
    isChecking: false,
  };
};

export default useDashboardPermission;
