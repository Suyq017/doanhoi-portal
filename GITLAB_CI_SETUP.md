# 🔧 Hướng dẫn Setup GitLab CI/CD cho Doanhoi Portal

## 📋 Tổng quan

Hướng dẫn này sẽ giúp bạn thiết lập GitLab CI/CD pipeline để tự động deploy **Doanhoi Portal** khi push code vào nhánh `dev`.

### **🏗️ Pipeline Architecture:**
```
Code Push (dev) → Test → Build → Deploy → Health Check
```

### **🎯 Kết quả mong đợi:**
- ✅ Tự động test code khi push
- ✅ Tự động build Docker images
- ✅ Tự động deploy lên production server
- ✅ Health check và rollback nếu cần
- ✅ Backup tự động trước khi deploy

---

## 🛠️ Bước 1: Chuẩn bị GitLab Project

### **1.1 Push code lên GitLab:**
```bash
# Tại thư mục project
git init
git add .
git commit -m "Initial commit with CI/CD pipeline"

# Add GitLab remote (thay YOUR_GITLAB_URL)
git remote add origin https://gitlab.com/your-username/doanhoi-portal.git

# Push code
git push -u origin main

# Tạo nhánh dev
git checkout -b dev
git push -u origin dev
```

### **1.2 Kiểm tra cấu trúc project:**
Đảm bảo project có cấu trúc như sau:
```
doanhoi-portal/
├── .gitlab-ci.yml                 # ✅ Pipeline config
├── docker-compose.prod.yml        # ✅ Production Docker config
├── .env.production                 # ✅ Backend environment
├── backend/
│   ├── Dockerfile.prod            # ✅ Backend Docker image
│   └── package.json               # ✅ Dependencies
├── frontend/
│   ├── Dockerfile.prod            # ✅ Frontend Docker image
│   ├── .env.production            # ✅ Frontend environment
│   ├── nginx.conf                 # ✅ Nginx config
│   └── package.json               # ✅ Dependencies
└── GITLAB_CI_SETUP.md            # 📖 File này
```

---

## 🔐 Bước 2: Cấu hình GitLab Variables

### **2.1 Truy cập GitLab Settings:**
1. Vào project GitLab của bạn
2. Chọn **Settings** > **CI/CD**
3. Mở rộng **Variables** section

### **2.2 Thêm các Variables sau:**

#### **SSH_PRIVATE_KEY** (Type: File, Protected: ✅)
```bash
# Tạo SSH key pair nếu chưa có
ssh-keygen -t rsa -b 4096 -C "gitlab-ci@doanhoi.com" -f ~/.ssh/gitlab_deploy_key

# Copy private key content
cat ~/.ssh/gitlab_deploy_key
```
→ Paste toàn bộ nội dung private key vào GitLab Variable `SSH_PRIVATE_KEY`

#### **Thêm public key vào server:**
```bash
# Copy public key
cat ~/.ssh/gitlab_deploy_key.pub

# SSH vào server và thêm vào authorized_keys
ssh root@103.88.121.146
mkdir -p ~/.ssh
echo "YOUR_PUBLIC_KEY_HERE" >> ~/.ssh/authorized_keys
chmod 600 ~/.ssh/authorized_keys
chmod 700 ~/.ssh
```

#### **Các Variables khác:**
| Variable Name | Value | Type | Protected |
|---------------|-------|------|-----------|
| `PRODUCTION_SERVER` | `103.88.121.146` | Variable | ✅ |
| `PRODUCTION_USER` | `root` | Variable | ✅ |
| `DEPLOY_PATH` | `/opt/doanhoi-portal` | Variable | ✅ |
| `DOMAIN` | `doanhoi.hcmut.edu.vn` | Variable | ❌ |

---

## 🚀 Bước 3: Chuẩn bị Server Production

### **3.1 Cài đặt GitLab Runner (Optional - nếu dùng self-hosted runner):**
```bash
# SSH vào server
ssh root@103.88.121.146

# Install GitLab Runner
curl -L "https://packages.gitlab.com/install/repositories/runner/gitlab-runner/script.rpm.sh" | sudo bash
sudo dnf install -y gitlab-runner

# Register runner
sudo gitlab-runner register \
  --url https://gitlab.com/ \
  --registration-token YOUR_REGISTRATION_TOKEN \
  --description "Doanhoi Production Runner" \
  --tag-list "deploy,production" \
  --executor shell \
  --shell bash

# Start runner
sudo gitlab-runner start
sudo systemctl enable gitlab-runner
```

### **3.2 Cấu hình permissions cho GitLab Runner:**
```bash
# Add gitlab-runner to docker group
sudo usermod -aG docker gitlab-runner

# Test Docker access
sudo -u gitlab-runner docker ps

# Create deployment directory
sudo mkdir -p /opt/doanhoi-portal
sudo chown -R gitlab-runner:gitlab-runner /opt/doanhoi-portal
```

### **3.3 Test SSH connection từ GitLab:**
```bash
# Test từ GitLab CI (sẽ thực hiện trong pipeline)
ssh -o StrictHostKeyChecking=no root@103.88.121.146 "echo 'SSH connection successful'"
```

---

## 📦 Bước 4: Cấu hình Environment Files

### **4.1 Backend Environment (.env.production):**
```bash
# Kiểm tra file đã có chưa
cat .env.production

# Nếu chưa có, tạo file mới:
cat > .env.production << 'EOF'
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
EOF
```

### **4.2 Frontend Environment (frontend/.env.production):**
```bash
cat > frontend/.env.production << 'EOF'
# Backend API URL
VITE_BACKEND_API_URL=https://doanhoi.hcmut.edu.vn/api

# Environment
NODE_ENV=production
EOF
```

---

## 🎯 Bước 5: Test Pipeline

### **5.1 Trigger pipeline đầu tiên:**
```bash
# Tạo commit để trigger pipeline
git checkout dev
echo "# Test CI/CD Pipeline" >> README.md
git add README.md
git commit -m "feat: test CI/CD pipeline"
git push origin dev
```

### **5.2 Theo dõi pipeline:**
1. Vào GitLab project → **CI/CD** → **Pipelines**
2. Click vào pipeline đang chạy
3. Theo dõi từng stage:
   - ✅ **test_backend**: Test và build backend
   - ✅ **test_frontend**: Test và build frontend  
   - ✅ **build_artifacts**: Chuẩn bị deployment files
   - 🔧 **deploy_production**: Manual deployment (click "Play" để chạy)

### **5.3 Manual Deployment:**
- Pipeline sẽ dừng ở stage `deploy_production` 
- Click nút **"Play"** để bắt đầu deployment
- Theo dõi logs để xem quá trình deploy

---

## 📊 Bước 6: Monitor và Verification

### **6.1 Kiểm tra deployment status:**
```bash
# SSH vào server kiểm tra
ssh root@103.88.121.146

cd /opt/doanhoi-portal

# Kiểm tra containers
docker-compose -f docker-compose.prod.yml ps

# Kiểm tra logs
docker-compose -f docker-compose.prod.yml logs -f --tail=50
```

### **6.2 Health check endpoints:**
```bash
# Test từ server
curl http://localhost:2680      # Frontend
curl http://localhost:2681/api  # Backend

# Test từ internet
curl -k https://doanhoi.hcmut.edu.vn
```

### **6.3 Verify admin login:**
- URL: https://doanhoi.hcmut.edu.vn
- Email: `admin@doanhoi.com`
- Password: `admin123`

---

## 🔄 Bước 7: Rollback (Nếu cần)

### **7.1 Rollback từ GitLab:**
1. Vào **CI/CD** → **Pipelines**
2. Chọn pipeline có issue
3. Click **"Rollback"** job
4. Click **"Play"** để chạy rollback

### **7.2 Manual Rollback trên server:**
```bash
ssh root@103.88.121.146
cd /opt/doanhoi-portal

# Xem các backup có sẵn
ls -la docker-compose.prod.yml.backup-*

# Rollback về backup gần nhất
BACKUP_FILE=$(ls -t docker-compose.prod.yml.backup-* | head -n1)
echo "Rolling back to: $BACKUP_FILE"

# Stop containers
docker-compose -f docker-compose.prod.yml down

# Restore backup
cp "$BACKUP_FILE" docker-compose.prod.yml

# Start containers
docker-compose -f docker-compose.prod.yml up -d
```

---

## 🛡️ Security Best Practices

### **7.1 GitLab Security:**
- ✅ Sử dụng **Protected Variables** cho sensitive data
- ✅ Chỉ allow pipeline chạy trên **protected branches**
- ✅ Enable **Manual deployment** cho production
- ✅ SSH Key riêng cho CI/CD (không dùng chung)

### **7.2 Server Security:**
```bash
# Giới hạn SSH access cho CI/CD key
echo 'command="cd /opt/doanhoi-portal && bash",no-port-forwarding,no-X11-forwarding,no-agent-forwarding ssh-rsa YOUR_CI_CD_PUBLIC_KEY gitlab-ci@doanhoi.com' >> ~/.ssh/authorized_keys
```

### **7.3 Environment Security:**
- ✅ Secrets không được commit vào Git
- ✅ Database passwords mạnh
- ✅ JWT secrets unique cho production
- ✅ Regular security updates

---

## 📈 Advanced Features

### **8.1 Notifications:**
Thêm vào `.gitlab-ci.yml` để gửi thông báo:
```yaml
# Thêm job notification
notify_deployment:
  stage: deploy
  image: alpine:latest
  script:
    - apk add --no-cache curl
    - |
      curl -X POST "https://api.telegram.org/bot$TELEGRAM_BOT_TOKEN/sendMessage" \
           -d chat_id="$TELEGRAM_CHAT_ID" \
           -d text="🚀 Doanhoi Portal deployed successfully!%0A📅 Time: $(date)%0A🌿 Branch: $CI_COMMIT_REF_NAME%0A📝 Commit: $CI_COMMIT_SHORT_SHA%0A🔗 URL: https://doanhoi.hcmut.edu.vn"
  dependencies:
    - deploy_production
  when: on_success
  only:
    - dev
```

### **8.2 Automated Testing:**
```yaml
# Thêm vào test stage
e2e_tests:
  stage: test
  image: cypress/included:latest
  script:
    - cd frontend
    - npm ci
    - npm run e2e
  artifacts:
    when: always
    paths:
      - frontend/cypress/screenshots
      - frontend/cypress/videos
  only:
    - dev
```

### **8.3 Performance Monitoring:**
```yaml
# Thêm performance check
performance_check:
  stage: deploy
  image: alpine:latest
  script:
    - apk add --no-cache curl
    - |
      RESPONSE_TIME=$(curl -o /dev/null -s -w '%{time_total}' https://doanhoi.hcmut.edu.vn)
      echo "Response time: ${RESPONSE_TIME}s"
      if (( $(echo "$RESPONSE_TIME > 5.0" | bc -l) )); then
        echo "⚠️ Warning: Slow response time detected"
      else
        echo "✅ Good response time"
      fi
  dependencies:
    - deploy_production
  when: on_success
  only:
    - dev
```

---

## 🔧 Troubleshooting

### **Common Issues:**

#### **1. SSH Permission Denied:**
```bash
# Kiểm tra SSH key format
cat ~/.ssh/gitlab_deploy_key | head -n1
# Phải bắt đầu với: -----BEGIN OPENSSH PRIVATE KEY-----

# Regenerate nếu cần
ssh-keygen -t rsa -b 4096 -C "gitlab-ci" -m PEM
```

#### **2. Docker Permission Denied:**
```bash
# Add gitlab-runner to docker group
sudo usermod -aG docker gitlab-runner
sudo systemctl restart gitlab-runner
```

#### **3. Deployment Timeout:**
```bash
# Increase timeout trong .gitlab-ci.yml
timeout: 2h
```

#### **4. Container Build Failed:**
```bash
# Check Docker space
docker system df
docker system prune -f
```

---

## 🎉 Kết luận

Sau khi hoàn thành setup, bạn sẽ có:

1. ✅ **Automatic CI/CD Pipeline** chạy khi push code vào `dev`
2. ✅ **Automated Testing** backend và frontend
3. ✅ **Zero-downtime Deployment** với health checks
4. ✅ **Automatic Backup** trước mỗi lần deploy
5. ✅ **Easy Rollback** khi có vấn đề
6. ✅ **Production Monitoring** và alerts

### **Workflow sau khi setup:**
```bash
# Developer workflow
git checkout dev
# ... make changes ...
git add .
git commit -m "feat: new feature"
git push origin dev

# → GitLab tự động chạy pipeline
# → Test pass → Build success → Manual deploy trigger
# → Click "Play" để deploy lên production
# → Health check → Website updated! 🎉
```

**Happy Deploying!** 🚀
