# 📊 Grafana Dashboard Setup Guide

## 🎯 Dashboard Overview

Dashboard **"Đoàn Hội Portal - Application Metrics"** bao gồm 18 panels với các loại biểu đồ khác nhau:

---

## 📈 **1. HTTP Request Metrics**

### **Panel 1: HTTP Request Rate** (Time Series - Line Chart)
- **Metric**: `rate(doanhoi_http_requests_total[1m])`
- **Loại**: Time Series (Line Chart)
- **Mục đích**: Xem số lượng requests/giây theo từng endpoint
- **Labels**: `method`, `path`
- **Y-axis**: Requests per second (reqps)

**Cách đọc:**
- Đường cao = endpoint được gọi nhiều
- Spike = traffic tăng đột ngột

---

### **Panel 2: Success Rate** (Gauge)
- **Metric**: `100 * (sum(rate(http_requests_total{status=~"2.."})) / sum(rate(http_requests_total)))`
- **Loại**: Gauge (Đồng hồ)
- **Mục đích**: % requests thành công (status 2xx)
- **Thresholds**: 
  - ✅ Green: > 95%
  - ⚠️ Yellow: 95-99%
  - ❌ Red: < 95%

---

### **Panel 3: Error Rate** (Gauge)
- **Metric**: `100 * (sum(rate(http_requests_total{status=~"5.."})) / sum(rate(http_requests_total)))`
- **Loại**: Gauge
- **Mục đích**: % requests lỗi server (status 5xx)
- **Thresholds**:
  - ✅ Green: 0%
  - ⚠️ Yellow: 1-5%
  - ❌ Red: > 5%

---

### **Panel 4: Response Time (P50/P95/P99)** (Time Series - Multi-line)
- **Metrics**:
  - P50: `histogram_quantile(0.50, rate(doanhoi_http_request_duration_seconds_bucket[5m]))`
  - P95: `histogram_quantile(0.95, ...)`
  - P99: `histogram_quantile(0.99, ...)`
- **Loại**: Time Series (Smooth line)
- **Mục đích**: Xem latency distribution
- **Y-axis**: Seconds

**Cách đọc:**
- **P50**: 50% requests nhanh hơn giá trị này
- **P95**: 95% requests nhanh hơn (SLA target)
- **P99**: 99% requests nhanh hơn

---

### **Panel 5: HTTP Status Codes** (Pie Chart / Donut)
- **Metric**: `sum(increase(doanhoi_http_requests_total[1h])) by (status)`
- **Loại**: Donut Chart
- **Mục đích**: Phân bố status codes trong 1 giờ
- **Labels**: `status` (200, 201, 400, 404, 500, v.v.)

**Cách đọc:**
- Phần lớn màu xanh (2xx) = tốt
- Nhiều màu đỏ (5xx) = có vấn đề

---

## 📥 **2. Import Metrics**

### **Panel 6: Active Import Sessions** (Stat - Single Value)
- **Metric**: `sum(doanhoi_import_sessions_active)`
- **Loại**: Stat (Big Number)
- **Mục đích**: Số import sessions đang chạy
- **Thresholds**:
  - ✅ Green: 0-5
  - ❌ Red: > 5 (quá tải)

---

### **Panel 7: Rows Processed (1h)** (Stat)
- **Metric**: `sum(increase(doanhoi_import_rows_processed_total[1h]))`
- **Loại**: Stat với sparkline
- **Mục đích**: Tổng số rows đã import thành công trong 1 giờ

---

### **Panel 8: Failed Rows (1h)** (Stat)
- **Metric**: `sum(increase(doanhoi_import_rows_failed_total[1h]))`
- **Loại**: Stat
- **Thresholds**:
  - ✅ Green: 0-100
  - ❌ Red: > 100

---

### **Panel 9: Import Success Rate** (Stat)
- **Metric**: `100 * (processed / (processed + failed))`
- **Loại**: Stat
- **Mục đích**: % import thành công
- **Thresholds**:
  - ✅ Green: > 95%
  - ⚠️ Yellow: 95-99%
  - ❌ Red: < 95%

---

### **Panel 10: Validation Time (P95)** (Stat)
- **Metric**: `histogram_quantile(0.95, rate(doanhoi_org_import_validation_duration_seconds_bucket[5m]))`
- **Loại**: Stat
- **Mục đích**: 95% validation hoàn thành trong bao lâu
- **Thresholds**:
  - ✅ Green: < 2s
  - ⚠️ Yellow: 2-5s
  - ❌ Red: > 5s

---

### **Panel 11: Import Batch Size** (Stat)
- **Metric**: `doanhoi_org_import_batch_size`
- **Loại**: Stat (Static value)
- **Mục đích**: Batch size đang sử dụng (500 rows/batch)

---

### **Panel 12: Import Throughput** (Time Series)
- **Metrics**:
  - Processed: `rate(doanhoi_import_rows_processed_total[1m])`
  - Failed: `rate(doanhoi_import_rows_failed_total[1m])`
- **Loại**: Time Series
- **Y-axis**: Rows per second

**Cách đọc:**
- Cao = import nhanh
- Spike failures = có vấn đề validation

---

### **Panel 13: Average Import Duration** (Time Series)
- **Metric**: `rate(doanhoi_import_duration_seconds_sum[5m]) / rate(doanhoi_import_duration_seconds_count[5m])`
- **Loại**: Time Series
- **Mục đích**: Thời gian trung bình để hoàn thành 1 import

---

## 💻 **3. System Metrics**

### **Panel 14: CPU Usage** (Time Series)
- **Metric**: `100 * rate(doanhoi_process_cpu_user_seconds_total[1m])`
- **Loại**: Time Series (Area fill)
- **Y-axis**: Percent (0-100%)

**Cách đọc:**
- < 50%: Tốt
- 50-80%: Bình thường
- \> 80%: Cần scale

---

### **Panel 15: Memory Usage (Heap)** (Time Series)
- **Metrics**:
  - Heap Used: `doanhoi_nodejs_heap_size_used_bytes`
  - Heap Total: `doanhoi_nodejs_heap_size_total_bytes`
- **Loại**: Time Series
- **Y-axis**: Bytes (auto-formatted: MB, GB)

**Cách đọc:**
- Used tăng liên tục = memory leak
- Used gần Total = cần tăng heap size

---

### **Panel 16: Event Loop Lag** (Time Series)
- **Metric**: `doanhoi_nodejs_eventloop_lag_seconds`
- **Loại**: Time Series
- **Y-axis**: Seconds

**Cách đọc:**
- < 0.01s: Tốt
- \> 0.1s: App đang bị blocked (CPU-intensive task)

---

## 🗄️ **4. Database Metrics**

### **Panel 17: DB Connections** (Stat)
- **Metric**: `doanhoi_db_connections_active`
- **Loại**: Stat
- **Thresholds**:
  - ✅ Green: < 20
  - ⚠️ Yellow: 20-50
  - ❌ Red: > 50

---

### **Panel 18: DB Query Time (P95)** (Stat)
- **Metric**: `histogram_quantile(0.95, rate(doanhoi_db_query_duration_seconds_bucket[5m]))`
- **Loại**: Stat
- **Thresholds**:
  - ✅ Green: < 0.1s
  - ⚠️ Yellow: 0.1-0.5s
  - ❌ Red: > 0.5s

---

## 🚀 **Import Dashboard vào Grafana**

### **Option 1: Auto-provision (Recommended)**

Dashboard đã được tạo trong `grafana/provisioning/dashboards/doanhoi-portal-dashboard.json` và sẽ tự động load khi start Grafana.

```bash
# Restart Grafana để load dashboard
docker-compose restart grafana
```

Sau đó:
1. Mở http://localhost:3002
2. Login: admin / admin
3. Vào **Dashboards** → Tìm **"Đoàn Hội Portal - Application Metrics"**

---

### **Option 2: Manual Import**

1. Mở Grafana: http://localhost:3002
2. Click **"+"** → **Import**
3. Upload file: `grafana/provisioning/dashboards/doanhoi-portal-dashboard.json`
4. Chọn datasource: **Prometheus**
5. Click **Import**

---

## 🎨 **Dashboard Layout**

```
┌─────────────────────────────────────────────────────────────┐
│  Row 1: HTTP Overview                                       │
├─────────────────────┬─────────────┬─────────────────────────┤
│ Request Rate        │ Success %   │ Error %                 │
│ (Time Series)       │ (Gauge)     │ (Gauge)                 │
└─────────────────────┴─────────────┴─────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│  Row 2: Response Time & Status                              │
├─────────────────────────────────┬───────────────────────────┤
│ P50/P95/P99 Latency             │ Status Code Distribution  │
│ (Time Series - Multi-line)      │ (Donut Chart)             │
└─────────────────────────────────┴───────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│  Row 3: Import Summary Stats                                │
├─────┬─────┬─────┬───────────┬─────────────┬───────────────┤
│Active│Proc │Fail │Success %  │Validation   │Batch Size     │
│(Stat)│(Stat)│(Stat)│(Stat)    │Time (Stat)  │(Stat)        │
└─────┴─────┴─────┴───────────┴─────────────┴───────────────┘

┌─────────────────────────────────────────────────────────────┐
│  Row 4: Import Performance                                  │
├─────────────────────────────────┬───────────────────────────┤
│ Import Throughput (rows/sec)    │ Average Duration          │
│ (Time Series)                   │ (Time Series)             │
└─────────────────────────────────┴───────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│  Row 5: System Resources                                    │
├─────────────────────────────────┬───────────────────────────┤
│ CPU Usage                       │ Memory (Heap)             │
│ (Time Series - Area)            │ (Time Series)             │
└─────────────────────────────────┴───────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│  Row 6: System Health                                       │
├─────────────────────────────────┬───────┬───────────────────┤
│ Event Loop Lag                  │ DB    │ DB Query Time     │
│ (Time Series)                   │ Conn  │ (Stat)            │
│                                 │(Stat) │                   │
└─────────────────────────────────┴───────┴───────────────────┘
```

---

## 📊 **Loại biểu đồ phù hợp cho từng metric**

### **Time Series (Line/Area Chart)**
✅ **Dùng cho:**
- Request rate over time
- Response time trends
- CPU/Memory trends
- Throughput metrics

❌ **KHÔNG dùng cho:**
- Single values (dùng Stat)
- Percentages (dùng Gauge)

---

### **Gauge (Đồng hồ)**
✅ **Dùng cho:**
- Success rate (%)
- Error rate (%)
- Current percentage values

❌ **KHÔNG dùng cho:**
- Time series data
- Count values

---

### **Stat (Big Number)**
✅ **Dùng cho:**
- Current count (active sessions, connections)
- Total in time window (rows processed)
- Latest value (batch size)

❌ **KHÔNG dùng cho:**
- Historical trends (dùng Time Series)

---

### **Pie/Donut Chart**
✅ **Dùng cho:**
- Distribution (status codes, types)
- Proportions

❌ **KHÔNG dùng cho:**
- Time-based data
- More than 10 categories

---

### **Histogram**
✅ **Dùng cho:**
- Latency distribution (P50, P95, P99)
- Duration buckets

❌ **KHÔNG dùng cho:**
- Single values
- Rates

---

## 🎯 **Alerting Rules** (Optional)

Tạo alerts cho các metrics quan trọng:

### **1. High Error Rate**
```yaml
- alert: HighErrorRate
  expr: (sum(rate(doanhoi_http_requests_total{status=~"5.."}[5m])) / sum(rate(doanhoi_http_requests_total[5m]))) > 0.05
  for: 5m
  annotations:
    summary: "Error rate > 5%"
```

### **2. Slow Response Time**
```yaml
- alert: SlowResponseTime
  expr: histogram_quantile(0.95, rate(doanhoi_http_request_duration_seconds_bucket[5m])) > 2
  for: 5m
  annotations:
    summary: "P95 latency > 2s"
```

### **3. High Import Failure Rate**
```yaml
- alert: HighImportFailureRate
  expr: (sum(rate(doanhoi_import_rows_failed_total[5m])) / (sum(rate(doanhoi_import_rows_processed_total[5m])) + sum(rate(doanhoi_import_rows_failed_total[5m])))) > 0.1
  for: 5m
  annotations:
    summary: "Import failure rate > 10%"
```

---

## 🔍 **Useful Queries**

### **Top 5 Slowest Endpoints**
```promql
topk(5, 
  histogram_quantile(0.95, 
    sum(rate(doanhoi_http_request_duration_seconds_bucket[5m])) by (le, path)
  )
)
```

### **Request Rate by Method**
```promql
sum(rate(doanhoi_http_requests_total[1m])) by (method)
```

### **Import Success Rate by Type**
```promql
100 * (
  sum(rate(doanhoi_import_rows_processed_total[5m])) by (type)
  /
  (sum(rate(doanhoi_import_rows_processed_total[5m])) by (type) + 
   sum(rate(doanhoi_import_rows_failed_total[5m])) by (type))
)
```

---

## 📝 **Dashboard Settings**

- **Refresh**: 5 seconds (auto-refresh)
- **Time Range**: Last 15 minutes (adjustable)
- **Timezone**: Browser timezone
- **Dark Theme**: Enabled

---

## 🎉 **Testing Dashboard**

1. **Start services:**
   ```bash
   docker-compose up -d
   ```

2. **Generate traffic:**
   ```bash
   # Gọi API để tạo metrics
   for ($i=1; $i -le 100; $i++) {
       curl http://localhost:9200/api/users
       Start-Sleep -Milliseconds 100
   }
   ```

3. **Import data:**
   - Vào frontend: http://localhost:9100
   - Import file CSV với 1000 rows
   - Xem metrics trong Grafana real-time

4. **Check dashboard:**
   - Mở http://localhost:3002
   - Vào dashboard **"Đoàn Hội Portal - Application Metrics"**
   - Quan sát các panels update real-time

---

**Dashboard đã sẵn sàng! 🚀**
