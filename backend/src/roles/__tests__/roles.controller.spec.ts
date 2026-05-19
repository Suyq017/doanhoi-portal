import { RolesController } from "../roles.controller";

describe("RolesController", () => {
  const rolesService = {
    findAll: jest.fn(),
    getAllRoles: jest.fn(),
    getAvailablePermissions: jest.fn(),
    findOne: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
    bulkDelete: jest.fn(),
    getUserRoles: jest.fn(),
    assignUserRole: jest.fn(),
    seedDefaultRoles: jest.fn(),
    grantRolesToUser: jest.fn(),
  };

  let controller: RolesController;

  beforeEach(() => {
    jest.clearAllMocks();
    controller = new RolesController(rolesService as never);
  });

  it("covers role CRUD and lookup endpoints", async () => {
    rolesService.findAll.mockResolvedValue({ data: [] });
    rolesService.getAllRoles.mockResolvedValue([{ id: "r1" }]);
    rolesService.getAvailablePermissions.mockResolvedValue([{ id: "p1" }]);
    rolesService.findOne.mockResolvedValue({ id: "r1" });
    rolesService.create.mockResolvedValue({ id: "r2" });
    rolesService.update.mockResolvedValue({ id: "r1", name: "Updated" });
    rolesService.remove.mockResolvedValue({ message: "Role deleted successfully" });
    rolesService.bulkDelete.mockResolvedValue({ deletedRoles: 2 });
    rolesService.getUserRoles.mockResolvedValue([{ role: { id: "r1" } }]);

    await expect(controller.getAllRoles({ page: 1 } as any)).resolves.toEqual({ data: [] });
    await expect(controller.getAvailableRoles()).resolves.toEqual([{ id: "r1" }]);
    await expect(controller.getAvailablePermissions()).resolves.toEqual([{ id: "p1" }]);
    await expect(controller.getRoleById("r1")).resolves.toEqual({ id: "r1" });
    await expect(controller.createRole({ name: "Editor" } as any)).resolves.toEqual({ id: "r2" });
    await expect(controller.updateRole("r1", { name: "Updated" } as any)).resolves.toEqual({ id: "r1", name: "Updated" });
    await expect(controller.deleteRole("r1")).resolves.toEqual({ message: "Role deleted successfully" });
    await expect(controller.bulkDeleteRoles({ ids: ["r1", "r2"] })).resolves.toEqual({ deletedRoles: 2 });
    await expect(controller.getUserRoles("u1", "org-1")).resolves.toEqual([{ role: { id: "r1" } }]);
  });

  it("covers assignment and seeding endpoints", async () => {
    rolesService.assignUserRole.mockResolvedValue({ id: "ur1" });
    rolesService.seedDefaultRoles.mockResolvedValue(undefined);
    rolesService.grantRolesToUser.mockResolvedValue({ granted: 2 });

    await expect(
      controller.assignUserRole({ userId: "u1", roleId: "r1", organizationId: "org-1" }),
    ).resolves.toEqual({ id: "ur1" });
    await expect(controller.seedDefaults()).resolves.toEqual({ message: "Default roles and permissions seeded successfully" });
    await expect(controller.grantRolesToUser({ userId: "u1", roleAssignments: [] } as any)).resolves.toEqual({ granted: 2 });
  });
});