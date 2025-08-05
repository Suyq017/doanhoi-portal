const API_BASE_URL = import.meta.env.VITE_BACKEND_API_URL;

import {
  Organization,
  CreateOrganizationRequest,
  UpdateOrganizationRequest,
  UserOrganization,
  OrganizationStats,
  OrganizationImportData
} from '../types/organization';


class OrganizationService {

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
      let errorData: any = {};

      try {
        errorData = JSON.parse(errorText);
      } catch {
        errorData.message = errorText || 'Unknown error';
      }

      throw {
        status: response.status,
        message: errorData.message || `HTTP error! status: ${response.status}`,
      };
    }

    const contentType = response.headers.get('content-type');
    const hasContent = contentType && contentType.includes('application/json');

    if (hasContent) {
      const text = await response.text();
      return text ? JSON.parse(text) : (null as unknown as T);
    }

    // Nếu không có JSON content, trả về null hoặc status
    return null as T;
  }

  async getOrganizations(): Promise<Organization[]> {
    return this.request<Organization[]>('/organizations');
  }

  async getOrganizationTree(): Promise<Organization[]> {
    return this.request<Organization[]>('/organizations/tree');
  }

  async getOrganizationsByType(type: string): Promise<Organization[]> {
    return this.request<Organization[]>(`/organizations/type/${type}`);
  }

  async getOrganizationById(id: string): Promise<Organization> {
    return this.request<Organization>(`/organizations/${id}`);
  }

  async createOrganization(organizationData: CreateOrganizationRequest): Promise<Organization> {
    return this.request<Organization>('/organizations', {
      method: 'POST',
      body: JSON.stringify(organizationData),
    });
  }

  async updateOrganization(id: string, organizationData: UpdateOrganizationRequest): Promise<Organization> {
    return this.request<Organization>(`/organizations/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(organizationData),
    });
  }

  async deleteOrganization(id: string): Promise<void> {
    await this.request(`/organizations/${id}`, {
      method: 'DELETE',
    });
  }
  async addUserToOrganization(organizationId: string, userId: string, role: string = 'member'): Promise<UserOrganization> {
    return this.request<UserOrganization>(`/organizations/${organizationId}/members/${userId}`, {
      method: 'POST',
      body: JSON.stringify({ role }),
    });
  }

  async addUserToOrganizationWithParents(organizationId: string, userId: string, role: string = 'member'): Promise<UserOrganization[]> {
    return this.request<UserOrganization[]>(`/organizations/${organizationId}/members/${userId}/with-parents`, {
      method: 'POST',
      body: JSON.stringify({ role }),
    });
  }
  async removeUserFromOrganization(organizationId: string, userId: string): Promise<void> {
    await this.request(`/organizations/${organizationId}/members/${userId}`, {
      method: 'DELETE',
    });
  }

  async removeUserFromOrganizationSafely(organizationId: string, userId: string): Promise<void> {
    await this.request(`/organizations/${organizationId}/members/${userId}/safely`, {
      method: 'DELETE',
    });
  }

  async removeUsersFromOrganization(organizationId: string, userIds: string[]): Promise<{
    message: string;
    removedCount: number;
  }> {
    return this.request(`/organizations/${organizationId}/members/bulk-remove`, {
      method: 'DELETE',
      body: JSON.stringify({ userIds }),
    });
  }

  async getOrganizationMembers(
    organizationId: string, 
    page: number = 1, 
    limit: number = 10
  ): Promise<{ members: UserOrganization[], total: number, page: number, limit: number, totalPages: number }> {
    return this.request<{ members: UserOrganization[], total: number, page: number, limit: number, totalPages: number }>(
      `/organizations/${organizationId}/members?page=${page}&limit=${limit}`
    );
  }

  // Bổ sung các API mới theo kế hoạch
  async getOrganizationByTypeAndCode(type: string, code: string): Promise<Organization> {
    return this.request<Organization>(`/organizations/by-type-code/${type}/${code}`);
  }

  async getOrganizationChildren(id: string): Promise<Organization[]> {
    return this.request<Organization[]>(`/organizations/${id}/children`);
  }

  async getOrganizationParent(id: string): Promise<Organization | null> {
    try {
      return this.request<Organization>(`/organizations/${id}/parent`);
    } catch (error) {
      // Nếu 404 (không có parent), return null
      if (error instanceof Error && error.message.includes('404')) {
        return null;
      }
      throw error;
    }
  }

  async getOrganizationBreadcrumb(id: string): Promise<Organization[]> {
    return this.request<Organization[]>(`/organizations/${id}/breadcrumb`);
  }

  async getOrganizationStats(): Promise<OrganizationStats> {
    const response = await this.request<OrganizationStats>('/organizations/stats');
    return response;
  }
  async addMemberBySimpleCode(organizationCode: string, userCode: string): Promise<UserOrganization> {
    return this.request<UserOrganization>(`/organizations/${organizationCode}/member/${userCode}`, {
      method: 'POST',
      body: JSON.stringify({ userCode }),
    });
  } async uploadImportFile(file: File, level: number = 3, organizationId?: string): Promise<{
    sessionId: string;
    previewData: OrganizationImportData[];
  }> {
    const formData = new FormData();
    formData.append('file', file);

    // Validate level parameter
    if (![2, 3].includes(level)) {
      throw new Error('Level phải là 2 hoặc 3');
    }

    // New endpoint format: /organizations/members/import/upload?level={level}&organizationId={organizationId}
    let endpoint = `/organizations/members/import/upload?level=${level}`;
    if (organizationId) {
      endpoint += `&organizationId=${organizationId}`;
    }
    const url = `${API_BASE_URL}${endpoint}`;

    const response = await fetch(url, {
      method: 'POST',
      body: formData
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to upload file');
    }

    return response.json();
  }
  async validateImportData(sessionId: string): Promise<{
    sessionId: string;
    isValid: boolean;
    summary: {
      total: number;
      valid: number;
      invalid: number;
      duplicates: number;
      conflicts: number;
    };
    errors: Array<{
      row: number;
      column: string;
      message: string;
      severity: 'error' | 'warning';
    }>;
    warnings: Array<{
      row: number;
      column: string;
      message: string;
      severity: 'error' | 'warning';
    }>;
    previewData: Array<{
      row: number;
      studentCode: string;
      classOrUnitCode?: string;
      hasErrors: boolean;
      hasWarnings: boolean;
      errors: Array<{
        row: number;
        column: string;
        message: string;
        severity: 'error' | 'warning';
      }>;
      warnings: Array<{
        row: number;
        column: string;
        message: string;
        severity: 'error' | 'warning';
      }>;
    }>;
  }> {
    const response = await fetch(`${API_BASE_URL}/organizations/import/${sessionId}/validate`);

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to validate data');
    }
    return response.json();
  }
  async executeImport(sessionId: string, options?: { skipConflicts?: boolean }): Promise<{
    sessionId: string;
    success: boolean;
    importedCount: number;
    skippedCount: number;
    failedCount: number;
    errors: string[];
    message: string;
  }> {
    const response = await fetch(`${API_BASE_URL}/organizations/import/${sessionId}/execute`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(options || {})
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to execute import');
    }
    return response.json();
  }

  async getImportStatus(sessionId: string): Promise<{
    sessionId: string;
    status: 'processing' | 'completed' | 'failed';
    total: number;
    processed: number;
    errors?: any[];
  }> {
    const response = await fetch(`${API_BASE_URL}/organizations/import/${sessionId}/status`);

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to get import status');
    }
    return response.json();
  }

  async downloadTemplate(level: number = 3): Promise<Blob> {
    const response = await fetch(`${API_BASE_URL}/organizations/members/import/template/${level}`);

    if (!response.ok) {
      throw new Error('Failed to download template');
    }

    return response.blob();
  }

  getTemplate(level: number = 3): string {
    return `${API_BASE_URL}/organizations/template/${level}`;
  }



}

export const organizationService = new OrganizationService();
