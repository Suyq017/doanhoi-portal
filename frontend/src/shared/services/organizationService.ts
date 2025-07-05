const API_BASE_URL = import.meta.env.VITE_BACKEND_API_URL;

import {
  Organization,
  CreateOrganizationRequest,
  UpdateOrganizationRequest,
  UserOrganization,
  OrganizationStats,
} from '../types/organization';

import {
  ImportValidationResult,
  ImportExecutionResult,
} from '../types/import';

export interface OrganizationImportData {
  studentCode: string;
  classOrUnitCode?: string;
}

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
  async removeUserFromOrganization(organizationId: string, userId: string): Promise<void> {
    await this.request(`/organizations/${organizationId}/members/${userId}`, {
      method: 'DELETE',
    });
  }

  async removeUsersFromOrganization(organizationId: string, userIds: string[]): Promise<void> {
    await this.request(`/organizations/${organizationId}/members/bulk-remove`, {
      method: 'DELETE',
      body: JSON.stringify({ userIds }),
    });
  }

  async getOrganizationMembers(organizationId: string): Promise<UserOrganization[]> {
    return this.request<UserOrganization[]>(`/organizations/${organizationId}/members`);
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
  }
  async uploadImportFile(file: File, organizationId?: string, level: number = 3): Promise<{
    sessionId: string;
    previewData: any[];
    fileName: string;
    totalRows: number;
    message: string;
  }> {
    const formData = new FormData();
    formData.append('file', file);

    const response = await fetch(`${API_BASE_URL}/organizations/${organizationId || ''}/members/import/upload?level=${level}`, {
      method: 'POST',
      body: formData
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: 'Upload failed' }));
      throw new Error(error.message || 'Upload failed');
    }

    const result = await response.json();
    return {
      sessionId: result.sessionId,
      previewData: result.previewData,
      fileName: file.name,
      totalRows: result.previewData?.length ?? 0,
      message: result.message || 'Upload successful',
    };
  }

  async validateImportData(sessionId: string): Promise<any> {
    return this.request(`/organizations/import/${sessionId}/validate`);
  }

  async executeImport(sessionId: string, options?: { skipConflicts?: boolean }): Promise<any> {
    return this.request(`/organizations/import/${sessionId}/execute`, {
      method: 'POST',
      body: JSON.stringify(options || {})
    });
  }

  async getImportStatus(sessionId: string): Promise<any> {
    return this.request(`/organizations/import/${sessionId}/status`);
  }

  async downloadTemplate(level: number = 3): Promise<Blob> {
    const response = await fetch(`/organizations/members/import/template/${level}`);

    if (!response.ok) {
      throw new Error('Failed to download template');
    }

    return response.blob();
  }
  getTemplateByLevel(level: number): string {
    return `${API_BASE_URL}/organizations/template/${level}`;
  }
  // Legacy methods for backward compatibility (có thể bỏ nếu không cần)
  async parseFile(file: File): Promise<OrganizationImportData[]> {
    // This is just a placeholder - actual parsing should be done server-side
    return [];
  }

  async validateData(data: OrganizationImportData[]): Promise<ImportValidationResult[]> {
    // This is just a placeholder - actual validation should be done server-side
    return [];
  }

  async importData(data: OrganizationImportData[]): Promise<ImportExecutionResult> {
    // This is just a placeholder - actual import should be done server-side
    return { total: 0, successful: 0, failed: 0, errors: [] };
  }


}

export const organizationService = new OrganizationService();
