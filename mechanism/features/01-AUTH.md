# Feature: Authentication (Auth)

## Tổng quan
Module xác thực người dùng cho hệ thống Đoàn Hội Portal. Hỗ trợ đăng nhập qua Google OAuth 2.0 dành cho người dùng thuộc tổ chức HCMUT.

## Đường dẫn
```
frontend/src/features/auth/
├── components/
│   ├── AuthLoadingScreen.tsx      # Màn hình loading khi kiểm tra auth
│   ├── GoogleLoginButton.tsx      # Nút đăng nhập Google
│   └── PermissionLoadingScreen.tsx # Loading khi kiểm tra quyền
├── context/
│   └── AuthContext.tsx            # Context quản lý state xác thực
├── hooks/                         # Custom hooks cho auth
├── pages/
│   └── LoginPage.tsx              # Trang đăng nhập
├── services/
│   └── authService.ts             # API service cho auth
└── utils/                         # Utilities
```

## Chức năng chính

### 1. Đăng nhập Google OAuth
- Chỉ cho phép tài khoản Google thuộc domain `@hcmut.edu.vn`
- Redirect về trang yêu cầu sau khi đăng nhập thành công
- Lưu token vào localStorage

### 2. Quản lý Session
- Access Token & Refresh Token
- Tự động refresh token khi hết hạn
- Logout và clear session

### 3. Context API
```typescript
interface AuthState {
  user: User | null;
  token: string | null;
  refreshToken: string | null;
  userRoles: UserRole[];
  userPermissions: UserPermission[];
  isAuthenticated: boolean;
  isLoading: boolean;
  permissionsLoading: boolean;
  currentOrganizationId?: string;
}
```

### 4. Permission Management
- `hasPermission(code, organizationId?)` - Kiểm tra quyền cụ thể
- `hasAnyPermission(codes[], organizationId?)` - Kiểm tra có bất kỳ quyền nào
- Context-aware permissions theo tổ chức

## Components

### LoginPage
- Hiển thị form đăng nhập với Google
- Logo Đoàn Hội BK
- Xử lý error message
- Auto-redirect nếu đã đăng nhập

### AuthLoadingScreen
- Hiển thị khi đang kiểm tra trạng thái xác thực
- Spinner với message "Đang kiểm tra đăng nhập..."

### PermissionLoadingScreen
- Hiển thị khi đang load permissions
- Spinner nhỏ hơn với message "Đang kiểm tra quyền truy cập..."

## API Endpoints

| Method | Endpoint | Mô tả |
|--------|----------|-------|
| POST | `/auth/google` | Đăng nhập bằng Google token |
| POST | `/auth/refresh` | Refresh access token |
| GET | `/auth/me` | Lấy thông tin user hiện tại |
| GET | `/auth/permissions` | Lấy danh sách quyền của user |

## Permissions
```
auth.login          # Đăng nhập hệ thống
auth.logout         # Đăng xuất
```

## Guards & Protection
- `AuthGuard` - Bảo vệ route yêu cầu đăng nhập
- `EnhancedProtectedRoute` - Route protection với permission check
- Redirect về `/login` nếu chưa đăng nhập
- Redirect về `/403` nếu không có quyền

## Lưu ý kỹ thuật
- Token được lưu trong localStorage
- Sử dụng `authLoadingState` global flag để tránh duplicate loading
- Permission được cache và load 1 lần khi login
- Hỗ trợ multi-organization permission context
