import { describe, expect, it, jest, beforeEach } from "@jest/globals";
import { GoogleStrategy } from "../google.strategy";

describe("GoogleStrategy", () => {
  const configService = {
    get: jest.fn((key: string) => {
      const values: Record<string, string> = {
        GOOGLE_CLIENT_ID: "client-id",
        GOOGLE_CLIENT_SECRET: "client-secret",
        GOOGLE_CALLBACK_URL: "http://localhost/callback",
      };
      return values[key];
    }),
  } as any;

  const authService = {
    googleLogin: jest.fn(),
  } as any;

  let strategy: GoogleStrategy;

  beforeEach(() => {
    jest.clearAllMocks();
    strategy = new GoogleStrategy(configService, authService);
  });

  it("should return the login result when Google auth succeeds", async () => {
    authService.googleLogin.mockResolvedValueOnce({ user: { email: "user@example.com" } });
    const done = jest.fn();

    await strategy.validate("access", "refresh", {
      id: "g1",
      displayName: "Test User",
      emails: [{ value: "user@example.com" }],
    }, done);

    expect(authService.googleLogin).toHaveBeenCalled();
    expect(done).toHaveBeenCalledWith(null, { user: { email: "user@example.com" } });
  });

  it("should map missing users to a structured error payload", async () => {
    authService.googleLogin.mockRejectedValueOnce(new Error("User not found"));
    const done = jest.fn();

    await strategy.validate("access", "refresh", {
      id: "g2",
      displayName: "Missing User",
      emails: [{ value: "missing@example.com" }],
    }, done);

    expect(done).toHaveBeenCalledWith(null, {
      error: "user_not_found",
      message: "User not found",
    });
  });

  it("should forward unexpected errors to done", async () => {
    authService.googleLogin.mockRejectedValueOnce(new Error("Boom"));
    const done = jest.fn();

    await strategy.validate("access", "refresh", {
      id: "g3",
      displayName: "Broken",
      emails: [{ value: "broken@example.com" }],
    }, done);

    expect(done.mock.calls[0][0]).toBeInstanceOf(Error);
    expect(done.mock.calls[0][1]).toBeNull();
  });
});
