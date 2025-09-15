# 🔄 Hướng dẫn Reset Database - Linux Version

## 📋 Tổng quan

Cho Linux server, có 3 cách để reset toàn bộ database:

1. **🚀 Script bash tự động** (Khuyến nghị)
2. **⚡ Quick reset bash** (Nhanh, chỉ reset data)  
3. **🛠️ Thủ công** (Chi tiết từng bước)

---

## 🚀 Phương pháp 1: Script Bash Tự động (Khuyến nghị)

### Cấp quyền thực thi cho scripts
```bash
chmod +x reset-database.sh
chmod +x quick-reset-db.sh
```

### Reset hoàn toàn (containers + data)
```bash
./reset-database.sh
```

### Reset nhưng giữ containers
```bash
./reset-database.sh --keep-containers
```

### Reset không cần xác nhận
```bash
./reset-database.sh --force
```

**✅ Ưu điểm:**
- Tự động hoàn toàn
- An toàn với xác nhận
- Có logging chi tiết
- Kiểm tra kết quả

**⏱️ Thời gian:** 2-3 phút

---

## ⚡ Phương pháp 2: Quick Reset

```bash
./quick-reset-db.sh --force
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
```bash
docker-compose down
```

### Bước 2: Xóa volumes
```bash
# Xóa volume postgres
docker volume rm doanhoi-portal_postgres_data

# Xóa volume pgadmin  
docker volume rm doanhoi-portal_pgadmin_data

# Kiểm tra volumes còn lại
docker volume ls | grep doanhoi
```

### Bước 3: Khởi động lại
```bash
# Chỉ khởi động postgres và pgadmin
docker-compose up -d postgres pgadmin

# Hoặc khởi động tất cả
docker-compose up -d
```

### Bước 4: Đợi PostgreSQL sẵn sàng
```bash
# Kiểm tra trạng thái
docker-compose exec postgres pg_isready -U postgres -d doanhoi
```

### Bước 5: Tạo schema và seed database
```bash
cd backend
npm run db:create-schema
npm run seed
```

---

## 🔍 Kiểm tra kết quả

### 1. Kiểm tra kết nối database
```bash
docker-compose exec postgres psql -U postgres -d doanhoi -c "\dt"
```

### 2. Kiểm tra dữ liệu
```bash
# Đếm users
docker-compose exec postgres psql -U postgres -d doanhoi -c "SELECT COUNT(*) FROM users;"

# Đếm permissions  
docker-compose exec postgres psql -U postgres -d doanhoi -c "SELECT COUNT(*) FROM permissions;"

# Đếm organizations
docker-compose exec postgres psql -U postgres -d doanhoi -c "SELECT COUNT(*) FROM organizations;"
```

### 3. Test đăng nhập
- URL: http://your-server-ip:9100
- Email: `admin@doanhoi.com`
- Password: `admin1`

---

## 🚨 Xử lý sự cố Linux

### Lỗi: "Permission denied" khi chạy script
```bash
# Cấp quyền thực thi
chmod +x reset-database.sh
chmod +x quick-reset-db.sh

# Hoặc chạy bằng bash
bash reset-database.sh
```

### Lỗi: "Port 9000 đã được sử dụng"
```bash
# Tìm process đang dùng port
sudo netstat -tulpn | grep :9000
sudo lsof -i :9000

# Kill process
sudo kill -9 <PID>
```

### Lỗi: "Docker permission denied"
```bash
# Thêm user vào docker group
sudo usermod -aG docker $USER

# Logout và login lại, hoặc
newgrp docker

# Hoặc chạy với sudo
sudo ./reset-database.sh
```

### Lỗi: "docker-compose not found"
```bash
# Cài docker-compose
sudo curl -L "https://github.com/docker/compose/releases/download/v2.20.2/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose

# Hoặc sử dụng docker compose (v2)
# Script sẽ tự động detect và sử dụng
```

### Lỗi: "npm not found"
```bash
# Cài Node.js và npm
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Hoặc với yum (CentOS/RHEL)
curl -fsSL https://rpm.nodesource.com/setup_18.x | sudo bash -
sudo yum install -y nodejs
```

---

## 🎯 Use Cases cho Linux Server

### Development trên server
```bash
# Reset nhanh cho development
./quick-reset-db.sh --force
```

### Production deployment
```bash
# Reset cẩn thận cho production
./reset-database.sh
# Confirm từng bước
```

### CI/CD Pipeline
```bash
# Trong script deployment
./reset-database.sh --force --keep-containers
```

### Debug Issues
```bash
# Reset với container mới
./reset-database.sh --force

# Check logs
docker-compose logs postgres
docker-compose logs backend
```

---

## 💡 Tips cho Linux

### 1. **Tạo alias cho tiện lợi**
```bash
# Thêm vào ~/.bashrc hoặc ~/.profile
alias resetdb='./quick-reset-db.sh --force'
alias fullreset='./reset-database.sh --force'

# Reload
source ~/.bashrc
```

### 2. **Chạy trong background**
```bash
# Reset trong background
nohup ./reset-database.sh --force > reset.log 2>&1 &

# Xem log
tail -f reset.log
```

### 3. **Backup trước khi reset**
```bash
# Backup script
#!/bin/bash
timestamp=$(date +%Y%m%d_%H%M%S)
docker-compose exec -T postgres pg_dump -U postgres doanhoi > "backup_${timestamp}.sql"
echo "Backup saved as: backup_${timestamp}.sql"

# Restore
docker-compose exec -T postgres psql -U postgres doanhoi < backup_20250915_123456.sql
```

### 4. **Monitoring reset process**
```bash
# Theo dõi containers
watch docker-compose ps

# Theo dõi logs real-time
docker-compose logs -f postgres
```

---

## 🔧 Systemd Service (Optional)

Tạo service để quản lý dễ hơn:

```bash
# Tạo file service
sudo nano /etc/systemd/system/doanhoi-reset.service
```

```ini
[Unit]
Description=Doanhoi Database Reset Service
After=docker.service

[Service]
Type=oneshot
User=root
WorkingDirectory=/opt/doanhoi-portal
ExecStart=/opt/doanhoi-portal/reset-database.sh --force
RemainAfterExit=yes

[Install]
WantedBy=multi-user.target
```

```bash
# Enable và sử dụng
sudo systemctl daemon-reload
sudo systemctl enable doanhoi-reset.service

# Chạy reset
sudo systemctl start doanhoi-reset.service

# Xem status
sudo systemctl status doanhoi-reset.service
```

---

## 📊 Server Requirements

### Minimum Requirements
- **OS:** Ubuntu 20.04+, CentOS 8+, hoặc tương đương
- **RAM:** 4GB+
- **Storage:** 20GB+ free space
- **Docker:** 20.10+
- **Docker Compose:** 2.0+
- **Node.js:** 18+

### Recommended
- **RAM:** 8GB+
- **Storage:** 50GB+ SSD
- **CPU:** 4 cores+

---

**🎉 Với các scripts này, bạn có thể reset database trên Linux server dễ dàng và an toàn!**

## 🚀 Quick Start cho Linux

```bash
# 1. Cấp quyền
chmod +x *.sh

# 2. Reset nhanh
./quick-reset-db.sh --force

# 3. Kiểm tra
docker-compose ps
curl http://localhost:9100
```
