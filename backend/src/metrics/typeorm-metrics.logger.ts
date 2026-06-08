import { Logger as TypeOrmLogger, QueryRunner } from "typeorm";

/**
 * Custom TypeORM Logger để record query duration vào Prometheus metrics.
 * 
 * Sử dụng với TypeORM option: maxQueryExecutionTime: 0
 * Điều này khiến TypeORM gọi logQuerySlow cho MỌI query (không chỉ slow ones).
 * 
 * MetricsService được inject sau khi app bootstrap xong thông qua setMetricsService().
 */

// Interface nhỏ để tránh circular import
interface DbMetricsRecorder {
  recordDbQuery(queryType: string, duration: number): void;
}

let metricsRecorder: DbMetricsRecorder | null = null;

export function setMetricsServiceForTypeOrm(service: DbMetricsRecorder) {
  metricsRecorder = service;
}

export class TypeOrmMetricsLogger implements TypeOrmLogger {
  constructor(private readonly enableConsoleLog: boolean = false) {}

  logQuery(query: string, parameters?: any[], queryRunner?: QueryRunner) {
    if (this.enableConsoleLog) {
      console.log(`[TypeORM] ${query}`);
    }
  }

  logQueryError(
    error: string | Error,
    query: string,
    parameters?: any[],
    queryRunner?: QueryRunner,
  ) {
    console.error(`[TypeORM Error] ${query}`, error);
  }

  logQuerySlow(
    time: number,
    query: string,
    parameters?: any[],
    queryRunner?: QueryRunner,
  ) {
    // time is in milliseconds — record ALL queries vào histogram
    const durationSeconds = time / 1000;
    const queryType = this.extractQueryType(query);

    if (metricsRecorder) {
      metricsRecorder.recordDbQuery(queryType, durationSeconds);
    }

    // Chỉ log warning nếu query thực sự chậm (>500ms)
    if (time > 500) {
      console.warn(`[TypeORM Slow] ${time}ms: ${query.substring(0, 100)}`);
    }
  }

  logSchemaBuild(message: string, queryRunner?: QueryRunner) {
    // noop
  }

  logMigration(message: string, queryRunner?: QueryRunner) {
    // noop
  }

  log(
    level: "log" | "info" | "warn",
    message: any,
    queryRunner?: QueryRunner,
  ) {
    if (this.enableConsoleLog && level === "warn") {
      console.warn(`[TypeORM] ${message}`);
    }
  }

  private extractQueryType(query: string): string {
    const trimmed = query.trim().toUpperCase();
    if (trimmed.startsWith("SELECT")) return "SELECT";
    if (trimmed.startsWith("INSERT")) return "INSERT";
    if (trimmed.startsWith("UPDATE")) return "UPDATE";
    if (trimmed.startsWith("DELETE")) return "DELETE";
    if (trimmed.startsWith("BEGIN") || trimmed.startsWith("COMMIT") || trimmed.startsWith("ROLLBACK")) return "TRANSACTION";
    return "OTHER";
  }
}
