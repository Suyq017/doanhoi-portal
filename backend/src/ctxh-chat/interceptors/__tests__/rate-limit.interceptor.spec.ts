import { describe, expect, it, jest, beforeEach } from '@jest/globals';
import { HttpException, HttpStatus } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { lastValueFrom, of } from 'rxjs';

import { RateLimitInterceptor } from '../rate-limit.interceptor';

describe('RateLimitInterceptor', () => {
  const createRedisMock = () => ({
    get: jest.fn() as any,
    ttl: jest.fn() as any,
    multi: jest.fn() as any,
  });

  const createConfigServiceMock = () =>
    ({
      get: jest.fn((key: string, defaultValue: number) => {
        const values: Record<string, number> = {
          RATE_LIMIT_MAX_REQUESTS: 3,
          RATE_LIMIT_WINDOW_SECONDS: 60,
        };

        return values[key] ?? defaultValue;
      }),
    }) as unknown as ConfigService;

  let redis: any;
  let interceptor: RateLimitInterceptor;

  beforeEach(() => {
    jest.clearAllMocks();
    redis = createRedisMock();
    interceptor = new RateLimitInterceptor(redis as any, createConfigServiceMock());
  });

  it('should allow requests under the limit and set headers', async () => {
    const exec = (jest.fn() as any).mockResolvedValue([]);
    const multi = {
      incr: jest.fn().mockReturnThis(),
      expire: jest.fn().mockReturnThis(),
      exec,
    };
    redis.get.mockResolvedValue('1');
    redis.multi.mockReturnValue(multi);

    const response = { setHeader: jest.fn() };
    const context = {
      switchToHttp: () => ({
        getRequest: () => ({
          user: { id: 'user-1' },
          ip: undefined,
          connection: { remoteAddress: '127.0.0.1' },
        }),
        getResponse: () => response,
      }),
    } as any;
    const next = {
      handle: () => of({ ok: true }),
    } as any;

    const result$ = await interceptor.intercept(context, next);

    await expect(lastValueFrom(result$)).resolves.toEqual({ ok: true });
    expect(redis.get).toHaveBeenCalledWith('rate_limit:user-1');
    expect(multi.incr).toHaveBeenCalledWith('rate_limit:user-1');
    expect(multi.expire).not.toHaveBeenCalled();
    expect(response.setHeader).toHaveBeenCalledWith('X-RateLimit-Limit', 3);
    expect(response.setHeader).toHaveBeenCalledWith('X-RateLimit-Remaining', 1);
  });

  it('should reject when the limit is exceeded', async () => {
    redis.get.mockResolvedValue('3');
    redis.ttl.mockResolvedValue(9);

    const response = { setHeader: jest.fn() };
    const context = {
      switchToHttp: () => ({
        getRequest: () => ({
          ip: '10.0.0.12',
          connection: { remoteAddress: '10.0.0.12' },
        }),
        getResponse: () => response,
      }),
    } as any;
    const next = {
      handle: jest.fn(),
    } as any;

    await expect(interceptor.intercept(context, next)).rejects.toBeInstanceOf(HttpException);

    try {
      await interceptor.intercept(context, next);
    } catch (error) {
      const httpException = error as HttpException;
      expect(httpException.getStatus()).toBe(HttpStatus.TOO_MANY_REQUESTS);
      expect(httpException.getResponse()).toEqual({
        statusCode: HttpStatus.TOO_MANY_REQUESTS,
        message: 'Rate limit exceeded. Please try again in 9 seconds.',
        error: 'Too Many Requests',
        retryAfter: 9,
      });
    }

    expect(redis.ttl).toHaveBeenCalledWith('rate_limit:10.0.0.12');
    expect(next.handle).not.toHaveBeenCalled();
  });

  it('should allow requests when Redis fails', async () => {
    redis.get.mockRejectedValue(new Error('redis down'));

    const response = { setHeader: jest.fn() };
    const next = {
      handle: jest.fn().mockReturnValue(of({ fallback: true })),
    } as any;
    const context = {
      switchToHttp: () => ({
        getRequest: () => ({
          ip: '192.168.1.15',
          connection: { remoteAddress: '192.168.1.15' },
        }),
        getResponse: () => response,
      }),
    } as any;

    const result$ = await interceptor.intercept(context, next);

    await expect(lastValueFrom(result$)).resolves.toEqual({ fallback: true });
    expect(next.handle).toHaveBeenCalledTimes(1);
  });
});