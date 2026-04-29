import { describe, expect, it, jest, beforeEach } from "@jest/globals";
import { UnauthorizedException } from "@nestjs/common";
import { LocalStrategy } from "../local.strategy";

describe("LocalStrategy", () => {
  const authService = {
    validateUser: jest.fn(),
  } as any;

  let strategy: LocalStrategy;

  beforeEach(() => {
    jest.clearAllMocks();
    strategy = new LocalStrategy(authService);
  });

  it("should return a validated user", async () => {
    authService.validateUser.mockResolvedValueOnce({ id: "u1", email: "user@example.com" });

    await expect(strategy.validate("user@example.com", "password")).resolves.toEqual({
      id: "u1",
      email: "user@example.com",
    });
    expect(authService.validateUser).toHaveBeenCalledWith("user@example.com", "password");
  });

  it("should reject invalid credentials", async () => {
    authService.validateUser.mockResolvedValueOnce(null);

    await expect(strategy.validate("user@example.com", "bad")).rejects.toBeInstanceOf(UnauthorizedException);
  });
});
