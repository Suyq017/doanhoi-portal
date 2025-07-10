# Authentication Implementation - Email + Password Login

## Tổng quan

Đã bổ sung chức năng đăng nhập bằng Email + Password vào dự án Đoàn Hội Portal như kế hoạch trong `authentication_plan.md`.

## Backend Changes

### 1. Dependencies đã có sẵn

- `@nestjs/passport`, `@nestjs/jwt`, `passport`, `passport-local`, `passport-jwt`, `bcrypt` đã được cài đặt trong `package.json`

### 2. Cấu trúc files mới được tạo:

```
backend/src/auth/
├── dto/
│   ├── login.dto.ts           # DTO cho login request
│   ├── refresh-token.dto.ts   # DTO cho refresh token
│   └── auth-response.dto.ts   # DTO cho auth response
├── strategies/
│   ├── jwt.strategy.ts        # JWT strategy cho authentication
│   └── local.strategy.ts      # Local strategy cho email+password
├── guards/
│   ├── jwt-auth.guard.ts      # Guard để protect routes
│   └── local-auth.guard.ts    # Guard cho local login
├── auth.controller.ts         # Updated với endpoints thật
├── auth.service.ts           # Updated với logic thật
└── auth.module.ts            # Updated với JWT module
```

### 3. User Entity Updates

- Thêm các fields: `authProvider`, `isActive`, `lastLogin`, `refreshToken`
- Enum `AuthProvider` cho local/google authentication

### 4. Users Service Updates

- Thêm method `updateRefreshToken()` để lưu refresh token
- Method `validatePassword()` đã có sẵn

### 5. API Endpoints mới:

- `POST /auth/login` - Đăng nhập bằng email + password
- `POST /auth/refresh` - Refresh access token
- `POST /auth/logout` - Đăng xuất
- `GET /auth/profile` - Lấy thông tin user hiện tại

## Frontend Changes

### 1. Services

- `authService.ts` - Service thật để gọi API authentication
- `apiClient.ts` - HTTP client với auto token refresh

### 2. Components

- `ProtectedRoute.tsx` - Component để protect routes cần authentication

### 3. Auth Context Updates

- Cập nhật để sử dụng `authService` thật thay vì mock data
- Token management với localStorage

### 4. Type Updates

- Cập nhật `User` interface để có field `isActive` và `lastLogin`

## Configuration

### 1. Backend Environment Variables (.env)

```env
# Database Configuration
DB_HOST=localhost
DB_PORT=9000
DB_USERNAME=postgres
DB_PASSWORD=password
DB_NAME=doanhoi

# JWT Configuration
JWT_SECRET=your-super-secret-jwt-key-here-change-this-in-production
JWT_EXPIRES_IN=30m
JWT_REFRESH_SECRET=your-super-secret-refresh-key-here-change-this-in-production
JWT_REFRESH_EXPIRES_IN=7d

# Application Configuration
NODE_ENV=development
PORT=3000
```

### 2. Frontend Environment Variables (.env)

```env
# Backend API Configuration
VITE_BACKEND_API_URL=http://localhost:3000
```

## Cách sử dụng

### 1. Chạy Backend

```bash
cd backend
npm install
# File .env đã có sẵn với cấu hình đúng
npm run start:dev
```

### 2. Chạy Frontend

```bash
cd frontend
npm install
# File .env đã có sẵn với cấu hình đúng
npm run dev
```

### 3. Database Migration

- Database sẽ tự động sync schema khi chạy trong development mode
- Các field mới sẽ được thêm vào bảng users: `authProvider`, `isActive`, `lastLogin`, `refreshToken`

### 4. Test Authentication

- Sử dụng các user đã import từ file Excel
- Email và password đã được hash và lưu trong database
- Login form hiện tại sẽ gọi API thật

## Security Features Implemented

1. **Password Hashing**: Sử dụng bcrypt với salt rounds = 10
2. **JWT Tokens**:
   - Access token: 30 phút
   - Refresh token: 7 ngày
3. **Token Refresh**: Auto-refresh khi access token hết hạn
4. **Route Protection**: JWT guards cho protected routes
5. **Token Storage**: localStorage (có thể upgrade thành httpOnly cookies sau)

## Limitations & Next Steps

### Chưa implement:

- Google OAuth2 (theo kế hoạch phase 2)
- CSRF protection
- Rate limiting
- Password reset functionality

### Recommendations:

1. Thay đổi JWT secrets trong production
2. Sử dụng httpOnly cookies thay vì localStorage để bảo mật hơn
3. Implement proper logging cho authentication events
4. Thêm email verification cho new users

## Testing

### Test với user đã import:

1. Tìm user trong database
2. Sử dụng email và password đã import
3. Test login flow qua UI

### API Testing với curl:

```bash
# Login
curl -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"user@example.com","password":"password123"}'

# Get profile (với token từ login response)
curl -X GET http://localhost:3000/auth/profile \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

Authentication system đã sẵn sàng sử dụng!
