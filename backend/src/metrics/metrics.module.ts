import { Module } from '@nestjs/common';
import { PrometheusModule, makeCounterProvider, makeHistogramProvider, makeGaugeProvider } from '@willsoto/nestjs-prometheus'
import { MetricsService } from './metrics.service';

@Module({
    imports: [
        PrometheusModule.register({
            defaultMetrics: {
                enabled: true,
                config: {
                    prefix: 'doanhoi_',
                },
            },
            path: '/metrics',
            defaultLabels: {
                app: 'doanhoi-portal',
                environment: process.env.NODE_ENV || 'development',
            },
        }),
    ],

    providers: [
        MetricsService,

        makeCounterProvider({
            name: 'http_requests_total',
            help: 'Total number of HTTP requests',
            labelNames: ['method', 'path', 'status'],
        }),
        makeHistogramProvider({
            name: 'http_request_duration_seconds',
            help: 'HTTP request duration in seconds',
            labelNames: ['method', 'path'],
            buckets: [0.01, 0.05, 0.1, 0.5, 1, 2, 5, 10],
        }),
        // Database Metrics
        makeHistogramProvider({
            name: 'db_query_duration_seconds',
            help: 'Database query duration in seconds',
            labelNames: ['query_type'],
            buckets: [0.001, 0.005, 0.01, 0.05, 0.1, 0.5, 1],
        }),
        makeGaugeProvider({
            name: 'db_connections_active',
            help: 'Number of active database connections',
            labelNames: [],
        }),

        // Import Metrics
        makeGaugeProvider({
            name: 'import_sessions_active',
            help: 'Number of active import sessions',
            labelNames: ['type'],
        }),
        makeCounterProvider({
            name: 'import_rows_processed_total',
            help: 'Total number of rows processed',
            labelNames: ['type'],
        }),
        makeCounterProvider({
            name: 'import_rows_failed_total',
            help: 'Total number of rows failed',
            labelNames: ['type'],
        }),
        makeHistogramProvider({
            name: 'import_duration_seconds',
            help: 'Import operation duration in seconds',
            labelNames: ['type'],
            buckets: [1, 5, 10, 30, 60, 120, 300],
        }),

        // Organization Import Metrics
        makeHistogramProvider({
            name: 'org_import_validation_duration_seconds',
            help: 'Organization import validation duration in seconds',
            labelNames: [],
            buckets: [0.1, 0.5, 1, 2, 5, 10],
        }),
        makeGaugeProvider({
            name: 'org_import_batch_size',
            help: 'Organization import batch size',
            labelNames: [],
        }),
    ],
    exports: [MetricsService],
})
export class MetricsModule { }