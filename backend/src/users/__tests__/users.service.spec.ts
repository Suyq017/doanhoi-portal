import { beforeEach, describe, expect, it, jest } from "@jest/globals";
import { AuthProvider } from "../../entities/user.entity";
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

  it("should continue user creation when organization assignment fails", async () => {
    usersRepository.findOne.mockResolvedValue(null);
    usersRepository.save.mockImplementation(async (value: any) => ({ ...value, id: "user-1" }));
    const bcrypt = require("bcryptjs");
    jest.spyOn(bcrypt, "hash").mockResolvedValue("hashed-password" as any);
    jest.spyOn(console, "warn").mockImplementation(() => undefined);
    organizationsService.addMemberWithParents.mockRejectedValue(new Error("org add failed"));

    const result = await service.create({
      email: "warn@example.com",
      code: "SV008",
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

  it("should keep user creation successful when roleAssignments is an empty array", async () => {
    const bcrypt = require("bcryptjs");
    jest.spyOn(bcrypt, "hash").mockResolvedValue("hashed-password" as any);
    usersRepository.findOne.mockResolvedValue(null);
    usersRepository.save.mockImplementation(async (value: any) => ({ ...value, id: "user-empty-roles" }));

    const result = await service.create({
      email: "empty-roles@example.com",
      code: "SV009",
      password: "secret",
      roleAssignments: [],
    } as any);

    expect(result.id).toBe("user-empty-roles");
    expect(rolesService.assignUserRole).not.toHaveBeenCalled();
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

  it("should find users without optional filters", async () => {
    const queryBuilder = {
      leftJoinAndSelect: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      skip: jest.fn().mockReturnThis(),
      take: jest.fn().mockReturnThis(),
      getManyAndCount: jest.fn(async () => [[{ id: "user-1" }], 1] as any),
    } as any;
    usersRepository.createQueryBuilder.mockReturnValue(queryBuilder);

    const result = await service.findAll({ page: 1, limit: 10 } as any);

    expect(queryBuilder.andWhere).not.toHaveBeenCalled();
    expect(queryBuilder.skip).toHaveBeenCalledWith(0);
    expect(queryBuilder.take).toHaveBeenCalledWith(10);
    expect(result.users).toEqual([{ id: "user-1" }]);
  });

  it("should find user by email and return null when not found", async () => {
    usersRepository.findOne.mockResolvedValueOnce({ id: "user-email", email: "found@example.com" });
    await expect(service.findByEmail("found@example.com")).resolves.toEqual(expect.objectContaining({ id: "user-email" }));

    usersRepository.findOne.mockResolvedValueOnce(null);
    await expect(service.findByEmail("missing@example.com")).resolves.toBeNull();
  });

  it("should throw when user is missing and update auth helpers", async () => {
    usersRepository.findOne.mockResolvedValueOnce(null);

    await expect(service.findOne("missing")).rejects.toThrow("User not found");

    jest.spyOn(require("bcryptjs"), "compare").mockResolvedValue(false as any);
    await expect(service.validatePassword({ password: null } as any, "secret")).resolves.toBe(false);

    await service.updateRefreshToken("user-1", null);
    await service.updateGoogleId("user-1", "google-1");

    expect(usersRepository.update).toHaveBeenCalledWith("user-1", expect.objectContaining({ refreshToken: null }));
    expect(usersRepository.update).toHaveBeenCalledWith("user-1", expect.objectContaining({ googleId: "google-1", authProvider: AuthProvider.GOOGLE }));
  });

  it("should reject removeMultiple when ids are missing", async () => {
    await expect(service.removeMultiple([])).rejects.toThrow("No user IDs provided");
  });

  it("should remove multiple users when all ids exist", async () => {
    usersRepository.find.mockResolvedValue([{ id: "u-1" }, { id: "u-2" }]);

    await service.removeMultiple(["u-1", "u-2"]);

    expect(usersRepository.remove).toHaveBeenCalledWith([{ id: "u-1" }, { id: "u-2" }]);
  });

  it("should create a user with generated default password when password is missing", async () => {
    usersRepository.findOne.mockResolvedValue(null);
    usersRepository.save.mockImplementation(async (value: any) => ({ ...value, id: "user-3" }));
    const bcrypt = require("bcryptjs");
    jest.spyOn(bcrypt, "hash").mockResolvedValue("hashed-generated" as any);

    const result = await service.create({
      email: "nguyen.van.a@example.com",
      code: "SV003",
    } as any);

    expect(result.id).toBe("user-3");
    expect(usersRepository.save).toHaveBeenCalledWith(expect.objectContaining({ password: "hashed-generated" }));
  });

  it("should skip organization assignment when organizationId is blank", async () => {
    usersRepository.findOne.mockResolvedValue(null);
    usersRepository.save.mockImplementation(async (value: any) => ({ ...value, id: "user-4" }));
    const bcrypt = require("bcryptjs");
    jest.spyOn(bcrypt, "hash").mockResolvedValue("hashed-password" as any);

    await service.create({
      email: "blank-org@example.com",
      code: "SV004",
      password: "secret",
      organizationId: "   ",
    } as any);

    expect(organizationsService.addMemberWithParents).not.toHaveBeenCalled();
  });

  it("should throw when duplicate user email or code exists", async () => {
    usersRepository.findOne.mockResolvedValue({ id: "existing" });

    await expect(
      service.create({ email: "dup@example.com", code: "SV005" } as any),
    ).rejects.toThrow("User with this email or code already exists");
  });

  it("should update user with class and department assignments", async () => {
    usersRepository.findOne.mockResolvedValue({ id: "user-5" });
    usersRepository.save.mockResolvedValue({ id: "user-5", name: "Updated" });

    await service.update("user-5", {
      name: "Updated",
      classId: "class-1",
      managementDepartmentId: "mgmt-1",
      trainingDepartmentId: "train-1",
    } as any);

    expect(usersRepository.save).toHaveBeenCalledWith(expect.objectContaining({ name: "Updated" }));
    expect(rolesService.removeAllUserRoles).not.toHaveBeenCalled();
  });

  it("should clear class and department relations when blank ids are provided", async () => {
    usersRepository.findOne.mockResolvedValue({ id: "user-clear" });
    usersRepository.save.mockResolvedValue({ id: "user-clear" });

    await service.update("user-clear", {
      classId: "",
      managementDepartmentId: " ",
      trainingDepartmentId: "",
    } as any);

    expect(usersRepository.save).toHaveBeenCalledWith(expect.objectContaining({}));
    expect(rolesService.removeAllUserRoles).not.toHaveBeenCalled();
  });

  it("should remove all roles when update receives an empty roles array", async () => {
    usersRepository.findOne.mockResolvedValue({ id: "user-empty-role-update" });
    usersRepository.save.mockResolvedValue({ id: "user-empty-role-update" });

    await service.update("user-empty-role-update", {
      roles: [],
      organizationId: "org-1",
    } as any);

    expect(rolesService.removeAllUserRoles).toHaveBeenCalledWith("user-empty-role-update");
    expect(rolesService.assignUserRole).not.toHaveBeenCalled();
  });

  it("should update user with multiple roles and remove existing assignments", async () => {
    usersRepository.findOne.mockResolvedValue({ id: "user-6" });
    usersRepository.save.mockResolvedValue({ id: "user-6" });

    await service.update("user-6", {
      roles: ["role-1", "role-2"],
      organizationId: "org-1",
    } as any);

    expect(rolesService.removeAllUserRoles).toHaveBeenCalledWith("user-6");
    expect(rolesService.assignUserRole).toHaveBeenCalledWith("user-6", "role-1", "org-1");
    expect(rolesService.assignUserRole).toHaveBeenCalledWith("user-6", "role-2", "org-1");
  });

  it("should remove multiple users when ids are missing from repository", async () => {
    usersRepository.find.mockResolvedValue([{ id: "u-1" }]);

    await expect(service.removeMultiple(["u-1", "u-2"])).rejects.toThrow("Users not found: u-2");
  });

  it("should return email based password status list", async () => {
    const bcrypt = require("bcryptjs");
    jest.spyOn(bcrypt, "compare").mockResolvedValueOnce(true as any).mockResolvedValueOnce(false as any);
    usersRepository.find.mockResolvedValue([
      { id: "u-1", familyName: "A", givenName: "B", email: "ab@example.com", password: "hash1" },
      { id: "u-2", familyName: "C", givenName: "D", email: "cd@example.com", password: "hash2" },
    ]);

    const result = await service.getUsersWithDefaultPassword();

    expect(result.totalUsersWithEmailBasedPassword).toBe(1);
    expect(result.users[0].hasEmailBasedPassword).toBe(true);
    expect(result.users[1].hasEmailBasedPassword).toBe(false);
  });

  it("should return null for blank exact code", async () => {
    await expect(service.findByExactCode("   ")).resolves.toBeNull();
  });

  it("should find user by exact code with trimmed value", async () => {
    const queryBuilder = {
      leftJoinAndSelect: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      getOne: jest.fn(async () => ({ id: "u-1", code: "SV001" })),
    } as any;
    usersRepository.createQueryBuilder.mockReturnValue(queryBuilder);

    const result = await service.findByExactCode(" SV001 ");

    expect(result?.id).toBe("u-1");
    expect(queryBuilder.where).toHaveBeenCalledWith("user.code = :code", { code: "SV001" });
  });

  it("should reject duplicate role assignments during create", async () => {
    usersRepository.findOne.mockResolvedValue(null);
    const bcrypt = require("bcryptjs");
    jest.spyOn(bcrypt, "hash").mockResolvedValue("hashed-password" as any);
    usersRepository.save.mockResolvedValue({ id: "user-dup" });

    await expect(
      service.create({
        email: "dup-role@example.com",
        code: "SV006",
        password: "secret",
        roleAssignments: [
          { roleId: "role-1", organizationId: "org-1" },
          { roleId: "role-1", organizationId: "org-1" },
        ],
      } as any),
    ).rejects.toThrow("Duplicate role-organization assignments found");
  });

  it("should reject missing role during create roleAssignments validation", async () => {
    usersRepository.findOne.mockResolvedValue(null);
    const bcrypt = require("bcryptjs");
    jest.spyOn(bcrypt, "hash").mockResolvedValue("hashed-password" as any);
    usersRepository.save.mockResolvedValue({ id: "user-role-missing" });
    rolesService.findOne.mockRejectedValue(new Error("not found"));

    await expect(
      service.create({
        email: "missing-role@example.com",
        code: "SV007",
        password: "secret",
        roleAssignments: [{ roleId: "role-x", organizationId: "org-1" }],
      } as any),
    ).rejects.toThrow("Role with ID role-x not found");
  });

  it("should update user with single role fallback and clear existing roles", async () => {
    usersRepository.findOne.mockResolvedValue({ id: "user-7" });
    usersRepository.save.mockResolvedValue({ id: "user-7" });

    await service.update("user-7", {
      roleId: "role-1",
      organizationId: "org-1",
    } as any);

    expect(rolesService.removeAllUserRoles).toHaveBeenCalledWith("user-7");
    expect(rolesService.assignUserRole).toHaveBeenCalledWith("user-7", "role-1", "org-1");
  });

  it("should keep existing roles when update has no role fields", async () => {
    usersRepository.findOne.mockResolvedValue({ id: "user-8" });
    usersRepository.save.mockResolvedValue({ id: "user-8" });

    await service.update("user-8", { name: "No Roles" } as any);

    expect(rolesService.removeAllUserRoles).not.toHaveBeenCalled();
    expect(rolesService.assignUserRole).not.toHaveBeenCalled();
  });

  it("should return null for exact code lookup when repository returns no user", async () => {
    const queryBuilder = {
      leftJoinAndSelect: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      getOne: jest.fn(async () => null),
    } as any;
    usersRepository.createQueryBuilder.mockReturnValue(queryBuilder);

    const result = await service.findByExactCode("SV404");

    expect(result).toBeNull();
  });

  it("should return false when password is missing", async () => {
    await expect(service.validatePassword({ password: null } as any, "secret")).resolves.toBe(false);
  });

  it("should set lastLogin when updating refresh token with non-null value", async () => {
    await service.updateRefreshToken("user-1", "new-token");

    expect(usersRepository.update).toHaveBeenCalledWith(
      "user-1",
      expect.objectContaining({
        refreshToken: "new-token",
        lastLogin: expect.any(Date),
      }),
    );
  });

  it("should not set lastLogin when updating refresh token with null value", async () => {
    await service.updateRefreshToken("user-1", null);

    expect(usersRepository.update).toHaveBeenCalledWith(
      "user-1",
      expect.objectContaining({
        refreshToken: null,
        lastLogin: undefined,
      }),
    );
  });

  it("should find user by email with all relations loaded", async () => {
    const mockUser = { id: "u-1", email: "test@example.com" };
    usersRepository.findOne.mockResolvedValue(mockUser);

    const result = await service.findByEmail("test@example.com");

    expect(result).toEqual(mockUser);
    expect(usersRepository.findOne).toHaveBeenCalledWith({
      where: { email: "test@example.com" },
      relations: expect.arrayContaining([
        "managementDepartment",
        "userRoles",
        "organizations",
      ]),
    });
  });

  it("should handle birthDate conversion during user creation", async () => {
    usersRepository.findOne.mockResolvedValue(null);
    usersRepository.save.mockImplementation(async (value: any) => ({ ...value, id: "user-birthdate" }));
    const bcrypt = require("bcryptjs");
    jest.spyOn(bcrypt, "hash").mockResolvedValue("hashed" as any);

    await service.create({
      email: "birth@example.com",
      code: "SV010",
      birthDate: "1990-05-15",
    } as any);

    expect(usersRepository.save).toHaveBeenCalledWith(
      expect.objectContaining({
        birthDate: expect.any(Date),
      }),
    );
  });

  it("should not set birthDate when not provided during creation", async () => {
    usersRepository.findOne.mockResolvedValue(null);
    usersRepository.save.mockImplementation(async (value: any) => ({ ...value, id: "user-no-birthdate" }));
    const bcrypt = require("bcryptjs");
    jest.spyOn(bcrypt, "hash").mockResolvedValue("hashed" as any);

    await service.create({
      email: "nobirth@example.com",
      code: "SV011",
    } as any);

    expect(usersRepository.save).toHaveBeenCalledWith(
      expect.objectContaining({
        birthDate: undefined,
      }),
    );
  });

  it("should call remove when given a single user id", async () => {
    usersRepository.find.mockResolvedValue([{ id: "u-1" }]);

    await service.removeMultiple(["u-1"]);

    expect(usersRepository.remove).toHaveBeenCalledWith([{ id: "u-1" }]);
  });

  it("should skip blank role ids during legacy role assignment in create", async () => {
    usersRepository.findOne.mockResolvedValue(null);
    usersRepository.save.mockImplementation(async (value: any) => ({ ...value, id: "user-blank-roles" }));
    const bcrypt = require("bcryptjs");
    jest.spyOn(bcrypt, "hash").mockResolvedValue("hashed" as any);

    await service.create({
      email: "blank-roles@example.com",
      code: "SV012",
      password: "secret",
      roles: ["role-1", "", "  ", "role-2"],
      organizationId: "org-1",
    } as any);

    expect(rolesService.assignUserRole).toHaveBeenCalledTimes(2);
    expect(rolesService.assignUserRole).toHaveBeenCalledWith("user-blank-roles", "role-1", "org-1");
    expect(rolesService.assignUserRole).toHaveBeenCalledWith("user-blank-roles", "role-2", "org-1");
  });

  it("should allow update with basic fields without role changes", async () => {
    usersRepository.findOne.mockResolvedValue({ id: "user-update-basic" });
    usersRepository.save.mockResolvedValue({ id: "user-update-basic" });

    await service.update("user-update-basic", {
      email: "updated@example.com",
      birthDate: "1995-12-25",
    } as any);

    expect(usersRepository.save).toHaveBeenCalledWith(
      expect.objectContaining({
        email: "updated@example.com",
        birthDate: "1995-12-25",
      }),
    );
    expect(rolesService.removeAllUserRoles).not.toHaveBeenCalled();
  });

  it("should return null when findOne throws NotFoundException", async () => {
    usersRepository.findOne.mockResolvedValue(null);

    await expect(service.findOne("missing")).rejects.toThrow("User not found");
  });
});