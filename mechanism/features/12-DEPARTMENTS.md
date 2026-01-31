# Feature: Departments (Quản lý Khoa)

## Tổng quan
Module quản lý danh sách các Khoa/Phòng ban trong trường, dùng làm dữ liệu master cho các module khác (Classes, Users).

## Đường dẫn
```
frontend/src/features/departments/
├── pages/
│   └── DepartmentsPage.tsx               # Trang chính
├── components/
│   ├── DepartmentsTable.tsx              # Bảng danh sách
│   ├── DepartmentForm.tsx                # Form tạo/sửa
│   ├── DepartmentFilters.tsx             # Filter controls
│   └── DeleteDepartmentModal.tsx         # Modal xác nhận xóa
├── hooks/
│   ├── useDepartments.ts                 # Hook CRUD departments
│   └── useDepartmentFilters.ts           # Hook filter logic
└── types/
    └── index.ts                          # Type definitions
```

## Chức năng chính

### 1. Quản lý Khoa (CRUD)
- Tạo khoa mới
- Xem danh sách khoa
- Cập nhật thông tin
- Xóa khoa

### 2. Filter & Search
- Search theo tên khoa
- Search theo mã khoa

### 3. Thống kê
- Số lớp thuộc khoa
- Số sinh viên thuộc khoa

## Types

```typescript
interface Department {
  id: string;
  code: string;           // Mã khoa: "CSE"
  name: string;           // Tên đầy đủ: "Khoa Khoa học và Kỹ thuật Máy tính"
  shortName?: string;     // Tên ngắn: "KHMT"
  description?: string;   // Mô tả
  classCount?: number;    // Số lớp
  studentCount?: number;  // Số sinh viên
  isActive: boolean;      // Trạng thái hoạt động
  createdAt: string;
  updatedAt: string;
}

interface CreateDepartmentDto {
  code: string;
  name: string;
  shortName?: string;
  description?: string;
}

interface UpdateDepartmentDto extends Partial<CreateDepartmentDto> {
  isActive?: boolean;
}

interface DepartmentFilters {
  search?: string;
  isActive?: boolean;
  page: number;
  limit: number;
}

interface DepartmentsResponse {
  data: Department[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}
```

## Components

### DepartmentsPage
Layout chính:
- Header với title, Add button
- Search bar
- Departments table
- Pagination

### DepartmentsTable
| Column | Description |
|--------|-------------|
| Mã khoa | Department code |
| Tên khoa | Full name |
| Tên ngắn | Short name |
| Số lớp | Class count |
| Số SV | Student count |
| Trạng thái | Active/Inactive badge |
| Actions | Edit, Delete buttons |

### DepartmentForm
```tsx
<DepartmentForm
  initialValues={selectedDepartment}
  onSubmit={handleSubmit}
  isLoading={isSubmitting}
/>
```

Fields:
- Mã khoa (required, unique)
- Tên khoa (required)
- Tên ngắn (optional)
- Mô tả (optional, textarea)
- Trạng thái (toggle)

### DepartmentFilters
- Search input
- Active filter (All/Active/Inactive)

## API Endpoints

| Method | Endpoint | Mô tả |
|--------|----------|-------|
| GET | `/departments` | Danh sách khoa |
| GET | `/departments/:id` | Chi tiết khoa |
| POST | `/departments` | Tạo khoa |
| PATCH | `/departments/:id` | Cập nhật khoa |
| DELETE | `/departments/:id` | Xóa khoa |

### Query Parameters
```
GET /departments?
  search=KHMT&
  isActive=true&
  page=1&
  limit=20
```

### Response Example
```json
{
  "data": [
    {
      "id": "dept-1",
      "code": "CSE",
      "name": "Khoa Khoa học và Kỹ thuật Máy tính",
      "shortName": "KHMT",
      "description": "Khoa đào tạo ngành CNTT",
      "classCount": 25,
      "studentCount": 1200,
      "isActive": true
    },
    {
      "id": "dept-2",
      "code": "EE",
      "name": "Khoa Điện - Điện tử",
      "shortName": "Điện",
      "classCount": 20,
      "studentCount": 950,
      "isActive": true
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 15,
    "totalPages": 1
  }
}
```

## Permissions
```
departments.access    # Truy cập module
departments.create    # Tạo khoa
departments.update    # Cập nhật khoa
departments.delete    # Xóa khoa
```

## Hooks

### useDepartments
```typescript
const {
  departments,
  isLoading,
  error,
  pagination,
  createDepartment,
  updateDepartment,
  deleteDepartment,
  refetch,
} = useDepartments(filters);
```

### useDepartmentFilters
```typescript
const {
  filters,
  setSearch,
  setActiveFilter,
  resetFilters,
} = useDepartmentFilters(initialFilters);
```

## Validation Rules

| Field | Rules |
|-------|-------|
| code | Required, unique, max 20 chars, alphanumeric |
| name | Required, max 200 chars |
| shortName | Optional, max 50 chars |
| description | Optional, max 500 chars |

## Business Rules

### Delete Department
- Không thể xóa nếu còn lớp thuộc khoa
- Không thể xóa nếu còn users thuộc khoa
- Soft delete (set isActive = false) thay vì hard delete

### Code Uniqueness
- Mã khoa phải unique trong toàn hệ thống
- Không phân biệt hoa/thường (CSE = cse)

## UI States

### Loading
- Skeleton table rows
- Disabled search

### Empty
- "Không có khoa nào"
- Nút tạo khoa mới

### Error
- Error message
- Retry button

## Usage in Other Modules

### Classes Module
```typescript
// Dropdown chọn khoa khi tạo lớp
const { departments } = useDepartments({ isActive: true });

<Select
  options={departments.map(d => ({
    value: d.id,
    label: d.name
  }))}
  onChange={setDepartmentId}
/>
```

### Users Module
```typescript
// Filter users theo khoa
const { departments } = useDepartments({ isActive: true });

<DepartmentFilter
  departments={departments}
  selected={selectedDepartment}
  onChange={handleDepartmentChange}
/>
```

## UI Layout

```
┌──────────────────────────────────────────────────────────────┐
│  Quản lý Khoa                              [+ Thêm khoa]     │
├──────────────────────────────────────────────────────────────┤
│  🔍 [Search by name or code...    ]   [All ▼] [Active ▼]    │
├──────────────────────────────────────────────────────────────┤
│                                                               │
│  | Mã    | Tên khoa            | Ngắn  | Lớp | SV   | TT  |  │
│  |-------|---------------------|-------|-----|------|-----|  │
│  | CSE   | KHKT Máy tính       | KHMT  | 25  | 1200 | ✓   |  │
│  | EE    | Điện - Điện tử      | Điện  | 20  | 950  | ✓   |  │
│  | ME    | Cơ khí              | CK    | 18  | 800  | ✓   |  │
│  | CE    | Xây dựng            | XD    | 15  | 650  | ✓   |  │
│                                                               │
├──────────────────────────────────────────────────────────────┤
│  Showing 1-4 of 4                    [<] 1 [>]               │
└──────────────────────────────────────────────────────────────┘
```

## Lưu ý kỹ thuật
- Department là master data, thay đổi cần cẩn thận
- Cache department list cho dropdowns
- Import departments từ hệ thống trường (nếu có)
- Sync với hệ thống khác qua API
