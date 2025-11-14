import React, { useEffect } from 'react';
import { Users, Building } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '../auth/context/AuthContext';
import { dashboardService } from './services/dashboardService';
import { S3StorageChart } from './components/S3StorageChart';
import { S3TrendChart } from './components/S3TrendChart';

const Dashboard: React.FC = () => {
  const { t } = useTranslation(['dashboard', 'common']);
  const navigate = useNavigate();
  const auth = useAuth();
  const [isCheckingPermission, setIsCheckingPermission] = React.useState(true);

  // Fetch dashboard stats using TanStack Query
  const { data: stats, isLoading: isLoadingStats } = useQuery({
    queryKey: ['dashboardStats'],
    queryFn: () => dashboardService.getStats(),
    enabled: !isCheckingPermission, // Only fetch when permission check is done
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  // Check dashboard.access permission on mount
  useEffect(() => {
    const hasDashboardAccess = auth.hasPermission('dashboard.access');

    if (!hasDashboardAccess) {
      console.log('User does not have dashboard.access permission, redirecting to student-reports');
      navigate('/portal/student-reports', { replace: true });
    } else {
      setIsCheckingPermission(false);
    }
  }, [auth, navigate]);

  // Show loading while checking permission
  if (isCheckingPermission || isLoadingStats) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-doan-600 mx-auto"></div>
          <p className="mt-4 text-gray-600 dark:text-gray-400">
            {t('common:loading')}
          </p>
        </div>
      </div>
    );
  }

  // Prepare stats data for display
  const statsData = stats ? [
    {
      name: t('dashboard:stats.totalMembers'),
      value: stats.totalUsers.toLocaleString(),
      icon: Users,
      color: 'bg-doan-500',
    },
    {
      name: t('dashboard:stats.doanMembers'),
      value: stats.doanVienCount.toLocaleString(),
      icon: Users,
      color: 'bg-doan-500',
    },
    {
      name: t('dashboard:stats.hoiMembers'),
      value: stats.hoiVienCount.toLocaleString(),
      icon: Users,
      color: 'bg-hsv-500',
    },
    {
      name: t('dashboard:stats.organizations'),
      value: stats.organizationCount.toLocaleString(),
      icon: Building,
      color: 'bg-gray-500',
    },
  ] : [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
          {t('dashboard:title')}
        </h1>
        <p className="mt-2 text-gray-600 dark:text-gray-400">
          {t('dashboard:subtitle')}
        </p>
      </div>


      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
        {statsData.map((stat) => {
          const Icon = stat.icon;
          return (
            <div
              key={stat.name}
              className="p-6 bg-white border border-gray-200 rounded-lg shadow-sm dark:bg-gray-800 dark:border-gray-700"
            >
              <div className="flex items-center">
                <div className={`p-3 rounded-lg ${stat.color}`}>
                  <Icon className="w-6 h-6 text-white" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                    {stat.name}
                  </p>
                  <p className="text-2xl font-semibold text-gray-900 dark:text-white">
                    {stat.value}
                  </p>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* S3 Storage Statistics */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
        {/* S3 Storage Distribution */}
        <S3StorageChart />

        {/* S3 Trend Chart */}
        <S3TrendChart />
      </div>
    </div>
  );
};

export default Dashboard;
