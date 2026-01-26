import { MigrationInterface, QueryRunner } from "typeorm";

export class AddSystemConfigPermissionToSuperAdmin1762248000000
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    // 1. Insert the system-config.access permission if it doesn't exist
    await queryRunner.query(`
            INSERT INTO "permissions" ("code", "name", "description", "category", "context", "sort_order", "is_active", "created_at", "updated_at")
            VALUES ('system-config.access', 'Truy cập cấu hình hệ thống', 'Cho phép truy cập trang cấu hình hệ thống', 'system-config', 'system', 55, true, NOW(), NOW())
            ON CONFLICT ("code") DO NOTHING;
        `);

    // 2. Get the permission ID
    const permissionResult = await queryRunner.query(`
            SELECT "id" FROM "permissions" WHERE "code" = 'system-config.access';
        `);

    if (permissionResult.length === 0) {
      throw new Error(
        "Failed to create or find system-config.access permission",
      );
    }

    const permissionId = permissionResult[0].id;

    // 3. Get Super Admin role ID
    const roleResult = await queryRunner.query(`
            SELECT "id" FROM "roles" WHERE "name" = 'Super Admin';
        `);

    if (roleResult.length === 0) {
      console.log(
        "⚠️  Super Admin role not found, skipping permission assignment",
      );
      return;
    }

    const superAdminRoleId = roleResult[0].id;

    // 4. Add permission to Super Admin role if not already assigned
    await queryRunner.query(
      `
            INSERT INTO "role_permissions" ("role_id", "permission_id")
            VALUES ($1, $2)
            ON CONFLICT ("role_id", "permission_id") DO NOTHING;
        `,
      [superAdminRoleId, permissionId],
    );

    console.log(
      "✅ Successfully added system-config.access permission to Super Admin role",
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // 1. Get the permission ID
    const permissionResult = await queryRunner.query(`
            SELECT "id" FROM "permissions" WHERE "code" = 'system-config.access';
        `);

    if (permissionResult.length === 0) {
      console.log("⚠️  system-config.access permission not found");
      return;
    }

    const permissionId = permissionResult[0].id;

    // 2. Remove permission from all roles
    await queryRunner.query(
      `
            DELETE FROM "role_permissions" WHERE "permission_id" = $1;
        `,
      [permissionId],
    );

    // 3. Delete the permission
    await queryRunner.query(`
            DELETE FROM "permissions" WHERE "code" = 'system-config.access';
        `);

    console.log("✅ Successfully removed system-config.access permission");
  }
}
