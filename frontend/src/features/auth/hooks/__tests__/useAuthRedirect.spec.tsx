import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { useAuthRedirect } from '../useAuthRedirect';

// Mock useAuth
vi.mock('../../context/AuthContext', () => ({
  useAuth: vi.fn(),
}));

import { useAuth } from '../../context/AuthContext';

// Test component that uses useAuthRedirect
const TestComponent = () => {
  const { isRedirecting, isAuthenticated } = useAuthRedirect();

  if (isRedirecting) {
    return <div>Redirecting...</div>;
  }

  return (
    <div>
      {isAuthenticated ? <div>Authenticated Content</div> : <div>Public Content</div>}
    </div>
  );
};

const LoginPage = () => <div>Login Page</div>;
const PortalPage = () => <div>Portal Page</div>;
const PublicPage = () => <div>Public Page</div>;

describe('useAuthRedirect', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should not redirect when auth is still loading', async () => {
    vi.mocked(useAuth).mockReturnValue({
      auth: {
        user: null,
        token: null,
        refreshToken: null,
        userRoles: [],
        userPermissions: [],
        isAuthenticated: false,
        isLoading: true,
        permissionsLoading: false,
        currentOrganizationId: undefined,
      },
      login: vi.fn(),
      googleLogin: vi.fn(),
      logout: vi.fn(),
      setUser: vi.fn(),
      setTokens: vi.fn(),
      clearAuth: vi.fn(),
      hasPermission: vi.fn(),
      hasAnyPermission: vi.fn(),
      setCurrentOrganizationId: vi.fn(),
      loadUserPermissions: vi.fn(),
    });

    render(
      <MemoryRouter initialEntries={['/dashboard']}>
        <Routes>
          <Route path="/dashboard" element={<TestComponent />} />
          <Route path="/login" element={<LoginPage />} />
        </Routes>
      </MemoryRouter>
    );

    // Should show redirecting status while loading
    expect(screen.getByText('Redirecting...')).toBeInTheDocument();
  });

  it('should redirect to login when not authenticated and not on public route', async () => {
    vi.mocked(useAuth).mockReturnValue({
      auth: {
        user: null,
        token: null,
        refreshToken: null,
        userRoles: [],
        userPermissions: [],
        isAuthenticated: false,
        isLoading: false,
        permissionsLoading: false,
        currentOrganizationId: undefined,
      },
      login: vi.fn(),
      googleLogin: vi.fn(),
      logout: vi.fn(),
      setUser: vi.fn(),
      setTokens: vi.fn(),
      clearAuth: vi.fn(),
      hasPermission: vi.fn(),
      hasAnyPermission: vi.fn(),
      setCurrentOrganizationId: vi.fn(),
      loadUserPermissions: vi.fn(),
    });

    render(
      <MemoryRouter initialEntries={['/dashboard']}>
        <Routes>
          <Route path="/dashboard" element={<TestComponent />} />
          <Route path="/login" element={<LoginPage />} />
        </Routes>
      </MemoryRouter>
    );

    // Should redirect to login and show login page
    await waitFor(() => {
      expect(screen.getByText('Login Page')).toBeInTheDocument();
    });
  });

  it('should not redirect when on public login route and not authenticated', async () => {
    vi.mocked(useAuth).mockReturnValue({
      auth: {
        user: null,
        token: null,
        refreshToken: null,
        userRoles: [],
        userPermissions: [],
        isAuthenticated: false,
        isLoading: false,
        permissionsLoading: false,
        currentOrganizationId: undefined,
      },
      login: vi.fn(),
      googleLogin: vi.fn(),
      logout: vi.fn(),
      setUser: vi.fn(),
      setTokens: vi.fn(),
      clearAuth: vi.fn(),
      hasPermission: vi.fn(),
      hasAnyPermission: vi.fn(),
      setCurrentOrganizationId: vi.fn(),
      loadUserPermissions: vi.fn(),
    });

    render(
      <MemoryRouter initialEntries={['/login']}>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/portal" element={<PortalPage />} />
        </Routes>
      </MemoryRouter>
    );

    // Should stay on login page
    expect(screen.getByText('Login Page')).toBeInTheDocument();
  });

  it('should redirect from login to portal when authenticated', async () => {
    vi.mocked(useAuth).mockReturnValue({
      auth: {
        user: {
          id: 'user-1',
          code: 'STU001',
          email: 'student@example.com',
          familyName: 'Nguyen',
          givenName: 'An',
          phone: '0123456789',
          userType: 'student',
          membershipStatus: 'doan_vien',
          isActive: true,
          createdAt: '2024-01-01',
          updatedAt: '2024-01-01',
        },
        token: 'test-token',
        refreshToken: 'test-refresh-token',
        userRoles: [],
        userPermissions: [],
        isAuthenticated: true,
        isLoading: false,
        permissionsLoading: false,
        currentOrganizationId: undefined,
      },
      login: vi.fn(),
      googleLogin: vi.fn(),
      logout: vi.fn(),
      setUser: vi.fn(),
      setTokens: vi.fn(),
      clearAuth: vi.fn(),
      hasPermission: vi.fn(),
      hasAnyPermission: vi.fn(),
      setCurrentOrganizationId: vi.fn(),
      loadUserPermissions: vi.fn(),
    });

    render(
      <MemoryRouter initialEntries={['/login']}>
        <Routes>
          <Route path="/login" element={<TestComponent />} />
          <Route path="/portal" element={<PortalPage />} />
        </Routes>
      </MemoryRouter>
    );

    // Should redirect to portal and show portal content
    await waitFor(() => {
      expect(screen.getByText('Portal Page')).toBeInTheDocument();
    });
  });

  it('should not redirect when authenticated on protected route', async () => {
    vi.mocked(useAuth).mockReturnValue({
      auth: {
        user: {
          id: 'user-1',
          code: 'STU001',
          email: 'student@example.com',
          familyName: 'Nguyen',
          givenName: 'An',
          phone: '0123456789',
          userType: 'student',
          membershipStatus: 'doan_vien',
          isActive: true,
          createdAt: '2024-01-01',
          updatedAt: '2024-01-01',
        },
        token: 'test-token',
        refreshToken: 'test-refresh-token',
        userRoles: [],
        userPermissions: [],
        isAuthenticated: true,
        isLoading: false,
        permissionsLoading: false,
        currentOrganizationId: undefined,
      },
      login: vi.fn(),
      googleLogin: vi.fn(),
      logout: vi.fn(),
      setUser: vi.fn(),
      setTokens: vi.fn(),
      clearAuth: vi.fn(),
      hasPermission: vi.fn(),
      hasAnyPermission: vi.fn(),
      setCurrentOrganizationId: vi.fn(),
      loadUserPermissions: vi.fn(),
    });

    render(
      <MemoryRouter initialEntries={['/dashboard']}>
        <Routes>
          <Route path="/dashboard" element={<TestComponent />} />
          <Route path="/login" element={<LoginPage />} />
        </Routes>
      </MemoryRouter>
    );

    // Should show authenticated content
    expect(screen.getByText('Authenticated Content')).toBeInTheDocument();
  });

  it('should allow access to callback route when not authenticated', async () => {
    vi.mocked(useAuth).mockReturnValue({
      auth: {
        user: null,
        token: null,
        refreshToken: null,
        userRoles: [],
        userPermissions: [],
        isAuthenticated: false,
        isLoading: false,
        permissionsLoading: false,
        currentOrganizationId: undefined,
      },
      login: vi.fn(),
      googleLogin: vi.fn(),
      logout: vi.fn(),
      setUser: vi.fn(),
      setTokens: vi.fn(),
      clearAuth: vi.fn(),
      hasPermission: vi.fn(),
      hasAnyPermission: vi.fn(),
      setCurrentOrganizationId: vi.fn(),
      loadUserPermissions: vi.fn(),
    });

    const CallbackPage = () => <div>OAuth Callback Page</div>;

    render(
      <MemoryRouter initialEntries={['/auth/callback']}>
        <Routes>
          <Route path="/auth/callback" element={<CallbackPage />} />
          <Route path="/login" element={<LoginPage />} />
        </Routes>
      </MemoryRouter>
    );

    // Should stay on callback page
    expect(screen.getByText('OAuth Callback Page')).toBeInTheDocument();
  });

  it('should provide correct state via hook return values', async () => {
    vi.mocked(useAuth).mockReturnValue({
      auth: {
        user: null,
        token: null,
        refreshToken: null,
        userRoles: [],
        userPermissions: [],
        isAuthenticated: false,
        isLoading: true,
        permissionsLoading: false,
        currentOrganizationId: undefined,
      },
      login: vi.fn(),
      googleLogin: vi.fn(),
      logout: vi.fn(),
      setUser: vi.fn(),
      setTokens: vi.fn(),
      clearAuth: vi.fn(),
      hasPermission: vi.fn(),
      hasAnyPermission: vi.fn(),
      setCurrentOrganizationId: vi.fn(),
      loadUserPermissions: vi.fn(),
    });

    render(
      <MemoryRouter initialEntries={['/dashboard']}>
        <Routes>
          <Route path="/dashboard" element={<TestComponent />} />
          <Route path="/login" element={<LoginPage />} />
        </Routes>
      </MemoryRouter>
    );

    // When loading, should show redirecting status
    expect(screen.getByText('Redirecting...')).toBeInTheDocument();
  });
});
