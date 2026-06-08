import { Injectable } from "@nestjs/common";
import { InjectDataSource } from "@nestjs/typeorm";
import { DataSource } from "typeorm";
import { Interval } from "@nestjs/schedule";
import { MetricsService } from "./metrics.service";

/**
 * Service để thu thập metrics từ TypeORM/PostgreSQL connection pool.
 * 
 * Cập nhật mỗi 5 giây:
 * - Số lượng active DB connections
 * 
 * Lưu ý: TypeORM không expose query-level hooks dễ dàng,
 * nên DB query duration được track qua custom TypeORM logger bên dưới.
 */
@Injectable()
export class TypeOrmMetricsCollector {
  constructor(
    @InjectDataSource()
    private readonly dataSource: DataSource,
    private readonly metricsService: MetricsService,
  ) {}

  /**
   * Thu thập số connections mỗi 5 giây
   */
  @Interval(5000)
  collectConnectionMetrics() {
    try {
      if (!this.dataSource.isInitialized) return;

      // TypeORM driver pool thông tin
      const driver = this.dataSource.driver as any;
      const pool = driver?.master;

      if (pool) {
        // pg pool exposes: totalCount, idleCount, waitingCount
        const totalCount = pool.totalCount ?? 0;

        // Report total pool connections (connections đang tồn tại trong pool)
        this.metricsService.updateDbConnections(totalCount);
      }
    } catch {
      // Silently ignore — metrics collection should never crash the app
    }
  }
}
