const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function addCTXHPermissions() {
  try {
    console.log('🔄 Adding CTXH permissions...');

    // 1. Create CTXH permissions
    const ctxhPermissions = [
      {
        name: 'ctxh.access',
        description: 'Truy cập module quản lý CTXH'
      },
      {
        name: 'ctxh.categories.view',
        description: 'Xem danh mục CTXH'
      },
      {
        name: 'ctxh.categories.create',
        description: 'Tạo danh mục CTXH'
      },
      {
        name: 'ctxh.categories.update',
        description: 'Cập nhật danh mục CTXH'
      },
      {
        name: 'ctxh.categories.delete',
        description: 'Xóa danh mục CTXH'
      },
      {
        name: 'ctxh.activities.view',
        description: 'Xem hoạt động CTXH'
      },
      {
        name: 'ctxh.activities.create',
        description: 'Tạo hoạt động CTXH'
      },
      {
        name: 'ctxh.activities.update',
        description: 'Cập nhật hoạt động CTXH'
      },
      {
        name: 'ctxh.activities.delete',
        description: 'Xóa hoạt động CTXH'
      },
      {
        name: 'ctxh.activities.manage_participants',
        description: 'Quản lý người tham gia hoạt động CTXH'
      },
      {
        name: 'ctxh.reports.view',
        description: 'Xem báo cáo CTXH'
      },
      {
        name: 'ctxh.reports.export',
        description: 'Xuất báo cáo CTXH'
      },
      {
        name: 'ctxh.config.manage',
        description: 'Quản lý cấu hình CTXH'
      }
    ];

    // Create permissions if they don't exist
    for (const permissionData of ctxhPermissions) {
      const existingPermission = await prisma.permission.findUnique({
        where: { name: permissionData.name }
      });

      if (!existingPermission) {
        await prisma.permission.create({
          data: permissionData
        });
        console.log(`✅ Created permission: ${permissionData.name}`);
      } else {
        console.log(`⏭️  Permission already exists: ${permissionData.name}`);
      }
    }

    // 2. Find admin role
    const adminRole = await prisma.role.findFirst({
      where: {
        OR: [
          { name: 'admin' },
          { name: 'Admin' },
          { name: 'ADMIN' }
        ]
      }
    });

    if (!adminRole) {
      console.log('❌ Admin role not found');
      return;
    }

    console.log(`📍 Found admin role: ${adminRole.name} (ID: ${adminRole.id})`);

    // 3. Assign CTXH permissions to admin role
    const ctxhPermissionNames = ctxhPermissions.map(p => p.name);
    
    const permissions = await prisma.permission.findMany({
      where: {
        name: {
          in: ctxhPermissionNames
        }
      }
    });

    for (const permission of permissions) {
      // Check if role already has this permission
      const existingRolePermission = await prisma.rolePermission.findUnique({
        where: {
          roleId_permissionId: {
            roleId: adminRole.id,
            permissionId: permission.id
          }
        }
      });

      if (!existingRolePermission) {
        await prisma.rolePermission.create({
          data: {
            roleId: adminRole.id,
            permissionId: permission.id
          }
        });
        console.log(`✅ Assigned permission "${permission.name}" to admin role`);
      } else {
        console.log(`⏭️  Admin already has permission: ${permission.name}`);
      }
    }

    console.log('🎉 CTXH permissions setup completed!');
    
    // 4. Show current admin permissions for verification
    const adminPermissions = await prisma.rolePermission.findMany({
      where: { roleId: adminRole.id },
      include: {
        permission: true
      }
    });

    const ctxhPerms = adminPermissions.filter(rp => 
      rp.permission.name.startsWith('ctxh.')
    );

    console.log('\n📋 Admin now has the following CTXH permissions:');
    ctxhPerms.forEach(rp => {
      console.log(`   - ${rp.permission.name}: ${rp.permission.description}`);
    });

  } catch (error) {
    console.error('❌ Error adding CTXH permissions:', error);
  } finally {
    await prisma.$disconnect();
  }
}

addCTXHPermissions();
