# KẾ HOẠCH THỰC HIỆN CHỨC NĂNG IMPORT XLSX CHO CLASSES PAGE

## 📋 PHÂN TÍCH CẤU TRÚC HIỆN TẠI

### Backend Department Structure (Tham khảo)
- **Import Service**: Xử lý logic import chính
- **Excel Parser Service**: Parse file xlsx và convert thành data
- **Import Validation Service**: Validate dữ liệu import
- **Import Session Service**: Quản lý session import và cache data
- **Controller**: Endpoints REST API cho import workflow

### Frontend Department Structure (Tham khảo)
- **DepartmentsPage**: Tích hợp ImportModal với config server-side
- **ImportModal**: Component chung xử lý import workflow
- **departmentService**: Service chứa các API calls cho import

## 🎯 KẾ HOẠCH THỰC HIỆN

### **GIAI ĐOẠN 1: BACKEND IMPLEMENTATION**

#### **Bước 1.1: Tạo Excel Parser Service cho Classes**
- Tạo file `backend/src/classes/services/excel-parser.service.ts`
- Định nghĩa interface `ClassImportData` với các fields: name, code, year, departmentCode, isActive
- Implement method `parseExcelFile()` để parse file xlsx
- Implement method `generateTemplate()` để tạo file mẫu Excel
- Validate headers và format dữ liệu từ Excel

#### **Bước 1.2: Tạo Import Validation Service cho Classes**
- Tạo file `backend/src/classes/services/import-validation.service.ts`
- Implement validation logic cho class data:
  - Required fields: name
  - Unique constraints: name trong cùng year
  - Department code validation (check existence)
  - Year format validation
  - Name length và format validation
- Implement duplicate detection trong import data
- Implement conflict detection với existing classes

#### **Bước 1.3: Tạo Import Session Service cho Classes**
- Tạo file `backend/src/classes/services/import-session.service.ts`
- Copy structure từ department import session service
- Adapt cho Class import data types
- Quản lý session lifecycle và cleanup

#### **Bước 1.4: Tạo Import Service cho Classes**
- Tạo file `backend/src/classes/services/import.service.ts`
- Implement main import workflow:
  - `uploadFile()`: Upload và parse Excel file
  - `validateData()`: Validate parsed data
  - `executeImport()`: Thực hiện import classes
  - `getSessionStatus()`: Get import session status
  - `generateTemplate()`: Generate Excel template
- Handle department lookup by code
- Handle duplicate class names trong cùng year
- Implement rollback on error logic

#### **Bước 1.5: Update Classes Controller**
- Thêm import endpoints vào `backend/src/classes/classes.controller.ts`:
  - `GET /classes/template` - Download Excel template
  - `POST /classes/import/upload` - Upload Excel file
  - `GET /classes/import/:sessionId/validate` - Validate import data
  - `POST /classes/import/:sessionId/execute` - Execute import
  - `GET /classes/import/:sessionId/status` - Get import status
- Inject ImportService vào controller
- Thêm proper API documentation với Swagger

#### **Bước 1.6: Update Classes Module**
- Thêm import services vào `backend/src/classes/classes.module.ts`
- Register ImportService, ExcelParserService, ImportValidationService, ImportSessionService
- Export services nếu cần thiết

### **GIAI ĐOẠN 2: FRONTEND IMPLEMENTATION**

#### **Bước 2.1: Update Class Service**
- Thêm import methods vào `frontend/src/shared/services/classService.ts`:
  - `uploadImportFile()`: Upload Excel file to backend
  - `validateImportData()`: Validate imported data
  - `executeImport()`: Execute import process
  - `getImportStatus()`: Get import session status
  - `getTemplate()`: Get template download URL
- Định nghĩa interfaces cho import responses
- Implement error handling cho import APIs

#### **Bước 2.2: Update ClassesPage**
- Thêm import configuration vào `frontend/src/features/classes/ClassesPage.tsx`
- Tạo `importConfig` object với:
  - `processingMode: 'server'`
  - Template URL và file settings
  - Import workflow functions từ classService
  - Column definitions cho class import
  - Success/error callbacks
- Thêm import modal state management
- Update `addDropdownOptions` để enable import option

#### **Bước 2.3: Update Import Button Logic**
- Enable import option trong dropdown của ClassesPage
- Connect import button với ImportModal component
- Ensure proper modal state management

### **GIAI ĐOẠN 3: INTEGRATION & TESTING**

#### **Bước 3.1: Integration Testing**
- Test file upload flow
- Test data validation với various scenarios
- Test import execution với success/error cases
- Test Excel template download
- Test session management và cleanup

#### **Bước 3.2: Error Handling**
- Implement comprehensive error messages
- Handle file format errors
- Handle validation errors với user-friendly messages
- Handle import conflicts và duplicate handling

#### **Bước 3.3: Performance Optimization**
- Implement proper session cleanup
- Optimize large file handling
- Add progress indicators cho large imports
- Implement proper memory management

### **GIAI ĐOẠN 4: DOCUMENTATION & CLEANUP**

#### **Bước 4.1: Documentation**
- Update API documentation
- Document import file format requirements
- Document validation rules
- Add troubleshooting guide

#### **Bước 4.2: Code Cleanup**
- Remove unused imports
- Optimize code structure
- Add proper TypeScript types
- Ensure consistent error handling

## 📝 CHI TIẾT IMPLEMENTATION

### Class Import Data Structure
```typescript
interface ClassImportData {
  name: string;           // Required
  code?: string;          // Optional
  year?: number;          // Optional
  departmentCode?: string;// Optional - lookup department by code
  isActive?: boolean;     // Optional - default true
}
```

### Excel Template Columns
- **name** (required): Tên lớp
- **code** (optional): Mã lớp
- **year** (optional): Năm học
- **departmentCode** (optional): Mã khoa/phòng ban
- **isActive** (optional): Trạng thái hoạt động

### Import Workflow
1. **Upload**: User uploads Excel file → Backend parses và tạo session
2. **Validate**: Frontend calls validate API → Backend validates data và return summary
3. **Review**: User reviews validation results trong ImportModal
4. **Import**: User confirms → Backend executes import với option handling conflicts
5. **Result**: Display import results với success/error counts

### Validation Rules
- **Name**: Required, max 100 characters, unique trong cùng year
- **Code**: Optional, max 20 characters, format validation
- **Year**: Optional, valid year format (YYYY)
- **Department Code**: Optional, must exist trong database
- **Conflicts**: Handle duplicate names trong cùng year

### Error Handling
- File format validation
- Data type validation
- Business logic validation
- Database constraint validation
- Session timeout handling
- Memory management cho large files

## 🔄 TÁI SỬ DỤNG COMPONENTS

### Shared Components
- **ImportModal**: Đã có sẵn, chỉ cần config phù hợp
- **Toast notifications**: Đã có sẵn trong useToast
- **AddDropdownButton**: Đã có sẵn, chỉ cần enable import option

### Shared Services Pattern
- Follow pattern từ departmentService
- Reuse import workflow structure
- Maintain consistent API interface
- Use same error handling patterns

### Shared Types
- Reuse ImportModalConfig interface
- Extend existing import types cho classes
- Maintain consistency với department import types

## ⚠️ LƯU Ý QUAN TRỌNG

### Security Considerations
- File size limitations (5MB)
- File type validation (.xlsx, .xls only)
- Session timeout management (30 minutes)
- Input sanitization và validation

### Performance Considerations
- Optimize cho large file imports
- Implement proper memory cleanup
- Use pagination cho preview data
- Implement progress indicators

### Business Logic
- Handle department lookup by code
- Validate class name uniqueness trong year scope
- Proper conflict resolution options
- Maintain referential integrity

### User Experience
- Clear validation error messages
- Progress indicators during import
- Detailed import results summary
- Proper success/error feedback
