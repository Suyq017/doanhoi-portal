import { describe, expect, it, jest, beforeEach } from "@jest/globals";
import { lastValueFrom, of, throwError } from "rxjs";
import { MetricsInterceptor } from "../metrics.interceptor";

describe("MetricsInterceptor", () => {
  const metricsService = {
    recordHttpRequest: jest.fn(),
  } as any;

  let interceptor: MetricsInterceptor;

  beforeEach(() => {
    jest.clearAllMocks();
    interceptor = new MetricsInterceptor(metricsService);
  });

  it("should record successful requests", async () => {
    const request = { method: "GET", url: "/api/test", route: { path: "/api/test" } };
    const response = { statusCode: 200 };
    const context = {
      switchToHttp: () => ({
        getRequest: () => request,
        getResponse: () => response,
      }),
    } as any;
    const next = {
      handle: () => of({ ok: true }),
    } as any;

    jest.spyOn(Date, "now").mockReturnValueOnce(1000).mockReturnValueOnce(2500);

    await expect(lastValueFrom(interceptor.intercept(context, next))).resolves.toEqual({ ok: true });
    expect(metricsService.recordHttpRequest).toHaveBeenCalledWith("GET", "/api/test", 200, 1.5);
  });

  it("should record failed requests and rethrow errors", async () => {
    const request = { method: "POST", url: "/api/fail" };
    const response = { statusCode: 500 };
    const error = Object.assign(new Error("boom"), { status: 418 });
    const context = {
      switchToHttp: () => ({
        getRequest: () => request,
        getResponse: () => response,
      }),
    } as any;
    const next = {
      handle: () => throwError(() => error),
    } as any;

    jest.spyOn(Date, "now").mockReturnValueOnce(3000).mockReturnValueOnce(4500);

    await expect(lastValueFrom(interceptor.intercept(context, next))).rejects.toThrow("boom");
    expect(metricsService.recordHttpRequest).toHaveBeenCalledWith("POST", "/api/fail", 418, 1.5);
  });
});
