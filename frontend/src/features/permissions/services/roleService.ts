import { apiClient } from '../../../shared/services/apiClient';

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
  description?: string;
  permissionIds: string[];
}

interface UpdateRoleRequest {
  description?: string;
  permissionIds?: string[];
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

export class RoleService {
  private baseUrl = '/roles'; async getRoles(params?: RoleQueryParams): Promise<RoleListResponse> {
    if (!params) {
      return apiClient.get<RoleListResponse>(this.baseUrl);
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

    return apiClient.get<RoleListResponse>(endpoint);
  }
  async getUserRoles(userId: string, organizationId?: string): Promise<Role[]> {
    const queryString = organizationId ? `?organizationId=${organizationId}` : '';
    return apiClient.get<Role[]>(`/users/${userId}/roles${queryString}`);
  }

  async getAvailableRoles(): Promise<Role[]> {
    return apiClient.get<Role[]>(`/users/available-roles`);
  }
  async getRoleById(id: string): Promise<Role> {
    return apiClient.get<Role>(`${this.baseUrl}/${id}`);
  }

  async createRole(data: CreateRoleRequest): Promise<Role> {
    return apiClient.post<Role>(this.baseUrl, data);
  } async updateRole(id: string, data: UpdateRoleRequest): Promise<Role> {
    console.log('=== DEBUG roleService.updateRole ===');
    console.log('Role ID:', id);
    console.log('Update data:', data);
    console.log('Request body:', JSON.stringify(data, null, 2));

    return apiClient.put<Role>(`${this.baseUrl}/${id}`, data);
  }

  async deleteRole(id: string): Promise<void> {
    await apiClient.delete<void>(`${this.baseUrl}/${id}`);
  } async bulkDeleteRoles(ids: string[]): Promise<{ message: string; deletedRoles: number; deletedUserRoleAssignments: number; roleNames: string[] }> {
    console.log('🗑️ Bulk delete roles request:', { ids, endpoint: `${this.baseUrl}` });

    return apiClient.delete<{ message: string; deletedRoles: number; deletedUserRoleAssignments: number; roleNames: string[] }>(this.baseUrl, { ids });
  }

  async getAvailablePermissions(): Promise<Permission[]> {
    return apiClient.get<Permission[]>(`${this.baseUrl}/available-permissions`);
  }
  async assignRole(data: AssignRoleRequest): Promise<void> {
    await apiClient.post<void>(`/users/${data.userId}/assign-role`, {
      roleId: data.roleId,
      organizationId: data.organizationId
    });
  }

  async seedDefaults(): Promise<void> {
    await apiClient.post<void>(`${this.baseUrl}/seed-defaults`);
  }
  async grantRoles(data: GrantRolesRequest): Promise<void> {
    await apiClient.post<void>(`${this.baseUrl}/grant-roles`, data);
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
