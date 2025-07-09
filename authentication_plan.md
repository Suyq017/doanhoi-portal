# Authentication System Implementation Plan

## Overview
Thực hiện hệ thống xác thực người dùng với 2 phương thức đăng nhập:
1. Email + Password (sử dụng mật khẩu đã import từ file)
2. Google OAuth2 (auto-registration nếu email đã tồn tại trong hệ thống)

## Phase 1: Backend Implementation

### 1.1 Dependencies Setup
- Cài đặt các package cần thiết:
  - `@nestjs/passport`
  - `@nestjs/jwt`
  - `passport`
  - `passport-local`
  - `passport-google-oauth20`
  - `passport-jwt`
  - `bcrypt`
  - `jsonwebtoken`

### 1.2 Database Schema Updates
- Cập nhật User entity:
  - Thêm field `googleId` (nullable)
  - Thêm field `authProvider` (enum: 'local', 'google')
  - Thêm field `isActive` (boolean)
  - Thêm field `lastLogin` (timestamp)
  - Thêm field `refreshToken` (text, nullable)

### 1.3 Authentication Module Structure
- Tạo auth module với các components:
  - AuthController
  - AuthService
  - JwtStrategy
  - LocalStrategy
  - GoogleStrategy
  - AuthGuard
  - JwtAuthGuard

### 1.4 Local Authentication Strategy
- Implement LocalStrategy:
  - Validate email + password
  - So sánh password với hash đã lưu trong DB
  - Trả về user object nếu valid

### 1.5 Google OAuth2 Strategy
- Implement GoogleStrategy:
  - Cấu hình Google OAuth2
  - Xử lý callback từ Google
  - Tự động đăng ký nếu email đã tồn tại trong DB
  - Liên kết Google account với user hiện tại

### 1.6 JWT Implementation
- JWT Service:
  - Generate access token (short-lived: 15-30 phút)
  - Generate refresh token (long-lived: 7-30 ngày)
  - Validate và decode JWT token
  - Refresh token mechanism

### 1.7 Auth Controller Endpoints
- `POST /auth/login` - Local login
- `GET /auth/google` - Google OAuth initiate
- `GET /auth/google/callback` - Google OAuth callback
- `POST /auth/refresh` - Refresh access token
- `POST /auth/logout` - Logout (invalidate refresh token)
- `GET /auth/profile` - Get current user profile

### 1.8 Auth Guards
- JwtAuthGuard: Protect routes cần authentication
- LocalAuthGuard: Xử lý local login
- GoogleAuthGuard: Xử lý Google OAuth

### 1.9 Auth Service Logic
- validateUser(): Validate credentials
- login(): Generate tokens sau khi login thành công
- googleLogin(): Xử lý Google OAuth login
- refreshToken(): Refresh access token
- logout(): Invalidate refresh token

## Phase 2: Frontend Implementation

### 2.1 Dependencies Setup
- Cài đặt packages:
  - `@google-cloud/storage` (nếu cần)
  - `react-google-login` hoặc `@google-cloud/auth-library`
  - `axios` (HTTP client)
  - `react-router-dom` (routing)

### 2.2 Auth Context Setup
- Tạo AuthContext:
  - Quản lý auth state
  - Store user information
  - Handle login/logout actions
  - Token management

### 2.3 Token Management
- Local Storage hoặc Secure Cookie để lưu tokens
- Auto-refresh token mechanism
- Token expiration handling
- Axios interceptors cho authentication headers

### 2.4 Login Components
- LoginForm component:
  - Email + password fields
  - Form validation
  - Submit handler
  - Error handling

- GoogleLoginButton component:
  - Google OAuth button
  - Handle Google response
  - Auto-registration logic

### 2.5 Auth Pages
- Login page với 2 options:
  - Local login form
  - Google login button
- Protected route wrapper
- Loading states during auth

### 2.6 Auth Services
- AuthService:
  - login(): Local login API call
  - googleLogin(): Google OAuth API call
  - refreshToken(): Refresh token API call
  - logout(): Logout API call
  - getCurrentUser(): Get user profile

### 2.7 Route Protection
- ProtectedRoute component:
  - Check authentication status
  - Redirect to login if not authenticated
  - Handle loading states

### 2.8 HTTP Client Configuration
- Axios interceptors:
  - Auto-attach authentication headers
  - Handle token refresh on 401 errors
  - Redirect to login on auth failures

## Phase 3: Integration & Configuration

### 3.1 Environment Configuration
- Backend environment variables:
  - JWT_SECRET
  - JWT_REFRESH_SECRET
  - GOOGLE_CLIENT_ID
  - GOOGLE_CLIENT_SECRET
  - GOOGLE_CALLBACK_URL

- Frontend environment variables:
  - REACT_APP_API_URL
  - REACT_APP_GOOGLE_CLIENT_ID

### 3.2 CORS Configuration
- Cấu hình CORS cho frontend domain
- Whitelist callback URLs

### 3.3 Security Measures
- Password hashing với bcrypt
- JWT token security
- Refresh token rotation
- Rate limiting cho auth endpoints

## Implementation Order

### Backend Priority:
1. Dependencies setup
2. Database schema updates  
3. Local authentication strategy
4. JWT implementation
5. Auth controller endpoints
6. Google OAuth2 strategy
7. Auth guards và middleware

### Frontend Priority:
1. Dependencies setup
2. Auth context setup
3. Token management
4. Login components
5. Auth services
6. Route protection
7. Integration với backend

## Expected Outcomes
- Người dùng có thể đăng nhập bằng email + password (đã import)
- Người dùng có thể đăng nhập bằng Google OAuth
- Tự động nhận diện user đã tồn tại qua email
- JWT token management với refresh mechanism
- Protected routes trong frontend
- Secure authentication flow

## Notes
- Không implement authorization ở giai đoạn này
- Sử dụng password đã import, không tạo mới
- Auto-registration chỉ áp dụng cho Google OAuth với email đã tồn tại
- Tập trung vào authentication, không testing