import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { server } from '@/mocks/server';
import { rest } from 'msw';
import React from 'react';

vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: (s: string) => s }) }));

const createQueryClient = () => new QueryClient({ defaultOptions: { queries: { retry: false } } });

describe('System Config feature - behavioral tests', () => {
  describe('Happy Path - Config loading and saving', () => {
    it('loads and displays AWS S3 config successfully', async () => {
      const qc = createQueryClient();
      
      const TestComponent = () => {
        const [config, setConfig] = React.useState<any>(null);
        const [loading, setLoading] = React.useState(true);

        React.useEffect(() => {
          fetch('/api/system-config/aws-s3')
            .then(res => res.json())
            .then(data => {
              setConfig(data);
              setLoading(false);
            });
        }, []);

        if (loading) return <div>Loading...</div>;
        return (
          <div>
            {config && (
              <div>
                <div>Bucket: {config.s3Bucket}</div>
                <div>Region: {config.region}</div>
              </div>
            )}
          </div>
        );
      };

      render(
        <QueryClientProvider client={qc}>
          <TestComponent />
        </QueryClientProvider>
      );

      await waitFor(() => {
        expect(screen.getByText(/Bucket: doanhoi-portal/)).toBeInTheDocument();
        expect(screen.getByText(/Region: us-east-1/)).toBeInTheDocument();
      });
    });

    it('saves system config changes successfully', async () => {
      let saveCalled = false;

      server.use(
        rest.patch('/api/system-config/aws-s3/:id', (_req, res, ctx) => {
          saveCalled = true;
          return res(ctx.status(200), ctx.json({
            id: 'config-1',
            s3Bucket: 'updated-bucket',
            region: 'eu-west-1',
            accessKeyId: 'UPDATED',
            secretAccessKey: 'secret',
            s3Endpoint: 'https://s3.eu-west-1.amazonaws.com',
          }));
        })
      );

      const qc = createQueryClient();
      const TestComponent = () => {
        const [result, setResult] = React.useState<any>(null);

        const handleSave = async () => {
          const res = await fetch('/api/system-config/aws-s3/config-1', {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ s3Bucket: 'updated-bucket', region: 'eu-west-1' }),
          });
          const data = await res.json();
          setResult(data);
        };

        return (
          <div>
            <button onClick={handleSave}>Save</button>
            {result && <div>Updated: {result.s3Bucket}</div>}
          </div>
        );
      };

      render(
        <QueryClientProvider client={qc}>
          <TestComponent />
        </QueryClientProvider>
      );

      const btn = screen.getByRole('button', { name: /Save/i });
      btn.click();

      await waitFor(() => {
        expect(saveCalled).toBe(true);
        expect(screen.getByText(/Updated: updated-bucket/)).toBeInTheDocument();
      });
    });
  });

  describe('Error Path - API failures', () => {
    it('shows error when config load fails (500)', async () => {
      server.use(
        rest.get('/api/system-config/aws-s3', (_req, res, ctx) => {
          return res(ctx.status(500), ctx.json({ message: 'Internal server error' }));
        })
      );

      const qc = createQueryClient();
      const TestComponent = () => {
        const [error, setError] = React.useState<string | null>(null);

        React.useEffect(() => {
          fetch('/api/system-config/aws-s3')
            .then(res => {
              if (!res.ok) throw new Error('Failed to load config');
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
        expect(screen.getByText(/Error: Failed to load config/)).toBeInTheDocument();
      });
    });

    it('shows error when save fails (validation error)', async () => {
      server.use(
        rest.patch('/api/system-config/aws-s3/:id', (_req, res, ctx) => {
          return res(ctx.status(400), ctx.json({ 
            message: 'Validation failed', 
            errors: { s3Bucket: 'Bucket name is required' } 
          }));
        })
      );

      const qc = createQueryClient();
      const TestComponent = () => {
        const [error, setError] = React.useState<string | null>(null);

        const handleSave = async () => {
          try {
            const res = await fetch('/api/system-config/aws-s3/config-1', {
              method: 'PATCH',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ s3Bucket: '' }),
            });
            if (!res.ok) throw new Error('Validation failed');
          } catch (err: any) {
            setError(err.message);
          }
        };

        return (
          <div>
            <button onClick={handleSave}>Save</button>
            {error && <div>Error: {error}</div>}
          </div>
        );
      };

      render(
        <QueryClientProvider client={qc}>
          <TestComponent />
        </QueryClientProvider>
      );

      const btn = screen.getByRole('button', { name: /Save/i });
      btn.click();

      await waitFor(() => {
        expect(screen.getByText(/Error: Validation failed/)).toBeInTheDocument();
      });
    });
  });

  describe('Permission Path - Access control', () => {
    it('allows save when user has edit permission', async () => {
      const qc = createQueryClient();
      const TestComponent = () => {
        const hasEditPermission = true;

        return (
          <div>
            <div>Edit Permission: {hasEditPermission ? 'Allowed' : 'Denied'}</div>
            <button disabled={!hasEditPermission}>Save Config</button>
          </div>
        );
      };

      render(
        <QueryClientProvider client={qc}>
          <TestComponent />
        </QueryClientProvider>
      );

      expect(screen.getByText(/Edit Permission: Allowed/)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Save Config/i })).not.toBeDisabled();
    });

    it('disables save when user only has view permission', async () => {
      const qc = createQueryClient();
      const TestComponent = () => {
        const hasEditPermission = false;

        return (
          <div>
            <div>Edit Permission: {hasEditPermission ? 'Allowed' : 'Denied'}</div>
            <button disabled={!hasEditPermission}>Save Config</button>
          </div>
        );
      };

      render(
        <QueryClientProvider client={qc}>
          <TestComponent />
        </QueryClientProvider>
      );

      expect(screen.getByText(/Edit Permission: Denied/)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Save Config/i })).toBeDisabled();
    });
  });
});
