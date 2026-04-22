import React, { useEffect } from 'react';
import { BarChart3 } from 'lucide-react';
import { useDashboardStatsLegacy } from './hooks/useDashboardStats';
import { useCache, useCacheMetrics } from '../../shared/hooks/useCache';
import {
  DashboardStats,
  QuickActions,
  SystemStatus,
  StorageUsageChart,
  BandwidthUsageChart,
  StorageTrendChart
} from './components';

const Dashboard: React.FC = () => {
  const { stats, loading, error } = useDashboardStatsLegacy();
  const { onNavigateAway } = useCache();
  const { logMetrics } = useCacheMetrics();

  // Setup cache optimization
  useEffect(() => {
    // Log cache metrics in development
    if (process.env.NODE_ENV === 'development') {
      const timer = setTimeout(() => {
        logMetrics();
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [logMetrics]);

  // Prefetch data when component unmounts (user navigates away)
  useEffect(() => {
    return () => {
      onNavigateAway();
    };
  }, [onNavigateAway]);

  if (error) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            Trang Chủ Dashboard
          </h1>
          <p className="mt-2 text-gray-600 dark:text-gray-400">
            Tổng quan về hệ thống quản lý văn bản
          </p>
        </div>
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
          <p className="text-red-600 dark:text-red-400">
            Có lỗi xảy ra khi tải dữ liệu: {error}
          </p>
        </div>
      </div>
    );
  }
  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white flex items-center">
          <BarChart3 className="w-8 h-8 mr-3 text-blue-600" />
          Trang Chủ Dashboard
        </h1>        <p className="mt-2 text-gray-600 dark:text-gray-400">
          Tổng quan về hệ thống quản lý văn bản và tổ chức
        </p>
      </div>

      {/* Stats Grid */}
      <DashboardStats stats={stats} loading={loading} />

      {/* Storage Trend Chart - Full Width */}
      <StorageTrendChart />

      {/* Storage and Bandwidth Charts - Side by Side (Smaller) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <StorageUsageChart />
        <BandwidthUsageChart />
      </div>

      {/* Content Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Quick Actions */}
        <QuickActions />

        {/* System Status */}
        <SystemStatus loading={loading} />
      </div>
    </div>
  );
};

export default Dashboard;
