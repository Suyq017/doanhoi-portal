import { AuthController } from "../auth.controller";

describe("AuthController", () => {
  const authService = {
    login: jest.fn(),
    refreshToken: jest.fn(),
    logout: jest.fn(),
    getUserPermissions: jest.fn(),
  };

  let controller: AuthController;

  beforeEach(() => {
    jest.clearAllMocks();
    controller = new AuthController(authService as never);
    process.env.FRONTEND_URL = "https://frontend.test";
  });

  it("logs in and returns auth payload", async () => {
    authService.login.mockResolvedValue({ accessToken: "access" });

    await expect(controller.login({ user: { id: "u1" } } as any)).resolves.toEqual({ accessToken: "access" });
    expect(authService.login).toHaveBeenCalledWith({ id: "u1" });
  });

  it("refreshes token and logs out user", async () => {
    authService.refreshToken.mockResolvedValue({ accessToken: "new-access" });
    authService.logout.mockResolvedValue(undefined);

    await expect(controller.refreshToken({ refreshToken: "refresh" } as any)).resolves.toEqual({ accessToken: "new-access" });
    await expect(controller.logout({ user: { id: "u1" } } as any)).resolves.toEqual({ message: "Logout successful" });
    expect(authService.refreshToken).toHaveBeenCalledWith("refresh");
    expect(authService.logout).toHaveBeenCalledWith("u1");
  });

  it("returns profile and permissions", async () => {
    authService.getUserPermissions.mockResolvedValue(["a", "b"]);

    await expect(controller.getProfile({ user: { id: "u1", email: "x@test.com" } } as any)).resolves.toEqual({ id: "u1", email: "x@test.com" });
    await expect(controller.getCurrentUserPermissions({ user: { id: "u1" } } as any, "org-1")).resolves.toEqual(["a", "b"]);
    await expect(controller.getUserPermissions({ user: { id: "u2" } } as any, undefined)).resolves.toEqual(["a", "b"]);
    expect(authService.getUserPermissions).toHaveBeenCalledWith("u1", "org-1");
    expect(authService.getUserPermissions).toHaveBeenCalledWith("u2", undefined);
  });

  it("covers google auth redirect branches", async () => {
    const res = { redirect: jest.fn() } as any;
    const errorSpy = jest.spyOn(console, "error").mockImplementation(() => undefined);

    await controller.googleAuthRedirect({} as any, res);
    expect(res.redirect).toHaveBeenLastCalledWith("https://frontend.test/auth/callback?error=no_user_data");

    await controller.googleAuthRedirect({ user: { error: "not found" } } as any, res);
    expect(res.redirect).toHaveBeenLastCalledWith("https://frontend.test/auth/callback?error=user_not_found");

    await controller.googleAuthRedirect({ user: { accessToken: "a" } } as any, res);
    expect(res.redirect).toHaveBeenLastCalledWith("https://frontend.test/auth/callback?error=missing_tokens");

    await controller.googleAuthRedirect({ user: { accessToken: "a", refreshToken: "r" } } as any, res);
    expect(res.redirect).toHaveBeenLastCalledWith("https://frontend.test/auth/callback?token=a&refresh_token=r");

    errorSpy.mockRestore();
  });

  it("exposes google auth entrypoint", async () => {
    await expect(controller.googleAuth()).resolves.toBeUndefined();
  });
});