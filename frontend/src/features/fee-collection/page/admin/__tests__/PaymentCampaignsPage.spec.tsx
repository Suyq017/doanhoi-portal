import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

// Mock i18n to return key strings directly
vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: (s: string) => s }) }));

// Mutable mock for the hook so tests can override return values
const defaultHookReturn = {
  showCreateModal: false,
  showEditModal: false,
  editingCampaign: null,
  accessibleOrganizations: [],
  pageLoading: false,
  orgsError: null,
  handleCreateCampaign: vi.fn(),
  handleEditCampaign: vi.fn(),
  handleCloseModals: vi.fn(),
  handleCampaignSaved: vi.fn(),
  toasts: [],
  showSuccess: vi.fn(),
  hideToast: vi.fn(),
};

const mockUsePaymentCampaignsPage = vi.fn(() => ({ ...defaultHookReturn }));
vi.mock('../../../hooks', () => ({
  usePaymentCampaignsPage: () => mockUsePaymentCampaignsPage(),
}));

beforeEach(() => {
  mockUsePaymentCampaignsPage.mockReturnValue({ ...defaultHookReturn });
});

// Lightweight mocks for child components to keep test focused
vi.mock('../../../components/admin/PaymentCampaignList', () => ({
  __esModule: true,
  default: () => <div>PaymentCampaignList</div>,
}));
vi.mock('../../../components/admin/PaymentCampaignForm', () => ({
  __esModule: true,
  default: (props: any) => (
    <div>
      <div>PaymentCampaignForm</div>
      <button onClick={() => props.onSave && props.onSave({ id: 'saved' })}>Save</button>
      <button onClick={() => props.onCancel && props.onCancel()}>Cancel</button>
    </div>
  ),
}));
vi.mock('../../../components/admin/UserPermissionInfo', () => ({
  __esModule: true,
  default: () => <div>UserPermissionInfo</div>,
}));
vi.mock('../../../components/shared', () => ({
  __esModule: true,
  PageHeader: ({ title, subtitle, action }: any) => (
    <div>
      <span>{title}</span>
      <span>{subtitle}</span>
      <span>{action}</span>
    </div>
  ),
  LoadingState: () => <div>LoadingState</div>,
  ErrorState: ({ error }: any) => <div>ErrorState: {error}</div>,
  ToastContainer: () => <div>ToastContainer</div>,
  ModalWrapper: ({ children, isOpen }: any) => (isOpen ? <div>{children}</div> : null),
}));

// Permission guard can just render children for tests
vi.mock('@/shared/components/PermissionGuard', () => ({
  PermissionGuard: ({ children }: any) => <div>{children}</div>,
}));

import PaymentCampaignsPage from '../PaymentCampaignsPage';

describe('PaymentCampaignsPage (fee-collection)', () => {
  it('renders header and list component', () => {
    render(<PaymentCampaignsPage />);

    // The mock PageHeader renders the translation keys
    expect(screen.getByText('pageTitle')).toBeInTheDocument();
    // Our mocked list component should be present
    expect(screen.getByText('PaymentCampaignList')).toBeInTheDocument();
  });

  it('shows LoadingState when pageLoading is true', () => {
    mockUsePaymentCampaignsPage.mockReturnValue({ ...defaultHookReturn, pageLoading: true });
    render(<PaymentCampaignsPage />);
    expect(screen.getByText('LoadingState')).toBeInTheDocument();
  });

  it('shows ErrorState when orgsError is present', () => {
    mockUsePaymentCampaignsPage.mockReturnValue({ ...defaultHookReturn, orgsError: { message: 'orgs failed' } });
    render(<PaymentCampaignsPage />);
    expect(screen.getByText('ErrorState: orgs failed')).toBeInTheDocument();
  });

  it('renders create modal when showCreateModal is true', () => {
    mockUsePaymentCampaignsPage.mockReturnValue({ ...defaultHookReturn, showCreateModal: true });
    render(<PaymentCampaignsPage />);
    expect(screen.getByText('PaymentCampaignForm')).toBeInTheDocument();
  });

  it('renders edit modal when showEditModal and editingCampaign are present', () => {
    const campaign = { id: '1', name: 'Test' };
    mockUsePaymentCampaignsPage.mockReturnValue({ ...defaultHookReturn, showEditModal: true, editingCampaign: campaign });
    render(<PaymentCampaignsPage />);
    expect(screen.getByText('PaymentCampaignForm')).toBeInTheDocument();
  });

  it('shows ToastContainer when toasts exist', () => {
    mockUsePaymentCampaignsPage.mockReturnValue({ ...defaultHookReturn, toasts: [{ id: 1, message: 'ok' }] });
    render(<PaymentCampaignsPage />);
    expect(screen.getByText('ToastContainer')).toBeInTheDocument();
  });

  it('calls handleCreateCampaign when create button clicked', async () => {
    const user = userEvent.setup();
    const handleCreateCampaign = vi.fn();
    mockUsePaymentCampaignsPage.mockReturnValue({ ...defaultHookReturn, handleCreateCampaign });
    render(<PaymentCampaignsPage />);

    const btn = screen.getByRole('button', { name: /createNew/i });
    await user.click(btn);
    expect(handleCreateCampaign).toHaveBeenCalled();
  });

  it('calls handleCampaignSaved when Save clicked in create modal', async () => {
    const user = userEvent.setup();
    const handleCampaignSaved = vi.fn();
    mockUsePaymentCampaignsPage.mockReturnValue({ ...defaultHookReturn, showCreateModal: true, handleCampaignSaved });
    render(<PaymentCampaignsPage />);

    const save = screen.getByRole('button', { name: /Save/i });
    await user.click(save);
    expect(handleCampaignSaved).toHaveBeenCalled();
  });

  it('calls handleCampaignSaved when Save clicked in edit modal', async () => {
    const user = userEvent.setup();
    const handleCampaignSaved = vi.fn();
    const campaign = { id: '1', name: 'Test' };
    mockUsePaymentCampaignsPage.mockReturnValue({ ...defaultHookReturn, showEditModal: true, editingCampaign: campaign, handleCampaignSaved });
    render(<PaymentCampaignsPage />);

    const save = screen.getByRole('button', { name: /Save/i });
    await user.click(save);
    expect(handleCampaignSaved).toHaveBeenCalled();
  });
});
