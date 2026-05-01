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

    // Production environment detection
    if (process.env.NODE_ENV === "production") {
        return "doanhoi-postgres-prod";
    }

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
        const port = parseInt(envPort);
        if (envPort === "2679" || process.env.NODE_ENV === "production") {
            return 5432;
        }
        return port;
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
 * Script to verify super_admin role permissions
 * Lists all permissions assigned to super_admin role
 *
 * Usage: npm run verify:super-admin
 */
async function verifySuperAdminPermissions() {
    console.log("🔍 Verifying super_admin role permissions...\n");

    try {
        // Initialize database connection
        console.log("📦 Connecting to database...");
        console.log(`📡 Host: ${getDatabaseHost()}:${getDatabasePort()}`);
        console.log(`🗄️  Database: ${process.env.DB_NAME || "doanhoi"}`);
        await AppDataSource.initialize();
        console.log("✅ Connected successfully!\n");

        const roleRepository = AppDataSource.getRepository(Role);
        const _permissionRepository = AppDataSource.getRepository(Permission);

        // Find super_admin role
        console.log("🔍 Finding super_admin role...");
        const superAdminRole = await roleRepository.findOne({
            where: { name: "Super Admin" },
            relations: ["permissions"],
        });

        if (!superAdminRole) {
            console.error("❌ super_admin role not found!");
            process.exit(1);
        }

        console.log(`✅ Found: ${superAdminRole.name}`);
        console.log(`📝 Description: ${superAdminRole.description}`);
        console.log(`📊 Total permissions: ${superAdminRole.permissions.length}\n`);

        // Expected permissions (should match roles.seed.ts)
        const expectedPermissions = [
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
            "system-config.access",
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
            "ctxh.import.old_system",
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

        // Group permissions by category
        const permissionsByCategory: { [key: string]: Permission[] } = {};
        superAdminRole.permissions.forEach((p) => {
            if (!permissionsByCategory[p.category]) {
                permissionsByCategory[p.category] = [];
            }
            permissionsByCategory[p.category].push(p);
        });

        // Display permissions by category
        console.log("📋 Permissions by Category:\n");
        Object.keys(permissionsByCategory)
            .sort()
            .forEach((category) => {
                console.log(`\n📁 ${category.toUpperCase()}`);
                console.log("   " + "─".repeat(50));
                permissionsByCategory[category]
                    .sort((a, b) => a.sortOrder - b.sortOrder)
                    .forEach((p) => {
                        console.log(`   ✓ ${p.code.padEnd(40)} ${p.name}`);
                    });
            });

        // Check for missing permissions
        const actualCodes = superAdminRole.permissions.map((p) => p.code);
        const missingPermissions = expectedPermissions.filter(
            (code) => !actualCodes.includes(code),
        );

        console.log("\n\n" + "═".repeat(80));
        console.log("📊 VERIFICATION SUMMARY");
        console.log("═".repeat(80));

        if (missingPermissions.length > 0) {
            console.log("\n⚠️  MISSING PERMISSIONS:");
            missingPermissions.forEach((code) => {
                console.log(`   ❌ ${code}`);
            });
            console.log("\n💡 Fix: Run the following commands:");
            console.log("   npm run update:permissions");
            console.log("   npm run update:super-admin");
        } else {
            console.log("\n✅ ALL EXPECTED PERMISSIONS ARE PRESENT!");
        }

        // Check for extra permissions (not in expected list)
        const extraPermissions = actualCodes.filter(
            (code) => !expectedPermissions.includes(code),
        );
        if (extraPermissions.length > 0) {
            console.log("\n📌 EXTRA PERMISSIONS (not in expected list):");
            extraPermissions.forEach((code) => {
                console.log(`   + ${code}`);
            });
        }

        console.log("\n" + "═".repeat(80));
        console.log(`\n✅ Verification complete!`);
        console.log(`   Expected: ${expectedPermissions.length} permissions`);
        console.log(`   Actual: ${actualCodes.length} permissions`);
        console.log(`   Missing: ${missingPermissions.length}`);
        console.log(`   Extra: ${extraPermissions.length}\n`);

        process.exit(missingPermissions.length > 0 ? 1 : 0);
    } catch (error) {
        console.error("❌ Error verifying permissions:", error);
        process.exit(1);
    }
}

// Run verification
verifySuperAdminPermissions();
