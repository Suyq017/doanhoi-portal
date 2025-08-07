# Hướng dẫn Debug Menu Quản lý Đóng phí không hiển thị

## 🔍 Bước kiểm tra

### 1. Mở Browser Console
- F12 hoặc Ctrl+Shift+I
- Vào tab Console
- Reload trang để xem debug logs

### 2. Kiểm tra Debug Logs
Sau khi reload, sẽ thấy các logs như:
```
🔍 Navigation Debug Info:
- isAuthenticated: true/false
- permissionsLoading: true/false
- currentOrganizationId: "xxx" hoặc null
- userRoles: [...]
- userPermissions: [...]
- hasPaymentAccess (payment-campaigns.access): true/false
- canAccessPaymentCampaigns(): true/false

🔒 Quản lý đóng phí (payment-campaigns.access): true/false
📋 Final filtered navigation: [...]
```

### 3. Các trường hợp có thể xảy ra

#### ❌ Case 1: `isAuthenticated: false`
**Nguyên nhân**: User chưa đăng nhập hoặc token hết hạn
**Giải pháp**: Đăng nhập lại

#### ⏳ Case 2: `permissionsLoading: true` 
**Nguyên nhân**: Permissions đang load từ server
**Giải pháp**: Chờ vài giây, nếu vẫn loading thì có lỗi API

#### 🔒 Case 3: `hasPaymentAccess: false`
**Nguyên nhân**: User không có permission `payment-campaigns.access`

**Cần kiểm tra**:
1. **User có role nào?**
   ```sql
   SELECT u.email, r.name as role_name 
   FROM users u 
   JOIN user_roles ur ON u.id = ur.user_id 
   JOIN roles r ON ur.role_id = r.id 
   WHERE u.email = 'your-email@domain.com';
   ```

2. **Role có payment permissions không?**
   ```sql
   SELECT r.name, p.code 
   FROM roles r 
   JOIN role_permissions rp ON r.id = rp.role_id 
   JOIN permissions p ON rp.permission_id = p.id 
   WHERE p.code LIKE 'payment-campaigns.%';
   ```

3. **User có user_role assignment cho organization nào không?**
   ```sql
   SELECT ur.*, o.name as org_name 
   FROM user_roles ur 
   JOIN organizations o ON ur.organization_id = o.id 
   WHERE ur.user_id = (SELECT id FROM users WHERE email = 'your-email@domain.com');
   ```

#### 🌐 Case 4: `currentOrganizationId: null`
**Nguyên nhân**: User không có organization context
**Giải pháp**: 
- Check xem user có user_role assignments không
- Có thể cần set default organization

### 4. Quick Fixes

#### Option 1: Tạm thời bỏ permission check
Trong `Layout.tsx`, tạm comment dòng:
```tsx
// requiredPermission: 'payment-campaigns.access'
```

#### Option 2: Force show menu for testing
Thêm vào `getFilteredNavigation()`:
```tsx
// Temporary: always show payment menu for testing
baseNavigation.find(item => item.name === t('navigation.paymentAdmin')).requiredPermission = undefined;
```

#### Option 3: Kiểm tra user có super_admin role không
```javascript
// Trong console:
permissions.isSuperAdmin()
```

### 5. Database Quick Check

#### Kiểm tra permissions đã được seed chưa:
```sql
SELECT * FROM permissions WHERE code LIKE 'payment-campaigns.%';
```

#### Kiểm tra roles có permissions chưa:
```sql
SELECT r.name, COUNT(p.id) as permission_count
FROM roles r 
LEFT JOIN role_permissions rp ON r.id = rp.role_id 
LEFT JOIN permissions p ON rp.permission_id = p.id AND p.code LIKE 'payment-campaigns.%'
GROUP BY r.id, r.name;
```

#### Kiểm tra user hiện tại:
```sql
-- Thay 'your-email' bằng email thật
SELECT 
    u.email,
    r.name as role_name,
    o.name as organization_name,
    p.code as permission_code
FROM users u
JOIN user_roles ur ON u.id = ur.user_id
JOIN roles r ON ur.role_id = r.id  
LEFT JOIN organizations o ON ur.organization_id = o.id
LEFT JOIN role_permissions rp ON r.id = rp.role_id
LEFT JOIN permissions p ON rp.permission_id = p.id
WHERE u.email = 'your-email@domain.com'
    AND (p.code LIKE 'payment-campaigns.%' OR p.code IS NULL);
```

### 6. Chạy Script Debug

Copy script từ `debug-payment-permissions.js` vào console và chạy:
```javascript
debugPaymentPermissions()
```

## 🛠️ Các bước sửa lỗi phổ biến

### 1. User chưa có role
```sql
-- Gán role admin cho user
INSERT INTO user_roles (user_id, role_id, organization_id) 
VALUES (
    (SELECT id FROM users WHERE email = 'your-email@domain.com'),
    (SELECT id FROM roles WHERE name = 'admin'),
    (SELECT id FROM organizations WHERE name = 'ROOT' LIMIT 1)
);
```

### 2. Role chưa có payments permissions
```sql
-- Thêm payment permissions cho role
INSERT INTO role_permissions (role_id, permission_id)
SELECT 
    (SELECT id FROM roles WHERE name = 'your-role-name'),
    p.id
FROM permissions p 
WHERE p.code LIKE 'payment-campaigns.%';
```

### 3. Re-seed database
```bash
# Windows PowerShell
.\backend\scripts\seed-database.ps1

# hoặc Node.js
node backend/scripts/seed-database.js
```

## ✅ Validation

Menu "Quản lý đóng phí" sẽ xuất hiện khi:
- ✅ User đã đăng nhập (`isAuthenticated: true`)
- ✅ Permissions đã load xong (`permissionsLoading: false`) 
- ✅ User có permission `payment-campaigns.access`
- ✅ User có organization context (cho non-super-admin users)

---

**Lưu ý**: Sau khi sửa database, cần logout và login lại để refresh user permissions trong frontend.
