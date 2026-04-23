/**
 * useDashboardData - Consolidated hook for dashboard page data and state
 */

import { useMemo } from 'react';
import { Users, Building } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useDashboardStats } from './useDashboardStats';
import { useDashboardPermission } from './useDashboardPermission';
import { StatsCardData } from '../types';

export interface UseDashboardDataReturn {
  // Permission
  hasAccess: boolean;
  isCheckingPermission: boolean;

  // Data
  statsCards: StatsCardData[];
  isLoading: boolean;
  error: Error | null;

  // Actions
  refetch: () => void;
}

export const useDashboardData = (): UseDashboardDataReturn => {
  const { t } = useTranslation(['dashboard', 'common']);

  // Check permission first
  const { hasAccess, isChecking: isCheckingPermission } = useDashboardPermission();

  // Fetch stats only when permission check is done
  const { stats, isLoading, error, refetch } = useDashboardStats(!isCheckingPermission && hasAccess);

  // Transform stats to card data
  const statsCards = useMemo((): StatsCardData[] => {
    if (!stats) return [];

    return [
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
    ];
  }, [stats, t]);

  return {
    hasAccess,
    isCheckingPermission,
    statsCards,
    isLoading,
    error,
    refetch,
  };
};

export default useDashboardData;
