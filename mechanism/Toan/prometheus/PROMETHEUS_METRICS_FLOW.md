# 📊 Luồng Hoạt Động của Prometheus Metrics trong Đoàn Hội Portal

> **Tài liệu này mô tả chi tiết cách hệ thống thu thập, lưu trữ và hiển thị metrics (số liệu) thông qua Prometheus và Grafana.**

---

## 🎯 Tổng Quan Kiến Trúc

```
┌─────────────┐       ┌──────────────┐       ┌────────────┐       ┌─────────────┐
│   Backend   │ ───>  │  Prometheus  │ ───>  │  Grafana   │ ───>  │    User     │
│   NestJS    │ /metrics│   Server   │ scrape│ Dashboard  │ view │  (Browser)  │
└─────────────┘       └──────────────┘       └────────────┘       └─────────────┘
      │
      ├─ HTTP Requests
      ├─ Database Queries
      ├─ Import Operations
      └─ System Metrics
```

---

## 📦 Các Thành Phần Chính

### 1. **Backend NestJS** (Thu thập metrics)
- Sử dụng thư viện: `@willsoto/nestjs-prometheus` + `prom-client`
- Expose endpoint: `http://localhost:9200/metrics`
- Thu thập metrics từ mọi request và operation

### 2. **Prometheus Server** (Lưu trữ time-series data)
- Chạy trên port `9090`
- Scrape (lấy) metrics từ backend mỗi 5 giây
- Lưu trữ dữ liệu trong 30 ngày

### 3. **Grafana** (Trực quan hóa)
- Chạy trên port `3002`
- Kết nối với Prometheus làm data source
- Hiển thị dashboard với charts và graphs

---

## 🔧 1. Cấu Hình Backend (NestJS)

### 1.1. Dependencies

```json
// backend/package.json
{
  "dependencies": {
    "@willsoto/nestjs-prometheus": "^6.0.2",
    "prom-client": "^15.1.3"
  }
}
```

### 1.2. Metrics Module

**File: `backend/src/metrics/metrics.module.ts`**

```typescript
@Module({
  imports: [
    PrometheusModule.register({
      defaultMetrics: {
        enabled: true,                    // ✅ Bật default metrics (CPU, Memory, etc.)
        config: {
          prefix: 'doanhoi_',             // Prefix cho mọi metrics
        },
      },
      path: '/metrics',                   // 🌐 Endpoint để Prometheus scrape
      defaultLabels: {
        app: 'doanhoi-portal',
        environment: process.env.NODE_ENV || 'development',
      },
    }),
  ],
  providers: [
    MetricsService,
    
    // 📊 Định nghĩa các metrics custom
    // Counter: Đếm số lượng (chỉ tăng, không giảm)
    makeCounterProvider({
      name: 'doanhoi_http_requests_total',
      help: 'Total number of HTTP requests',
      labelNames: ['method', 'path', 'status'],
    }),
    
    // Histogram: Phân bố giá trị (duration, size, etc.)
    makeHistogramProvider({
      name: 'doanhoi_http_request_duration_seconds',
      help: 'HTTP request duration in seconds',
      labelNames: ['method', 'path'],
      buckets: [0.01, 0.05, 0.1, 0.5, 1, 2, 5, 10],  // Khoảng thời gian
    }),
    
    // Gauge: Giá trị có thể tăng/giảm (active connections, queue size)
    makeGaugeProvider({
      name: 'doanhoi_db_connections_active',
      help: 'Number of active database connections',
      labelNames: [],
    }),
    
    // Database Metrics
    makeHistogramProvider({
      name: 'doanhoi_db_query_duration_seconds',
      help: 'Database query duration in seconds',
      labelNames: ['query_type'],
      buckets: [0.001, 0.005, 0.01, 0.05, 0.1, 0.5, 1],
    }),
    
    // Import Metrics (cho tính năng import Excel)
    makeGaugeProvider({
      name: 'doanhoi_import_sessions_active',
      help: 'Number of active import sessions',
      labelNames: ['type'],
    }),
    makeCounterProvider({
      name: 'doanhoi_import_rows_processed_total',
      help: 'Total number of rows processed',
      labelNames: ['type'],
    }),
    makeCounterProvider({
      name: 'doanhoi_import_rows_failed_total',
      help: 'Total number of rows failed',
      labelNames: ['type'],
    }),
    makeHistogramProvider({
      name: 'doanhoi_import_duration_seconds',
      help: 'Import operation duration in seconds',
      labelNames: ['type'],
      buckets: [1, 5, 10, 30, 60, 120, 300],
    }),
  ],
  exports: [MetricsService],
})
export class MetricsModule { }
```

**🔑 Giải thích:**

- **Counter**: Đếm số lượng events (HTTP requests, errors, processed rows)
  - Chỉ tăng, không bao giờ giảm
  - Reset về 0 khi service restart
  
- **Histogram**: Theo dõi phân bố giá trị
  - Duration của requests
  - Size của file uploads
  - Tính toán: average, percentile (p50, p95, p99)
  - Có `buckets` để nhóm giá trị
  
- **Gauge**: Giá trị snapshot tại thời điểm hiện tại
  - Active connections
  - Queue size
  - Memory usage
  - Có thể tăng/giảm

### 1.3. Metrics Service

**File: `backend/src/metrics/metrics.service.ts`**

```typescript
@Injectable()
export class MetricsService {
  constructor(
    @InjectMetric('doanhoi_http_requests_total')
    public httpRequestsCounter: Counter<string>,
    
    @InjectMetric('doanhoi_http_request_duration_seconds')
    public httpRequestDuration: Histogram<string>,
    
    // ... other metrics
  ) { }
  
  /**
   * 📝 Record HTTP request metrics
   * Được gọi bởi MetricsInterceptor sau mỗi request
   */
  recordHttpRequest(method: string, path: string, statusCode: number, duration: number) {
    // Tăng counter với labels
    this.httpRequestsCounter
      .labels(method, path, statusCode.toString())
      .inc();
    
    // Record duration vào histogram
    this.httpRequestDuration
      .labels(method, path)
      .observe(duration);
  }
  
  /**
   * 📊 Record import session metrics
   */
  recordImportSession(sessionType: string, rowsProcessed: number, failed: number, duration: number) {
    this.importRowsProcessed.labels(sessionType).inc(rowsProcessed);
    this.importRowsFailed.labels(sessionType).inc(failed);
    this.importDuration.labels(sessionType).observe(duration);
  }
  
  // ... other recording methods
}
```

### 1.4. Metrics Interceptor

**File: `backend/src/common/interceptors/metrics.interceptor.ts`**

```typescript
@Injectable()
export class MetricsInterceptor implements NestInterceptor {
  constructor(private readonly metricsService: MetricsService) { }
  
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const response = context.switchToHttp().getResponse();
    const startTime = Date.now();  // ⏱️ Bắt đầu đếm thời gian
    
    return next.handle().pipe(
      tap(() => {
        // ✅ Request thành công
        const duration = (Date.now() - startTime) / 1000;  // Convert to seconds
        const path = request.route?.path || request.url;
        const method = request.method;
        const statusCode = response.statusCode;
        
        // 📊 Ghi metrics
        this.metricsService.recordHttpRequest(method, path, statusCode, duration);
      }),
      catchError((error) => {
        // ❌ Request thất bại
        const duration = (Date.now() - startTime) / 1000;
        const statusCode = error.status || 500;
        
        // 📊 Ghi metrics cho error
        this.metricsService.recordHttpRequest(
          request.method,
          request.route?.path || request.url,
          statusCode,
          duration
        );
        
        return throwError(() => error);
      })
    );
  }
}
```

**🔑 Cách hoạt động:**

1. **Intercept mọi HTTP request** trước khi đến controller
2. **Ghi lại thời điểm bắt đầu** (`startTime`)
3. **Chờ request hoàn thành** (thành công hoặc thất bại)
4. **Tính duration** = thời gian kết thúc - thời gian bắt đầu
5. **Gọi MetricsService** để record metrics
6. **Prometheus sẽ scrape** metrics này sau

### 1.5. Register Interceptor Globally

**File: `backend/src/main.ts`**

```typescript
async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  
  // 🔧 Lấy MetricsService instance
  const metricsService = app.get(MetricsService);
  
  // 🌐 Apply MetricsInterceptor cho MỌI request
  app.useGlobalInterceptors(new MetricsInterceptor(metricsService));
  
  await app.listen(9200);
  console.log('🚀 Backend running on http://localhost:9200');
  console.log('📊 Metrics endpoint: http://localhost:9200/metrics');  // ← Prometheus scrape URL
}
```

### 1.6. Import vào App Module

**File: `backend/src/app.module.ts`**

```typescript
@Module({
  imports: [
    // ... other modules
    MetricsModule,  // ✅ Import để enable metrics
  ],
})
export class AppModule { }
```

---

## 🔍 2. Metrics Endpoint Format

Khi truy cập `http://localhost:9200/metrics`, bạn sẽ thấy format Prometheus:

```prometheus
# HELP doanhoi_http_requests_total Total number of HTTP requests
# TYPE doanhoi_http_requests_total counter
doanhoi_http_requests_total{method="GET",path="/api/users",status="200",app="doanhoi-portal",environment="development"} 142

# HELP doanhoi_http_request_duration_seconds HTTP request duration in seconds
# TYPE doanhoi_http_request_duration_seconds histogram
doanhoi_http_request_duration_seconds_bucket{method="GET",path="/api/users",le="0.01"} 50
doanhoi_http_request_duration_seconds_bucket{method="GET",path="/api/users",le="0.05"} 120
doanhoi_http_request_duration_seconds_bucket{method="GET",path="/api/users",le="0.1"} 140
doanhoi_http_request_duration_seconds_bucket{method="GET",path="/api/users",le="+Inf"} 142
doanhoi_http_request_duration_seconds_sum{method="GET",path="/api/users"} 6.824
doanhoi_http_request_duration_seconds_count{method="GET",path="/api/users"} 142

# HELP doanhoi_db_connections_active Number of active database connections
# TYPE doanhoi_db_connections_active gauge
doanhoi_db_connections_active 5

# HELP doanhoi_import_sessions_active Number of active import sessions
# TYPE doanhoi_import_sessions_active gauge
doanhoi_import_sessions_active{type="user"} 2
doanhoi_import_sessions_active{type="organization"} 0
```

**🔑 Giải thích format:**

- **# HELP**: Mô tả metric
- **# TYPE**: Loại metric (counter, gauge, histogram)
- **Labels**: `{method="GET",path="/api/users"}` - để filter và group by
- **Value**: Giá trị số (counter: tổng số, gauge: giá trị hiện tại)
- **Histogram buckets**: Đếm số lượng observations trong từng khoảng
- **_sum**: Tổng tất cả giá trị
- **_count**: Tổng số observations

---

## ⚙️ 3. Cấu Hình Prometheus

### 3.1. Prometheus Configuration

**File: `prometheus.yml`**

```yaml
global:
  scrape_interval: 5s        # 🔄 Lấy metrics mỗi 5 giây
  evaluation_interval: 5s    # 📊 Evaluate rules mỗi 5 giây
  scrape_timeout: 4s         # ⏱️ Timeout sau 4 giây

scrape_configs:
  # 🎯 Job 1: Scrape Prometheus itself
  - job_name: 'prometheus'
    static_configs:
      - targets: ['localhost:9090']
        labels:
          service: 'prometheus'
          environment: 'production'
  
  # 🎯 Job 2: Scrape Backend API
  - job_name: 'doanhoi-backend'
    scrape_interval: 5s
    metrics_path: '/metrics'   # 🌐 Endpoint để scrape
    static_configs:
      - targets: ['host.docker.internal:9200']  # Backend URL
        labels:
          service: 'backend'
          app: 'doanhoi-portal'
          environment: 'production'
    relabel_configs:
      - source_labels: [__address__]
        target_label: instance
        replacement: 'doanhoi-backend'
```

**🔑 Giải thích:**

- **scrape_interval**: Prometheus sẽ gọi `GET http://localhost:9200/metrics` mỗi 5 giây
- **targets**: Địa chỉ của backend
  - `host.docker.internal` (Windows/Mac): Truy cập host machine từ Docker
  - `backend:9200` (Linux): Nếu backend chạy trong Docker compose
- **labels**: Thêm metadata cho metrics
- **metrics_path**: Đường dẫn endpoint metrics

### 3.2. Docker Compose Setup

**File: `docker-compose.yml`**

```yaml
services:
  # 🗄️ Prometheus Server
  prometheus:
    image: prom/prometheus:latest
    container_name: doanhoi-prometheus
    volumes:
      - ./prometheus.yml:/etc/prometheus/prometheus.yml  # Mount config
      - prometheus_data:/prometheus                      # Persistent storage
    ports:
      - "9090:9090"                                       # 🌐 Prometheus UI
    command:
      - '--config.file=/etc/prometheus/prometheus.yml'
      - '--storage.tsdb.path=/prometheus'
      - '--storage.tsdb.retention.time=30d'              # 🗓️ Giữ data 30 ngày
      - '--web.enable-lifecycle'
    networks:
      - doanhoi-network
    restart: unless-stopped
  
  # 📊 Grafana Dashboard
  grafana:
    image: grafana/grafana:latest
    container_name: doanhoi-grafana
    ports:
      - "3002:3000"                                       # 🌐 Grafana UI
    environment:
      - GF_SECURITY_ADMIN_USER=admin
      - GF_SECURITY_ADMIN_PASSWORD=admin123
      - GF_SERVER_ROOT_URL=http://localhost:3002
    volumes:
      - grafana_data:/var/lib/grafana
      - ./grafana/provisioning:/etc/grafana/provisioning  # Auto-import dashboards
    networks:
      - doanhoi-network
    depends_on:
      - prometheus
    restart: unless-stopped

volumes:
  prometheus_data:
    driver: local
  grafana_data:
    driver: local
```

---

## 🔄 4. Luồng Hoạt Động Chi Tiết

### 4.1. Request Flow

```
1️⃣ User gửi request
   ↓
   GET /api/users

2️⃣ MetricsInterceptor.intercept() - BẮT ĐẦU
   ↓
   - Lưu startTime = Date.now()
   - next.handle() → Chuyển đến Controller

3️⃣ Controller xử lý request
   ↓
   - UsersController.findAll()
   - UsersService.getAllUsers()
   - Database query

4️⃣ Response trả về
   ↓
   200 OK { users: [...] }

5️⃣ MetricsInterceptor.tap() - KẾT THÚC
   ↓
   - duration = (Date.now() - startTime) / 1000
   - metricsService.recordHttpRequest('GET', '/api/users', 200, 0.123)

6️⃣ MetricsService ghi metrics
   ↓
   - httpRequestsCounter.labels('GET', '/api/users', '200').inc()
   - httpRequestDuration.labels('GET', '/api/users').observe(0.123)

7️⃣ Metrics được lưu trong memory (prom-client)
   ↓
   - Chờ Prometheus scrape
```

### 4.2. Prometheus Scrape Flow

```
⏰ Mỗi 5 giây, Prometheus thực hiện:

1️⃣ Gửi HTTP GET request
   ↓
   GET http://localhost:9200/metrics

2️⃣ Backend trả về metrics
   ↓
   doanhoi_http_requests_total{method="GET",path="/api/users",status="200"} 142
   doanhoi_http_request_duration_seconds_sum{method="GET",path="/api/users"} 6.824
   ...

3️⃣ Prometheus parse và lưu vào time-series database
   ↓
   - Timestamp: 2025-11-09 10:30:00
   - Metric: doanhoi_http_requests_total
   - Labels: {method="GET", path="/api/users", status="200"}
   - Value: 142

4️⃣ Lặp lại mỗi 5 giây
```

### 4.3. Grafana Query Flow

```
1️⃣ User mở Grafana Dashboard
   ↓
   http://localhost:3002

2️⃣ Grafana gửi PromQL query đến Prometheus
   ↓
   rate(doanhoi_http_requests_total[5m])

3️⃣ Prometheus tính toán từ time-series data
   ↓
   - Lấy data trong 5 phút gần nhất
   - Tính rate (số requests/giây)
   - Trả về kết quả

4️⃣ Grafana vẽ graph
   ↓
   - Time series chart
   - X-axis: Time
   - Y-axis: Requests/sec

5️⃣ Auto refresh mỗi 5 giây
```

---

## 📈 5. Các Metrics Đang Thu Thập

### 5.1. HTTP Request Metrics

| Metric Name | Type | Description | Labels |
|------------|------|-------------|--------|
| `doanhoi_http_requests_total` | Counter | Tổng số HTTP requests | method, path, status |
| `doanhoi_http_request_duration_seconds` | Histogram | Thời gian xử lý request | method, path |

**Ví dụ sử dụng:**
```promql
# Request rate (requests/second) trong 5 phút
rate(doanhoi_http_requests_total[5m])

# Average response time
rate(doanhoi_http_request_duration_seconds_sum[5m]) 
/ 
rate(doanhoi_http_request_duration_seconds_count[5m])

# P95 response time
histogram_quantile(0.95, rate(doanhoi_http_request_duration_seconds_bucket[5m]))

# Error rate (status 5xx)
rate(doanhoi_http_requests_total{status=~"5.."}[5m])
```

### 5.2. Database Metrics

| Metric Name | Type | Description | Labels |
|------------|------|-------------|--------|
| `doanhoi_db_query_duration_seconds` | Histogram | Thời gian query database | query_type |
| `doanhoi_db_connections_active` | Gauge | Số connection đang active | - |

### 5.3. Import Operation Metrics

| Metric Name | Type | Description | Labels |
|------------|------|-------------|--------|
| `doanhoi_import_sessions_active` | Gauge | Số session import đang chạy | type |
| `doanhoi_import_rows_processed_total` | Counter | Tổng số rows đã xử lý | type |
| `doanhoi_import_rows_failed_total` | Counter | Tổng số rows failed | type |
| `doanhoi_import_duration_seconds` | Histogram | Thời gian import | type |

**Ví dụ sử dụng:**
```promql
# Số users được import trong 1 giờ
increase(doanhoi_import_rows_processed_total{type="user"}[1h])

# Tỉ lệ import thất bại
rate(doanhoi_import_rows_failed_total[5m]) 
/ 
rate(doanhoi_import_rows_processed_total[5m]) 
* 100

# Average import duration
rate(doanhoi_import_duration_seconds_sum[5m]) 
/ 
rate(doanhoi_import_duration_seconds_count[5m])
```

### 5.4. Default System Metrics (từ prom-client)

> **📌 Lưu ý:** Các metrics này được **tự động thu thập** bởi `prom-client` khi enable `defaultMetrics: { enabled: true }` trong `MetricsModule`. Không cần code thêm gì!

#### CPU Metrics

| Metric Name | Type | Description | Unit |
|------------|------|-------------|------|
| `process_cpu_user_seconds_total` | Counter | Tổng thời gian CPU spent ở user mode | seconds |
| `process_cpu_system_seconds_total` | Counter | Tổng thời gian CPU spent ở system mode | seconds |
| `process_cpu_seconds_total` | Counter | Tổng thời gian CPU (user + system) | seconds |

**Query ví dụ:**
```promql
# CPU usage percentage (last 5 minutes)
rate(process_cpu_user_seconds_total[5m]) * 100

# Total CPU usage (user + system)
rate(process_cpu_seconds_total[5m]) * 100
```

#### Memory Metrics

| Metric Name | Type | Description | Unit |
|------------|------|-------------|------|
| `process_resident_memory_bytes` | Gauge | Resident Set Size (RAM đang dùng) | bytes |
| `process_virtual_memory_bytes` | Gauge | Virtual memory size | bytes |
| `process_heap_bytes` | Gauge | Process heap size | bytes |
| `nodejs_heap_size_total_bytes` | Gauge | Total size của V8 heap | bytes |
| `nodejs_heap_size_used_bytes` | Gauge | Used size của V8 heap | bytes |
| `nodejs_heap_space_size_total_bytes` | Gauge | Total size của từng heap space | bytes |
| `nodejs_heap_space_size_used_bytes` | Gauge | Used size của từng heap space | bytes |
| `nodejs_heap_space_size_available_bytes` | Gauge | Available size của từng heap space | bytes |
| `nodejs_external_memory_bytes` | Gauge | Memory dùng bởi C++ objects bound to JS | bytes |

**Query ví dụ:**
```promql
# Memory usage percentage
(nodejs_heap_size_used_bytes / nodejs_heap_size_total_bytes) * 100

# Memory in MB
nodejs_heap_size_used_bytes / 1024 / 1024

# RSS Memory (actual RAM usage)
process_resident_memory_bytes / 1024 / 1024
```

#### Event Loop Metrics

| Metric Name | Type | Description | Unit |
|------------|------|-------------|------|
| `nodejs_eventloop_lag_seconds` | Gauge | Event loop lag (độ trễ) | seconds |
| `nodejs_eventloop_lag_min_seconds` | Gauge | Min lag trong window | seconds |
| `nodejs_eventloop_lag_max_seconds` | Gauge | Max lag trong window | seconds |
| `nodejs_eventloop_lag_mean_seconds` | Gauge | Mean lag trong window | seconds |
| `nodejs_eventloop_lag_stddev_seconds` | Gauge | Standard deviation của lag | seconds |
| `nodejs_eventloop_lag_p50_seconds` | Gauge | 50th percentile lag | seconds |
| `nodejs_eventloop_lag_p90_seconds` | Gauge | 90th percentile lag | seconds |
| `nodejs_eventloop_lag_p99_seconds` | Gauge | 99th percentile lag | seconds |

**Query ví dụ:**
```promql
# Event loop lag in milliseconds
nodejs_eventloop_lag_seconds * 1000

# Alert nếu lag > 100ms
nodejs_eventloop_lag_seconds > 0.1
```

**🔑 Giải thích Event Loop Lag:**
- Event loop lag là thời gian chờ giữa khi một callback được schedule và khi nó thực sự chạy
- Lag cao → Server đang quá tải hoặc có blocking operations
- **Healthy lag**: < 50ms
- **Warning lag**: 50-100ms
- **Critical lag**: > 100ms

#### Garbage Collection Metrics

| Metric Name | Type | Description | Unit |
|------------|------|-------------|------|
| `nodejs_gc_duration_seconds` | Histogram | Thời gian GC mất | seconds |
| `nodejs_gc_runs_total` | Counter | Tổng số lần GC chạy | count |

**Query ví dụ:**
```promql
# GC rate (times per second)
rate(nodejs_gc_runs_total[5m])

# Average GC duration
rate(nodejs_gc_duration_seconds_sum[5m]) / rate(nodejs_gc_duration_seconds_count[5m])
```

#### Process Metrics

| Metric Name | Type | Description | Unit |
|------------|------|-------------|------|
| `process_open_fds` | Gauge | Số file descriptors đang mở | count |
| `process_max_fds` | Gauge | Số max file descriptors | count |
| `process_start_time_seconds` | Gauge | Unix timestamp khi process start | seconds |
| `process_uptime_seconds` | Counter | Thời gian process đã chạy | seconds |

**Query ví dụ:**
```promql
# Process uptime in hours
process_uptime_seconds / 3600

# File descriptor usage percentage
(process_open_fds / process_max_fds) * 100
```

#### Node.js Version Info

| Metric Name | Type | Description |
|------------|------|-------------|
| `nodejs_version_info` | Gauge | Node.js version info (labels: version, major, minor, patch) |

**Query ví dụ:**
```promql
# Get Node.js version
nodejs_version_info
```

---

### 5.5. Cách Metrics được Thu Thập Tự Động

**File: `backend/src/metrics/metrics.module.ts`**

```typescript
PrometheusModule.register({
  defaultMetrics: {
    enabled: true,              // ✅ Bật auto-collect metrics
    config: {
      prefix: 'doanhoi_',       // Prefix cho custom metrics
      // Default metrics sẽ KHÔNG có prefix
      // Vì chúng follow chuẩn Prometheus naming
    },
  },
  // ...
})
```

**🔑 Cách hoạt động:**

1. **Khi enable `defaultMetrics`**, `prom-client` tự động bắt đầu collect metrics
2. **Metrics được update** định kỳ (mỗi 10 giây mặc định)
3. **Không cần code thêm**, chỉ cần enable trong config
4. **Metrics xuất hiện** tại `/metrics` endpoint cùng với custom metrics

**Xem default metrics:**
```bash
curl http://localhost:9200/metrics | grep "process_\|nodejs_"
```

**Output ví dụ:**
```prometheus
# HELP process_cpu_user_seconds_total Total user CPU time spent in seconds.
# TYPE process_cpu_user_seconds_total counter
process_cpu_user_seconds_total 2.345

# HELP process_resident_memory_bytes Resident memory size in bytes.
# TYPE process_resident_memory_bytes gauge
process_resident_memory_bytes 52428800

# HELP nodejs_heap_size_used_bytes Used heap size in bytes.
# TYPE nodejs_heap_size_used_bytes gauge
nodejs_heap_size_used_bytes 15728640

# HELP nodejs_eventloop_lag_seconds Lag of event loop in seconds.
# TYPE nodejs_eventloop_lag_seconds gauge
nodejs_eventloop_lag_seconds 0.00234
```

---

## 🎯 6. Use Cases Thực Tế

### Use Case 1: Monitor API Performance

**Mục tiêu:** Theo dõi response time của endpoint `/api/users`

**PromQL Query:**
```promql
histogram_quantile(0.95, 
  rate(doanhoi_http_request_duration_seconds_bucket{path="/api/users"}[5m])
)
```

**Giải thích:**
- Lấy 95th percentile của response time
- Nghĩa là: 95% requests có response time ≤ giá trị này
- Nếu kết quả > 1s → cần optimize

### Use Case 2: Detect High Error Rate

**Mục tiêu:** Alert khi error rate > 5%

**PromQL Query:**
```promql
(
  rate(doanhoi_http_requests_total{status=~"5.."}[5m])
  /
  rate(doanhoi_http_requests_total[5m])
) * 100 > 5
```

**Alert Rule (alerts.yml):**
```yaml
groups:
  - name: api_alerts
    interval: 10s
    rules:
      - alert: HighErrorRate
        expr: |
          (
            rate(doanhoi_http_requests_total{status=~"5.."}[5m])
            /
            rate(doanhoi_http_requests_total[5m])
          ) * 100 > 5
        for: 2m
        labels:
          severity: critical
        annotations:
          summary: "High error rate detected"
          description: "Error rate is {{ $value }}% (threshold: 5%)"
```

### Use Case 3: Monitor Import Operations

**Mục tiêu:** Theo dõi số lượng và tỉ lệ thành công của import

**Grafana Dashboard Query:**
```promql
# Panel 1: Import throughput
rate(doanhoi_import_rows_processed_total[5m])

# Panel 2: Success rate
(
  rate(doanhoi_import_rows_processed_total[5m])
  -
  rate(doanhoi_import_rows_failed_total[5m])
) 
/ 
rate(doanhoi_import_rows_processed_total[5m]) 
* 100

# Panel 3: Active sessions
doanhoi_import_sessions_active
```

### Use Case 4: Resource Usage Monitoring

**Mục tiêu:** Theo dõi memory và CPU

**PromQL Query:**
```promql
# Memory usage percentage
(nodejs_heap_size_used_bytes / nodejs_heap_size_total_bytes) * 100

# CPU usage (rate of CPU seconds)
rate(process_cpu_user_seconds_total[5m]) * 100

# Event loop lag (should be < 100ms)
nodejs_eventloop_lag_seconds * 1000
```

---

## 🚀 7. Cách Sử Dụng

### 7.1. Start Services

```bash
# 1. Start Prometheus & Grafana
docker-compose up -d prometheus grafana

# 2. Start Backend (ở terminal khác)
cd backend
npm run start:dev

# 3. Verify metrics endpoint
curl http://localhost:9200/metrics
```

### 7.2. Access Dashboards

| Service | URL | Credentials |
|---------|-----|-------------|
| Backend Metrics | http://localhost:9200/metrics | - |
| Prometheus UI | http://localhost:9090 | - |
| Grafana Dashboard | http://localhost:3002 | admin / admin123 |

### 7.3. Prometheus UI

1. Mở http://localhost:9090
2. Click "Status" → "Targets" → Xem backend status
3. Click "Graph" → Nhập PromQL query:
   ```promql
   rate(doanhoi_http_requests_total[5m])
   ```
4. Click "Execute" → Xem graph

### 7.4. Grafana Setup

**Lần đầu tiên:**

1. Mở http://localhost:3002
2. Login: admin / admin123
3. Add Data Source:
   - Click "⚙️ Configuration" → "Data Sources"
   - Click "Add data source"
   - Chọn "Prometheus"
   - URL: `http://prometheus:9090`
   - Click "Save & Test"

**Import Dashboard:**

1. Click "+" → "Import"
2. Upload JSON file từ `grafana/provisioning/dashboards/`
3. Hoặc tạo dashboard mới với các panel:
   - **HTTP Request Rate**: `rate(doanhoi_http_requests_total[5m])`
   - **Response Time P95**: `histogram_quantile(0.95, rate(doanhoi_http_request_duration_seconds_bucket[5m]))`
   - **Error Rate**: `rate(doanhoi_http_requests_total{status=~"5.."}[5m])`
   - **Active DB Connections**: `doanhoi_db_connections_active`

---

## 🔍 8. Debugging & Troubleshooting

### Issue 1: Backend metrics không hiện

**Kiểm tra:**
```bash
# 1. Check endpoint có response không
curl http://localhost:9200/metrics

# 2. Check MetricsModule có được import không
grep -r "MetricsModule" backend/src/app.module.ts

# 3. Check MetricsInterceptor có được register không
grep -r "MetricsInterceptor" backend/src/main.ts

# 4. Check logs
cd backend
npm run start:dev
# Xem console log khi start
```

### Issue 2: Prometheus không scrape được backend

**Kiểm tra:**
```bash
# 1. Check Prometheus targets
# Mở http://localhost:9090/targets
# Target "doanhoi-backend" phải có status "UP"

# 2. Nếu status "DOWN", check network
docker exec -it doanhoi-prometheus ping host.docker.internal

# 3. Check backend có chạy không
curl http://localhost:9200/health

# 4. Check prometheus.yml config
cat prometheus.yml
```

### Issue 3: Metrics data không đủ

**Solution:**
```bash
# 1. Generate traffic để có data
for i in {1..100}; do
  curl http://localhost:9200/api/users
  sleep 0.1
done

# 2. Đợi Prometheus scrape (5 giây)
sleep 10

# 3. Query lại trong Prometheus UI
rate(doanhoi_http_requests_total[5m])
```

### Issue 4: Grafana không connect được Prometheus

**Solution:**
```bash
# 1. Check Prometheus có chạy không
docker ps | grep prometheus

# 2. Check network
docker exec -it doanhoi-grafana ping prometheus

# 3. Trong Grafana, dùng URL:
# - http://prometheus:9090 (nếu cùng Docker network)
# - http://host.docker.internal:9090 (nếu khác network)

# 4. Test query trong Grafana Explore
up{job="doanhoi-backend"}
```

---

## 📚 9. Best Practices

### 9.1. Naming Conventions

✅ **Good:**
```typescript
doanhoi_http_requests_total           // Clear, specific
doanhoi_db_query_duration_seconds     // Include unit in name
doanhoi_import_rows_processed_total   // Use _total for counters
```

❌ **Bad:**
```typescript
requests                   // Too generic
query_time                 // Missing unit
processed                  // Missing context
```

### 9.2. Label Usage

✅ **Good:**
```typescript
// Limited labels, high cardinality control
httpRequestsCounter.labels(method, path, status)

// Labels có limited values:
// method: GET, POST, PUT, DELETE (4 values)
// path: /api/users, /api/organizations (limited endpoints)
// status: 200, 400, 404, 500 (limited status codes)
```

❌ **Bad:**
```typescript
// Too many labels → high cardinality
httpRequestsCounter.labels(method, path, status, userId, timestamp, requestId)

// Dynamic label values
httpRequestsCounter.labels(method, dynamicPath, status)
// Nếu dynamicPath có thể là bất kỳ giá trị nào → infinite cardinality
```

**⚠️ High Cardinality Problem:**
- Mỗi unique combination của labels = 1 time series
- VD: `{method="GET", path="/api/users/:id", status="200"}` với 10,000 users = 10,000 time series
- Quá nhiều time series → Prometheus chậm, tốn memory

### 9.3. Histogram Buckets

```typescript
// ✅ Reasonable buckets for different use cases

// HTTP API (milliseconds range)
buckets: [0.01, 0.05, 0.1, 0.5, 1, 2, 5, 10]  // 10ms đến 10s

// Database queries (fast)
buckets: [0.001, 0.005, 0.01, 0.05, 0.1, 0.5, 1]  // 1ms đến 1s

// Import operations (long-running)
buckets: [1, 5, 10, 30, 60, 120, 300]  // 1s đến 5 phút
```

### 9.4. Counter vs Gauge

**Counter:** Đếm events (chỉ tăng)
```typescript
// ✅ Use counter for:
- Total HTTP requests
- Total errors
- Total rows processed
- Total bytes sent

// Query với rate():
rate(doanhoi_http_requests_total[5m])  // Requests/second
```

**Gauge:** Snapshot giá trị (có thể tăng/giảm)
```typescript
// ✅ Use gauge for:
- Active connections
- Queue size
- Temperature
- Current memory usage

// Query trực tiếp:
doanhoi_db_connections_active  // Current value
```

---

## 🎓 10. Tóm Tắt

### Luồng Hoạt Động Tổng Quát

```
🔄 Continuous Loop:

1. User Request → Backend NestJS
   └─ MetricsInterceptor records metrics
   └─ MetricsService updates prom-client counters/histograms

2. Prometheus scrapes /metrics endpoint (mỗi 5s)
   └─ Parse metrics format
   └─ Store in time-series database

3. Grafana queries Prometheus (via PromQL)
   └─ Calculate aggregations (rate, sum, avg, percentile)
   └─ Render charts/graphs

4. Admin xem dashboard
   └─ Real-time monitoring
   └─ Alert nếu có vấn đề
```

### Key Components

1. **@willsoto/nestjs-prometheus**: NestJS module wrapper for prom-client
2. **prom-client**: Node.js library to expose metrics
3. **MetricsModule**: Define các metrics (counter, histogram, gauge)
4. **MetricsService**: Provide methods to record metrics
5. **MetricsInterceptor**: Auto-record HTTP request metrics
6. **Prometheus**: Scrape và store time-series data
7. **Grafana**: Visualize metrics với dashboards

### Metrics Types Summary

| Type | Description | Use Cases | Query Method |
|------|-------------|-----------|--------------|
| **Counter** | Chỉ tăng, reset khi restart | HTTP requests, errors, processed items | `rate()`, `increase()` |
| **Gauge** | Tăng/giảm, snapshot | Active connections, queue size, memory | Direct value |
| **Histogram** | Phân bố giá trị, có buckets | Duration, size | `histogram_quantile()` |

### URLs Reference

- **Backend Metrics**: http://localhost:9200/metrics
- **Prometheus UI**: http://localhost:9090
- **Grafana Dashboard**: http://localhost:3002 (admin/admin123)
- **API Documentation**: http://localhost:9200/api

---

## 📖 Resources

- **Prometheus Docs**: https://prometheus.io/docs/
- **Grafana Docs**: https://grafana.com/docs/
- **PromQL Tutorial**: https://prometheus.io/docs/prometheus/latest/querying/basics/
- **NestJS Prometheus**: https://github.com/willsoto/nestjs-prometheus
- **prom-client**: https://github.com/siimon/prom-client

---

**📝 Document Version:** 1.0  
**📅 Last Updated:** November 9, 2025  
**👤 Author:** Toàn  
**📧 Contact:** For questions or updates
