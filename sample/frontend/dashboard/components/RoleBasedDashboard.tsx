import React from 'react';
import { Navigate } from 'react-router-dom';
import { usePermissions } from '../../../shared/hooks/usePermissions';
import { PERMISSIONS } from '../../../shared/utils/permissions';
import DashboardPage from '../DashboardPage';

const RoleBasedDashboard: React.FC = () => {
    const { hasPermission } = usePermissions();

    // If user doesn't have dashboard permission, redirect to organizations
    if (!hasPermission(PERMISSIONS.VIEW_DASHBOARD)) {
        return <Navigate to="/organizations" replace />;
    }

    return <DashboardPage />;
};

export default RoleBasedDashboard;
