import React, { createContext, useContext, useState, ReactNode, useEffect } from 'react';
import { User } from '../../../shared/types/user';

export interface AuthState {
  user: User | null;
  token: string | null;
  refreshToken: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
}

export interface AuthContextType {
  auth: AuthState;
  login: (email: string, password: string) => Promise<void>;
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
    const token = localStorage.getItem('accessToken');
    const refreshToken = localStorage.getItem('refreshToken');
    const userData = localStorage.getItem('user');

    if (token && refreshToken && userData) {
      try {
        const user = JSON.parse(userData);
        setAuth({
          user,
          token,
          refreshToken,
          isAuthenticated: true,
          isLoading: false,
        });
      } catch (error) {
        console.error('Error parsing stored user data:', error);
        clearAuth();
      }
    } else {
      setAuth(prev => ({ ...prev, isLoading: false }));
    }
  }, []);

  const login = async (email: string, password: string) => {
    try {
      setAuth(prev => ({ ...prev, isLoading: true }));
      
      // Mock API call - replace with actual API call
      console.log('Login attempt:', { email, password });
      
      // Simulate API response
      const mockResponse = {
        user: {
          id: '1',
          code: 'U001',
          familyName: 'User',
          givenName: 'Test',
          email: email,
          phone: '0123456789',
          userType: 'staff' as const,
          membershipStatus: 'doan_vien' as const,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
        token: 'mock-access-token',
        refreshToken: 'mock-refresh-token',
      };

      // Store tokens
      localStorage.setItem('accessToken', mockResponse.token);
      localStorage.setItem('refreshToken', mockResponse.refreshToken);
      localStorage.setItem('user', JSON.stringify(mockResponse.user));

      setAuth({
        user: mockResponse.user,
        token: mockResponse.token,
        refreshToken: mockResponse.refreshToken,
        isAuthenticated: true,
        isLoading: false,
      });
    } catch (error) {
      setAuth(prev => ({ ...prev, isLoading: false }));
      throw error;
    }
  };

  const googleLogin = async (googleToken: string) => {
    try {
      setAuth(prev => ({ ...prev, isLoading: true }));
      
      // Mock API call - replace with actual API call
      console.log('Google login attempt:', { googleToken });
      
      // Simulate API response
      const mockResponse = {
        user: {
          id: '2',
          code: 'U002',
          familyName: 'User',
          givenName: 'Google',
          email: 'user@gmail.com',
          phone: '0987654321',
          userType: 'student' as const,
          membershipStatus: 'hoi_vien' as const,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
        token: 'mock-google-access-token',
        refreshToken: 'mock-google-refresh-token',
      };

      // Store tokens
      localStorage.setItem('accessToken', mockResponse.token);
      localStorage.setItem('refreshToken', mockResponse.refreshToken);
      localStorage.setItem('user', JSON.stringify(mockResponse.user));

      setAuth({
        user: mockResponse.user,
        token: mockResponse.token,
        refreshToken: mockResponse.refreshToken,
        isAuthenticated: true,
        isLoading: false,
      });
    } catch (error) {
      setAuth(prev => ({ ...prev, isLoading: false }));
      throw error;
    }
  };

  const logout = () => {
    clearAuth();
    // Mock API call for logout
    console.log('Logout');
  };

  const setUser = (user: User | null) => {
    setAuth(prev => ({ ...prev, user }));
    if (user) {
      localStorage.setItem('user', JSON.stringify(user));
    } else {
      localStorage.removeItem('user');
    }
  };

  const setTokens = (token: string, refreshToken: string) => {
    setAuth(prev => ({ ...prev, token, refreshToken }));
    localStorage.setItem('accessToken', token);
    localStorage.setItem('refreshToken', refreshToken);
  };

  const clearAuth = () => {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('user');
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
