export interface Permission {
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

export interface Role {
  id: string;
  name: string;
  description?: string;
  isSystemRole: boolean;
  isActive: boolean;
  permissions: Permission[];
  createdAt: string;
  updatedAt: string;
}

export interface UserRole {
  id: string;
  userId: string;
  roleId: string;
  organizationId?: string;
  isActive: boolean;
  assignedAt: string;
  role: Role;
  organization?: {
    id: string;
    name: string;
  };
}

export interface PermissionGroup {
  category: string;
  name: string;
  icon: string;
  permissions: Permission[];
  hasSelectAll: boolean;
}

// API request/response types
export interface CreateRoleRequest {
  name: string;
  description?: string;
  permissionIds: string[];
}

export interface UpdateRoleRequest {
  description?: string;
  permissionIds?: string[];
  isActive?: boolean;
}

export interface RoleQueryParams {
  page?: number;
  limit?: number;
  search?: string;
  isActive?: boolean;
}

export interface RoleListResponse {
  data: Role[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface AssignRoleRequest {
  userId: string;
  roleId: string;
  organizationId?: string;
}
