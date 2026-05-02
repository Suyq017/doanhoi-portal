import { useEffect } from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { rest } from 'msw';
import { describe, expect, it, vi } from 'vitest';
import { server } from '../../../../mocks/server';

// Mock auth (provide permission helpers expected by usePermissions)
vi.mock('../../../auth/context/AuthContext', () => ({
  useAuth: () => ({
    auth: {
      user: { code: 'TEST123' },
      userRoles: [],
      userPermissions: [],
      isAuthenticated: true,
      currentOrganizationId: null,
      permissionsLoading: false,
    },
    hasPermission: (_perm: string) => true,
    hasAnyPermission: (_perms: string[]) => false,
    isLoading: false,
  })
}));

vi.mock('../../hooks/useCtxhPermissions', () => ({
  useCtxhPermissions: () => ({
    activities: {
      view: true,
      create: true,
      update: true,
      delete: true,
      manage_participants: false,
    },
    categories: {
      view: true,
      create: true,
      update: true,
      delete: true,
    },
    reports: {
      view: true,
      generate: true,
      export: true,
    },
    config: {
      view: true,
      manage: true,
    },
    loading: false,
  }),
}));

// Auto-confirm the ConfirmDialog when opened
vi.mock('../../../../shared/components', () => ({
  ConfirmDialog: ({ isOpen, onConfirm }: any) => {
    useEffect(() => {
      if (isOpen && onConfirm) onConfirm();
    }, [isOpen, onConfirm]);
    return null;
  },
  Toast: (props: any) => <div>{props.message}</div>,
}));

vi.mock('../../components/ActivityForm', () => ({
  default: () => null,
}));

import ActivityDetail from '../ActivityDetail';

const createQueryClient = () => new QueryClient({ defaultOptions: { queries: { retry: false } } });

describe('Activity registration flow (MSW)', () => {
  it('allows a student to register and shows success toast', async () => {
    const originalFetch = globalThis.fetch;
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockImplementation((input: any, init?: any) => {
      const url = typeof input === 'string' ? input : input?.url;

      if (
        url === '/api/ctxh/activities/participants/template' ||
        url === `/api/ctxh/activities/a-1/participants/grading-template`
      ) {
        return Promise.resolve(new Response('', { status: 200 }));
      }

      return originalFetch(input, init);
    });

    // Override activity and participants for this test
    server.use(
      rest.get('/api/ctxh/activities/:id', (_req, res, ctx) => {
        return res(ctx.status(200), ctx.json({ id: 'a-1', status: 'ACTIVE', title: 'Blood Donation', start_date: '2026-03-01' }));
      }),
      rest.get('http://localhost:9200/ctxh/activities/:id', (_req, res, ctx) => {
        return res(ctx.status(200), ctx.json({ id: 'a-1', status: 'ACTIVE', title: 'Blood Donation', start_date: '2026-03-01' }));
      }),
      rest.get('/api/ctxh/activities/:id/participants', (_req, res, ctx) => {
        // Initially empty
        return res(ctx.status(200), ctx.json([]));
      }),
      rest.post('/api/ctxh/activities/:id/register', (_req, res, ctx) => {
        return res(ctx.status(201), ctx.json({ id: 'p-123', student_code: 'TEST123', status: 'PENDING' }));
      })
    );

    // handle absolute-origin participants list as well
    server.use(
      rest.get('http://localhost:9200/ctxh/activities/:id/participants', (_req, res, ctx) => {
        return res(ctx.status(200), ctx.json([]));
      })
    );

    const qc = createQueryClient();

    render(
      <QueryClientProvider client={qc}>
        <MemoryRouter initialEntries={["/portal/ctxh/activities/a-1"]}>
          <Routes>
            <Route path="/portal/ctxh/activities/:id" element={<ActivityDetail />} />
          </Routes>
        </MemoryRouter>
      </QueryClientProvider>
    );

    const participantsTab = await screen.findByRole('button', { name: 'activity.tabs.participants' });
    const user = userEvent.setup();
    await user.click(participantsTab);

    // Click the register button (text is the i18n key)
    const btn = screen.getAllByRole('button', { name: /participant.registerButton/ })[0];
    await user.click(btn);

    // Expect toast with register success key
    await waitFor(() => expect(screen.getByText(/participant.registerSuccess/)).toBeInTheDocument());

    fetchSpy.mockRestore();
  });
});
