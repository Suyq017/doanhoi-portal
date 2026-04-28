import { beforeEach, describe, expect, it, jest } from "@jest/globals";
import { RolesService } from "../roles.service";

describe("RolesService", () => {
  const createRoleRepositoryMock = () => ({
    createQueryBuilder: jest.fn() as any,
    findOne: jest.fn() as any,
    find: jest.fn() as any,
    create: jest.fn((value) => value) as any,
    save: jest.fn(async (value) => value) as any,
    remove: jest.fn() as any,
  });

  const createPermissionRepositoryMock = () => ({
    find: jest.fn() as any,
    create: jest.fn((value) => value) as any,
    save: jest.fn(async (value) => value) as any,
  });

  const createUserRoleRepositoryMock = () => ({
    count: jest.fn() as any,
    delete: jest.fn() as any,
    create: jest.fn((value) => value) as any,
    save: jest.fn(async (value) => value) as any,
    find: jest.fn() as any,
    createQueryBuilder: jest.fn() as any,
  });

  let roleRepository: ReturnType<typeof createRoleRepositoryMock>;
  let permissionRepository: ReturnType<typeof createPermissionRepositoryMock>;
  let userRoleRepository: ReturnType<typeof createUserRoleRepositoryMock>;
  let service: RolesService;

  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(console, "log").mockImplementation(() => undefined);
    roleRepository = createRoleRepositoryMock();
    permissionRepository = createPermissionRepositoryMock();
    userRoleRepository = createUserRoleRepositoryMock();
    service = new RolesService(roleRepository as never, permissionRepository as never, userRoleRepository as never);
  });

  it("should find roles with search and isActive filters", async () => {
    const queryBuilder = {
      leftJoinAndSelect: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      skip: jest.fn().mockReturnThis(),
      take: jest.fn().mockReturnThis(),
      getManyAndCount: jest.fn(async () => [[{ id: "r1" }], 3]),
    } as any;
    roleRepository.createQueryBuilder.mockReturnValue(queryBuilder);

    const result = await service.findAll({
      page: 2,
      limit: 2,
      search: "admin",
      isActive: true,
    } as never);

    expect(queryBuilder.andWhere).toHaveBeenCalledTimes(2);
    expect(queryBuilder.skip).toHaveBeenCalledWith(2);
    expect(queryBuilder.take).toHaveBeenCalledWith(2);
    expect(result.totalPages).toBe(2);
  });

  it("should find roles without optional filters", async () => {
    const queryBuilder = {
      leftJoinAndSelect: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      skip: jest.fn().mockReturnThis(),
      take: jest.fn().mockReturnThis(),
      getManyAndCount: jest.fn(async () => [[{ id: "r1" }], 1]),
    } as any;
    roleRepository.createQueryBuilder.mockReturnValue(queryBuilder);

    const result = await service.findAll({ page: 1, limit: 10 } as never);

    expect(queryBuilder.andWhere).not.toHaveBeenCalled();
    expect(result.data).toEqual([{ id: "r1" }]);
  });

  it("should throw when role is not found", async () => {
    roleRepository.findOne.mockResolvedValue(null);

    await expect(service.findOne("missing")).rejects.toThrow("Role not found");
  });

  it("should create a role when permissions are valid", async () => {
    roleRepository.findOne.mockResolvedValue(null);
    permissionRepository.find.mockResolvedValue([{ id: "p-1", isActive: true }] as any);
    roleRepository.save.mockImplementation(async (value: any) => ({ ...value, id: "role-1" }));

    const result = await service.create({
      name: "Editor",
      description: "Can edit",
      permissionIds: ["p-1"],
    } as never);

    expect(result.id).toBe("role-1");
    expect(result.permissions).toEqual([{ id: "p-1", isActive: true }]);
  });

  it("should reject creating duplicate role name", async () => {
    roleRepository.findOne.mockResolvedValue({ id: "existing" });

    await expect(
      service.create({ name: "Editor", description: "x", permissionIds: ["p1"] } as never),
    ).rejects.toThrow("Role name already exists");
  });

  it("should reject creating role with invalid permissions", async () => {
    roleRepository.findOne.mockResolvedValue(null);
    permissionRepository.find.mockResolvedValue([{ id: "p1", isActive: true }]);

    await expect(
      service.create({ name: "Editor", description: "x", permissionIds: ["p1", "p2"] } as never),
    ).rejects.toThrow("Some permissions are invalid");
  });

  it("should reject updating system role", async () => {
    roleRepository.findOne.mockResolvedValue({ id: "r1", isSystemRole: true, permissions: [] });

    await expect(service.update("r1", { name: "x" } as never)).rejects.toThrow("Cannot modify system role");
  });

  it("should reject updating role when provided permissions are invalid", async () => {
    roleRepository.findOne.mockResolvedValue({ id: "r1", isSystemRole: false, permissions: [] });
    permissionRepository.find.mockResolvedValue([{ id: "p1", isActive: true }]);

    await expect(service.update("r1", { permissionIds: ["p1", "p2"] } as never)).rejects.toThrow(
      "Some permissions are invalid",
    );
  });

  it("should update role fields and permissions", async () => {
    roleRepository.findOne.mockResolvedValue({ id: "r1", isSystemRole: false, permissions: [], name: "old" });
    permissionRepository.find.mockResolvedValue([{ id: "p1", isActive: true }]);
    roleRepository.save.mockImplementation(async (value: any) => value);

    const result = await service.update("r1", { name: "new", permissionIds: ["p1"] } as never);

    expect(result.name).toBe("new");
    expect(result.permissions).toEqual([{ id: "p1", isActive: true }]);
  });

  it("should remove role and cascade delete user-role assignments", async () => {
    roleRepository.findOne.mockResolvedValue({ id: "r1", isSystemRole: false, name: "Role 1", permissions: [] });
    userRoleRepository.count.mockResolvedValue(2);

    const result = await service.remove("r1");

    expect(userRoleRepository.delete).toHaveBeenCalledWith({ roleId: "r1" });
    expect(roleRepository.remove).toHaveBeenCalled();
    expect(result.deletedUserRoleAssignments).toBe(2);
  });

  it("should reject deleting system role", async () => {
    roleRepository.findOne.mockResolvedValue({ id: "r1", isSystemRole: true, permissions: [] });

    await expect(service.remove("r1")).rejects.toThrow("Cannot delete system role");
  });

  it("should reject bulkDelete when IDs are empty", async () => {
    await expect(service.bulkDelete([])).rejects.toThrow("No role IDs provided");
  });

  it("should reject bulkDelete when some roles are missing", async () => {
    roleRepository.find.mockResolvedValue([{ id: "r1", name: "Role 1", isSystemRole: false }]);

    await expect(service.bulkDelete(["r1", "r2"])).rejects.toThrow("Some roles not found");
  });

  it("should reject bulkDelete when list contains system roles", async () => {
    roleRepository.find.mockResolvedValue([
      { id: "r1", name: "System", isSystemRole: true },
      { id: "r2", name: "Regular", isSystemRole: false },
    ]);

    await expect(service.bulkDelete(["r1", "r2"])).rejects.toThrow("Cannot delete system roles");
  });

  it("should bulk delete roles and aggregate removed assignments", async () => {
    roleRepository.find.mockResolvedValue([
      { id: "r1", name: "Role 1", isSystemRole: false },
      { id: "r2", name: "Role 2", isSystemRole: false },
    ]);
    userRoleRepository.count.mockResolvedValueOnce(1).mockResolvedValueOnce(0);

    const result = await service.bulkDelete(["r1", "r2"]);

    expect(userRoleRepository.delete).toHaveBeenCalledWith({ roleId: "r1" });
    expect(roleRepository.remove).toHaveBeenCalledWith([
      { id: "r1", name: "Role 1", isSystemRole: false },
      { id: "r2", name: "Role 2", isSystemRole: false },
    ]);
    expect(result.deletedRoles).toBe(2);
    expect(result.deletedUserRoleAssignments).toBe(1);
  });

  it("should return available permissions and active roles", async () => {
    permissionRepository.find.mockResolvedValue([{ id: "p1" }]);
    roleRepository.find.mockResolvedValue([{ id: "r1" }]);

    await expect(service.getAvailablePermissions()).resolves.toEqual([{ id: "p1" }]);
    await expect(service.getAllRoles()).resolves.toEqual([{ id: "r1" }]);
    expect(permissionRepository.find).toHaveBeenCalledWith({
      where: { isActive: true },
      order: { category: "ASC", sortOrder: "ASC" },
    });
    expect(roleRepository.find).toHaveBeenCalledWith({
      relations: ["permissions"],
      where: { isActive: true },
      order: { isSystemRole: "DESC", name: "ASC" },
    });
  });

  it("should get user roles with and without organization context", async () => {
    const queryBuilder = {
      leftJoinAndSelect: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      getMany: jest.fn(async () => [{ id: "ur1" }]),
    } as any;
    userRoleRepository.createQueryBuilder.mockReturnValue(queryBuilder);

    await expect(service.getUserRoles("user-1")).resolves.toEqual([{ id: "ur1" }]);
    await expect(service.getUserRoles("user-1", "org-1")).resolves.toEqual([{ id: "ur1" }]);
    expect(queryBuilder.andWhere).toHaveBeenCalledWith(
      "(ur.organizationId = :organizationId OR ur.organizationId IS NULL)",
      { organizationId: "org-1" },
    );
  });

  it("should assign role in organization and global context", async () => {
    userRoleRepository.save.mockImplementation(async (value: any) => ({ ...value, id: "ur1" }));

    const orgScoped = await service.assignUserRole("user-1", "role-1", "org-1");
    const globalScoped = await service.assignUserRole("user-1", "role-2");

    expect(userRoleRepository.delete).toHaveBeenCalledWith({ userId: "user-1", organizationId: "org-1" });
    expect(userRoleRepository.delete).toHaveBeenCalledWith({ userId: "user-1", organizationId: null });
    expect(orgScoped.organizationId).toBe("org-1");
    expect(globalScoped.organizationId).toBeNull();
  });

  it("should remove all user roles", async () => {
    userRoleRepository.find.mockResolvedValue([{ id: "ur1" }]);
    userRoleRepository.delete.mockResolvedValue({ affected: 1 });

    await expect(service.removeAllUserRoles("user-1")).resolves.toBeUndefined();
    expect(userRoleRepository.delete).toHaveBeenCalledWith({ userId: "user-1" });
  });

  it("should early-return seed methods when data already exists", async () => {
    roleRepository.find.mockResolvedValueOnce([{ id: "r1" }]);
    permissionRepository.find.mockResolvedValueOnce([{ id: "p1" }]);

    await expect(service.seedDefaultRoles()).resolves.toBeUndefined();
    await expect(service.seedDefaultPermissions()).resolves.toBeUndefined();
  });

  it("should determine permission membership from user roles", async () => {
    const queryBuilder = {
      leftJoinAndSelect: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      getMany: jest.fn(async () => [
        {
          role: {
            permissions: [{ code: "users.view", isActive: true }],
          },
        },
      ]),
    };
    userRoleRepository.createQueryBuilder.mockReturnValue(queryBuilder as never);

    await expect(service.hasPermission("user-1", "users.view")).resolves.toBe(true);
    await expect(service.hasPermission("user-1", "users.delete")).resolves.toBe(false);
  });

  it("should return false when user has no roles", async () => {
    const queryBuilder = {
      leftJoinAndSelect: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      getMany: jest.fn(async () => []),
    } as any;
    userRoleRepository.createQueryBuilder.mockReturnValue(queryBuilder as never);

    await expect(service.hasPermission("user-1", "users.view", "org-1")).resolves.toBe(false);
  });
});