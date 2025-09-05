# 🚀 Hướng dẫn Cài đặt và Chạy Dự án Doanhoi Portal

## 📋 Tổng quan Dự án

**Doanhoi Portal** là hệ thống quản lý đoàn hội sinh viên được xây dựng với:
- **Backend**: NestJS + TypeORM + PostgreSQL
- **Frontend**: React + TypeScript + Vite + TailwindCSS
- **Database**: PostgreSQL 15
- **Containerization**: Docker & Docker Compose

## 🛠️ Yêu cầu Hệ thống

### **Phần mềm cần thiết:**
- **Node.js**: >= 18.0.0 (Recommended: 20.x)
- **npm**: >= 8.0.0
- **Docker**: >= 20.0.0
- **Docker Compose**: >= 2.0.0
- **Git**: Latest version

### **Ports sử dụng:**
- **Frontend**: 9100 (Vite dev server)
- **Backend**: 9200 (NestJS API)
- **Database**: 9000 (PostgreSQL)
- **PgAdmin**: 9001 (Database management)

## 📦 Cài đặt Bước 1: Clone Repository

```bash
# Clone repository
git clone https://gitlab.com/duytnb/doanhoi-portal.git

# Di chuyển vào thư mục dự án
cd doanhoi-portal

# Kiểm tra cấu trúc dự án
ls -la
```

## 🔧 Bước 2: Cài đặt Dependencies

### **Option 1: Cài đặt tất cả cùng lúc (Recommended)**
```bash
# Cài đặt dependencies cho root, backend và frontend
npm run install:all
```

### **Option 2: Cài đặt từng phần**
```bash
# Root dependencies
npm install

# Backend dependencies  
cd backend
npm install

# Frontend dependencies
cd ../frontend
npm install

# Quay về root
cd ..
```

## 🐳 Bước 3: Khởi động Database với Docker

### **Khởi động PostgreSQL và PgAdmin:**
```bash
# Khởi động database containers
npm run docker:up

# Hoặc dùng docker-compose trực tiếp
docker-compose up -d

# Kiểm tra containers đang chạy
docker ps
```

### **Verify Database Connection:**
- **PostgreSQL**: `localhost:9000`
- **PgAdmin**: http://localhost:9001
  - **Email**: `admin@doanhoi.com`
  - **Password**: `admin123`

## ⚙️ Bước 4: Cấu hình Environment Variables

### **Backend Configuration:**
```bash
# Copy .env.example thành .env
cd backend
cp .env.example .env

# Chỉnh sửa .env file
```

**Nội dung file `backend/.env`:**
```env
# Database Configuration
DB_HOST=localhost
DB_PORT=9000
DB_USERNAME=postgres
DB_PASSWORD=password
DB_NAME=doanhoi

# JWT Configuration (Thay đổi trong production!)
JWT_SECRET=your-super-secret-jwt-key-change-in-production
JWT_REFRESH_SECRET=your-super-secret-refresh-key-change-in-production
JWT_EXPIRES_IN=60m
JWT_REFRESH_EXPIRES_IN=7d

# Google OAuth (Optional - để trống nếu không dùng)
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
GOOGLE_CALLBACK_URL=http://localhost:9200/auth/google/callback

# Frontend URL
FRONTEND_URL=http://localhost:9100

# Port Configuration
PORT=9200

# PayOS Configuration (Optional - cho payment)
PAYOS_CLIENT_ID=
PAYOS_API_KEY=
PAYOS_CHECKSUM_KEY=
```

### **Frontend Configuration:**
```bash
# Copy .env.example thành .env
cd ../frontend
cp .env.example .env
```

**Nội dung file `frontend/.env`:**
```env
# Backend API URL
VITE_BACKEND_API_URL=http://localhost:9200

# Google OAuth (Optional)
VITE_GOOGLE_CLIENT_ID=your-google-client-id
```

## 🗄️ Bước 5: Setup Database và Migration

###  Automatic Setup (Recommended)**
```bash
# Quay về root directory
cd ..

# Đảm bảo database containers đang chạy
npm run docker:up

# Chạy setup database với seeding
cd backend
npm run db:setup
```

```

### **Kiểm tra Database Setup:**
1. **Truy cập PgAdmin**: http://localhost:9001
2. **Connect tới database**:
   - Host: `postgres` (trong Docker network)
   - Port: `5432`
   - Database: `doanhoi`
   - Username: `postgres`
   - Password: `password`
3. **Kiểm tra tables**: Phải có các tables như `users`, `roles`, `permissions`, etc.

## 🚀 Bước 6: Khởi động Development Server

### **Option 1: Chạy toàn bộ dự án (Recommended)**
```bash
# Từ root directory
npm run dev:full

# Hoặc nếu database đã chạy rồi
npm run dev
```

### **Option 2: Chạy từng service riêng biệt**

**Terminal 1 - Database (nếu chưa chạy):**
```bash
npm run docker:up
```

**Terminal 2 - Backend:**
```bash
cd backend
npm run start:dev
```

**Terminal 3 - Frontend:**
```bash
cd frontend
npm run dev
```

## 🌐 Bước 7: Truy cập Ứng dụng

### **URLs để truy cập:**
- **Frontend**: http://localhost:9100
- **Backend API**: http://localhost:9200
- **API Documentation**: http://localhost:9200/api
- **Database Admin**: http://localhost:9001

### **Default Login Credentials:**
```
Email: admin@doanhoi.com
Password: admin123
```

## 🧪 Bước 8: Verify Installation

### **1. Kiểm tra Backend:**
```bash
# Test API health
curl http://localhost:9200/api

# Hoặc mở browser: http://localhost:9200/api
```

### **2. Kiểm tra Frontend:**
- Mở browser: http://localhost:9100
- Thử đăng nhập với credentials mặc định
- Kiểm tra các trang: Dashboard, Users, Organizations

### **3. Kiểm tra Database:**
```bash
# Kết nối database từ command line
docker exec -it doanhoi-postgres psql -U postgres -d doanhoi

# Kiểm tra tables
\dt

# Kiểm tra users
SELECT * FROM users;

# Thoát
\q
```

## 🔧 Scripts Hữu ích

### **Development Scripts:**
```bash
# Chạy full development (database + backend + frontend)
npm run dev:full

# Chỉ chạy backend + frontend (database đã có)
npm run dev

# Chạy riêng backend
npm run dev:backend

# Chạy riêng frontend  
npm run dev:frontend
```

### **Database Scripts:**
```bash
# Reset database (xóa data và tạo lại)
npm run db:reset

# Khởi động lại containers
npm run docker:restart

# Xem logs containers
npm run docker:logs

# Dừng containers
npm run docker:down
```

### **Build Scripts:**
```bash
# Build toàn bộ project
npm run build

# Build riêng backend
npm run build:backend

# Build riêng frontend
npm run build:frontend
```

## 🐞 Troubleshooting

### **Lỗi thường gặp:**

#### **1. Port đã được sử dụng:**
```bash
# Kiểm tra port đang sử dụng
netstat -ano | findstr :9100
netstat -ano | findstr :9200
netstat -ano | findstr :9000

# Kill process nếu cần
taskkill /F /PID <PID>
```

#### **2. Database connection failed:**
```bash
# Kiểm tra container PostgreSQL
docker ps
docker logs doanhoi-postgres

# Restart database
docker-compose restart postgres
```

#### **3. npm install failed:**
```bash
# Clear npm cache
npm cache clean --force

# Delete node_modules và install lại
rm -rf node_modules package-lock.json
npm install
```

#### **4. Migration failed:**
```bash
# Reset database hoàn toàn
docker-compose down -v
docker-compose up -d
cd backend && npm run db:setup
```

#### **5. Frontend không kết nối được Backend:**
- Kiểm tra `VITE_BACKEND_API_URL` trong `frontend/.env`
- Kiểm tra Backend đang chạy ở port 9200
- Kiểm tra CORS settings trong `backend/src/main.ts`

## 🚀 Production Deployment

### **Chuẩn bị Production:**
```bash
# Tạo .env.production
cp .env.example .env.production

# Build production containers
npm run prod:build

# Chạy production
npm run prod:up
```

### **Environment Variables for Production:**
- Thay đổi `JWT_SECRET` và `JWT_REFRESH_SECRET`
- Cập nhật `DB_PASSWORD` an toàn hơn
- Set `NODE_ENV=production`
- Cấu hình domain và SSL certificates
---
## ✅ Checklist Hoàn thành Setup

- [ ] Clone repository thành công
- [ ] Cài đặt Node.js và Docker
- [ ] Cài đặt dependencies (`npm run install:all`)
- [ ] Khởi động database (`npm run docker:up`)
- [ ] Cấu hình environment files (`.env`)
- [ ] Chạy database setup (`npm run db:setup`)
- [ ] Khởi động development server (`npm run dev`)
- [ ] Truy cập frontend (http://localhost:9100)
- [ ] Đăng nhập thành công với admin account
- [ ] Kiểm tra API documentation (http://localhost:9200/api)
- [ ] Kiểm tra database trong PgAdmin (http://localhost:9001)

