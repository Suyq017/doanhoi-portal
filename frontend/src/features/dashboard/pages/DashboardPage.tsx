/**
 * DashboardPage - Main dashboard page component
 * Refactored to use shared patterns and better separation of concerns
 * 
 * Note: Permission checking is handled by EnhancedProtectedRoute in App.tsx
 */

import React from 'react';

// Components
import {
  DashboardHeader,
  StatsGrid,
  S3StorageChart,
  S3TrendChart,
} from '../components';

// Shared Loading component
import { FullPageLoading } from '@/shared/components/Loading';

// Hooks
import { useDashboardData } from '../hooks';

// ========================
// COMPONENT
// ========================

const DashboardPage: React.FC = () => {
  const {
    statsCards,
    isLoading,
  } = useDashboardData();

  // Show loading while loading data (not permission - that's handled by route)
  if (isLoading) {
    return <FullPageLoading />;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <DashboardHeader />

      {/* Stats Grid */}
      <StatsGrid stats={statsCards} columns={4} />

      {/* S3 Storage Statistics */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
        <S3StorageChart />
        <S3TrendChart />
      </div>
    </div>
  );
};

export default DashboardPage;
