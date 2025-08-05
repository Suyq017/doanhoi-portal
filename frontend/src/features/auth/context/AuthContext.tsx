import React, { createContext, useContext, useState, ReactNode, useEffect } from 'react';
import { User } from '../../../shared/types/user';
import { authService, AuthResponse, UserRole, UserPermission } from '../services/authService';

export interface AuthState {
  user: User | null;
  token: string | null;
  refreshToken: string | null;
  userRoles: UserRole[];
  userPermissions: UserPermission[];
  isAuthenticated: boolean;
  isLoading: boolean;
  permissionsLoading: boolean;
  currentOrganizationId?: string;
}

export interface AuthContextType {
  auth: AuthState;
  login: (email: string, password: string) => Promise<AuthResponse>;
  googleLogin: (googleToken: string) => Promise<void>;
  logout: () => void;
  setUser: (user: User | null) => void;
  setTokens: (token: string, refreshToken: string) => void;
  clearAuth: () => void;
  hasPermission: (permissionCode: string, organizationId?: string) => boolean;
  hasAnyPermission: (permissionCodes: string[], organizationId?: string) => boolean;
  setCurrentOrganizationId: (orgId?: string) => void;
  loadUserPermissions: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [auth, setAuth] = useState<AuthState>({
    user: null,
    token: null,
    refreshToken: null,
    userRoles: [],
    userPermissions: [],
    isAuthenticated: false,
    isLoading: true,
    permissionsLoading: false,
    currentOrganizationId: undefined,
  });
  // Load user permissions after login
  const loadUserPermissions = async () => {
    if (!auth.user) {
      return;
    }

    setAuth(prev => ({ ...prev, permissionsLoading: true }));

    try {
      const response = await authService.getUserPermissions(auth.user.id, auth.currentOrganizationId);

      // Flatten all permissions from all roles
      const allPermissions = response.roles.reduce((acc: UserPermission[], role) => {
        return [...acc, ...role.permissions];
      }, []);

      // Remove duplicates
      const uniquePermissions = allPermissions.filter((permission, index, self) =>
        index === self.findIndex(p => p.code === permission.code)
      );

      setAuth(prev => ({
        ...prev,
        userRoles: response.roles,
        userPermissions: uniquePermissions,
        permissionsLoading: false,
      }));
    } catch (error) {
      console.error('Failed to load user permissions:', error);
      setAuth(prev => ({
        ...prev,
        userRoles: [],
        userPermissions: [],
        permissionsLoading: false,
      }));
    }
  };
  const hasPermission = (permissionCode: string, organizationId?: string): boolean => {


    if (!auth.user || !auth.userRoles.length) return false;

    // Use current organization context if no specific org provided
    const targetOrgId = organizationId ?? auth.currentOrganizationId;

    // Check if user has the permission in any applicable role
    const hasPermissionResult = auth.userRoles.some(role => {
      // Check organization context
      if (targetOrgId && role.organizationId && role.organizationId !== targetOrgId) {
        return false;
      }

      // Check if role has the required permission
      return role.permissions.some(permission => permission.code === permissionCode);
    });

    return hasPermissionResult;
  };

  const hasAnyPermission = (permissionCodes: string[], organizationId?: string): boolean => {
    return permissionCodes.some(code => hasPermission(code, organizationId));
  };

  const setCurrentOrganizationId = (orgId?: string) => {
    setAuth(prev => ({ ...prev, currentOrganizationId: orgId }));
  };  // Update permissions when organization context changes
  useEffect(() => {
    if (auth.user && auth.isAuthenticated) {
      loadUserPermissions();
    }
  }, [auth.currentOrganizationId]);

  // Load permissions when user is authenticated
  useEffect(() => {
    if (auth.user && auth.isAuthenticated && !auth.permissionsLoading && auth.userRoles.length === 0) {
      loadUserPermissions();
    }
  }, [auth.user, auth.isAuthenticated]);

  useEffect(() => {
    // Check for stored tokens on app start
    const token = authService.getAccessToken();
    const refreshToken = authService.getRefreshToken();
    const userData = authService.getUser();

    if (token && refreshToken && userData) {
      setAuth(prev => ({
        ...prev,
        user: userData,
        token,
        refreshToken,
        isAuthenticated: true,
        isLoading: false,
      }));
    } else {
      setAuth(prev => ({
        ...prev,
        isLoading: false,
        isAuthenticated: false,
        user: null,
        token: null,
        refreshToken: null,
        userRoles: [],
        userPermissions: [],
        permissionsLoading: false,
      }));
    }
  }, []);

  const login = async (email: string, password: string): Promise<AuthResponse> => {
    try {
      setAuth(prev => ({ ...prev, isLoading: true }));

      // Use actual auth service
      const response = await authService.login({ email, password });

      // Store tokens and user data
      authService.setTokens(response.accessToken, response.refreshToken);
      authService.setUser(response.user);

      setAuth(prev => ({
        ...prev,
        user: response.user,
        token: response.accessToken,
        refreshToken: response.refreshToken,
        isAuthenticated: true,
        isLoading: false,
      }));

      // Load user permissions after successful login
      setTimeout(() => loadUserPermissions(), 100);

      return response;
    } catch (error) {
      setAuth(prev => ({ ...prev, isLoading: false }));
      throw error;
    }
  };

  const googleLogin = async (googleToken: string) => {
    try {
      setAuth(prev => ({ ...prev, isLoading: true }));

      // TODO: Implement Google OAuth later
      throw new Error('Google login not implemented yet');
    } catch (error) {
      setAuth(prev => ({ ...prev, isLoading: false }));
      throw error;
    }
  };

  const logout = async () => {
    try {
      const token = authService.getAccessToken();
      if (token) {
        await authService.logout(token);
      }
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      clearAuth();
    }
  };

  const setUser = (user: User | null) => {
    setAuth(prev => ({
      ...prev,
      user,
      isAuthenticated: !!user
    }));
    if (user) {
      authService.setUser(user);
    }
  };
  const setTokens = (token: string, refreshToken: string) => {
    authService.setTokens(token, refreshToken);
    setAuth(prev => ({
      ...prev,
      token,
      refreshToken,
      isAuthenticated: true
    }));
  };
  const clearAuth = () => {
    authService.clearTokens();
    setAuth({
      user: null,
      token: null,
      refreshToken: null,
      userRoles: [],
      userPermissions: [],
      isAuthenticated: false,
      isLoading: false,
      permissionsLoading: false,
      currentOrganizationId: undefined,
    });
  };

  const value: AuthContextType = {
    auth,
    login,
    googleLogin,
    logout,
    setUser,
    setTokens,
    clearAuth,
    hasPermission,
    hasAnyPermission,
    setCurrentOrganizationId,
    loadUserPermissions,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
