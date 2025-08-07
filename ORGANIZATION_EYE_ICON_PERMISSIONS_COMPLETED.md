# ORGANIZATION EYE ICON PERMISSIONS - HOÀN THIỆN

## Tổng quan
Đã hoàn thiện cơ chế phân quyền cho icon con mắt (Eye) trong OrganizationTreeItem, bao gồm:
- Super Admin có quyền xem tất cả tổ chức
- User có quyền `organizations.access_children` có thể xem tổ chức con  
- User là thành viên của tổ chức có thể xem chi tiết tổ chức đó

## Logic Icon Con Mắt (Eye Icon)

### Điều kiện hiển thị `shouldShowDetailLink()`

```typescript
const shouldShowDetailLink = () => {
    // 1. Không hiển thị nếu organization này là parent organization trong trang hiện tại
    if (isCurrentParentOrganization()) {
        return false;
    }

    // 2. User là super admin (có thể xem tất cả tổ chức)
    if (permissions.isSuperAdmin) {
        return true;
    }

    // 3. User có quyền access_children (có thể xem tổ chức con)
    if (permissions.canAccessChildren) {
        return true;
    }

    // 4. User có trong user_organization của tổ chức này (là thành viên)
    if (isUserInOrganization(org.id)) {
        return true;
    }

    return false;
};
```

### Chi tiết từng điều kiện

#### 1. Super Admin
- **Kiểm tra**: `permissions.isSuperAdmin`
- **Logic**: `hasPermission('system.access_admin')` HOẶC `userRole.name === 'super_admin'`  
- **Quyền**: Có thể xem **TẤT CẢ** tổ chức
- **Tooltip**: "Xem chi tiết tổ chức (Quyền Super Admin)"

#### 2. Quyền Access Children
- **Kiểm tra**: `permissions.canAccessChildren` 
- **Logic**: `hasPermission('organizations.access_children', currentOrganizationId)`
- **Quyền**: Có thể xem các tổ chức con
- **Tooltip**: "Xem chi tiết tổ chức (Quyền truy cập tổ chức con)"

#### 3. Thành viên tổ chức
- **Kiểm tra**: `isUserInOrganization(org.id)`
- **Logic**: `user.organizations.some(userOrg => userOrg.organizationId === org.id && userOrg.isActive)`
- **Quyền**: Có thể xem tổ chức mà mình là thành viên
- **Tooltip**: "Xem chi tiết tổ chức (Bạn là thành viên)"

#### 4. Không hiển thị khi
- Organization là parent organization trong trang hiện tại
- User không thuộc 3 điều kiện trên

## Thay đổi trong code

### 1. `useOrganizationPagePermissions.ts`
```typescript
// Tree view permissions
const canShowEyeIcon = isSuperAdmin || canAccessChildren; // Base permission check
```

### 2. `OrganizationTreeItem.tsx`
- Thêm function `getEyeIconTooltip()` để tạo tooltip động
- Cập nhật `shouldShowDetailLink()` với logic rõ ràng hơn
- Thêm `title={getEyeIconTooltip()}` cho Eye icon
- Di chuyển `isUserInOrganization` lên trước debug log để tránh lỗi

### 3. Debug logging
```typescript
console.log(`🔐 Organization ${org.name} permissions:`, {
    canAddMember: permissions.canAddMember,
    canEdit: permissions.canEdit,
    canDelete: permissions.canDelete,
    canShowUsersIcon: permissions.canShowUsersIcon,
    canAccessChildren: permissions.canAccessChildren,
    isSuperAdmin: permissions.isSuperAdmin,
    hasAnyManagementAction: permissions.hasAnyManagementAction,
    currentUser: auth.user?.email,
    userRoles: auth.userRoles?.map(r => ({ name: r.name, orgId: r.organizationId })) || [],
    isMemberOfOrg: isUserInOrganization(org.id)
});
```

## Test Cases Đã Validate

✅ **Super Admin** - có thể xem tất cả tổ chức
✅ **User có quyền access_children** - có thể xem tổ chức con
✅ **Thành viên tổ chức** - có thể xem tổ chức mình tham gia  
✅ **User không có quyền** - không thể xem
✅ **Thành viên không active** - không thể xem

## UX/UI Improvements

### 1. Tooltip động
- Hiển thị lý do tại sao user có thể xem icon
- Giúp user hiểu rõ quyền hạn của mình

### 2. Debug logging chi tiết
- Log tất cả permissions liên quan
- Giúp debug và troubleshoot

### 3. Logic rõ ràng
- Code dễ hiểu, dễ maintain
- Comments đầy đủ giải thích từng điều kiện

## Permissions Required

### Organizations constants (đã có)
```typescript
export const ORGANIZATION_PERMISSIONS = {
    ACCESS: 'organizations.access',
    ACCESS_CHILDREN: 'organizations.access_children',
    ADD_MEMBER: 'organizations.add_member',
    REMOVE_MEMBER: 'organizations.remove_member',
    // ... other permissions
} as const;
```

### System constants (đã có)
```typescript
export const SYSTEM_PERMISSIONS = {
    ACCESS_ADMIN: 'system.access_admin',
    // ... other permissions
} as const;
```

## Status: ✅ HOÀN THÀNH

- ✅ Logic icon con mắt hoàn thiện
- ✅ Super admin có quyền xem tất cả
- ✅ User có quyền access_children 
- ✅ User là thành viên tổ chức
- ✅ Tooltip động hiển thị lý do
- ✅ Debug logging chi tiết
- ✅ Không còn lỗi TypeScript
- ✅ Test cases validate thành công
