# Feature: System Config (Cấu hình hệ thống)

## Tổng quan
Module quản lý cấu hình hệ thống tập trung, bao gồm các settings chung, cấu hình AWS S3, và các tham số ứng dụng khác.

## Đường dẫn
```
frontend/src/features/system-config/
├── components/
│   ├── ConfigForm.tsx                    # Form cấu hình
│   ├── ConfigSection.tsx                 # Section wrapper
│   ├── S3ConfigForm.tsx                  # Form cấu hình S3
│   └── ConfigValueInput.tsx              # Input component
├── SystemConfigPage.tsx                  # Trang chính
└── types/
    └── index.ts                          # Type definitions
```

## Chức năng chính

### 1. Cấu hình chung
- Năm học hiện tại
- Tên ứng dụng
- Logo, favicon
- Contact info

### 2. Cấu hình AWS S3
- Bucket name
- Region
- Access key / Secret key
- Public URL prefix
- Test connection

### 3. Cấu hình Email
- SMTP settings
- Email templates
- Sender info

### 4. Cấu hình khác
- Pagination defaults
- Cache TTL
- Feature flags

## Types

```typescript
interface SystemConfig {
  id: string;
  key: string;
  value: string;
  type: ConfigType;
  description: string;
  category: ConfigCategory;
  isSecret: boolean;
  updatedAt: string;
  updatedBy?: User;
}

type ConfigType = 'STRING' | 'NUMBER' | 'BOOLEAN' | 'JSON' | 'SECRET';

type ConfigCategory = 
  | 'GENERAL' 
  | 'AWS_S3' 
  | 'EMAIL' 
  | 'SECURITY' 
  | 'FEATURE_FLAGS';

interface ConfigFormValues {
  [key: string]: string | number | boolean;
}

// Common config keys
interface CommonConfigs {
  CURRENT_ACADEMIC_YEAR: string;     // "2024-2025"
  APP_NAME: string;                   // "Đoàn Hội Portal"
  MAINTENANCE_MODE: boolean;          // false
  MAX_UPLOAD_SIZE: number;            // 10485760 (10MB)
}

// AWS S3 config keys
interface S3Configs {
  AWS_S3_BUCKET: string;
  AWS_S3_REGION: string;
  AWS_S3_ACCESS_KEY: string;
  AWS_S3_SECRET_KEY: string;
  AWS_S3_PUBLIC_URL: string;
}
```

## Components

### SystemConfigPage
- Layout với tabs/sections
- Fetch configs on mount
- Handle save

### ConfigSection
```tsx
interface ConfigSectionProps {
  title: string;
  description?: string;
  children: React.ReactNode;
}

<ConfigSection title="Cấu hình AWS S3">
  <S3ConfigForm />
</ConfigSection>
```

### ConfigForm
- Dynamic form based on config type
- Validation
- Submit handler

### ConfigValueInput
Input component theo type:
- `STRING`: Text input
- `NUMBER`: Number input
- `BOOLEAN`: Toggle/Switch
- `JSON`: JSON editor
- `SECRET`: Password input với mask

### S3ConfigForm
Form cụ thể cho S3:
- Bucket name
- Region dropdown
- Access credentials
- Test connection button

## API Endpoints

| Method | Endpoint | Mô tả |
|--------|----------|-------|
| GET | `/system-config` | Lấy tất cả config |
| GET | `/system-config/:key` | Lấy config theo key |
| GET | `/system-config/category/:category` | Lấy theo category |
| PUT | `/system-config/:key` | Cập nhật config |
| POST | `/system-config/bulk` | Cập nhật nhiều config |
| POST | `/system-config/test-s3` | Test S3 connection |

### Response Example
```json
// GET /system-config
{
  "data": [
    {
      "key": "CURRENT_ACADEMIC_YEAR",
      "value": "2024-2025",
      "type": "STRING",
      "category": "GENERAL",
      "description": "Năm học hiện tại"
    },
    {
      "key": "AWS_S3_BUCKET",
      "value": "doanhoi-portal-files",
      "type": "STRING",
      "category": "AWS_S3",
      "description": "Tên S3 bucket"
    }
  ]
}

// PUT /system-config/CURRENT_ACADEMIC_YEAR
{
  "value": "2024-2025"
}
```

## Permissions
```
system-config.access       # Truy cập trang cấu hình
system-config.view         # Xem cấu hình
system-config.update       # Cập nhật cấu hình
system-config.view-secrets # Xem giá trị secret
```

## Config Categories

### GENERAL
| Key | Type | Description |
|-----|------|-------------|
| CURRENT_ACADEMIC_YEAR | STRING | Năm học hiện tại |
| APP_NAME | STRING | Tên ứng dụng |
| MAINTENANCE_MODE | BOOLEAN | Chế độ bảo trì |
| MAX_UPLOAD_SIZE | NUMBER | Kích thước upload tối đa (bytes) |

### AWS_S3
| Key | Type | Description |
|-----|------|-------------|
| AWS_S3_BUCKET | STRING | Tên bucket |
| AWS_S3_REGION | STRING | AWS region |
| AWS_S3_ACCESS_KEY | SECRET | Access key ID |
| AWS_S3_SECRET_KEY | SECRET | Secret access key |
| AWS_S3_PUBLIC_URL | STRING | Public URL prefix |

### EMAIL
| Key | Type | Description |
|-----|------|-------------|
| SMTP_HOST | STRING | SMTP server host |
| SMTP_PORT | NUMBER | SMTP port |
| SMTP_USER | STRING | SMTP username |
| SMTP_PASSWORD | SECRET | SMTP password |
| SENDER_EMAIL | STRING | Default sender email |
| SENDER_NAME | STRING | Default sender name |

### FEATURE_FLAGS
| Key | Type | Description |
|-----|------|-------------|
| ENABLE_PAYOS | BOOLEAN | Bật tích hợp PayOS |
| ENABLE_RAG_CHAT | BOOLEAN | Bật RAG chatbot |
| ENABLE_EMAIL_NOTIFICATIONS | BOOLEAN | Bật email notifications |

## UI Layout

```
┌──────────────────────────────────────────────────┐
│  System Configuration                             │
├──────────────────────────────────────────────────┤
│  [General] [AWS S3] [Email] [Features]           │
├──────────────────────────────────────────────────┤
│                                                   │
│  ┌─── Cấu hình chung ──────────────────────────┐│
│  │                                              ││
│  │  Năm học hiện tại: [2024-2025         ▼]   ││
│  │                                              ││
│  │  Tên ứng dụng:     [Đoàn Hội Portal    ]   ││
│  │                                              ││
│  │  Chế độ bảo trì:   [○ Off  ● On]           ││
│  │                                              ││
│  └──────────────────────────────────────────────┘│
│                                                   │
│  ┌─── AWS S3 ───────────────────────────────────┐│
│  │                                              ││
│  │  Bucket:    [doanhoi-portal-files    ]      ││
│  │  Region:    [ap-southeast-1          ▼]     ││
│  │  Access Key: [AKIA************        ]     ││
│  │  Secret Key: [●●●●●●●●●●●●●●●●        ]     ││
│  │                                              ││
│  │  [Test Connection]                           ││
│  │                                              ││
│  └──────────────────────────────────────────────┘│
│                                                   │
│                              [Cancel] [Save]      │
└──────────────────────────────────────────────────┘
```

## Test S3 Connection

```typescript
const testS3Connection = async () => {
  try {
    setTesting(true);
    const response = await api.post('/system-config/test-s3');
    
    if (response.data.success) {
      toast.success('Kết nối S3 thành công!');
    } else {
      toast.error('Không thể kết nối S3: ' + response.data.message);
    }
  } catch (error) {
    toast.error('Lỗi kiểm tra kết nối S3');
  } finally {
    setTesting(false);
  }
};
```

## Security Notes

### Secret Handling
- Secret values được mask trên UI
- Không log secret values
- Encrypted storage in database
- Access logs cho sensitive configs

### Permission Separation
- `view` permission chỉ xem non-secret
- `view-secrets` mới xem được secret values
- Audit trail cho mọi thay đổi

## Lưu ý kỹ thuật
- Configs được cache ở backend
- Clear cache sau khi update
- Validation theo type
- Rollback mechanism
- Config versioning (audit log)
- Environment override (env vars > db config)
