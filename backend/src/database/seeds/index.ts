import { DataSource } from 'typeorm';
import { seedPermissions } from './permissions.seed';
import { seedRoles } from './roles.seed';
import { config } from 'dotenv';

// Load environment variables
config();

// Import entities
import { User } from '../../entities/user.entity';
import { Organization } from '../../entities/organization.entity';
import { UserOrganization } from '../../entities/user-organization.entity';
import { Department } from '../../entities/department.entity';
import { Class } from '../../entities/class.entity';
import { Permission } from '../../entities/permission.entity';
import { Role } from '../../entities/role.entity';
import { UserRole } from '../../entities/user-role.entity';

const runSeeding = async () => {
    const dataSource = new DataSource({
        type: 'postgres',
        host: process.env.DB_HOST || 'localhost',
        port: parseInt(process.env.DB_PORT) || 5432,
        username: process.env.DB_USERNAME || 'postgres',
        password: process.env.DB_PASSWORD || 'postgres',
        database: process.env.DB_NAME || 'doanhoi',
        entities: [User, Organization, UserOrganization, Department, Class, Permission, Role, UserRole],
        synchronize: false,
    });

    try {
        await dataSource.initialize();
        console.log('Database connection established');

        // Run seeds
        console.log('Starting permissions seeding...');
        await seedPermissions(dataSource);

        console.log('Starting roles seeding...');
        await seedRoles(dataSource);

        console.log('All seeding completed successfully!');
    } catch (error) {
        console.error('Error during seeding:', error);
    } finally {
        await dataSource.destroy();
    }
};

runSeeding();
