import { DataSource } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { User, UserType, MembershipStatus, AuthProvider } from '../../entities/user.entity';
import { Role } from '../../entities/role.entity';
import { UserRole } from '../../entities/user-role.entity';
import { Organization, OrganizationType } from '../../entities/organization.entity';
import { UserOrganization } from '../../entities/user-organization.entity';

export const seedDefaultUsers = async (dataSource: DataSource) => {
    const userRepository = dataSource.getRepository(User);
    const roleRepository = dataSource.getRepository(Role);
    const userRoleRepository = dataSource.getRepository(UserRole);
    const organizationRepository = dataSource.getRepository(Organization);
    const userOrgRepository = dataSource.getRepository(UserOrganization);

    // Default users to create
    const defaultUsers = [
        {
            code: 'SUPERADMIN001',
            familyName: 'Super',
            givenName: 'Admin',
            email: 'admin@doanhoi.com',
            phone: '0123456789',
            password: 'admin1',
            userType: UserType.STAFF,
            membershipStatus: MembershipStatus.BOTH,
            authProvider: AuthProvider.LOCAL,
            roleName: 'super_admin',
            isSystemUser: true
        },

    ];    // Get or create default organization
    let defaultOrg = await organizationRepository.findOne({
        where: { code: 'ROOT' }
    });

    if (!defaultOrg) {
        defaultOrg = organizationRepository.create({
            name: 'Tổ chức Gốc',
            description: 'Tổ chức gốc của hệ thống',
            type: OrganizationType.DOAN_TRUONG,
            code: 'ROOT',
            isActive: true
        });
        await organizationRepository.save(defaultOrg);
        console.log('Created default organization: ROOT');
    }

    for (const userData of defaultUsers) {
        // Check if user already exists
        const existingUser = await userRepository.findOne({
            where: [
                { email: userData.email },
                { code: userData.code }
            ]
        });

        if (!existingUser) {
            // Hash password
            const hashedPassword = await bcrypt.hash(userData.password, 10);            // Create user
            const user = userRepository.create({
                code: userData.code,
                familyName: userData.familyName,
                givenName: userData.givenName,
                email: userData.email,
                phone: userData.phone,
                password: hashedPassword,
                userType: userData.userType,
                membershipStatus: userData.membershipStatus,
                authProvider: userData.authProvider,
                isActive: true
            });

            const savedUser = await userRepository.save(user);
            console.log(`Created user: ${userData.email}`);

            // Get role
            const role = await roleRepository.findOne({
                where: { name: userData.roleName }
            });

            if (role) {
                // Assign role to user
                const userRole = userRoleRepository.create({
                    userId: savedUser.id,
                    roleId: role.id,
                    organizationId: userData.isSystemUser ? null : defaultOrg.id, // System roles don't need org context
                    isActive: true,
                });

                await userRoleRepository.save(userRole);
                console.log(`Assigned role ${userData.roleName} to user: ${userData.email}`);                // Add user to organization (except for system users with global access)
                if (!userData.isSystemUser) {
                    const userOrg = userOrgRepository.create({
                        userId: savedUser.id,
                        organizationId: defaultOrg.id,
                        isActive: true
                    });

                    await userOrgRepository.save(userOrg);
                    console.log(`Added user ${userData.email} to organization: ${defaultOrg.name}`);
                }
            } else {
                console.log(`⚠️ Role ${userData.roleName} not found for user: ${userData.email}`);
            }
        } else {
            console.log(`User already exists: ${userData.email}`);
        }
    }

    console.log('Default users seeding completed!');
    console.log('\n=== DEFAULT LOGIN CREDENTIALS ===');
    console.log('Admin:');
    console.log('  Email: admin@doanhoi.com');
    console.log('  Password: admin1');

    console.log('==========================================\n');
};