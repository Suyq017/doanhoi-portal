import { render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { describe, expect, it, vi } from 'vitest';

// Mock auth to provide a known student code
vi.mock('../../../auth/context/AuthContext', () => ({
  useAuth: () => ({ auth: { user: { code: 'TEST123' } }, isLoading: false })
}));

import StudentReportsPage from '../StudentReportsPage';

const createQueryClient = () => new QueryClient({ defaultOptions: { queries: { retry: false } } });

describe('StudentReportsPage (MSW)', () => {
  it('renders student name and activities from mocked API', async () => {
    const qc = createQueryClient();

    render(
      <QueryClientProvider client={qc}>
        <StudentReportsPage />
      </QueryClientProvider>
    );

    // wait for student name from mocked response
    await waitFor(() => expect(screen.getByText(/Nguyen Van Test/)).toBeInTheDocument());

    // activity should be rendered
    expect(screen.getByText(/Blood Donation/)).toBeInTheDocument();
  });
});
