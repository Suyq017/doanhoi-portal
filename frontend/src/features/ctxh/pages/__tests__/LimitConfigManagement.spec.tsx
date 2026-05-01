import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import LimitConfigManagement from '../LimitConfigManagement';

const mocks = vi.hoisted(() => ({
  handleCreateClick: vi.fn(),
  handleEditClick: vi.fn(),
  handleDeleteClick: vi.fn(),
  handleRestoreClick: vi.fn(),
  handleFormClose: vi.fn(),
  handleFormSave: vi.fn(),
  handleConfirmAction: vi.fn(),
  handleCancelAction: vi.fn(),
  handleShowToast: vi.fn(),
  hideToast: vi.fn(),
  state: {
    selectedConfig: null as any,
    isFormOpen: false,
    isConfirmDialogOpen: false,
    confirmAction: null as any,
    isCreating: false,
    isUpdating: false,
    isDeleting: false,
    isRestoring: false,
    dialogContent: { title: '', message: '', variant: 'danger' as const },
    toasts: [] as any[],
  },
}));

vi.mock('../../hooks', () => ({
  useLimitConfigManagement: () => ({
    ...mocks.state,
    handleCreateClick: mocks.handleCreateClick,
    handleEditClick: mocks.handleEditClick,
    handleDeleteClick: mocks.handleDeleteClick,
    handleRestoreClick: mocks.handleRestoreClick,
    handleFormClose: mocks.handleFormClose,
    handleFormSave: mocks.handleFormSave,
    handleConfirmAction: mocks.handleConfirmAction,
    handleCancelAction: mocks.handleCancelAction,
    handleShowToast: mocks.handleShowToast,
    hideToast: mocks.hideToast,
  }),
}));

vi.mock('../../components/shared', () => ({
  LimitConfigManagementHeader: ({ title, subtitle, onCreateClick, createButtonLabel }: any) => (
    <div>
      <h1>{title}</h1>
      <p>{subtitle}</p>
      <button onClick={onCreateClick}>{createButtonLabel}</button>
    </div>
  ),
  ToastContainer: ({ toasts }: any) => <div data-testid="toast-container">{String(toasts.length)}</div>,
}));

vi.mock('../../components/limit-config/LimitConfigList', () => ({
  default: () => <div data-testid="limit-config-list" />,
}));

vi.mock('../../components/limit-config/LimitConfigForm', () => ({
  default: ({ isOpen, loading }: any) => (
    <div data-testid="limit-config-form" data-open={String(isOpen)} data-loading={String(loading)} />
  ),
}));

vi.mock('../../../../shared/components/ConfirmDialog', () => ({
  default: ({ isOpen, title, message, confirmText, loading }: any) => (
    <div
      data-testid="confirm-dialog"
      data-open={String(isOpen)}
      data-title={title}
      data-message={message}
      data-confirm-text={confirmText}
      data-loading={String(loading)}
    />
  ),
}));

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (k: string) => k }),
}));

describe('LimitConfigManagement', () => {
  beforeEach(() => {
    mocks.handleCreateClick.mockReset();
    mocks.handleEditClick.mockReset();
    mocks.handleDeleteClick.mockReset();
    mocks.handleRestoreClick.mockReset();
    mocks.handleFormClose.mockReset();
    mocks.handleFormSave.mockReset();
    mocks.handleConfirmAction.mockReset();
    mocks.handleCancelAction.mockReset();
    mocks.handleShowToast.mockReset();
    mocks.hideToast.mockReset();

    mocks.state.selectedConfig = null;
    mocks.state.isFormOpen = false;
    mocks.state.isConfirmDialogOpen = false;
    mocks.state.confirmAction = null;
    mocks.state.isCreating = false;
    mocks.state.isUpdating = false;
    mocks.state.isDeleting = false;
    mocks.state.isRestoring = false;
    mocks.state.dialogContent = { title: '', message: '', variant: 'danger' };
    mocks.state.toasts = [];
  });

  it('renders header and opens create flow', async () => {
    render(<LimitConfigManagement />);

    expect(screen.getByRole('heading', { name: 'limitConfig.title' })).toBeTruthy();
    expect(screen.getByText('limitConfig.subtitle')).toBeTruthy();

    const user = userEvent.setup();
    await user.click(screen.getByRole('button', { name: 'limitConfig.create' }));

    expect(mocks.handleCreateClick).toHaveBeenCalledTimes(1);
  });

  it('passes form and confirm dialog state through to children', () => {
    mocks.state.selectedConfig = { id: 'cfg-1', name: 'Giới hạn 1' };
    mocks.state.isFormOpen = true;
    mocks.state.isConfirmDialogOpen = true;
    mocks.state.confirmAction = 'delete';
    mocks.state.isCreating = true;
    mocks.state.dialogContent = {
      title: 'limitConfig.deleteConfirm',
      message: 'limitConfig.deleteMessage\n\nlimitConfig.organization: N/A',
      variant: 'danger',
    };

    render(<LimitConfigManagement />);

    expect(screen.getByTestId('limit-config-form').getAttribute('data-open')).toBe('true');
    expect(screen.getByTestId('limit-config-form').getAttribute('data-loading')).toBe('true');
    expect(screen.getByTestId('confirm-dialog').getAttribute('data-open')).toBe('true');
    expect(screen.getByTestId('confirm-dialog').getAttribute('data-confirm-text')).toBe('limitConfig.delete');
  });

  it('switches confirm text when restoring a config', () => {
    mocks.state.selectedConfig = { id: 'cfg-2', name: 'Giới hạn 2' };
    mocks.state.isConfirmDialogOpen = true;
    mocks.state.confirmAction = 'restore';
    mocks.state.isRestoring = true;
    mocks.state.dialogContent = {
      title: 'limitConfig.restoreConfirm',
      message: 'limitConfig.restoreMessage\n\nlimitConfig.organization: N/A',
      variant: 'info',
    };

    render(<LimitConfigManagement />);

    expect(screen.getByTestId('confirm-dialog').getAttribute('data-confirm-text')).toBe('limitConfig.restore');
    expect(screen.getByTestId('confirm-dialog').getAttribute('data-loading')).toBe('true');
  });
});
