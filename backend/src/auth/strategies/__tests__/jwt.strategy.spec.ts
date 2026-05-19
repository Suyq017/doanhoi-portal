import { describe, expect, it, jest, beforeEach } from "@jest/globals";
import { UnauthorizedException } from "@nestjs/common";
import { JwtStrategy } from "../jwt.strategy";

describe("JwtStrategy", () => {
  const configService = {
    get: jest.fn().mockReturnValue("jwt-secret"),
  } as any;
  const usersService = {
    findOne: jest.fn(),
    findByEmail: jest.fn(),
  } as any;

  let strategy: JwtStrategy;

  beforeEach(() => {
    jest.clearAllMocks();
    strategy = new JwtStrategy(configService, usersService);
  });

  it("should validate user by id and strip sensitive fields", async () => {
    usersService.findOne.mockResolvedValueOnce({
      id: "u1",
      email: "user@example.com",
      isActive: true,
      password: "secret",
      refreshToken: "refresh",
    });

    await expect(strategy.validate({ sub: "u1", email: "user@example.com" })).resolves.toEqual({
      id: "u1",
      email: "user@example.com",
      isActive: true,
    });
    expect(usersService.findOne).toHaveBeenCalledWith("u1");
  });

  it("should fall back to email when id lookup fails", async () => {
    usersService.findOne.mockRejectedValueOnce(new Error("not found"));
    usersService.findByEmail.mockResolvedValueOnce({
      id: "u2",
      email: "fallback@example.com",
      isActive: true,
      password: "secret",
      refreshToken: "refresh",
    });

    await expect(strategy.validate({ sub: "missing", email: "fallback@example.com" })).resolves.toMatchObject({
      id: "u2",
      email: "fallback@example.com",
    });
    expect(usersService.findByEmail).toHaveBeenCalledWith("fallback@example.com");
  });

  it("should reject inactive or missing users", async () => {
    usersService.findOne.mockResolvedValueOnce({
      id: "u3",
      email: "inactive@example.com",
      isActive: false,
    });

    await expect(strategy.validate({ sub: "u3", email: "inactive@example.com" })).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
  });
});
