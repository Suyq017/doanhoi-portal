import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { describe, it, vi } from 'vitest';
import { server } from '@/mocks/server';
import { rest } from 'msw';

// Keep translations simple
vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: (s: string) => s }) }));

// Lightweight mocks for heavy child components (but keep ToastContainer real)
vi.mock('../../../components/admin/PaymentCampaignList', () => ({ __esModule: true, default: () => <div>PaymentCampaignList</div> }));
vi.mock('../../../components/admin/UserPermissionInfo', () => ({ __esModule: true, default: () => <div>UserPermissionInfo</div> }));
vi.mock('@/shared/components/PermissionGuard', () => ({
  PermissionGuard: ({ children }: any) => <>{children}</>,
}));

// Mock the form so Save simulates a successful save and toast emission from the page callback
vi.mock('../../../components/admin/PaymentCampaignForm', () => ({
  __esModule: true,
  default: (props: any) => (
    <div>
      <div>PaymentCampaignForm</div>
      <button onClick={() => {
        props.onShowSuccess && props.onShowSuccess('Saved via MSW');
        props.onSave && props.onSave({ id: 'created' });
      }}>Save</button>
    </div>
  ),
}));

import PaymentCampaignsPage from '../PaymentCampaignsPage';

const createQueryClient = () => new QueryClient({ defaultOptions: { queries: { retry: false } } });

describe('PaymentCampaignsPage (MSW integration)', () => {
  it('shows ErrorState when accessible-organizations API fails', async () => {
    // Override handler to return 500 for accessible organizations
    server.use(
      rest.get('/api/payment-campaigns/accessible-organizations', (_req, res, ctx) => {
        return res(ctx.status(500), ctx.json({ message: 'failed to load orgs' }));
      })
    );

    const qc = createQueryClient();
    render(
      <QueryClientProvider client={qc}>
        <PaymentCampaignsPage />
      </QueryClientProvider>
    );

    await waitFor(() => expect(screen.getByText(/Failed to fetch accessible organizations/i)).toBeInTheDocument());
  });

  it('opens create modal and shows toast after save', async () => {
    const user = userEvent.setup();
    const qc = createQueryClient();
    render(
      <QueryClientProvider client={qc}>
        <PaymentCampaignsPage />
      </QueryClientProvider>
    );

    const createBtn = await screen.findByRole('button', { name: /createNew/i });
    await user.click(createBtn);

    expect(await screen.findByText('PaymentCampaignForm')).toBeInTheDocument();

    const saveBtn = screen.getByRole('button', { name: /Save/i });
    await user.click(saveBtn);

    await waitFor(() => expect(screen.getByText(/Saved via MSW/)).toBeInTheDocument());
  });
});
