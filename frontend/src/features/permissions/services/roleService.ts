// Types
interface Permission {
  id: string;
  code: string;
  name: string;
  description?: string;
  category: string;
  context: 'system' | 'organization';
  isActive: boolean;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

interface Role {
  id: string;
  name: string;
  displayName: string;
  description?: string;
  isSystemRole: boolean;
  isActive: boolean;
  permissions: Permission[];
  createdAt: string;
  updatedAt: string;
}

interface RoleQueryParams {
  page?: number;
  limit?: number;
  search?: string;
  isActive?: boolean;
}

interface RoleListResponse {
  data: Role[];
  total: number;
  totalPages: number;
  currentPage: number;
}

interface CreateRoleRequest {
  name: string;
  displayName: string;
  description?: string;
  permissionIds: string[];
}

interface UpdateRoleRequest extends Partial<CreateRoleRequest> {
  isActive?: boolean;
}

interface AssignRoleRequest {
  userId: string;
  roleId: string;
  organizationId?: string;
}

interface RoleAssignment {
  roleIds: string[];
  organizationIds?: string[];
  isGlobal?: boolean;
}

interface GrantRolesRequest {
  userId: string;
  roleAssignments: RoleAssignment[];
}

const API_BASE_URL = import.meta.env.VITE_BACKEND_API_URL;

export class RoleService {
  private baseUrl = '/roles';

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
  async getRoles(params?: RoleQueryParams): Promise<RoleListResponse> {
    if (!params) {
      return this.request<RoleListResponse>(this.baseUrl);
    }

    // Build query string more carefully
    const queryParams = new URLSearchParams();

    if (params.page !== undefined) {
      queryParams.append('page', params.page.toString());
    }

    if (params.limit !== undefined) {
      queryParams.append('limit', params.limit.toString());
    }

    if (params.search && params.search.trim()) {
      queryParams.append('search', params.search.trim());
    }

    if (params.isActive !== undefined) {
      queryParams.append('isActive', params.isActive.toString());
    } const queryString = queryParams.toString();
    const endpoint = queryString ? `${this.baseUrl}?${queryString}` : this.baseUrl;

    return this.request<RoleListResponse>(endpoint);
  }
  async getUserRoles(userId: string, organizationId?: string): Promise<Role[]> {
    const queryString = organizationId ? `?organizationId=${organizationId}` : '';
    return this.request<Role[]>(`/users/${userId}/roles${queryString}`);
  }

  async getAvailableRoles(): Promise<Role[]> {
    return this.request<Role[]>(`/users/available-roles`);
  }
  async getRoleById(id: string): Promise<Role> {
    return this.request<Role>(`${this.baseUrl}/${id}`);
  }

  async createRole(data: CreateRoleRequest): Promise<Role> {
    return this.request<Role>(this.baseUrl, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateRole(id: string, data: UpdateRoleRequest): Promise<Role> {
    return this.request<Role>(`${this.baseUrl}/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async deleteRole(id: string): Promise<void> {
    await this.request<void>(`${this.baseUrl}/${id}`, {
      method: 'DELETE',
    });
  }

  async bulkDeleteRoles(ids: string[]): Promise<{ message: string; deletedRoles: number; deletedUserRoleAssignments: number; roleNames: string[] }> {
    return this.request<{ message: string; deletedRoles: number; deletedUserRoleAssignments: number; roleNames: string[] }>(this.baseUrl, {
      method: 'DELETE',
      body: JSON.stringify({ ids }),
    });
  }

  async getAvailablePermissions(): Promise<Permission[]> {
    return this.request<Permission[]>(`${this.baseUrl}/available-permissions`);
  }
  async assignRole(data: AssignRoleRequest): Promise<void> {
    await this.request<void>(`/users/${data.userId}/assign-role`, {
      method: 'POST',
      body: JSON.stringify({
        roleId: data.roleId,
        organizationId: data.organizationId
      }),
    });
  }

  async seedDefaults(): Promise<void> {
    await this.request<void>(`${this.baseUrl}/seed-defaults`, {
      method: 'POST',
    });
  }

  async grantRoles(data: GrantRolesRequest): Promise<void> {
    await this.request<void>(`${this.baseUrl}/grant-roles`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }
}

export const roleService = new RoleService();

// Export types for use in other components
export type {
  Permission,
  Role,
  RoleQueryParams,
  RoleListResponse,
  CreateRoleRequest,
  UpdateRoleRequest,
  AssignRoleRequest,
  RoleAssignment,
  GrantRolesRequest
};
