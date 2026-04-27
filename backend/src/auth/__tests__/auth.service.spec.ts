import { AuthService } from "../auth.service";

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
});