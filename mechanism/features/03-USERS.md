# Feature: Users (Quản lý người dùng)

## Tổng quan
Module quản lý người dùng trong hệ thống, bao gồm CRUD operations, phân quyền, import/export và quản lý vai trò.

## Đường dẫn
```
frontend/src/features/users/
├── components/
│   ├── UserPageHeader.tsx         # Header với actions
│   ├── CreateUserModal.tsx        # Modal tạo user
│   ├── ViewUserModal.tsx          # Modal xem chi tiết
│   ├── EditUserModal.tsx          # Modal chỉnh sửa
│   ├── DeleteConfirmModal.tsx     # Modal xác nhận xóa
│   ├── UserRoleAssignmentModal.tsx # Gán vai trò cho user
│   ├── GrantRolesModal.tsx        # Grant roles hàng loạt
│   ├── RoleManager.tsx            # Component quản lý roles
│   ├── AccessDeniedState.tsx      # State khi không có quyền
│   └── PageStates.tsx             # Loading/Error states
├── hooks/
│   ├── useUsersPage.ts            # Hook chính cho page
│   ├── useUserModals.ts           # Hook quản lý modals
│   └── useUserList.ts             # Hook danh sách users
├── pages/
│   └── UsersPage.tsx              # Trang quản lý users
└── types/
    └── index.ts                   # Type definitions
```

## Chức năng chính

### 1. Danh sách người dùng
- Bảng hiển thị với pagination
- Tìm kiếm theo tên, mã sinh viên, email
- Lọc theo loại (Đoàn viên/Hội viên/Cả hai/Không thuộc)
- Lọc theo trạng thái (Active/Inactive)

### 2. CRUD Operations
- **Create**: Tạo user mới với form validation
- **Read**: Xem chi tiết thông tin user
- **Update**: Chỉnh sửa thông tin user
- **Delete**: Xóa user (soft delete)

### 3. Import/Export
- Import users từ file Excel
- Export danh sách ra Excel với field selection
- Template download

### 4. Role Management
- Gán vai trò cho user
- Grant roles hàng loạt
- Xem roles hiện tại của user

### 5. Bulk Actions
- Chọn nhiều users
- Xóa hàng loạt
- Grant roles hàng loạt

## Types

```typescript
interface UserPagePermissions {
  canCreate: boolean;
  canView: boolean;
  canEdit: boolean;
  canDelete: boolean;
  canExport: boolean;
  canImport: boolean;
  canManageRoles: boolean;
  showActionColumn: boolean;
  showBulkActions: boolean;
  hasAnyViewAction: boolean;
  hasAnyEditAction: boolean;
}

interface User {
  id: string;
  code: string;
  email: string;
  familyName: string;
  givenName: string;
  avatar?: string;
  isDoanVien: boolean;
  isHoiVien: boolean;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}
```

## Components

### UserPageHeader
- Tiêu đề "Quản lý người dùng"
- Nút tạo mới
- Dropdown menu: Import, Export, Grant Roles

### UserTableWithFilter
- Thanh tìm kiếm
- Filter dropdowns
- Bảng dữ liệu với columns:
  - Checkbox (bulk select)
  - Avatar + Tên
  - Mã sinh viên
  - Email
  - Loại (Đoàn viên/Hội viên)
  - Trạng thái
  - Actions

### CreateUserModal
Form fields:
- Họ và tên
- Mã sinh viên
- Email
- Loại thành viên (checkboxes)
- Trạng thái

### ViewUserModal
- Thông tin cơ bản
- Contact info
- Vai trò & Quyền hạn
- Lịch sử hoạt động

### RoleManager
- Danh sách roles hiện tại
- Search roles
- Toggle role assignment

## API Endpoints

| Method | Endpoint | Mô tả |
|--------|----------|-------|
| GET | `/users` | Danh sách users (paginated) |
| GET | `/users/:id` | Chi tiết user |
| POST | `/users` | Tạo user mới |
| PATCH | `/users/:id` | Cập nhật user |
| DELETE | `/users/:id` | Xóa user |
| POST | `/users/import` | Import users |
| GET | `/users/export` | Export users |
| POST | `/users/:id/roles` | Gán roles cho user |
| DELETE | `/users/bulk` | Xóa hàng loạt |

## Permissions
```
users.access        # Truy cập module users
users.create        # Tạo user
users.view          # Xem user
users.update        # Sửa user
users.delete        # Xóa user
users.import        # Import users
users.export        # Export users
users.manage-roles  # Quản lý roles của user
```

## Filters

| Filter | Options |
|--------|---------|
| Type | Tất cả / Đoàn viên / Hội viên / Cả hai / Không thuộc |
| Status | Tất cả / Hoạt động / Không hoạt động |

## Import Template

| Column | Mô tả | Bắt buộc |
|--------|-------|----------|
| code | Mã sinh viên | ✓ |
| email | Email | ✓ |
| familyName | Họ | ✓ |
| givenName | Tên | ✓ |
| isDoanVien | Là Đoàn viên (true/false) | |
| isHoiVien | Là Hội viên (true/false) | |

## Lưu ý kỹ thuật
- Sử dụng debounce cho search (300ms)
- Pagination mặc định 10 items/page
- Bulk delete giới hạn 100 items/lần
- Avatar được lưu trên S3
- Email phải thuộc domain @hcmut.edu.vn
