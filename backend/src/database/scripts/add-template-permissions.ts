import { DataSource } from 'typeorm';
import { Permission, PermissionContext } from '../../entities/permission.entity';
import { Role } from '../../entities/role.entity';

export async function addTemplatePermissions(dataSource: DataSource) {
  const permissionRepository = dataSource.getRepository(Permission);
  const roleRepository = dataSource.getRepository(Role);

  console.log('🔄 Adding Template permissions...');

  // Define new permissions
  const newPermissions = [
    {
      code: 'templates.access',
      name: 'Xem trang Biểu mẫu',
      description: 'Cho phép truy cập trang Biểu mẫu để điền và nộp form',
      category: 'templates',
      context: PermissionContext.ORGANIZATION,
      sortOrder: 100,
    },
    {
      code: 'templates.admin.access',
      name: 'Xem trang Quản lý biểu mẫu',
      description: 'Cho phép truy cập trang Quản lý biểu mẫu (admin)',
      category: 'templates',
      context: PermissionContext.ORGANIZATION,
      sortOrder: 101,
    },
    {
      code: 'templates.manage',
      name: 'Quản lý biểu mẫu',
      description: 'Cho phép tạo, sửa, xóa biểu mẫu trong trang Quản lý biểu mẫu',
      category: 'templates',
      context: PermissionContext.ORGANIZATION,
      sortOrder: 102,
    },
  ];

  // Create permissions if they don't exist
  const createdPermissions: Permission[] = [];
  for (const permData of newPermissions) {
    let permission = await permissionRepository.findOne({
      where: { code: permData.code },
    });

    if (!permission) {
      permission = permissionRepository.create(permData);
      await permissionRepository.save(permission);
      console.log(`✅ Created permission: ${permission.code}`);
      createdPermissions.push(permission);
    } else {
      console.log(`ℹ️  Permission already exists: ${permission.code}`);
      createdPermissions.push(permission);
    }
  }

  // Assign permissions to Super Admin role
  const superAdminRole = await roleRepository.findOne({
    where: { name: 'super_admin' },
    relations: ['permissions'],
  });

  if (superAdminRole) {
    let permissionsAdded = false;
    for (const permission of createdPermissions) {
      const hasPermission = superAdminRole.permissions.some(
        (p) => p.id === permission.id,
      );
      if (!hasPermission) {
        superAdminRole.permissions.push(permission);
        permissionsAdded = true;
      }
    }

    if (permissionsAdded) {
      await roleRepository.save(superAdminRole);
      console.log('✅ Assigned new permissions to Super Admin role');
    } else {
      console.log('ℹ️  Super Admin already has all permissions');
    }
  } else {
    console.log('⚠️  Super Admin role not found');
  }

  console.log('✅ Template permissions update completed!');
}
