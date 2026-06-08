import { Injectable, CanActivate, ExecutionContext } from "@nestjs/common";
import { Request } from "express";

/**
 * Guard chặn truy cập /metrics từ bên ngoài.
 * 
 * Chiến lược bảo vệ 2 lớp:
 * 1. Nginx: `location /api/metrics { deny all; return 403; }` — chặn từ Internet
 * 2. Guard này: chỉ cho phép request từ Docker internal network / localhost
 * 
 * QUAN TRỌNG: Không sử dụng X-Real-IP / X-Forwarded-For vì có thể bị spoof.
 * Chỉ tin tưởng request.socket.remoteAddress (là IP thực của connection TCP).
 * Khi chạy trong Docker, Prometheus scrape trực tiếp qua Docker network nên
 * remoteAddress sẽ là IP Docker internal (172.x.x.x).
 */
@Injectable()
export class MetricsGuard implements CanActivate {
  private readonly allowedNetworks = [
    /^127\./,          // localhost IPv4
    /^::1$/,           // localhost IPv6
    /^::ffff:127\./,   // IPv4-mapped IPv6 localhost
    /^172\.(1[6-9]|2\d|3[01])\./,  // Docker bridge (172.16-31.x.x)
    /^10\./,           // Private network class A
    /^192\.168\./,     // Private network class C
    /^::ffff:172\.(1[6-9]|2\d|3[01])\./, // Docker bridge IPv6-mapped
    /^::ffff:10\./,    // Private class A IPv6-mapped
    /^::ffff:192\.168\./, // Private class C IPv6-mapped
  ];

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<Request>();

    // CHỈ dùng socket remoteAddress (TCP layer) — không thể bị spoof
    // KHÔNG dùng X-Real-IP / X-Forwarded-For vì attacker có thể tự set header
    const clientIp = request.socket.remoteAddress || "";

    return this.isAllowedIp(clientIp);
  }

  private isAllowedIp(ip: string): boolean {
    return this.allowedNetworks.some((pattern) => pattern.test(ip));
  }
}
