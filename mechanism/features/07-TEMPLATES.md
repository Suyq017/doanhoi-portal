# Feature: Templates (Quản lý mẫu đơn)

## Tổng quan
Module quản lý mẫu đơn/biểu mẫu Word với khả năng tự động điền thông tin, cho phép sinh viên nộp đơn online và tải xuống văn bản đã điền.

## Đường dẫn
```
frontend/src/features/templates/
├── components/
│   ├── admin/
│   │   ├── TemplateListHeader.tsx     # Header trang danh sách
│   │   ├── TemplateListFilters.tsx    # Bộ lọc
│   │   ├── TemplateTable.tsx          # Bảng templates
│   │   ├── TemplateEmptyState.tsx     # Empty state
│   │   ├── FieldConfigTable.tsx       # Cấu hình fields
│   │   ├── PageStates.tsx             # Loading/Error states
│   │   └── DateMappingDialog.tsx      # Dialog mapping ngày
│   ├── user/
│   │   ├── tabs/
│   │   │   ├── TemplateListTab.tsx    # Tab danh sách mẫu
│   │   │   ├── FormFillTab.tsx        # Tab điền form
│   │   │   └── MySubmissionsTab.tsx   # Tab đơn đã nộp
│   │   ├── DocumentPreviewModal.tsx   # Preview document
│   │   └── SubmissionPreviewModal.tsx # Preview submission
├── hooks/
│   ├── useTemplateListPage.ts         # Hook danh sách admin
│   ├── useTemplateUploadPage.ts       # Hook upload template
│   ├── useTemplateConfigPage.ts       # Hook cấu hình
│   └── useUserTemplatePage.ts         # Hook trang user
├── pages/
│   ├── admin/
│   │   ├── TemplateListPage.tsx       # Danh sách templates
│   │   ├── TemplateUploadPage.tsx     # Upload template mới
│   │   └── TemplateConfigPage.tsx     # Cấu hình fields
│   └── user/
│       └── UserTemplatePage.tsx       # Trang cho sinh viên
└── types/
    └── index.ts                       # Type definitions
```

## Chức năng chính

### 1. Admin - Quản lý mẫu đơn
- Upload file Word template (.docx)
- Tự động detect placeholders (${field_name})
- Cấu hình mapping fields
- Publish/Unpublish template
- Xóa template

### 2. Admin - Cấu hình Fields
- Định nghĩa label hiển thị
- Loại field (text, date, select, ...)
- Validation rules
- Giá trị mặc định

### 3. User - Điền đơn
- Xem danh sách mẫu đơn
- Điền form theo cấu hình
- Submit và download
- Preview văn bản không cần tải xuống

### 4. User - Quản lý đơn đã nộp
- Xem danh sách submissions
- Preview/Download đơn đã nộp

## Types

```typescript
interface Template {
  id: string;
  name: string;
  description?: string;
  originalFileName: string;
  s3Key: string;
  status: TemplateStatus;
  fields: ConfigureFieldDto[];
  createdAt: string;
  updatedAt: string;
}

type TemplateStatus = 'DRAFT' | 'PUBLISHED' | 'ARCHIVED';

interface ConfigureFieldDto {
  placeholder: string;
  label: string;
  fieldType: FieldType;
  required: boolean;
  defaultValue?: string;
  options?: string[];  // For select type
  autoFill?: AutoFillSource;
  validation?: FieldValidation;
}

type FieldType = 
  | 'TEXT' 
  | 'NUMBER' 
  | 'DATE' 
  | 'SELECT' 
  | 'CHECKBOX'
  | 'TEXTAREA';

type AutoFillSource = 
  | 'STUDENT_CODE'
  | 'FULL_NAME'
  | 'EMAIL'
  | 'CLASS'
  | 'DEPARTMENT'
  | 'CURRENT_DATE';

interface TemplateSubmission {
  id: string;
  templateId: string;
  userId: string;
  formData: Record<string, any>;
  generatedFileS3Key: string;
  status: SubmissionStatus;
  submittedAt: string;
  template?: Template;
  user?: User;
}

type SubmissionStatus = 'SUBMITTED' | 'PROCESSING' | 'COMPLETED' | 'REJECTED';
```

## Components

### Admin - TemplateTable
Columns:
- Tên mẫu đơn
- Mô tả
- Số fields
- Trạng thái
- Ngày tạo
- Actions (Configure/Delete)

### Admin - FieldConfigTable
- Drag & drop reorder
- Inline edit label
- Type selector
- Required toggle
- Auto-fill source select
- Options editor (for SELECT)

### User - FormFillTab
- Dynamic form từ field config
- Auto-fill từ profile
- Validation messages
- Progress indicator (filled/total)
- Preview button
- Submit button

### User - MySubmissionsTab
- Bảng submissions
- Status badges
- Preview/Download actions
- Filter by status

### DocumentPreviewModal
- Office Viewer integration
- Download button
- Loading state

## API Endpoints

### Admin APIs
| Method | Endpoint | Mô tả |
|--------|----------|-------|
| GET | `/templates` | Danh sách templates |
| POST | `/templates/upload` | Upload template mới |
| GET | `/templates/:id` | Chi tiết template |
| PATCH | `/templates/:id` | Cập nhật template |
| DELETE | `/templates/:id` | Xóa template |
| POST | `/templates/:id/configure` | Cấu hình fields |
| PATCH | `/templates/:id/status` | Thay đổi status |

### User APIs
| Method | Endpoint | Mô tả |
|--------|----------|-------|
| GET | `/templates/published` | Danh sách mẫu đã publish |
| POST | `/templates/:id/fill` | Điền và generate document |
| GET | `/submissions` | Danh sách submissions của user |
| GET | `/submissions/:id` | Chi tiết submission |
| GET | `/submissions/:id/download` | Download file đã generate |

## Permissions
```
templates.access            # Xem trang Biểu mẫu
templates.admin.access      # Xem trang Quản lý biểu mẫu (admin)
templates.manage            # Quản lý trang quản lý biểu mẫu (admin)
```

## Template Placeholder Format
```
${FIELD_NAME}

Examples:
${STUDENT_CODE}
${FULL_NAME}
${DATE_OF_BIRTH}
${REASON}
```

## Upload & Configure Flow

```
1. Upload .docx file
   ↓
2. Parse file để detect placeholders
   ↓
3. Hiển thị danh sách fields detected
   ↓
4. Admin cấu hình mỗi field:
   - Label
   - Type
   - Required
   - Auto-fill source
   - Options (nếu SELECT)
   ↓
5. Save configuration
   ↓
6. Publish template
```

## Fill & Submit Flow

```
1. User chọn template
   ↓
2. Form được render từ field config
   ↓
3. User điền các fields
   ↓
4. Submit form
   ↓
5. Backend generate file với data
   ↓
6. Preview document (optional)
   ↓
7. User có thể download file
```

## Lưu ý kỹ thuật
- File Word được lưu trên S3, các thông tin được lưu trong Database
- Chỉ nhận file Docx (Word 2007 trở lên), cần chuyển file doc -> docx
- Generate document sử dụng docxtemplater
- Office Viewer sử dụng Microsoft Online viewer
- Support Vietnamese characters
- Mapping ngày: Tách ngày/tháng/năm thành 3 fields riêng
