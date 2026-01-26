import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from "@nestjs/common";
import { Observable } from "rxjs";
import { tap, catchError } from "rxjs/operators";
import { MetricsService } from "../../metrics/metrics.service";
import { throwError } from "rxjs";

@Injectable()
export class MetricsInterceptor implements NestInterceptor {
  constructor(private readonly metricsService: MetricsService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const response = context.switchToHttp().getResponse();
    const startTime = Date.now();

    return next.handle().pipe(
      tap(() => {
        // Record successful request
        const duration = (Date.now() - startTime) / 1000;
        const path = request.route?.path || request.url;
        const method = request.method;
        const statusCode = response.statusCode;

        this.metricsService.recordHttpRequest(
          method,
          path,
          statusCode,
          duration,
        );
      }),
      catchError((error) => {
        // Record failed request
        const duration = (Date.now() - startTime) / 1000;
        const statusCode = error.status || 500;
        const path = request.route?.path || request.url;
        const method = request.method;

        this.metricsService.recordHttpRequest(
          method,
          path,
          statusCode,
          duration,
        );

        return throwError(() => error);
      }),
    );
  }
}
