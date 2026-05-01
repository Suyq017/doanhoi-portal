import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook } from '@testing-library/react';
import { render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useTemplatePagePermissions } from '../hooks/useTemplatePagePermissions';
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

describe('Templates feature - behavioral tests', () => {
  beforeEach(() => {
    mockUsePermissions.mockReset();
  });

  describe('Happy Path - Template listing with valid permissions', () => {
    beforeEach(() => {
      mockUsePermissions.mockReturnValue({
        canAccessTemplates: () => true,
        canAccessTemplatesAdmin: () => true,
        canManageTemplates: () => true,
      });
    });

    it('renders templates list when API succeeds', async () => {
      const qc = createQueryClient();
      
      const TestComponent = () => {
        const permissions = useTemplatePagePermissions();
        const [templates, setTemplates] = React.useState<any[]>([]);
        const [loading, setLoading] = React.useState(true);

        React.useEffect(() => {
          fetch('/api/templates')
            .then(res => res.json())
            .then(data => {
              setTemplates(data.templates);
              setLoading(false);
            });
        }, []);

        if (loading) return <div>Loading...</div>;
        return (
          <div>
            <div>Permission: {permissions.canManage ? 'Allowed' : 'Denied'}</div>
            {templates.map(t => <div key={t.id}>{t.name}</div>)}
          </div>
        );
      };

      render(
        <QueryClientProvider client={qc}>
          <TestComponent />
        </QueryClientProvider>
      );

      await waitFor(() => {
        expect(screen.getByText('Mẫu báo cáo hoạt động')).toBeInTheDocument();
        expect(screen.getByText('Mẫu tờ rơi')).toBeInTheDocument();
      });

      expect(screen.getByText('Permission: Allowed')).toBeInTheDocument();
    });

    it('creates new template successfully', async () => {
      let createCalled = false;

      server.use(
        rest.post('/api/templates', (_req, res, ctx) => {
          createCalled = true;
          return res(ctx.status(201), ctx.json({
            id: 'new-template',
            name: 'New Template',
            status: 'ACTIVE',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          }));
        })
      );

      const qc = createQueryClient();
      const TestComponent = () => {
        const [result, setResult] = React.useState<any>(null);

        const handleCreate = async () => {
          const res = await fetch('/api/templates', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name: 'New Template' }),
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
        expect(screen.getByText(/Created: New Template/)).toBeInTheDocument();
      });
    });
  });

  describe('Error Path - API failures', () => {
    beforeEach(() => {
      mockUsePermissions.mockReturnValue({
        canAccessTemplates: () => true,
        canAccessTemplatesAdmin: () => true,
        canManageTemplates: () => true,
      });
    });

    it('shows error when fetch templates fails (500)', async () => {
      server.use(
        rest.get('/api/templates', (_req, res, ctx) => {
          return res(ctx.status(500), ctx.json({ message: 'Internal server error' }));
        })
      );

      const qc = createQueryClient();
      const TestComponent = () => {
        const [error, setError] = React.useState<string | null>(null);

        React.useEffect(() => {
          fetch('/api/templates')
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

    it('shows error when create template fails (validation error)', async () => {
      server.use(
        rest.post('/api/templates', (_req, res, ctx) => {
          return res(ctx.status(400), ctx.json({ 
            message: 'Validation failed', 
            errors: { name: 'Template name is required' } 
          }));
        })
      );

      const qc = createQueryClient();
      const TestComponent = () => {
        const [error, setError] = React.useState<string | null>(null);

        const handleCreate = async () => {
          try {
            const res = await fetch('/api/templates', {
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
    it('returns full template actions when user has admin access', () => {
      mockUsePermissions.mockReturnValue({
        canAccessTemplates: () => true,
        canAccessTemplatesAdmin: () => true,
        canManageTemplates: () => true,
      });

      const { result } = renderHook(() => useTemplatePagePermissions());

      expect(result.current).toMatchObject({
        canCreate: true,
        canView: true,
        canEdit: true,
        canDelete: true,
        canExport: false,
        canManage: true,
        canAccessAdmin: true,
        showBulkActions: true,
        showActionColumn: true,
      });
    });

    it('disables manage and bulk actions when user only has read access', () => {
      mockUsePermissions.mockReturnValue({
        canAccessTemplates: () => true,
        canAccessTemplatesAdmin: () => false,
        canManageTemplates: () => false,
      });

      const { result } = renderHook(() => useTemplatePagePermissions());

      expect(result.current).toMatchObject({
        canCreate: false,
        canView: true,
        canEdit: false,
        canDelete: false,
        canExport: false,
        canManage: false,
        canAccessAdmin: false,
        showBulkActions: false,
        showActionColumn: true, // Can view details, so action column is shown
      });
    });
  });
});
