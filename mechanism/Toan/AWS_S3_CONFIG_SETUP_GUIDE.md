# AWS S3 Configuration Feature - Setup Guide

## 📋 Tổng quan

Tính năng này cho phép quản lý cấu hình AWS S3 trực tiếp từ Dashboard thay vì sử dụng biến môi trường trong file `.env`.

## 🗄️ Database Migration

### Tạo bảng `aws_s3_configs`

Chạy SQL script sau để tạo bảng trong database:

```sql
CREATE TABLE aws_s3_configs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    access_key_id VARCHAR(255) NOT NULL,
    secret_access_key VARCHAR(255) NOT NULL,
    region VARCHAR(100) NOT NULL,
    s3_bucket VARCHAR(255) NOT NULL,
    s3_endpoint VARCHAR(255) NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create index for performance
CREATE INDEX idx_aws_s3_configs_active ON aws_s3_configs(is_active);

-- Create trigger to update updated_at
CREATE OR REPLACE FUNCTION update_aws_s3_configs_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_aws_s3_configs_updated_at
    BEFORE UPDATE ON aws_s3_configs
    FOR EACH ROW
    EXECUTE FUNCTION update_aws_s3_configs_updated_at();
```

### Thêm dữ liệu mẫu (Optional)

```sql
INSERT INTO aws_s3_configs (
    access_key_id,
    secret_access_key,
    region,
    s3_bucket,
    s3_endpoint,
    is_active
) VALUES (
    '<YOUR_AWS_ACCESS_KEY_ID>',
    '<YOUR_AWS_SECRET_ACCESS_KEY>',
    'ap-southeast-1',
    '<YOUR_S3_BUCKET_NAME>',
    'https://s3-hcm5-r1.longvan.net',
    true
);
```

## 🚀 Features Đã Implement

### Backend (NestJS)

1. **Entity**: `AwsS3Config` (`backend/src/entities/aws-s3-config.entity.ts`)
2. **Service**: `AwsS3ConfigService` (`backend/src/aws-config/aws-s3-config.service.ts`)
3. **Controller**: `AwsS3ConfigController` (`backend/src/aws-config/aws-s3-config.controller.ts`)
4. **Module**: `AwsS3ConfigModule` (`backend/src/aws-config/aws-s3-config.module.ts`)

### Frontend (React + TypeScript)

1. **Service**: `awsS3ConfigService` (`frontend/src/shared/services/awsS3ConfigService.ts`)
2. **Component**: `AwsS3ConfigSection` (`frontend/src/features/dashboard/components/AwsS3ConfigSection.tsx`)
3. **Translations**: Added to `dashboard.json` (vi & en)

## 📡 API Endpoints

| Method | Endpoint | Description | Permission Required |
|--------|----------|-------------|---------------------|
| GET | `/aws-s3-config/active` | Get active config | `dashboard.access` |
| GET | `/aws-s3-config` | Get all configs | `dashboard.access` |
| POST | `/aws-s3-config` | Create new config | `dashboard.access` |
| PUT | `/aws-s3-config/:id` | Update config | `dashboard.access` |
| DELETE | `/aws-s3-config/:id` | Delete config | `dashboard.access` |
| POST | `/aws-s3-config/:id/test` | Test connection | `dashboard.access` |

## 🎯 How to Use

1. **Truy cập Dashboard**: Người dùng cần có permission `dashboard.access`
2. **Nhập thông tin AWS S3**:
   - AWS Access Key ID
   - AWS Secret Access Key
   - AWS Region
   - S3 Bucket Name
   - S3 Endpoint URL
3. **Lưu cấu hình**: Click "Lưu" để tạo mới hoặc "Cập nhật" để sửa
4. **Xóa cấu hình**: Click "Xóa" nếu cần loại bỏ cấu hình

## 🔒 Security Notes

- ⚠️ **Secret Access Key** được ẩn mặc định (dạng password field)
- ✅ Chỉ có một config active tại một thời điểm
- ✅ Tự động deactivate configs khác khi tạo mới
- ✅ Chỉ user có permission `dashboard.access` mới được truy cập

## 🎨 UI Features

- ✅ Status badge hiển thị trạng thái cấu hình
- ✅ Toggle show/hide secret key
- ✅ Form validation (required fields)
- ✅ Loading states khi save/delete
- ✅ Toast notifications cho success/error
- ✅ Dark mode support
- ✅ Responsive design

## 📝 Translation Keys

### Vietnamese (`vi/dashboard.json`)
```json
{
  "awsConfig": {
    "title": "Cấu hình AWS S3",
    "subtitle": "Quản lý thông tin kết nối AWS S3 để lưu trữ tài liệu",
    ...
  }
}
```

### English (`en/dashboard.json`)
```json
{
  "awsConfig": {
    "title": "AWS S3 Configuration",
    "subtitle": "Manage AWS S3 connection settings for document storage",
    ...
  }
}
```

## 🔄 Migration từ ENV variables

Nếu hiện tại bạn đang dùng biến môi trường, bạn có thể migrate sang database:

1. Backup các giá trị từ `.env`:
   ```
   AWS_ACCESS_KEY_ID=...
   AWS_SECRET_ACCESS_KEY=...
   AWS_REGION=...
   AWS_S3_BUCKET=...
   AWS_S3_ENDPOINT=...
   ```

2. Nhập vào form trong Dashboard

3. Sau khi xác nhận hoạt động, có thể xóa khỏi `.env`

## 🧪 Testing

### Test API với cURL:

```bash
# Get active config
curl -X GET http://localhost:3000/aws-s3-config/active \
  -H "Authorization: Bearer YOUR_TOKEN"

# Create config
curl -X POST http://localhost:3000/aws-s3-config \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "accessKeyId": "<YOUR_AWS_ACCESS_KEY_ID>",
    "secretAccessKey": "<YOUR_AWS_SECRET_ACCESS_KEY>",
    "region": "ap-southeast-1",
    "s3Bucket": "<YOUR_S3_BUCKET_NAME>",
    "s3Endpoint": "https://s3-hcm5-r1.longvan.net"
  }'
```

## 🐛 Troubleshooting

### Database Connection Issues
- Đảm bảo PostgreSQL đang chạy
- Kiểm tra permissions của user database
- Verify table đã được tạo: `\d aws_s3_configs`

### Permission Errors
- User cần có permission `dashboard.access`
- Check JWT token còn hạn
- Verify role assignments

### API Errors
- Check backend logs: `npm run start:dev`
- Verify module đã import trong `app.module.ts`
- Check entity đã export trong `all-entities.ts`

## 📚 Related Files

### Backend Files Created/Modified:
- ✅ `backend/src/entities/aws-s3-config.entity.ts`
- ✅ `backend/src/entities/all-entities.ts`
- ✅ `backend/src/aws-config/aws-s3-config.service.ts`
- ✅ `backend/src/aws-config/aws-s3-config.controller.ts`
- ✅ `backend/src/aws-config/aws-s3-config.module.ts`
- ✅ `backend/src/app.module.ts`

### Frontend Files Created/Modified:
- ✅ `frontend/src/shared/services/awsS3ConfigService.ts`
- ✅ `frontend/src/features/dashboard/components/AwsS3ConfigSection.tsx`
- ✅ `frontend/src/features/dashboard/DashboardPage.tsx`
- ✅ `frontend/public/locales/vi/dashboard.json`
- ✅ `frontend/public/locales/en/dashboard.json`

## ✨ Next Steps

1. ✅ Chạy migration SQL để tạo bảng
2. ✅ Restart backend server
3. ✅ Test API endpoints
4. ✅ Access Dashboard và nhập cấu hình
5. ✅ Verify data trong database

---

**Version**: 1.0.0  
**Author**: AI Assistant  
**Date**: 2025-10-30
