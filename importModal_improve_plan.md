# KẾ HOẠCH THỰC HIỆN CHỨC NĂNG IMPORT MODAL CHO DEPARTMENTS

## 📊 PHÂN TÍCH TÌNH TRẠNG HIỆN TẠI

### ✅ ĐÃ CÓ SẴN (KHÔNG CẦN LÀM LẠI)

#### **Backend:**
- ✅ `DepartmentsController` - đã có các CRUD endpoints cơ bản
- ✅ `DepartmentsService` - đã có business logic cơ bản  
- ✅ `DepartmentsModule` - đã configured
- ✅ `Department` entity - đã có sẵn
- ✅ Basic DTOs: `CreateDepartmentDto`, `UpdateDepartmentDto`, `QueryDepartmentDto`
- ✅ Template endpoint `/departments/template` - đã có với XLSX export

#### **Frontend:**
- ✅ `DepartmentsPage` - đã hoàn chỉnh với CRUD functionality
- ✅ `DepartmentService` - đã có tất cả methods cần thiết
- ✅ Tất cả modal components: Create, Edit, View, Delete
- ✅ Cơ bản `ImportModal` component từ shared
- ✅ Translation files - đã có đầy đủ cho vi và en
- ✅ Import types và interfaces trong `shared/types/import.ts`

### ❌ CHƯA CÓ/CẦN CẢI TIẾN

#### **Backend:**
1. **Import endpoints chuyên biệt** - hiện tại chỉ có endpoint import cơ bản
2. **Excel parsing service** - cần service xử lý file Excel thực tế
3. **Data validation service** - validate dữ liệu import nghiêm ngặt hơn
4. **Batch import service** - xử lý import hàng loạt với error handling

#### **Frontend:**
1. **Cải tiến ImportModal hiện có** - tận dụng modal đã có, chỉ cần nâng cấp
2. **File upload service** - upload file XLSX lên backend
3. **Cải tiến preview trong modal** - hiển thị data từ backend response
4. **Cải tiến error handling** - hiển thị lỗi chi tiết từ backend trong modal
5. **Cải tiến progress tracking** - theo dõi tiến độ import trong modal

## 🎯 KẾ HOẠCH THỰC HIỆN

### **GIAI ĐOẠN 1: BACKEND ENHANCEMENT**

#### **1.1 Tạo Excel Parser Service** 
```typescript
// backend/src/departments/services/excel-parser.service.ts
- parseExcelFile(buffer: Buffer): Promise<any[]>
- validateHeaders(headers: string[]): boolean
- mapRowData(row: any[]): DepartmentImportData
- generateTemplate(): Promise<Buffer>
```

#### **1.2 Tạo Import Validation Service**
```typescript
// backend/src/departments/services/import-validation.service.ts
- validateDepartmentData(data: DepartmentImportData[]): ValidationResult
- checkDuplicates(data: DepartmentImportData[]): DuplicateInfo[]
- checkExistingConflicts(data: DepartmentImportData[]): ConflictInfo[]
```

#### **1.3 Tạo Import Session Service**
```typescript
// backend/src/departments/services/import-session.service.ts
- createSession(): Promise<string> // Tạo session ID cho import
- storeSessionData(sessionId: string, data: any): Promise<void>
- getSessionData(sessionId: string): Promise<any>
- cleanupSession(sessionId: string): Promise<void>
```

#### **1.4 Tạo Import Service**
```typescript
// backend/src/departments/services/import.service.ts
- importDepartments(sessionId: string, options: ImportOptions): Promise<ImportResult>
- handleDuplicates(duplicates: DepartmentImportData[]): Promise<void>
- rollbackOnError(): Promise<void>
```

#### **1.5 Cập nhật Controller**
- `POST /departments/import/upload` - Upload và parse file Excel
- `GET /departments/import/:sessionId/preview` - Lấy preview data đã parsed
- `POST /departments/import/:sessionId/validate` - Validate data chi tiết
- `POST /departments/import/:sessionId/execute` - Thực hiện import
- `DELETE /departments/import/:sessionId` - Cleanup session data

### **GIAI ĐOẠN 2: FRONTEND ENHANCEMENT**

#### **2.1 Cập nhật Department Service**
```typescript
// frontend/src/shared/services/departmentService.ts
- uploadImportFile(file: File): Promise<ParseResult> // Upload file và nhận parsed data
- validateImportData(sessionId: string): Promise<ValidationResult> // Validate data trên server
- executeImport(sessionId: string, options: ImportOptions): Promise<ImportResult> // Execute import
```

#### **2.2 Cải tiến ImportModal hiện có**
```tsx
// frontend/src/shared/components/ImportModal.tsx - CẢI TIẾN MODAL CŨ
- Thêm session-based workflow (upload -> preview -> validate -> import)
- Cải tiến preview table để hiển thị validation errors từ server
- Thêm conflict resolution UI trong modal
- Cải tiến progress tracking và error display
- Giữ nguyên cấu trúc component, chỉ nâng cấp logic
```

#### **2.3 Cập nhật DepartmentsPage**
- Cập nhật import configuration để sử dụng server-side parsing
- Thêm error handling cho import responses từ server
- Giữ nguyên cách sử dụng ImportModal, chỉ thay đổi config

### **GIAI ĐOẠN 3: UI/UX IMPROVEMENTS**

#### **3.1 Import Modal Flow (Sử dụng modal hiện có)**
1. **Upload Step** - Upload file XLSX lên server với drag & drop (giữ nguyên UI)
2. **Preview Step** - Hiển thị data đã parsed từ server trong preview table hiện có
3. **Validate Step** - Server kiểm tra conflicts, frontend hiển thị trong modal
4. **Import Step** - Server thực hiện import, modal hiển thị progress
5. **Result Step** - Hiển thị kết quả import trong modal (nâng cấp UI hiện có)

#### **3.2 Error Handling (Trong modal hiện có)**
- Server-side validation errors hiển thị trong preview table
- Server-side duplicate handling với options trong modal
- Server-side import errors hiển thị user-friendly trong modal
- Tận dụng error display logic hiện có, chỉ cải tiến data source

#### **3.3 Performance Optimization**
- Server-side file processing và chunking
- Session-based data storage trên server
- Polling progress trong modal hiện có
- Memory efficient server-side parsing

## 📋 DANH SÁCH TASKS CỤ THỂ

### **Backend Tasks:**
1. ⭐ Tạo `ExcelParserService` với XLSX parsing
2. ⭐ Tạo `ImportValidationService` với business rules
3. ⭐ Tạo `ImportSessionService` với session management
4. ⭐ Tạo `ImportService` với transaction handling
5. ⭐ Cập nhật `DepartmentsController` với import endpoints
6. ⭐ Cập nhật `DepartmentsModule` với new services
7. ⭐ Thêm proper error handling và logging
8. ⭐ Thêm file upload middleware (multer)

### **Frontend Tasks:**
1. ⭐ Cập nhật `DepartmentService` với file upload methods
2. ⭐ **Cải tiến `ImportModal` hiện có** thay vì tạo mới
   - Thêm session-based workflow logic
   - Cải tiến preview table và error display
   - Thêm conflict resolution UI
   - Nâng cấp progress tracking
3. ⭐ Cập nhật `DepartmentsPage` config cho server-side parsing
4. ⭐ Cập nhật translation keys cho server responses

## ⚠️ LƯU Ý QUAN TRỌNG

- **Tận dụng tối đa** ImportModal và components hiện có
- **Chỉ cải tiến** chứ không tạo mới components
- **Giữ nguyên** cấu trúc project và naming conventions hiện tại
- **Focus vào** việc enhance import functionality với server-side processing
- **Đảm bảo** backward compatibility với existing code
- **Ưu tiên** sửa đổi ít nhất có thể ở frontend
- **KHÔNG thực hiện** các công việc testing (unit test, integration test, performance test)
- **Chỉ tạo** test data Excel files cho demo, không viết test cases

## 🎯 ƯU TIÊN THỰC HIỆN

**Mức độ 1 (Cao nhất):** Backend Excel parsing và validation services
**Mức độ 2 (Cao):** Cải tiến ImportModal hiện có với server communication
**Mức độ 3 (Trung bình):** Enhanced preview và error handling trong modal
**Mức độ 4 (Thấp):** Performance optimization và advanced features
