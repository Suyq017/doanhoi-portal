import { render, screen } from '@testing-library/react';
import StudentReportsPage from '../StudentReportsPage';

const mocks = vi.hoisted(() => ({
  state: {
    report: null as any,
    isLoading: false,
    formatDays: vi.fn((days: number | null | undefined) => (days ?? 0).toString()),
    getStatusDisplay: vi.fn((status: string) => <span>{status}</span>),
    isCtxhAchieved: false,
    displayName: 'Nguyễn Văn A',
    displayEmail: 'sv@example.com',
  },
}));

vi.mock('../hooks', () => ({
  useStudentReportsPage: () => mocks.state,
}));

vi.mock('../../hooks', () => ({
  useStudentReportsPage: () => mocks.state,
}));

vi.mock('../../components', () => ({
  PageHeader: ({ title, subtitle }: any) => (
    <div>
      <h1>{title}</h1>
      <p>{subtitle}</p>
    </div>
  ),
  LoadingState: () => <div data-testid="loading-state" />,
  EmptyState: ({ title, description }: any) => (
    <div data-testid="empty-state">
      <span>{title}</span>
      <span>{description}</span>
    </div>
  ),
  StudentInfoCard: ({ displayName, displayEmail }: any) => (
    <div data-testid="student-info-card">
      <span>{displayName}</span>
      <span>{displayEmail}</span>
    </div>
  ),
  SummaryStatsGrid: ({ achievedText, notAchievedText, isAchieved }: any) => (
    <div data-testid="summary-stats-grid">{isAchieved ? achievedText : notAchievedText}</div>
  ),
  ActivitiesTable: ({ activities }: any) => (
    <div data-testid="activities-table">{String(activities.length)}</div>
  ),
}));

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

describe('StudentReportsPage', () => {
  beforeEach(() => {
    mocks.state.report = null;
    mocks.state.isLoading = false;
    mocks.state.isCtxhAchieved = false;
    mocks.state.displayName = 'Nguyễn Văn A';
    mocks.state.displayEmail = 'sv@example.com';
    mocks.state.formatDays.mockImplementation((days: number | null | undefined) => (days ?? 0).toString());
    mocks.state.getStatusDisplay.mockClear();
  });

  it('shows loading state when the hook is loading', () => {
    mocks.state.isLoading = true;

    render(<StudentReportsPage />);

    expect(screen.getByTestId('loading-state')).toBeTruthy();
  });

  it('shows empty state when no report is returned', () => {
    render(<StudentReportsPage />);

    expect(screen.getByTestId('empty-state')).toBeTruthy();
    expect(screen.getByText('messages.notFound')).toBeTruthy();
  });

  it('renders report data and achievement state when report exists', () => {
    mocks.state.report = {
      student_code: '2212870',
      student_name: 'Nguyễn Văn A',
      student_email: 'sv@example.com',
      total_days_completed: 18,
      activities: [{ id: 'a1' }],
    };
    mocks.state.isCtxhAchieved = true;

    render(<StudentReportsPage />);

    expect(screen.getByTestId('student-info-card')).toBeTruthy();
    expect(screen.getByText('Nguyễn Văn A')).toBeTruthy();
    expect(screen.getByText('sv@example.com')).toBeTruthy();
    expect(screen.getByTestId('summary-stats-grid').textContent).toBe('summary.achieved');
    expect(screen.getByTestId('activities-table').textContent).toBe('1');
  });
});
