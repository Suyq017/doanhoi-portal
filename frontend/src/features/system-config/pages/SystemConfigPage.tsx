/**
 * SystemConfigPage - Refactored system config page with separation of concerns
 * 
 * Principles applied:
 * 1. Separation of Concerns: Logic in hooks, UI in components
 * 2. Reusable Components: Composed from smaller, reusable pieces
 * 3. Custom Hooks: useSystemConfigPage consolidates all state management
 * 4. Type Safety: Strong typing for all props and return values
 * 
 * Note: Permission checking is handled by EnhancedProtectedRoute in App.tsx
 */

import React from 'react';
import AwsS3ConfigSection from '../../dashboard/components/AwsS3ConfigSection';

// Hooks
import { useSystemConfigPage } from '../hooks';

// Components
import { SystemConfigHeader } from '../components';

/**
 * Main SystemConfigPage component
 */
const SystemConfigPage: React.FC = () => {
    // Use unified page hook for all state management
    const {
        isRefreshing,
        handleRefresh,
    } = useSystemConfigPage();

    return (
        <div className="p-6 space-y-6">
            {/* Header */}
            <SystemConfigHeader
                isRefreshing={isRefreshing}
                onRefresh={handleRefresh}
            />

            {/* AWS S3 Configuration Section */}
            <AwsS3ConfigSection />
        </div>
    );
};

export default SystemConfigPage;
