import { DataSource } from "typeorm";
import { Role } from "../../entities/role.entity";
import { Permission } from "../../entities/permission.entity";

export const seedRoles = async (dataSource: DataSource) => {
  const roleRepository = dataSource.getRepository(Role);
  const permissionRepository = dataSource.getRepository(Permission);

  // Define roles with their permissions
  const rolesData = [
    {
      name: "Super Admin",
      description: "Quyền cao nhất trong hệ thống",
      isSystemRole: true,
      permissionCodes: [
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
        "ctxh.reports.view",
        "ctxh.reports.export",
        "ctxh.config.manage",
        "ctxh.import.old_system",
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
      ],
    },
  ];

  for (const roleData of rolesData) {
    const existingRole = await roleRepository.findOne({
      where: { name: roleData.name },
      relations: ["permissions"],
    });

    if (!existingRole) {
      // Get permissions for this role
      const permissions = await permissionRepository.find({
        where: roleData.permissionCodes.map((code) => ({ code })),
      });

      const role = roleRepository.create({
        name: roleData.name,
        description: roleData.description,
        isSystemRole: roleData.isSystemRole,
        permissions: permissions,
      });

      await roleRepository.save(role);
      console.log(
        `Created role: ${roleData.name} with ${permissions.length} permissions`,
      );
    } else {
      console.log(`Role already exists: ${roleData.name}`);
    }
  }

  console.log("Roles seeding completed!");
};
