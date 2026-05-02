import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import ActivitiesTable from '../ActivitiesTable';

// Minimal i18n mock to avoid noisy warnings
vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (k: string) => k })
}));

describe('ActivitiesTable', () => {
  it('renders rows for activities', () => {
    const activities = [
      {
        id: 1,
        activity_name: 'Activity One',
        category_name: 'Cat A',
        days_completed: 1.5,
        status: 'COMPLETED',
        completed_date: '2026-01-01',
        note: 'Note A'
      },
      {
        id: 2,
        activity_name: 'Activity Two',
        category_name: 'Cat B',
        days_completed: 0,
        status: 'REGISTERED',
        completed_date: null,
        note: ''
      }
    ];

    const formatDays = (d: number | null | undefined) => (d === null || d === undefined ? '0' : `${d}`);
    const getStatusDisplay = (s: string) => <span>{s}</span>;

    render(<ActivitiesTable activities={activities as any} formatDays={formatDays} getStatusDisplay={getStatusDisplay as any} />);

    expect(screen.getByText('Activity One')).toBeInTheDocument();
    expect(screen.getByText('Cat A')).toBeInTheDocument();
    expect(screen.getByText('1.5')).toBeInTheDocument();

    expect(screen.getByText('Activity Two')).toBeInTheDocument();
    expect(screen.getByText('Cat B')).toBeInTheDocument();
    expect(screen.getByText('0')).toBeInTheDocument();
  });
});
