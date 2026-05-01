import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  HttpException,
  HttpStatus,
  Inject,
  Logger,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { ConfigService } from '@nestjs/config';
import type { Redis } from 'ioredis';

@Injectable()
export class RateLimitInterceptor implements NestInterceptor {
  private readonly logger = new Logger(RateLimitInterceptor.name);
  private readonly maxRequests: number;
  private readonly windowSeconds: number;

  constructor(
    @Inject('REDIS_CLIENT') private readonly redis: Redis,
    private readonly configService: ConfigService,
  ) {
    this.maxRequests = this.configService.get<number>('RATE_LIMIT_MAX_REQUESTS', 30);
    this.windowSeconds = this.configService.get<number>('RATE_LIMIT_WINDOW_SECONDS', 60);
  }

  async intercept(context: ExecutionContext, next: CallHandler): Promise<Observable<any>> {
    const request = context.switchToHttp().getRequest();
    const userId = request.user?.id;
    const ip = request.ip || request.connection.remoteAddress;

    // Use userId if available, otherwise use IP address
    const identifier = userId || ip;
    const key = `rate_limit:${identifier}`;

    try {
      // Get current request count
      const currentCount = await this.redis.get(key);
      const requestCount = currentCount ? parseInt(currentCount, 10) : 0;

      if (requestCount >= this.maxRequests) {
        this.logger.warn(
          `Rate limit exceeded for ${userId ? `user ${userId}` : `IP ${ip}`}: ${requestCount}/${this.maxRequests} requests`
        );
        
        const ttl = await this.redis.ttl(key);
        throw new HttpException(
          {
            statusCode: HttpStatus.TOO_MANY_REQUESTS,
            message: `Rate limit exceeded. Please try again in ${ttl} seconds.`,
            error: 'Too Many Requests',
            retryAfter: ttl,
          },
          HttpStatus.TOO_MANY_REQUESTS
        );
      }

      // Increment request count
      const multi = this.redis.multi();
      multi.incr(key);
      
      // Set expiry only if this is the first request in the window
      if (requestCount === 0) {
        multi.expire(key, this.windowSeconds);
      }
      
      await multi.exec();

      // Add rate limit headers to response
      const response = context.switchToHttp().getResponse();
      response.setHeader('X-RateLimit-Limit', this.maxRequests);
      response.setHeader('X-RateLimit-Remaining', Math.max(0, this.maxRequests - requestCount - 1));
      response.setHeader('X-RateLimit-Reset', Date.now() + (this.windowSeconds * 1000));

      return next.handle();
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      
      this.logger.error('Error in rate limiting:', error);
      // If Redis fails, allow the request to proceed
      return next.handle();
    }
  }
}
