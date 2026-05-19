import { renderHook } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useDashboardData } from '../useDashboardData';

const mockUseDashboardPermission = vi.fn();
const mockUseDashboardStats = vi.fn();

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}));

vi.mock('../useDashboardPermission', () => ({
  useDashboardPermission: () => mockUseDashboardPermission(),
}));

vi.mock('../useDashboardStats', () => ({
  useDashboardStats: (enabled: boolean) => mockUseDashboardStats(enabled),
}));

describe('useDashboardData', () => {
  beforeEach(() => {
    mockUseDashboardPermission.mockReturnValue({
      hasAccess: true,
      isChecking: false,
    });

    mockUseDashboardStats.mockReturnValue({
      stats: undefined,
      isLoading: false,
      error: null,
      refetch: vi.fn(),
    });
  });

  it('returns empty stats cards when stats data is unavailable', () => {
    const { result } = renderHook(() => useDashboardData());

    expect(result.current.statsCards).toEqual([]);
    expect(result.current.hasAccess).toBe(true);
    expect(result.current.isCheckingPermission).toBe(false);
  });

  it('transforms dashboard stats into 4 cards with localized keys', () => {
    mockUseDashboardStats.mockReturnValue({
      stats: {
        totalUsers: 1000,
        doanVienCount: 400,
        hoiVienCount: 300,
        organizationCount: 50,
        totalUserGrowth: '10%',
        doanVienGrowth: '5%',
        hoiVienGrowth: '3%',
        organizationGrowth: '1%',
      },
      isLoading: false,
      error: null,
      refetch: vi.fn(),
    });

    const { result } = renderHook(() => useDashboardData());

    expect(result.current.statsCards).toHaveLength(4);
    expect(result.current.statsCards[0]).toMatchObject({
      name: 'dashboard:stats.totalMembers',
      value: '1,000',
      color: 'bg-doan-500',
    });
    expect(result.current.statsCards[3]).toMatchObject({
      name: 'dashboard:stats.organizations',
      value: '50',
      color: 'bg-gray-500',
    });
  });

  it('disables stats query while permission is still checking', () => {
    mockUseDashboardPermission.mockReturnValue({
      hasAccess: true,
      isChecking: true,
    });

    renderHook(() => useDashboardData());

    expect(mockUseDashboardStats).toHaveBeenCalledWith(false);
  });
});
