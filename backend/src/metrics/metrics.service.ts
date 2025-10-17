import { Injectable } from '@nestjs/common';
import { Counter, Histogram, Gauge } from 'prom-client';
import { InjectMetric } from '@willsoto/nestjs-prometheus';

@Injectable()
export class MetricsService {
  constructor(
    // HTTP Request Metrics
    @InjectMetric('http_requests_total')
    public httpRequestsCounter: Counter<string>,

    @InjectMetric('http_request_duration_seconds')
    public httpRequestDuration: Histogram<string>,

    // Database Metrics
    @InjectMetric('db_query_duration_seconds')
    public dbQueryDuration: Histogram<string>,

    @InjectMetric('db_connections_active')
    public dbConnectionsActive: Gauge<string>,

    // Import Metrics
    @InjectMetric('import_sessions_active')
    public importSessionsActive: Gauge<string>,

    @InjectMetric('import_rows_processed_total')
    public importRowsProcessed: Counter<string>,

    @InjectMetric('import_rows_failed_total')
    public importRowsFailed: Counter<string>,

    @InjectMetric('import_duration_seconds')
    public importDuration: Histogram<string>,

    // Organization Metrics
    @InjectMetric('org_import_validation_duration_seconds')
    public orgImportValidationDuration: Histogram<string>,

    @InjectMetric('org_import_batch_size')
    public orgImportBatchSize: Gauge<string>,
  ) { }

  /**
   * Record HTTP request metrics
   */
  recordHttpRequest(method: string, path: string, statusCode: number, duration: number) {
    this.httpRequestsCounter.labels(method, path, statusCode.toString()).inc();
    this.httpRequestDuration.labels(method, path).observe(duration);
  }

  /**
   * Record database query metrics
   */
  recordDbQuery(queryType: string, duration: number) {
    this.dbQueryDuration.labels(queryType).observe(duration);
  }

  /**
   * Record import session metrics
   */
  recordImportSession(sessionType: string, rowsProcessed: number, failed: number, duration: number) {
    this.importRowsProcessed.labels(sessionType).inc(rowsProcessed);
    this.importRowsFailed.labels(sessionType).inc(failed);
    this.importDuration.labels(sessionType).observe(duration);
  }

  /**
   * Start import session (increment counter)
   */
  startImportSession(sessionType: string) {
    this.importSessionsActive.labels(sessionType).inc();
  }

  /**
   * End import session (decrement counter)
   */
  endImportSession(sessionType: string) {
    this.importSessionsActive.labels(sessionType).dec();
  }

  /**
   * Record organization validation duration
   */
  recordOrgValidationDuration(duration: number) {
    this.orgImportValidationDuration.observe(duration);
  }

  /**
   * Set organization import batch size
   */
  setOrgImportBatchSize(batchSize: number) {
    this.orgImportBatchSize.set(batchSize);
  }

  /**
   * Update database connections count
   */
  updateDbConnections(count: number) {
    this.dbConnectionsActive.set(count);
  }
}
