import { DataSource } from 'typeorm';
import { Role } from '../src/entities/role.entity';
import { Permission } from '../src/entities/permission.entity';
import { config } from 'dotenv';

// Load environment variables
config();

const AppDataSource = new DataSource({
    type: 'postgres',
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT) || 5432,
    username: process.env.DB_USERNAME || 'postgres',
    password: process.env.DB_PASSWORD || 'postgres',
    database: process.env.DB_NAME || 'doanhoi',
    entities: [Role, Permission],
    synchronize: false,
});

async function createAndAssignCTXHPermissions() {
    try {
        await AppDataSource.initialize();
        console.log('🔄 Database connection established');

        const roleRepository = AppDataSource.getRepository(Role);
        const permissionRepository = AppDataSource.getRepository(Permission);

        // 1. Define CTXH permissions
        const ctxhPermissionsData = [
            {
                code: 'ctxh.access',
                name: 'Truy cập module quản lý CTXH',
                description: 'Cho phép truy cập vào module quản lý công tác xã hội',
                category: 'ctxh'
            },
            {
                code: 'ctxh.categories.view',
                name: 'Xem danh mục CTXH',
                description: 'Xem danh sách danh mục công tác xã hội',
                category: 'ctxh'
            },
            {
                code: 'ctxh.categories.create',
                name: 'Tạo danh mục CTXH',
                description: 'Tạo danh mục công tác xã hội mới',
                category: 'ctxh'
            },
            {
                code: 'ctxh.categories.update',
                name: 'Cập nhật danh mục CTXH',
                description: 'Chỉnh sửa thông tin danh mục công tác xã hội',
                category: 'ctxh'
            },
            {
                code: 'ctxh.categories.delete',
                name: 'Xóa danh mục CTXH',
                description: 'Xóa danh mục công tác xã hội',
                category: 'ctxh'
            },
            {
                code: 'ctxh.activities.view',
                name: 'Xem hoạt động CTXH',
                description: 'Xem danh sách hoạt động công tác xã hội',
                category: 'ctxh'
            },
            {
                code: 'ctxh.activities.create',
                name: 'Tạo hoạt động CTXH',
                description: 'Tạo hoạt động công tác xã hội mới',
                category: 'ctxh'
            },
            {
                code: 'ctxh.activities.update',
                name: 'Cập nhật hoạt động CTXH',
                description: 'Chỉnh sửa thông tin hoạt động công tác xã hội',
                category: 'ctxh'
            },
            {
                code: 'ctxh.activities.delete',
                name: 'Xóa hoạt động CTXH',
                description: 'Xóa hoạt động công tác xã hội',
                category: 'ctxh'
            },
            {
                code: 'ctxh.activities.manage_participants',
                name: 'Quản lý người tham gia CTXH',
                description: 'Quản lý người tham gia hoạt động công tác xã hội',
                category: 'ctxh'
            },
            {
                code: 'ctxh.reports.view',
                name: 'Xem báo cáo CTXH',
                description: 'Xem báo cáo công tác xã hội',
                category: 'ctxh'
            },
            {
                code: 'ctxh.reports.export',
                name: 'Xuất báo cáo CTXH',
                description: 'Xuất dữ liệu báo cáo công tác xã hội',
                category: 'ctxh'
            },
            {
                code: 'ctxh.config.manage',
                name: 'Quản lý cấu hình CTXH',
                description: 'Quản lý cấu hình hệ thống công tác xã hội',
                category: 'ctxh'
            }
        ];

        console.log(`\n📝 Creating ${ctxhPermissionsData.length} CTXH permissions...`);

        // 2. Create permissions if they don't exist
        const createdPermissions: Permission[] = [];

        for (const permData of ctxhPermissionsData) {
            let permission = await permissionRepository.findOne({
                where: { code: permData.code }
            });

            if (!permission) {
                permission = permissionRepository.create(permData);
                await permissionRepository.save(permission);
                console.log(`✅ Created: ${permData.code}`);
            } else {
                console.log(`⏭️  Exists: ${permData.code}`);
            }

            createdPermissions.push(permission);
        }

        // 3. Find super_admin role
        const adminRole = await roleRepository.findOne({
            where: { name: 'super_admin' },
            relations: ['permissions']
        });

        if (!adminRole) {
            console.log('\n❌ super_admin role not found');
            console.log('Available roles:');
            const allRoles = await roleRepository.find();
            allRoles.forEach(r => console.log(`   - ${r.name} (${r.displayName})`));
            return;
        }

        console.log(`\n📍 Found role: ${adminRole.displayName} (${adminRole.name})`);

        // 4. Assign permissions to super_admin
        const currentPermissionCodes = (adminRole.permissions || []).map(p => p.code);
        const missingPermissions = createdPermissions.filter(p =>
            !currentPermissionCodes.includes(p.code)
        );

        if (missingPermissions.length === 0) {
            console.log('✅ super_admin already has all CTXH permissions');
        } else {
            console.log(`\n🔗 Assigning ${missingPermissions.length} missing permissions...`);

            adminRole.permissions = [...(adminRole.permissions || []), ...missingPermissions];
            await roleRepository.save(adminRole);

            missingPermissions.forEach(p => {
                console.log(`✅ Assigned: ${p.code}`);
            });
        }

        // 5. Verify results
        const updatedRole = await roleRepository.findOne({
            where: { name: 'super_admin' },
            relations: ['permissions']
        });

        const ctxhPerms = (updatedRole.permissions || []).filter(p => p.code.startsWith('ctxh.'));

        console.log(`\n📋 super_admin now has ${ctxhPerms.length} CTXH permissions:`);
        ctxhPerms.forEach(p => {
            console.log(`   ✓ ${p.code}: ${p.name}`);
        });

        console.log('\n🎉 Setup completed successfully!');

    } catch (error) {
        console.error('\n❌ Error:', error.message);
        if (error.stack) {
            console.error('\nStack trace:', error.stack);
        }
    } finally {
        await AppDataSource.destroy();
        console.log('\n🔌 Database connection closed');
    }
}

createAndAssignCTXHPermissions();
