const API_BASE_URL = 'http://localhost:9200';

import {
  Organization,
  CreateOrganizationRequest,
  UpdateOrganizationRequest,
  UserOrganization,
  OrganizationStats
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

  async removeUserFromOrganization(organizationId: string, userId: string): Promise<void> {
    await this.request(`/organizations/${organizationId}/members/${userId}`, {
      method: 'DELETE',
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
}

export const organizationService = new OrganizationService();
