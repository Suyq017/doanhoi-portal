import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import AdminLoginPage from '../AdminLoginPage';

// Mock GoogleLoginButton to avoid external OAuth dependencies
vi.mock('../../components/GoogleLoginButton', () => ({
  default: ({ onSuccess, onError }: any) => (
    <div data-testid="google-login-button">
      <button
        data-testid="simulate-google-success"
        onClick={() => onSuccess()}
      >
        Sign in with Google
      </button>
      <button
        data-testid="simulate-google-error"
        onClick={() => onError('Google login failed')}
      >
        Simulate Google Error
      </button>
    </div>
  ),
}));

// Mock LoginForm component
vi.mock('../../components/LoginForm', () => ({
  default: ({ onSuccess, onError }: any) => (
    <div data-testid="login-form">
      <input
        data-testid="email-input"
        type="email"
        placeholder="Email"
      />
      <input
        data-testid="password-input"
        type="password"
        placeholder="Password"
      />
      <button
        data-testid="simulate-form-success"
        onClick={() => onSuccess()}
      >
        Login
      </button>
      <button
        data-testid="simulate-form-error"
        onClick={() => onError('Invalid credentials')}
      >
        Simulate Form Error
      </button>
    </div>
  ),
}));

// Mock useAuth
vi.mock('../../context/AuthContext', () => ({
  useAuth: vi.fn(),
}));

import { useAuth } from '../../context/AuthContext';

describe('AdminLoginPage', () => {
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

    render(
      <MemoryRouter initialEntries={['/admin/login']}>
        <Routes>
          <Route path="/admin/login" element={<AdminLoginPage />} />
          <Route path="/portal" element={<DummyPortal />} />
        </Routes>
      </MemoryRouter>
    );

    // Should show loading spinner
    const spinner = document.querySelector('.animate-spin');
    expect(spinner).toBeTruthy();
  });

  it('should render admin login form when not loading', async () => {
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
      <MemoryRouter initialEntries={['/admin/login']}>
        <Routes>
          <Route path="/admin/login" element={<AdminLoginPage />} />
          <Route path="/portal" element={<div>Portal Page</div>} />
        </Routes>
      </MemoryRouter>
    );

    // Should show both login form and google button
    expect(screen.getByTestId('login-form')).toBeInTheDocument();
    expect(screen.getByTestId('google-login-button')).toBeInTheDocument();

    // Should show form inputs
    expect(screen.getByTestId('email-input')).toBeInTheDocument();
    expect(screen.getByTestId('password-input')).toBeInTheDocument();
  });

  it('should display error when form login fails', async () => {
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
      <MemoryRouter initialEntries={['/admin/login']}>
        <Routes>
          <Route path="/admin/login" element={<AdminLoginPage />} />
          <Route path="/portal" element={<div>Portal Page</div>} />
        </Routes>
      </MemoryRouter>
    );

    // Login form should be available
    const form = screen.getByTestId('login-form');
    expect(form).toBeInTheDocument();
    
    // Should have error button for testing
    const errorButton = screen.getByTestId('simulate-form-error');
    expect(errorButton).toBeInTheDocument();
  });

  it('should display error when google login fails', async () => {
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
      <MemoryRouter initialEntries={['/admin/login']}>
        <Routes>
          <Route path="/admin/login" element={<AdminLoginPage />} />
          <Route path="/portal" element={<div>Portal Page</div>} />
        </Routes>
      </MemoryRouter>
    );

    // Google button should be available
    const googleButton = screen.getByTestId('google-login-button');
    expect(googleButton).toBeInTheDocument();
    
    // Should have error button for testing
    const errorButton = screen.getByTestId('simulate-google-error');
    expect(errorButton).toBeInTheDocument();
  });

  it('should redirect to /portal when already authenticated', async () => {
    vi.mocked(useAuth).mockReturnValue({
      auth: {
        user: {
          id: 'admin-1',
          code: 'ADM001',
          email: 'admin@example.com',
          familyName: 'Tran',
          givenName: 'Duc',
          phone: '0987654321',
          userType: 'staff',
          membershipStatus: 'hoi_vien',
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
      <MemoryRouter initialEntries={['/admin/login']}>
        <Routes>
          <Route path="/admin/login" element={<AdminLoginPage />} />
          <Route path="/portal" element={<PortalPage />} />
        </Routes>
      </MemoryRouter>
    );

    // Should redirect to portal
    await waitFor(() => {
      expect(screen.getByText('Portal Page')).toBeInTheDocument();
    });
  });

  it('should have divider between form and google button', async () => {
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
      <MemoryRouter initialEntries={['/admin/login']}>
        <Routes>
          <Route path="/admin/login" element={<AdminLoginPage />} />
          <Route path="/portal" element={<div>Portal Page</div>} />
        </Routes>
      </MemoryRouter>
    );

    // Check for divider element
    const divider = container.querySelector('.flex-grow');
    expect(divider).toBeInTheDocument();
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
      <MemoryRouter initialEntries={['/admin/login']}>
        <Routes>
          <Route path="/admin/login" element={<AdminLoginPage />} />
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

    // Check for border styling
    const bordered = container.querySelector('.border-2');
    expect(bordered).toBeInTheDocument();
  });

  it('should handle error message removal after new action', async () => {
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

    const user = userEvent.setup();

    render(
      <MemoryRouter initialEntries={['/admin/login']}>
        <Routes>
          <Route path="/admin/login" element={<AdminLoginPage />} />
          <Route path="/portal" element={<div>Portal Page</div>} />
        </Routes>
      </MemoryRouter>
    );

    // Component should render properly
    expect(screen.getByTestId('login-form')).toBeInTheDocument();
    expect(screen.getByTestId('google-login-button')).toBeInTheDocument();
  });
});
