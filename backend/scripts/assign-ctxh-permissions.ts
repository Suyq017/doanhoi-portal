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

async function assignCTXHToAdmin() {
    try {
        await AppDataSource.initialize();
        console.log('🔄 Database connection established');

        const roleRepository = AppDataSource.getRepository(Role);
        const permissionRepository = AppDataSource.getRepository(Permission);

        // Find super_admin role
        const adminRole = await roleRepository.findOne({
            where: { name: 'super_admin' },
            relations: ['permissions']
        });

        if (!adminRole) {
            console.log('❌ super_admin role not found');
            return;
        }

        console.log(`📍 Found admin role: ${adminRole.displayName}`);

        // Find all CTXH permissions
        const ctxhPermissions = await permissionRepository
            .createQueryBuilder('permission')
            .where('permission.code LIKE :prefix', { prefix: 'ctxh.%' })
            .getMany();

        console.log(`Found ${ctxhPermissions.length} CTXH permissions`);

        // Get current permission codes - handle case where permissions might be undefined
        const currentPermissionCodes = (adminRole.permissions || []).map(p => p.code);

        // Find missing CTXH permissions
        const missingPermissions = ctxhPermissions.filter(p => 
            !currentPermissionCodes.includes(p.code)
        );

        if (missingPermissions.length === 0) {
            console.log('✅ Admin already has all CTXH permissions');
        } else {
            console.log(`Adding ${missingPermissions.length} missing CTXH permissions:`);
            missingPermissions.forEach(p => {
                console.log(`   - ${p.code}: ${p.name}`);
            });

            // Initialize permissions array if it doesn't exist
            if (!adminRole.permissions) {
                adminRole.permissions = [];
            }

            // Add missing permissions
            adminRole.permissions.push(...missingPermissions);
            await roleRepository.save(adminRole);

            console.log('✅ CTXH permissions added to admin role successfully');
        }

        // Verify final result
        const updatedRole = await roleRepository.findOne({
            where: { name: 'super_admin' },
            relations: ['permissions']
        });

        const finalCtxhPerms = (updatedRole.permissions || [])
            .filter(p => p.code.startsWith('ctxh.'))
            .sort((a, b) => a.code.localeCompare(b.code));

        console.log(`\n📋 Admin now has ${finalCtxhPerms.length} CTXH permissions:`);
        finalCtxhPerms.forEach(p => {
            console.log(`   ✓ ${p.code}: ${p.name}`);
        });

    } catch (error) {
        console.error('❌ Error:', error);
    } finally {
        await AppDataSource.destroy();
        console.log('🔌 Database connection closed');
    }
}

assignCTXHToAdmin().catch(console.error);