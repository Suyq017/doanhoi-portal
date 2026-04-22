# 🚀 Setup Prometheus & Grafana trên Production

## 📋 Tổng Quan

Hệ thống hiện tại đã có sẵn Prometheus và Grafana trong `docker-compose.prod.yml`. Bạn cần cấu hình Nginx reverse proxy để truy cập chúng qua HTTPS.

### Ports Hiện Tại:
- **Frontend**: `2680` → `https://doanhoi.hcmut.edu.vn/`
- **Backend**: `2681` → `https://doanhoi.hcmut.edu.vn/api/`
- **Prometheus**: `9090` → Chưa có reverse proxy
- **Grafana**: `3002` → Chưa có reverse proxy

### Mục Tiêu:
- **Prometheus**: `https://doanhoi.hcmut.edu.vn/prometheus/`
- **Grafana**: `https://doanhoi.hcmut.edu.vn/grafana/`

---

## 📂 Cấu Trúc File

```
doanhoi-portal/
├── docker-compose.prod.yml        # Đã có Prometheus & Grafana
├── prometheus.prod.yml            # Config Prometheus
├── grafana/provisioning/          # Grafana config
├── nginx/
│   ├── nginx.conf                 # Main config
│   └── doanhoi.hcmut.edu.vn.conf  # Site config (CẦN CẬP NHẬT)
└── .env.production                # Env variables
```

---

## 🔧 Bước 1: Cập Nhật .env.production

Thêm các biến môi trường cho Grafana:

```bash
# .env.production

# Existing variables...
DB_PASSWORD=your_secure_password
JWT_SECRET=your_jwt_secret
# ...

# Grafana Configuration
GRAFANA_ADMIN_PASSWORD=your_strong_grafana_password_here  # THAY ĐỔI NÀY!
GRAFANA_ROOT_URL=https://doanhoi.hcmut.edu.vn/grafana
GRAFANA_DOMAIN=doanhoi.hcmut.edu.vn
```

**⚠️ LƯU Ý:**
- `GRAFANA_ADMIN_PASSWORD`: **BẮT BUỘC** thay đổi! Không dùng `admin123`
- `GRAFANA_ROOT_URL`: URL đầy đủ để truy cập Grafana
- `GRAFANA_DOMAIN`: Domain chính

---

## 🔧 Bước 2: Cập Nhật docker-compose.prod.yml (Đã OK!)

File hiện tại đã cấu hình tốt, **KHÔNG cần sửa**. Kiểm tra lại:

```yaml
prometheus:
  ports:
    - "9090:9090"  # ✅ OK
  networks:
    - doanhoi-network

grafana:
  ports:
    - "3002:3000"  # ✅ OK
  environment:
    - GF_SERVER_ROOT_URL=${GRAFANA_ROOT_URL}     # ✅ OK
    - GF_SERVER_SERVE_FROM_SUB_PATH=true         # ⚠️ CẦN THÊM
  networks:
    - doanhoi-network
```

**Chỉ cần thêm 1 dòng:**

```yaml
grafana:
  environment:
    # ... existing vars ...
    - GF_SERVER_SERVE_FROM_SUB_PATH=true  # ← THÊM DÒNG NÀY
```

---

## 🔧 Bước 3: Cập Nhật Nginx Config

### File: `nginx/doanhoi.hcmut.edu.vn.conf`

Thêm 2 location blocks mới cho Prometheus và Grafana:

```nginx
# ==============================
# Configuration for doanhoi.hcmut.edu.vn
# ==============================

# HTTPS server (main site)
server {
    listen 443 ssl http2;
    server_name doanhoi.hcmut.edu.vn;

    # SSL certificate
    ssl_certificate     /etc/nginx/ssl/selfsigned.crt;
    ssl_certificate_key /etc/nginx/ssl/selfsigned.key;

    # SSL settings
    ssl_session_cache shared:SSL:1m;
    ssl_session_timeout 10m;
    ssl_ciphers PROFILE=SYSTEM;
    ssl_prefer_server_ciphers on;

    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;

    # Gzip compression
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_types text/plain text/css text/xml text/javascript application/javascript application/xml+rss application/json;

    # =========================================
    # GRAFANA - https://doanhoi.hcmut.edu.vn/grafana/
    # =========================================
    location /grafana/ {
        proxy_pass http://localhost:3002/;
        proxy_http_version 1.1;
        
        # WebSocket support (for live updates)
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        
        # Headers
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        
        # Timeout settings (for long-running queries)
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
        
        # Buffer settings
        proxy_buffering off;
        proxy_cache_bypass $http_upgrade;
    }

    # =========================================
    # PROMETHEUS - https://doanhoi.hcmut.edu.vn/prometheus/
    # =========================================
    location /prometheus/ {
        proxy_pass http://localhost:9090/;
        proxy_http_version 1.1;
        
        # Headers
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        
        # Timeout settings
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }

    # =========================================
    # BACKEND API - /api/
    # =========================================
    location /api/ {
        proxy_pass http://localhost:2681/;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;

        # Timeout settings
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }

    # =========================================
    # FRONTEND - /
    # =========================================
    location / {
        client_max_body_size 10M;
        proxy_pass http://localhost:2680;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        proxy_redirect off;
    }
}

# HTTP → HTTPS redirect
server {
    listen 80;
    server_name doanhoi.hcmut.edu.vn;
    return 301 https://$host$request_uri;
}
```

---

## 🔧 Bước 4: Cập Nhật Prometheus Config (Không Bắt Buộc)

Nếu muốn Prometheus có external URL đúng, cập nhật `docker-compose.prod.yml`:

```yaml
prometheus:
  command:
    - '--config.file=/etc/prometheus/prometheus.yml'
    - '--storage.tsdb.path=/prometheus'
    - '--storage.tsdb.retention.time=30d'
    - '--web.console.libraries=/usr/share/prometheus/console_libraries'
    - '--web.console.templates=/usr/share/prometheus/consoles'
    - '--web.enable-lifecycle'
    - '--web.external-url=https://doanhoi.hcmut.edu.vn/prometheus/'  # ← THÊM
    - '--web.route-prefix=/'                                          # ← THÊM
```

---

## 🚀 Bước 5: Deploy

### 5.1. Stop containers cũ

```bash
cd /path/to/doanhoi-portal
docker compose -f docker-compose.prod.yml down
```

### 5.2. Build và start lại

```bash
./deploy.sh
```

Hoặc manual:

```bash
docker compose -f docker-compose.prod.yml up -d --build
```

### 5.3. Reload Nginx

**Trên CentOS server:**

```bash
# Test config trước
sudo nginx -t

# Nếu OK, reload
sudo systemctl reload nginx

# Hoặc restart
sudo systemctl restart nginx
```

---

## ✅ Bước 6: Kiểm Tra

### 6.1. Kiểm tra Docker containers

```bash
docker compose -f docker-compose.prod.yml ps
```

**Expected output:**

```
NAME                      STATUS          PORTS
doanhoi-backend-prod      Up             0.0.0.0:2681->9200/tcp
doanhoi-frontend-prod     Up             0.0.0.0:2680->80/tcp
doanhoi-postgres-prod     Up             0.0.0.0:2682->5432/tcp
doanhoi-prometheus-prod   Up             0.0.0.0:9090->9090/tcp
doanhoi-grafana-prod      Up             0.0.0.0:3002->3000/tcp
```

### 6.2. Kiểm tra logs

```bash
# Grafana logs
docker logs doanhoi-grafana-prod --tail 50

# Prometheus logs
docker logs doanhoi-prometheus-prod --tail 50
```

### 6.3. Test URLs

**Direct access (trên server):**

```bash
# Prometheus
curl http://localhost:9090/-/healthy
# Expected: Prometheus is Healthy.

# Grafana
curl http://localhost:3002/api/health
# Expected: {"commit":"...","database":"ok","version":"..."}
```

**Browser access:**

1. **Grafana**: https://doanhoi.hcmut.edu.vn/grafana/
   - Username: `admin`
   - Password: (giá trị của `GRAFANA_ADMIN_PASSWORD` trong `.env.production`)

2. **Prometheus**: https://doanhoi.hcmut.edu.vn/prometheus/
   - Query: `up` → Xem services đang được monitor

---

## 🔐 Bước 7: Bảo Mật (Khuyến Nghị)

### 7.1. IP Whitelist cho Prometheus

**Chỉ cho phép admin truy cập:**

```nginx
location /prometheus/ {
    # Whitelist IP admin
    allow 1.2.3.4;       # IP của bạn
    allow 192.168.1.0/24; # Mạng nội bộ
    deny all;
    
    proxy_pass http://localhost:9090/;
    # ... rest of config
}
```

### 7.2. Basic Auth cho Grafana (Tùy Chọn)

**Thêm basic auth ở Nginx level:**

```bash
# Tạo password file
sudo htpasswd -c /etc/nginx/.htpasswd admin

# Nhập password khi được hỏi
```

**Cập nhật nginx config:**

```nginx
location /grafana/ {
    auth_basic "Grafana Admin Area";
    auth_basic_user_file /etc/nginx/.htpasswd;
    
    proxy_pass http://localhost:3002/;
    # ... rest of config
}
```

### 7.3. Firewall Rules

**Chặn direct access đến ports monitoring:**

```bash
# Chỉ cho phép localhost truy cập 9090, 3002
sudo firewall-cmd --permanent --zone=public --remove-port=9090/tcp
sudo firewall-cmd --permanent --zone=public --remove-port=3002/tcp
sudo firewall-cmd --reload
```

---

## 📊 Bước 8: Cấu Hình Grafana

### 8.1. Login lần đầu

1. Truy cập: https://doanhoi.hcmut.edu.vn/grafana/
2. Login: `admin` / `<GRAFANA_ADMIN_PASSWORD>`
3. Grafana sẽ yêu cầu đổi mật khẩu (khuyến nghị)

### 8.2. Add Prometheus Data Source (Đã Auto)

Grafana đã được provisioned sẵn data source trong `grafana/provisioning/datasources/prometheus.yml`:

```yaml
apiVersion: 1
datasources:
  - name: Prometheus
    type: prometheus
    access: proxy
    url: http://prometheus:9090  # ← Docker service name
    isDefault: true
    editable: false
```

**Kiểm tra:**
- Vào **Configuration** → **Data Sources**
- Xem Prometheus đã có chưa
- Click **Test** → Should show "Data source is working"

### 8.3. Import Dashboards

**Grafana có sẵn dashboards trong `grafana/provisioning/dashboards/`:**

1. Vào **Dashboards** → **Browse**
2. Xem các dashboards đã được import tự động
3. Hoặc import thêm từ https://grafana.com/grafana/dashboards/

---

## 🧪 Test Metrics

### Test Backend Metrics

```bash
# Trên server
curl http://localhost:2681/metrics

# Qua Nginx
curl https://doanhoi.hcmut.edu.vn/api/metrics
```

**Expected output:**

```
# HELP doanhoi_http_requests_total Total HTTP requests
# TYPE doanhoi_http_requests_total counter
doanhoi_http_requests_total{method="GET",route="/users",status="200"} 1523
doanhoi_http_requests_total{method="POST",route="/login",status="200"} 89

# HELP doanhoi_http_request_duration_seconds HTTP request duration
# TYPE doanhoi_http_request_duration_seconds histogram
...
```

### Query trong Prometheus

1. Truy cập: https://doanhoi.hcmut.edu.vn/prometheus/
2. Vào **Graph**
3. Thử các queries:

```promql
# Kiểm tra services đang up
up

# HTTP requests rate
rate(doanhoi_http_requests_total[5m])

# Request duration P95
histogram_quantile(0.95, rate(doanhoi_http_request_duration_seconds_bucket[5m]))

# Import sessions
doanhoi_import_sessions_total

# Database connections
doanhoi_db_connections_active
```

---

## 📈 Grafana Queries Mẫu

### Dashboard: API Performance

```promql
# Request Rate (requests/sec)
sum(rate(doanhoi_http_requests_total[5m])) by (method)

# Error Rate (4xx, 5xx)
sum(rate(doanhoi_http_requests_total{status=~"4..|5.."}[5m])) by (status)

# P95 Latency
histogram_quantile(0.95, 
  sum(rate(doanhoi_http_request_duration_seconds_bucket[5m])) by (le, route)
)

# Request by Route
sum(rate(doanhoi_http_requests_total[5m])) by (route)
```

### Dashboard: Database

```promql
# Active Connections
doanhoi_db_connections_active

# Query Duration
rate(doanhoi_db_query_duration_seconds_sum[5m]) 
/ 
rate(doanhoi_db_query_duration_seconds_count[5m])

# Query Count
rate(doanhoi_db_queries_total[5m])
```

### Dashboard: Import System

```promql
# Active Import Sessions
doanhoi_import_sessions_active

# Rows Processed
rate(doanhoi_import_rows_processed_total[5m])

# Rows Failed
rate(doanhoi_import_rows_failed_total[5m])

# Success Rate
rate(doanhoi_import_rows_processed_total[5m])
/
(rate(doanhoi_import_rows_processed_total[5m]) + rate(doanhoi_import_rows_failed_total[5m]))
```

---

## 🔍 Troubleshooting

### Lỗi: Grafana không load được

**Kiểm tra:**

```bash
# Logs
docker logs doanhoi-grafana-prod --tail 100

# Config
docker exec doanhoi-grafana-prod cat /etc/grafana/grafana.ini | grep root_url

# Restart
docker restart doanhoi-grafana-prod
```

**Nguyên nhân thường gặp:**
- `GF_SERVER_SERVE_FROM_SUB_PATH=true` chưa được set
- `GF_SERVER_ROOT_URL` sai

### Lỗi: Prometheus không scrape được backend

**Kiểm tra:**

```bash
# Targets trong Prometheus
# https://doanhoi.hcmut.edu.vn/prometheus/targets

# Test từ Prometheus container
docker exec doanhoi-prometheus-prod wget -O- http://backend:9200/metrics
```

**Fix:**
- Kiểm tra `prometheus.prod.yml` → target = `backend:9200`
- Kiểm tra backend có expose `/metrics` endpoint

### Lỗi: 502 Bad Gateway

**Kiểm tra:**

```bash
# Nginx logs
sudo tail -f /var/log/nginx/error.log

# Test upstream
curl http://localhost:3002
curl http://localhost:9090
```

**Fix:**
- Kiểm tra containers đang chạy
- Kiểm tra ports không bị conflict

---

## 📝 Checklist Deploy

- [ ] Cập nhật `.env.production` với `GRAFANA_ADMIN_PASSWORD`
- [ ] Thêm `GF_SERVER_SERVE_FROM_SUB_PATH=true` vào docker-compose
- [ ] Cập nhật `nginx/doanhoi.hcmut.edu.vn.conf` với location `/grafana/` và `/prometheus/`
- [ ] Deploy: `./deploy.sh`
- [ ] Reload Nginx: `sudo systemctl reload nginx`
- [ ] Test Grafana: https://doanhoi.hcmut.edu.vn/grafana/
- [ ] Test Prometheus: https://doanhoi.hcmut.edu.vn/prometheus/
- [ ] Login Grafana với admin password
- [ ] Kiểm tra Prometheus data source
- [ ] Test queries trong Prometheus
- [ ] Setup IP whitelist cho Prometheus (recommended)
- [ ] Đổi Grafana admin password
- [ ] Backup grafana_data volume

---

## 🎓 Tóm Tắt URLs

| Service | URL | Credentials |
|---------|-----|-------------|
| **Frontend** | https://doanhoi.hcmut.edu.vn/ | User login |
| **Backend API** | https://doanhoi.hcmut.edu.vn/api/ | JWT token |
| **Grafana** | https://doanhoi.hcmut.edu.vn/grafana/ | admin / `GRAFANA_ADMIN_PASSWORD` |
| **Prometheus** | https://doanhoi.hcmut.edu.vn/prometheus/ | No auth (nên bảo vệ) |

---

## 📞 Support

Nếu có vấn đề:
1. Check logs: `docker compose -f docker-compose.prod.yml logs -f`
2. Check nginx: `sudo nginx -t` và `sudo tail -f /var/log/nginx/error.log`
3. Check containers: `docker ps -a`
4. Restart services: `docker compose -f docker-compose.prod.yml restart`

---

*Tài liệu này được tạo ngày 28/10/2025 - Production Setup Guide*
