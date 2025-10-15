# 🔧 Fix CTXH Permission 403 Error

## ❌ Vấn đề
```
GET http://localhost:9200/ctxh/activities?page=1&limit=10 403 (Forbidden)
Error: Permission denied: ctxh_activity:read
```

## 🔍 Nguyên nhân
1. **Permission codes cũ**: Controller đang dùng `ctxh_activity:read`, `ctxh_activity:create`, etc.
2. **Permission codes mới trong DB**: `ctxh.activities.view`, `ctxh.activities.create`, etc.
3. **Token cũ**: JWT token của bạn được tạo trước khi permissions được cập nhật

## ✅ Giải pháp đã thực hiện

### 1. ✅ Cập nhật Permission Codes trong Controller
**File**: `backend/src/ctxh/activity/activities.controller.ts`

Đã thay thế tất cả permission codes:
```typescript
// CŨ → MỚI
'ctxh_activity:read'   → 'ctxh.activities.view'
'ctxh_activity:create' → 'ctxh.activities.create'
'ctxh_activity:update' → 'ctxh.activities.update'
'ctxh_activity:delete' → 'ctxh.activities.delete'
```

### 2. ✅ Verify Permissions trong Database
Đã chạy script: `npx ts-node scripts/create-and-assign-ctxh-permissions.ts`

**Kết quả**: Super Admin đã có đầy đủ 13 CTXH permissions:
- ✓ `ctxh.access`
- ✓ `ctxh.categories.view`
- ✓ `ctxh.categories.create`
- ✓ `ctxh.categories.update`
- ✓ `ctxh.categories.delete`
- ✓ `ctxh.activities.view` ← **Permission này cần thiết để đọc activities**
- ✓ `ctxh.activities.create`
- ✓ `ctxh.activities.update`
- ✓ `ctxh.activities.delete`
- ✓ `ctxh.activities.manage_participants`
- ✓ `ctxh.reports.view`
- ✓ `ctxh.reports.export`
- ✓ `ctxh.config.manage`

### 3. ✅ Import RolesModule vào ActivitiesModule
**File**: `backend/src/ctxh/activity/activities.module.ts`

Đã thêm:
```typescript
import { RolesModule } from '../../roles/roles.module';

@Module({
  imports: [
    // ... other imports
    RolesModule, // ← Cần thiết cho PermissionGuard
  ],
  // ...
})
```

## 🚀 Bước cuối cùng: LOGOUT VÀ LOGIN LẠI

**⚠️ QUAN TRỌNG**: JWT token của bạn được tạo **TRƯỚC KHI** permissions được cập nhật!

### Tại sao phải logout?
1. JWT token chứa thông tin user và permissions tại thời điểm login
2. Token cũ không có permissions mới (`ctxh.activities.view`)
3. Backend verify token và tìm permission `ctxh.activities.view` → không tìm thấy → 403 Forbidden

### Cách fix:
1. **Logout** khỏi hệ thống
2. **Login lại** với tài khoản super_admin
3. Token mới sẽ có đầy đủ permissions
4. Test lại: `GET /ctxh/activities` → ✅ 200 OK

## 🧪 Cách kiểm tra

### 1. Kiểm tra token hiện tại
Mở DevTools → Application/Storage → Local Storage → xem `token`

Copy token và decode tại: https://jwt.io/

**Tìm trong payload**:
```json
{
  "permissions": [
    // Nếu KHÔNG có "ctxh.activities.view" → Cần login lại
    // Nếu CÓ "ctxh.activities.view" → Token hợp lệ
  ]
}
```

### 2. Test API sau khi login lại
```bash
# Với token mới
GET http://localhost:9200/ctxh/activities?page=1&limit=10
Authorization: Bearer {new_token}

# Kết quả mong đợi: 200 OK
```

## 📋 Permission Mapping Summary

| Endpoint | Method | Permission Required | Status |
|----------|--------|-------------------|--------|
| `/ctxh/activities` | GET | `ctxh.activities.view` | ✅ Fixed |
| `/ctxh/activities` | POST | `ctxh.activities.create` | ✅ Fixed |
| `/ctxh/activities/:id` | GET | `ctxh.activities.view` | ✅ Fixed |
| `/ctxh/activities/:id` | PATCH | `ctxh.activities.update` | ✅ Fixed |
| `/ctxh/activities/:id` | DELETE | `ctxh.activities.delete` | ✅ Fixed |
| `/ctxh/activities/:id/participants` | GET | `ctxh.activities.view` | ✅ Fixed |
| `/ctxh/activities/:id/participants` | POST | `ctxh.activities.update` | ✅ Fixed |
| `/ctxh/activities/:id/participants/import` | POST | `ctxh.activities.update` | ✅ Fixed |

## 🎯 Checklist

- [x] Update permission codes trong controller
- [x] Verify permissions trong database
- [x] Import RolesModule vào ActivitiesModule
- [x] Restart backend server
- [ ] **LOGOUT** khỏi frontend
- [ ] **LOGIN LẠI** với tài khoản super_admin
- [ ] Test lại các API endpoints

## 🔧 Nếu vẫn gặp lỗi

### Option 1: Clear Browser Cache
1. Mở DevTools (F12)
2. Application → Storage → Clear Site Data
3. Refresh page và login lại

### Option 2: Verify Database
```sql
-- Kiểm tra super_admin có permissions chưa
SELECT 
  r.name as role_name, 
  p.code as permission_code
FROM roles r
JOIN role_permissions rp ON r.id = rp.role_id
JOIN permissions p ON rp.permission_id = p.id
WHERE r.name = 'super_admin' 
  AND p.code LIKE 'ctxh.%'
ORDER BY p.code;
```

### Option 3: Verify User Role
```sql
-- Kiểm tra user có role super_admin chưa
SELECT 
  u.email,
  r.name as role_name,
  ur.organization_id
FROM users u
JOIN user_roles ur ON u.id = ur.user_id
JOIN roles r ON ur.role_id = r.id
WHERE u.email = 'your_email@example.com';
```

## 📝 Notes

- **Super Admin**: Không bị giới hạn bởi organization, có access toàn bộ
- **Permission System**: Dựa trên role-based access control (RBAC)
- **JWT Token**: Chứa user info + permissions, có thời gian expire
- **PermissionGuard**: Kiểm tra permissions cho mỗi endpoint

---

**Status**: ✅ Code đã fix xong, cần logout + login lại để có token mới!

**Last Updated**: October 13, 2025
