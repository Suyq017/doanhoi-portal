import "reflect-metadata";
import { DataSource } from "typeorm";
import * as dotenv from "dotenv";
import { Role } from "../../entities/role.entity";
import { Permission } from "../../entities/permission.entity";
import { SUPER_ADMIN_PERMISSION_CODES } from "./update-super-admin-role";

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

        // Find super_admin role
        console.log("🔍 Finding super_admin role...");
        const superAdminRole = await roleRepository.findOne({
            where: { name: "super_admin" },
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
        const expectedPermissions = SUPER_ADMIN_PERMISSION_CODES;

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
