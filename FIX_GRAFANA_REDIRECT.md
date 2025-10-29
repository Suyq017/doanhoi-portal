# 🔧 Hướng dẫn FIX Grafana & Prometheus Redirect Issues

## ❌ Nguyên nhân lỗi

### Grafana - ERR_TOO_MANY_REDIRECTS

Lỗi xảy ra vì **rewrite rule** trong Nginx config **CONFLICT** với Grafana subpath config:

```nginx
# ❌ SAI - Rewrite xóa /grafana/ prefix
location /grafana/ {
    rewrite ^/grafana/(.*) /$1 break;  # ← XÓA /grafana/ prefix
    proxy_pass http://localhost:3002;
}
```

Khi Grafana nhận request `/login`, nó redirect về `/grafana/login` (vì `GF_SERVER_ROOT_URL`), nhưng Nginx lại rewrite thành `/login` → **LOOP VÔ HẠN!**

### Prometheus - Redirect về `/` hoặc ERR_TOO_MANY_REDIRECTS

Có 2 cách config Prometheus với subpath, mỗi cách có cách xử lý khác nhau:

**Cách 1: Prometheus nhận request CÓ prefix (KHÔNG DÙNG)**
```yaml
# ❌ SAI - Prometheus không xử lý tốt khi nhận /prometheus/ prefix
command:
  - '--web.external-url=https://doanhoi.hcmut.edu.vn/prometheus/'
  - '--web.route-prefix=/prometheus'

# Nginx
location /prometheus/ {
    proxy_pass http://localhost:9091;  # Forward /prometheus/graph
}
# → Prometheus nhận /prometheus/graph → route-prefix conflict → LOOP!
```

**Cách 2: Nginx rewrite, Prometheus nhận request KHÔNG có prefix (ĐÚNG)**
```yaml
# ✅ ĐÚNG
command:
  - '--web.external-url=https://doanhoi.hcmut.edu.vn/prometheus/'  # External links
  - '--web.route-prefix=/'  # Internal routing from root

# Nginx
location /prometheus/ {
    rewrite ^/prometheus/(.*) /$1 break;  # Strip /prometheus/ prefix
    proxy_pass http://localhost:9091;     # Forward /graph
}
# → Prometheus nhận /graph → route-prefix=/ → OK!
```

## ✅ Giải pháp ĐÚNG

### Bước 1: Pull code mới từ Git

```bash
cd /var/www/doanhoi-portal
git pull origin dev
```

File đã được sửa:
- ✅ `nginx/doanhoi.hcmut.edu.vn.conf` - **XÓA rewrite rules**
- ✅ `deploy.sh` - Thêm `--env-file .env.production`

### Bước 2: Kiểm tra file `.env.production`

```bash
cat .env.production | grep -E "GRAFANA|PAYOS"
```

**Phải thấy 3 dòng riêng biệt:**
```env
GRAFANA_ADMIN_PASSWORD=doanhoi_grafana
GRAFANA_ROOT_URL=https://doanhoi.hcmut.edu.vn/grafana/
GRAFANA_DOMAIN=doanhoi.hcmut.edu.vn
PAYOS_API_KEY=your_key_here
```

**Nếu thấy:**
```
GRAFANA_DOMAIN=doanhoi.hcmut.edu.vnPAYOS_API_KEY=...
```

→ **PHẢI SỬA** bằng nano:
```bash
nano .env.production
```

Thêm newline giữa `GRAFANA_DOMAIN` và `PAYOS_API_KEY`.

### Bước 3: Kiểm tra trailing slash

Đảm bảo `GRAFANA_ROOT_URL` có dấu `/` ở cuối:
```bash
grep GRAFANA_ROOT_URL .env.production
```

Phải thấy: `GRAFANA_ROOT_URL=https://doanhoi.hcmut.edu.vn/grafana/` (có `/` cuối)

### Bước 4: Copy file Nginx config mới

```bash
# Backup config cũ
sudo cp /etc/nginx/conf.d/doanhoi.hcmut.edu.vn.conf /etc/nginx/conf.d/doanhoi.hcmut.edu.vn.conf.backup

# Copy config mới
sudo cp nginx/doanhoi.hcmut.edu.vn.conf /etc/nginx/conf.d/

# Test config
sudo nginx -t
```

**Phải thấy:**
```
nginx: the configuration file /etc/nginx/nginx.conf syntax is ok
nginx: configuration file /etc/nginx/nginx.conf test is successful
```

### Bước 5: Reload Nginx

```bash
sudo systemctl reload nginx
```

### Bước 6: Recreate Grafana container

```bash
./deploy.sh
```

Hoặc chỉ recreate Grafana và Prometheus:
```bash
docker compose -f docker-compose.prod.yml --env-file .env.production up -d --force-recreate grafana prometheus
```

### Bước 7: Kiểm tra Grafana đã nhận đúng env vars

```bash
docker exec doanhoi-grafana-prod env | grep GF_SERVER
```

**Phải thấy:**
```
GF_SERVER_ROOT_URL=https://doanhoi.hcmut.edu.vn/grafana/
GF_SERVER_DOMAIN=doanhoi.hcmut.edu.vn
GF_SERVER_SERVE_FROM_SUB_PATH=true
```

### Bước 8: Kiểm tra Grafana logs

```bash
docker logs doanhoi-grafana-prod --tail 50
```

**KHÔNG được thấy:**
- ❌ `http: multiple response.WriteHeader calls`
- ❌ `redirect loop detected`

**Phải thấy:**
- ✅ `HTTP Server Listen`
- ✅ `Grafana is up and running`

### Bước 9: Test trên browser

1. **Mở Grafana:** https://doanhoi.hcmut.edu.vn/grafana/
   - Phải thấy trang login
   - URL bar không đổi (không loop)

2. **Login:** 
   - Username: `admin`
   - Password: `doanhoi_grafana` (từ `.env.production`)

3. **Test Prometheus:** https://doanhoi.hcmut.edu.vn/prometheus/
   - Phải thấy Prometheus UI

## 🔍 Debugging nếu vẫn lỗi

### Check 1: Nginx có forward đúng request không?

```bash
# Theo dõi Nginx access log
sudo tail -f /var/log/nginx/access.log | grep grafana
```

Truy cập: https://doanhoi.hcmut.edu.vn/grafana/

**Phải thấy:**
```
GET /grafana/ HTTP/2.0" 200
GET /grafana/public/build/... HTTP/2.0" 200
```

**KHÔNG được thấy:**
```
GET /grafana/ HTTP/2.0" 301  # ← Redirect loop!
GET /grafana/ HTTP/2.0" 302  # ← Redirect loop!
```

### Check 2: Grafana có nhận request với /grafana/ prefix không?

```bash
docker logs doanhoi-grafana-prod --tail 100 | grep -E "GET|POST"
```

**Phải thấy:**
```
GET /grafana/api/...
GET /grafana/login
```

**KHÔNG được thấy:**
```
GET /api/...     # ← Thiếu /grafana/ prefix
GET /login       # ← Thiếu /grafana/ prefix
```

### Check 3: Environment variables có đúng không?

```bash
docker exec doanhoi-grafana-prod sh -c 'echo "ROOT_URL=$GF_SERVER_ROOT_URL"; echo "SERVE_FROM_SUB_PATH=$GF_SERVER_SERVE_FROM_SUB_PATH"'
```

**Phải thấy:**
```
ROOT_URL=https://doanhoi.hcmut.edu.vn/grafana/
SERVE_FROM_SUB_PATH=true
```

## 📋 Checklist cuối cùng

### Grafana
- [ ] `.env.production` có `GRAFANA_ROOT_URL=https://doanhoi.hcmut.edu.vn/grafana/` (trailing slash)
- [ ] `.env.production` có `GRAFANA_DOMAIN=doanhoi.hcmut.edu.vn` (dòng riêng)
- [ ] `nginx/doanhoi.hcmut.edu.vn.conf` **KHÔNG có** `rewrite ^/grafana/` trong location /grafana/
- [ ] `docker-compose.prod.yml` Grafana có `GF_SERVER_SERVE_FROM_SUB_PATH=true`

### Prometheus
- [ ] `docker-compose.prod.yml` có `--web.external-url=https://doanhoi.hcmut.edu.vn/prometheus/`
- [ ] `docker-compose.prod.yml` có `--web.route-prefix=/` (vì Nginx đã rewrite)
- [ ] `nginx/doanhoi.hcmut.edu.vn.conf` **CÓ** `rewrite ^/prometheus/(.*) /$1 break;` trong location /prometheus/

### Deploy
- [ ] Deploy script dùng `--env-file .env.production`
- [ ] Nginx test pass: `sudo nginx -t`
- [ ] Nginx đã reload: `sudo systemctl reload nginx`
- [ ] Containers đã recreate: `docker compose up -d --force-recreate grafana prometheus`
- [ ] Logs không có lỗi redirect

## 🎯 Cơ chế hoạt động ĐÚNG

### Grafana

```
Browser Request:
https://doanhoi.hcmut.edu.vn/grafana/login
         ↓
Nginx (NO rewrite):
location /grafana/ {
    proxy_pass http://localhost:3002;  # ← Forward CẢ /grafana/ prefix
}
         ↓
Grafana Container:
- Nhận request: GET /grafana/login
- GF_SERVER_ROOT_URL=https://doanhoi.hcmut.edu.vn/grafana/
- GF_SERVER_SERVE_FROM_SUB_PATH=true
- Grafana tự xử lý /grafana/ prefix
- Response: 200 OK (login page)
```

### Prometheus

```
Browser Request:
https://doanhoi.hcmut.edu.vn/prometheus/graph
         ↓
Nginx (WITH rewrite):
location /prometheus/ {
    rewrite ^/prometheus/(.*) /$1 break;  # ← Strip /prometheus/ prefix
    proxy_pass http://localhost:9091;
}
         ↓ Request trở thành: GET /graph
Prometheus Container:
- Nhận request: GET /graph (KHÔNG CÓ /prometheus/)
- --web.external-url=https://doanhoi.hcmut.edu.vn/prometheus/  # Links đúng
- --web.route-prefix=/  # ← Internal routing từ root
- Prometheus xử lý /graph
- Response: 200 OK (graph page)
```

**LƯU Ý:** Grafana và Prometheus khác nhau:
- **Grafana**: KHÔNG rewrite, vì có `GF_SERVER_SERVE_FROM_SUB_PATH=true`
- **Prometheus**: PHẢI rewrite, vì không có tính năng serve-from-subpath

## ⚠️ LƯU Ý QUAN TRỌNG

**Grafana vs Prometheus - Khác nhau về xử lý subpath:**

| Application | Nginx Config | Application Config | Lý do |
|-------------|--------------|-------------------|-------|
| **Grafana** | KHÔNG rewrite | `GF_SERVER_SERVE_FROM_SUB_PATH=true` | Grafana có tính năng serve-from-subpath |
| **Prometheus** | CÓ rewrite | `--web.route-prefix=/` | Prometheus KHÔNG có serve-from-subpath |

**KHÔNG dùng rewrite khi:**
- Application tự xử lý subpath (Grafana có `SERVE_FROM_SUB_PATH`)
- Application có config tương tự

**CHỈ dùng rewrite khi:**
- Application không biết về subpath (Prometheus, các app cũ)
- Application chỉ serve từ root path `/`
