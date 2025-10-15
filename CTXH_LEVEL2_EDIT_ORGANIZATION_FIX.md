# CTXH Level 2 Organization Selection Enhancement

## Ngày: 14/10/2025

## Vấn đề
Khi user ở tổ chức Level 2 (Đoàn cơ sở/Liên chi hội/CLB khoa) chỉnh sửa hoạt động CTXH, dropdown tổ chức bị disable và chỉ hiển thị tên tổ chức Level 2, không cho phép chọn các tổ chức con (Level 3).

### Yêu cầu mới
User ở Level 2 cần có thể chọn:
- Tổ chức Level 2 hiện tại của họ
- Hoặc bất kỳ tổ chức con Level 3 nào (Chi đoàn/Chi hội) thuộc tổ chức Level 2 của họ

## Giải pháp

### 1. Backend Changes

#### File: `backend/src/organizations/organizations.service.ts`

**Phương thức**: `getCtxhActivityAccessibleOrganizations()`

**Thay đổi logic cho Level 2** (lines 985-1006):

```typescript
const hasLevel2Only = organizationsWithLevel.every(o => o.level === 2) &&
  organizationsWithLevel.length === 1;

if (hasLevel2Only) {
  // User has permission only on a single Level 2 organization
  // Return Level 2 org + all its Level 3 children for selection
  const level2Org = await this.organizationsRepository.findOne({
    where: { id: organizationsWithLevel[0].id },
    relations: ['parent']
  });

  console.log(`[OrganizationsService] User restricted to Level 2 org: ${level2Org.name} - including children`);

  // Get all descendants (Level 3 children)
  const descendants = await this.getAllDescendants(level2Org.id);
  const allOrgs = [level2Org, ...descendants];

  console.log(`[OrganizationsService] Level 2 accessible organizations: ${allOrgs.length} (Level 2 + ${descendants.length} children)`);

  return {
    organizations: allOrgs.sort((a, b) => a.name.localeCompare(b.name)),
    canSelectMultiple: true, // Changed: Allow selection from dropdown
    fixedOrganization: level2Org // Keep reference to parent Level 2 org
  };
}
```

**Thay đổi chính:**
1. **Trước**: `organizations: [fixedOrg]` - chỉ trả về 1 tổ chức Level 2
2. **Sau**: `organizations: [level2Org, ...descendants]` - trả về Level 2 + tất cả con Level 3
3. **Trước**: `canSelectMultiple: false` - disable dropdown
4. **Sau**: `canSelectMultiple: true` - enable dropdown để chọn
5. **Giữ nguyên**: `fixedOrganization: level2Org` - vẫn giữ reference để hiển thị hint message

### 2. Frontend Changes

#### File: `frontend/src/features/ctxh/components/ActivityForm.tsx`

**A. Xóa phần disable dropdown cho Level 2** (lines 742-768):

**TRƯỚC:**
```tsx
{organizationConstraints.fixedOrganization ? (
  // FIXED ORGANIZATION - Display only, no selection (Level 2)
  <div>
    <input type="text" value={organizationConstraints.fixedOrganization.name} disabled />
    <p className="mt-1 text-xs text-gray-500">
      {t('activity.form.organizationRestricted')}
    </p>
  </div>
) : activity && organizations.length === 0 ? (
  // Level 3 edit mode...
) : (
  // Normal combobox...
)}
```

**SAU:**
```tsx
{activity && organizations.length === 0 ? (
  // LEVEL 3 EDIT MODE - Display current organization (disabled, read-only)
  <div>
    <input type="text" value={(activity as any).organization?.name || ...} disabled />
    <p className="mt-1 text-xs text-gray-500">
      {t('activity.form.organizationLevel3Restricted')}
    </p>
  </div>
) : (
  // NORMAL COMBOBOX - User can select (including Level 2)
  <div className="relative">
    <input type="text" ... />
    {/* Dropdown with all accessible organizations */}
  </div>
)}
```

**B. Xóa auto-set organization khi create** (lines 395-401):

**TRƯỚC:**
```typescript
// If fixed organization (Level 2 restriction), auto-set it
if (response.fixedOrganization && !activity) {
  setFormData(prev => ({
    ...prev,
    organizationId: response.fixedOrganization!.id
  }));
}
```

**SAU:**
```typescript
// Removed - Let user choose from dropdown
```

**C. Thêm hint message cho Level 2** (after line 827):

```tsx
{/* Hint for Level 2 users */}
{organizationConstraints.fixedOrganization && organizations.length > 1 && (
  <p className="mt-1 text-xs text-gray-500">
    {t('activity.form.organizationLevel2Hint', { 
      org: organizationConstraints.fixedOrganization.name 
    })}
  </p>
)}
```

### 3. Translation Updates

#### File: `frontend/public/locales/vi/ctxh.json`

```json
{
  "activity": {
    "form": {
      "organizationLevel2Hint": "Bạn có thể chọn {{org}} hoặc các tổ chức con của nó",
      "organizationLevel3Restricted": "Tổ chức cấp Chi đoàn/Chi hội không thể thay đổi tổ chức khi chỉnh sửa hoạt động",
      "organizationNotAvailable": "Tổ chức không khả dụng"
    }
  }
}
```

#### File: `frontend/public/locales/en/ctxh.json`

```json
{
  "activity": {
    "form": {
      "organizationLevel2Hint": "You can select {{org}} or its sub-organizations",
      "organizationLevel3Restricted": "Level 3 organizations cannot change organization when editing activities",
      "organizationNotAvailable": "Organization not available"
    }
  }
}
```

## Kết quả

### Trước khi fix

**Level 2 User (Đoàn cơ sở ABC):**
- Backend trả về: `{ organizations: [ABC], canSelectMultiple: false, fixedOrganization: ABC }`
- Frontend hiển thị: Input disabled, chỉ hiện "Đoàn cơ sở ABC"
- ❌ Không thể chọn các Chi đoàn con

### Sau khi fix

**Level 2 User (Đoàn cơ sở ABC):**
- Backend trả về: 
  ```javascript
  { 
    organizations: [
      { id: 'abc', name: 'Đoàn cơ sở ABC' },
      { id: 'abc-1', name: 'Chi đoàn ABC-1' },
      { id: 'abc-2', name: 'Chi đoàn ABC-2' }
    ], 
    canSelectMultiple: true, 
    fixedOrganization: { id: 'abc', name: 'Đoàn cơ sở ABC' }
  }
  ```
- Frontend hiển thị: Dropdown cho phép chọn
- ✅ Có thể chọn "Đoàn cơ sở ABC" hoặc bất kỳ Chi đoàn nào
- 💡 Hint message: "Bạn có thể chọn Đoàn cơ sở ABC hoặc các tổ chức con của nó"

## Logic by User Level

| User Level | Create Mode | Edit Mode |
|-----------|-------------|-----------|
| **Super Admin** | Dropdown với TẤT CẢ tổ chức (15+) | Dropdown với TẤT CẢ tổ chức |
| **Level 1** (Đoàn trường) | Dropdown với tổ chức Level 1 + tất cả con | Dropdown với tổ chức Level 1 + tất cả con |
| **Level 2** (Đoàn cơ sở) | Dropdown với tổ chức Level 2 + các con Level 3 | Dropdown với tổ chức Level 2 + các con Level 3 |
| **Level 3** (Chi đoàn) | ❌ KHÔNG thể tạo (button ẩn) | Disabled, chỉ hiện tổ chức hiện tại |

## Testing

### Test Case 1: Level 2 Create Activity
1. Login với user Level 2 (Đoàn cơ sở)
2. Vào `/ctxh/activities` → Click "Tạo hoạt động mới"
3. **Expected**: 
   - Dropdown tổ chức mở được
   - Hiển thị tổ chức Level 2 + các Chi đoàn con
   - Hint: "Bạn có thể chọn [Tên Level 2] hoặc các tổ chức con của nó"

### Test Case 2: Level 2 Edit Activity
1. Login với user Level 2
2. Vào `/ctxh/activities` → Click "Chỉnh sửa" một hoạt động
3. **Expected**:
   - Dropdown tổ chức mở được
   - Hiển thị tổ chức Level 2 + các Chi đoàn con
   - Có thể thay đổi từ Level 2 sang Chi đoàn hoặc ngược lại
   - Hint message hiển thị đúng

### Test Case 3: Level 3 Edit Activity (Không đổi)
1. Login với user Level 3 (Chi đoàn)
2. Vào `/ctxh/activities` → Click "Chỉnh sửa" một hoạt động
3. **Expected**:
   - Input disabled, không mở được dropdown
   - Hiển thị tên tổ chức hiện tại
   - Message: "Tổ chức cấp Chi đoàn/Chi hội không thể thay đổi tổ chức khi chỉnh sửa hoạt động"

### Test Case 4: Super Admin (Không đổi)
1. Login với Super Admin
2. Create/Edit activity
3. **Expected**:
   - Dropdown bình thường với tất cả tổ chức
   - Không có hint message

## Database Impact

**KHÔNG CÓ** - Chỉ thay đổi API response và frontend logic.

## API Response Changes

### Before
```json
GET /api/organizations/ctxh-activity-accessible

// Level 2 user response:
{
  "organizations": [
    { "id": "abc", "name": "Đoàn cơ sở ABC" }
  ],
  "canSelectMultiple": false,
  "fixedOrganization": { "id": "abc", "name": "Đoàn cơ sở ABC" }
}
```

### After
```json
GET /api/organizations/ctxh-activity-accessible

// Level 2 user response:
{
  "organizations": [
    { "id": "abc", "name": "Đoàn cơ sở ABC" },
    { "id": "abc-1", "name": "Chi đoàn ABC-1" },
    { "id": "abc-2", "name": "Chi đoàn ABC-2" },
    { "id": "abc-3", "name": "Chi đoàn ABC-3" }
  ],
  "canSelectMultiple": true,
  "fixedOrganization": { "id": "abc", "name": "Đoàn cơ sở ABC" }
}
```

**Key Changes:**
- `organizations.length`: 1 → 1 + số lượng Chi đoàn con
- `canSelectMultiple`: `false` → `true`
- `fixedOrganization`: Giữ nguyên (dùng cho hint message)

## Benefits

1. **Tính linh hoạt**: Level 2 users có thể tạo hoạt động cho cả tổ chức của mình và các Chi đoàn con
2. **UX tốt hơn**: Không bị lock vào 1 tổ chức duy nhất
3. **Phân quyền rõ ràng**: Level 2 vẫn bị giới hạn trong phạm vi của mình (không thấy tổ chức khác)
4. **Backward compatible**: Không ảnh hưởng đến Super Admin, Level 1, Level 3 logic

## Notes

- Level 3 (Chi đoàn) vẫn **KHÔNG thể tạo** hoạt động mới (logic cũ giữ nguyên)
- Level 3 edit mode: Vẫn disable dropdown (logic cũ giữ nguyên)
- `fixedOrganization` giữ nguyên để:
  1. Phân biệt Level 2 với Super Admin/Level 1
  2. Hiển thị hint message
  3. Có thể dùng cho validation sau này (nếu cần)

## Related Files

```
backend/src/organizations/organizations.service.ts   (Modified)
frontend/src/features/ctxh/components/ActivityForm.tsx   (Modified)
frontend/public/locales/vi/ctxh.json   (Modified)
frontend/public/locales/en/ctxh.json   (Modified)
```

## Console Logs

```
[OrganizationsService] User restricted to Level 2 org: Đoàn cơ sở ABC - including children
[OrganizationsService] Level 2 accessible organizations: 4 (Level 2 + 3 children)
[ActivityForm] Loaded organizations: { count: 4, canSelectMultiple: true, fixed: 'Đoàn cơ sở ABC' }
```
