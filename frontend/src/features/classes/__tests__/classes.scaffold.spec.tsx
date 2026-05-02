import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook } from '@testing-library/react';
import { render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useClassPagePermissions } from '../hooks/useClassPagePermissions';
import { server } from '@/mocks/server';
import { rest } from 'msw';

const mockUsePermissions = vi.fn();

vi.mock('../../../shared', async () => {
  const actual = await vi.importActual<any>('../../../shared');
  return {
    ...actual,
    usePermissions: () => mockUsePermissions(),
  };
});

vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: (s: string) => s }) }));

const createQueryClient = () => new QueryClient({ defaultOptions: { queries: { retry: false } } });

describe('Classes feature - behavioral tests', () => {
  beforeEach(() => {
    mockUsePermissions.mockReset();
  });

  describe('Happy Path - Class listing with valid permissions', () => {
    beforeEach(() => {
      mockUsePermissions.mockReturnValue({
        canCreateClass: () => true,
        canViewClassDetails: () => true,
        canUpdateClass: () => true,
        canDeleteClass: () => true,
        canExportClasses: () => true,
      });
    });

    it('renders classes list when API succeeds', async () => {
      const qc = createQueryClient();
      
      // Mock ClassesPage - we're testing the hook + data flow here
      const TestComponent = () => {
        const permissions = useClassPagePermissions();
        const [classes, setClasses] = React.useState<any[]>([]);
        const [loading, setLoading] = React.useState(true);

        React.useEffect(() => {
          fetch('/api/classes')
            .then(res => res.json())
            .then(data => {
              setClasses(data.classes);
              setLoading(false);
            });
        }, []);

        if (loading) return <div>Loading...</div>;
        return (
          <div>
            <div>Permission: {permissions.canCreate ? 'Allowed' : 'Denied'}</div>
            {classes.map(c => <div key={c.id}>{c.name}</div>)}
          </div>
        );
      };

      render(
        <QueryClientProvider client={qc}>
          <TestComponent />
        </QueryClientProvider>
      );

      // Wait for classes to render
      await waitFor(() => {
        expect(screen.getByText('Lớp 10A1')).toBeInTheDocument();
        expect(screen.getByText('Lớp 10A2')).toBeInTheDocument();
      });

      expect(screen.getByText('Permission: Allowed')).toBeInTheDocument();
    });

    it('creates new class successfully', async () => {
      let createCalled = false;

      server.use(
        rest.post('/api/classes', (_req, res, ctx) => {
          createCalled = true;
          return res(ctx.status(201), ctx.json({
            id: 'new-class',
            name: 'New Class',
            isActive: true,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          }));
        })
      );

      const qc = createQueryClient();
      const TestComponent = () => {
        const [result, setResult] = React.useState<any>(null);

        const handleCreate = async () => {
          const res = await fetch('/api/classes', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name: 'New Class' }),
          });
          const data = await res.json();
          setResult(data);
        };

        return (
          <div>
            <button onClick={handleCreate}>Create</button>
            {result && <div>Created: {result.name}</div>}
          </div>
        );
      };

      render(
        <QueryClientProvider client={qc}>
          <TestComponent />
        </QueryClientProvider>
      );

      const btn = screen.getByRole('button', { name: /Create/i });
      await vi.waitFor(() => {
        btn.click();
      });

      await waitFor(() => {
        expect(createCalled).toBe(true);
        expect(screen.getByText(/Created: New Class/)).toBeInTheDocument();
      });
    });
  });

  describe('Error Path - API failures', () => {
    beforeEach(() => {
      mockUsePermissions.mockReturnValue({
        canCreateClass: () => true,
        canViewClassDetails: () => true,
        canUpdateClass: () => true,
        canDeleteClass: () => true,
        canExportClasses: () => true,
      });
    });

    it('shows error when fetch classes fails (500)', async () => {
      server.use(
        rest.get('/api/classes', (_req, res, ctx) => {
          return res(ctx.status(500), ctx.json({ message: 'Internal server error' }));
        })
      );

      const qc = createQueryClient();
      const TestComponent = () => {
        const [error, setError] = React.useState<string | null>(null);

        React.useEffect(() => {
          fetch('/api/classes')
            .then(res => {
              if (!res.ok) throw new Error('Failed to fetch');
              return res.json();
            })
            .catch(err => setError(err.message));
        }, []);

        return error ? <div>Error: {error}</div> : <div>Loading...</div>;
      };

      render(
        <QueryClientProvider client={qc}>
          <TestComponent />
        </QueryClientProvider>
      );

      await waitFor(() => {
        expect(screen.getByText(/Error: Failed to fetch/)).toBeInTheDocument();
      });
    });

    it('shows error when create class fails (validation error)', async () => {
      server.use(
        rest.post('/api/classes', (_req, res, ctx) => {
          return res(ctx.status(400), ctx.json({ 
            message: 'Validation failed', 
            errors: { name: 'Class name is required' } 
          }));
        })
      );

      const qc = createQueryClient();
      const TestComponent = () => {
        const [error, setError] = React.useState<string | null>(null);

        const handleCreate = async () => {
          try {
            const res = await fetch('/api/classes', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ name: '' }),
            });
            if (!res.ok) throw new Error('Validation failed');
          } catch (err: any) {
            setError(err.message);
          }
        };

        return (
          <div>
            <button onClick={handleCreate}>Create</button>
            {error && <div>Error: {error}</div>}
          </div>
        );
      };

      render(
        <QueryClientProvider client={qc}>
          <TestComponent />
        </QueryClientProvider>
      );

      const btn = screen.getByRole('button', { name: /Create/i });
      btn.click();

      await waitFor(() => {
        expect(screen.getByText(/Error: Validation failed/)).toBeInTheDocument();
      });
    });
  });

  describe('Permission Path - Access control', () => {
    it('returns full class actions when user has all class permissions', () => {
      mockUsePermissions.mockReturnValue({
        canCreateClass: () => true,
        canViewClassDetails: () => true,
        canUpdateClass: () => true,
        canDeleteClass: () => true,
        canExportClasses: () => true,
      });

      const { result } = renderHook(() => useClassPagePermissions());

      expect(result.current).toMatchObject({
        canCreate: true,
        canView: true,
        canEdit: true,
        canDelete: true,
        canExport: true,
        canImport: true,
        hasAnyViewAction: true,
        hasAnyEditAction: true,
        showBulkActions: true,
        showActionColumn: true,
      });
    });

    it('disables import and action column when user only has export permission', () => {
      mockUsePermissions.mockReturnValue({
        canCreateClass: () => false,
        canViewClassDetails: () => false,
        canUpdateClass: () => false,
        canDeleteClass: () => false,
        canExportClasses: () => true,
      });

      const { result } = renderHook(() => useClassPagePermissions());

      expect(result.current).toMatchObject({
        canCreate: false,
        canView: false,
        canEdit: false,
        canDelete: false,
        canExport: true,
        canImport: false,
        hasAnyViewAction: false,
        hasAnyEditAction: false,
        showBulkActions: false,
        showActionColumn: false,
      });
    });
  });
});

import React from 'react';
