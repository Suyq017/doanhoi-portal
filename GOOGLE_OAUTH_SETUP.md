# Google OAuth Setup Guide

## Bước 1: Tạo Google Cloud Project và OAuth 2.0 Credentials

### 1.1 Tạo Project
1. Truy cập [Google Cloud Console](https://console.cloud.google.com/)
2. Click "Create Project" hoặc chọn project hiện có
3. Đặt tên project (ví dụ: "doanhoi-auth")

### 1.2 Enable Google+ API
1. Vào **APIs & Services** > **Library**
2. Tìm và enable **Google+ API** hoặc **Google Identity API**

### 1.3 Tạo OAuth 2.0 Client ID
1. Vào **APIs & Services** > **Credentials**
2. Click **Create Credentials** > **OAuth 2.0 Client IDs**
3. Nếu chưa có OAuth consent screen, hãy cấu hình trước:
   - Chọn **External** user type
   - Điền thông tin cơ bản (App name, User support email, Developer contact)
   - Thêm scopes: `email`, `profile`
   - Thêm test users nếu cần

### 1.4 Cấu hình Web Application
1. Application type: **Web application**
2. Name: "Doanhoi Portal"
3. **Authorized JavaScript origins**:
   ```
   http://localhost:9100
   http://localhost:9200
   ```
4. **Authorized redirect URIs**:
   ```
   http://localhost:9200/auth/google/callback
   ```

## Bước 2: Cập nhật Backend Environment Variables

Sau khi tạo OAuth credentials, copy **Client ID** và **Client Secret**:

1. Mở file `backend/.env.local`
2. Cập nhật:
   ```env
   GOOGLE_CLIENT_ID=your-actual-client-id-here
   GOOGLE_CLIENT_SECRET=your-actual-client-secret-here
   ```

## Bước 3: Test Google OAuth

1. Khởi động backend:
   ```bash
   cd backend
   npm run start:dev
   ```

2. Khởi động frontend:
   ```bash
   cd frontend  
   npm run dev
   ```

3. Truy cập frontend và click nút "Đăng nhập với Google"

## Troubleshooting

### Lỗi `redirect_uri_mismatch`
- Kiểm tra **Authorized redirect URIs** trong Google Console
- URI phải khớp chính xác: `http://localhost:9200/auth/google/callback`

### Lỗi `access_denied`
- Kiểm tra OAuth consent screen configuration
- Thêm email test user nếu app ở trạng thái testing

### Lỗi `invalid_client`
- Kiểm tra `GOOGLE_CLIENT_ID` và `GOOGLE_CLIENT_SECRET` trong .env
- Đảm bảo credentials đã được enable

## Production Deployment

Khi deploy production, cập nhật:

1. **Authorized JavaScript origins**:
   ```
   https://yourdomain.com
   ```

2. **Authorized redirect URIs**:
   ```
   https://yourdomain.com/auth/google/callback
   ```

3. Environment variables:
   ```env
   GOOGLE_CALLBACK_URL=https://yourdomain.com/auth/google/callback
   FRONTEND_URL=https://yourdomain.com
   ```
