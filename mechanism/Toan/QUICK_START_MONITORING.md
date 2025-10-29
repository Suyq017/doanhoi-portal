# 🚀 Quick Start: Deploy Prometheus & Grafana Production

## ✅ TL;DR - Các Bước Cần Làm

### 1️⃣ Cập Nhật .env.production (QUAN TRỌNG!)

```bash
cd /path/to/doanhoi-portal

# Thêm vào .env.production
cat >> .env.production << 'EOF'

# Grafana Configuration
GRAFANA_ADMIN_PASSWORD=your_strong_password_here_min_12_chars
GRAFANA_ROOT_URL=https://doanhoi.hcmut.edu.vn/grafana
GRAFANA_DOMAIN=doanhoi.hcmut.edu.vn
EOF
```

### 2️⃣ Files Đã Được Cập Nhật

✅ `nginx/doanhoi.hcmut.edu.vn.conf` - Thêm `/grafana/` và `/prometheus/`  
✅ `docker-compose.prod.yml` - Thêm `GF_SERVER_SERVE_FROM_SUB_PATH=true`  
✅ `docker-compose.prod.yml` - Thêm Prometheus external URL  

### 3️⃣ Deploy

```bash
# Stop containers cũ
docker compose -f docker-compose.prod.yml down

# Deploy mới
./deploy.sh

# Hoặc manual
docker compose -f docker-compose.prod.yml up -d --build
```

### 4️⃣ Reload Nginx (Trên Server)

```bash
# Test config
sudo nginx -t

# Reload
sudo systemctl reload nginx
```

### 5️⃣ Kiểm Tra

**Check containers:**
```bash
docker compose -f docker-compose.prod.yml ps
```

**Check Grafana logs:**
```bash
docker logs doanhoi-grafana-prod --tail 50
```

**Test URLs:**
- Grafana: https://doanhoi.hcmut.edu.vn/grafana/
- Prometheus: https://doanhoi.hcmut.edu.vn/prometheus/

### 6️⃣ Login Grafana

- URL: https://doanhoi.hcmut.edu.vn/grafana/
- Username: `admin`
- Password: (Giá trị `GRAFANA_ADMIN_PASSWORD` trong `.env.production`)

---

## 🔒 Bảo Mật (Khuyến Nghị)

### IP Whitelist cho Prometheus

Sửa `nginx/doanhoi.hcmut.edu.vn.conf`:

```nginx
location /prometheus/ {
    # Chỉ cho phép IP admin
    allow 1.2.3.4;          # IP của bạn
    allow 192.168.1.0/24;   # Mạng nội bộ
    deny all;
    
    proxy_pass http://localhost:9090/;
    # ... rest
}
```

### Firewall: Chặn Direct Access

```bash
# Chỉ cho phép localhost access ports 9090, 3002
sudo firewall-cmd --permanent --zone=public --remove-port=9090/tcp
sudo firewall-cmd --permanent --zone=public --remove-port=3002/tcp
sudo firewall-cmd --reload
```

---

## 📊 Test Prometheus Queries

Vào https://doanhoi.hcmut.edu.vn/prometheus/graph:

```promql
# Services status
up

# HTTP requests rate
rate(doanhoi_http_requests_total[5m])

# P95 latency
histogram_quantile(0.95, rate(doanhoi_http_request_duration_seconds_bucket[5m]))

# Import sessions
doanhoi_import_sessions_active
```

---

## 🐛 Troubleshooting

### Grafana: 502 Bad Gateway

```bash
# Check container
docker ps | grep grafana

# Check logs
docker logs doanhoi-grafana-prod --tail 100

# Restart
docker restart doanhoi-grafana-prod
```

### Grafana: Blank page / CSS not loading

**Fix:** Kiểm tra `GF_SERVER_SERVE_FROM_SUB_PATH=true` đã được set trong docker-compose.

### Prometheus: Cannot access

```bash
# Test từ server
curl http://localhost:9090/-/healthy

# Check nginx config
sudo nginx -t

# Check nginx logs
sudo tail -f /var/log/nginx/error.log
```

---

## 📋 Checklist

- [ ] `.env.production` có `GRAFANA_ADMIN_PASSWORD`
- [ ] `.env.production` có `GRAFANA_ROOT_URL=https://doanhoi.hcmut.edu.vn/grafana`
- [ ] `docker-compose.prod.yml` có `GF_SERVER_SERVE_FROM_SUB_PATH=true`
- [ ] Nginx config có location `/grafana/` và `/prometheus/`
- [ ] Deploy: `./deploy.sh`
- [ ] Reload nginx: `sudo systemctl reload nginx`
- [ ] Test Grafana: https://doanhoi.hcmut.edu.vn/grafana/
- [ ] Test Prometheus: https://doanhoi.hcmut.edu.vn/prometheus/
- [ ] Login Grafana thành công
- [ ] Prometheus data source working
- [ ] Setup IP whitelist (recommended)

---

## 📞 URLs Cuối Cùng

| Service | URL | Login |
|---------|-----|-------|
| **Frontend** | https://doanhoi.hcmut.edu.vn/ | User |
| **Backend** | https://doanhoi.hcmut.edu.vn/api/ | JWT |
| **Grafana** | https://doanhoi.hcmut.edu.vn/grafana/ | admin / password |
| **Prometheus** | https://doanhoi.hcmut.edu.vn/prometheus/ | No auth |

---

**Đọc thêm:** `PROMETHEUS_GRAFANA_PRODUCTION_SETUP.md` để có hướng dẫn chi tiết.
