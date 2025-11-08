import { DataSource } from 'typeorm';
import { Permission } from '../../entities/permission.entity';
import { Role } from '../../entities/role.entity';

export async function addCtxhImportPermissions(dataSource: DataSource) {
  const permissionRepository = dataSource.getRepository(Permission);
  const roleRepository = dataSource.getRepository(Role);

  console.log('🔄 Adding CTXH Import permissions...');

  // Define new permissions
  const newPermissions = [
    {
      code: 'ctxh.import.old_system',
      name: 'Nhập ngày CTXH từ hệ thống cũ',
      description: 'Nhập dữ liệu CTXH từ hệ thống cũ',
      category: 'ctxh',
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

  console.log('✅ CTXH Import permissions update completed!');
}
