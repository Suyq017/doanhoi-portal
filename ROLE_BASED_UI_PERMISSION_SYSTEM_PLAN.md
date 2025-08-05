# Kế hoạch Hệ thống Phân quyền dựa trên User Roles - Ẩn/Hiện UI Components

## Tổng quan hệ thống hiện tại

Dự án đã có sẵn cơ chế phân quyền hoàn chỉnh với:
- **Backend**: Role-based permissions với entities (Role, Permission, UserRole)
- **Permission Guard**: Bảo vệ API endpoints
- **Seeded Data**: Các roles và permissions mặc định

## Mục tiêu

Thực hiện hệ thống **ẩn/hiện UI components** dựa trên quyền của user hiện tại:
- Ẩn menu items nếu user không có quyền truy cập
- Ẩn action buttons (Create, Edit, Delete, Export) nếu user không có quyền tương ứng
- Hiển thị thông báo phù hợp khi user không có quyền
- Đảm bảo UX mượt mà và bảo mật

---

## I. Frontend Permission System Architecture

### 1. Permission Context & Hooks

#### 1.1. AuthContext Enhancement
Mở rộng AuthContext để lưu trữ user permissions:

```typescript
// frontend/src/shared/contexts/AuthContext.tsx
import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

export interface UserPermission {
  id: string;
  code: string;
  name: string;
  category: string;
  context: 'system' | 'organization';
}

export interface UserRole {
  id: string;
  name: string;
  displayName: string;
  organizationId?: string;
  permissions: UserPermission[];
}

interface AuthContextType {
  user: User | null;
  userRoles: UserRole[];
  userPermissions: UserPermission[];
  isAuthenticated: boolean;
  login: (credentials: LoginRequest) => Promise<void>;
  logout: () => void;
  hasPermission: (permissionCode: string, organizationId?: string) => boolean;
  hasAnyPermission: (permissionCodes: string[], organizationId?: string) => boolean;
  loading: boolean;
  currentOrganizationId?: string;
  setCurrentOrganizationId: (orgId?: string) => void;
}

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [userRoles, setUserRoles] = useState<UserRole[]>([]);
  const [userPermissions, setUserPermissions] = useState<UserPermission[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentOrganizationId, setCurrentOrganizationId] = useState<string>();

  // Load user permissions after login
  const loadUserPermissions = async (userId: string) => {
    try {
      const response = await authService.getUserPermissions(userId, currentOrganizationId);
      setUserRoles(response.roles);
      
      // Flatten all permissions from all roles
      const allPermissions = response.roles.reduce((acc: UserPermission[], role) => {
        return [...acc, ...role.permissions];
      }, []);
      
      // Remove duplicates
      const uniquePermissions = allPermissions.filter((permission, index, self) => 
        index === self.findIndex(p => p.code === permission.code)
      );
      
      setUserPermissions(uniquePermissions);
    } catch (error) {
      console.error('Failed to load user permissions:', error);
      setUserPermissions([]);
      setUserRoles([]);
    }
  };

  const hasPermission = (permissionCode: string, organizationId?: string): boolean => {
    if (!user || !userRoles.length) return false;
    
    // Check if user has the permission in any applicable role
    return userRoles.some(role => {
      // Check organization context
      if (organizationId && role.organizationId && role.organizationId !== organizationId) {
        return false;
      }
      
      // Check if role has the required permission
      return role.permissions.some(permission => permission.code === permissionCode);
    });
  };

  const hasAnyPermission = (permissionCodes: string[], organizationId?: string): boolean => {
    return permissionCodes.some(code => hasPermission(code, organizationId));
  };

  const login = async (credentials: LoginRequest) => {
    setLoading(true);
    try {
      const response = await authService.login(credentials);
      setUser(response.user);
      localStorage.setItem('accessToken', response.accessToken);
      localStorage.setItem('refreshToken', response.refreshToken);
      
      // Load user permissions
      await loadUserPermissions(response.user.id);
    } catch (error) {
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const logout = () => {
    setUser(null);
    setUserRoles([]);
    setUserPermissions([]);
    setCurrentOrganizationId(undefined);
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
  };

  // Update permissions when organization context changes
  useEffect(() => {
    if (user) {
      loadUserPermissions(user.id);
    }
  }, [currentOrganizationId]);

  const value = {
    user,
    userRoles,
    userPermissions,
    isAuthenticated: !!user,
    login,
    logout,
    hasPermission,
    hasAnyPermission,
    loading,
    currentOrganizationId,
    setCurrentOrganizationId,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
```

#### 1.2. Permission Hooks
Tạo các custom hooks để dễ dàng sử dụng trong components:

```typescript
// frontend/src/shared/hooks/usePermissions.ts
import { useAuth } from '../contexts/AuthContext';

export const usePermissions = () => {
  const { hasPermission, hasAnyPermission, currentOrganizationId } = useAuth();

  return {
    // Dashboard permissions
    canAccessDashboard: () => hasPermission('dashboard.access', currentOrganizationId),
    
    // Users permissions
    canAccessUsers: () => hasPermission('users.access', currentOrganizationId),
    canCreateUser: () => hasPermission('users.create', currentOrganizationId),
    canViewUserDetails: () => hasPermission('users.view_details', currentOrganizationId),
    canUpdateUser: () => hasPermission('users.update', currentOrganizationId),
    canDeleteUser: () => hasPermission('users.delete', currentOrganizationId),
    canExportUsers: () => hasPermission('users.export', currentOrganizationId),
    
    // Organizations permissions
    canAccessOrganizations: () => hasPermission('organizations.access', currentOrganizationId),
    canCreateOrganization: () => hasPermission('organizations.create'), // System-wide permission
    canViewOrganizationDetails: () => hasPermission('organizations.view_member_count', currentOrganizationId),
    canAccessChildOrganizations: () => hasPermission('organizations.access_children', currentOrganizationId),
    canUpdateOrganization: () => hasPermission('organizations.update', currentOrganizationId),
    canDeleteOrganization: () => hasPermission('organizations.delete', currentOrganizationId),
    canManageOrganizationMembers: () => hasAnyPermission([
      'organizations.add_member',
      'organizations.remove_member'
    ], currentOrganizationId),
    
    // Departments permissions
    canAccessDepartments: () => hasPermission('departments.access', currentOrganizationId),
    canCreateDepartment: () => hasPermission('departments.create', currentOrganizationId),
    canViewDepartmentDetails: () => hasPermission('departments.view_details', currentOrganizationId),
    canUpdateDepartment: () => hasPermission('departments.update', currentOrganizationId),
    canDeleteDepartment: () => hasPermission('departments.delete', currentOrganizationId),
    
    // Classes permissions
    canAccessClasses: () => hasPermission('classes.access', currentOrganizationId),
    canCreateClass: () => hasPermission('classes.create', currentOrganizationId),
    canViewClassDetails: () => hasPermission('classes.view_details', currentOrganizationId),
    canUpdateClass: () => hasPermission('classes.update', currentOrganizationId),
    canDeleteClass: () => hasPermission('classes.delete', currentOrganizationId),
    
    // Permissions management
    canAccessPermissions: () => hasPermission('permissions.access'), // System-wide
    canCreateRole: () => hasPermission('permissions.create'),
    canUpdateRole: () => hasPermission('permissions.update'),
    canDeleteRole: () => hasPermission('permissions.delete'),
    canViewRoleDetails: () => hasPermission('permissions.view_details'),
    
    // Generic permission check
    hasPermission,
    hasAnyPermission,
  };
};
```

### 2. Permission Components

#### 2.1. PermissionGuard Component
Component để wrap các UI elements cần kiểm tra quyền:

```typescript
// frontend/src/shared/components/PermissionGuard.tsx
import React, { ReactNode } from 'react';
import { usePermissions } from '../hooks/usePermissions';

interface PermissionGuardProps {
  permission?: string;
  permissions?: string[];
  organizationId?: string;
  fallback?: ReactNode;
  children: ReactNode;
  requireAll?: boolean; // true = cần tất cả permissions, false = chỉ cần 1 permission
}

export const PermissionGuard: React.FC<PermissionGuardProps> = ({
  permission,
  permissions,
  organizationId,
  fallback = null,
  children,
  requireAll = false,
}) => {
  const { hasPermission, hasAnyPermission } = usePermissions();

  let hasAccess = false;

  if (permission) {
    hasAccess = hasPermission(permission, organizationId);
  } else if (permissions) {
    if (requireAll) {
      hasAccess = permissions.every(p => hasPermission(p, organizationId));
    } else {
      hasAccess = hasAnyPermission(permissions, organizationId);
    }
  } else {
    // No permission specified, show children
    hasAccess = true;
  }

  return hasAccess ? <>{children}</> : <>{fallback}</>;
};
```

#### 2.2. ConditionalRender Component
Component nhẹ hơn cho việc render có điều kiện:

```typescript
// frontend/src/shared/components/ConditionalRender.tsx
import React, { ReactNode } from 'react';

interface ConditionalRenderProps {
  condition: boolean;
  children: ReactNode;
  fallback?: ReactNode;
}

export const ConditionalRender: React.FC<ConditionalRenderProps> = ({
  condition,
  children,
  fallback = null,
}) => {
  return condition ? <>{children}</> : <>{fallback}</>;
};
```

---

## II. Backend API Enhancement

### 1. User Permissions Endpoint

```typescript
// backend/src/auth/auth.controller.ts - Thêm endpoint
@Get('me/permissions')
@UseGuards(JwtAuthGuard)
@ApiOperation({ summary: 'Get current user permissions' })
async getCurrentUserPermissions(
  @Req() req: any,
  @Query('organizationId') organizationId?: string
) {
  const userId = req.user.id;
  return this.authService.getUserPermissions(userId, organizationId);
}
```

```typescript
// backend/src/auth/auth.service.ts - Thêm method
async getUserPermissions(userId: string, organizationId?: string) {
  // Get user roles with permissions
  const userRoles = await this.rolesService.getUserRoles(userId, organizationId);
  
  return {
    userId,
    organizationId,
    roles: userRoles.map(userRole => ({
      id: userRole.role.id,
      name: userRole.role.name,
      displayName: userRole.role.displayName,
      organizationId: userRole.organizationId,
      permissions: userRole.role.permissions.filter(p => p.isActive),
    })),
  };
}
```

### 2. AuthService Frontend Enhancement

```typescript
// frontend/src/features/auth/services/authService.ts - Thêm method
async getUserPermissions(userId: string, organizationId?: string) {
  const queryParams = organizationId ? `?organizationId=${organizationId}` : '';
  return this.request<{
    userId: string;
    organizationId?: string;
    roles: UserRole[];
  }>(`/auth/me/permissions${queryParams}`, {
    headers: {
      Authorization: `Bearer ${localStorage.getItem('accessToken')}`,
    },
  });
}
```

---

## III. Layout & Navigation Updates

### 1. Protected Navigation Menu

```typescript
// frontend/src/shared/components/Layout.tsx - Updated with permissions
import { usePermissions } from '../hooks/usePermissions';
import { PermissionGuard } from './PermissionGuard';

const Layout: React.FC<LayoutProps> = ({ children }) => {
  const permissions = usePermissions();
  
  // Filter navigation items based on permissions
  const getFilteredNavigation = () => {
    const baseNavigation = [
      { 
        name: t('navigation.dashboard'), 
        href: '/', 
        icon: Home,
        requiredPermission: 'dashboard.access'
      },
      { 
        name: t('navigation.users'), 
        href: '/users', 
        icon: Users,
        requiredPermission: 'users.access'
      },
      { 
        name: t('navigation.organizations'), 
        href: '/organizations', 
        icon: Building,
        requiredPermission: 'organizations.access'
      },
      {
        name: t('navigation.dataManagement'),
        key: 'dataManagement',
        icon: Database,
        children: [
          { 
            name: t('navigation.departments'), 
            href: '/departments', 
            icon: Building2,
            requiredPermission: 'departments.access'
          },
          { 
            name: t('navigation.classes'), 
            href: '/classes', 
            icon: GraduationCap,
            requiredPermission: 'classes.access'
          },
        ]
      },
      { 
        name: t('navigation.permissions'), 
        href: '/permissions', 
        icon: Shield,
        requiredPermission: 'permissions.access'
      },
    ];

    // Filter items based on permissions
    return baseNavigation.filter(item => {
      if ('requiredPermission' in item) {
        return permissions.hasPermission(item.requiredPermission);
      }
      
      if ('children' in item && item.children) {
        // Filter children and only show parent if at least one child is accessible
        const accessibleChildren = item.children.filter(child => 
          child.requiredPermission ? permissions.hasPermission(child.requiredPermission) : true
        );
        return accessibleChildren.length > 0;
      }
      
      return true;
    }).map(item => {
      if ('children' in item && item.children) {
        return {
          ...item,
          children: item.children.filter(child => 
            child.requiredPermission ? permissions.hasPermission(child.requiredPermission) : true
          )
        };
      }
      return item;
    });
  };

  const navigation = getFilteredNavigation();

  return (
    <div className={`min-h-screen bg-background ${isDarkMode ? 'dark' : ''}`}>
      {/* Rest of layout code... */}
      <nav className="flex-1 p-4 space-y-2">
        {navigation.map((item) => {
          // Navigation rendering logic remains the same
          // Items are already filtered by permissions
        })}
      </nav>
    </div>
  );
};
```

---

## IV. Page-Level Permission Implementation

### 1. Users Page Protection

```typescript
// frontend/src/features/users/UsersPage.tsx - Updated with permissions
import { usePermissions } from '../../shared/hooks/usePermissions';
import { PermissionGuard } from '../../shared/components/PermissionGuard';
import { ConditionalRender } from '../../shared/components/ConditionalRender';

const UsersPage: React.FC = () => {
  const permissions = usePermissions();

  // Page-level access control
  if (!permissions.canAccessUsers()) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <Shield className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
            {t('common:errors.accessDenied')}
          </h3>
          <p className="text-gray-500 dark:text-gray-400">
            {t('common:errors.noPermissionToAccess')}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with Create Button */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            {t('users:title')}
          </h1>
          <p className="mt-2 text-gray-600 dark:text-gray-400">
            {t('users:subtitle')}
          </p>
        </div>
        
        {/* Create User Button - Only show if user has permission */}
        <PermissionGuard permission="users.create">
          <button
            onClick={() => setShowCreateModal(true)}
            className="btn-primary flex items-center space-x-2"
          >
            <Plus className="w-5 h-5" />
            <span>{t('users:actions.create')}</span>
          </button>
        </PermissionGuard>
      </div>

      {/* Export Button */}
      <div className="flex justify-end">
        <PermissionGuard permission="users.export">
          <ExportButton
            onExport={handleExport}
            loading={exportLoading}
            disabled={!selectedUsers.length}
          />
        </PermissionGuard>
      </div>

      {/* Users Table with Action Buttons */}
      <div className="bg-white dark:bg-gray-800 shadow rounded-lg">
        <UserTable
          users={users}
          loading={loading}
          onView={(user) => setSelectedUser(user)}
          onEdit={(user) => handleEdit(user)}
          onDelete={(user) => handleDelete(user)}
          permissions={{
            canView: permissions.canViewUserDetails(),
            canEdit: permissions.canUpdateUser(),
            canDelete: permissions.canDeleteUser(),
          }}
        />
      </div>

      {/* Modals */}
      <PermissionGuard permission="users.create">
        <CreateUserModal
          isOpen={showCreateModal}
          onClose={() => setShowCreateModal(false)}
          onSubmit={handleCreateUser}
        />
      </PermissionGuard>

      <PermissionGuard permission="users.view_details">
        <ViewUserModal
          isOpen={!!selectedUser}
          user={selectedUser}
          onClose={() => setSelectedUser(null)}
        />
      </PermissionGuard>
    </div>
  );
};
```

### 2. UserTable Component with Permission-based Actions

```typescript
// frontend/src/shared/components/UserTable/UserTable.tsx - Updated
interface UserTableProps {
  users: User[];
  loading: boolean;
  onView?: (user: User) => void;
  onEdit?: (user: User) => void;
  onDelete?: (user: User) => void;
  permissions: {
    canView: boolean;
    canEdit: boolean;
    canDelete: boolean;
  };
}

const UserTable: React.FC<UserTableProps> = ({
  users,
  loading,
  onView,
  onEdit,
  onDelete,
  permissions,
}) => {
  const { t } = useTranslation(['users', 'common']);

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
        <thead className="bg-gray-50 dark:bg-gray-800">
          <tr>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
              {t('users:fields.name')}
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
              {t('users:fields.email')}
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
              {t('users:fields.userType')}
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
              {t('common:fields.status')}
            </th>
            {/* Only show Actions column if user has any action permissions */}
            {(permissions.canView || permissions.canEdit || permissions.canDelete) && (
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                {t('common:fields.actions')}
              </th>
            )}
          </tr>
        </thead>
        <tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-700">
          {users.map((user) => (
            <tr key={user.id} className="hover:bg-gray-50 dark:hover:bg-gray-800">
              <td className="px-6 py-4 whitespace-nowrap">
                <div className="flex items-center">
                  <div className="flex-shrink-0 h-10 w-10">
                    <div className="h-10 w-10 rounded-full bg-gray-300 dark:bg-gray-600 flex items-center justify-center">
                      <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                        {user.familyName.charAt(0)}{user.givenName.charAt(0)}
                      </span>
                    </div>
                  </div>
                  <div className="ml-4">
                    <div className="text-sm font-medium text-gray-900 dark:text-white">
                      {user.familyName} {user.givenName}
                    </div>
                    <div className="text-sm text-gray-500 dark:text-gray-400">
                      {user.code}
                    </div>
                  </div>
                </div>
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                {user.email}
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                {t(`users:userTypes.${user.userType}`)}
              </td>
              <td className="px-6 py-4 whitespace-nowrap">
                <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                  user.isActive 
                    ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                    : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                }`}>
                  {user.isActive ? t('common:status.active') : t('common:status.inactive')}
                </span>
              </td>
              {/* Actions Column - Only show if user has any permissions */}
              {(permissions.canView || permissions.canEdit || permissions.canDelete) && (
                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                  <div className="flex items-center justify-end space-x-2">
                    <ConditionalRender condition={permissions.canView}>
                      <button
                        onClick={() => onView?.(user)}
                        className="text-indigo-600 hover:text-indigo-900 dark:text-indigo-400 dark:hover:text-indigo-300"
                        title={t('common:actions.view')}
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                    </ConditionalRender>
                    
                    <ConditionalRender condition={permissions.canEdit}>
                      <button
                        onClick={() => onEdit?.(user)}
                        className="text-blue-600 hover:text-blue-900 dark:text-blue-400 dark:hover:text-blue-300"
                        title={t('common:actions.edit')}
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                    </ConditionalRender>
                    
                    <ConditionalRender condition={permissions.canDelete}>
                      <button
                        onClick={() => onDelete?.(user)}
                        className="text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300"
                        title={t('common:actions.delete')}
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </ConditionalRender>
                  </div>
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};
```

---

## V. Organization Context Handling

### 1. Organization Context Provider

```typescript
// frontend/src/shared/contexts/OrganizationContext.tsx
import React, { createContext, useContext, useState, useEffect } from 'react';
import { useAuth } from './AuthContext';

interface OrganizationContextType {
  currentOrganizationId?: string;
  currentOrganization?: Organization;
  setCurrentOrganization: (orgId?: string) => void;
  isSystemWideContext: boolean;
}

const OrganizationContext = createContext<OrganizationContextType | undefined>(undefined);

export const useOrganizationContext = () => {
  const context = useContext(OrganizationContext);
  if (!context) {
    throw new Error('useOrganizationContext must be used within OrganizationProvider');
  }
  return context;
};

export const OrganizationProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { setCurrentOrganizationId } = useAuth();
  const [currentOrganizationId, setCurrentOrgId] = useState<string>();
  const [currentOrganization, setCurrentOrg] = useState<Organization>();

  const setCurrentOrganization = (orgId?: string) => {
    setCurrentOrgId(orgId);
    setCurrentOrganizationId(orgId);
    
    if (orgId) {
      // Load organization details
      organizationService.getOrganization(orgId)
        .then(org => setCurrentOrg(org))
        .catch(err => console.error('Failed to load organization:', err));
    } else {
      setCurrentOrg(undefined);
    }
  };

  const value = {
    currentOrganizationId,
    currentOrganization,
    setCurrentOrganization,
    isSystemWideContext: !currentOrganizationId,
  };

  return (
    <OrganizationContext.Provider value={value}>
      {children}
    </OrganizationContext.Provider>
  );
};
```

---

## VI. Implementation Timeline

### Phase 1: Core Permission System (Tuần 1)
- [ ] **AuthContext Enhancement**: Mở rộng AuthContext với permission management
- [ ] **Permission Hooks**: Tạo usePermissions hook với các helper functions
- [ ] **Backend API**: Thêm endpoint `/auth/me/permissions`
- [ ] **Permission Components**: Tạo PermissionGuard và ConditionalRender components
- [ ] **Testing**: Unit tests cho permission logic

### Phase 2: Navigation & Layout (Tuần 2)
- [ ] **Protected Navigation**: Cập nhật Layout component với permission-based menu filtering
- [ ] **Organization Context**: Implement OrganizationContext cho multi-tenant support
- [ ] **Route Protection**: Thêm route-level permission checking
- [ ] **Loading States**: Proper loading states khi check permissions
- [ ] **Error Handling**: Permission denied screens

### Phase 3: Page-Level Implementation (Tuần 3)
- [ ] **UsersPage**: Implement permission-based UI hiding/showing
- [ ] **OrganizationsPage**: Implement với organization context
- [ ] **DepartmentsPage**: Permission-based actions
- [ ] **ClassesPage**: Permission-based actions
- [ ] **PermissionsPage**: System-wide permission management
- [ ] **Dashboard**: Context-aware permission display

### Phase 4: Component-Level Implementation (Tuần 4)
- [ ] **Table Components**: Update UserTable, OrganizationTable với permission props
- [ ] **Action Buttons**: Permission-based button visibility
- [ ] **Modal Components**: Permission checking trong các modals
- [ ] **Export/Import**: Permission-based feature access
- [ ] **Bulk Actions**: Permission-based bulk operations

### Phase 5: Testing & Polish (Tuần 5)
- [ ] **Integration Testing**: End-to-end permission flow testing
- [ ] **Performance Optimization**: Permission checking optimization
- [ ] **UX Improvements**: Smooth transitions khi permissions change
- [ ] **Documentation**: User guide cho permission system
- [ ] **Security Review**: Ensure no permission bypass possibilities

---

## VII. Permission Mapping Reference

### 1. Page Access Permissions
```typescript
const PAGE_PERMISSIONS = {
  '/': 'dashboard.access',
  '/users': 'users.access',
  '/organizations': 'organizations.access',
  '/departments': 'departments.access',
  '/classes': 'classes.access',
  '/permissions': 'permissions.access',
};
```

### 2. Action Permissions Mapping
```typescript
const ACTION_PERMISSIONS = {
  // Users actions
  'users.create': 'users.create',
  'users.view': 'users.view_details',
  'users.edit': 'users.update',
  'users.delete': 'users.delete',
  'users.export': 'users.export',
  
  // Organizations actions
  'organizations.create': 'organizations.create',
  'organizations.view': 'organizations.view_member_count',
  'organizations.edit': 'organizations.update',
  'organizations.delete': 'organizations.delete',
  'organizations.viewChildren': 'organizations.access_children',
  'organizations.addMember': 'organizations.add_member',
  'organizations.removeMember': 'organizations.remove_member',
  
  // Departments actions
  'departments.create': 'departments.create',
  'departments.view': 'departments.view_details',
  'departments.edit': 'departments.update',
  'departments.delete': 'departments.delete',
  
  // Classes actions
  'classes.create': 'classes.create',
  'classes.view': 'classes.view_details',
  'classes.edit': 'classes.update',
  'classes.delete': 'classes.delete',
  
  // Permissions actions
  'permissions.create': 'permissions.create',
  'permissions.view': 'permissions.view_details',
  'permissions.edit': 'permissions.update',
  'permissions.delete': 'permissions.delete',
};
```

---

## VIII. Best Practices & Security Considerations

### 1. Security Guidelines
- **Never rely solely on frontend permission checking** - Backend must always validate
- **Permission checks should be fast** - Cache permissions in context
- **Handle permission changes gracefully** - Real-time updates when roles change
- **Fallback gracefully** - Show appropriate messages for denied access

### 2. Performance Optimization
- **Minimize permission checks** - Use useMemo for expensive computations
- **Batch permission loading** - Load all user permissions at once
- **Cache organization context** - Avoid repeated API calls

### 3. UX Considerations
- **Progressive disclosure** - Show what users can access gradually
- **Clear messaging** - Explain why features are not available
- **Consistent behavior** - Same permission = same behavior across app
- **Loading states** - Show loading while checking permissions

### 4. Development Guidelines
- **Use permission hooks consistently** - Don't check permissions manually
- **Test permission scenarios** - Include permission testing in all components
- **Document permission requirements** - Clear documentation for each feature
- **Handle edge cases** - User with no roles, expired sessions, etc.

---

## IX. Testing Strategy

### 1. Unit Tests
```typescript
// Example test for permission hooks
describe('usePermissions', () => {
  it('should return true for user with correct permission', () => {
    const { result } = renderHook(() => usePermissions(), {
      wrapper: ({ children }) => (
        <AuthProvider>
          <MockUserWithPermissions permissions={['users.create']}>
            {children}
          </MockUserWithPermissions>
        </AuthProvider>
      ),
    });
    
    expect(result.current.canCreateUser()).toBe(true);
  });
  
  it('should return false for user without permission', () => {
    const { result } = renderHook(() => usePermissions(), {
      wrapper: ({ children }) => (
        <AuthProvider>
          <MockUserWithPermissions permissions={[]}>
            {children}
          </MockUserWithPermissions>
        </AuthProvider>
      ),
    });
    
    expect(result.current.canCreateUser()).toBe(false);
  });
});
```

### 2. Integration Tests
- Test complete permission flow from login to UI updates
- Test organization context switching
- Test real-time permission updates

### 3. E2E Tests
- Test user workflows with different permission levels
- Test permission denial scenarios
- Test role changes and immediate UI updates

---

## X. Migration Plan

### 1. Backward Compatibility
- Implement permission system alongside existing code
- Gradually migrate pages one by one
- Maintain existing functionality during migration

### 2. Data Migration
- Ensure all existing users have proper role assignments
- Validate permission data consistency
- Create migration scripts for role assignments

### 3. Rollout Strategy
- **Phase 1**: Internal testing with admin accounts
- **Phase 2**: Limited rollout to test users
- **Phase 3**: Full production deployment
- **Phase 4**: Remove old permission checking code

---

**Tổng thời gian thực hiện: 5 tuần**

Kế hoạch này sẽ tạo ra một hệ thống phân quyền UI hoàn chỉnh, bảo mật và dễ sử dụng, đảm bảo người dùng chỉ thấy và truy cập được những tính năng mà họ có quyền sử dụng.
