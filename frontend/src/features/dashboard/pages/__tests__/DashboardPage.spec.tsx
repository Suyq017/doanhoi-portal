import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';

const mockUseDashboardData = vi.fn();

vi.mock('../../hooks', () => ({
  useDashboardData: () => mockUseDashboardData(),
}));

vi.mock('../../components', () => ({
  DashboardHeader: () => <div>DashboardHeader</div>,
  StatsGrid: ({ stats, columns }: { stats: unknown[]; columns: number }) => (
    <div>
      <div>StatsGrid</div>
      <div>stats-count:{stats.length}</div>
      <div>columns:{columns}</div>
    </div>
  ),
  S3StorageChart: () => <div>S3StorageChart</div>,
  S3TrendChart: () => <div>S3TrendChart</div>,
}));

vi.mock('@/shared/components/Loading', () => ({
  FullPageLoading: () => <div>FullPageLoading</div>,
}));

import DashboardPage from '../DashboardPage';

describe('DashboardPage', () => {
  beforeEach(() => {
    mockUseDashboardData.mockReturnValue({
      statsCards: [],
      isLoading: false,
      hasAccess: true,
      isCheckingPermission: false,
      error: null,
      refetch: vi.fn(),
    });
  });

  it('shows full page loading while dashboard data is loading', () => {
    mockUseDashboardData.mockReturnValue({
      statsCards: [],
      isLoading: true,
      hasAccess: true,
      isCheckingPermission: false,
      error: null,
      refetch: vi.fn(),
    });

    render(<DashboardPage />);

    expect(screen.getByText('FullPageLoading')).toBeInTheDocument();
  });

  it('renders dashboard header, stats grid and charts after data loaded', () => {
    mockUseDashboardData.mockReturnValue({
      statsCards: [
        { name: 'A', value: '1', icon: () => null, color: 'bg-doan-500' },
        { name: 'B', value: '2', icon: () => null, color: 'bg-doan-500' },
      ],
      isLoading: false,
      hasAccess: true,
      isCheckingPermission: false,
      error: null,
      refetch: vi.fn(),
    });

    render(<DashboardPage />);

    expect(screen.getByText('DashboardHeader')).toBeInTheDocument();
    expect(screen.getByText('StatsGrid')).toBeInTheDocument();
    expect(screen.getByText('stats-count:2')).toBeInTheDocument();
    expect(screen.getByText('columns:4')).toBeInTheDocument();
    expect(screen.getByText('S3StorageChart')).toBeInTheDocument();
    expect(screen.getByText('S3TrendChart')).toBeInTheDocument();
  });
});
