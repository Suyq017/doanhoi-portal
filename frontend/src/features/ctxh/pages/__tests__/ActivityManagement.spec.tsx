import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ActivityManagement from '../ActivityManagement';

const mocks = vi.hoisted(() => ({
  handleCreateActivity: vi.fn(),
  handleEditActivity: vi.fn(),
  handleDeleteActivity: vi.fn(),
  handleViewActivity: vi.fn(),
  handleActivitySubmit: vi.fn(),
  handleCloseForm: vi.fn(),
  handleShowToast: vi.fn(),
  hideToast: vi.fn(),
  state: {
    showActivityForm: false,
    editingActivity: null as any,
    checkingPermissions: false,
    canCreateActivity: true,
    permissions: { create: true, update: true, delete: true },
    toasts: [] as any[],
    confirmDialog: null as any,
  },
}));

vi.mock('../../hooks', () => ({
  useActivityManagement: () => ({
    ...mocks.state,
    handleCreateActivity: mocks.handleCreateActivity,
    handleEditActivity: mocks.handleEditActivity,
    handleDeleteActivity: mocks.handleDeleteActivity,
    handleViewActivity: mocks.handleViewActivity,
    handleActivitySubmit: mocks.handleActivitySubmit,
    handleCloseForm: mocks.handleCloseForm,
    handleShowToast: mocks.handleShowToast,
    hideToast: mocks.hideToast,
  }),
}));

vi.mock('../../components/ActivityForm', () => ({
  default: () => <div data-testid="activity-form" />,
}));

vi.mock('../../components/activity/ActivityList', () => ({
  default: () => <div data-testid="activity-list" />,
}));

vi.mock('../../components/shared', () => ({
  ActivityManagementHeader: ({ title, subtitle, canCreate, checkingPermissions, onCreateClick, createButtonLabel }: any) => (
    <div>
      <h1>{title}</h1>
      <p>{subtitle}</p>
      {!checkingPermissions && canCreate ? (
        <button onClick={onCreateClick}>{createButtonLabel}</button>
      ) : null}
    </div>
  ),
  ToastContainer: () => <div data-testid="toast-container" />,
}));

vi.mock('../../../../shared/components', () => ({
  ConfirmDialog: () => <div data-testid="confirm-dialog" />,
}));

// Mock i18n
vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (k: string) => k }),
}));

describe('ActivityManagement', () => {
  beforeEach(() => {
    mocks.handleCreateActivity.mockReset();
    mocks.handleEditActivity.mockReset();
    mocks.handleDeleteActivity.mockReset();
    mocks.handleViewActivity.mockReset();
    mocks.handleActivitySubmit.mockReset();
    mocks.handleCloseForm.mockReset();
    mocks.handleShowToast.mockReset();
    mocks.hideToast.mockReset();

    mocks.state.showActivityForm = false;
    mocks.state.editingActivity = null;
    mocks.state.checkingPermissions = false;
    mocks.state.canCreateActivity = true;
    mocks.state.permissions = { create: true, update: true, delete: true };
    mocks.state.toasts = [];
    mocks.state.confirmDialog = null;
  });

  it('renders header text and create button, then calls handler when clicked', async () => {
    render(<ActivityManagement />);

    expect(screen.getByRole('heading', { name: 'activity.title' })).not.toBeNull();
    expect(screen.getByText('activity.subtitle')).not.toBeNull();

    const btn = screen.getByRole('button', { name: 'activity.create' });
    expect(btn).toBeTruthy();

    const user = userEvent.setup();
    await user.click(btn);

    expect(mocks.handleCreateActivity).toHaveBeenCalledTimes(1);
  });

  it('hides create button while permissions are checking', () => {
    mocks.state.checkingPermissions = true;

    render(<ActivityManagement />);

    expect(screen.queryByRole('button', { name: 'activity.create' })).toBeNull();
  });

  it('hides create button when user cannot create activities', () => {
    mocks.state.canCreateActivity = false;

    render(<ActivityManagement />);

    expect(screen.queryByRole('button', { name: 'activity.create' })).toBeNull();
  });
});
