# 🚀 GitLab CI/CD Setup Guide - Doanhoi Portal

## 📋 **Tổng quan**

Hướng dẫn này sẽ giúp bạn setup GitLab CI/CD pipeline để tự động deploy **Doanhoi Portal** từ GitLab lên production server.

### **🎯 Mục tiêu:**
- ✅ Tự động test code khi push
- ✅ Tự động build Docker images
- ✅ Tự động deploy lên server production
- ✅ Zero-downtime deployment
- ✅ Rollback dễ dàng khi có lỗi

### **🏗️ Pipeline Workflow:**
```
Push Code → Test → Build → Deploy → Health Check → Success!
```

---

## 🔧 **Bước 1: Chuẩn bị SSH Key cho GitLab**

### **1.1 Tạo SSH Key riêng cho CI/CD:**
```powershell
# Mở PowerShell/Git Bash
ssh-keygen -t rsa -b 4096 -C "gitlab-ci@doanhoi.com" -f ~/.ssh/gitlab_doanhoi_key

# Nhập passphrase rỗng (Enter 2 lần)
```

### **1.2 Copy Private Key:**
```powershell
# Copy private key content
Get-Content ~/.ssh/gitlab_doanhoi_key | Set-Clipboard

# Hoặc dùng cat trên Git Bash:
cat ~/.ssh/gitlab_doanhoi_key
```
→ **Lưu content này để thêm vào GitLab Variables**

### **1.3 Thêm Public Key lên Server:**
```powershell
# Copy public key
Get-Content ~/.ssh/gitlab_doanhoi_key.pub

# SSH vào server và thêm key
ssh root@103.88.121.146
echo "YOUR_PUBLIC_KEY_CONTENT" >> ~/.ssh/authorized_keys
chmod 600 ~/.ssh/authorized_keys
```

### **1.4 Test SSH Connection:**
```powershell
ssh -i ~/.ssh/gitlab_doanhoi_key root@103.88.121.146 "echo 'SSH OK'"
```

---

## 🎛️ **Bước 2: Cấu hình GitLab Variables**

### **2.1 Truy cập GitLab Settings:**
1. Vào project GitLab: https://gitlab.com/duytnb/doanhoi-portal
2. **Settings** > **CI/CD**
3. Mở rộng **Variables** section

### **2.2 Thêm các Variables sau:**

| Variable Name | Value | Type | Protected | Masked |
|---------------|-------|------|-----------|---------|
| `SSH_PRIVATE_KEY` | [Content private key] | **File** | ✅ | ❌ |
| `PRODUCTION_SERVER` | `103.88.121.146` | Variable | ✅ | ❌ |
| `PRODUCTION_USER` | `root` | Variable | ✅ | ❌ |
| `DEPLOY_PATH` | `/opt/doanhoi-portal` | Variable | ✅ | ❌ |
| `DOMAIN` | `doanhoi.hcmut.edu.vn` | Variable | ❌ | ❌ |

**🔑 Quan trọng:**
- `SSH_PRIVATE_KEY` phải có Type = **File**
- Protected = ✅ có nghĩa chỉ chạy trên protected branches
- Masked = ✅ có nghĩa ẩn value trong logs

---

## 📁 **Bước 3: Chuẩn bị Files Cần thiết**

### **3.1 Kiểm tra cấu trúc project:**
```
doanhoi-portal/
├── .gitlab-ci.yml                 # ✅ Pipeline config
├── docker-compose.prod.yml        # ✅ Production compose
├── .env.production                 # ✅ Backend env
├── backend/
│   └── Dockerfile.prod            # ✅ Backend Docker
├── frontend/
│   ├── Dockerfile.prod            # ✅ Frontend Docker
│   ├── .env.production            # ✅ Frontend env
│   └── nginx.conf                 # ✅ Nginx config
└── README.md
```

### **3.2 Cập nhật .env.production với PayOS:**
```bash
# Database Configuration
DB_HOST=postgres
DB_PORT=5432
DB_USERNAME=postgres
DB_PASSWORD=DoanhOi2024!@#$
DB_NAME=doanhoi

# JWT Configuration
JWT_SECRET=DoanhOi-Super-Secret-JWT-Key-Production-2024!@#$
JWT_REFRESH_SECRET=DoanhOi-Super-Secret-Refresh-Key-Production-2024!@#$
JWT_EXPIRES_IN=60m
JWT_REFRESH_EXPIRES_IN=7d

# Frontend URL
FRONTEND_URL=https://doanhoi.hcmut.edu.vn

# Port Configuration
PORT=9200

# Node Environment
NODE_ENV=production

# PayOS Configuration
PAYOS_CLIENT_ID=your-payos-client-id
PAYOS_API_KEY=your-payos-api-key
PAYOS_CHECKSUM_KEY=your-payos-checksum-key
```

### **3.3 Cập nhật frontend/.env.production:**
```bash
# Backend API URL
VITE_BACKEND_API_URL=https://doanhoi.hcmut.edu.vn/api

# Environment
NODE_ENV=production
```

---

## 🚀 **Bước 4: Push Code và Trigger Pipeline**

### **4.1 Commit tất cả changes:**
```powershell
# Add tất cả files
git add .

# Commit với message rõ ràng
git commit -m "feat: setup GitLab CI/CD pipeline

- Add .gitlab-ci.yml with 3-stage deployment
- Update environment configurations
- Add PayOS integration configs
- Setup automated testing and deployment"

# Push lên GitLab
git push origin dev
```

### **4.2 Theo dõi Pipeline:**
1. Vào GitLab project → **CI/CD** → **Pipelines**
2. Click vào pipeline mới nhất
3. Theo dõi các stages:
   - 🧪 **test_backend** - Test và build backend
   - 🧪 **test_frontend** - Test và build frontend
   - 📦 **build_artifacts** - Chuẩn bị deployment files
   - 🚀 **deploy_production** - **Manual trigger** (cần click "Play")

---

## 🎯 **Bước 5: Manual Deployment**

### **5.1 Trigger Deployment:**
1. Khi pipeline đến stage `deploy_production`
2. Click nút **"Play"** ▶️ để trigger deployment
3. Pipeline sẽ:
   - 📤 Upload files lên server
   - 🛑 Stop containers cũ
   - 🔨 Build containers mới
   - ▶️ Start containers mới
   - 🩺 Health check
   - ✅ Verify deployment

### **5.2 Monitor Deployment:**
```bash
# Theo dõi logs trong GitLab
# Hoặc SSH vào server để check trực tiếp:
ssh root@103.88.121.146
cd /opt/doanhoi-portal
docker-compose -f docker-compose.prod.yml logs -f
```

---

## 📊 **Bước 6: Verification và Testing**

### **6.1 Kiểm tra deployment:**
- 🌐 **Website**: https://doanhoi.hcmut.edu.vn
- 🔧 **API**: https://doanhoi.hcmut.edu.vn/api
- 👤 **Admin Login**: admin@doanhoi.com / admin123

### **6.2 Test các tính năng:**
- ✅ Login admin
- ✅ Truy cập trang quản lý đóng phí
- ✅ Tạo chiến dịch đóng phí mới
- ✅ Test PayOS integration
- ✅ Kiểm tra permissions

---

## 🔄 **Workflow sau khi Setup**

### **Daily Development Workflow:**
```powershell
# 1. Developer workflow
git checkout dev
# ... make changes ...
git add .
git commit -m "feat: add new feature"
git push origin dev

# 2. GitLab tự động chạy:
# → Test backend & frontend
# → Build artifacts
# → Chuẩn bị deployment

# 3. Manual deployment:
# → Vào GitLab UI
# → Click "Play" ở deploy_production
# → Chờ deployment hoàn tất
# → Verify website updated! 🎉
```

### **Emergency Deployment:**
```powershell
# Sử dụng script quick deploy
./scripts/quick-deploy.sh

# Hoặc force push để trigger pipeline
git commit --allow-empty -m "deploy: emergency deployment"
git push origin dev
```

### **Rollback nếu có vấn đề:**
1. Vào GitLab → **CI/CD** → **Pipelines**
2. Tìm pipeline có vấn đề
3. Click **rollback_production** job
4. Click **"Play"** để rollback

---

## 🛡️ **Security và Best Practices**

### **7.1 GitLab Security:**
- ✅ SSH keys riêng cho CI/CD
- ✅ Protected variables cho sensitive data
- ✅ Manual approval cho production deployment
- ✅ Environment isolation

### **7.2 Server Security:**
- ✅ Firewall configured
- ✅ SSL certificates
- ✅ Database password security
- ✅ JWT secrets rotation

### **7.3 Monitoring:**
- ✅ Pipeline notifications
- ✅ Health checks
- ✅ Automated backups
- ✅ Log monitoring

---

## 🚨 **Troubleshooting Common Issues**

### **❌ SSH Permission Denied:**
```bash
# Kiểm tra SSH key format
ssh -i ~/.ssh/gitlab_doanhoi_key root@103.88.121.146 -v

# Regenerate key nếu cần
ssh-keygen -t rsa -b 4096 -C "gitlab-ci" -f ~/.ssh/gitlab_doanhoi_key
```

### **❌ Container Build Failed:**
```bash
# SSH vào server check logs
ssh root@103.88.121.146
cd /opt/doanhoi-portal
docker-compose -f docker-compose.prod.yml logs

# Clean up Docker space
docker system prune -f
```

### **❌ Health Check Failed:**
```bash
# Check specific service
curl http://localhost:2681/api  # Backend
curl http://localhost:2680      # Frontend
curl -k https://doanhoi.hcmut.edu.vn  # Domain

# Restart services nếu cần
docker-compose -f docker-compose.prod.yml restart
```

### **❌ PayOS Integration Issues:**
- Kiểm tra PayOS credentials trong .env.production
- Verify PayOS webhook URLs
- Check PayOS API documentation

---

## 🎉 **Kết quả mong đợi**

Sau khi hoàn thành setup, bạn sẽ có:

### **✅ Automated CI/CD Pipeline:**
- 🧪 Automatic testing on every push
- 📦 Artifact building and caching
- 🚀 One-click deployment to production
- 🔄 Easy rollback mechanism

### **✅ Production-Ready Infrastructure:**
- 🐳 Docker containerization
- 🌐 HTTPS with proper SSL
- 🔐 Secure environment management
- 📊 Health monitoring

### **✅ Developer Experience:**
- ⚡ Fast development iterations
- 🛡️ Safe deployment process
- 📈 Deployment history tracking
- 🚨 Immediate issue notification

### **✅ Business Features:**
- 💳 PayOS payment integration
- 👥 Complete user management
- 🏢 Organization & class management
- 💰 Fee collection campaigns
- 📊 Payment reports and analytics

---

## 📞 **Support và Next Steps**

### **Immediate Actions:**
1. ✅ Setup SSH keys và GitLab variables
2. ✅ Update PayOS credentials
3. ✅ Test first deployment
4. ✅ Verify all features working

### **Optional Enhancements:**
- 📱 Add Slack/Teams notifications
- 🧪 Add automated testing
- 📊 Add performance monitoring
- 🔄 Add staging environment

### **Documentation:**
- 📖 Keep this guide updated
- 📝 Document PayOS configuration
- 🔧 Maintain troubleshooting notes
- 👥 Share with team members

---

**🎊 Chúc mừng! Bạn đã có một hệ thống CI/CD hoàn chỉnh cho Doanhoi Portal!** 🚀

Giờ đây việc deploy chỉ là một click chuột trong GitLab UI! 😊
