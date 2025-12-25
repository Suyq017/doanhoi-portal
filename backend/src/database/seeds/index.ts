import { DataSource } from "typeorm";
import { seedPermissions } from "./permissions.seed";
import { seedRoles } from "./roles.seed";
import { seedDefaultUsers } from "./default-users.seed";
import { config } from "dotenv";

// Load environment variables
config();

// Import entities
import { User } from "../../entities/user.entity";
import { Organization } from "../../entities/organization.entity";
import { UserOrganization } from "../../entities/user-organization.entity";
import { Department } from "../../entities/department.entity";
import { Class } from "../../entities/class.entity";
import { Permission } from "../../entities/permission.entity";
import { Role } from "../../entities/role.entity";
import { UserRole } from "../../entities/user-role.entity";

const runSeeding = async () => {
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

    // Run seeds in correct order
    console.log("1. Starting permissions seeding...");
    await seedPermissions(dataSource);

    console.log("2. Starting roles seeding...");
    await seedRoles(dataSource);

    console.log("3. Starting default users seeding...");
    await seedDefaultUsers(dataSource);

    console.log("\n🎉 All seeding completed successfully!");
    console.log("You can now login with the default credentials shown above.");
  } catch (error) {
    console.error("❌ Error during seeding:", error);
  } finally {
    await dataSource.destroy();
  }
};

runSeeding();
