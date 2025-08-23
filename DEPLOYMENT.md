# 🚀 Deployment Guide

## Lỗi và Giải pháp

### ❌ **Lỗi gặp phải:**
```
Permission denied: /opt/doanhoi-portal
cannot stat 'Dockerfile.*': No such file or directory
lchown operation not permitted
```

### ✅ **Nguyên nhân:**
1. GitLab runner không có quyền sudo để ghi vào `/opt/doanhoi-portal`
2. Đường dẫn file Dockerfile không đúng
3. Artifacts không được copy đúng cấu trúc

### 🛠️ **Giải pháp đã áp dụng:**

#### 1. **Cập nhật GitLab CI/CD (.gitlab-ci.yml)**
- ✅ Sử dụng `sudo` cho tất cả operations
- ✅ Đường dẫn Dockerfile chính xác: `backend/Dockerfile.prod`, `frontend/Dockerfile.prod`
- ✅ Tạo proper directory structure
- ✅ Set permissions với `chown` và `chmod`

#### 2. **Setup Server Script (setup-server.sh)**
- ✅ Tạo directories với proper permissions
- ✅ Setup .env.production template
- ✅ Configure GitLab runner permissions

#### 3. **Cập nhật Docker Compose**
- ✅ Sử dụng `env_file` để load environment variables
- ✅ Proper health checks và dependencies

## 📋 **Hướng dẫn Deploy:**

### **Bước 1: Setup Server (Chỉ làm 1 lần)**
```bash
# Trên server, chạy script setup
chmod +x setup-server.sh
sudo ./setup-server.sh

# Cập nhật .env.production với values thực tế
sudo nano /opt/doanhoi-portal/.env.production
```

### **Bước 2: Deploy qua GitLab CI/CD**
1. Push code lên branch `dev`
2. Vào GitLab → CI/CD → Pipelines
3. Click **"Run pipeline"** cho job `deploy:production`
4. Monitor logs và check kết quả

### **Bước 3: Verify Deployment**
```bash
# Check containers
sudo docker-compose -f /opt/doanhoi-portal/docker-compose.prod.yml ps

# Check logs
sudo docker-compose -f /opt/doanhoi-portal/docker-compose.prod.yml logs backend

# Check website
curl https://103.88.121.146
curl http://localhost:9200/api
```

## 🔧 **Troubleshooting:**

### **Nếu vẫn lỗi permissions:**
```bash
# Thêm gitlab-runner vào sudo group
sudo usermod -aG sudo gitlab-runner

# Hoặc config sudoers
sudo visudo
# Thêm: gitlab-runner ALL=(ALL) NOPASSWD: ALL
```

### **Nếu Docker build fail:**
```bash
# Clear docker cache
sudo docker system prune -a -f

# Rebuild manual
cd /opt/doanhoi-portal
sudo docker-compose -f docker-compose.prod.yml build --no-cache
```

### **Nếu environment variables không load:**
```bash
# Check .env.production file
cat /opt/doanhoi-portal/.env.production

# Test with manual deployment
sudo docker-compose -f docker-compose.prod.yml --env-file .env.production up -d
```

## 📊 **Monitoring:**

### **View Logs:**
```bash
# Backend logs
sudo docker logs doanhoi-backend-prod -f

# Database logs  
sudo docker logs doanhoi-postgres-prod -f

# Nginx logs
sudo tail -f /var/log/nginx/access.log
```

### **Health Checks:**
```bash
# Backend API
curl http://localhost:9200/api

# Database connection
sudo docker exec doanhoi-postgres-prod pg_isready -U postgres

# Frontend
curl https://103.88.121.146
```

## 🎯 **Key Changes Made:**

1. **Fixed file paths** in GitLab CI artifacts
2. **Added sudo permissions** for all file operations
3. **Proper directory structure** creation
4. **Environment file management** with templates
5. **Improved error handling** and fallbacks
6. **Better health checks** and monitoring

## 🔗 **URLs sau deploy:**
- **Website**: https://103.88.121.146
- **API**: http://localhost:9200/api (internal)
- **Database**: Internal Docker network only
