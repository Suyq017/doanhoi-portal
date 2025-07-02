# Kế hoạch tích hợp chức năng Import Excel cho UserPage

## 1. Phân tích cấu trúc hiện tại

### Entity User
- Các trường chính: name, email, username, password, organizationIds, classId, departmentId
- Quan hệ: ManyToMany với Organization, ManyToOne với Class và Department
- Trường bắt buộc: name, email, username (unique)

### Cấu trúc import hiện tại (Department/Classes)
- ExcelParserService: Parse file Excel
- ImportValidationService: Validate dữ liệu
- ImportSessionService: Quản lý session import
- ImportService: Logic chính import
- Controller: Các endpoint API
- Frontend: ImportModal component

## 2. Thiết kế format Excel cho Users

### Template Excel columns:
| Column | Required | Type | Description | Example |
|--------|----------|------|-------------|---------|
| Name | ✓ | String | Tên đầy đủ | Nguyễn Văn A |
| Email | ✓ | String | Email (unique) | a.nguyen@example.com |
| Username | ✓ | String | Username (unique) | nguyenvana |
| Password |  | String | Mật khẩu (nếu không có sẽ auto-generate) | 123456 |
| Phone |  | String | Số điện thoại | 0987654321 |
| Class Code |  | String | Mã lớp | CS2024A |
| Department Code |  | String | Mã phòng ban | IT |
| Organization Codes |  | String | Mã tổ chức (phân cách bằng ;) | ORG1;ORG2 |
| Is Active |  | Boolean | Trạng thái hoạt động | TRUE/FALSE |

## 3. Kế hoạch thực hiện Backend

### Bước 1: Tạo ExcelParserService cho Users
**File**: `backend/src/users/services/excel-parser.service.ts`

```typescript
export interface UserImportData {
  name: string;
  email: string;
  username: string;
  password?: string;
  phone?: string;
  classCode?: string;
  departmentCode?: string;
  organizationCodes?: string; // "ORG1;ORG2;ORG3"
  isActive?: boolean;
}
```

**Chức năng**:
- Parse Excel file với các column định nghĩa
- Validate format cơ bản (email format, required fields)
- Generate template Excel
- Xử lý organization codes (split by semicolon)

### Bước 2: Tạo ImportValidationService cho Users
**File**: `backend/src/users/services/import-validation.service.ts`

**Validation rules**:
- Email format và unique check
- Username unique check
- Name required và length validation
- Class code validation (check tồn tại)
- Department code validation (check tồn tại)
- Organization codes validation (check từng code tồn tại)
- Phone format validation (optional)
- Password complexity (nếu có)

**Resolve references**:
- Map classCode → classId
- Map departmentCode → departmentId  
- Map organizationCodes → organizationIds[]

### Bước 3: Tạo ImportSessionService cho Users
**File**: `backend/src/users/services/import-session.service.ts`

**Chức năng**:
- Quản lý session import users
- Lưu trữ validated data với resolved IDs
- Track import progress và kết quả

### Bước 4: Tạo ImportService cho Users
**File**: `backend/src/users/services/import.service.ts`

**Logic chính**:
- Upload và parse file
- Validate data với dependency checks
- Execute import với transaction
- Handle conflicts (email/username duplicates)
- Auto-generate password nếu không có
- Hash password trước khi lưu
- Tạo relations với Organization, Class, Department

**Xử lý đặc biệt**:
- Password hashing (bcrypt)
- Multiple organization assignments
- Transaction để đảm bảo data consistency
- Error handling cho duplicate email/username

### Bước 5: Cập nhật UsersController
**File**: `backend/src/users/users.controller.ts`

**Thêm endpoints**:
```typescript
@Post('import/upload')
@UseInterceptors(FileInterceptor('file'))
uploadImportFile(@UploadedFile() file: Express.Multer.File)

@Get('import/:sessionId/validate')
validateImportData(@Param('sessionId') sessionId: string)

@Post('import/:sessionId/execute')
executeImport(@Param('sessionId') sessionId: string, @Body() options)

@Get('import/:sessionId/status')
getImportStatus(@Param('sessionId') sessionId: string)

@Get('template')
downloadTemplate()
```

### Bước 6: Cập nhật UsersModule
**File**: `backend/src/users/users.module.ts`

**Register services**:
- ExcelParserService
- ImportValidationService
- ImportSessionService
- ImportService
- Thêm TypeORM repositories cần thiết (Class, Department, Organization)

## 4. Kế hoạch thực hiện Frontend

### Bước 1: Cập nhật userService
**File**: `frontend/src/shared/services/userService.ts`

**Thêm functions**:
```typescript
// Import functions
uploadImportFile(file: File)
validateImportData(sessionId: string)
executeImport(sessionId: string, options?)
getImportStatus(sessionId: string)
downloadTemplate()
```

### Bước 2: Cập nhật UsersPage
**File**: `frontend/src/features/users/UsersPage.tsx`

**Thêm import config**:
```typescript
const importConfig = {
  title: 'Import Users',
  description: 'Import users from Excel file...',
  templateColumns: [
    'Name*', 'Email*', 'Username*', 'Password', 'Phone',
    'Class Code', 'Department Code', 'Organization Codes', 'Is Active'
  ],
  sampleData: [
    ['Nguyễn Văn A', 'a.nguyen@example.com', 'nguyenvana', '123456', '0987654321', 'CS2024A', 'IT', 'ORG1;ORG2', 'TRUE']
  ]
}
```

**Tích hợp ImportModal**:
- Thêm import button vào actions dropdown
- Configure ImportModal với userService functions
- Handle import success/error states
- Refresh user list sau khi import thành công

## 5. Xử lý đặc biệt cho Users

### Password Management
- Auto-generate secure password nếu không có
- Hash password với bcrypt trước khi lưu
- Option gửi email thông báo password (tương lai)

### Multiple Organizations
- Parse organization codes: "ORG1;ORG2;ORG3"
- Validate từng organization code tồn tại
- Tạo multiple UserOrganization records

### Conflict Resolution
- Email duplicate: Error (không thể import)
- Username duplicate: Error (không thể import)  
- Option update existing user thay vì skip

### Data Validation
- Email format validation
- Username format (alphanumeric, no spaces)
- Phone number format
- Class/Department existence
- Organization existence

## 6. Thứ tự thực hiện

### Phase 1: Backend Core (1-2 ngày)
1. Tạo UserImportData interface
2. Implement ExcelParserService
3. Implement ImportValidationService cơ bản
4. Test parsing và validation

### Phase 2: Backend Import Logic (1-2 ngày)
1. Implement ImportSessionService
2. Implement ImportService với transaction
3. Add controller endpoints
4. Update module dependencies
5. Test backend APIs

### Phase 3: Frontend Integration (0.5-1 ngày)
1. Add userService import functions
2. Add import config to UsersPage
3. Integrate ImportModal
4. Test full import flow

### Phase 4: Advanced Features (1 ngày)
1. Password auto-generation
2. Multiple organization handling
3. Better error messages
4. Validation improvements

## 7. Testing & Validation

### Test Cases
1. **Basic Import**: Simple users với required fields only
2. **Complete Import**: Users với tất cả fields và references
3. **Error Cases**: Invalid email, duplicate username, missing references
4. **Multiple Organizations**: Users thuộc nhiều organizations
5. **Password Handling**: Auto-generate vs provided passwords
6. **Large File**: Test performance với file lớn (1000+ users)

### Validation Points
- Database integrity sau import
- Password được hash đúng
- Organization relations được tạo đúng
- Class/Department references chính xác
- Error handling và rollback

## 8. Lưu ý kỹ thuật

### Security
- Validate file size và type
- Sanitize input data
- Hash passwords properly
- Prevent SQL injection trong queries

### Performance  
- Batch processing cho large imports
- Transaction optimization
- Memory management cho large files
- Progress tracking cho user experience

### Error Handling
- Detailed error messages
- Rollback on failure
- Partial import support
- User-friendly error display

### Data Consistency
- Use database transactions
- Validate foreign key references
- Handle concurrent imports
- Audit trail for imports

## 9. Kết quả mong đợi

Sau khi hoàn thành:
- Users có thể import từ Excel file tương tự như Departments/Classes
- Support đầy đủ các trường và relationships của User entity
- Error handling và validation comprehensive
- UI/UX nhất quán với existing import features
- Performance tốt với large datasets
- Security và data integrity được đảm bảo
