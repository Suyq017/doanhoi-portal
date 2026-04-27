import { describe, expect, it, jest } from "@jest/globals";
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
    roleRepository = createRoleRepositoryMock();
    permissionRepository = createPermissionRepositoryMock();
    userRoleRepository = createUserRoleRepositoryMock();
    service = new RolesService(roleRepository as never, permissionRepository as never, userRoleRepository as never);
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
});