const API_BASE_URL = 'http://localhost:9200';

export interface Organization {
  id: string;
  name: string;
  type: string;
  description?: string;
  parentId?: string;
  parent?: Organization;
  children?: Organization[];
  createdAt: string;
  updatedAt: string;
}

export interface CreateOrganizationRequest {
  name: string;
  type: string;
  description?: string;
  parentId?: string;
}

export interface UpdateOrganizationRequest extends Partial<CreateOrganizationRequest> {}

export interface UserOrganization {
  id: string;
  userId: string;
  organizationId: string;
  role: string;
  isActive: boolean;
  joinedAt: string;
  user?: any;
  organization?: Organization;
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
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    return response.json();
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
}

export const organizationService = new OrganizationService();
