# Feature: Classes (Quản lý lớp học)

## Tổng quan
Module quản lý danh sách lớp học trong trường, hỗ trợ import từ file Excel, filter theo khoa và khóa học.

## Đường dẫn
```
frontend/src/features/classes/
├── ClassesPage.tsx                       # Trang chính
├── components/
│   ├── ClassesTable.tsx                  # Bảng danh sách lớp
│   ├── ClassForm.tsx                     # Form tạo/sửa lớp
│   ├── ClassFilters.tsx                  # Filter controls
│   ├── ImportClassesModal.tsx            # Modal import Excel
│   └── DeleteConfirmModal.tsx            # Modal xác nhận xóa
├── hooks/
│   ├── useClasses.ts                     # Hook CRUD classes
│   └── useClassFilters.ts                # Hook filter logic
└── types/
    └── index.ts                          # Type definitions
```

## Chức năng chính

### 1. Quản lý lớp học (CRUD)
- Tạo lớp học mới
- Xem danh sách lớp
- Cập nhật thông tin lớp
- Xóa lớp học

### 2. Filter & Search
- Filter theo khoa (Department)
- Filter theo khóa học (Enrollment Year)
- Search theo tên lớp, mã lớp

### 3. Import từ Excel
- Upload file Excel
- Preview dữ liệu
- Validate và import

### 4. Export
- Export danh sách lớp ra Excel
- Custom columns

## Types

```typescript
interface Class {
  id: string;
  code: string;              // Mã lớp: "CO2021-01"
  name: string;              // Tên lớp: "Khoa học máy tính 2021 - Lớp 1"
  departmentId: string;      // ID khoa
  enrollmentYear: number;    // Năm nhập học: 2021
  studentCount?: number;     // Số sinh viên
  department?: Department;   // Khoa (populated)
  createdAt: string;
  updatedAt: string;
}

interface CreateClassDto {
  code: string;
  name: string;
  departmentId: string;
  enrollmentYear: number;
}

interface UpdateClassDto extends Partial<CreateClassDto> {}

interface ClassFilters {
  departmentId?: string;
  enrollmentYear?: number;
  search?: string;
  page: number;
  limit: number;
}

interface ClassesResponse {
  data: Class[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}
```

## Components

### ClassesPage
Layout chính:
- Header với title và actions
- Filter bar
- Classes table
- Pagination

### ClassesTable
| Column | Description |
|--------|-------------|
| Mã lớp | Class code |
| Tên lớp | Class name |
| Khoa | Department name |
| Khóa | Enrollment year |
| Số SV | Student count |
| Actions | Edit, Delete buttons |

### ClassForm
```tsx
<ClassForm
  initialValues={selectedClass}
  onSubmit={handleSubmit}
  departments={departments}
  isLoading={isSubmitting}
/>
```

Fields:
- Mã lớp (required, unique)
- Tên lớp (required)
- Khoa (dropdown, required)
- Khóa (number, required)

### ClassFilters
```tsx
<ClassFilters
  departments={departments}
  selectedDepartment={filters.departmentId}
  selectedYear={filters.enrollmentYear}
  searchTerm={filters.search}
  onFilterChange={handleFilterChange}
/>
```

### ImportClassesModal
1. Upload Excel file
2. Preview data table
3. Show validation errors
4. Confirm import

## API Endpoints

| Method | Endpoint | Mô tả |
|--------|----------|-------|
| GET | `/classes` | Danh sách lớp |
| GET | `/classes/:id` | Chi tiết lớp |
| POST | `/classes` | Tạo lớp |
| PATCH | `/classes/:id` | Cập nhật lớp |
| DELETE | `/classes/:id` | Xóa lớp |
| POST | `/classes/import` | Import từ Excel |
| GET | `/classes/export` | Export ra Excel |

### Query Parameters
```
GET /classes?
  departmentId=dept-1&
  enrollmentYear=2021&
  search=KHMT&
  page=1&
  limit=20
```

### Response Example
```json
{
  "data": [
    {
      "id": "class-1",
      "code": "CO2021-01",
      "name": "Khoa học máy tính 2021 - Lớp 1",
      "departmentId": "dept-cs",
      "enrollmentYear": 2021,
      "studentCount": 45,
      "department": {
        "id": "dept-cs",
        "name": "Khoa Khoa học và Kỹ thuật Máy tính"
      }
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 150,
    "totalPages": 8
  }
}
```

## Permissions
```
classes.access    # Truy cập module
classes.create    # Tạo lớp
classes.update    # Cập nhật lớp
classes.delete    # Xóa lớp
classes.import    # Import từ Excel
classes.export    # Export ra Excel
```

## Import Excel Format

### Required Columns
| Column | Type | Description |
|--------|------|-------------|
| code | String | Mã lớp (unique) |
| name | String | Tên lớp |
| department_code | String | Mã khoa |
| enrollment_year | Number | Năm nhập học |

### Example Excel
```
| code       | name                     | department_code | enrollment_year |
|------------|--------------------------|-----------------|-----------------|
| CO2021-01  | KHMT 2021 - Lớp 1       | CSE             | 2021            |
| CO2021-02  | KHMT 2021 - Lớp 2       | CSE             | 2021            |
| EE2022-01  | Điện tử 2022 - Lớp 1    | EE              | 2022            |
```

### Validation Rules
- `code`: Required, unique in system
- `name`: Required, max 200 chars
- `department_code`: Must exist in departments
- `enrollment_year`: 4-digit year, valid range

## Import Flow

```
1. User clicks "Import"
       ↓
2. Modal opens with file upload
       ↓
3. User selects Excel file
       ↓
4. Frontend parses and previews
       ↓
5. Show validation errors (if any)
       ↓
6. User clicks "Confirm Import"
       ↓
7. Send to API /classes/import
       ↓
8. Backend validates and inserts
       ↓
9. Return result summary
       ↓
10. Show success/error count
```

## Hooks

### useClasses
```typescript
const {
  classes,
  isLoading,
  error,
  pagination,
  createClass,
  updateClass,
  deleteClass,
  refetch,
} = useClasses(filters);
```

### useClassFilters
```typescript
const {
  filters,
  setDepartment,
  setEnrollmentYear,
  setSearch,
  resetFilters,
} = useClassFilters(initialFilters);
```

## UI States

### Loading
- Skeleton table rows
- Disabled filters

### Empty
- "Không có lớp nào"
- Hướng dẫn tạo hoặc import

### Error
- Error message
- Retry button

## Lưu ý kỹ thuật
- Class code phải unique trong toàn hệ thống
- Không thể xóa lớp có sinh viên
- Import hỗ trợ update nếu code đã tồn tại
- Filter debounce 300ms cho search
- Pagination mặc định 20 items/page
