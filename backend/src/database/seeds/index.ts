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

function getDatabaseHost(): string {
  const envHost = process.env.DB_HOST;
  if (envHost) return envHost;

  const envPort = process.env.DB_PORT;
  if (envPort === "2679") {
    return "doanhoi-postgres-prod";
  }

  return "127.0.0.1";
}

function getDatabasePort(): number {
  const envPort = process.env.DB_PORT;
  if (envPort) {
    if (envPort === "2679") {
      return 5432;
    }
    return parseInt(envPort);
  }

  return 9000;
}

function getDatabasePassword(): string {
  const envPassword = process.env.DB_PASSWORD;
  if (envPassword) return envPassword;

  if (process.env.NODE_ENV === "production") {
    return "your_secure_password";
  }

  return "password";
}

const runSeeding = async () => {
  const dataSource = new DataSource({
    type: "postgres",
    host: getDatabaseHost(),
    port: getDatabasePort(),
    username: process.env.DB_USERNAME || "postgres",
    password: getDatabasePassword(),
    database: process.env.DB_NAME || process.env.DB_DATABASE || "doanhoi",
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

  let isInitialized = false;

  try {
    console.log("🔄 Connecting to database...");
    console.log(`📡 Host: ${getDatabaseHost()}:${getDatabasePort()}`);
    console.log(
      `🗄️  Database: ${process.env.DB_NAME || process.env.DB_DATABASE || "doanhoi"}`,
    );

    await dataSource.initialize();
    isInitialized = true;
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
    if (isInitialized) {
      await dataSource.destroy();
    }
  }
};

runSeeding();
