const { DataSource } = require('typeorm');
const path = require('path');

// Import entities
const { Role } = require('../dist/entities/role.entity.js');
const { Permission } = require('../dist/entities/permission.entity.js');

const dataSource = new DataSource({
  type: 'mysql',
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT) || 3306,
  username: process.env.DB_USERNAME || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_DATABASE || 'doanhoi_portal',
  entities: [path.join(__dirname, '../dist/entities/*.entity.js')],
  synchronize: false,
});

async function updateAdminRoleWithCTXH() {
  try {
    await dataSource.initialize();
    console.log('🔄 Connected to database');

    const roleRepository = dataSource.getRepository('Role');
    const permissionRepository = dataSource.getRepository('Permission');

    // Find super_admin role
    const adminRole = await roleRepository.findOne({
      where: { name: 'super_admin' },
      relations: ['permissions']
    });

    if (!adminRole) {
      console.log('❌ super_admin role not found');
      return;
    }

    console.log(`📍 Found admin role: ${adminRole.name} (ID: ${adminRole.id})`);

    // Get all CTXH permissions
    const ctxhPermissions = await permissionRepository.find({
      where: {
        code: [
          'ctxh.access', 'ctxh.categories.view', 'ctxh.categories.create', 
          'ctxh.categories.update', 'ctxh.categories.delete',
          'ctxh.activities.view', 'ctxh.activities.create', 'ctxh.activities.update', 
          'ctxh.activities.delete', 'ctxh.activities.manage_participants',
          'ctxh.reports.view', 'ctxh.reports.export', 'ctxh.config.manage'
        ]
      }
    });

    console.log(`Found ${ctxhPermissions.length} CTXH permissions`);

    // Get current permissions
    const currentPermissions = adminRole.permissions || [];
    
    // Check which CTXH permissions are missing
    const currentPermissionCodes = currentPermissions.map(p => p.code);
    const missingPermissions = ctxhPermissions.filter(p => 
      !currentPermissionCodes.includes(p.code)
    );

    if (missingPermissions.length === 0) {
      console.log('✅ Admin role already has all CTXH permissions');
      return;
    }

    console.log(`Adding ${missingPermissions.length} missing CTXH permissions:`);
    missingPermissions.forEach(p => console.log(`   - ${p.code}: ${p.name}`));

    // Add missing permissions to admin role
    adminRole.permissions = [...currentPermissions, ...missingPermissions];
    await roleRepository.save(adminRole);

    console.log('✅ Admin role updated successfully with CTXH permissions');
    
    // Verify the update
    const updatedRole = await roleRepository.findOne({
      where: { name: 'super_admin' },
      relations: ['permissions']
    });

    const ctxhPerms = updatedRole.permissions.filter(p => p.code.startsWith('ctxh.'));
    console.log(`\n📋 Admin now has ${ctxhPerms.length} CTXH permissions:`);
    ctxhPerms.forEach(p => console.log(`   - ${p.code}: ${p.name}`));

  } catch (error) {
    console.error('❌ Error updating admin role:', error);
  } finally {
    await dataSource.destroy();
  }
}

updateAdminRoleWithCTXH();