import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { Role, Permission, UserRole, PermissionContext } from '../entities/all-entities';
import { CreateRoleDto, UpdateRoleDto, QueryRoleDto } from './dto';

@Injectable()
export class RolesService {
  constructor(
    @InjectRepository(Role)
    private roleRepository: Repository<Role>,
    @InjectRepository(Permission)
    private permissionRepository: Repository<Permission>,
    @InjectRepository(UserRole)
    private userRoleRepository: Repository<UserRole>,
  ) { }

  async findAll(query: QueryRoleDto) {
    const { page = 1, limit = 10, search, isActive } = query;
    const skip = (page - 1) * limit;

    const queryBuilder = this.roleRepository
      .createQueryBuilder('role')
      .leftJoinAndSelect('role.permissions', 'permissions');

    if (search) {
      queryBuilder.andWhere(
        '(role.name ILIKE :search OR role.description ILIKE :search)',
        { search: `%${search}%` }
      );
    }

    if (isActive !== undefined) {
      queryBuilder.andWhere('role.isActive = :isActive', { isActive });
    }

    const [roles, total] = await queryBuilder
      .orderBy('role.createdAt', 'DESC')
      .skip(skip)
      .take(limit)
      .getManyAndCount();

    return {
      data: roles,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async findOne(id: string) {
    const role = await this.roleRepository.findOne({
      where: { id },
      relations: ['permissions'],
    });

    if (!role) {
      throw new NotFoundException('Role not found');
    }

    return role;
  }

  async create(createRoleDto: CreateRoleDto) {
    const { name, description, permissionIds } = createRoleDto;

    // Check if role name already exists
    const existingRole = await this.roleRepository.findOne({ where: { name } });
    if (existingRole) {
      throw new BadRequestException('Role name already exists');
    }

    // Validate permissions
    const permissions = await this.permissionRepository.find({
      where: { id: In(permissionIds), isActive: true },
    });

    if (permissions.length !== permissionIds.length) {
      throw new BadRequestException('Some permissions are invalid');
    }

    const role = this.roleRepository.create({
      name,
      description,
      permissions,
    });

    return this.roleRepository.save(role);
  }

  async update(id: string, updateRoleDto: UpdateRoleDto) {
    const role = await this.findOne(id);

    // Check system role protection
    if (role.isSystemRole) {
      throw new BadRequestException('Cannot modify system role');
    }

    const { permissionIds, ...roleData } = updateRoleDto;

    // Update basic info
    Object.assign(role, roleData);

    // Update permissions if provided
    if (permissionIds) {
      const permissions = await this.permissionRepository.find({
        where: { id: In(permissionIds), isActive: true },
      });

      if (permissions.length !== permissionIds.length) {
        throw new BadRequestException('Some permissions are invalid');
      }

      role.permissions = permissions;
    }

    return this.roleRepository.save(role);
  }
  async remove(id: string) {
    const role = await this.findOne(id);

    if (role.isSystemRole) {
      throw new BadRequestException('Cannot delete system role');
    }

    // Instead of preventing deletion, we'll cascade delete the related UserRole records
    const userRoleCount = await this.userRoleRepository.count({ where: { roleId: id } });

    if (userRoleCount > 0) {
      // Delete all UserRole records first (cascade delete)
      await this.userRoleRepository.delete({ roleId: id });
      console.log(`Deleted ${userRoleCount} user-role assignments for role: ${role.name}`);
    }

    // Now delete the role
    await this.roleRepository.remove(role);

    return {
      message: 'Role deleted successfully',
      deletedUserRoleAssignments: userRoleCount
    };
  }

  async bulkDelete(ids: string[]) {
    if (!ids || ids.length === 0) {
      throw new BadRequestException('No role IDs provided');
    }

    // Find roles to delete and validate
    const roles = await this.roleRepository.find({
      where: { id: In(ids) },
      relations: ['permissions']
    });

    if (roles.length !== ids.length) {
      throw new NotFoundException('Some roles not found');
    }

    // Check for system roles
    const systemRoles = roles.filter(role => role.isSystemRole);
    if (systemRoles.length > 0) {
      throw new BadRequestException(
        `Cannot delete system roles: ${systemRoles.map(r => r.name).join(', ')}`
      );
    }

    let totalUserRoleAssignments = 0;

    // Delete associated user-role records for each role
    for (const role of roles) {
      const userRoleCount = await this.userRoleRepository.count({
        where: { roleId: role.id }
      });

      if (userRoleCount > 0) {
        await this.userRoleRepository.delete({ roleId: role.id });
        totalUserRoleAssignments += userRoleCount;
        console.log(`Deleted ${userRoleCount} user-role assignments for role: ${role.name}`);
      }
    }

    // Delete the roles
    await this.roleRepository.remove(roles);

    return {
      message: `Successfully deleted ${roles.length} roles`,
      deletedRoles: roles.length,
      deletedUserRoleAssignments: totalUserRoleAssignments,
      roleNames: roles.map(r => r.name)
    };
  }

  async getAvailablePermissions() {
    return this.permissionRepository.find({
      where: { isActive: true },
      order: { category: 'ASC', sortOrder: 'ASC' },
    });
  }

  async getAllRoles() {
    return this.roleRepository.find({
      relations: ['permissions'],
      where: { isActive: true },
      order: { isSystemRole: 'DESC', name: 'ASC' },
    });
  }

  async getUserRoles(userId: string, organizationId?: string) {
    const queryBuilder = this.userRoleRepository
      .createQueryBuilder('ur')
      .leftJoinAndSelect('ur.role', 'role')
      .leftJoinAndSelect('role.permissions', 'permissions')
      .leftJoinAndSelect('ur.organization', 'organization')
      .where('ur.userId = :userId', { userId })
      .andWhere('ur.isActive = true')
      .andWhere('role.isActive = true');

    if (organizationId) {
      queryBuilder.andWhere(
        '(ur.organizationId = :organizationId OR ur.organizationId IS NULL)',
        { organizationId }
      );
    }

    return queryBuilder.getMany();
  }

  async hasPermission(
    userId: string,
    permissionCode: string,
    organizationId?: string
  ): Promise<boolean> {
    const userRoles = await this.getUserRoles(userId, organizationId);

    for (const userRole of userRoles) {
      const hasPermission = userRole.role.permissions.some(
        permission => permission.code === permissionCode && permission.isActive
      );

      if (hasPermission) {
        return true;
      }
    }

    return false;
  } async assignUserRole(
    userId: string,
    roleId: string,
    organizationId?: string
  ): Promise<UserRole> {
    console.log('Assigning role:', roleId, 'to user:', userId, 'in organization:', organizationId);

    // Remove existing roles in the same context
    await this.userRoleRepository.delete({
      userId,
      organizationId: organizationId || null,
    });

    // Create new role assignment
    const userRole = this.userRoleRepository.create({
      userId,
      roleId,
      organizationId: organizationId || null,
    });

    const savedRole = await this.userRoleRepository.save(userRole);
    console.log('Role assigned successfully:', savedRole);
    return savedRole;
  }
  async removeAllUserRoles(userId: string): Promise<void> {
    console.log('Removing all roles for user:', userId);
    const existingRoles = await this.userRoleRepository.find({ where: { userId } });
    console.log('Found existing roles:', existingRoles.length);

    const result = await this.userRoleRepository.delete({ userId });
    console.log('Delete result:', result);
  }

  async seedDefaultRoles() {
    const existingRoles = await this.roleRepository.find();
    if (existingRoles.length > 0) return;

    // Create permissions first
    await this.seedDefaultPermissions();

    // Get all permissions for role assignments
    const allPermissions = await this.permissionRepository.find();

    const dashboardPerms = allPermissions.filter(p => p.category === 'dashboard');
    const userPerms = allPermissions.filter(p => p.category === 'users');
    const orgPerms = allPermissions.filter(p => p.category === 'organizations');
    const deptPerms = allPermissions.filter(p => p.category === 'departments');
    const classPerms = allPermissions.filter(p => p.category === 'classes');
    const permissionPerms = allPermissions.filter(p => p.category === 'permissions');

    // Define default roles
    const defaultRoles = [
      {
        name: 'Quản trị viên hệ thống',
        description: 'Có toàn quyền trên hệ thống',
        isSystemRole: true,
        permissions: allPermissions, // All permissions
      },
      {
        name: 'Quản trị viên tổ chức',
        description: 'Quản lý toàn bộ tổ chức và thành viên',
        permissions: [...dashboardPerms, ...userPerms, ...orgPerms, ...deptPerms, ...classPerms],
      },
      {
        name: 'Quản lý',
        description: 'Xem và chỉnh sửa thông tin cơ bản',
        permissions: [
          ...dashboardPerms,
          ...userPerms.filter(p => !p.code.includes('delete')),
          ...orgPerms.filter(p => p.code.includes('access') || p.code.includes('view')),
        ],
      },
      {
        name: 'Biên tập viên',
        description: 'Thêm và chỉnh sửa thông tin',
        permissions: [
          ...dashboardPerms,
          ...userPerms.filter(p => !p.code.includes('delete') && !p.code.includes('export')),
        ],
      },
      {
        name: 'Người xem',
        description: 'Chỉ xem thông tin',
        permissions: [
          ...dashboardPerms,
          ...userPerms.filter(p => p.code.includes('access') || p.code.includes('view')),
          ...orgPerms.filter(p => p.code.includes('access') || p.code.includes('view')),
        ],
      },
    ];

    // Create roles with permissions
    for (const roleData of defaultRoles) {
      const { permissions, ...roleInfo } = roleData;
      const role = this.roleRepository.create(roleInfo);
      role.permissions = permissions;
      await this.roleRepository.save(role);
    }
  }

  async seedDefaultPermissions() {
    const existingPermissions = await this.permissionRepository.find();
    if (existingPermissions.length > 0) return;

    const permissions = [
      // Dashboard
      { code: 'dashboard.access', name: 'Quyền truy cập vào bảng điều khiển', category: 'dashboard', context: PermissionContext.ORGANIZATION, sortOrder: 1 },

      // Users
      { code: 'users.access', name: 'Quyền truy cập vào trang quản lý người dùng', category: 'users', context: PermissionContext.ORGANIZATION, sortOrder: 1 },
      { code: 'users.create', name: 'Cho phép thêm người dùng', category: 'users', context: PermissionContext.ORGANIZATION, sortOrder: 2 },
      { code: 'users.export', name: 'Cho phép xuất dữ liệu', category: 'users', context: PermissionContext.ORGANIZATION, sortOrder: 3 },
      { code: 'users.view_details', name: 'Cho phép xem chi tiết (icon con mắt)', category: 'users', context: PermissionContext.ORGANIZATION, sortOrder: 4 },
      { code: 'users.update', name: 'Cho phép chỉnh sửa', category: 'users', context: PermissionContext.ORGANIZATION, sortOrder: 5 },
      { code: 'users.delete', name: 'Cho phép xóa', category: 'users', context: PermissionContext.ORGANIZATION, sortOrder: 6 },

      // Organizations
      { code: 'organizations.access', name: 'Quyền truy cập vào trang tổ chức', category: 'organizations', context: PermissionContext.ORGANIZATION, sortOrder: 1 },
      { code: 'organizations.create', name: 'Quyền thêm tổ chức mới', category: 'organizations', context: PermissionContext.SYSTEM, sortOrder: 2 },
      { code: 'organizations.view_member_count', name: 'Quyền xem số lượng thành viên', category: 'organizations', context: PermissionContext.ORGANIZATION, sortOrder: 3 },
      { code: 'organizations.access_children', name: 'Quyền cho phép truy cập vào tổ chức con (icon con mắt)', category: 'organizations', context: PermissionContext.ORGANIZATION, sortOrder: 4 },
      { code: 'organizations.update', name: 'Quyền chỉnh sửa thông tin của tổ chức', category: 'organizations', context: PermissionContext.ORGANIZATION, sortOrder: 5 },
      { code: 'organizations.delete', name: 'Quyền xóa tổ chức', category: 'organizations', context: PermissionContext.ORGANIZATION, sortOrder: 6 },
      { code: 'organizations.remove_member', name: 'Quyền xóa thành viên khỏi tổ chức', category: 'organizations', context: PermissionContext.ORGANIZATION, sortOrder: 7 },
      { code: 'organizations.add_member', name: 'Quyền thêm thành viên vào tổ chức', category: 'organizations', context: PermissionContext.ORGANIZATION, sortOrder: 8 },

      // Departments
      { code: 'departments.access', name: 'Quyền truy cập vào trang đơn vị', category: 'departments', context: PermissionContext.ORGANIZATION, sortOrder: 1 },
      { code: 'departments.create', name: 'Quyền thêm đơn vị mới', category: 'departments', context: PermissionContext.ORGANIZATION, sortOrder: 2 },
      { code: 'departments.view_details', name: 'Quyền xem chi tiết đơn vị', category: 'departments', context: PermissionContext.ORGANIZATION, sortOrder: 3 },
      { code: 'departments.update', name: 'Quyền chỉnh sửa thông tin đơn vị', category: 'departments', context: PermissionContext.ORGANIZATION, sortOrder: 4 },
      { code: 'departments.delete', name: 'Quyền xóa đơn vị khỏi tổ chức', category: 'departments', context: PermissionContext.ORGANIZATION, sortOrder: 5 },

      // Classes
      { code: 'classes.access', name: 'Quyền truy cập vào trang lớp học', category: 'classes', context: PermissionContext.ORGANIZATION, sortOrder: 1 },
      { code: 'classes.create', name: 'Quyền thêm lớp học', category: 'classes', context: PermissionContext.ORGANIZATION, sortOrder: 2 },
      { code: 'classes.view_details', name: 'Quyền xem chi tiết lớp học', category: 'classes', context: PermissionContext.ORGANIZATION, sortOrder: 3 },
      { code: 'classes.update', name: 'Quyền chỉnh sửa thông tin lớp học', category: 'classes', context: PermissionContext.ORGANIZATION, sortOrder: 4 },
      { code: 'classes.delete', name: 'Quyền xóa lớp học', category: 'classes', context: PermissionContext.ORGANIZATION, sortOrder: 5 },

      // Permissions Management
      { code: 'permissions.access', name: 'Quyền truy cập vào trang quản lý phân quyền', category: 'permissions', context: PermissionContext.SYSTEM, sortOrder: 1 },
      { code: 'permissions.create', name: 'Quyền tạo role mới', category: 'permissions', context: PermissionContext.SYSTEM, sortOrder: 2 },
      { code: 'permissions.update', name: 'Quyền chỉnh sửa role', category: 'permissions', context: PermissionContext.SYSTEM, sortOrder: 3 },
      { code: 'permissions.delete', name: 'Quyền xóa role', category: 'permissions', context: PermissionContext.SYSTEM, sortOrder: 4 },
      { code: 'permissions.view_details', name: 'Quyền xem chi tiết role', category: 'permissions', context: PermissionContext.SYSTEM, sortOrder: 5 },
    ];

    await this.permissionRepository.save(permissions);
  }

  async grantRolesToUser(
    userId: string,
    roleAssignments: Array<{
      roleIds: string[];
      organizationIds?: string[];
      isGlobal?: boolean;
    }>
  ): Promise<UserRole[]> {
    console.log('Granting roles to user:', userId, 'assignments:', roleAssignments);

    // First, remove all existing roles for this user
    await this.removeAllUserRoles(userId);

    const createdUserRoles: UserRole[] = [];

    // Process each role assignment
    for (const assignment of roleAssignments) {
      const { roleIds, organizationIds = [], isGlobal = false } = assignment;

      // Validate roles exist
      const roles = await this.roleRepository.find({
        where: { id: In(roleIds), isActive: true }
      });

      if (roles.length !== roleIds.length) {
        throw new BadRequestException('Some roles are invalid or inactive');
      }

      if (isGlobal || organizationIds.length === 0) {
        // Global role assignment
        for (const roleId of roleIds) {
          const userRole = this.userRoleRepository.create({
            userId,
            roleId,
            organizationId: null,
          });
          const savedRole = await this.userRoleRepository.save(userRole);
          createdUserRoles.push(savedRole);
        }
      } else {
        // Organization-specific role assignment
        for (const roleId of roleIds) {
          for (const organizationId of organizationIds) {
            const userRole = this.userRoleRepository.create({
              userId,
              roleId,
              organizationId,
            });
            const savedRole = await this.userRoleRepository.save(userRole);
            createdUserRoles.push(savedRole);
          }
        }
      }
    }

    console.log('Roles granted successfully:', createdUserRoles.length, 'assignments created');
    return createdUserRoles;
  }
}
