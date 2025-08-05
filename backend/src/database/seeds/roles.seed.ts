import { DataSource } from 'typeorm';
import { Role } from '../../entities/role.entity';
import { Permission } from '../../entities/permission.entity';

export const seedRoles = async (dataSource: DataSource) => {
    const roleRepository = dataSource.getRepository(Role);
    const permissionRepository = dataSource.getRepository(Permission);

    // Define roles with their permissions
    const rolesData = [
        {
            name: 'super_admin',
            displayName: 'Super Admin',
            description: 'Quyền cao nhất trong hệ thống',
            isSystemRole: true,
            permissionCodes: [
                'dashboard.access',
                'users.access', 'users.create', 'users.view_details', 'users.update', 'users.delete', 'users.export',
                'organizations.access', 'organizations.create', 'organizations.view_member_count', 'organizations.access_children', 'organizations.update', 'organizations.delete', 'organizations.add_member', 'organizations.remove_member',
                'departments.access', 'departments.create', 'departments.view_details', 'departments.update', 'departments.delete',
                'classes.access', 'classes.create', 'classes.view_details', 'classes.update', 'classes.delete',
                'permissions.access', 'permissions.create', 'permissions.update', 'permissions.delete', 'permissions.view_details',
            ]
        },
        {
            name: 'admin',
            displayName: 'Admin',
            description: 'Quản trị viên tổ chức',
            isSystemRole: false,
            permissionCodes: [
                'dashboard.access',
                'users.access', 'users.create', 'users.view_details', 'users.update', 'users.delete', 'users.export',
                'organizations.access', 'organizations.view_member_count', 'organizations.access_children', 'organizations.update', 'organizations.add_member', 'organizations.remove_member',
                'departments.access', 'departments.create', 'departments.view_details', 'departments.update', 'departments.delete',
                'classes.access', 'classes.create', 'classes.view_details', 'classes.update', 'classes.delete',
            ]
        },
        {
            name: 'manager',
            displayName: 'Quản lý',
            description: 'Quản lý tổ chức hoặc phòng ban',
            isSystemRole: false,
            permissionCodes: [
                'dashboard.access',
                'users.access', 'users.create', 'users.view_details', 'users.update', 'users.export',
                'organizations.access', 'organizations.view_member_count', 'organizations.access_children', 'organizations.add_member',
                'departments.access', 'departments.create', 'departments.view_details', 'departments.update',
                'classes.access', 'classes.create', 'classes.view_details', 'classes.update',
            ]
        },
        {
            name: 'editor',
            displayName: 'Biên tập viên',
            description: 'Có thể chỉnh sửa thông tin cơ bản',
            isSystemRole: false,
            permissionCodes: [
                'dashboard.access',
                'users.access', 'users.view_details', 'users.update',
                'organizations.access', 'organizations.view_member_count',
                'departments.access', 'departments.view_details', 'departments.update',
                'classes.access', 'classes.view_details', 'classes.update',
            ]
        },
        {
            name: 'viewer',
            displayName: 'Người xem',
            description: 'Chỉ có thể xem thông tin',
            isSystemRole: false,
            permissionCodes: [
                'dashboard.access',
                'users.access', 'users.view_details',
                'organizations.access', 'organizations.view_member_count',
                'departments.access', 'departments.view_details',
                'classes.access', 'classes.view_details',
            ]
        }
    ];

    for (const roleData of rolesData) {
        const existingRole = await roleRepository.findOne({
            where: { name: roleData.name },
            relations: ['permissions']
        });

        if (!existingRole) {
            // Get permissions for this role
            const permissions = await permissionRepository.find({
                where: roleData.permissionCodes.map(code => ({ code }))
            });

            const role = roleRepository.create({
                name: roleData.name,
                displayName: roleData.displayName,
                description: roleData.description, isSystemRole: roleData.isSystemRole,
                permissions: permissions,
            });

            await roleRepository.save(role);
            console.log(`Created role: ${roleData.name} with ${permissions.length} permissions`);
        } else {
            console.log(`Role already exists: ${roleData.name}`);
        }
    }

    console.log('Roles seeding completed!');
};
