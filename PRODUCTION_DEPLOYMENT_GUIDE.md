# 🚀 Hướng dẫn Deploy Production - Doanhoi Portal

## 📋 Tổng quan

Hướng dẫn này mô tả chi tiết cách deploy **Doanhoi Portal** (Hệ thống Quản lý Đoàn Hội Sinh viên) lên server production sử dụng Docker và Docker Compose.

### **🏗️ Kiến trúc Production:**
- **Server OS**: CentOS/AlmaLinux/RHEL
- **Containerization**: Docker + Docker Compose
- **Web Server**: Nginx (Reverse Proxy)
- **SSL**: Let's Encrypt hoặc Self-signed
- **Database**: PostgreSQL 15 (Container)
- **Backend**: NestJS (Container - Port 2681)
- **Frontend**: React + Nginx (Container - Port 2680)

### **🌐 Luồng request:**
```
User → Domain (443) → Nginx → Frontend (2680) + Backend (2681) → PostgreSQL
```

---

## 🛠️ Bước 1: Chuẩn bị Server

### **1.1 Yêu cầu Server:**
- **RAM**: Tối thiểu 2GB (Khuyến nghị 4GB+)
- **Storage**: Tối thiểu 10GB (Khuyến nghị 20GB+)
- **OS**: CentOS 7+, AlmaLinux 8+, RHEL 8+
- **Network**: Port 80, 443 mở internet
- **Domain**: Trỏ về IP server

### **1.2 Cài đặt Docker:**
```bash
# Update system
sudo dnf update -y

# Install Docker
sudo dnf install -y docker docker-compose

# Start và enable Docker
sudo systemctl start docker
sudo systemctl enable docker

# Kiểm tra Docker
docker --version
docker-compose --version
```

### **1.3 Cài đặt Nginx:**
```bash
# Install Nginx
sudo dnf install -y nginx

# Start và enable Nginx
sudo systemctl start nginx
sudo systemctl enable nginx

# Kiểm tra status
sudo systemctl status nginx
```

### **1.4 Cấu hình Firewall:**
```bash
# Mở ports cần thiết
sudo firewall-cmd --permanent --add-service=http
sudo firewall-cmd --permanent --add-service=https
sudo firewall-cmd --permanent --add-port=2680/tcp
sudo firewall-cmd --permanent --add-port=2681/tcp
sudo firewall-cmd --reload

# Kiểm tra firewall
sudo firewall-cmd --list-all
```

---

## 📦 Bước 2: Deploy Source Code

### **2.1 Clone Repository:**
```bash
# Tạo thư mục deploy
sudo mkdir -p /opt/doanhoi-portal
cd /opt/doanhoi-portal

# Clone source code
sudo git clone https://your-repo-url.git .

# Hoặc upload source code từ local
# scp -r ./doanhoi-portal root@server-ip:/opt/
```

### **2.2 Cấu trúc thư mục:**
```
/opt/doanhoi-portal/
├── docker-compose.prod.yml
├── backend/
│   ├── Dockerfile.prod
│   └── src/
├── frontend/
│   ├── Dockerfile.prod
│   └── nginx.conf
├── .env.production
└── frontend/.env.production
```

---

## ⚙️ Bước 3: Cấu hình Environment

### **3.1 Backend Environment (.env.production):**
```bash
cd /opt/doanhoi-portal

cat > .env.production << 'EOF'
# Database Configuration
DB_HOST=postgres
DB_PORT=5432
DB_USERNAME=postgres
DB_PASSWORD=your-secure-password-here
DB_NAME=doanhoi

# JWT Configuration (QUAN TRỌNG: Thay đổi trong production!)
JWT_SECRET=your-super-secret-jwt-key-production-2024
JWT_REFRESH_SECRET=your-super-secret-refresh-key-production-2024
JWT_EXPIRES_IN=60m
JWT_REFRESH_EXPIRES_IN=7d

# Frontend URL
FRONTEND_URL=https://your-domain.com

# Port Configuration
PORT=9200

# Node Environment
NODE_ENV=production

# Google OAuth (Optional)
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
GOOGLE_CALLBACK_URL=https://your-domain.com/api/auth/google/callback

# PayOS Configuration (Optional)
PAYOS_CLIENT_ID=
PAYOS_API_KEY=
PAYOS_CHECKSUM_KEY=
EOF
```

### **3.2 Frontend Environment (frontend/.env.production):**
```bash
cat > frontend/.env.production << 'EOF'
# Backend API URL
VITE_BACKEND_API_URL=https://your-domain.com/api

# Google OAuth (Optional)
VITE_GOOGLE_CLIENT_ID=your-google-client-id

# Environment
NODE_ENV=production
EOF
```

### **3.3 Docker Compose Production (docker-compose.prod.yml):**
```yaml
version: '3.8'

services:
  postgres:
    image: postgres:15
    container_name: doanhoi-postgres-prod
    environment:
      POSTGRES_DB: doanhoi
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: your-secure-password-here
    volumes:
      - postgres_data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U postgres"]
      interval: 30s
      timeout: 10s
      retries: 3
    restart: unless-stopped

  backend:
    build:
      context: ./backend
      dockerfile: Dockerfile.prod
    container_name: doanhoi-backend-prod
    depends_on:
      postgres:
        condition: service_healthy
    environment:
      - NODE_ENV=production
    env_file:
      - .env.production
    ports:
      - "2681:9200"
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:9200/api"]
      interval: 30s
      timeout: 10s
      retries: 3
    restart: unless-stopped

  frontend:
    build:
      context: ./frontend
      dockerfile: Dockerfile.prod
    container_name: doanhoi-frontend-prod
    depends_on:
      backend:
        condition: service_healthy
    ports:
      - "2680:80"
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:80"]
      interval: 30s
      timeout: 10s
      retries: 3
    restart: unless-stopped

volumes:
  postgres_data:
```

---

## 🐳 Bước 4: Tạo Dockerfile Production

### **4.1 Backend Dockerfile (backend/Dockerfile.prod):**
```dockerfile
# Multi-stage build for production
FROM node:20.17-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY tsconfig*.json ./

# Install dependencies
RUN npm install

# Copy source code
COPY src/ ./src/

# Build application
RUN npm run build

# Production stage
FROM node:20.17-alpine AS production

# Install dumb-init for proper signal handling
RUN apk add --no-cache dumb-init curl

# Create app user
RUN addgroup -g 1001 -S nodejs
RUN adduser -S nestjs -u 1001

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install only production dependencies
RUN npm ci --only=production && npm cache clean --force

# Copy built application from builder stage
COPY --from=builder --chown=nestjs:nodejs /app/dist ./dist

# Switch to non-root user
USER nestjs

# Expose port
EXPOSE 9200

# Use dumb-init for proper signal handling
ENTRYPOINT ["dumb-init", "--"]

# Start application
CMD ["node", "dist/main.js"]
```

### **4.2 Frontend Dockerfile (frontend/Dockerfile.prod):**
```dockerfile
# Multi-stage build for production
FROM node:18-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy source code and env
COPY . .
COPY .env.production .env

# Build application
RUN npm run build

# Production stage with Nginx
FROM nginx:alpine AS production

# Copy custom nginx configuration
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Copy built application
COPY --from=builder /app/dist /usr/share/nginx/html

# Expose port
EXPOSE 80

# Start Nginx
CMD ["nginx", "-g", "daemon off;"]
```

### **4.3 Frontend Nginx Config (frontend/nginx.conf):**
```nginx
server {
    listen 80;
    server_name localhost;
    root /usr/share/nginx/html;
    index index.html;

    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;

    # Gzip compression
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_types
        text/plain
        text/css
        text/xml
        text/javascript
        application/javascript
        application/xml+rss
        application/json;

    # Handle React Router - SPA routing
    location / {
        try_files $uri $uri/ /index.html;
        add_header Cache-Control "no-cache, no-store, must-revalidate";
        add_header Pragma "no-cache";
        add_header Expires "0";
    }

    # Cache static assets
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    # Error pages
    error_page 404 /index.html;
    error_page 500 502 503 504 /50x.html;
    location = /50x.html {
        root /usr/share/nginx/html;
    }
}
```

---

## 🚀 Bước 5: Build và Deploy Containers

### **5.1 Build và Start Containers:**
```bash
cd /opt/doanhoi-portal

# Copy environment file cho docker-compose
cp .env.production .env

# Build và start containers
docker-compose -f docker-compose.prod.yml up -d --build

# Kiểm tra containers
docker-compose -f docker-compose.prod.yml ps
```

### **5.2 Theo dõi logs:**
```bash
# Theo dõi logs tất cả containers
docker-compose -f docker-compose.prod.yml logs -f

# Theo dõi logs từng container
docker logs doanhoi-backend-prod -f
docker logs doanhoi-frontend-prod -f
docker logs doanhoi-postgres-prod -f
```

### **5.3 Kiểm tra health:**
```bash
# Test backend
curl http://localhost:2681/api

# Test frontend
curl http://localhost:2680

# Kiểm tra database
docker exec -it doanhoi-postgres-prod psql -U postgres -d doanhoi -c "SELECT 1;"
```

---

## 🌐 Bước 6: Cấu hình Nginx Reverse Proxy

### **6.1 Tạo SSL Certificate (Option A - Let's Encrypt):**
```bash
# Install Certbot
sudo dnf install -y certbot python3-certbot-nginx

# Tạo basic nginx config cho domain verification
sudo tee /etc/nginx/conf.d/your-domain.com.conf << 'EOF'
server {
    listen 80;
    server_name your-domain.com;
    
    location /.well-known/acme-challenge/ {
        root /var/www/html;
    }
    
    location / {
        return 301 https://$host$request_uri;
    }
}
EOF

# Tạo thư mục cho challenge
sudo mkdir -p /var/www/html

# Test và reload nginx
sudo nginx -t && sudo systemctl reload nginx

# Tạo SSL certificate
sudo certbot --nginx -d your-domain.com

# Auto-renewal setup
sudo crontab -e
# Thêm dòng: 0 12 * * * /usr/bin/certbot renew --quiet
```

### **6.2 Tạo Self-signed Certificate (Option B):**
```bash
# Tạo thư mục SSL
sudo mkdir -p /etc/nginx/ssl

# Tạo self-signed certificate
sudo openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
    -keyout /etc/nginx/ssl/selfsigned.key \
    -out /etc/nginx/ssl/selfsigned.crt \
    -subj "/C=VN/ST=HoChiMinh/L=HoChiMinh/O=HCMUT/CN=your-domain.com"
```

### **6.3 Cấu hình Nginx Reverse Proxy:**
```bash
sudo tee /etc/nginx/conf.d/your-domain.com.conf << 'EOF'
server {
    listen 443 ssl http2;
    server_name your-domain.com;

    # SSL Configuration
    ssl_certificate /etc/letsencrypt/live/your-domain.com/fullchain.pem; # Hoặc /etc/nginx/ssl/selfsigned.crt
    ssl_certificate_key /etc/letsencrypt/live/your-domain.com/privkey.pem; # Hoặc /etc/nginx/ssl/selfsigned.key
    
    # SSL Settings
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

    # Reverse proxy tới frontend (port 2680)
    location / {
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

    # API proxy tới backend (port 2681)
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

    # API documentation
    location /api-docs {
        proxy_pass http://localhost:2681/api;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}

server {
    listen 80;
    server_name your-domain.com;
    return 301 https://$host$request_uri;
}
EOF
```

### **6.4 Enable SELinux cho Nginx:**
```bash
# Cho phép Nginx kết nối network
sudo setsebool -P httpd_can_network_connect on

# Test và reload Nginx
sudo nginx -t && sudo systemctl reload nginx
```

---

## 💾 Bước 7: Database Seeding và Admin User

### **7.1 Kiểm tra Database:**
```bash
# Kết nối database
docker exec -it doanhoi-postgres-prod psql -U postgres -d doanhoi

# Kiểm tra tables
\dt

# Kiểm tra users
SELECT email, "givenName", "familyName", "userType" FROM users;

# Thoát
\q
```

### **7.2 Tạo Admin User và Permissions:**

#### **Script 1: Tạo Role và Permissions (create_permissions.sql):**
```sql
-- Tạo Admin Role
INSERT INTO roles (id, name, "displayName", description, "isSystemRole", "isActive", "createdAt", "updatedAt") 
VALUES (
    uuid_generate_v4(),
    'super_admin',
    'Super Admin', 
    'Quyền quản trị toàn hệ thống',
    true,
    true,
    NOW(),
    NOW()
) ON CONFLICT (name) DO NOTHING;

-- Tạo permissions đầy đủ
DO $$
DECLARE
    admin_role_id UUID;
    perm_id UUID;
BEGIN
    -- Lấy role ID của super_admin
    SELECT id INTO admin_role_id FROM roles WHERE name = 'super_admin';
    
    -- Tạo CRUD permissions
    INSERT INTO permissions (id, code, name, description, category, context, "isActive", "sortOrder", "createdAt", "updatedAt") VALUES
    (uuid_generate_v4(), 'users.create', 'Tạo người dùng mới', 'Quyền tạo người dùng mới trong hệ thống', 'users', 'organization', true, 1, NOW(), NOW()),
    (uuid_generate_v4(), 'users.read', 'Xem thông tin người dùng', 'Quyền xem danh sách và thông tin người dùng', 'users', 'organization', true, 2, NOW(), NOW()),
    (uuid_generate_v4(), 'users.update', 'Cập nhật thông tin người dùng', 'Quyền sửa đổi thông tin người dùng', 'users', 'organization', true, 3, NOW(), NOW()),
    (uuid_generate_v4(), 'users.delete', 'Xóa người dùng', 'Quyền xóa người dùng khỏi hệ thống', 'users', 'organization', true, 4, NOW(), NOW()),
    (uuid_generate_v4(), 'organizations.create', 'Tạo tổ chức mới', 'Quyền tạo tổ chức mới', 'organizations', 'organization', true, 5, NOW(), NOW()),
    (uuid_generate_v4(), 'organizations.read', 'Xem thông tin tổ chức', 'Quyền xem thông tin tổ chức', 'organizations', 'organization', true, 6, NOW(), NOW()),
    (uuid_generate_v4(), 'organizations.update', 'Cập nhật thông tin tổ chức', 'Quyền sửa đổi thông tin tổ chức', 'organizations', 'organization', true, 7, NOW(), NOW()),
    (uuid_generate_v4(), 'organizations.delete', 'Xóa tổ chức', 'Quyền xóa tổ chức', 'organizations', 'organization', true, 8, NOW(), NOW()),
    (uuid_generate_v4(), 'departments.create', 'Tạo phòng ban mới', 'Quyền tạo phòng ban mới', 'departments', 'organization', true, 9, NOW(), NOW()),
    (uuid_generate_v4(), 'departments.read', 'Xem thông tin phòng ban', 'Quyền xem thông tin phòng ban', 'departments', 'organization', true, 10, NOW(), NOW()),
    (uuid_generate_v4(), 'departments.update', 'Cập nhật thông tin phòng ban', 'Quyền sửa đổi thông tin phòng ban', 'departments', 'organization', true, 11, NOW(), NOW()),
    (uuid_generate_v4(), 'departments.delete', 'Xóa phòng ban', 'Quyền xóa phòng ban', 'departments', 'organization', true, 12, NOW(), NOW()),
    (uuid_generate_v4(), 'classes.create', 'Tạo lớp học mới', 'Quyền tạo lớp học mới', 'classes', 'organization', true, 13, NOW(), NOW()),
    (uuid_generate_v4(), 'classes.read', 'Xem thông tin lớp học', 'Quyền xem thông tin lớp học', 'classes', 'organization', true, 14, NOW(), NOW()),
    (uuid_generate_v4(), 'classes.update', 'Cập nhật thông tin lớp học', 'Quyền sửa đổi thông tin lớp học', 'classes', 'organization', true, 15, NOW(), NOW()),
    (uuid_generate_v4(), 'classes.delete', 'Xóa lớp học', 'Quyền xóa lớp học', 'classes', 'organization', true, 16, NOW(), NOW()),
    (uuid_generate_v4(), 'system.admin', 'Quyền quản trị hệ thống', 'Quyền quản trị toàn bộ hệ thống', 'system', 'organization', true, 17, NOW(), NOW()),
    (uuid_generate_v4(), 'dashboard.access', 'Truy cập dashboard', 'Quyền truy cập trang dashboard', 'dashboard', 'organization', true, 18, NOW(), NOW()),
    (uuid_generate_v4(), 'payments.create', 'Tạo thanh toán', 'Quyền tạo thanh toán mới', 'payments', 'organization', true, 19, NOW(), NOW()),
    (uuid_generate_v4(), 'payments.read', 'Xem thanh toán', 'Quyền xem thông tin thanh toán', 'payments', 'organization', true, 20, NOW(), NOW()),
    (uuid_generate_v4(), 'payments.update', 'Cập nhật thanh toán', 'Quyền cập nhật thông tin thanh toán', 'payments', 'organization', true, 21, NOW(), NOW()),
    (uuid_generate_v4(), 'payments.delete', 'Xóa thanh toán', 'Quyền xóa thanh toán', 'payments', 'organization', true, 22, NOW(), NOW())
    ON CONFLICT (code) DO NOTHING;

    -- Tạo navigation access permissions
    INSERT INTO permissions (id, code, name, description, category, context, "isActive", "sortOrder", "createdAt", "updatedAt") VALUES
    (uuid_generate_v4(), 'users.access', 'Truy cập trang người dùng', 'Quyền truy cập vào trang quản lý người dùng', 'users', 'organization', true, 100, NOW(), NOW()),
    (uuid_generate_v4(), 'organizations.access', 'Truy cập trang tổ chức', 'Quyền truy cập vào trang quản lý tổ chức', 'organizations', 'organization', true, 101, NOW(), NOW()),
    (uuid_generate_v4(), 'departments.access', 'Truy cập trang phòng ban', 'Quyền truy cập vào trang quản lý phòng ban', 'departments', 'organization', true, 102, NOW(), NOW()),
    (uuid_generate_v4(), 'classes.access', 'Truy cập trang lớp học', 'Quyền truy cập vào trang quản lý lớp học', 'classes', 'organization', true, 103, NOW(), NOW()),
    (uuid_generate_v4(), 'permissions.access', 'Truy cập trang phân quyền', 'Quyền truy cập vào trang quản lý phân quyền', 'permissions', 'organization', true, 104, NOW(), NOW()),
    (uuid_generate_v4(), 'roles.access', 'Truy cập trang vai trò', 'Quyền truy cập vào trang quản lý vai trò', 'roles', 'organization', true, 105, NOW(), NOW()),
    (uuid_generate_v4(), 'admin.access', 'Truy cập khu vực quản trị', 'Quyền truy cập vào khu vực quản trị hệ thống', 'admin', 'organization', true, 106, NOW(), NOW())
    ON CONFLICT (code) DO NOTHING;

    -- Gán tất cả permissions cho Admin Role
    FOR perm_id IN 
        SELECT id FROM permissions 
    LOOP
        INSERT INTO role_permissions ("roleId", "permissionId") 
        VALUES (admin_role_id, perm_id)
        ON CONFLICT ("roleId", "permissionId") DO NOTHING;
    END LOOP;
    
    RAISE NOTICE 'Created permissions and assigned to super_admin role';
END $$;
```

#### **Script 2: Tạo Admin User (create_admin_user.sql):**
```sql
DO $$
DECLARE
    admin_role_id UUID;
    admin_user_id UUID;
    hashed_password TEXT;
BEGIN
    -- Lấy role ID của super_admin
    SELECT id INTO admin_role_id FROM roles WHERE name = 'super_admin';
    
    -- Hash password "admin123" (sử dụng bcrypt với salt 10)
    hashed_password := '$2b$10$5fFpLMiUU8xpzng0s6f/a.02sncAiYYuD7gNXYZuUnuscs933lP8q';
    
    -- Kiểm tra xem đã có user admin chưa
    IF NOT EXISTS (SELECT 1 FROM users WHERE email = 'admin@doanhoi.com') THEN
        -- Tạo Admin User
        INSERT INTO users (
            id, 
            code, 
            "familyName", 
            "givenName", 
            email, 
            phone, 
            password, 
            "authProvider", 
            "isActive", 
            "userType", 
            "membershipStatus", 
            "createdAt", 
            "updatedAt"
        ) VALUES (
            uuid_generate_v4(),
            'ADMIN001',
            'Admin',
            'System',
            'admin@doanhoi.com',
            '0123456789',
            hashed_password,
            'local',
            true,
            'staff',
            'none',
            NOW(),
            NOW()
        ) RETURNING id INTO admin_user_id;

        -- Gán Admin Role cho Admin User
        INSERT INTO user_roles ("userId", "roleId") VALUES (admin_user_id, admin_role_id);
        
        RAISE NOTICE 'Admin user created successfully with email: admin@doanhoi.com and password: admin123';
    ELSE
        RAISE NOTICE 'Admin user already exists!';
    END IF;
END $$;
```

### **7.3 Chạy Seeding:**
```bash
cd /opt/doanhoi-portal

# Tạo script files
cat > create_permissions.sql << 'EOF'
[Nội dung Script 1 ở trên]
EOF

cat > create_admin_user.sql << 'EOF'
[Nội dung Script 2 ở trên]
EOF

# Chạy seeding
docker exec -i doanhoi-postgres-prod psql -U postgres -d doanhoi < create_permissions.sql
docker exec -i doanhoi-postgres-prod psql -U postgres -d doanhoi < create_admin_user.sql
```

### **7.4 Verify Admin User:**
```bash
# Kiểm tra admin user
docker exec doanhoi-postgres-prod psql -U postgres -d doanhoi -c "
SELECT 
    u.email,
    r.name as role_name,
    COUNT(p.id) as total_permissions
FROM users u
JOIN user_roles ur ON u.id = ur.\"userId\"
JOIN roles r ON ur.\"roleId\" = r.id
LEFT JOIN role_permissions rp ON r.id = rp.\"roleId\"
LEFT JOIN permissions p ON rp.\"permissionId\" = p.id
WHERE u.email = 'admin@doanhoi.com'
GROUP BY u.email, r.name;
"

# Test login qua API
curl -X POST https://your-domain.com/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "admin@doanhoi.com", "password": "admin123"}' \
  -k
```

---

## 🔧 Bước 8: Quản lý và Monitoring

### **8.1 Health Check Script:**
```bash
cat > /opt/doanhoi-portal/health-check.sh << 'EOF'
#!/bin/bash

echo "=== Doanhoi Portal Health Check ==="
echo "Timestamp: $(date)"

# Check containers
echo -e "\n1. Container Status:"
docker-compose -f /opt/doanhoi-portal/docker-compose.prod.yml ps

# Check services
echo -e "\n2. Service Health:"
curl -s -o /dev/null -w "Frontend: %{http_code}\n" http://localhost:2680
curl -s -o /dev/null -w "Backend: %{http_code}\n" http://localhost:2681/api
curl -s -o /dev/null -w "Domain: %{http_code}\n" https://your-domain.com

# Check disk space
echo -e "\n3. Disk Usage:"
df -h /opt/doanhoi-portal

# Check memory
echo -e "\n4. Memory Usage:"
free -h

echo -e "\n=== End Health Check ==="
EOF

chmod +x /opt/doanhoi-portal/health-check.sh
```

### **8.2 Backup Script:**
```bash
cat > /opt/doanhoi-portal/backup.sh << 'EOF'
#!/bin/bash

BACKUP_DIR="/opt/doanhoi-portal/backups"
DATE=$(date +%Y%m%d_%H%M%S)

# Create backup directory
mkdir -p $BACKUP_DIR

# Database backup
docker exec doanhoi-postgres-prod pg_dump -U postgres doanhoi > $BACKUP_DIR/doanhoi_$DATE.sql

# Compress backup
gzip $BACKUP_DIR/doanhoi_$DATE.sql

# Keep only last 7 days
find $BACKUP_DIR -name "*.sql.gz" -mtime +7 -delete

echo "Backup completed: doanhoi_$DATE.sql.gz"
EOF

chmod +x /opt/doanhoi-portal/backup.sh
```

### **8.3 Crontab cho Automation:**
```bash
# Thêm vào crontab
sudo crontab -e

# Thêm các dòng sau:
# Health check mỗi 5 phút
*/5 * * * * /opt/doanhoi-portal/health-check.sh >> /var/log/doanhoi-health.log 2>&1

# Backup hàng ngày lúc 2:00 AM
0 2 * * * /opt/doanhoi-portal/backup.sh >> /var/log/doanhoi-backup.log 2>&1

# SSL renewal (nếu dùng Let's Encrypt)
0 12 * * * /usr/bin/certbot renew --quiet
```

---

## 🚨 Troubleshooting

### **Lỗi thường gặp:**

#### **1. Container không start:**
```bash
# Kiểm tra logs
docker-compose -f docker-compose.prod.yml logs

# Xóa containers cũ và rebuild
docker-compose -f docker-compose.prod.yml down
docker-compose -f docker-compose.prod.yml up -d --build
```

#### **2. 502 Bad Gateway:**
```bash
# Kiểm tra SELinux
sudo setsebool -P httpd_can_network_connect on

# Kiểm tra containers có chạy không
docker ps

# Test kết nối backend
curl http://localhost:2681/api
```

#### **3. Database connection failed:**
```bash
# Kiểm tra database logs
docker logs doanhoi-postgres-prod

# Restart database
docker-compose -f docker-compose.prod.yml restart postgres
```

#### **4. Permissions issues:**
```bash
# Chạy lại seeding
docker exec -i doanhoi-postgres-prod psql -U postgres -d doanhoi < create_permissions.sql
docker exec -i doanhoi-postgres-prod psql -U postgres -d doanhoi < create_admin_user.sql
```

---

## 🔐 Security Checklist

- [ ] **Thay đổi JWT secrets** trong production
- [ ] **Thay đổi database password**
- [ ] **Cấu hình SSL certificate** (Let's Encrypt khuyến nghị)
- [ ] **Enable firewall** và mở chỉ ports cần thiết
- [ ] **Cấu hình SELinux** cho Nginx
- [ ] **Regular backup** database
- [ ] **Update system** thường xuyên
- [ ] **Monitor logs** để phát hiện bất thường
- [ ] **Strong admin password** và 2FA (nếu có)
- [ ] **Network isolation** cho containers

---

## 📝 Default Credentials

### **Admin Login:**
- **URL**: https://your-domain.com
- **Email**: `admin@doanhoi.com`
- **Password**: `admin123`

### **Database:**
- **Host**: localhost (internal: postgres)
- **Port**: 5432
- **Database**: doanhoi
- **Username**: postgres
- **Password**: [Set trong .env.production]

---

## 🎯 Kết luận

Sau khi hoàn thành các bước trên, bạn sẽ có:

1. ✅ **Hệ thống production** chạy ổn định trên Docker
2. ✅ **SSL/HTTPS** bảo mật
3. ✅ **Admin user** với đầy đủ quyền (29 permissions)
4. ✅ **Reverse proxy** Nginx hiệu suất cao
5. ✅ **Database** an toàn với backup tự động
6. ✅ **Monitoring** và health check
7. ✅ **Các trang quản trị**: Users, Organizations, Departments, Classes, Permissions

**Website hoạt động tại**: `https://your-domain.com`

**Chúc bạn deploy thành công!** 🚀

---

## 🔄 Phần Bổ sung: GitLab CI/CD Automation

### **GitLab CI/CD Pipeline:**
Để tự động hóa deployment process, project đã được cấu hình với GitLab CI/CD pipeline trong file `.gitlab-ci.yml`.

**🎯 Workflow:**
```
Code Push (dev) → Test → Build → Deploy → Health Check → Success!
```

**📋 Chi tiết setup:**
- Xem file: `GITLAB_CI_SETUP.md` - Hướng dẫn chi tiết setup GitLab CI/CD
- Chạy script: `./setup-gitlab-ci.sh` - Tự động setup môi trường
- Helper scripts: `scripts/quick-deploy.sh` và `scripts/health-check.sh`

**🚀 Quick Start GitLab CI/CD:**
```bash
# 1. Setup GitLab Variables (SSH key, server info)
./setup-gitlab-ci.sh

# 2. Push code để trigger pipeline
git add .
git commit -m "feat: enable CI/CD deployment"
git push origin dev

# 3. Vào GitLab → CI/CD → Pipelines
# 4. Click "Play" ở deploy_production stage
# 5. Chờ deployment hoàn tất và verify website!
```

**✅ Kết quả:**
- ✅ Tự động test code khi push
- ✅ Tự động build và deploy  
- ✅ Zero-downtime deployment
- ✅ Automatic backup và rollback
- ✅ Health check tự động

**🔗 Links quan trọng:**
- Website: https://doanhoi.hcmut.edu.vn
- Admin: admin@doanhoi.com / admin123
- GitLab CI/CD Guide: `GITLAB_CI_SETUP.md`

**Chúc bạn deploy thành công!** 🚀
