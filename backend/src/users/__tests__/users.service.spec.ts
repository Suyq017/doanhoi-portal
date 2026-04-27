import { beforeEach, describe, expect, it, jest } from "@jest/globals";
import { UsersService } from "../users.service";

describe("UsersService", () => {
  const createUsersRepositoryMock = () => ({
    findOne: jest.fn() as any,
    create: jest.fn((value) => value) as any,
    save: jest.fn(async (value) => value) as any,
    remove: jest.fn() as any,
    update: jest.fn() as any,
    find: jest.fn() as any,
    createQueryBuilder: jest.fn() as any,
  });

  const createRolesServiceMock = () => ({
    assignUserRole: jest.fn() as any,
    removeAllUserRoles: jest.fn() as any,
    findOne: jest.fn() as any,
  });

  const createOrganizationsServiceMock = () => ({
    addMemberWithParents: jest.fn() as any,
  });

  let usersRepository: ReturnType<typeof createUsersRepositoryMock>;
  let rolesService: ReturnType<typeof createRolesServiceMock>;
  let organizationsService: ReturnType<typeof createOrganizationsServiceMock>;
  let service: UsersService;

  beforeEach(() => {
    usersRepository = createUsersRepositoryMock();
    rolesService = createRolesServiceMock();
    organizationsService = createOrganizationsServiceMock();
    service = new UsersService(usersRepository as never, rolesService as never, organizationsService as never);
  });

  it("should create a user with hashed password and organization membership", async () => {
    usersRepository.findOne.mockResolvedValue(null);
    const bcrypt = require("bcryptjs");
    jest.spyOn(bcrypt, "hash").mockResolvedValue("hashed-password" as any);
    usersRepository.save.mockImplementation(async (value: any) => ({ ...value, id: "user-1" }));

    const result = await service.create({
      email: "test@example.com",
      code: "SV001",
      password: "secret",
      organizationId: "org-1",
      roleId: "role-1",
    } as any);

    expect(result.id).toBe("user-1");
    expect(organizationsService.addMemberWithParents).toHaveBeenCalledWith("org-1", "user-1");
    expect(rolesService.assignUserRole).toHaveBeenCalledWith("user-1", "role-1", "org-1");
  });

  it("should validate password and update refresh token", async () => {
    const bcrypt = require("bcryptjs");
    jest.spyOn(bcrypt, "compare").mockResolvedValue(true as any);

    await expect(service.validatePassword({ password: "$2a$10$test" } as any, "secret")).resolves.toBe(true);
    await service.updateRefreshToken("user-1", "refresh-token");

    expect(usersRepository.update).toHaveBeenCalledWith("user-1", expect.objectContaining({ refreshToken: "refresh-token" }));
  });

  it("should create a user with role assignments", async () => {
    const bcrypt = require("bcryptjs");
    jest.spyOn(bcrypt, "hash").mockResolvedValue("hashed-password" as any);
    usersRepository.findOne.mockResolvedValue(null);
    usersRepository.save.mockImplementation(async (value: any) => ({ ...value, id: "user-2" }));
    rolesService.findOne.mockResolvedValue({ id: "role-1" });

    const result = await service.create({
      email: "assigned@example.com",
      code: "SV002",
      password: "secret",
      roleAssignments: [
        { roleId: "role-1", organizationId: "org-1" },
        { roleId: "role-2", organizationId: "" },
      ],
    } as any);

    expect(result.id).toBe("user-2");
    expect(rolesService.findOne).toHaveBeenCalledTimes(2);
    expect(rolesService.assignUserRole).toHaveBeenCalledWith("user-2", "role-1", "org-1");
    expect(rolesService.assignUserRole).toHaveBeenCalledWith("user-2", "role-2", undefined);
  });

  it("should find users with filters and pagination", async () => {
    const queryBuilder = {
      leftJoinAndSelect: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      skip: jest.fn().mockReturnThis(),
      take: jest.fn().mockReturnThis(),
      getManyAndCount: jest.fn(async () => [[{ id: "user-1" }], 1] as any),
    } as any;
    usersRepository.createQueryBuilder.mockReturnValue(queryBuilder);

    const result = await service.findAll({
      page: 2,
      limit: 5,
      search: "sv",
      userType: "student" as any,
      membershipStatus: "active" as any,
    } as any);

    expect(queryBuilder.andWhere).toHaveBeenCalledTimes(3);
    expect(queryBuilder.skip).toHaveBeenCalledWith(5);
    expect(queryBuilder.take).toHaveBeenCalledWith(5);
    expect(result.total).toBe(1);
  });

  it("should reject removeMultiple when ids are missing", async () => {
    await expect(service.removeMultiple([])).rejects.toThrow("No user IDs provided");
  });

  it("should remove multiple users when all ids exist", async () => {
    usersRepository.find.mockResolvedValue([{ id: "u-1" }, { id: "u-2" }]);

    await service.removeMultiple(["u-1", "u-2"]);

    expect(usersRepository.remove).toHaveBeenCalledWith([{ id: "u-1" }, { id: "u-2" }]);
  });
});