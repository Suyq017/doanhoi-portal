# Kế hoạch triển khai Hệ thống Gán Role Tự động cho Tổ chức Cha

## 🎯 Mục tiêu
Khi gán role cho user trong tổ chức con, hệ thống sẽ tự động gán role "view" cho user đó ở tất cả các tổ chức cha, đảm bảo user có thể navigate từ tổ chức cha xuống tổ chức con.

## 💡 Ý tưởng Core
```
Khi: Admin gán role "Editor" cho User X vào Organization B (con của Organization A)
Thì: Hệ thống tự động:
1. Gán role "Editor" cho User X tại Organization B (như hiện tại)  
2. Tự động gán role "Viewer" cho User X tại Organization A (tổ chức cha)
3. Nếu Organization A cũng có cha (Organization Root), thì gán "Viewer" tại Organization Root

Kết quả: User X có thể thấy icon "view" ở Organization A và Organization Root để navigate xuống Organization B
```

## 📋 Phân tích Hiện trạng

### Cấu trúc Role hiện tại:
- Các roles có thể có: `Admin`, `Editor`, `Viewer`, `Member` (cần xác nhận)
- User-Organization-Role relationship được lưu trong bảng `user_roles` hoặc tương tự
- Frontend sử dụng permissions dựa trên roles để hiển thị UI

### Vấn đề cần giải quyết:
- User có role trong org con không thể thấy/navigate qua org cha
- Cần mechanism tự động gán "view" role cho ancestors
- Cần quản lý conflict khi user đã có role cao hơn "Viewer" tại ancestor
- Cần cleanup khi remove role khỏi org con

## 🏗️ Kiến trúc Giải pháp

### 1. Backend Changes

#### A. Database Schema Updates
```sql
-- Thêm bảng để track auto-assigned roles (để phân biệt với manual roles)
CREATE TABLE user_role_assignments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id),
    organization_id UUID NOT NULL REFERENCES organizations(id),
    role_id UUID NOT NULL REFERENCES roles(id),
    assignment_type VARCHAR(20) NOT NULL CHECK (assignment_type IN ('manual', 'auto_ancestor')),
    source_organization_id UUID REFERENCES organizations(id), -- Org con trigger việc gán role này
    created_at TIMESTAMP DEFAULT NOW(),
    created_by UUID REFERENCES users(id),
    
    UNIQUE(user_id, organization_id, role_id)
);

-- Index để tối ưu query
CREATE INDEX idx_user_role_assignments_user_org ON user_role_assignments(user_id, organization_id);
CREATE INDEX idx_user_role_assignments_source ON user_role_assignments(source_organization_id);
CREATE INDEX idx_user_role_assignments_type ON user_role_assignments(assignment_type);

-- Thêm view để combine manual và auto roles
CREATE VIEW user_effective_roles AS
SELECT DISTINCT
    user_id,
    organization_id,
    role_id,
    'effective' as role_type
FROM user_role_assignments;
```

#### B. API Endpoints mới
```typescript
// 1. POST /api/users/{userId}/roles/assign-with-ancestors
interface AssignRoleWithAncestorsRequest {
  organizationId: string;
  roleId: string;
  autoAssignAncestorView?: boolean; // default: true
}

interface AssignRoleWithAncestorsResponse {
  success: boolean;
  assignedRoles: {
    organizationId: string;
    roleId: string;
    assignmentType: 'manual' | 'auto_ancestor';
    roleName: string;
    organizationName: string;
  }[];
  ancestorAssignments?: {
    organizationId: string;
    organizationName: string;
    roleAssigned: string;
  }[];
}

// 2. DELETE /api/users/{userId}/roles/remove-with-cleanup
interface RemoveRoleWithCleanupRequest {
  organizationId: string;
  roleId: string;
  cleanupAncestorRoles?: boolean; // default: true
}

interface RemoveRoleWithCleanupResponse {
  success: boolean;
  removedRoles: {
    organizationId: string;
    roleId: string;
    assignmentType: 'manual' | 'auto_ancestor';
  }[];
  keptAncestorRoles?: {
    organizationId: string;
    reason: string; // "manual_assignment" | "other_source_exists"
  }[];
}

// 3. GET /api/users/{userId}/roles/detailed
interface DetailedUserRolesResponse {
  roles: {
    organizationId: string;
    organizationName: string;
    roleId: string;
    roleName: string;
    assignmentType: 'manual' | 'auto_ancestor';
    sourceOrganization?: {
      id: string;
      name: string;
    };
    permissions: string[];
  }[];
  roleHierarchy: {
    [organizationId: string]: {
      directRoles: string[];
      ancestorViewRoles: string[];
      sources: {
        [roleId: string]: string[]; // source organization IDs
      };
    };
  };
}
```

#### C. Service Layer Implementation
```typescript
// users.service.ts - Thêm methods mới
export class UsersService {
  constructor(
    private readonly organizationsService: OrganizationsService,
    private readonly rolesService: RolesService,
    private readonly userRoleAssignmentRepository: Repository<UserRoleAssignment>
  ) {}

  // Gán role với auto-assign ancestors
  async assignRoleWithAncestors(
    userId: string, 
    organizationId: string, 
    roleId: string,
    assignedBy: string,
    options: { autoAssignAncestorView: boolean } = { autoAssignAncestorView: true }
  ): Promise<AssignRoleWithAncestorsResponse> {
    const assignedRoles = [];
    const ancestorAssignments = [];

    // 1. Gán role chính tại organization
    await this.assignRole(userId, organizationId, roleId, 'manual', null, assignedBy);
    
    const role = await this.rolesService.findById(roleId);
    const organization = await this.organizationsService.findById(organizationId);
    
    assignedRoles.push({
      organizationId,
      roleId,
      assignmentType: 'manual' as const,
      roleName: role.name,
      organizationName: organization.name
    });

    // 2. Auto-assign view role cho ancestors nếu enabled
    if (options.autoAssignAncestorView) {
      const ancestors = await this.organizationsService.getAncestors(organizationId);
      const viewerRole = await this.rolesService.findByName('Viewer');
      
      for (const ancestorId of ancestors) {
        // Check xem user đã có role nào tại ancestor chưa
        const existingRoles = await this.getUserRolesInOrganization(userId, ancestorId);
        
        // Nếu chưa có role nào, hoặc chỉ có auto-assigned roles thấp hơn
        if (this.shouldAssignViewerRole(existingRoles, viewerRole)) {
          await this.assignRole(
            userId, 
            ancestorId, 
            viewerRole.id, 
            'auto_ancestor', 
            organizationId, // source organization
            assignedBy
          );
          
          const ancestorOrg = await this.organizationsService.findById(ancestorId);
          ancestorAssignments.push({
            organizationId: ancestorId,
            organizationName: ancestorOrg.name,
            roleAssigned: viewerRole.name
          });
          
          assignedRoles.push({
            organizationId: ancestorId,
            roleId: viewerRole.id,
            assignmentType: 'auto_ancestor' as const,
            roleName: viewerRole.name,
            organizationName: ancestorOrg.name
          });
        }
      }
    }

    return {
      success: true,
      assignedRoles,
      ancestorAssignments
    };
  }

  // Remove role với cleanup ancestors
  async removeRoleWithCleanup(
    userId: string,
    organizationId: string,
    roleId: string,
    options: { cleanupAncestorRoles: boolean } = { cleanupAncestorRoles: true }
  ): Promise<RemoveRoleWithCleanupResponse> {
    const removedRoles = [];
    const keptAncestorRoles = [];

    // 1. Remove role chính
    await this.removeRole(userId, organizationId, roleId);
    removedRoles.push({
      organizationId,
      roleId,
      assignmentType: 'manual' as const
    });

    // 2. Cleanup ancestor roles nếu enabled
    if (options.cleanupAncestorRoles) {
      const ancestors = await this.organizationsService.getAncestors(organizationId);
      
      for (const ancestorId of ancestors) {
        // Tìm các auto-assigned roles từ organization này
        const autoRolesFromThisOrg = await this.userRoleAssignmentRepository.find({
          where: {
            user_id: userId,
            organization_id: ancestorId,
            assignment_type: 'auto_ancestor',
            source_organization_id: organizationId
          }
        });

        for (const autoRole of autoRolesFromThisOrg) {
          // Check xem role này có còn được support bởi source khác không
          const otherSources = await this.userRoleAssignmentRepository.count({
            where: {
              user_id: userId,
              organization_id: ancestorId,
              role_id: autoRole.role_id,
              assignment_type: 'auto_ancestor',
              source_organization_id: Not(organizationId)
            }
          });

          // Check manual assignment
          const manualAssignment = await this.userRoleAssignmentRepository.count({
            where: {
              user_id: userId,
              organization_id: ancestorId,
              role_id: autoRole.role_id,
              assignment_type: 'manual'
            }
          });

          if (otherSources === 0 && manualAssignment === 0) {
            // Safe to remove
            await this.userRoleAssignmentRepository.remove(autoRole);
            removedRoles.push({
              organizationId: ancestorId,
              roleId: autoRole.role_id,
              assignmentType: 'auto_ancestor' as const
            });
          } else {
            // Keep role
            const reason = manualAssignment > 0 ? 'manual_assignment' : 'other_source_exists';
            keptAncestorRoles.push({
              organizationId: ancestorId,
              reason
            });
          }
        }
      }
    }

    return {
      success: true,
      removedRoles,
      keptAncestorRoles
    };
  }

  // Helper methods
  private shouldAssignViewerRole(existingRoles: UserRole[], viewerRole: Role): boolean {
    // Nếu không có role nào
    if (existingRoles.length === 0) return true;
    
    // Nếu có manual role thì không assign
    const hasManualRole = existingRoles.some(r => r.assignmentType === 'manual');
    if (hasManualRole) return false;
    
    // Nếu chỉ có auto role thấp hơn hoặc bằng viewer thì có thể assign
    const hasHigherAutoRole = existingRoles.some(r => 
      r.assignmentType === 'auto_ancestor' && 
      this.rolesService.compareRolePriority(r.roleId, viewerRole.id) > 0
    );
    
    return !hasHigherAutoRole;
  }

  private async assignRole(
    userId: string,
    organizationId: string,
    roleId: string,
    assignmentType: 'manual' | 'auto_ancestor',
    sourceOrganizationId: string | null,
    assignedBy: string
  ): Promise<void> {
    // Check if assignment already exists
    const existing = await this.userRoleAssignmentRepository.findOne({
      where: {
        user_id: userId,
        organization_id: organizationId,
        role_id: roleId
      }
    });

    if (existing) {
      // Update assignment type if needed (upgrade from auto to manual)
      if (existing.assignment_type === 'auto_ancestor' && assignmentType === 'manual') {
        existing.assignment_type = 'manual';
        existing.source_organization_id = null;
        existing.created_by = assignedBy;
        await this.userRoleAssignmentRepository.save(existing);
      }
      return;
    }

    // Create new assignment
    const assignment = this.userRoleAssignmentRepository.create({
      user_id: userId,
      organization_id: organizationId,
      role_id: roleId,
      assignment_type: assignmentType,
      source_organization_id: sourceOrganizationId,
      created_by: assignedBy
    });

    await this.userRoleAssignmentRepository.save(assignment);
  }

  // Get detailed user roles
  async getUserDetailedRoles(userId: string): Promise<DetailedUserRolesResponse> {
    const assignments = await this.userRoleAssignmentRepository.find({
      where: { user_id: userId },
      relations: ['organization', 'role', 'sourceOrganization']
    });

    const roles = assignments.map(assignment => ({
      organizationId: assignment.organization_id,
      organizationName: assignment.organization.name,
      roleId: assignment.role_id,
      roleName: assignment.role.name,
      assignmentType: assignment.assignment_type,
      sourceOrganization: assignment.sourceOrganization ? {
        id: assignment.source_organization_id,
        name: assignment.sourceOrganization.name
      } : undefined,
      permissions: assignment.role.permissions || []
    }));

    // Build role hierarchy
    const roleHierarchy = {};
    assignments.forEach(assignment => {
      if (!roleHierarchy[assignment.organization_id]) {
        roleHierarchy[assignment.organization_id] = {
          directRoles: [],
          ancestorViewRoles: [],
          sources: {}
        };
      }

      const orgRoles = roleHierarchy[assignment.organization_id];
      
      if (assignment.assignment_type === 'manual') {
        orgRoles.directRoles.push(assignment.role_id);
      } else {
        orgRoles.ancestorViewRoles.push(assignment.role_id);
        if (!orgRoles.sources[assignment.role_id]) {
          orgRoles.sources[assignment.role_id] = [];
        }
        orgRoles.sources[assignment.role_id].push(assignment.source_organization_id);
      }
    });

    return {
      roles,
      roleHierarchy
    };
  }
}
```

#### D. Organizations Service Updates
```typescript
// organizations.service.ts - Thêm hierarchy methods
export class OrganizationsService {
  // Get all ancestors của một organization
  async getAncestors(organizationId: string): Promise<string[]> {
    const ancestors = [];
    let currentOrg = await this.findById(organizationId);
    
    while (currentOrg && currentOrg.parent_id) {
      ancestors.push(currentOrg.parent_id);
      currentOrg = await this.findById(currentOrg.parent_id);
    }
    
    return ancestors;
  }

  // Get all descendants của một organization
  async getDescendants(organizationId: string): Promise<string[]> {
    const descendants = [];
    const children = await this.getChildren(organizationId);
    
    for (const childId of children) {
      descendants.push(childId);
      const grandChildren = await this.getDescendants(childId);
      descendants.push(...grandChildren);
    }
    
    return descendants;
  }

  // Get direct children
  async getChildren(organizationId: string): Promise<string[]> {
    const children = await this.organizationRepository.find({
      where: { parent_id: organizationId },
      select: ['id']
    });
    
    return children.map(child => child.id);
  }

  // Build organization tree with user access info
  async getOrganizationTreeWithAccess(userId: string): Promise<OrganizationTreeNode[]> {
    const allOrgs = await this.findAll();
    const userRoles = await this.usersService.getUserDetailedRoles(userId);
    
    // Build tree structure
    const orgMap = new Map();
    const roots = [];
    
    allOrgs.forEach(org => {
      orgMap.set(org.id, {
        ...org,
        children: [],
        userAccess: this.getUserAccessLevel(org.id, userRoles.roles)
      });
    });
    
    allOrgs.forEach(org => {
      if (org.parent_id && orgMap.has(org.parent_id)) {
        orgMap.get(org.parent_id).children.push(orgMap.get(org.id));
      } else {
        roots.push(orgMap.get(org.id));
      }
    });
    
    return roots;
  }

  private getUserAccessLevel(organizationId: string, userRoles: any[]): UserAccessLevel {
    const orgRoles = userRoles.filter(r => r.organizationId === organizationId);
    
    if (orgRoles.length === 0) {
      return { level: 'none', roles: [] };
    }
    
    const hasManualRole = orgRoles.some(r => r.assignmentType === 'manual');
    const hasAutoRole = orgRoles.some(r => r.assignmentType === 'auto_ancestor');
    
    if (hasManualRole) {
      return {
        level: 'direct',
        roles: orgRoles.filter(r => r.assignmentType === 'manual'),
        autoRoles: orgRoles.filter(r => r.assignmentType === 'auto_ancestor')
      };
    }
    
    return {
      level: 'ancestor_view',
      roles: [],
      autoRoles: orgRoles
    };
  }
}
```

### 2. Frontend Changes

#### A. Update User Role Assignment Modal
```typescript
// src/features/users/components/AssignRoleModal.tsx - Enhanced
interface AssignRoleModalProps {
  user: User;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export const AssignRoleModal: React.FC<AssignRoleModalProps> = ({
  user,
  isOpen,
  onClose,
  onSuccess
}) => {
  const [selectedOrganization, setSelectedOrganization] = useState<string>('');
  const [selectedRole, setSelectedRole] = useState<string>('');
  const [autoAssignAncestorView, setAutoAssignAncestorView] = useState(true);
  const [previewAncestors, setPreviewAncestors] = useState<Organization[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  
  // Preview ancestors khi chọn organization
  useEffect(() => {
    if (selectedOrganization) {
      organizationService.getAncestors(selectedOrganization)
        .then(ancestors => {
          setPreviewAncestors(ancestors);
        });
    } else {
      setPreviewAncestors([]);
    }
  }, [selectedOrganization]);

  const handleAssignRole = async () => {
    if (!selectedOrganization || !selectedRole) return;
    
    setIsLoading(true);
    try {
      const response = await userService.assignRoleWithAncestors(user.id, {
        organizationId: selectedOrganization,
        roleId: selectedRole,
        autoAssignAncestorView
      });
      
      // Show success notification with details
      showSuccessNotification({
        title: 'Gán quyền thành công',
        message: `Đã gán ${response.assignedRoles.length} quyền cho ${user.name}`,
        details: response.ancestorAssignments?.length > 0 
          ? `Tự động gán quyền xem tại ${response.ancestorAssignments.length} tổ chức cha`
          : undefined
      });
      
      onSuccess();
      onClose();
    } catch (error) {
      showErrorNotification('Có lỗi xảy ra khi gán quyền');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="large">
      <div className="space-y-6">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">
            Gán quyền cho {user.name}
          </h2>
          <p className="text-sm text-gray-600 mt-1">
            Chọn tổ chức và vai trò cho người dùng
          </p>
        </div>

        {/* Organization Selection */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Tổ chức
          </label>
          <OrganizationSelect
            value={selectedOrganization}
            onChange={setSelectedOrganization}
            placeholder="Chọn tổ chức..."
          />
        </div>

        {/* Role Selection */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Vai trò
          </label>
          <RoleSelect
            value={selectedRole}
            onChange={setSelectedRole}
            organizationId={selectedOrganization}
            placeholder="Chọn vai trò..."
          />
        </div>

        {/* Auto Assign Option */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-start">
            <input
              id="auto-assign-ancestors"
              type="checkbox"
              checked={autoAssignAncestorView}
              onChange={(e) => setAutoAssignAncestorView(e.target.checked)}
              className="mt-1 h-4 w-4 text-blue-600 rounded border-gray-300"
            />
            <div className="ml-3 flex-1">
              <label htmlFor="auto-assign-ancestors" className="text-sm font-medium text-blue-900">
                Tự động gán quyền xem cho tổ chức cha
              </label>
              <p className="text-sm text-blue-700 mt-1">
                Người dùng sẽ có quyền xem tất cả tổ chức cha để có thể navigate đến tổ chức được gán quyền
              </p>
            </div>
          </div>
        </div>

        {/* Preview Ancestors */}
        {autoAssignAncestorView && previewAncestors.length > 0 && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <h4 className="text-sm font-medium text-yellow-900 mb-2">
              <InfoIcon className="w-4 h-4 inline mr-1" />
              Sẽ tự động gán quyền "Xem" tại:
            </h4>
            <ul className="text-sm text-yellow-800 space-y-1">
              {previewAncestors.map(ancestor => (
                <li key={ancestor.id} className="flex items-center">
                  <BuildingIcon className="w-4 h-4 mr-2" />
                  {ancestor.name} ({ancestor.code})
                </li>
              ))}
            </ul>
            <p className="text-xs text-yellow-700 mt-2">
              * Chỉ gán nếu người dùng chưa có quyền manual tại các tổ chức này
            </p>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex justify-end space-x-3 pt-6 border-t">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
            disabled={isLoading}
          >
            Hủy
          </button>
          <button
            onClick={handleAssignRole}
            disabled={!selectedOrganization || !selectedRole || isLoading}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
          >
            {isLoading ? 'Đang xử lý...' : 'Gán quyền'}
          </button>
        </div>
      </div>
    </Modal>
  );
};
```

#### B. Update User Roles Display
```typescript
// src/features/users/components/UserRolesTable.tsx
interface UserRole {
  organizationId: string;
  organizationName: string;
  roleId: string;
  roleName: string;
  assignmentType: 'manual' | 'auto_ancestor';
  sourceOrganization?: {
    id: string;
    name: string;
  };
}

export const UserRolesTable: React.FC<{ userId: string }> = ({ userId }) => {
  const [userRoles, setUserRoles] = useState<UserRole[]>([]);
  const [loading, setLoading] = useState(true);
  const [groupBy, setGroupBy] = useState<'organization' | 'role' | 'type'>('organization');

  useEffect(() => {
    userService.getUserDetailedRoles(userId)
      .then(response => {
        setUserRoles(response.roles);
      })
      .finally(() => setLoading(false));
  }, [userId]);

  const groupedRoles = useMemo(() => {
    switch (groupBy) {
      case 'organization':
        return groupBy('organizationName', userRoles);
      case 'role':
        return groupBy('roleName', userRoles);
      case 'type':
        return groupBy('assignmentType', userRoles);
      default:
        return { 'All': userRoles };
    }
  }, [userRoles, groupBy]);

  const handleRemoveRole = async (role: UserRole) => {
    const confirmed = await confirmDialog({
      title: 'Xác nhận xóa quyền',
      message: `Bạn có chắc muốn xóa quyền "${role.roleName}" tại "${role.organizationName}"?`,
      confirmText: 'Xóa quyền',
      cancelText: 'Hủy'
    });

    if (!confirmed) return;

    try {
      const response = await userService.removeRoleWithCleanup(userId, {
        organizationId: role.organizationId,
        roleId: role.roleId,
        cleanupAncestorRoles: true
      });

      // Show success with cleanup info
      showSuccessNotification({
        title: 'Xóa quyền thành công',
        message: `Đã xóa ${response.removedRoles.length} quyền`,
        details: response.keptAncestorRoles?.length > 0
          ? `Giữ lại ${response.keptAncestorRoles.length} quyền cha do có nguồn khác`
          : undefined
      });

      // Refresh data
      const updatedResponse = await userService.getUserDetailedRoles(userId);
      setUserRoles(updatedResponse.roles);
    } catch (error) {
      showErrorNotification('Có lỗi xảy ra khi xóa quyền');
    }
  };

  if (loading) return <LoadingSpinner />;

  return (
    <div className="space-y-4">
      {/* Group By Controls */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-medium text-gray-900">
          Quyền người dùng ({userRoles.length})
        </h3>
        <div className="flex items-center space-x-2">
          <label className="text-sm text-gray-700">Nhóm theo:</label>
          <select
            value={groupBy}
            onChange={(e) => setGroupBy(e.target.value as any)}
            className="text-sm border border-gray-300 rounded px-2 py-1"
          >
            <option value="organization">Tổ chức</option>
            <option value="role">Vai trò</option>
            <option value="type">Loại gán</option>
          </select>
        </div>
      </div>

      {/* Roles Table */}
      <div className="space-y-6">
        {Object.entries(groupedRoles).map(([groupName, roles]) => (
          <div key={groupName} className="bg-white border rounded-lg overflow-hidden">
            <div className="bg-gray-50 px-4 py-3 border-b">
              <h4 className="font-medium text-gray-900">{groupName}</h4>
              <p className="text-sm text-gray-600">{roles.length} quyền</p>
            </div>
            
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Tổ chức
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Vai trò
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Loại
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Nguồn gốc
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                      Thao tác
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {roles.map((role, index) => (
                    <tr key={`${role.organizationId}-${role.roleId}`} className="hover:bg-gray-50">
                      <td className="px-4 py-3">
                        <div className="font-medium text-gray-900">{role.organizationName}</div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="font-medium text-gray-900">{role.roleName}</div>
                      </td>
                      <td className="px-4 py-3">
                        <RoleTypeBadge type={role.assignmentType} />
                      </td>
                      <td className="px-4 py-3">
                        {role.assignmentType === 'auto_ancestor' && role.sourceOrganization ? (
                          <div className="text-sm text-blue-600">
                            <ArrowRightIcon className="w-4 h-4 inline mr-1" />
                            {role.sourceOrganization.name}
                          </div>
                        ) : (
                          <span className="text-sm text-gray-500">
                            {role.assignmentType === 'manual' ? 'Gán trực tiếp' : '-'}
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <button
                          onClick={() => handleRemoveRole(role)}
                          className="text-red-600 hover:text-red-800 text-sm font-medium"
                        >
                          Xóa
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

// Helper component for role type badge
const RoleTypeBadge: React.FC<{ type: 'manual' | 'auto_ancestor' }> = ({ type }) => {
  const config = {
    manual: {
      label: 'Trực tiếp',
      className: 'bg-green-100 text-green-800 border-green-200'
    },
    auto_ancestor: {
      label: 'Tự động',
      className: 'bg-blue-100 text-blue-800 border-blue-200'
    }
  };

  const { label, className } = config[type];

  return (
    <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium border ${className}`}>
      {type === 'auto_ancestor' && <LinkIcon className="w-3 h-3 mr-1" />}
      {label}
    </span>
  );
};
```

#### C. Update Organization Tree Component
```typescript
// src/features/organizations/components/OrganizationTreeItem.tsx - Enhanced
interface OrganizationTreeItemProps {
  org: Organization;
  level: number;
  userAccess: UserAccessLevel;
  onViewOrganization: (org: Organization) => void;
  onEditOrganization: (org: Organization) => void;
  renderChildren: (children: Organization[]) => React.ReactNode;
}

interface UserAccessLevel {
  level: 'none' | 'ancestor_view' | 'direct';
  roles: UserRole[];
  autoRoles?: UserRole[];
}

export const OrganizationTreeItem: React.FC<OrganizationTreeItemProps> = ({
  org,
  level,
  userAccess,
  onViewOrganization,
  onEditOrganization,
  renderChildren
}) => {
  const { level: accessLevel, roles, autoRoles = [] } = userAccess;
  const canView = accessLevel !== 'none';
  const canEdit = accessLevel === 'direct' && roles.some(r => r.permissions.includes('organizations.edit'));
  const hasAutoRoles = autoRoles.length > 0;

  return (
    <div className={`organization-tree-item level-${level}`}>
      <div className="org-header flex items-center justify-between p-3 border rounded-lg">
        <div className="org-info flex items-center space-x-3">
          <div className="org-basic">
            <h3 className="font-medium text-gray-900">{org.name}</h3>
            <p className="text-sm text-gray-600">{org.code}</p>
          </div>

          {/* Access Level Indicators */}
          <div className="access-indicators flex items-center space-x-2">
            {accessLevel === 'direct' && (
              <div className="access-badge direct" title="Quyền trực tiếp">
                <CheckCircleIcon className="w-4 h-4 text-green-600" />
                <span className="text-xs text-green-700 ml-1">Trực tiếp</span>
              </div>
            )}
            
            {accessLevel === 'ancestor_view' && (
              <div className="access-badge auto" title="Quyền xem từ tổ chức con">
                <EyeIcon className="w-4 h-4 text-blue-600" />
                <span className="text-xs text-blue-700 ml-1">Xem từ con</span>
              </div>
            )}

            {hasAutoRoles && (
              <Tooltip
                content={
                  <div className="space-y-1">
                    <div className="font-medium">Quyền tự động từ:</div>
                    {autoRoles.map(role => (
                      <div key={role.sourceOrganization?.id} className="text-sm">
                        • {role.sourceOrganization?.name}
                      </div>
                    ))}
                  </div>
                }
              >
                <div className="text-blue-600">
                  <LinkIcon className="w-4 h-4" />
                </div>
              </Tooltip>
            )}
          </div>
        </div>

        <div className="org-actions flex items-center space-x-2">
          {canView && (
            <button
              onClick={() => onViewOrganization(org)}
              className={`view-btn ${accessLevel === 'direct' ? 'direct' : 'ancestor'}`}
              title={
                accessLevel === 'direct' 
                  ? 'Xem chi tiết (quyền trực tiếp)'
                  : 'Xem chi tiết (quyền từ tổ chức con)'
              }
            >
              <EyeIcon className="w-4 h-4" />
            </button>
          )}

          {canEdit && (
            <button
              onClick={() => onEditOrganization(org)}
              className="edit-btn"
              title="Chỉnh sửa tổ chức"
            >
              <EditIcon className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Role Details Expandable */}
      {(roles.length > 0 || autoRoles.length > 0) && (
        <Collapsible
          trigger={
            <div className="role-summary text-xs text-gray-600 ml-6 mt-2 cursor-pointer hover:text-gray-800">
              <ChevronDownIcon className="w-3 h-3 inline mr-1" />
              {roles.length} quyền trực tiếp, {autoRoles.length} quyền tự động
            </div>
          }
        >
          <div className="role-details ml-6 mt-2 p-3 bg-gray-50 rounded border">
            {roles.length > 0 && (
              <div className="mb-3">
                <h5 className="text-xs font-medium text-gray-700 mb-1">Quyền trực tiếp:</h5>
                <div className="space-y-1">
                  {roles.map(role => (
                    <div key={role.roleId} className="text-xs text-green-700 flex items-center">
                      <CheckIcon className="w-3 h-3 mr-1" />
                      {role.roleName}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {autoRoles.length > 0 && (
              <div>
                <h5 className="text-xs font-medium text-gray-700 mb-1">Quyền tự động:</h5>
                <div className="space-y-1">
                  {autoRoles.map(role => (
                    <div key={`${role.roleId}-${role.sourceOrganization?.id}`} className="text-xs text-blue-700 flex items-center">
                      <LinkIcon className="w-3 h-3 mr-1" />
                      {role.roleName} ← {role.sourceOrganization?.name}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </Collapsible>
      )}

      {/* Children */}
      {org.children && org.children.length > 0 && renderChildren(org.children)}
    </div>
  );
};
```

### 3. UI/UX Enhancements

#### A. Success Notifications with Details
```typescript
// src/shared/components/notifications/DetailedNotification.tsx
interface DetailedNotificationProps {
  title: string;
  message: string;
  details?: string;
  type: 'success' | 'error' | 'warning' | 'info';
  actions?: {
    label: string;
    onClick: () => void;
  }[];
}

export const DetailedNotification: React.FC<DetailedNotificationProps> = ({
  title,
  message,
  details,
  type,
  actions = []
}) => {
  const [expanded, setExpanded] = useState(false);

  const iconConfig = {
    success: { icon: CheckCircleIcon, className: 'text-green-600' },
    error: { icon: ExclamationCircleIcon, className: 'text-red-600' },
    warning: { icon: ExclamationTriangleIcon, className: 'text-yellow-600' },
    info: { icon: InformationCircleIcon, className: 'text-blue-600' }
  };

  const { icon: Icon, className: iconClassName } = iconConfig[type];

  return (
    <div className={`notification-card ${type} p-4 rounded-lg border`}>
      <div className="flex items-start">
        <Icon className={`w-5 h-5 ${iconClassName} mt-0.5 mr-3 flex-shrink-0`} />
        <div className="flex-1 min-w-0">
          <h4 className="font-medium text-gray-900">{title}</h4>
          <p className="text-sm text-gray-700 mt-1">{message}</p>
          
          {details && (
            <>
              <button
                onClick={() => setExpanded(!expanded)}
                className="text-sm text-blue-600 hover:text-blue-800 mt-2 flex items-center"
              >
                {expanded ? 'Mở rộng' : 'Thu gọn'}
                <ChevronDownIcon className={`w-4 h-4 ml-1 transform ${expanded ? 'rotate-180' : ''}`} />
              </button>
              
              {expanded && (
                <div className="mt-2 p-2 bg-gray-50 rounded text-sm text-gray-600">
                  {details}
                </div>
              )}
            </>
          )}
          
          {actions.length > 0 && (
            <div className="flex space-x-2 mt-3">
              {actions.map((action, index) => (
                <button
                  key={index}
                  onClick={action.onClick}
                  className="text-sm bg-blue-600 text-white px-3 py-1 rounded hover:bg-blue-700"
                >
                  {action.label}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
```

#### B. Role Assignment Preview Component
```typescript
// src/features/users/components/RoleAssignmentPreview.tsx
interface RoleAssignmentPreviewProps {
  organizationId: string;
  roleId: string;
  autoAssignAncestors: boolean;
}

export const RoleAssignmentPreview: React.FC<RoleAssignmentPreviewProps> = ({
  organizationId,
  roleId,
  autoAssignAncestors
}) => {
  const [preview, setPreview] = useState<AssignmentPreview | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!organizationId || !roleId) {
      setPreview(null);
      return;
    }

    setLoading(true);
    userService.previewRoleAssignment({
      organizationId,
      roleId,
      autoAssignAncestors
    }).then(setPreview)
      .finally(() => setLoading(false));
  }, [organizationId, roleId, autoAssignAncestors]);

  if (loading) {
    return (
      <div className="bg-gray-50 border rounded-lg p-4">
        <div className="animate-pulse flex items-center">
          <div className="w-4 h-4 bg-gray-300 rounded mr-2"></div>
          <div className="h-4 bg-gray-300 rounded w-32"></div>
        </div>
      </div>
    );
  }

  if (!preview) return null;

  return (
    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
      <h4 className="font-medium text-blue-900 mb-3 flex items-center">
        <PreviewIcon className="w-4 h-4 mr-2" />
        Xem trước gán quyền
      </h4>

      <div className="space-y-3">
        {/* Main Assignment */}
        <div className="flex items-center text-sm">
          <CheckIcon className="w-4 h-4 text-green-600 mr-2" />
          <span className="font-medium">{preview.mainAssignment.roleName}</span>
          <span className="text-gray-600 ml-2">tại {preview.mainAssignment.organizationName}</span>
        </div>

        {/* Ancestor Assignments */}
        {preview.ancestorAssignments.length > 0 && (
          <div className="pl-6 border-l-2 border-blue-200">
            <div className="text-xs text-blue-700 font-medium mb-2">
              Sẽ tự động gán quyền xem:
            </div>
            {preview.ancestorAssignments.map(assignment => (
              <div key={assignment.organizationId} className="flex items-center text-sm text-blue-600 mb-1">
                <EyeIcon className="w-3 h-3 mr-2" />
                <span>{assignment.roleName}</span>
                <span className="text-blue-500 ml-2">tại {assignment.organizationName}</span>
              </div>
            ))}
          </div>
        )}

        {/* Conflicts or Notes */}
        {preview.conflicts.length > 0 && (
          <div className="bg-yellow-50 border border-yellow-200 rounded p-3">
            <div className="text-xs font-medium text-yellow-800 mb-1">Lưu ý:</div>
            {preview.conflicts.map((conflict, index) => (
              <div key={index} className="text-xs text-yellow-700">
                • {conflict.message}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
```

## 4. Testing Strategy

### A. Unit Tests
```typescript
// tests/services/users.service.test.ts
describe('UsersService - Role Assignment with Ancestors', () => {
  test('should assign role and auto-assign ancestor view roles', async () => {
    // Setup hierarchy: Root → Parent → Child
    // Test assigning role to Child should auto-assign view to Parent and Root
  });

  test('should not override existing manual roles in ancestors', async () => {
    // Test that if user already has manual Editor role in ancestor,
    // auto-assignment should not downgrade to Viewer
  });

  test('should cleanup ancestor roles when removing child role', async () => {
    // Test removing role from child should remove auto-assigned ancestor roles
    // unless they have other sources or manual assignments
  });

  test('should handle multiple source organizations for ancestor roles', async () => {
    // Test user has roles in Child1 and Child2, both under same Parent
    // Removing role from Child1 should not remove Parent view role if Child2 still provides it
  });
});
```

### B. Integration Tests
```typescript
// tests/integration/role-assignment-flow.test.tsx
describe('Role Assignment Flow', () => {
  test('should show ancestor preview correctly', async () => {
    // Test AssignRoleModal shows correct ancestor organizations
  });

  test('should display success notification with details', async () => {
    // Test success notification shows how many roles were assigned
  });

  test('should update organization tree visibility after assignment', async () => {
    // Test that organization tree reflects new access levels
  });
});
```

### C. E2E Tests
```typescript
// e2e/role-assignment.spec.ts
describe('Explicit Ancestor Role Assignment', () => {
  test('complete role assignment workflow', async () => {
    // 1. Admin assigns Editor role to user in Child org
    // 2. System auto-assigns Viewer role in Parent orgs
    // 3. User can now see view buttons for Parent orgs
    // 4. User can navigate to Child org through Parent orgs
    // 5. Admin removes Editor role from Child org
    // 6. System removes auto-assigned Viewer roles from Parents
    // 7. User can no longer see Parent orgs
  });

  test('conflict resolution', async () => {
    // Test scenarios where user already has roles in ancestor orgs
  });
});
```

## 5. Migration Plan

### Phase 1: Database & Backend (Week 1-2)
1. ✅ Create `user_role_assignments` table
2. ✅ Implement `assignRoleWithAncestors` service method
3. ✅ Implement `removeRoleWithCleanup` service method  
4. ✅ Create new API endpoints
5. ✅ Unit tests for service layer

### Phase 2: Role Assignment UI (Week 3)
1. ✅ Update AssignRoleModal with ancestor preview
2. ✅ Implement RoleAssignmentPreview component
3. ✅ Add success notifications with details
4. ✅ Update role removal confirmation dialogs

### Phase 3: Organization Tree & Display (Week 4)
1. ✅ Update OrganizationTreeItem to show access levels
2. ✅ Update UserRolesTable to show role types and sources
3. ✅ Add visual indicators for auto vs manual roles
4. ✅ Implement role details expandable sections

### Phase 4: Testing & Polish (Week 5)
1. ✅ Integration tests
2. ✅ E2E tests
3. ✅ Performance testing with deep hierarchies
4. ✅ UI/UX refinements

### Phase 5: Migration & Deployment (Week 6)
1. ✅ Data migration script (convert existing roles)
2. ✅ Staging deployment
3. ✅ User acceptance testing
4. ✅ Production deployment
5. ✅ Monitor and iterate

## 6. Data Migration Script

```sql
-- Migration script to convert existing roles to new system
INSERT INTO user_role_assignments (
    user_id,
    organization_id, 
    role_id,
    assignment_type,
    source_organization_id,
    created_at,
    created_by
)
SELECT 
    ur.user_id,
    ur.organization_id,
    ur.role_id,
    'manual' as assignment_type,
    NULL as source_organization_id,
    ur.created_at,
    ur.created_by
FROM user_roles ur
WHERE NOT EXISTS (
    SELECT 1 FROM user_role_assignments ura 
    WHERE ura.user_id = ur.user_id 
    AND ura.organization_id = ur.organization_id 
    AND ura.role_id = ur.role_id
);

-- Optional: Generate ancestor view roles for existing assignments
-- This would retroactively apply the ancestor view logic to existing roles
```

## 7. Performance Considerations

### A. Database Optimization
```sql
-- Compound indexes for efficient role queries
CREATE INDEX CONCURRENTLY idx_user_role_assignments_lookup 
ON user_role_assignments(user_id, organization_id, assignment_type);

CREATE INDEX CONCURRENTLY idx_user_role_assignments_cleanup 
ON user_role_assignments(source_organization_id, assignment_type) 
WHERE assignment_type = 'auto_ancestor';

-- Partial index for manual assignments
CREATE INDEX CONCURRENTLY idx_user_role_assignments_manual 
ON user_role_assignments(user_id, organization_id) 
WHERE assignment_type = 'manual';
```

### B. Caching Strategy
```typescript
// Cache user roles and organization hierarchy
export class RoleAssignmentCache {
  private userRolesCache = new Map<string, UserRole[]>();
  private orgHierarchyCache = new Map<string, string[]>();
  private TTL = 5 * 60 * 1000; // 5 minutes

  async getUserRoles(userId: string): Promise<UserRole[]> {
    const cached = this.userRolesCache.get(userId);
    if (cached && this.isCacheValid(userId)) {
      return cached;
    }

    const roles = await this.fetchUserRoles(userId);
    this.userRolesCache.set(userId, roles);
    return roles;
  }

  invalidateUserCache(userId: string): void {
    this.userRolesCache.delete(userId);
  }

  // Batch invalidation when roles change
  invalidateAffectedUsers(organizationId: string): void {
    // Invalidate cache for all users who might be affected
    // by changes in this organization or its descendants
  }
}
```

## 8. Success Metrics

### A. Functional Success
- ✅ Auto-assignment: Gán role ở org con tự động tạo view role ở org cha
- ✅ Cleanup: Xóa role ở org con tự động cleanup view role ở org cha
- ✅ Conflict resolution: Không override manual roles đã có
- ✅ Multiple sources: Xử lý đúng khi có nhiều source cho 1 ancestor role
- ✅ UI indicators: Phân biệt rõ manual vs auto roles

### B. Performance Metrics
- Database queries < 100ms cho role assignment operations
- Frontend role updates < 200ms
- Cache hit rate > 85% cho user roles
- No N+1 queries trong organization tree rendering

### C. User Experience
- Assignment workflow completion rate > 98%
- User confusion rate < 3% (hiểu được concept auto roles)
- Support tickets về permissions < 20% decrease
- Admin satisfaction với role management > 4.5/5

---

**Status**: Planning Phase  
**Priority**: High  
**Estimated Effort**: 6 weeks  
**Approach**: Explicit role assignment (vs inherited permissions)  
**Key Benefit**: Simpler logic, easier to understand and debug  
**Risk Level**: Medium (role management complexity)
