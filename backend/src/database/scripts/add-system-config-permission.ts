import { DataSource } from "typeorm";
import {
  Permission,
  PermissionContext,
} from "../../entities/permission.entity";
import { Role } from "../../entities/role.entity";
import * as dotenv from "dotenv";

// Load environment variables
dotenv.config();

const AppDataSource = new DataSource({
  type: "postgres",
  host: process.env.DB_HOST || "localhost",
  port: parseInt(process.env.DB_PORT || "5432"),
  username: process.env.DB_USERNAME || "postgres",
  password: process.env.DB_PASSWORD || "postgres",
  database: process.env.DB_DATABASE || "doanhoi",
  entities: [Permission, Role],
  synchronize: false,
  logging: true,
});

async function addSystemConfigPermission() {
  try {
    console.log("🔄 Connecting to database...");
    await AppDataSource.initialize();
    console.log("✅ Database connected!\n");

    const permissionRepository = AppDataSource.getRepository(Permission);
    const roleRepository = AppDataSource.getRepository(Role);

    // 1. Create or update permission
    console.log("📝 Creating/updating system-config.access permission...");
    let permission = await permissionRepository.findOne({
      where: { code: "system-config.access" },
    });

    if (!permission) {
      permission = permissionRepository.create({
        code: "system-config.access",
        name: "Truy cập cấu hình hệ thống",
        description: "Cho phép truy cập trang cấu hình hệ thống",
        category: "system-config",
        context: PermissionContext.SYSTEM,
        sortOrder: 55,
        isActive: true,
      });
      await permissionRepository.save(permission);
      console.log("✅ Created permission: system-config.access");
    } else {
      permission.name = "Truy cập cấu hình hệ thống";
      permission.description = "Cho phép truy cập trang cấu hình hệ thống";
      permission.category = "system-config";
      permission.sortOrder = 55;
      await permissionRepository.save(permission);
      console.log("✅ Updated permission: system-config.access");
    }

    // 2. Find Super Admin role
    console.log("\n🔍 Finding Super Admin role...");

    // First, let's check all available roles
    const allRoles = await roleRepository.find();
    console.log("📋 Available roles:", allRoles.map((r) => r.name).join(", "));

    const superAdminRole = await roleRepository.findOne({
      where: { name: "super_admin" },
      relations: ["permissions"],
    });

    if (!superAdminRole) {
      console.log(
        "⚠️  super_admin role not found! Available roles:",
        allRoles.map((r) => r.name).join(", "),
      );
      console.log("\n💡 Tip: Run seed command first: npm run seed");
      await AppDataSource.destroy();
      process.exit(1);
    }

    console.log("✅ Found super_admin role");

    // 3. Check if permission already assigned
    const hasPermission = superAdminRole.permissions.some(
      (p) => p.id === permission.id,
    );

    if (hasPermission) {
      console.log("ℹ️  Permission already assigned to Super Admin");
    } else {
      // 4. Add permission to Super Admin
      superAdminRole.permissions.push(permission);
      await roleRepository.save(superAdminRole);
      console.log(
        "✅ Added system-config.access permission to Super Admin role",
      );
    }

    console.log("\n🎉 Update completed successfully!");
    console.log(
      `📊 super_admin now has ${superAdminRole.permissions.length} permissions`,
    );

    await AppDataSource.destroy();
    console.log("\n👋 Database connection closed");
    process.exit(0);
  } catch (error) {
    console.error("❌ Error:", error);
    await AppDataSource.destroy();
    process.exit(1);
  }
}

addSystemConfigPermission();
