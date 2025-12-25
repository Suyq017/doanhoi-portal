import { DataSource } from "typeorm";
import { config } from "dotenv";
import { User } from "../../entities/user.entity";
import { Role } from "../../entities/role.entity";
import { UserRole } from "../../entities/user-role.entity";
import { Organization } from "../../entities/organization.entity";
import { UserOrganization } from "../../entities/user-organization.entity";
import { Department } from "../../entities/department.entity";
import { Class } from "../../entities/class.entity";
import { Permission } from "../../entities/permission.entity";

// Load environment variables
config();

const assignUserRoles = async () => {
  const dataSource = new DataSource({
    type: "postgres",
    host: process.env.DB_HOST || "localhost",
    port: parseInt(process.env.DB_PORT) || 5432,
    username: process.env.DB_USERNAME || "postgres",
    password: process.env.DB_PASSWORD || "postgres",
    database: process.env.DB_NAME || "doanhoi",
    entities: [
      User,
      Organization,
      UserOrganization,
      Department,
      Class,
      Permission,
      Role,
      UserRole,
    ],
    synchronize: false,
  });

  try {
    await dataSource.initialize();
    console.log("Database connection established");

    const userRepository = dataSource.getRepository(User);
    const roleRepository = dataSource.getRepository(Role);
    const userRoleRepository = dataSource.getRepository(UserRole);
    const organizationRepository = dataSource.getRepository(Organization);

    // Get all users
    const users = await userRepository.find();
    console.log(`Found ${users.length} users in database`);

    // Get admin role
    const adminRole = await roleRepository.findOne({
      where: { name: "admin" },
    });
    if (!adminRole) {
      console.log("Admin role not found!");
      return;
    } // Get first organization for context
    const firstOrg = await organizationRepository.findOne({
      where: {},
    });

    for (const user of users) {
      // Check if user already has any roles
      const existingUserRole = await userRoleRepository.findOne({
        where: { userId: user.id },
      });

      if (!existingUserRole) {
        // Assign admin role to the user
        const userRole = userRoleRepository.create({
          userId: user.id,
          roleId: adminRole.id,
          organizationId: firstOrg?.id || null,
          isActive: true,
        });

        await userRoleRepository.save(userRole);
        console.log(`Assigned admin role to user: ${user.email}`);
      } else {
        console.log(`User ${user.email} already has roles assigned`);
      }
    }

    console.log("User role assignment completed!");
  } catch (error) {
    console.error("Error during role assignment:", error);
  } finally {
    await dataSource.destroy();
  }
};

assignUserRoles();
