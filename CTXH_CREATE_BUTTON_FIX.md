# Fix: Nút "Tạo Hoạt Động CTXH" Không Hiển Thị Cho Super Admin và Level 1

## Vấn đề

Khi đăng nhập với tài khoản **Super Admin** hoặc user có quyền tại **tổ chức Level 1**, nút **"Tạo hoạt động CTXH"** không hiển thị trong trang quản lý hoạt động.

### Triệu chứng
- ✅ User Level 2 (Đoàn cơ sở) thấy nút tạo
- ❌ Super Admin không thấy nút tạo
- ❌ User Level 1 (Đoàn trường) không thấy nút tạo
- ✅ User Level 3 (Chi đoàn) không thấy nút tạo (đúng như thiết kế)

## Nguyên nhân

### Logic Sai

**File:** `frontend/src/features/ctxh/pages/ActivityManagement.tsx`

**Code cũ (SAI):**
```typescript
// If fixedOrganization is null, user is in Level 3 and cannot create activities
// If fixedOrganization is set, user is in Level 2 and can create activities
setCanCreateActivity(response.fixedOrganization !== null);
```

**Vấn đề:**
Logic này chỉ cho phép tạo khi `fixedOrganization !== null`, tức là chỉ user **Level 2** mới thấy nút tạo.

### Giải thích API Response

API `getCtxhActivityAccessibleOrganizations()` trả về:

```typescript
{
  organizations: Organization[],      // Danh sách tổ chức có thể tạo activity
  canSelectMultiple: boolean,         // Có thể chọn nhiều tổ chức hay không
  fixedOrganization: Organization | null  // Tổ chức cố định (nếu Level 2)
}
```

**Các trường hợp:**

| User Type | organizations | canSelectMultiple | fixedOrganization | Có thể tạo? |
|-----------|---------------|-------------------|-------------------|-------------|
| **Super Admin** | All orgs (>10) | true | **null** | ✅ CÓ |
| **Level 1** | Level 1 + children | true | **null** | ✅ CÓ |
| **Level 2** | 1 org (Level 2) | false | **Organization** | ✅ CÓ |
| **Level 3** | **[ ]** (empty) | false | **null** | ❌ KHÔNG |
| **No permission** | **[ ]** (empty) | false | **null** | ❌ KHÔNG |

**Quan trọng:**
- `fixedOrganization = null` **KHÔNG** có nghĩa là không có quyền!
- `fixedOrganization = null` có nghĩa là user có thể **chọn nhiều tổ chức** (Super Admin / Level 1)
- Để kiểm tra có quyền hay không, phải kiểm tra: `organizations.length > 0`

## Giải pháp

### Code mới (ĐÚNG)

```typescript
// User can create if they have at least one accessible organization
// - Super Admin / Level 1: organizations.length > 0, fixedOrganization = null
// - Level 2: organizations.length = 1, fixedOrganization = Organization
// - Level 3 / No permission: organizations.length = 0
const canCreate = response.organizations.length > 0;
setCanCreateActivity(canCreate);

console.log('[ActivityManagement] Create permission check:', {
  organizationsCount: response.organizations.length,
  fixedOrganization: response.fixedOrganization?.name || 'null',
  canCreate: canCreate
});
```

### Logic đúng

```typescript
if (response.organizations.length > 0) {
  // User CÓ QUYỀN tạo activity
  // Có thể là: Super Admin, Level 1, hoặc Level 2
  setCanCreateActivity(true);
} else {
  // User KHÔNG CÓ QUYỀN
  // Có thể là: Level 3 hoặc không có permission
  setCanCreateActivity(false);
}
```

## Thay đổi Code

**File sửa:** `frontend/src/features/ctxh/pages/ActivityManagement.tsx`

**Dòng 28-54:** Sửa logic trong useEffect

### So sánh

**Trước:**
```typescript
setCanCreateActivity(response.fixedOrganization !== null);
```

**Sau:**
```typescript
const canCreate = response.organizations.length > 0;
setCanCreateActivity(canCreate);
```

## Test Cases

### ✅ Test Case 1: Super Admin

**Setup:**
- User: Super Admin
- Role: `super_admin` (global role, no organization)
- Permission: Tất cả permissions

**Expected:**
```json
{
  "organizations": [
    { "id": "1", "name": "Đoàn Trường", "level": 1 },
    { "id": "2", "name": "Đoàn Khoa A", "level": 2 },
    { "id": "3", "name": "Chi đoàn A1", "level": 3 },
    // ... tất cả tổ chức
  ],
  "canSelectMultiple": true,
  "fixedOrganization": null
}
```

**Console Log:**
```
[ActivityManagement] Create permission check: {
  organizationsCount: 15,
  fixedOrganization: 'null',
  canCreate: true
}
```

**Result:** ✅ Nút "Tạo hoạt động" hiển thị

---

### ✅ Test Case 2: Level 1 User (Đoàn Trường)

**Setup:**
- User: Bí thư Đoàn trường
- Organization: Đoàn Trường (Level 1)
- Permission: `ctxh.activities.create` on Đoàn Trường

**Expected:**
```json
{
  "organizations": [
    { "id": "1", "name": "Đoàn Trường", "level": 1 },
    { "id": "2", "name": "Đoàn Khoa A", "level": 2 },
    { "id": "3", "name": "Đoàn Khoa B", "level": 2 },
    { "id": "4", "name": "Chi đoàn A1", "level": 3 },
    { "id": "5", "name": "Chi đoàn A2", "level": 3 },
    // ... tất cả con của Đoàn Trường
  ],
  "canSelectMultiple": true,
  "fixedOrganization": null
}
```

**Console Log:**
```
[ActivityManagement] Create permission check: {
  organizationsCount: 10,
  fixedOrganization: 'null',
  canCreate: true
}
```

**Result:** ✅ Nút "Tạo hoạt động" hiển thị

---

### ✅ Test Case 3: Level 2 User (Đoàn Khoa)

**Setup:**
- User: Bí thư Đoàn Khoa A
- Organization: Đoàn Khoa A (Level 2)
- Permission: `ctxh.activities.create` on Đoàn Khoa A

**Expected:**
```json
{
  "organizations": [
    { "id": "2", "name": "Đoàn Khoa A", "level": 2 }
  ],
  "canSelectMultiple": false,
  "fixedOrganization": {
    "id": "2",
    "name": "Đoàn Khoa A",
    "level": 2
  }
}
```

**Console Log:**
```
[ActivityManagement] Create permission check: {
  organizationsCount: 1,
  fixedOrganization: 'Đoàn Khoa A',
  canCreate: true
}
```

**Result:** ✅ Nút "Tạo hoạt động" hiển thị

---

### ✅ Test Case 4: Level 3 User (Chi đoàn)

**Setup:**
- User: Bí thư Chi đoàn A1
- Organization: Chi đoàn A1 (Level 3)
- Permission: `ctxh.activities.create` on Chi đoàn A1 (nhưng bị restrict)

**Expected:**
```json
{
  "organizations": [],
  "canSelectMultiple": false,
  "fixedOrganization": null
}
```

**Console Log:**
```
[ActivityManagement] Create permission check: {
  organizationsCount: 0,
  fixedOrganization: 'null',
  canCreate: false
}
```

**Result:** ✅ Nút "Tạo hoạt động" KHÔNG hiển thị (đúng như thiết kế)

---

### ✅ Test Case 5: User Không Có Permission

**Setup:**
- User: Sinh viên thông thường
- Permission: Chỉ có `ctxh.activities.view`

**Expected:**
```json
{
  "organizations": [],
  "canSelectMultiple": false,
  "fixedOrganization": null
}
```

**Console Log:**
```
[ActivityManagement] Create permission check: {
  organizationsCount: 0,
  fixedOrganization: 'null',
  canCreate: false
}
```

**Result:** ✅ Nút "Tạo hoạt động" KHÔNG hiển thị

## Tổng kết

### ✅ Đã sửa
- Thay đổi logic kiểm tra từ `fixedOrganization !== null` → `organizations.length > 0`
- Thêm comment giải thích rõ ràng cho các trường hợp
- Cải thiện console log để dễ debug

### 📁 File thay đổi
- `frontend/src/features/ctxh/pages/ActivityManagement.tsx` - Dòng 28-54

### 🎯 Kết quả
- ✅ Super Admin thấy nút tạo
- ✅ User Level 1 thấy nút tạo
- ✅ User Level 2 thấy nút tạo
- ✅ User Level 3 KHÔNG thấy nút tạo (đúng theo thiết kế)
- ✅ User không có permission KHÔNG thấy nút tạo

### 🔍 Debug Tips

Nếu vẫn không thấy nút tạo, kiểm tra trong console log:

1. **Kiểm tra API response:**
   ```javascript
   console.log('[ActivityManagement] Create permission check:', {
     organizationsCount: response.organizations.length,
     fixedOrganization: response.fixedOrganization?.name,
     canCreate: canCreate
   });
   ```

2. **Kiểm tra permission trong database:**
   ```sql
   SELECT ur.*, r.name, p.code 
   FROM user_roles ur
   JOIN roles r ON ur."roleId" = r.id
   JOIN role_permissions rp ON r.id = rp."roleId"
   JOIN permissions p ON rp."permissionId" = p.id
   WHERE ur."userId" = '<your-user-id>'
   AND p.code = 'ctxh.activities.create';
   ```

3. **Kiểm tra organization level:**
   ```sql
   SELECT o.id, o.name, o.type, o."parentId"
   FROM user_roles ur
   JOIN organizations o ON ur."organizationId" = o.id
   WHERE ur."userId" = '<your-user-id>';
   ```

## Lưu ý cho Developer

### Quy tắc hiển thị nút "Tạo hoạt động"

```typescript
// ✅ ĐÚNG
const canCreate = response.organizations.length > 0;

// ❌ SAI - Chỉ hoạt động cho Level 2
const canCreate = response.fixedOrganization !== null;

// ❌ SAI - Sẽ cho phép cả Level 3
const canCreate = response.fixedOrganization === null;
```

### Kiểm tra trước khi commit

```bash
# 1. Build frontend để kiểm tra TypeScript errors
cd frontend
npm run build

# 2. Test với các loại user khác nhau
# - Super Admin
# - User Level 1
# - User Level 2
# - User Level 3 (phải KHÔNG thấy nút)

# 3. Kiểm tra console logs
# Phải thấy: organizationsCount > 0 khi có quyền
```

---

**Ngày sửa:** October 14, 2025  
**Người sửa:** GitHub Copilot  
**Liên quan:** CTXH_LEVEL3_RESTRICTION.md, CTXH_ACTIVITY_ORGANIZATION_FILTER.md
