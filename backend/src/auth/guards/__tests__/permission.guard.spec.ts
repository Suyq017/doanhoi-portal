import { describe, expect, it, jest, beforeEach } from "@jest/globals";
import { ForbiddenException } from "@nestjs/common";
import { PermissionGuard } from "../permission.guard";

describe("PermissionGuard", () => {
  const reflector = {
    getAllAndOverride: jest.fn(),
  } as any;
  const rolesService = {
    hasPermission: jest.fn(),
  } as any;

  let guard: PermissionGuard;

  beforeEach(() => {
    jest.clearAllMocks();
    reflector.getAllAndOverride.mockReturnValue(undefined);
    guard = new PermissionGuard(reflector, rolesService);
  });

  it("should allow access when no permissions are required", async () => {
    const context = {
      getHandler: () => ({}),
      getClass: () => ({}),
      switchToHttp: () => ({ getRequest: () => ({}) }),
    } as any;
    await expect(guard.canActivate(context)).resolves.toBe(true);
  });

  it("should reject unauthenticated users", async () => {
    reflector.getAllAndOverride.mockReturnValue(["dashboard.access"]);
    const context = {
      getHandler: () => ({}),
      getClass: () => ({}),
      switchToHttp: () => ({ getRequest: () => ({ params: {}, body: {} }) }),
    } as any;

    await expect(guard.canActivate(context)).rejects.toBeInstanceOf(ForbiddenException);
  });

  it("should allow when at least one permission matches and pass organization id from params", async () => {
    reflector.getAllAndOverride.mockReturnValue(["perm.a", "perm.b"]);
    rolesService.hasPermission
      .mockResolvedValueOnce(false)
      .mockResolvedValueOnce(true);

    const context = {
      getHandler: () => ({}),
      getClass: () => ({}),
      switchToHttp: () => ({
        getRequest: () => ({ user: { id: "u1" }, params: { organizationId: "org-1" }, body: {} }),
      }),
    } as any;

    await expect(guard.canActivate(context)).resolves.toBe(true);
    expect(rolesService.hasPermission).toHaveBeenNthCalledWith(1, "u1", "perm.a", "org-1");
    expect(rolesService.hasPermission).toHaveBeenNthCalledWith(2, "u1", "perm.b", "org-1");
  });

  it("should use body organization id and reject when no permissions match", async () => {
    reflector.getAllAndOverride.mockReturnValue(["perm.a", "perm.b"]);
    rolesService.hasPermission.mockResolvedValue(false);

    const context = {
      getHandler: () => ({}),
      getClass: () => ({}),
      switchToHttp: () => ({
        getRequest: () => ({ user: { id: "u1" }, params: {}, body: { organizationId: "org-2" } }),
      }),
    } as any;

    await expect(guard.canActivate(context)).rejects.toThrow("Permission denied");
    expect(rolesService.hasPermission).toHaveBeenCalledWith("u1", "perm.a", "org-2");
  });

  it("should not throw when body is missing on GET requests", async () => {
    reflector.getAllAndOverride.mockReturnValue(["perm.a"]);
    rolesService.hasPermission.mockResolvedValue(false);

    const context = {
      getHandler: () => ({}),
      getClass: () => ({}),
      switchToHttp: () => ({
        getRequest: () => ({ user: { id: "u1" }, method: "GET", params: {} }),
      }),
    } as any;

    await expect(guard.canActivate(context)).rejects.toThrow("Permission denied");
    expect(rolesService.hasPermission).toHaveBeenCalledWith("u1", "perm.a", undefined);
  });
});
