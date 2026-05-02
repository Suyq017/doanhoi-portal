import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import CategoryManagement from '../CategoryManagement';

const mocks = vi.hoisted(() => ({
  handleCreateClick: vi.fn(),
  handleEditClick: vi.fn(),
  handleDeleteClick: vi.fn(),
  handleViewDetailClick: vi.fn(),
  handleFormClose: vi.fn(),
  handleFormSave: vi.fn(),
  handleConfirmAction: vi.fn(),
  handleCancelAction: vi.fn(),
  handleShowToast: vi.fn(),
  handleDetailModalClose: vi.fn(),
  hideToast: vi.fn(),
  state: {
    selectedCategory: null as any,
    isFormOpen: false,
    isConfirmDialogOpen: false,
    isDetailModalOpen: false,
    isCreating: false,
    isUpdating: false,
    permissions: { create: true, update: true, delete: true },
    toasts: [] as any[],
    dialogContent: { title: '', message: '', variant: 'warning' as const },
  },
}));

vi.mock('../../hooks', () => ({
  useCategoryManagement: () => ({
    ...mocks.state,
    handleCreateClick: mocks.handleCreateClick,
    handleEditClick: mocks.handleEditClick,
    handleDeleteClick: mocks.handleDeleteClick,
    handleViewDetailClick: mocks.handleViewDetailClick,
    handleFormClose: mocks.handleFormClose,
    handleFormSave: mocks.handleFormSave,
    handleConfirmAction: mocks.handleConfirmAction,
    handleCancelAction: mocks.handleCancelAction,
    handleShowToast: mocks.handleShowToast,
    handleDetailModalClose: mocks.handleDetailModalClose,
    hideToast: mocks.hideToast,
  }),
}));

vi.mock('../../components/shared', () => ({
  CategoryManagementHeader: ({ title, subtitle, canCreate, onCreateClick, createButtonLabel }: any) => (
    <div>
      <h1>{title}</h1>
      <p>{subtitle}</p>
      {canCreate ? <button onClick={onCreateClick}>{createButtonLabel}</button> : null}
    </div>
  ),
  ToastContainer: ({ toasts }: any) => <div data-testid="toast-container">{String(toasts.length)}</div>,
}));

vi.mock('../../components/category/CategoryList', () => ({
  default: () => <div data-testid="category-list" />,
}));

vi.mock('../../components/category/CategoryForm', () => ({
  default: ({ isOpen, loading }: any) => (
    <div data-testid="category-form" data-open={String(isOpen)} data-loading={String(loading)} />
  ),
}));

vi.mock('../../components/category/CategoryDetailModal', () => ({
  default: ({ isOpen }: any) => <div data-testid="category-detail-modal" data-open={String(isOpen)} />,
}));

vi.mock('../../../shared/components/ConfirmDialog', () => ({
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

describe('CategoryManagement', () => {
  beforeEach(() => {
    mocks.handleCreateClick.mockReset();
    mocks.handleEditClick.mockReset();
    mocks.handleDeleteClick.mockReset();
    mocks.handleViewDetailClick.mockReset();
    mocks.handleFormClose.mockReset();
    mocks.handleFormSave.mockReset();
    mocks.handleConfirmAction.mockReset();
    mocks.handleCancelAction.mockReset();
    mocks.handleShowToast.mockReset();
    mocks.handleDetailModalClose.mockReset();
    mocks.hideToast.mockReset();

    mocks.state.selectedCategory = null;
    mocks.state.isFormOpen = false;
    mocks.state.isConfirmDialogOpen = false;
    mocks.state.isDetailModalOpen = false;
    mocks.state.isCreating = false;
    mocks.state.isUpdating = false;
    mocks.state.permissions = { create: true, update: true, delete: true };
    mocks.state.toasts = [];
    mocks.state.dialogContent = { title: '', message: '', variant: 'warning' };
  });

  it('renders page header and opens create flow', async () => {
    render(<CategoryManagement />);

    expect(screen.getByRole('heading', { name: 'category.title' })).toBeTruthy();
    expect(screen.getByText('category.subtitle')).toBeTruthy();

    const user = userEvent.setup();
    await user.click(screen.getByRole('button', { name: 'category.create' }));

    expect(mocks.handleCreateClick).toHaveBeenCalledTimes(1);
  });

  it('hides create button when permission is denied', () => {
    mocks.state.permissions.create = false;

    render(<CategoryManagement />);

    expect(screen.queryByRole('button', { name: 'category.create' })).toBeNull();
  });

  it('passes modal state to form and detail dialog', () => {
    mocks.state.isFormOpen = true;
    mocks.state.isDetailModalOpen = true;
    mocks.state.selectedCategory = { id: 'cat-1', name: 'Tình nguyện' };
    mocks.state.dialogContent = {
      title: 'category.delete',
      message: 'category.deleteConfirm "Tình nguyện"?',
      variant: 'danger',
    };
    mocks.state.isConfirmDialogOpen = true;
    mocks.state.isCreating = true;

    render(<CategoryManagement />);

    expect(screen.getByTestId('category-form').getAttribute('data-open')).toBe('true');
    expect(screen.getByTestId('category-form').getAttribute('data-loading')).toBe('true');
    expect(screen.getByTestId('category-detail-modal').getAttribute('data-open')).toBe('true');
    expect(screen.getByText('category.delete')).toBeTruthy();
    expect(screen.getByText('category.deleteConfirm "Tình nguyện"?')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'common:actions.confirm' })).toBeTruthy();
  });
});
