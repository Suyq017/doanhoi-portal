import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook } from '@testing-library/react';
import { render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useDepartmentPagePermissions } from '../hooks/useDepartmentPagePermissions';
import { server } from '@/mocks/server';
import { rest } from 'msw';
import React from 'react';

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

describe('Departments feature - behavioral tests', () => {
  beforeEach(() => {
    mockUsePermissions.mockReset();
  });

  describe('Happy Path - Department listing with valid permissions', () => {
    beforeEach(() => {
      mockUsePermissions.mockReturnValue({
        canCreateDepartment: () => true,
        canViewDepartmentDetails: () => true,
        canUpdateDepartment: () => true,
        canDeleteDepartment: () => true,
        canExportDepartments: () => true,
      });
    });

    it('renders departments list when API succeeds', async () => {
      const qc = createQueryClient();
      
      const TestComponent = () => {
        const permissions = useDepartmentPagePermissions();
        const [departments, setDepartments] = React.useState<any[]>([]);
        const [loading, setLoading] = React.useState(true);

        React.useEffect(() => {
          fetch('/api/departments')
            .then(res => res.json())
            .then(data => {
              setDepartments(data.departments);
              setLoading(false);
            });
        }, []);

        if (loading) return <div>Loading...</div>;
        return (
          <div>
            <div>Permission: {permissions.canCreate ? 'Allowed' : 'Denied'}</div>
            {departments.map(d => <div key={d.id}>{d.name}</div>)}
          </div>
        );
      };

      render(
        <QueryClientProvider client={qc}>
          <TestComponent />
        </QueryClientProvider>
      );

      await waitFor(() => {
        expect(screen.getByText('Ban Đoàn')).toBeInTheDocument();
        expect(screen.getByText('Ban Hành Chính')).toBeInTheDocument();
      });

      expect(screen.getByText('Permission: Allowed')).toBeInTheDocument();
    });

    it('creates new department successfully', async () => {
      let createCalled = false;

      server.use(
        rest.post('/api/departments', (_req, res, ctx) => {
          createCalled = true;
          return res(ctx.status(201), ctx.json({
            id: 'new-dept',
            name: 'New Department',
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
          const res = await fetch('/api/departments', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name: 'New Department' }),
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
      btn.click();

      await waitFor(() => {
        expect(createCalled).toBe(true);
        expect(screen.getByText(/Created: New Department/)).toBeInTheDocument();
      });
    });
  });

  describe('Error Path - API failures', () => {
    beforeEach(() => {
      mockUsePermissions.mockReturnValue({
        canCreateDepartment: () => true,
        canViewDepartmentDetails: () => true,
        canUpdateDepartment: () => true,
        canDeleteDepartment: () => true,
        canExportDepartments: () => true,
      });
    });

    it('shows error when fetch departments fails (500)', async () => {
      server.use(
        rest.get('/api/departments', (_req, res, ctx) => {
          return res(ctx.status(500), ctx.json({ message: 'Internal server error' }));
        })
      );

      const qc = createQueryClient();
      const TestComponent = () => {
        const [error, setError] = React.useState<string | null>(null);

        React.useEffect(() => {
          fetch('/api/departments')
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

    it('shows error when create department fails (validation error)', async () => {
      server.use(
        rest.post('/api/departments', (_req, res, ctx) => {
          return res(ctx.status(400), ctx.json({ 
            message: 'Validation failed', 
            errors: { name: 'Department name is required' } 
          }));
        })
      );

      const qc = createQueryClient();
      const TestComponent = () => {
        const [error, setError] = React.useState<string | null>(null);

        const handleCreate = async () => {
          try {
            const res = await fetch('/api/departments', {
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
    it('returns full department actions when user has all department permissions', () => {
      mockUsePermissions.mockReturnValue({
        canCreateDepartment: () => true,
        canViewDepartmentDetails: () => true,
        canUpdateDepartment: () => true,
        canDeleteDepartment: () => true,
        canExportDepartments: () => true,
      });

      const { result } = renderHook(() => useDepartmentPagePermissions());

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

    it('disables import and bulk actions when user only has export permission', () => {
      mockUsePermissions.mockReturnValue({
        canCreateDepartment: () => false,
        canViewDepartmentDetails: () => false,
        canUpdateDepartment: () => false,
        canDeleteDepartment: () => false,
        canExportDepartments: () => true,
      });

      const { result } = renderHook(() => useDepartmentPagePermissions());

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
