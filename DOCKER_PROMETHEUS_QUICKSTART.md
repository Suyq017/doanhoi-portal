# 🚀 Docker Compose Prometheus Setup - Quick Start

## 📋 Những gì đã được cấu hình

### Services được thêm/cập nhật:

1. **Prometheus** (Port 9090)
   - Persistent data với volume `prometheus_data`
   - Retention time: 30 days
   - Auto reload config với `--web.enable-lifecycle`
   - Container name: `doanhoi-prometheus`

2. **Grafana** (Port 3002)
   - Admin credentials: `admin` / `admin123`
   - Auto-provisioned Prometheus data source
   - Persistent data với volume `grafana_data`
   - Container name: `doanhoi-grafana`

3. **Volumes mới:**
   - `prometheus_data` - Lưu trữ metrics data
   - `grafana_data` - Lưu trữ dashboards và settings

## 🎯 Cách sử dụng

### 1. Start tất cả services

```bash
docker-compose up -d
```

### 2. Kiểm tra services đang chạy

```bash
docker-compose ps
```

Expected output:
```
NAME                  STATUS    PORTS
doanhoi-postgres      Up        0.0.0.0:9000->5432/tcp
doanhoi-pgadmin       Up        0.0.0.0:9001->80/tcp
doanhoi-prometheus    Up        0.0.0.0:9090->9090/tcp
doanhoi-grafana       Up        0.0.0.0:3002->3000/tcp
```

### 3. Access các services

| Service | URL | Credentials |
|---------|-----|-------------|
| **Prometheus** | http://localhost:9090 | No login required |
| **Grafana** | http://localhost:3002 | admin / admin123 |
| **PgAdmin** | http://localhost:9001 | admin@doanhoi.com / admin123 |

### 4. Kiểm tra Prometheus đang scrape metrics

1. Mở http://localhost:9090
2. Click "Status" → "Targets"
3. Kiểm tra:
   - ✅ `prometheus` (localhost:9090) - Should be UP
   - ⏳ `doanhoi-backend` (host.docker.internal:3001) - Sẽ UP sau khi backend expose /metrics

### 5. Stop services

```bash
docker-compose down
```

### 6. Stop và xóa volumes (careful!)

```bash
docker-compose down -v
```

## 🔧 Configuration Files

### prometheus.yml

Cấu hình scrape targets:

```yaml
scrape_configs:
  # Prometheus tự monitor chính nó
  - job_name: 'prometheus'
    static_configs:
      - targets: ['localhost:9090']

  # Backend API của bạn
  - job_name: 'doanhoi-backend'
    metrics_path: '/metrics'
    static_configs:
      - targets: ['host.docker.internal:3001']
```

**Lưu ý về target URL:**
- **Windows/Mac Docker Desktop**: Dùng `host.docker.internal:3001`
- **Linux**: Dùng `172.17.0.1:3001` hoặc host IP
- **Backend trong Docker Compose**: Dùng `backend:3001`

### Grafana Provisioning

Tự động cấu hình:
- **Data Source**: Prometheus (http://prometheus:9090)
- **Data Source UID**: PBFA97CFB590B2093 (used by imported dashboards)
- **Dashboard Provider**: Folder để import dashboards

Files:
```
grafana/
  provisioning/
    datasources/
      prometheus.yml      # Auto-configure Prometheus with UID
    dashboards/
      dashboard.yml       # Dashboard provider config
```

## 🎨 Tạo Grafana Dashboard

### Option 1: Import dashboard có sẵn

1. Vào Grafana: http://localhost:3002
2. Login với `admin` / `admin123`
3. Click "+" → "Import"
4. Nhập Dashboard ID: **1860** (Node Exporter Full)
5. Select "Prometheus" data source
6. Click "Import"

### Option 2: Tạo dashboard custom

1. Click "+" → "Create Dashboard"
2. Add new panel
3. Chọn metric query, ví dụ:
   ```promql
   rate(doanhoi_http_requests_total[1m])
   ```
4. Customize visualization
5. Save dashboard

## 📊 Useful PromQL Queries

### HTTP Request Rate
```promql
rate(doanhoi_http_requests_total[1m])
```

### 95th Percentile Response Time
```promql
histogram_quantile(0.95, 
  rate(doanhoi_http_request_duration_seconds_bucket[5m])
)
```

### Import Performance
```promql
doanhoi_org_import_validation_duration_seconds
```

### Memory Usage
```promql
nodejs_heap_size_used_bytes / nodejs_heap_size_total_bytes * 100
```

### Active Import Sessions
```promql
doanhoi_import_sessions_active
```

## 🔄 Reload Prometheus Config

Sau khi thay đổi `prometheus.yml`:

### Method 1: Restart container
```bash
docker-compose restart prometheus
```

### Method 2: Hot reload (vì đã enable --web.enable-lifecycle)
```bash
curl -X POST http://localhost:9090/-/reload
```

## 🐛 Troubleshooting

### 1. Backend target DOWN trong Prometheus

**Check 1:** Backend có đang chạy và expose /metrics?
```bash
curl http://localhost:3001/metrics
```

**Check 2:** Nếu backend chưa implement /metrics endpoint
- Follow PROMETHEUS_MONITORING_SETUP_GUIDE.md
- Cài đặt `@willsoto/nestjs-prometheus`
- Tạo MetricsModule

**Check 3:** Target URL có đúng không?
- Windows/Mac: `host.docker.internal:3001`
- Linux: `172.17.0.1:3001` hoặc host IP
- Trong Docker: `backend:3001`

### 2. Grafana không kết nối Prometheus

**Check:** Xem logs
```bash
docker-compose logs grafana
```

**Check:** Test connection từ Grafana container
```bash
docker-compose exec grafana sh -c "wget -qO- http://prometheus:9090/api/v1/query?query=up"
```

**Fix 1:** Restart Grafana
```bash
docker-compose restart grafana
```

**Fix 2:** Nếu dashboard báo "Failed getting data source"
- Kiểm tra datasource có UID trong `grafana/provisioning/datasources/prometheus.yml`
- UID phải match với dashboard variable (vd: `PBFA97CFB590B2093`)
- Restart Grafana sau khi sửa config

### 3. Data không hiển thị trong Grafana

**Check 1:** Prometheus có data không?
- Vào http://localhost:9090
- Query: `up`
- Should see prometheus=1

**Check 2:** Time range có đúng không?
- Top right corner trong Grafana
- Set to "Last 5 minutes"

### 4. Port đã được sử dụng

```bash
# Check port usage
netstat -ano | findstr :9090
netstat -ano | findstr :3002

# Change port in docker-compose.yml if needed
ports:
  - "9091:9090"  # Use different external port
```

## 📈 Next Steps

1. ✅ Backend đã cài `@willsoto/nestjs-prometheus` (already done)
2. ⏳ Implement MetricsModule trong backend
3. ⏳ Expose `/metrics` endpoint
4. ⏳ Test metrics scraping
5. ⏳ Create Grafana dashboards
6. ⏳ Set up alerts (optional)

## 📚 Resources

- Prometheus: http://localhost:9090
- Grafana: http://localhost:3002
- Detailed Guide: `PROMETHEUS_MONITORING_SETUP_GUIDE.md`

---

**Created:** October 16, 2025  
**Status:** ✅ Ready to use
