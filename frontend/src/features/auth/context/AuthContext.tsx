import React, { createContext, useContext, useState, ReactNode, useEffect } from 'react';
import { User } from '../../../shared/types/user';
import { authService, AuthResponse } from '../services/authService';

export interface AuthState {
  user: User | null;
  token: string | null;
  refreshToken: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
}

export interface AuthContextType {
  auth: AuthState;
  login: (email: string, password: string) => Promise<AuthResponse>;
  googleLogin: (googleToken: string) => Promise<void>;
  logout: () => void;
  setUser: (user: User | null) => void;
  setTokens: (token: string, refreshToken: string) => void;
  clearAuth: () => void;
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
    isAuthenticated: false,
    isLoading: true,
  });

  useEffect(() => {
    // Check for stored tokens on app start
    const token = authService.getAccessToken();
    const refreshToken = authService.getRefreshToken();
    const userData = authService.getUser();

    if (token && refreshToken && userData) {
      setAuth({
        user: userData,
        token,
        refreshToken,
        isAuthenticated: true,
        isLoading: false,
      });
    } else {
      setAuth(prev => ({ ...prev, isLoading: false }));
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
      
      setAuth({
        user: response.user,
        token: response.accessToken,
        refreshToken: response.refreshToken,
        isAuthenticated: true,
        isLoading: false,
      });
      
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
      console.log('Google login attempt:', { googleToken });
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
    setAuth(prev => ({ ...prev, user }));
    if (user) {
      authService.setUser(user);
    }
  };

  const setTokens = (token: string, refreshToken: string) => {
    authService.setTokens(token, refreshToken);
    setAuth(prev => ({ ...prev, token, refreshToken }));
  };

  const clearAuth = () => {
    authService.clearTokens();
    setAuth({
      user: null,
      token: null,
      refreshToken: null,
      isAuthenticated: false,
      isLoading: false,
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
