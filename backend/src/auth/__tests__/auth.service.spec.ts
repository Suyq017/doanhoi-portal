import { AuthService } from "../auth.service";
import { UnauthorizedException } from "@nestjs/common";

describe("AuthService", () => {
  const createUsersServiceMock = () => ({
    findByEmail: jest.fn(),
    validatePassword: jest.fn(),
    updateRefreshToken: jest.fn(),
    updateGoogleId: jest.fn(),
  });

  const createRolesServiceMock = () => ({
    getUserRoles: jest.fn(),
  });

  const createJwtServiceMock = () => ({
    sign: jest.fn(),
    verify: jest.fn(),
  });

  const createConfigServiceMock = () => ({
    get: jest.fn((key: string, fallback: string) => fallback),
  });

  let usersService: ReturnType<typeof createUsersServiceMock>;
  let rolesService: ReturnType<typeof createRolesServiceMock>;
  let jwtService: ReturnType<typeof createJwtServiceMock>;
  let configService: ReturnType<typeof createConfigServiceMock>;
  let service: AuthService;

  beforeEach(() => {
    usersService = createUsersServiceMock();
    rolesService = createRolesServiceMock();
    jwtService = createJwtServiceMock();
    configService = createConfigServiceMock();
    service = new AuthService(usersService as never, rolesService as never, jwtService as never, configService as never);
  });

  it("should validate user credentials and strip sensitive fields", async () => {
    usersService.findByEmail.mockResolvedValue({
      id: "user-1",
      email: "test@example.com",
      isActive: true,
      password: "hashed",
      refreshToken: "rt",
      fullName: "Test User",
    });
    usersService.validatePassword.mockResolvedValue(true);

    const result = await service.validateUser("test@example.com", "secret");

    expect(result).toEqual(
      expect.objectContaining({
        id: "user-1",
        email: "test@example.com",
        fullName: "Test User",
      }),
    );
    expect(result.password).toBeUndefined();
    expect(result.refreshToken).toBeUndefined();
  });

  it("should return null when user is missing, inactive, or password invalid", async () => {
    usersService.findByEmail.mockResolvedValueOnce(null).mockResolvedValueOnce({ isActive: false }).mockResolvedValueOnce({ isActive: true });
    usersService.validatePassword.mockResolvedValueOnce(false);

    await expect(service.validateUser("missing@example.com", "x")).resolves.toBeNull();
    await expect(service.validateUser("inactive@example.com", "x")).resolves.toBeNull();
    await expect(service.validateUser("bad@example.com", "x")).resolves.toBeNull();
  });

  it("should issue access and refresh tokens on login", async () => {
    jwtService.sign
      .mockReturnValueOnce("access-token")
      .mockReturnValueOnce("refresh-token");

    const result = await service.login({
      id: "user-1",
      email: "test@example.com",
      fullName: "Test User",
    } as never);

    expect(usersService.updateRefreshToken).toHaveBeenCalledWith("user-1", "refresh-token");
    expect(result.accessToken).toBe("access-token");
    expect(result.refreshToken).toBe("refresh-token");
  });

  it("should refresh token and reject invalid refresh tokens", async () => {
    jwtService.verify.mockReturnValue({ email: "test@example.com" });
    usersService.findByEmail.mockResolvedValue({
      id: "user-1",
      email: "test@example.com",
      isActive: true,
      refreshToken: "rt",
    });
    jwtService.sign.mockReturnValue("new-access");

    await expect(service.refreshToken("rt")).resolves.toEqual({ accessToken: "new-access" });

    usersService.findByEmail.mockResolvedValue({
      id: "user-1",
      email: "test@example.com",
      isActive: true,
      refreshToken: "other",
    });
    await expect(service.refreshToken("rt")).rejects.toBeInstanceOf(UnauthorizedException);

    jwtService.verify.mockImplementation(() => {
      throw new Error("bad token");
    });
    await expect(service.refreshToken("bad")).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it("should logout by clearing refresh token", async () => {
    await service.logout("user-1");
    expect(usersService.updateRefreshToken).toHaveBeenCalledWith("user-1", null);
  });

  it("should handle google login existing and missing users", async () => {
    usersService.findByEmail.mockResolvedValueOnce({
      id: "user-1",
      email: "test@example.com",
      fullName: "Test User",
      authProvider: "LOCAL",
      googleId: null,
    });
    jest.spyOn(service, "login").mockResolvedValue({ accessToken: "a", refreshToken: "r", user: {} } as never);

    await service.googleLogin({ id: "google-1", emails: [{ value: "test@example.com" }], name: "Test" });
    expect(usersService.updateGoogleId).toHaveBeenCalledWith("user-1", "google-1");

    usersService.findByEmail.mockResolvedValueOnce(null);
    await expect(
      service.googleLogin({ id: "google-2", emails: [{ value: "missing@example.com" }], name: "Missing" }),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it("should return permissions grouped by role", async () => {
    rolesService.getUserRoles.mockResolvedValue([
      {
        organizationId: "org-1",
        role: {
          id: "role-1",
          name: "admin",
          permissions: [{ code: "users.view", isActive: true }, { code: "users.delete", isActive: false }],
        },
      },
    ]);

    const result = await service.getUserPermissions("user-1", "org-1");

    expect(result.roles).toEqual([
      expect.objectContaining({
        id: "role-1",
        name: "admin",
        permissions: [{ code: "users.view", isActive: true }],
      }),
    ]);
  });

  it("should return empty permissions when user has no roles", async () => {
    rolesService.getUserRoles.mockResolvedValue([]);

    const result = await service.getUserPermissions("user-1");

    expect(result.roles).toEqual([]);
    expect(result.organizationId).toBeUndefined();
  });
});