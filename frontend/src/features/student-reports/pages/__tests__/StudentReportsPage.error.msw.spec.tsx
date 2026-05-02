import { render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { rest } from 'msw';
import { describe, expect, it, vi } from 'vitest';
import { server } from '../../../../mocks/server';

// Mock auth to provide a known student code
vi.mock('../../../auth/context/AuthContext', () => ({
  useAuth: () => ({ auth: { user: { code: 'TEST123' } }, isLoading: false })
}));

import StudentReportsPage from '../StudentReportsPage';

const createQueryClient = () => new QueryClient({ defaultOptions: { queries: { retry: false } } });

describe('StudentReportsPage - error case (MSW)', () => {
  it('shows EmptyState when backend returns 404', async () => {
    // Override handler to return 404 for this test
    server.use(
      rest.get('http://localhost:9200/ctxh/reports/student/:studentCode', (_req, res, ctx) => {
        return res(ctx.status(404), ctx.json({ message: 'Not found' }));
      })
    );

    const qc = createQueryClient();

    render(
      <QueryClientProvider client={qc}>
        <StudentReportsPage />
      </QueryClientProvider>
    );

    await waitFor(() => expect(screen.getByText(/messages.notFound/)).toBeInTheDocument());
  });
});
