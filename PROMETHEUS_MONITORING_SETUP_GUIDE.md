# 📊 Prometheus Monitoring Setup Guide - Doanhoi Portal

## 📋 Current Status

### ✅ What's Already Setup

1. **Prometheus Container** (docker-compose.yml)
   - Image: `prom/prometheus:latest`
   - Port: `9090`
   - Config: `prometheus.yml` mounted to `/etc/prometheus/prometheus.yml`

2. **Monitoring Service** (Backend)
   - File: `backend/src/users/services/monitoring.service.ts`
   - Tracks: Memory usage, processing speed, batch statistics
   - Used in: User import service only

### ❌ What's Missing

1. **Prometheus Client Library** - Not installed in backend
2. **Metrics Endpoint** - No `/metrics` endpoint exposed
3. **Application Metrics** - No Prometheus metrics collection
4. **Target Configuration** - Prometheus config only monitors itself

---

## 🎯 Complete Prometheus Monitoring Setup

### Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                     Browser/Client                           │
└──────────────────────────┬──────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────┐
│                  Frontend (React)                            │
│  Port: 5173 (dev) / 3000 (prod)                             │
└──────────────────────────┬──────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────┐
│              Backend API (NestJS)                            │
│  Port: 3001                                                  │
│  Exposes: /metrics endpoint                                  │
│  Metrics:                                                    │
│    - HTTP requests (counter, histogram)                      │
│    - Database queries (histogram)                            │
│    - Import operations (gauge, counter)                      │
│    - Memory usage (gauge)                                    │
│    - CPU usage (gauge)                                       │
└──────────────────────────┬──────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────┐
│                Prometheus Server                             │
│  Port: 9090                                                  │
│  Scrapes: /metrics from backend every 5s                     │
│  Stores: Time-series metrics data                            │
└──────────────────────────┬──────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────┐
│               Grafana (Optional)                             │
│  Port: 3002                                                  │
│  Visualizes: Prometheus metrics with dashboards             │
└─────────────────────────────────────────────────────────────┘
```

---

## 🔧 Step-by-Step Implementation

### Step 1: Install Prometheus Client for NestJS

```bash
cd backend
npm install @willsoto/nestjs-prometheus prom-client
```

**Purpose:** Enable Prometheus metrics collection in NestJS

---

### Step 2: Create Metrics Module

**File:** `backend/src/metrics/metrics.module.ts`

```typescript
import { Module } from '@nestjs/common';
import { PrometheusModule } from '@willsoto/nestjs-prometheus';

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
})
export class MetricsModule {}
```

**What it does:**
- Exposes `/metrics` endpoint on port 3001
- Collects default Node.js metrics (CPU, memory, event loop)
- Prefixes all metrics with `doanhoi_`

---

### Step 3: Register Metrics Module in App Module

**File:** `backend/src/app.module.ts`

```typescript
import { Module } from '@nestjs/common';
import { MetricsModule } from './metrics/metrics.module';

@Module({
  imports: [
    // ... existing imports
    MetricsModule,
  ],
})
export class AppModule {}
```

---

### Step 4: Create Custom Metrics Service

**File:** `backend/src/metrics/metrics.service.ts`

```typescript
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
  ) {}

  // Helper methods
  recordHttpRequest(method: string, path: string, statusCode: number, duration: number) {
    this.httpRequestsCounter.labels(method, path, statusCode.toString()).inc();
    this.httpRequestDuration.labels(method, path).observe(duration);
  }

  recordDbQuery(queryType: string, duration: number) {
    this.dbQueryDuration.labels(queryType).observe(duration);
  }

  recordImportSession(sessionType: string, rowsProcessed: number, failed: number, duration: number) {
    this.importRowsProcessed.labels(sessionType).inc(rowsProcessed);
    this.importRowsFailed.labels(sessionType).inc(failed);
    this.importDuration.labels(sessionType).observe(duration);
  }
}
```

---

### Step 5: Register Custom Metrics

**File:** `backend/src/metrics/metrics.module.ts` (Updated)

```typescript
import { Module } from '@nestjs/common';
import { PrometheusModule, makeCounterProvider, makeHistogramProvider, makeGaugeProvider } from '@willsoto/nestjs-prometheus';
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
    
    // HTTP Metrics
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
export class MetricsModule {}
```

---

### Step 6: Add Metrics to Organization Import Service

**File:** `backend/src/organizations/organization-import.service.ts`

```typescript
import { Injectable } from '@nestjs/common';
import { MetricsService } from '../metrics/metrics.service';

@Injectable()
export class OrganizationImportService {
  constructor(
    // ... existing dependencies
    private readonly metricsService: MetricsService,
  ) {}

  async validateImportData(sessionId: string): Promise<ImportValidationResult[]> {
    const startTime = Date.now();
    
    try {
      // ... existing validation logic ...
      
      const duration = (Date.now() - startTime) / 1000;
      
      // Record metrics
      this.metricsService.orgImportValidationDuration.observe(duration);
      
      console.log(`✅ [Validation] Completed in ${duration}s`);
      return validationResults;
      
    } catch (error) {
      const duration = (Date.now() - startTime) / 1000;
      this.metricsService.orgImportValidationDuration.observe(duration);
      throw error;
    }
  }

  async executeImport(sessionId: string, skipErrors: boolean = false): Promise<ImportExecutionResult> {
    const startTime = Date.now();
    const BATCH_SIZE = 500;
    
    // Record batch size
    this.metricsService.orgImportBatchSize.set(BATCH_SIZE);
    
    // Increment active sessions
    this.metricsService.importSessionsActive.labels('organization').inc();
    
    try {
      // ... existing import logic ...
      
      const duration = (Date.now() - startTime) / 1000;
      
      // Record metrics
      this.metricsService.recordImportSession(
        'organization',
        result.successful,
        result.failed,
        duration
      );
      
      console.log(`✅ [Import] Completed in ${duration}s`);
      return result;
      
    } catch (error) {
      throw error;
    } finally {
      // Decrement active sessions
      this.metricsService.importSessionsActive.labels('organization').dec();
    }
  }
}
```

---

### Step 7: Add HTTP Request Interceptor

**File:** `backend/src/common/interceptors/metrics.interceptor.ts`

```typescript
import { Injectable, NestInterceptor, ExecutionContext, CallHandler } from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { MetricsService } from '../../metrics/metrics.service';

@Injectable()
export class MetricsInterceptor implements NestInterceptor {
  constructor(private readonly metricsService: MetricsService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const startTime = Date.now();

    return next.handle().pipe(
      tap(() => {
        const response = context.switchToHttp().getResponse();
        const duration = (Date.now() - startTime) / 1000;

        this.metricsService.recordHttpRequest(
          request.method,
          request.route?.path || request.url,
          response.statusCode,
          duration
        );
      })
    );
  }
}
```

**Apply globally in `main.ts`:**

```typescript
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { MetricsInterceptor } from './common/interceptors/metrics.interceptor';
import { MetricsService } from './metrics/metrics.service';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  
  // Apply metrics interceptor globally
  const metricsService = app.get(MetricsService);
  app.useGlobalInterceptors(new MetricsInterceptor(metricsService));
  
  await app.listen(3001);
}
bootstrap();
```

---

### Step 8: Update Prometheus Configuration

**File:** `prometheus.yml`

```yaml
global:
  scrape_interval: 5s
  evaluation_interval: 5s

scrape_configs:
  # Prometheus self-monitoring
  - job_name: 'prometheus'
    static_configs:
      - targets: ['localhost:9090']

  # Backend API monitoring
  - job_name: 'doanhoi-backend'
    metrics_path: '/metrics'
    static_configs:
      - targets: ['backend:3001']  # Docker service name
    relabel_configs:
      - source_labels: [__address__]
        target_label: instance
        replacement: 'doanhoi-backend'

  # Frontend monitoring (if using Prometheus client in React)
  - job_name: 'doanhoi-frontend'
    metrics_path: '/metrics'
    static_configs:
      - targets: ['frontend:3000']
    relabel_configs:
      - source_labels: [__address__]
        target_label: instance
        replacement: 'doanhoi-frontend'
```

---

### Step 9: Update Docker Compose

**File:** `docker-compose.yml`

```yaml
services:
  backend:
    # ... existing config
    expose:
      - "3001"  # For Prometheus scraping
    networks:
      - doanhoi-network

  prometheus:
    image: prom/prometheus:latest
    container_name: prometheus
    volumes:
      - ./prometheus.yml:/etc/prometheus/prometheus.yml
      - prometheus_data:/prometheus
    ports:
      - "9090:9090"
    command:
      - '--config.file=/etc/prometheus/prometheus.yml'
      - '--storage.tsdb.path=/prometheus'
      - '--web.console.libraries=/usr/share/prometheus/console_libraries'
      - '--web.console.templates=/usr/share/prometheus/consoles'
    networks:
      - doanhoi-network
    restart: unless-stopped

  # Optional: Add Grafana for visualization
  grafana:
    image: grafana/grafana:latest
    container_name: grafana
    ports:
      - "3002:3000"
    environment:
      - GF_SECURITY_ADMIN_PASSWORD=admin
      - GF_USERS_ALLOW_SIGN_UP=false
    volumes:
      - grafana_data:/var/lib/grafana
    networks:
      - doanhoi-network
    depends_on:
      - prometheus
    restart: unless-stopped

volumes:
  prometheus_data:
  grafana_data:
```

---

## 📊 Available Metrics

### Default Node.js Metrics (Automatic)

- `process_cpu_seconds_total` - CPU time
- `nodejs_heap_size_total_bytes` - Heap size
- `nodejs_heap_size_used_bytes` - Heap usage
- `nodejs_external_memory_bytes` - External memory
- `nodejs_eventloop_lag_seconds` - Event loop lag

### Custom Application Metrics

#### HTTP Metrics
```
doanhoi_http_requests_total{method="GET", path="/api/users", status="200"}
doanhoi_http_request_duration_seconds{method="POST", path="/api/organizations/import"}
```

#### Database Metrics
```
doanhoi_db_query_duration_seconds{query_type="select"}
doanhoi_db_connections_active
```

#### Import Metrics
```
doanhoi_import_sessions_active{type="organization"}
doanhoi_import_rows_processed_total{type="organization"}
doanhoi_import_rows_failed_total{type="organization"}
doanhoi_import_duration_seconds{type="organization"}
```

#### Organization Import Specific
```
doanhoi_org_import_validation_duration_seconds
doanhoi_org_import_batch_size
```

---

## 🔍 Querying Metrics

### Access Prometheus UI

```
http://localhost:9090
```

### Example PromQL Queries

#### 1. HTTP Request Rate
```promql
rate(doanhoi_http_requests_total[1m])
```

#### 2. Average Request Duration
```promql
histogram_quantile(0.95, 
  rate(doanhoi_http_request_duration_seconds_bucket[5m])
)
```

#### 3. Import Success Rate
```promql
sum(rate(doanhoi_import_rows_processed_total[5m])) 
/ 
(sum(rate(doanhoi_import_rows_processed_total[5m])) + sum(rate(doanhoi_import_rows_failed_total[5m])))
```

#### 4. Organization Import Performance
```promql
histogram_quantile(0.99, 
  rate(doanhoi_org_import_validation_duration_seconds_bucket[5m])
)
```

#### 5. Memory Usage
```promql
nodejs_heap_size_used_bytes / nodejs_heap_size_total_bytes
```

#### 6. Active Import Sessions
```promql
doanhoi_import_sessions_active
```

---

## 📈 Setting Up Grafana Dashboards

### 1. Access Grafana

```
http://localhost:3002
Login: admin / admin
```

### 2. Add Prometheus Data Source

1. Go to Configuration → Data Sources
2. Add Prometheus
3. URL: `http://prometheus:9090`
4. Save & Test

### 3. Import Dashboard

Use pre-built dashboard ID: `1860` (Node Exporter Full)

Or create custom dashboard with panels:

**Panel 1: HTTP Request Rate**
```promql
rate(doanhoi_http_requests_total[1m])
```

**Panel 2: Import Performance**
```promql
doanhoi_import_duration_seconds
```

**Panel 3: Error Rate**
```promql
rate(doanhoi_import_rows_failed_total[5m])
```

---

## 🚨 Alerting Rules

**File:** `prometheus-alerts.yml`

```yaml
groups:
  - name: doanhoi_alerts
    interval: 30s
    rules:
      - alert: HighErrorRate
        expr: rate(doanhoi_import_rows_failed_total[5m]) > 0.1
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "High import error rate"
          description: "Import error rate is {{ $value }} errors/sec"

      - alert: HighMemoryUsage
        expr: (nodejs_heap_size_used_bytes / nodejs_heap_size_total_bytes) > 0.9
        for: 5m
        labels:
          severity: critical
        annotations:
          summary: "High memory usage"
          description: "Memory usage is {{ $value }}%"

      - alert: SlowImportValidation
        expr: histogram_quantile(0.99, rate(doanhoi_org_import_validation_duration_seconds_bucket[5m])) > 10
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "Slow import validation"
          description: "99th percentile validation time is {{ $value }}s"
```

---

## 📋 Implementation Checklist

- [ ] Install `@willsoto/nestjs-prometheus` and `prom-client`
- [ ] Create `MetricsModule` and `MetricsService`
- [ ] Register custom metrics providers
- [ ] Add metrics to `OrganizationImportService`
- [ ] Create `MetricsInterceptor` for HTTP requests
- [ ] Apply interceptor globally in `main.ts`
- [ ] Update `prometheus.yml` with backend target
- [ ] Update `docker-compose.yml` with Grafana (optional)
- [ ] Test `/metrics` endpoint
- [ ] Verify Prometheus scraping
- [ ] Create Grafana dashboards
- [ ] Set up alerting rules

---

## 🧪 Testing

### 1. Start Services
```bash
docker-compose up -d
```

### 2. Check Metrics Endpoint
```bash
curl http://localhost:3001/metrics
```

Expected output:
```
# HELP doanhoi_http_requests_total Total number of HTTP requests
# TYPE doanhoi_http_requests_total counter
doanhoi_http_requests_total{method="GET",path="/api/users",status="200"} 42

# HELP doanhoi_org_import_validation_duration_seconds Organization import validation duration
# TYPE doanhoi_org_import_validation_duration_seconds histogram
doanhoi_org_import_validation_duration_seconds_bucket{le="0.1"} 0
doanhoi_org_import_validation_duration_seconds_bucket{le="1"} 15
doanhoi_org_import_validation_duration_seconds_sum 12.5
doanhoi_org_import_validation_duration_seconds_count 15
```

### 3. Check Prometheus Targets
```
http://localhost:9090/targets
```

Should show:
- ✅ prometheus (localhost:9090) - UP
- ✅ doanhoi-backend (backend:3001) - UP

### 4. Query Metrics
```
http://localhost:9090/graph
```

Try query: `doanhoi_import_rows_processed_total`

---

## 📚 Resources

- [Prometheus Docs](https://prometheus.io/docs/)
- [NestJS Prometheus](https://github.com/willsoto/nestjs-prometheus)
- [Grafana Docs](https://grafana.com/docs/)
- [PromQL Cheat Sheet](https://promlabs.com/promql-cheat-sheet/)

---

**Created:** October 16, 2025  
**Status:** 📋 Implementation Guide  
**Priority:** 🟡 MEDIUM - Monitoring Enhancement
