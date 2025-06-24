# Hệ thống Quản lý Đoàn Thanh niên và Hội Sinh viên

## Mô t### Chạy ở môi trường phát triển
```bash
# 1. Khởi động database
npm run docker:up

# 2. Chạy cả backend và frontend cùng lúc
npm run dev

# Hoặc chạy từng phần
npm run dev:backend  # Backend chạy ở port 9200
npm run dev:frontend # Frontend chạy ở port 9100

# Hoặc chạy tất cả cùng lúc (database + backend + frontend)
npm run dev:full
```

## Ports sử dụng
- **Database (PostgreSQL)**: Port 9000
- **pgAdmin**: Port 9001 - http://localhost:9001
- **Frontend**: Port 9100 - http://localhost:9100
- **Backend API**: Port 9200 - http://localhost:9200
- **API Documentation**: http://localhost:9200/apihống web quản lý tổ chức Đoàn Thanh niên và Hội Sinh viên tại Trường Đại học Bách khoa – ĐHQG-HCM.

## Công nghệ sử dụng

### Backend
- **Framework**: NestJS
- **Database**: PostgreSQL
- **ORM**: TypeORM
- **Authentication**: Passport.js + JWT
- **Documentation**: Swagger

### Frontend
- **Framework**: React.js + TypeScript
- **Build Tool**: Vite
- **Styling**: Tailwind CSS + Radix UI
- **State Management**: React Query
- **Routing**: React Router DOM

## Cài đặt và chạy

### Yêu cầu hệ thống
- Node.js >= 18
- PostgreSQL >= 13
- npm hoặc yarn

### Cài đặt
```bash
# Cài đặt dependencies cho cả backend và frontend
npm run install:all

# Hoặc cài đặt từng phần
cd backend && npm install
cd ../frontend && npm install
```

### Cấu hình Database
#### Sử dụng Docker (Khuyến nghị)
```bash
# Khởi động PostgreSQL và pgAdmin bằng Docker
npm run docker:up

# Database sẽ tự động được tạo với dữ liệu mẫu
# PostgreSQL: localhost:9000, database: doanhoi, user: postgres, pass: password
# pgAdmin: http://localhost:9001, email: admin@doanhoi.local, pass: admin123
```

#### Cài đặt thủ công
1. Tạo database PostgreSQL với tên `doanhoi`
2. Cập nhật thông tin kết nối trong file `backend/.env`:
```env
DB_HOST=localhost
DB_PORT=9000
DB_USERNAME=postgres
DB_PASSWORD=password
DB_NAME=doanhoi
```

### Chạy ở môi trường phát triển
```bash
# 1. Khởi động database
npm run docker:dev

# 2. Chạy cả backend và frontend
npm run dev

# Hoặc chạy từng phần
npm run dev:backend  # Backend chạy ở port 3001
npm run dev:frontend # Frontend chạy ở port 3000
```

### Quản lý Docker Database
```bash
# Xem logs database
npm run docker:logs

# Dừng database
npm run docker:stop

# Reset database (xóa toàn bộ dữ liệu)
npm run docker:clean
```

### Build production
```bash
npm run build
```

## Cấu trúc dự án
```
├── backend/          # NestJS API Server
│   ├── src/
│   │   ├── auth/     # Authentication module
│   │   ├── users/    # User management
│   │   ├── organizations/ # Organization management
│   │   └── entities/ # Database entities
│   └── package.json
├── frontend/         # React Frontend
│   ├── src/
│   │   ├── components/ # Reusable components
│   │   ├── pages/    # Page components
│   │   └── globals.css # Global styles
│   └── package.json
└── README.md
```

## Docker Commands

### Quản lý Database
```bash
# Khởi động PostgreSQL và pgAdmin
npm run docker:up

# Dừng services
npm run docker:down

# Xem logs
npm run docker:logs

# Restart services
npm run docker:restart

# Reset database (xóa dữ liệu và tạo lại)
npm run db:reset
```

### Kết nối Database
Sau khi khởi động Docker, bạn có thể kết nối database qua:

1. **pgAdmin Web Interface**:
   - URL: http://localhost:9001
   - Email: admin@doanhoi.local
   - Password: admin123
   - Sau khi đăng nhập, thêm server mới với thông tin:
     - Host: postgres (hoặc localhost)
     - Port: 5432 (internal) hoặc 9000 (external)
     - Database: doanhoi
     - Username: postgres
     - Password: password

2. **Database Client khác** (DBeaver, pgAdmin desktop, etc.):
   - Host: localhost
   - Port: 9000
   - Database: doanhoi
   - Username: postgres
   - Password: password

## Màu sắc thiết kế
- **Đoàn Thanh niên**: #030391 (xanh đậm)
- **Hội Sinh viên**: #1488D8 (xanh sáng)

## Giai đoạn phát triển

### ✅ Hoàn thành
- [x] Thiết lập cơ sở dữ liệu và entities
- [x] Backend APIs cơ bản (Users, Organizations)
- [x] Frontend với React + Tailwind
- [x] Giao diện quản lý người dùng
- [x] Giao diện quản lý tổ chức
- [x] Dark mode support

### 🚧 Đang phát triển
- [ ] Authentication & Authorization
- [ ] Google OAuth2 integration
- [ ] Advanced filtering & search
- [ ] Import/Export data
- [ ] Real-time notifications

### 📋 Kế hoạch
- [ ] Testing (Unit + E2E)
- [ ] Docker deployment
- [ ] CI/CD pipeline
- [ ] Performance optimization

## Đóng góp
1. Fork dự án
2. Tạo feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to branch (`git push origin feature/AmazingFeature`)
5. Tạo Pull Request

## License
Dự án này được phát triển cho Trường Đại học Bách khoa – ĐHQG-HCM

## API Documentation
Sau khi chạy backend, truy cập Swagger documentation tại:
http://localhost:9200/api
