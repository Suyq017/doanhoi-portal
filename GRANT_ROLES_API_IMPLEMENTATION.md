# Grant Roles API Implementation

## Tóm tắt

Đã tạo API mới để gán nhiều vai trò cho người dùng cùng lúc với hỗ trợ tổ chức.

## Backend Changes

### 1. DTO Mới (`grant-roles.dto.ts`)

```typescript
interface RoleAssignmentDto {
  roleIds: string[];           // Danh sách ID vai trò
  organizationIds?: string[];  // Danh sách ID tổ chức (optional)
  isGlobal?: boolean;         // Vai trò toàn hệ thống
}

interface GrantRolesDto {
  userId: string;                        // ID người dùng
  roleAssignments: RoleAssignmentDto[];  // Danh sách gán vai trò
}
```

### 2. Service Method (`roles.service.ts`)

```typescript
async grantRolesToUser(
  userId: string,
  roleAssignments: RoleAssignmentDto[]
): Promise<UserRole[]>
```

**Tính năng:**
- Xóa tất cả vai trò hiện tại của user trước khi gán mới
- Hỗ trợ gán nhiều vai trò cho nhiều tổ chức
- Hỗ trợ vai trò toàn hệ thống (global roles)
- Validation vai trò có tồn tại và active

### 3. Controller Endpoint (`roles.controller.ts`)

```
POST /roles/grant-roles
```

**Request Body:**
```json
{
  "userId": "user-123",
  "roleAssignments": [
    {
      "roleIds": ["role-1", "role-2"],
      "organizationIds": ["org-1", "org-2"],
      "isGlobal": false
    },
    {
      "roleIds": ["admin-role"],
      "organizationIds": [],
      "isGlobal": true
    }
  ]
}
```

## Frontend Changes

### 1. Service Method (`roleService.ts`)

```typescript
async grantRoles(data: GrantRolesRequest): Promise<void>
```

### 2. Hook Update (`useGrantRoles.ts`)

Cập nhật `submitGrantRoles` để:
- Sử dụng API mới `/roles/grant-roles`
- Chuyển đổi format dữ liệu phù hợp
- Xử lý nhiều vai trò và tổ chức

### 3. Modal Integration

Modal `GrantRolesModal` đã được kết nối với API mới thông qua hook `useGrantRoles`.

## Cách hoạt động

1. **User chọn người dùng** trong modal
2. **User thêm các role assignment** với vai trò và tổ chức
3. **User click "Grant Roles"**
4. **Frontend gọi API** `/roles/grant-roles` với dữ liệu formatted
5. **Backend xử lý:**
   - Xóa tất cả vai trò hiện tại của user
   - Tạo các UserRole records mới
   - Trả về kết quả
6. **Frontend hiển thị thông báo** thành công/lỗi

## API Examples

### Gán vai trò cho tổ chức cụ thể
```json
{
  "userId": "user-123",
  "roleAssignments": [
    {
      "roleIds": ["manager", "editor"],
      "organizationIds": ["org-1", "org-2"],
      "isGlobal": false
    }
  ]
}
```

### Gán vai trò toàn hệ thống
```json
{
  "userId": "user-123",
  "roleAssignments": [
    {
      "roleIds": ["super-admin"],
      "organizationIds": [],
      "isGlobal": true
    }
  ]
}
```

### Gán mix vai trò
```json
{
  "userId": "user-123",
  "roleAssignments": [
    {
      "roleIds": ["manager"],
      "organizationIds": ["org-1"],
      "isGlobal": false
    },
    {
      "roleIds": ["system-monitor"],
      "organizationIds": [],
      "isGlobal": true
    }
  ]
}
```

## Testing

Sử dụng script `test-grant-roles-api.js` để test API:

```javascript
// Trong browser console
await testGrantRolesAPI();
```

## Features

✅ **Multiple Roles**: Gán nhiều vai trò cùng lúc
✅ **Multiple Organizations**: Gán vai trò cho nhiều tổ chức
✅ **Global Roles**: Hỗ trợ vai trò toàn hệ thống
✅ **Validation**: Kiểm tra vai trò hợp lệ và active
✅ **Atomic Operation**: Xóa tất cả vai trò cũ trước khi gán mới
✅ **UI Integration**: Kết nối hoàn chỉnh với modal Grant Roles
✅ **Error Handling**: Xử lý lỗi đầy đủ
✅ **TypeScript Support**: Full type safety

## Next Steps

1. Test API với dữ liệu thực
2. Thêm authentication/authorization nếu cần
3. Thêm logging và monitoring
4. Cập nhật documentation cho team
