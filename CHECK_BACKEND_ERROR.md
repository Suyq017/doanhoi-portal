# 🔧 Hướng dẫn Debug Backend 502 Error

## ❌ Vấn đề hiện tại

Backend container **đang restart liên tục**:
```
c7e8efefad4e   doanhoi-portal-backend    Up 25 seconds (health: starting)
```

Dấu hiệu:
- Container chỉ up được vài giây/phút rồi crash
- Nginx trả về **502 Bad Gateway** vì backend không available

## 🔍 Các bước debug

### 1️⃣ Xem logs backend để tìm lỗi

```bash
# Xem logs realtime
docker logs -f doanhoi-backend-prod

# Hoặc xem 100 dòng cuối
docker logs --tail 100 doanhoi-backend-prod
```

**Tìm kiếm các lỗi phổ biến:**

#### ❌ Lỗi kết nối Database
```
Error: connect ECONNREFUSED 127.0.0.1:5432
FATAL: password authentication failed
```
**Fix:** Kiểm tra `DB_PASSWORD` trong `.env.production`

#### ❌ Lỗi missing env variables
```
Error: Configuration validation error
Missing required environment variable: JWT_SECRET
```
**Fix:** Kiểm tra file `.env.production` có đầy đủ biến không

#### ❌ Lỗi port đã được sử dụng
```
Error: listen EADDRINUSE: address already in use :::9200
```
**Fix:** Kiểm tra container khác có dùng port 9200 không

#### ❌ Lỗi TypeScript/Build
```
TypeError: Cannot read property 'xyz' of undefined
SyntaxError: Unexpected token
```
**Fix:** Code có lỗi, cần fix và rebuild

#### ❌ Lỗi migration database
```
QueryFailedError: relation "xyz" does not exist
```
**Fix:** Chạy migration hoặc tạo schema

### 2️⃣ Kiểm tra backend có connect được database không

```bash
# Test connection từ backend container đến postgres
docker exec doanhoi-backend-prod sh -c 'nc -zv postgres 5432'

# Hoặc test bằng curl (nếu backend có endpoint health)
curl http://localhost:2681/health
```

### 3️⃣ Kiểm tra file `.env.production`

```bash
# Xem env variables trong container
docker exec doanhoi-backend-prod env | grep -E "DB_|JWT_|GOOGLE_|PORT"

# So sánh với file .env.production trên server
cat .env.production | grep -E "DB_|JWT_|GOOGLE_|PORT"
```

**Checklist env variables quan trọng:**
- [ ] `DB_PASSWORD` - Khớp với postgres container
- [ ] `DB_HOST=postgres` - Phải là tên container, không phải localhost
- [ ] `JWT_SECRET` - Không được empty
- [ ] `JWT_REFRESH_SECRET` - Không được empty
- [ ] `GOOGLE_CLIENT_ID` và `GOOGLE_CLIENT_SECRET`
- [ ] `GOOGLE_CALLBACK_URL=https://doanhoi.hcmut.edu.vn/api/auth/google/callback`

### 4️⃣ Rebuild backend nếu cần

```bash
# Stop và remove container cũ
docker compose -f docker-compose.prod.yml --env-file .env.production down backend

# Rebuild từ đầu (no cache)
docker compose -f docker-compose.prod.yml --env-file .env.production build --no-cache backend

# Start lại
docker compose -f docker-compose.prod.yml --env-file .env.production up -d backend

# Theo dõi logs
docker logs -f doanhoi-backend-prod
```

### 5️⃣ Kiểm tra healthcheck

```bash
# Xem healthcheck status
docker inspect doanhoi-backend-prod | grep -A 10 Health

# Test healthcheck endpoint manually
docker exec doanhoi-backend-prod curl -f http://localhost:9200/health || echo "Health check failed"
```

## 🚨 Các lỗi thường gặp và cách fix nhanh

### Lỗi 1: Backend không start vì missing env
```bash
# Copy .env.production.example và điền đầy đủ
cp .env.production.example .env.production
nano .env.production

# Restart
docker compose -f docker-compose.prod.yml --env-file .env.production restart backend
```

### Lỗi 2: Database chưa có schema/tables
```bash
# Vào backend container và chạy migration
docker exec -it doanhoi-backend-prod sh
npm run migration:run
# hoặc
npm run db:reset  # Cẩn thận: Xóa hết data!
```

### Lỗi 3: Port conflict
```bash
# Kiểm tra port 2681 có bị chiếm không
netstat -tlnp | grep 2681

# Nếu có process khác, kill hoặc đổi port trong docker-compose
```

### Lỗi 4: Nginx không forward đúng
```bash
# Test trực tiếp backend (bỏ qua nginx)
curl http://localhost:2681/api

# Nếu OK → lỗi ở nginx config
# Nếu fail → lỗi ở backend
```

## 📋 Commands hữu ích

```bash
# Xem tất cả containers
docker ps -a

# Restart tất cả services
docker compose -f docker-compose.prod.yml --env-file .env.production restart

# Xem logs tất cả services
docker compose -f docker-compose.prod.yml logs -f

# Vào backend container để debug
docker exec -it doanhoi-backend-prod sh

# Kiểm tra disk space (backend có thể crash vì hết disk)
df -h

# Kiểm tra memory
free -h
```

## 🎯 Next Steps

1. **Chạy ngay:** `docker logs --tail 100 doanhoi-backend-prod`
2. **Tìm dòng ERROR** hoặc exception cuối cùng
3. **Gửi logs cho tôi** để debug chính xác
4. **Nếu không thấy lỗi rõ ràng:** Rebuild backend với `--no-cache`

---

**Lưu ý:** Lỗi 502 = Nginx OK nhưng backend DOWN. Focus vào backend logs để tìm nguyên nhân!
