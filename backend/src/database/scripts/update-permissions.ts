import "reflect-metadata";
import { DataSource } from "typeorm";
import * as dotenv from "dotenv";
import { seedPermissions } from "../seeds/permissions.seed";
import { addCtxhImportPermissions } from "./add-ctxh-import-permissions";
import { addTemplatePermissions } from "./add-template-permissions";

// Load environment variables
dotenv.config();

// Function to get proper database host
function getDatabaseHost(): string {
  const envHost = process.env.DB_HOST;
  if (envHost) return envHost;

  const envPort = process.env.DB_PORT;
  if (envPort === "2679") {
    return "doanhoi-postgres-prod";
  }

  return "127.0.0.1";
}

// Function to get proper database port
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

// Function to get database password
function getDatabasePassword(): string {
  const envPassword = process.env.DB_PASSWORD;
  if (envPassword) return envPassword;

  if (process.env.NODE_ENV === "production") {
    return "your_secure_password";
  }

  return "password";
}

const AppDataSource = new DataSource({
  type: "postgres",
  host: getDatabaseHost(),
  port: getDatabasePort(),
  username: process.env.DB_USERNAME || "postgres",
  password: getDatabasePassword(),
  database: process.env.DB_NAME || "doanhoi",
  entities: [__dirname + "/../../**/*.entity{.ts,.js}"],
  synchronize: false,
  logging: false,
});

/**
 * Script to update permissions in the database
 * This script will create new permissions and update existing ones
 *
 * Usage: npm run update-permissions
 */
async function updatePermissions() {
  console.log("🚀 Starting permissions update...\n");

  try {
    // Initialize database connection
    console.log("📦 Initializing database connection...");
    console.log(`📡 Host: ${getDatabaseHost()}:${getDatabasePort()}`);
    console.log(`🗄️  Database: ${process.env.DB_NAME || "doanhoi"}`);
    await AppDataSource.initialize();
    console.log("✅ Database connected successfully!\n");

    // Run permissions seed (will create new and update existing)
    console.log("🔄 Updating permissions...\n");
    await seedPermissions(AppDataSource);

    // Add CTXH Import permissions
    console.log("\n🔄 Adding CTXH Import permissions...\n");
    await addCtxhImportPermissions(AppDataSource);

    // Add Template permissions
    console.log("\n🔄 Adding Template permissions...\n");
    await addTemplatePermissions(AppDataSource);

    console.log("\n✅ Permissions update completed successfully!");
    console.log("📊 All permissions are now up to date.\n");

    process.exit(0);
  } catch (error) {
    console.error("❌ Error updating permissions:", error);
    process.exit(1);
  }
}

// Run the update
updatePermissions();
