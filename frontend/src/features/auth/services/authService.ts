import { apiClient } from '../../../shared/services/apiClient';

const API_BASE_URL = import.meta.env.VITE_BACKEND_API_URL || '/api';

export interface LoginRequest {
  email: string;
  password: string;
}

export interface AuthResponse {
  user: {
    id: string;
    code: string;
    familyName: string;
    givenName: string;
    email: string;
    phone: string;
    userType: 'student' | 'staff';
    membershipStatus: 'doan_vien' | 'hoi_vien' | 'both' | 'none';
    isActive: boolean;
    lastLogin?: string;
    createdAt: string;
    updatedAt: string;
  };
  accessToken: string;
  refreshToken: string;
}

export interface RefreshTokenRequest {
  refreshToken: string;
}

export interface RefreshTokenResponse {
  accessToken: string;
}

export interface UserPermission {
  id: string;
  code: string;
  name: string;
  category: string;
  context: 'system' | 'organization';
  isActive: boolean;
}

export interface UserRole {
  id: string;
  name: string;
  organizationId?: string;
  permissions: UserPermission[];
}

export interface UserPermissionsResponse {
  userId: string;
  organizationId?: string;
  roles: UserRole[];
}

class AuthService {
  // Use raw fetch for auth operations to avoid circular dependency with apiClient
  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${API_BASE_URL}${endpoint}`;
    const response = await fetch(url, {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      ...options,
    });

    if (!response.ok) {
      const errorText = await response.text();
      let errorMessage = `HTTP error! status: ${response.status}`;

      try {
        const errorData = JSON.parse(errorText);
        errorMessage = errorData.message || errorMessage;
      } catch {
        errorMessage = errorText || errorMessage;
      }

      throw new Error(errorMessage);
    }

    // Check if response has content
    if (response.status === 204 || response.headers.get('content-length') === '0') {
      return null as T;
    }

    // Check if response content type is JSON
    const contentType = response.headers.get('content-type');
    if (contentType && contentType.includes('application/json')) {
      return response.json();
    }

    return null as T;
  }

  async login(credentials: LoginRequest): Promise<AuthResponse> {
    return this.request<AuthResponse>('/auth/login', {
      method: 'POST',
      body: JSON.stringify(credentials),
    });
  }

  async refreshToken(refreshToken: string): Promise<RefreshTokenResponse> {
    return this.request<RefreshTokenResponse>('/auth/refresh', {
      method: 'POST',
      body: JSON.stringify({ refreshToken }),
    });
  }

  async logout(accessToken: string): Promise<void> {
    return this.request<void>('/auth/logout', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
      },
    });
  }

  async getProfile(accessToken: string): Promise<AuthResponse['user']> {
    return this.request<AuthResponse['user']>('/auth/profile', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
      },
    });
  }

  // These methods can use apiClient since they need token refresh capability
  async getUserPermissions(organizationId?: string): Promise<UserPermissionsResponse> {
    const queryParams = organizationId ? `?organizationId=${organizationId}` : '';
    return apiClient.get<UserPermissionsResponse>(`/auth/me/permissions${queryParams}`);
  }

  async getCurrentUser(): Promise<any> {
    return apiClient.get<any>('/auth/profile');
  }

  // Token management in localStorage
  setTokens(accessToken: string, refreshToken: string): void {
    localStorage.setItem('accessToken', accessToken);
    localStorage.setItem('refreshToken', refreshToken);
  }

  getAccessToken(): string | null {
    return localStorage.getItem('accessToken');
  }

  getRefreshToken(): string | null {
    return localStorage.getItem('refreshToken');
  }

  clearTokens(): void {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('user');
  }

  setUser(user: AuthResponse['user']): void {
    localStorage.setItem('user', JSON.stringify(user));
  }

  getUser(): AuthResponse['user'] | null {
    const userData = localStorage.getItem('user');
    if (userData) {
      try {
        return JSON.parse(userData);
      } catch {
        return null;
      }
    }
    return null;
  }
}

export const authService = new AuthService();
