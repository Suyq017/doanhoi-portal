import { apiClient } from './apiClient';
import { User } from '../../shared';
import {
  UserQueryParams,
  UsersResponse,
  CreateUserRequest,
  UpdateUserRequest,
  ImportUploadResponse,
  ImportValidationResponse,
  ImportExecuteResponse,
  ImportSession,
  BatchImportRequest,
  BatchImportResponse,
  SessionSummaryDto
} from '../types/user';

class UserService {
  async getUsers(params: UserQueryParams = {}): Promise<UsersResponse> {
    const searchParams = new URLSearchParams();

    if (params.page) searchParams.append('page', params.page.toString());
    if (params.limit) searchParams.append('limit', params.limit.toString());
    if (params.search) searchParams.append('search', params.search);
    if (params.userType) searchParams.append('userType', params.userType);
    if (params.membershipStatus) searchParams.append('membershipStatus', params.membershipStatus);

    const query = searchParams.toString();
    const endpoint = query ? `/users?${query}` : '/users';

    return apiClient.get<UsersResponse>(endpoint);
  }

  async getUserById(id: string): Promise<User> {
    return apiClient.get<User>(`/users/${id}`);
  }

  async createUser(userData: CreateUserRequest): Promise<User> {
    return apiClient.post<User>('/users', userData);
  }

  async updateUser(id: string, userData: UpdateUserRequest): Promise<User> {
    return apiClient.patch<User>(`/users/${id}`, userData);
  }

  async deleteUser(id: string): Promise<void> {
    await apiClient.delete(`/users/${id}`);
  }

  async deleteUsers(ids: string[]): Promise<void> {
    await apiClient.delete('/users/bulk-delete', { ids });
  }  // Import functionality - Server-side processing
  getTemplate(): string {
    return `${apiClient.getBaseURL()}/users/template`;
  }

  async uploadImportFile(file: File): Promise<ImportUploadResponse> {
    const formData = new FormData();
    formData.append('file', file);

    return apiClient.uploadFile<ImportUploadResponse>('/users/import/upload', formData);
  }

  async validateImportData(sessionId: string): Promise<ImportValidationResponse> {
    return apiClient.get<ImportValidationResponse>(`/users/import/${sessionId}/validate`);
  }

  async executeImport(sessionId: string, options?: { skipConflicts?: boolean }): Promise<ImportExecuteResponse> {
    return apiClient.post<ImportExecuteResponse>(`/users/import/${sessionId}/execute`, options);
  }

  async getImportStatus(sessionId: string): Promise<ImportSession> {
    return apiClient.get<ImportSession>(`/users/import/${sessionId}/status`);
  }

  // Batch Import functionality (Phase 4)
  async batchImport(request: BatchImportRequest): Promise<BatchImportResponse> {
    return apiClient.post<BatchImportResponse>('/users/import/batch', request);
  }

  async getBatchSummary(sessionId: string): Promise<SessionSummaryDto> {
    return apiClient.get<SessionSummaryDto>(`/users/import/batch/${sessionId}/summary`);
  }

  async cancelBatchImport(sessionId: string): Promise<void> {
    await apiClient.delete(`/users/import/batch/${sessionId}`);
  }

  // Role assignment functionality
  async assignUserRoles(userId: string, roleAssignments: {
    roleId: string;
    organizationId?: string;
    isActive: boolean;
  }[]): Promise<void> {
    await apiClient.post(`/users/${userId}/roles`, { roleAssignments });
  }

  // Organization membership functionality
  async updateUserOrganizations(userId: string, organizationIds: string[]): Promise<User> {
    return apiClient.put<User>(`/users/${userId}/organizations`, { organizationIds });
  }

  // Tìm kiếm chính xác theo mã số sinh viên
  async findByExactCode(code: string): Promise<User | null> {
    try {
      return await apiClient.get<User>(`/users/find-by-code/${encodeURIComponent(code.trim())}`);
    } catch (error: any) {
      if (error.response?.status === 404) {
        return null;
      }
      throw error;
    }
  }
}

export const userService = new UserService();
