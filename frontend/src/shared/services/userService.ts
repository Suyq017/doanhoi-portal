const API_BASE_URL = 'http://localhost:9200';

// Import types
export interface ImportUploadResponse {
  sessionId: string;
  fileName: string;
  totalRows: number;
  message: string;
}

export interface ImportValidationResponse {
  sessionId: string;
  isValid: boolean;
  summary: {
    total: number;
    valid: number;
    invalid: number;
    duplicates: number;
    conflicts: number;
  };
  errors: any[];
  warnings: any[];
  validationResults: any[];
  canProceed: boolean;
}

export interface ImportExecuteResponse {
  sessionId: string;
  success: boolean;
  message: string;
  importedCount: number;
  skippedCount: number;
  failedCount: number;
  errors: string[];
}

export interface ImportSession {
  id: string;
  fileName: string;
  totalRows: number;
  validRows: number;
  invalidRows: number;
  status: 'pending' | 'validated' | 'importing' | 'completed' | 'failed';
  createdAt: string;
  completedAt?: string;
  errorMessage?: string;
  results?: any;
}

export interface User {
  id: string;
  code: string;
  familyName: string;
  givenName: string;
  email: string;
  phone: string;
  password?: string;
  googleId?: string;
  userType: 'student' | 'staff';
  membershipStatus: 'doan_vien' | 'hoi_vien' | 'both' | 'none';
  createdAt: string;
  updatedAt: string;
  managementDepartment?: any;
  trainingDepartment?: any;
  class?: any;
}

export interface CreateUserRequest {
  code: string;
  familyName: string;
  givenName: string;
  email: string;
  phone: string;
  password?: string;
  userType?: 'student' | 'staff';
  membershipStatus?: 'doan_vien' | 'hoi_vien' | 'both' | 'none';
  managementDepartmentId?: string;
  trainingDepartmentId?: string;
  classId?: string;
}

export interface UpdateUserRequest extends Partial<CreateUserRequest> {}

export interface UsersResponse {
  users: User[];
  total: number;
}

export interface UserQueryParams {
  page?: number;
  limit?: number;
  search?: string;
  userType?: 'student' | 'staff';
  membershipStatus?: 'doan_vien' | 'hoi_vien' | 'both' | 'none';
}

class UserService {
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
      throw new Error(`HTTP error! status: ${response.status}`);
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

  async getUsers(params: UserQueryParams = {}): Promise<UsersResponse> {
    const searchParams = new URLSearchParams();
    
    if (params.page) searchParams.append('page', params.page.toString());
    if (params.limit) searchParams.append('limit', params.limit.toString());
    if (params.search) searchParams.append('search', params.search);
    if (params.userType) searchParams.append('userType', params.userType);
    if (params.membershipStatus) searchParams.append('membershipStatus', params.membershipStatus);

    const query = searchParams.toString();
    const endpoint = query ? `/users?${query}` : '/users';
    
    return this.request<UsersResponse>(endpoint);
  }

  async getUserById(id: string): Promise<User> {
    return this.request<User>(`/users/${id}`);
  }

  async createUser(userData: CreateUserRequest): Promise<User> {
    return this.request<User>('/users', {
      method: 'POST',
      body: JSON.stringify(userData),
    });
  }

  async updateUser(id: string, userData: UpdateUserRequest): Promise<User> {
    return this.request<User>(`/users/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(userData),
    });
  }

  async deleteUser(id: string): Promise<void> {
    await this.request(`/users/${id}`, {
      method: 'DELETE',
    });
  }

  // Import functionality - Server-side processing
  getTemplate(): string {
    return `${API_BASE_URL}/users/template`;
  }

  async uploadImportFile(file: File): Promise<ImportUploadResponse> {
    const formData = new FormData();
    formData.append('file', file);

    const response = await fetch(`${API_BASE_URL}/users/import/upload`, {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: 'Upload failed' }));
      throw new Error(error.message || 'Upload failed');
    }

    return response.json();
  }

  async validateImportData(sessionId: string): Promise<ImportValidationResponse> {
    return this.request<ImportValidationResponse>(`/users/import/${sessionId}/validate`);
  }

  async executeImport(sessionId: string, options?: { skipConflicts?: boolean }): Promise<ImportExecuteResponse> {
    return this.request<ImportExecuteResponse>(`/users/import/${sessionId}/execute`, {
      method: 'POST',
      body: JSON.stringify(options || {}),
    });
  }

  async getImportStatus(sessionId: string): Promise<ImportSession> {
    return this.request<ImportSession>(`/users/import/${sessionId}/status`);
  }
}

export const userService = new UserService();
