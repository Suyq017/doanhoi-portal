import "reflect-metadata";
import { DataSource } from "typeorm";
import * as dotenv from "dotenv";
import { Role } from "../../entities/role.entity";
import { Permission } from "../../entities/permission.entity";

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
 * Script to update super_admin role with latest permissions
 * This ensures super_admin has all permissions defined in the system
 *
 * Usage: npm run update-super-admin
 */
async function updateSuperAdminRole() {
  console.log("🚀 Starting super_admin role update...\n");

  try {
    // Initialize database connection
    console.log("📦 Initializing database connection...");
    console.log(`📡 Host: ${getDatabaseHost()}:${getDatabasePort()}`);
    console.log(`🗄️  Database: ${process.env.DB_NAME || "doanhoi"}`);
    await AppDataSource.initialize();
    console.log("✅ Database connected successfully!\n");

    const roleRepository = AppDataSource.getRepository(Role);
    const permissionRepository = AppDataSource.getRepository(Permission);

    // Find super_admin role
    console.log("🔍 Finding super_admin role...");
    const superAdminRole = await roleRepository.findOne({
      where: { name: "super_admin" },
      relations: ["permissions"],
    });

    if (!superAdminRole) {
      console.error(
        "❌ super_admin role not found! Please run database seeding first.",
      );
      process.exit(1);
    }

    console.log(
      `✅ Found super_admin role with ${superAdminRole.permissions.length} current permissions\n`,
    );

    // Get all permissions defined in super_admin seed
    const superAdminPermissionCodes = [
      "dashboard.access",
      "users.access",
      "users.create",
      "users.view_details",
      "users.update",
      "users.delete",
      "users.export",
      "organizations.access",
      "organizations.create",
      "organizations.view_member_count",
      "organizations.access_children",
      "organizations.update",
      "organizations.delete",
      "organizations.add_member",
      "organizations.remove_member",
      "departments.access",
      "departments.create",
      "departments.view_details",
      "departments.update",
      "departments.delete",
      "classes.access",
      "classes.create",
      "classes.view_details",
      "classes.update",
      "classes.delete",
      "permissions.access",
      "permissions.create",
      "permissions.update",
      "permissions.delete",
      "permissions.view_details",
      "system-config.access", // System config permission
      // CTXH permissions
      "ctxh.access",
      "ctxh.categories.view",
      "ctxh.categories.create",
      "ctxh.categories.update",
      "ctxh.categories.delete",
      "ctxh.activities.view",
      "ctxh.activities.create",
      "ctxh.activities.update",
      "ctxh.activities.delete",
      "ctxh.activities.manage_participants",
      "ctxh.reports.export",
      "ctxh.config.manage",
      "ctxh.import.old_system", // CTXH import from old system
      // Payment permissions
      "payment-campaigns.access",
      "payment-campaigns.create",
      "payment-campaigns.read",
      "payment-campaigns.update",
      "payment-campaigns.delete",
      "payment-campaigns.manage_assignments",
      "payment-campaigns.view_reports",
      "payment-campaigns.export",
      "my-payments.access",
    ];

    console.log(
      `🔄 Fetching ${superAdminPermissionCodes.length} permissions from database...\n`,
    );

    // Get all permissions from database
    const permissions = await permissionRepository.find({
      where: superAdminPermissionCodes.map((code) => ({ code })),
    });

    console.log(`✅ Found ${permissions.length} permissions in database\n`);

    // Check for missing permissions
    const foundCodes = permissions.map((p) => p.code);
    const missingCodes = superAdminPermissionCodes.filter(
      (code) => !foundCodes.includes(code),
    );

    if (missingCodes.length > 0) {
      console.warn(
        "⚠️  Warning: The following permissions are not found in database:",
      );
      missingCodes.forEach((code) => console.warn(`   - ${code}`));
      console.warn("\n💡 You may need to run: npm run update-permissions\n");
    }

    // Update super_admin role with all permissions
    superAdminRole.permissions = permissions;
    await roleRepository.save(superAdminRole);

    console.log("✅ super_admin role updated successfully!");
    console.log(`📊 Total permissions assigned: ${permissions.length}`);

    // Show newly added permissions
    const currentCodes = superAdminRole.permissions.map((p) => p.code);
    const newlyAdded = permissions.filter(
      (p) => !currentCodes.includes(p.code),
    );

    if (newlyAdded.length > 0) {
      console.log("\n🆕 Newly added permissions:");
      newlyAdded.forEach((p) => console.log(`   ✓ ${p.code} - ${p.name}`));
    } else {
      console.log("\n📋 No new permissions added (already up to date)");
    }

    console.log("\n✅ Update completed successfully!\n");

    process.exit(0);
  } catch (error) {
    console.error("❌ Error updating super_admin role:", error);
    process.exit(1);
  }
}

// Run the update
updateSuperAdminRole();
