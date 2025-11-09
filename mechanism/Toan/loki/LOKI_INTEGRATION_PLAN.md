# Loki Integration Plan - Log Aggregation System

## 📋 Tổng quan

Kế hoạch tích hợp **Grafana Loki** vào hệ thống Đoàn Hội Portal để:
- Thu thập logs từ Backend (NestJS) và Frontend
- Tập trung logs từ nhiều services
- Tìm kiếm và phân tích logs real-time
- Tích hợp với Grafana để visualize logs cùng metrics

---

## 🏗️ Kiến trúc hiện tại

### Current Stack

```
┌─────────────────────────────────────────────────────┐
│                  MONITORING STACK                    │
├─────────────────────────────────────────────────────┤
│                                                      │
│  ┌──────────────┐         ┌──────────────┐         │
│  │  Prometheus  │────────→│   Grafana    │         │
│  │   :9090      │         │    :3002     │         │
│  └──────┬───────┘         └──────────────┘         │
│         │                                           │
│         │ /metrics                                  │
│         ▼                                           │
│  ┌──────────────┐                                   │
│  │   Backend    │                                   │
│  │   :9200      │                                   │
│  └──────────────┘                                   │
│                                                      │
└─────────────────────────────────────────────────────┘
```

**Vấn đề**:
- ❌ Không có log aggregation
- ❌ Logs chỉ có trên terminal/console
- ❌ Khó debug issues trong production
- ❌ Không có log retention policy
- ❌ Không thể search logs across services

---

## 🎯 Kiến trúc sau khi tích hợp Loki

```
┌────────────────────────────────────────────────────────────────────┐
│                    OBSERVABILITY STACK                              │
├────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  ┌──────────────┐         ┌──────────────┐      ┌──────────────┐ │
│  │  Prometheus  │────────→│   Grafana    │←─────│     Loki     │ │
│  │   :9090      │ metrics │    :3002     │ logs │    :3100     │ │
│  └──────┬───────┘         └──────────────┘      └──────▲───────┘ │
│         │                                                │         │
│         │ /metrics                                       │         │
│         ▼                                                │         │
│  ┌──────────────┐         ┌──────────────┐             │         │
│  │   Backend    │────────→│    Promtail  │─────────────┘         │
│  │   :9200      │  logs   │    :9080     │                       │
│  └──────────────┘         └──────────────┘                       │
│         │                                                         │
│         │ logs to file/stdout                                    │
│         ▼                                                         │
│  [Backend Logs] ──→ Promtail ──→ Loki ──→ Grafana               │
│  [Frontend Logs] ─→ (Future)                                     │
│                                                                   │
└───────────────────────────────────────────────────────────────────┘
```

**Benefits**:
- ✅ Centralized log storage
- ✅ Fast log search với LogQL
- ✅ Logs + Metrics trong cùng Grafana
- ✅ Log retention tự động
- ✅ Correlate logs với metrics

---

## 📦 Components

### 1. Loki - Log Aggregation System
- **Port**: 3100
- **Purpose**: Store và index logs
- **Storage**: Local volume (loki_data)
- **Retention**: 30 days (configurable)

### 2. Promtail - Log Shipper
- **Port**: 9080
- **Purpose**: Collect logs và ship đến Loki
- **Sources**: 
  - Backend logs (file hoặc stdout)
  - Docker container logs
  - System logs (optional)

### 3. Grafana Integration
- **Port**: 3002 (existing)
- **Purpose**: Visualize logs cùng metrics
- **Features**:
  - Log Explorer
  - LogQL queries
  - Alerts on log patterns
  - Dashboards với logs + metrics

---

## 🔧 Implementation Steps

### Phase 1: Setup Loki Stack trong Docker

#### Step 1.1: Update docker-compose.yml

Thêm Loki và Promtail services:

```yaml
services:
  # ... existing services (postgres, prometheus, grafana) ...

  loki:
    image: grafana/loki:2.9.0
    container_name: doanhoi-loki
    ports:
      - "3100:3100"
    volumes:
      - ./loki/loki-config.yml:/etc/loki/local-config.yaml
      - loki_data:/loki
    command: -config.file=/etc/loki/local-config.yaml
    networks:
      - doanhoi-network
    restart: unless-stopped
    healthcheck:
      test: ["CMD-SHELL", "wget --no-verbose --tries=1 --spider http://localhost:3100/ready || exit 1"]
      interval: 10s
      timeout: 5s
      retries: 5

  promtail:
    image: grafana/promtail:2.9.0
    container_name: doanhoi-promtail
    ports:
      - "9080:9080"
    volumes:
      - ./loki/promtail-config.yml:/etc/promtail/config.yml
      - /var/log:/var/log:ro  # System logs (optional)
      - ./backend/logs:/var/log/backend:ro  # Backend logs
      - /var/lib/docker/containers:/var/lib/docker/containers:ro  # Docker logs
    command: -config.file=/etc/promtail/config.yml
    networks:
      - doanhoi-network
    depends_on:
      - loki
    restart: unless-stopped

volumes:
  # ... existing volumes ...
  loki_data:
    driver: local

networks:
  doanhoi-network:
    driver: bridge
```

#### Step 1.2: Create Loki Configuration

**File**: `loki/loki-config.yml`

```yaml
auth_enabled: false

server:
  http_listen_port: 3100
  grpc_listen_port: 9096

common:
  instance_addr: 0.0.0.0
  path_prefix: /loki
  storage:
    filesystem:
      chunks_directory: /loki/chunks
      rules_directory: /loki/rules
  replication_factor: 1
  ring:
    kvstore:
      store: inmemory

query_range:
  results_cache:
    cache:
      embedded_cache:
        enabled: true
        max_size_mb: 100

schema_config:
  configs:
    - from: 2020-10-24
      store: boltdb-shipper
      object_store: filesystem
      schema: v11
      index:
        prefix: index_
        period: 24h

ruler:
  alertmanager_url: http://localhost:9093

# Retention period: 30 days
limits_config:
  retention_period: 720h  # 30 days
  reject_old_samples: true
  reject_old_samples_max_age: 168h  # 7 days
  ingestion_rate_mb: 10
  ingestion_burst_size_mb: 20
  max_streams_per_user: 10000
  max_global_streams_per_user: 0

chunk_store_config:
  max_look_back_period: 720h  # 30 days

table_manager:
  retention_deletes_enabled: true
  retention_period: 720h  # 30 days

compactor:
  working_directory: /loki/compactor
  shared_store: filesystem
  retention_enabled: true
  retention_delete_delay: 2h
  retention_delete_worker_count: 150
```

#### Step 1.3: Create Promtail Configuration

**File**: `loki/promtail-config.yml`

```yaml
server:
  http_listen_port: 9080
  grpc_listen_port: 0

positions:
  filename: /tmp/positions.yaml

clients:
  - url: http://loki:3100/loki/api/v1/push

scrape_configs:
  # ==========================================
  # Backend Application Logs
  # ==========================================
  - job_name: backend
    static_configs:
      - targets:
          - localhost
        labels:
          job: backend
          app: doanhoi-portal
          environment: production
          __path__: /var/log/backend/*.log

    # Pipeline để parse JSON logs
    pipeline_stages:
      # Parse JSON log format
      - json:
          expressions:
            timestamp: timestamp
            level: level
            message: message
            context: context
            trace: trace
            userId: userId
            method: method
            url: url
            statusCode: statusCode
            responseTime: responseTime

      # Extract timestamp
      - timestamp:
          source: timestamp
          format: RFC3339

      # Add labels từ log content
      - labels:
          level:
          context:
          method:
          statusCode:

      # Template cho output format
      - output:
          source: message

  # ==========================================
  # Docker Container Logs
  # ==========================================
  - job_name: docker
    docker_sd_configs:
      - host: unix:///var/run/docker.sock
        refresh_interval: 5s

    relabel_configs:
      # Only include doanhoi-* containers
      - source_labels: ['__meta_docker_container_name']
        regex: '/doanhoi-.*'
        action: keep
      
      # Extract container name
      - source_labels: ['__meta_docker_container_name']
        target_label: container_name
        replacement: '$1'
        regex: '/(.*)'
      
      # Extract container image
      - source_labels: ['__meta_docker_container_image']
        target_label: container_image
      
      # Set job label
      - source_labels: ['__meta_docker_container_name']
        target_label: job
        replacement: 'docker/$1'
        regex: '/doanhoi-(.*)'

    pipeline_stages:
      # Parse log level from Docker logs
      - regex:
          expression: '(?P<level>DEBUG|INFO|WARN|ERROR|FATAL)'
      
      - labels:
          level:

  # ==========================================
  # System Logs (Optional)
  # ==========================================
  - job_name: system
    static_configs:
      - targets:
          - localhost
        labels:
          job: system
          __path__: /var/log/*.log

    pipeline_stages:
      - match:
          selector: '{job="system"}'
          stages:
            - regex:
                expression: '(?P<level>ERROR|WARN)'
            - labels:
                level:
```

---

### Phase 2: Configure Backend Logging

#### Step 2.1: Install Winston Logger

```bash
cd backend
npm install winston winston-daily-rotate-file
```

#### Step 2.2: Create Logger Service

**File**: `backend/src/common/logger/logger.service.ts`

```typescript
import { Injectable, LoggerService } from '@nestjs/common';
import * as winston from 'winston';
import * as DailyRotateFile from 'winston-daily-rotate-file';
import { format } from 'winston';

@Injectable()
export class CustomLoggerService implements LoggerService {
  private logger: winston.Logger;

  constructor() {
    // Console format for development
    const consoleFormat = format.combine(
      format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
      format.colorize(),
      format.printf(({ timestamp, level, message, context, ...meta }) => {
        let msg = `${timestamp} [${level}] [${context || 'Application'}] ${message}`;
        if (Object.keys(meta).length > 0) {
          msg += ` ${JSON.stringify(meta)}`;
        }
        return msg;
      })
    );

    // JSON format for Loki
    const jsonFormat = format.combine(
      format.timestamp({ format: 'YYYY-MM-DDTHH:mm:ss.SSSZ' }),
      format.errors({ stack: true }),
      format.json()
    );

    // Daily rotate file for application logs
    const fileRotateTransport = new DailyRotateFile({
      filename: 'logs/application-%DATE%.log',
      datePattern: 'YYYY-MM-DD',
      maxSize: '20m',
      maxFiles: '30d',
      format: jsonFormat,
      level: process.env.LOG_LEVEL || 'info',
    });

    // Daily rotate file for errors
    const errorRotateTransport = new DailyRotateFile({
      filename: 'logs/error-%DATE%.log',
      datePattern: 'YYYY-MM-DD',
      maxSize: '20m',
      maxFiles: '30d',
      format: jsonFormat,
      level: 'error',
    });

    this.logger = winston.createLogger({
      level: process.env.LOG_LEVEL || 'info',
      defaultMeta: {
        service: 'doanhoi-backend',
        environment: process.env.NODE_ENV || 'development',
      },
      transports: [
        // Console output
        new winston.transports.Console({
          format: process.env.NODE_ENV === 'production' ? jsonFormat : consoleFormat,
        }),
        // File outputs
        fileRotateTransport,
        errorRotateTransport,
      ],
    });
  }

  log(message: string, context?: string) {
    this.logger.info(message, { context });
  }

  error(message: string, trace?: string, context?: string) {
    this.logger.error(message, { trace, context });
  }

  warn(message: string, context?: string) {
    this.logger.warn(message, { context });
  }

  debug(message: string, context?: string) {
    this.logger.debug(message, { context });
  }

  verbose(message: string, context?: string) {
    this.logger.verbose(message, { context });
  }

  // Custom method for HTTP requests
  logHttpRequest(req: any, res: any, responseTime: number) {
    this.logger.info('HTTP Request', {
      context: 'HTTP',
      method: req.method,
      url: req.url,
      statusCode: res.statusCode,
      responseTime: `${responseTime}ms`,
      userId: req.user?.id,
      ip: req.ip,
      userAgent: req.get('user-agent'),
    });
  }

  // Custom method for database queries
  logDatabaseQuery(query: string, duration: number) {
    this.logger.debug('Database Query', {
      context: 'Database',
      query,
      duration: `${duration}ms`,
    });
  }
}
```

#### Step 2.3: Create Logger Module

**File**: `backend/src/common/logger/logger.module.ts`

```typescript
import { Module, Global } from '@nestjs/common';
import { CustomLoggerService } from './logger.service';

@Global()
@Module({
  providers: [CustomLoggerService],
  exports: [CustomLoggerService],
})
export class LoggerModule {}
```

#### Step 2.4: Update main.ts

```typescript
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { CustomLoggerService } from './common/logger/logger.service';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    bufferLogs: true,
  });

  // Use custom logger
  const logger = app.get(CustomLoggerService);
  app.useLogger(logger);

  // ... existing configuration ...

  await app.listen(process.env.PORT || 9200);
  
  logger.log(
    `🚀 Backend server is running on http://localhost:${process.env.PORT || 9200}`,
    'Bootstrap'
  );
  logger.log(
    `📖 API Documentation: http://localhost:${process.env.PORT || 9200}/api`,
    'Bootstrap'
  );
}

bootstrap();
```

#### Step 2.5: Create HTTP Logging Interceptor

**File**: `backend/src/common/interceptors/logging.interceptor.ts`

```typescript
import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { CustomLoggerService } from '../logger/logger.service';

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  constructor(private readonly logger: CustomLoggerService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const response = context.switchToHttp().getResponse();
    const startTime = Date.now();

    return next.handle().pipe(
      tap(() => {
        const responseTime = Date.now() - startTime;
        this.logger.logHttpRequest(request, response, responseTime);
      }),
    );
  }
}
```

#### Step 2.6: Register Logger in AppModule

**File**: `backend/src/app.module.ts`

```typescript
import { Module } from '@nestjs/common';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { LoggerModule } from './common/logger/logger.module';
import { LoggingInterceptor } from './common/interceptors/logging.interceptor';

@Module({
  imports: [
    LoggerModule, // Add logger module
    // ... other imports
  ],
  providers: [
    {
      provide: APP_INTERCEPTOR,
      useClass: LoggingInterceptor,
    },
    // ... other providers
  ],
})
export class AppModule {}
```

---

### Phase 3: Configure Grafana Loki Datasource

#### Step 3.1: Update Grafana Datasource Configuration

**File**: `grafana/provisioning/datasources/loki.yml`

```yaml
apiVersion: 1

datasources:
  - name: Loki
    type: loki
    access: proxy
    url: http://loki:3100
    uid: loki-doanhoi
    isDefault: false
    editable: true
    jsonData:
      maxLines: 1000
      derivedFields:
        # Link logs to traces (future enhancement)
        - datasourceUid: tempo
          matcherRegex: "traceId=(\\w+)"
          name: TraceID
          url: '$${__value.raw}'
    version: 1
```

#### Step 3.2: Update Prometheus Datasource (existing)

Keep existing `grafana/provisioning/datasources/prometheus.yml` unchanged.

---

### Phase 4: Create Grafana Dashboards

#### Step 4.1: Logs Dashboard

**File**: `grafana/provisioning/dashboards/logs-dashboard.json`

Create a dashboard với:

**Panels**:
1. **Log Volume (Time Series)**
   - Query: `sum(count_over_time({job="backend"}[1m])) by (level)`
   - Visualization: Graph showing log volume by level

2. **Error Rate (Time Series)**
   - Query: `sum(rate({job="backend", level="ERROR"}[5m]))`
   - Alert when error rate > threshold

3. **Recent Logs (Logs Panel)**
   - Query: `{job="backend"} |= ""`
   - Show last 100 logs with filters

4. **HTTP Requests Logs (Table)**
   - Query: `{job="backend", context="HTTP"} | json | line_format "{{.method}} {{.url}} {{.statusCode}} {{.responseTime}}"`
   - Show HTTP request logs

5. **Error Logs (Logs Panel)**
   - Query: `{job="backend", level="ERROR"}`
   - Show only errors with stack traces

6. **Log Level Distribution (Pie Chart)**
   - Query: `sum(count_over_time({job="backend"}[1h])) by (level)`
   - Show distribution of log levels

#### Step 4.2: Combined Metrics + Logs Dashboard

Update existing dashboard để add log panels bên cạnh metrics:

```json
{
  "panels": [
    {
      "title": "HTTP Request Duration (Metrics)",
      "type": "graph",
      "datasource": "Prometheus",
      "targets": [
        {
          "expr": "http_request_duration_seconds{job=\"doanhoi-backend\"}"
        }
      ]
    },
    {
      "title": "HTTP Request Logs",
      "type": "logs",
      "datasource": "Loki",
      "targets": [
        {
          "expr": "{job=\"backend\", context=\"HTTP\"}"
        }
      ]
    }
  ]
}
```

---

## 🚀 Deployment Steps

### Step 1: Create Directory Structure

```bash
# Tạo thư mục cho Loki configs
mkdir -p loki
mkdir -p backend/logs

# Copy configs
# (Tạo loki-config.yml và promtail-config.yml như trên)
```

### Step 2: Update Docker Compose

```bash
# Backup existing docker-compose
cp docker-compose.yml docker-compose.yml.backup

# Update docker-compose.yml với Loki và Promtail services
# (Thêm configs như Phase 1)
```

### Step 3: Install Backend Dependencies

```bash
cd backend
npm install winston winston-daily-rotate-file
```

### Step 4: Add Logger to Backend

```bash
# Tạo logger service, module, interceptor
# (Code như Phase 2)
```

### Step 5: Start Services

```bash
# Stop existing services
docker-compose down

# Start all services including Loki
docker-compose up -d

# Check logs
docker-compose logs -f loki
docker-compose logs -f promtail
```

### Step 6: Verify Setup

```bash
# Check Loki is ready
curl http://localhost:3100/ready

# Check Promtail is running
curl http://localhost:9080/ready

# Query logs từ Loki
curl -G -s "http://localhost:3100/loki/api/v1/query" \
  --data-urlencode 'query={job="backend"}' | jq
```

### Step 7: Configure Grafana

1. Open Grafana: http://localhost:3002
2. Login (admin/admin123)
3. Go to **Connections** → **Data Sources**
4. Verify **Loki** datasource is connected
5. Go to **Explore** → Select **Loki**
6. Run query: `{job="backend"}`
7. Import dashboards from provisioning

---

## 📊 Example Queries (LogQL)

### Basic Queries

```logql
# All backend logs
{job="backend"}

# Error logs only
{job="backend", level="ERROR"}

# HTTP requests
{job="backend", context="HTTP"}

# Logs containing "database"
{job="backend"} |= "database"

# Logs NOT containing "healthcheck"
{job="backend"} != "healthcheck"

# Case-insensitive search
{job="backend"} |~ "(?i)error"
```

### Advanced Queries

```logql
# HTTP 5xx errors
{job="backend", context="HTTP"} | json | statusCode >= 500

# Slow requests (> 1s)
{job="backend", context="HTTP"} | json | responseTime > 1000

# Error rate per minute
sum(rate({job="backend", level="ERROR"}[1m]))

# Log count by level
sum by (level) (count_over_time({job="backend"}[5m]))

# Top 10 error messages
topk(10, sum by (message) (count_over_time({job="backend", level="ERROR"}[1h])))

# Logs for specific user
{job="backend"} | json | userId="user-123"

# Parse and filter JSON logs
{job="backend"} 
  | json 
  | method="POST" 
  | statusCode >= 400
  | line_format "{{.timestamp}} {{.method}} {{.url}} - {{.statusCode}}"
```

### Correlation Queries (Logs + Metrics)

```logql
# Show logs when error rate is high
{job="backend", level="ERROR"} 
  and 
rate(http_requests_total{status=~"5.."}[1m]) > 0.1
```

---

## 🎨 Dashboard Examples

### 1. Application Overview Dashboard

**Metrics Section**:
- HTTP Request Rate (Prometheus)
- Response Time (Prometheus)
- Error Rate (Prometheus)
- CPU/Memory Usage (Prometheus)

**Logs Section**:
- Recent Errors (Loki)
- HTTP Request Logs (Loki)
- Log Volume by Level (Loki)

### 2. Debugging Dashboard

**Panels**:
1. **Filter by Time Range** → Show logs + metrics
2. **Filter by User ID** → Show user's requests + errors
3. **Filter by Endpoint** → Show specific API logs
4. **Correlation View** → Show metrics spike với corresponding logs

### 3. Alerts Dashboard

**Alert Rules**:
```yaml
- alert: HighErrorRate
  expr: rate({job="backend", level="ERROR"}[5m]) > 10
  for: 5m
  annotations:
    summary: "High error rate detected"
    description: "Error rate is {{ $value }} errors/sec"

- alert: DatabaseConnectionErrors
  expr: count_over_time({job="backend"} |= "database connection failed"[5m]) > 5
  for: 1m
  annotations:
    summary: "Database connection issues"
```

---

## 🔒 Security & Best Practices

### 1. Log Sanitization

**Không log sensitive data**:
```typescript
// ❌ BAD
logger.log(`User password: ${password}`);
logger.log(`Credit card: ${creditCard}`);

// ✅ GOOD
logger.log(`User authenticated`, { userId: user.id });
logger.log(`Payment processed`, { orderId, amount });
```

### 2. Structured Logging

**Sử dụng JSON format**:
```typescript
// ❌ BAD - String interpolation
logger.log(`User ${userId} created order ${orderId} with total ${total}`);

// ✅ GOOD - Structured fields
logger.log('Order created', {
  context: 'OrderService',
  userId,
  orderId,
  total,
  timestamp: new Date().toISOString()
});
```

### 3. Log Levels

**Đúng mức độ**:
```typescript
logger.debug('Detailed debug info');    // Development only
logger.log('User logged in');           // General info
logger.warn('Deprecated API used');     // Warnings
logger.error('Failed to save', trace);  // Errors
```

### 4. Performance

**Tránh log quá nhiều**:
```typescript
// ❌ BAD - Log mỗi iteration
array.forEach(item => {
  logger.debug(`Processing ${item}`);
});

// ✅ GOOD - Log summary
logger.log(`Processed ${array.length} items`);
```

### 5. Retention Policy

**Config retention**:
- **Hot storage**: 7 days (fast query)
- **Warm storage**: 30 days (slower query)
- **Archive**: > 30 days (cold storage hoặc delete)

---

## 📈 Monitoring Loki Itself

### Add Loki Metrics to Prometheus

Update `prometheus.yml`:

```yaml
scrape_configs:
  # ... existing jobs ...

  - job_name: 'loki'
    static_configs:
      - targets: ['loki:3100']
        labels:
          service: 'loki'
          environment: 'production'

  - job_name: 'promtail'
    static_configs:
      - targets: ['promtail:9080']
        labels:
          service: 'promtail'
          environment: 'production'
```

### Loki Metrics to Monitor

```promql
# Ingestion rate
rate(loki_ingester_chunks_created_total[5m])

# Query performance
histogram_quantile(0.99, rate(loki_request_duration_seconds_bucket[5m]))

# Chunk storage
loki_ingester_memory_chunks

# Failed requests
rate(loki_request_duration_seconds_count{status_code!~"2.."}[5m])
```

---

## 🧪 Testing Plan

### 1. Unit Tests

Test logger service:
```typescript
describe('CustomLoggerService', () => {
  it('should log info messages', () => {
    const logger = new CustomLoggerService();
    logger.log('Test message', 'TestContext');
    // Verify log output
  });

  it('should log errors with stack trace', () => {
    const logger = new CustomLoggerService();
    const error = new Error('Test error');
    logger.error('Error occurred', error.stack, 'TestContext');
    // Verify error log
  });
});
```

### 2. Integration Tests

Test log pipeline:
```bash
# 1. Generate test logs
curl -X POST http://localhost:9200/api/test/log \
  -H "Content-Type: application/json" \
  -d '{"level": "error", "message": "Test error"}'

# 2. Wait for Promtail to ship logs (5 seconds)
sleep 5

# 3. Query Loki
curl -G "http://localhost:3100/loki/api/v1/query" \
  --data-urlencode 'query={job="backend"} |= "Test error"' \
  | jq '.data.result'

# Expected: Should return the test log
```

### 3. Load Tests

Test log ingestion performance:
```bash
# Generate 10000 logs
for i in {1..10000}; do
  echo "Test log $i" >> backend/logs/application-$(date +%Y-%m-%d).log
done

# Monitor Promtail CPU/Memory
docker stats doanhoi-promtail

# Monitor Loki ingestion rate
curl http://localhost:3100/metrics | grep loki_ingester_chunks_created_total
```

---

## 📋 Checklist

### Pre-deployment

- [ ] Create `loki/` directory
- [ ] Create `loki-config.yml`
- [ ] Create `promtail-config.yml`
- [ ] Update `docker-compose.yml`
- [ ] Install Winston dependencies
- [ ] Create logger service
- [ ] Create logger module
- [ ] Create logging interceptor
- [ ] Update main.ts
- [ ] Create Grafana datasource config
- [ ] Create log dashboards
- [ ] Create `backend/logs/` directory
- [ ] Update `.gitignore` (add `backend/logs/*.log`)

### Deployment

- [ ] Start Loki container
- [ ] Start Promtail container
- [ ] Verify Loki health: `curl http://localhost:3100/ready`
- [ ] Verify Promtail health: `curl http://localhost:9080/ready`
- [ ] Start backend with new logger
- [ ] Generate test logs
- [ ] Query logs from Loki
- [ ] Verify logs in Grafana
- [ ] Import dashboards
- [ ] Setup alerts
- [ ] Test log search
- [ ] Test log filtering
- [ ] Document for team

### Post-deployment

- [ ] Monitor Loki resource usage
- [ ] Monitor log ingestion rate
- [ ] Check retention policy working
- [ ] Verify alerts firing correctly
- [ ] Train team on LogQL
- [ ] Create runbook for common queries
- [ ] Setup backup for Loki data (optional)
- [ ] Monitor storage usage

---

## 🚨 Troubleshooting

### Issue 1: Promtail can't connect to Loki

**Symptoms**:
```
level=error msg="error sending batch" error="Post http://loki:3100/loki/api/v1/push: dial tcp: lookup loki: no such host"
```

**Solution**:
```bash
# Check networks
docker network inspect doanhoi-network

# Ensure both Loki and Promtail are on same network
docker-compose up -d loki promtail

# Check Loki logs
docker-compose logs loki
```

### Issue 2: No logs appearing in Grafana

**Debug steps**:
```bash
# 1. Check Promtail is reading files
docker-compose logs promtail | grep "Adding target"

# 2. Check Promtail positions
docker exec doanhoi-promtail cat /tmp/positions.yaml

# 3. Query Loki directly
curl -G "http://localhost:3100/loki/api/v1/labels"

# 4. Check file permissions
ls -la backend/logs/

# 5. Verify log format
tail -f backend/logs/application-*.log
```

### Issue 3: High memory usage

**Solutions**:
```yaml
# Limit Loki memory in docker-compose.yml
loki:
  deploy:
    resources:
      limits:
        memory: 512M

# Reduce retention in loki-config.yml
limits_config:
  retention_period: 168h  # 7 days instead of 30
```

### Issue 4: Slow queries

**Optimization**:
```yaml
# Add more cache in loki-config.yml
query_range:
  results_cache:
    cache:
      embedded_cache:
        enabled: true
        max_size_mb: 500  # Increase cache

# Use query limits
limits_config:
  max_entries_limit_per_query: 5000
  max_query_length: 721h
```

---

## 📚 Resources

### Documentation
- [Grafana Loki Docs](https://grafana.com/docs/loki/latest/)
- [Promtail Configuration](https://grafana.com/docs/loki/latest/clients/promtail/configuration/)
- [LogQL Query Language](https://grafana.com/docs/loki/latest/logql/)
- [Winston Logger](https://github.com/winstonjs/winston)

### Tutorials
- [Loki Setup Guide](https://grafana.com/docs/loki/latest/setup/)
- [LogQL Examples](https://grafana.com/docs/loki/latest/logql/log_queries/)
- [Grafana Dashboards](https://grafana.com/grafana/dashboards/)

### Community
- [Grafana Community](https://community.grafana.com/)
- [Loki GitHub](https://github.com/grafana/loki)

---

## 🎯 Expected Outcomes

### Week 1
- ✅ Loki và Promtail running
- ✅ Backend logs được ship đến Loki
- ✅ Basic log queries working

### Week 2
- ✅ Grafana dashboards created
- ✅ Log alerts configured
- ✅ Team trained on LogQL

### Week 3
- ✅ Production deployment
- ✅ Monitoring và optimization
- ✅ Documentation complete

---

## 💡 Future Enhancements

### 1. Add Tracing with Tempo
- Correlate logs → traces → metrics
- Distributed tracing across services

### 2. Frontend Logging
- Ship browser logs to Loki
- Track client-side errors

### 3. Advanced Analytics
- Machine learning on logs
- Anomaly detection
- Predictive alerts

### 4. Multi-tenancy
- Separate logs per organization
- Access control per tenant

---

**Tác giả**: Đoàn Hội Portal Team  
**Ngày tạo**: November 7, 2025  
**Version**: 1.0.0  
**Status**: 📋 Planning Phase
