# Feature: Permissions (Quản lý vai trò & quyền)

## Tổng quan
Module quản lý hệ thống phân quyền RBAC (Role-Based Access Control), cho phép tạo và quản lý các vai trò với các quyền hạn cụ thể.

## Đường dẫn
```
frontend/src/features/permissions/
├── components/
│   ├── PageHeader.tsx             # Header với actions
│   ├── SearchFilters.tsx          # Thanh tìm kiếm & filter
│   ├── RolesTable.tsx             # Bảng danh sách roles
│   ├── Pagination.tsx             # Phân trang
│   ├── CreateRoleModal.tsx        # Modal tạo role
│   ├── ViewRoleModal.tsx          # Modal xem role
│   ├── EditRoleModal.tsx          # Modal chỉnh sửa role
│   ├── DeleteConfirmModal.tsx     # Xác nhận xóa
│   ├── BulkDeleteConfirmModal.tsx # Xác nhận xóa hàng loạt
│   └── PageStates.tsx             # Loading/Error states
├── hooks/
│   ├── usePermissionsPage.ts      # Hook chính cho page
│   ├── useRoleModals.ts           # Hook quản lý modals
│   ├── useSearchFilters.ts        # Hook tìm kiếm & filter
│   └── useBulkSelection.ts        # Hook bulk selection
├── pages/
│   └── PermissionsPage.tsx        # Trang quản lý quyền
├── services/
│   └── roleService.ts             # API service
├── types/
│   └── index.ts                   # Type definitions
└── utils/
    └── permissionGroups.ts        # Permission groups config
```

## Chức năng chính

### 1. Quản lý vai trò (Roles)
- Danh sách vai trò với pagination
- Tìm kiếm theo tên
- Lọc theo trạng thái (Active/Inactive)
- CRUD operations

### 2. Quản lý quyền (Permissions)
- Nhóm quyền theo module
- Gán quyền cho vai trò
- View permissions của role

### 3. Bulk Operations
- Chọn nhiều roles
- Xóa hàng loạt

## Types

```typescript
interface Role {
  id: string;
  name: string;
  description?: string;
  isActive: boolean;
  isSystem: boolean;
  organizationId?: string;
  permissions: Permission[];
  createdAt: string;
  updatedAt: string;
}

interface Permission {
  id: string;
  code: string;
  name: string;
  description?: string;
  module: string;
}

interface CreateRoleRequest {
  name: string;
  description?: string;
  isActive: boolean;
  permissionIds: string[];
  organizationId?: string;
}
```

## Permission Groups

```typescript
const PERMISSION_GROUPS = [
  {
    id: 'dashboard',
    name: 'Dashboard',
    icon: LayoutDashboard,
    color: 'blue',
  },
  {
    id: 'users',
    name: 'Quản lý người dùng',
    icon: Users,
    color: 'green',
  },
  {
    id: 'organizations',
    name: 'Quản lý tổ chức',
    icon: Building,
    color: 'purple',
  },
  {
    id: 'permissions',
    name: 'Phân quyền',
    icon: Shield,
    color: 'red',
  },
  {
    id: 'ctxh',
    name: 'CTXH',
    icon: Heart,
    color: 'pink',
  },
  // ... more groups
];
```

## Components

### PageHeader
- Tiêu đề "Quản lý vai trò"
- Nút tạo role mới
- Bulk delete button (khi có selection)

### SearchFilters
- Search input với debounce
- Status filter dropdown

### RolesTable
Columns:
- Checkbox (bulk select)
- Tên vai trò
- Mô tả
- Số quyền
- Trạng thái
- System role badge
- Actions (View/Edit/Delete)

### CreateRoleModal
Form fields:
- Tên vai trò *
- Mô tả
- Trạng thái (switch)
- Danh sách quyền (grouped)

### ViewRoleModal
- Thông tin cơ bản
- Danh sách quyền theo nhóm
- Metadata (created, updated)

## API Endpoints

| Method | Endpoint | Mô tả |
|--------|----------|-------|
| GET | `/roles` | Danh sách roles |
| GET | `/roles/:id` | Chi tiết role |
| POST | `/roles` | Tạo role |
| PATCH | `/roles/:id` | Cập nhật role |
| DELETE | `/roles/:id` | Xóa role |
| DELETE | `/roles/bulk` | Xóa hàng loạt |
| GET | `/permissions` | Danh sách permissions |
| POST | `/users/:id/roles` | Gán role cho user |

## Permissions
```
roles.access        # Truy cập module phân quyền
roles.create        # Tạo vai trò
roles.view          # Xem vai trò
roles.update        # Sửa vai trò
roles.delete        # Xóa vai trò
```

## Permission Codes Structure
```
module.action

Examples:
- dashboard.access
- users.create
- users.view
- users.update
- users.delete
- organizations.access
- ctxh.manage-activities
```

## UI Flow

### Tạo Role
```
1. Click "Tạo vai trò"
2. Nhập tên, mô tả
3. Chọn trạng thái
4. Chọn quyền từ danh sách nhóm
5. Submit -> API call
6. Success -> Refresh list + Toast
```

### Gán Role cho User
```
1. Vào Users -> Chọn user -> View
2. Tab "Vai trò & Quyền"
3. Click "Quản lý vai trò"
4. Check/Uncheck roles
5. Save -> API call
```

## Lưu ý kỹ thuật
- System roles không thể xóa hoặc sửa
- Debounce search 300ms
- Permission được nhóm theo module để dễ quản lý
- Hỗ trợ organization-scoped roles
- Super Admin có tất cả quyền
