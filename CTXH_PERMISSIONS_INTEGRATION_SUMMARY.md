# CTXH Permissions Integration - Summary

## ✅ Đã hoàn thành

Đã bổ sung đầy đủ 13 CTXH permissions vào **CreateRoleModal** và **EditRoleModal** để quản trị viên có thể phân quyền cho các chức năng quản lý Công tác xã hội.

---

## 📋 CTXH Permissions (13 quyền)

### 1. **ctxh.access** - Truy cập module CTXH
- **Mô tả**: Cho phép truy cập vào module quản lý công tác xã hội
- **Context**: organization
- **Sort Order**: 1

### 2. **ctxh.categories.view** - Xem danh mục CTXH
- **Mô tả**: Xem danh sách danh mục công tác xã hội
- **Context**: organization
- **Sort Order**: 2

### 3. **ctxh.categories.create** - Tạo danh mục CTXH
- **Mô tả**: Tạo danh mục công tác xã hội mới
- **Context**: organization
- **Sort Order**: 3

### 4. **ctxh.categories.update** - Cập nhật danh mục CTXH
- **Mô tả**: Chỉnh sửa thông tin danh mục công tác xã hội
- **Context**: organization
- **Sort Order**: 4

### 5. **ctxh.categories.delete** - Xóa danh mục CTXH
- **Mô tả**: Xóa danh mục công tác xã hội
- **Context**: organization
- **Sort Order**: 5

### 6. **ctxh.activities.view** - Xem hoạt động CTXH
- **Mô tả**: Xem danh sách hoạt động công tác xã hội
- **Context**: organization
- **Sort Order**: 6

### 7. **ctxh.activities.create** - Tạo hoạt động CTXH
- **Mô tả**: Tạo hoạt động công tác xã hội mới
- **Context**: organization
- **Sort Order**: 7

### 8. **ctxh.activities.update** - Cập nhật hoạt động CTXH
- **Mô tả**: Chỉnh sửa thông tin hoạt động công tác xã hội
- **Context**: organization
- **Sort Order**: 8

### 9. **ctxh.activities.delete** - Xóa hoạt động CTXH
- **Mô tả**: Xóa hoạt động công tác xã hội
- **Context**: organization
- **Sort Order**: 9

### 10. **ctxh.activities.manage_participants** - Quản lý người tham gia
- **Mô tả**: Quản lý người tham gia hoạt động công tác xã hội
- **Context**: organization
- **Sort Order**: 10

### 11. **ctxh.reports.view** - Xem báo cáo CTXH
- **Mô tả**: Xem báo cáo công tác xã hội
- **Context**: organization
- **Sort Order**: 11

### 12. **ctxh.reports.export** - Xuất báo cáo CTXH
- **Mô tả**: Xuất dữ liệu báo cáo công tác xã hội
- **Context**: organization
- **Sort Order**: 12

### 13. **ctxh.config.manage** - Quản lý cấu hình CTXH
- **Mô tả**: Quản lý cấu hình hệ thống công tác xã hội
- **Context**: organization
- **Sort Order**: 13

---

## 🔧 Các thay đổi đã thực hiện

### 1. **CreateRoleModal.tsx**

#### a. Import thêm icon `Heart`
```typescript
import { Heart } from 'lucide-react';
```

#### b. Thêm CTXH vào Permission Groups
```typescript
{
  id: 'ctxh',
  name: t('permissions.categories.ctxh'),
  icon: Heart,
  color: 'pink',
  description: t('permissions.categories.ctxh')
}
```

#### c. Thêm 13 CTXH permissions vào mock data
```typescript
// CTXH permissions
{ id: '51', code: 'ctxh.access', name: 'Truy cập module quản lý CTXH', category: 'ctxh', ... },
{ id: '52', code: 'ctxh.categories.view', name: 'Xem danh mục CTXH', category: 'ctxh', ... },
// ... 11 permissions khác
```

#### d. Thêm color class `pink`
```typescript
case 'pink':
  return {
    bg: 'bg-pink-50 dark:bg-pink-900/20',
    border: 'border-pink-200 dark:border-pink-800',
    text: 'text-pink-700 dark:text-pink-300',
    icon: 'text-pink-500 dark:text-pink-400'
  };
```

---

### 2. **EditRoleModal.tsx**

#### a. Import thêm icon `Heart`
```typescript
import { Heart } from 'lucide-react';
```

#### b. Thêm CTXH vào Permission Groups
```typescript
{
  id: 'ctxh',
  name: t('permissions.categories.ctxh'),
  icon: Heart,
  color: 'pink',
  description: t('permissions.categories.ctxh')
}
```

#### c. Thêm 13 CTXH permissions vào mock data
```typescript
// CTXH permissions
{ id: '51', code: 'ctxh.access', name: 'Truy cập module quản lý CTXH', category: 'ctxh', ... },
{ id: '52', code: 'ctxh.categories.view', name: 'Xem danh mục CTXH', category: 'ctxh', ... },
// ... 11 permissions khác
```

#### d. Thêm color class `pink`
```typescript
case 'pink':
  return {
    bg: 'bg-pink-50 dark:bg-pink-900/20',
    border: 'border-pink-200 dark:border-pink-800',
    text: 'text-pink-700 dark:text-pink-300',
    icon: 'text-pink-500 dark:text-pink-400'
  };
```

---

### 3. **Translation Files**

#### a. Vietnamese (`vi/permissions.json`)
```json
"categories": {
  "ctxh": "Quản lý Công tác xã hội",
  "ctxhShort": "CTXH"
}
```

#### b. English (`en/permissions.json`)
```json
"categories": {
  "ctxh": "Community Service Management",
  "ctxhShort": "CTXH"
}
```

---

## 🎨 UI Design

### Icon & Color
- **Icon**: `Heart` (❤️) - Biểu tượng trái tim thể hiện tinh thần công tác xã hội
- **Color**: `pink` - Màu hồng nhẹ nhàng, phù hợp với công tác xã hội

### Permission Group Display
```
┌─────────────────────────────────────────────────────┐
│ ❤️  Quản lý Công tác xã hội              [3/13]    │
│     Quản lý các hoạt động công tác xã hội           │
│                                                      │
│     [ ] Truy cập module quản lý CTXH (ctxh.access) │
│     ├─ [ ] Xem danh mục CTXH                        │
│     ├─ [ ] Tạo danh mục CTXH                        │
│     ├─ [ ] Cập nhật danh mục CTXH                   │
│     └─ [ ] ...                                      │
└─────────────────────────────────────────────────────┘
```

---

## 📊 Permission Structure

### Category Hierarchy
```
ctxh (Công tác xã hội)
├── access (Truy cập cơ bản)
├── categories (Danh mục)
│   ├── view
│   ├── create
│   ├── update
│   └── delete
├── activities (Hoạt động)
│   ├── view
│   ├── create
│   ├── update
│   ├── delete
│   └── manage_participants
├── reports (Báo cáo)
│   ├── view
│   └── export
└── config (Cấu hình)
    └── manage
```

---

## 🔒 Permission Logic

### Access Permission Dependency
- Khi chọn bất kỳ permission nào trong nhóm CTXH (ngoài `ctxh.access`), hệ thống **tự động** chọn `ctxh.access`
- Khi bỏ chọn `ctxh.access`, hệ thống hiển thị confirm dialog và **tự động** bỏ tất cả permissions khác trong nhóm CTXH

### Example Flow
```
User selects: ctxh.activities.create
  → System auto-selects: ctxh.access ✓

User deselects: ctxh.access
  → System shows: "Bỏ quyền truy cập sẽ tự động bỏ tất cả quyền khác..."
  → User confirms
  → System deselects: ALL ctxh permissions
```

---

## 🧪 Testing Checklist

### CreateRoleModal
- [ ] CTXH permission group hiển thị với icon Heart và màu pink
- [ ] Expand/collapse group hoạt động bình thường
- [ ] Select All / Deselect All hoạt động đúng
- [ ] Auto-select `ctxh.access` khi chọn permission khác
- [ ] Confirm dialog xuất hiện khi bỏ `ctxh.access`
- [ ] Summary hiển thị đúng số permissions đã chọn
- [ ] Tạo role mới với CTXH permissions thành công

### EditRoleModal
- [ ] CTXH permissions hiển thị đúng khi edit role có sẵn
- [ ] Có thể thêm/bớt CTXH permissions
- [ ] Permission dependencies hoạt động đúng
- [ ] Lưu thay đổi thành công

### Translations
- [ ] Hiển thị đúng tiếng Việt: "Quản lý Công tác xã hội"
- [ ] Hiển thị đúng tiếng Anh: "Community Service Management"
- [ ] Chuyển đổi ngôn ngữ hoạt động mượt mà

---

## 📁 Files Modified

1. ✅ `frontend/src/features/permissions/components/CreateRoleModal.tsx`
2. ✅ `frontend/src/features/permissions/components/EditRoleModal.tsx`
3. ✅ `frontend/public/locales/vi/permissions.json`
4. ✅ `frontend/public/locales/en/permissions.json`

---

## 🚀 Next Steps

1. **Backend Integration**: Đảm bảo backend API `/permissions` trả về đầy đủ 13 CTXH permissions
2. **Database Migration**: Chạy script `create-and-assign-ctxh-permissions.ts` nếu chưa có permissions trong DB
3. **Testing**: Test thoroughly với các scenarios khác nhau
4. **Documentation**: Cập nhật user guide về CTXH permissions

---

## 📝 Notes

- **Permission IDs**: Sử dụng IDs từ 51-63 cho CTXH permissions trong mock data
- **Context**: Tất cả CTXH permissions đều có `context: 'organization'` (không phải system-level)
- **Sort Order**: Đánh số từ 1-13 theo thứ tự logic (access → categories → activities → reports → config)
- **Naming Convention**: Follow pattern `ctxh.{resource}.{action}`

---

**Status**: ✅ **COMPLETED**  
**Date**: October 13, 2025  
**Modified Files**: 4  
**New Permissions Added**: 13  
**Testing Required**: Yes
