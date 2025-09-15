# 🔄 Hướng dẫn Reset Database

## 📋 Tổng quan

Dự án có 3 cách để reset toàn bộ database:

1. **🚀 Script tự động** (Khuyến nghị)
2. **⚡ Quick reset** (Nhanh, chỉ reset data)  
3. **🛠️ Thủ công** (Chi tiết từng bước)

---

## 🚀 Phương pháp 1: Script Tự động (Khuyến nghị)

### Reset hoàn toàn (containers + data)
```powershell
.\reset-database.ps1
```

### Reset nhưng giữ containers
```powershell
.\reset-database.ps1 -KeepContainers
```

### Reset không cần xác nhận
```powershell
.\reset-database.ps1 -Force
```

**✅ Ưu điểm:**
- Tự động hoàn toàn
- An toàn với xác nhận
- Có logging chi tiết
- Kiểm tra kết quả

**⏱️ Thời gian:** 2-3 phút

---

## ⚡ Phương pháp 2: Quick Reset

```powershell
.\quick-reset-db.ps1
```

**✅ Ưu điểm:**
- Rất nhanh (30 giây)
- Giữ containers hiện tại
- Phù hợp development

**❌ Nhược điểm:**
- Cần containers đã chạy
- Ít kiểm tra lỗi

---

## 🛠️ Phương pháp 3: Reset Thủ công

### Bước 1: Dừng containers
```powershell
docker-compose down
```

### Bước 2: Xóa volumes
```powershell
# Xóa volume postgres
docker volume rm doanhoi-portal_postgres_data -f

# Xóa volume pgadmin  
docker volume rm doanhoi-portal_pgadmin_data -f

# Kiểm tra volumes còn lại
docker volume ls | findstr doanhoi
```

### Bước 3: Khởi động lại
```powershell
# Chỉ khởi động postgres và pgadmin
docker-compose up -d postgres pgadmin

# Hoặc khởi động tất cả
docker-compose up -d
```

### Bước 4: Đợi PostgreSQL sẵn sàng
```powershell
# Kiểm tra trạng thái
docker-compose exec postgres pg_isready -U postgres -d doanhoi
```

### Bước 5: Seed database
```powershell
cd backend
npm run seed
```

---

## 🔍 Kiểm tra kết quả

### 1. Kiểm tra kết nối database
```powershell
docker-compose exec postgres psql -U postgres -d doanhoi -c "\dt"
```

### 2. Kiểm tra dữ liệu
```powershell
# Đếm users
docker-compose exec postgres psql -U postgres -d doanhoi -c "SELECT COUNT(*) FROM users;"

# Đếm permissions  
docker-compose exec postgres psql -U postgres -d doanhoi -c "SELECT COUNT(*) FROM permissions;"

# Đếm organizations
docker-compose exec postgres psql -U postgres -d doanhoi -c "SELECT COUNT(*) FROM organizations;"
```

### 3. Test đăng nhập
- URL: http://localhost:9100
- Email: `admin@doanhoi.com`
- Password: `admin1`

---

## 🚨 Xử lý sự cố

### Lỗi: "Port 9000 đã được sử dụng"
```powershell
# Tìm process đang dùng port
netstat -ano | findstr :9000

# Kill process (thay PID)
taskkill /F /PID <PID>
```

### Lỗi: "Docker không khởi động"
```powershell
# Restart Docker Desktop
Restart-Service -Name "Docker Desktop Service" -Force

# Hoặc khởi động lại Docker
docker system prune -f
```

### Lỗi: "npm run seed thất bại"
```powershell
# Kiểm tra log chi tiết
cd backend
npm run seed 2>&1 | Tee-Object -FilePath "seed.log"

# Seed từng phần
npm run seed:permissions
npm run seed:roles  
npm run seed:users
```

### Lỗi: "Containers không thể kết nối"
```powershell
# Reset Docker network
docker network prune -f
docker-compose down
docker-compose up -d
```

---

## 📊 Dữ liệu mặc định sau reset

### 🏢 Organizations
- **Đoàn Trường ĐHBK** (Root)
  - Đoàn Cơ sở Khoa CNTT
    - Chi Đoàn Lớp CC21
    - Chi Đoàn Lớp CC22
- **Hội Sinh viên Trường** (Root)
  - Liên Chi Hội Khoa CNTT
    - Chi Hội Lớp CC21
    - Chi Hội Lớp CC22

### 👤 Users mặc định
| Email | Password | Role | Organization |
|-------|----------|------|--------------|
| admin@doanhoi.com | admin1 | super_admin | System |

### 🔐 Permissions
- **40+ permissions** được tạo tự động
- **8 categories:** dashboard, users, organizations, departments, classes, permissions, payments, system
- **3 roles:** super_admin, admin, user

---

## 🎯 Use Cases phổ biến

### Development
```powershell
# Reset nhanh cho development
.\quick-reset-db.ps1 -Force
```

### Testing  
```powershell
# Reset hoàn toàn cho test
.\reset-database.ps1 -Force
```

### Production Setup
```powershell
# Reset cẩn thận cho production
.\reset-database.ps1
# Confirm từng bước
```

### Debug Issues
```powershell
# Reset với container mới
.\reset-database.ps1

# Check logs
docker-compose logs postgres
docker-compose logs backend
```

---

## 💡 Tips

### 1. **Backup trước khi reset**
```powershell
# Export data
docker-compose exec postgres pg_dump -U postgres doanhoi > backup.sql

# Restore sau này
docker-compose exec -T postgres psql -U postgres doanhoi < backup.sql
```

### 2. **Reset chỉ một số bảng**
```powershell
# Vào postgres
docker-compose exec postgres psql -U postgres doanhoi

# Xóa data từng bảng
TRUNCATE TABLE users RESTART IDENTITY CASCADE;
TRUNCATE TABLE organizations RESTART IDENTITY CASCADE;
```

### 3. **Reset nhanh trong development**
```powershell
# Alias cho quick reset
Set-Alias -Name "resetdb" -Value ".\quick-reset-db.ps1"

# Sử dụng
resetdb -Force
```

---

## ⚙️ Cấu hình Database

### Connection Info
```
Host: localhost
Port: 9000
Database: doanhoi  
Username: postgres
Password: password
```

### PgAdmin
```
URL: http://localhost:9001
Email: admin@doanhoi.com
Password: admin123
```

### Backend API
```
URL: http://localhost:9200
Swagger: http://localhost:9200/api
```

### Frontend
```
URL: http://localhost:9100
```

---

**🎉 Với các scripts này, bạn có thể reset database dễ dàng và an toàn trong vài phút!**
