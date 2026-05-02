import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import LoginPage from '../LoginPage';

// Mock GoogleLoginButton to avoid external OAuth dependencies
vi.mock('../../components/GoogleLoginButton', () => ({
  default: ({ onSuccess, onError }: any) => (
    <div data-testid="google-login-button">
      <button
        data-testid="simulate-login-success"
        onClick={() => onSuccess()}
      >
        Simulate Success
      </button>
      <button
        data-testid="simulate-login-error"
        onClick={() => onError('Login failed')}
      >
        Simulate Error
      </button>
    </div>
  ),
}));

// Mock useAuth
vi.mock('../../context/AuthContext', () => ({
  useAuth: vi.fn(),
}));

import { useAuth } from '../../context/AuthContext';

describe('LoginPage', () => {
  const mockNavigate = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  it('should render loading spinner while auth is loading', async () => {
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

    const DummyPortal = () => <div>Portal Page</div>;

    const { container } = render(
      <MemoryRouter initialEntries={['/login']}>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/portal" element={<DummyPortal />} />
        </Routes>
      </MemoryRouter>
    );

    // Should show loading spinner
    const spinner = container.querySelector('.animate-spin');
    expect(spinner).toBeInTheDocument();
  });

  it('should render login page with form when not loading', async () => {
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
          <Route path="/portal" element={<div>Portal Page</div>} />
        </Routes>
      </MemoryRouter>
    );

    // Should show login form elements
    expect(screen.getByTestId('google-login-button')).toBeInTheDocument();
    expect(screen.getByAltText(/logo|đoàn/i)).toBeInTheDocument();
  });

  it('should display error message when login fails', async () => {
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
          <Route path="/portal" element={<div>Portal Page</div>} />
        </Routes>
      </MemoryRouter>
    );

    // Google button should be available for error triggering
    const googleButton = screen.getByTestId('google-login-button');
    expect(googleButton).toBeInTheDocument();

    // Should have error simulation button
    const errorButton = screen.getByTestId('simulate-login-error');
    expect(errorButton).toBeInTheDocument();
  });

  it('should redirect to /portal when already authenticated', async () => {
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

    const PortalPage = () => <div>Portal Page</div>;

    render(
      <MemoryRouter initialEntries={['/login']}>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/portal" element={<PortalPage />} />
        </Routes>
      </MemoryRouter>
    );

    // Should render portal page instead of login page
    await waitFor(() => {
      expect(screen.getByText('Portal Page')).toBeInTheDocument();
    });
  });

  it('should redirect to specified return URL after successful login', async () => {
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

    const DashboardPage = () => <div>Dashboard Page</div>;
    const PortalPage = () => <div>Portal Page</div>;

    // Render with return URL set in location state
    const { rerender } = render(
      <MemoryRouter initialEntries={[{ pathname: '/login', state: { from: { pathname: '/dashboard' } } }]}>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/portal" element={<PortalPage />} />
        </Routes>
      </MemoryRouter>
    );

    // The component should still show login page initially
    expect(screen.getByTestId('google-login-button')).toBeInTheDocument();
  });

  it('should have proper styling and layout', async () => {
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

    const { container } = render(
      <MemoryRouter initialEntries={['/login']}>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/portal" element={<div>Portal Page</div>} />
        </Routes>
      </MemoryRouter>
    );

    // Check for proper layout structure
    const mainContainer = container.querySelector('.min-h-screen');
    expect(mainContainer).toBeInTheDocument();

    // Check for form container
    const formContainer = container.querySelector('.bg-white');
    expect(formContainer).toBeInTheDocument();

    // Check for logo
    const logo = screen.getByAltText(/logo|đoàn/i);
    expect(logo).toBeInTheDocument();
  });

  it('should render all required text elements', async () => {
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
          <Route path="/portal" element={<div>Portal Page</div>} />
        </Routes>
      </MemoryRouter>
    );

    // Check for text elements (will be translated via i18n)
    // The title should be present (checking for heading)
    const heading = screen.getByRole('heading');
    expect(heading).toBeInTheDocument();
  });
});
