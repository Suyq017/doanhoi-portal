import { authService } from '../../features/auth/services/authService';

// Create an enhanced HTTP client with auto token refresh
class ApiClient {
  private baseURL: string;
  private isRefreshing = false;
  private failedQueue: Array<{
    resolve: (value?: any) => void;
    reject: (reason?: any) => void;
  }> = [];
  constructor() {
    this.baseURL = import.meta.env.VITE_BACKEND_API_URL || '/api';
  }

  private processQueue(error: any, token: string | null = null) {
    this.failedQueue.forEach(({ resolve, reject }) => {
      if (error) {
        reject(error);
      } else {
        resolve(token);
      }
    });

    this.failedQueue = [];
  }

  async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${this.baseURL}${endpoint}`;
    const token = authService.getAccessToken();

    // Prepare headers
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(options.headers as Record<string, string>),
    };

    // Add authorization header if token exists
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    let response = await fetch(url, {
      ...options,
      headers,
    });

    // Handle token refresh on 401
    if (response.status === 401 && token) {
      if (this.isRefreshing) {
        // If already refreshing, wait for it to complete
        return new Promise((resolve, reject) => {
          this.failedQueue.push({ resolve, reject });
        }).then(() => {
          // Retry original request with new token
          const newToken = authService.getAccessToken();
          if (newToken) {
            headers['Authorization'] = `Bearer ${newToken}`;
          }
          return fetch(url, { ...options, headers }).then(res => {
            if (res.ok) {
              return res.json();
            }
            throw new Error(`HTTP error! status: ${res.status}`);
          });
        });
      }

      this.isRefreshing = true;

      try {
        const refreshToken = authService.getRefreshToken();
        if (refreshToken) {
          const refreshResponse = await authService.refreshToken(refreshToken);
          authService.setTokens(refreshResponse.accessToken, refreshToken);

          this.processQueue(null, refreshResponse.accessToken);

          // Retry original request with new token
          headers['Authorization'] = `Bearer ${refreshResponse.accessToken}`;
          response = await fetch(url, { ...options, headers });
        } else {
          throw new Error('No refresh token available');
        }
      } catch (error) {
        this.processQueue(error, null);
        // Clear tokens and redirect to login
        authService.clearTokens();
        window.location.href = '/login';
        throw error;
      } finally {
        this.isRefreshing = false;
      }
    }

    if (!response.ok) {
      const errorText = await response.text();
      let errorData: any = {};

      try {
        errorData = JSON.parse(errorText);
      } catch {
        errorData = { message: errorText || `HTTP error! status: ${response.status}` };
      }

      // Create axios-style error object for compatibility
      const error: any = new Error(errorData.message || `HTTP error! status: ${response.status}`);
      error.response = {
        status: response.status,
        data: errorData,
        statusText: response.statusText
      };

      throw error;
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

  // Convenience methods
  get<T>(endpoint: string, options?: RequestInit): Promise<T> {
    return this.request<T>(endpoint, { ...options, method: 'GET' });
  }

  post<T>(endpoint: string, data?: any, options?: RequestInit): Promise<T> {
    return this.request<T>(endpoint, {
      ...options,
      method: 'POST',
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  put<T>(endpoint: string, data?: any, options?: RequestInit): Promise<T> {
    return this.request<T>(endpoint, {
      ...options,
      method: 'PUT',
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  patch<T>(endpoint: string, data?: any, options?: RequestInit): Promise<T> {
    return this.request<T>(endpoint, {
      ...options,
      method: 'PATCH',
      body: data ? JSON.stringify(data) : undefined,
    });
  }
  delete<T>(endpoint: string, data?: any, options?: RequestInit): Promise<T> {
    const headers = data ? { 'Content-Type': 'application/json', ...options?.headers } : options?.headers;
    return this.request<T>(endpoint, {
      ...options,
      method: 'DELETE',
      headers,
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  // Special method for file uploads (uses FormData instead of JSON)
  async uploadFile<T>(endpoint: string, formData: FormData): Promise<T> {
    const url = `${this.baseURL}${endpoint}`;
    const token = authService.getAccessToken();

    // Prepare headers - only add Authorization, let browser set Content-Type for FormData
    const headers: Record<string, string> = {};
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch(url, {
      method: 'POST',
      body: formData,
      headers,
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Upload failed');
    }

    return response.json();
  }

  // Method to get the base URL for template downloads and other direct links
  getBaseURL(): string {
    return this.baseURL;
  }

  // Special method for downloading blobs (files)
  async downloadBlob(endpoint: string, options?: RequestInit): Promise<Blob> {
    const url = `${this.baseURL}${endpoint}`;
    const token = authService.getAccessToken();

    // Prepare headers
    const headers: Record<string, string> = {
      ...(options?.headers as Record<string, string>),
    };

    // Add authorization header if token exists
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch(url, {
      ...options,
      headers,
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    return response.blob();
  }
}

export const apiClient = new ApiClient();
