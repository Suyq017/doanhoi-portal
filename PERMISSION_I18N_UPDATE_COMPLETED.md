# Permission Translation Update Summary

## Hoàn thành cập nhật đa ngôn ngữ cho permissions trong EditRoleModal

### ✅ Đã thực hiện:

1. **Cập nhật file translation**:

   - `frontend/public/locales/vi/permissions.json`: Bổ sung các permission còn thiếu
   - `frontend/public/locales/en/permissions.json`: Bổ sung các permission còn thiếu

2. **Tạo utility function**:

   - `frontend/src/utils/permissionNameMapper.ts`: Hook và utility functions để map permission codes thành translated names

3. **Cập nhật EditRoleModal.tsx**:
   - Import và sử dụng `usePermissionNameMapper` hook
   - Thay thế tất cả hardcoded permission names bằng `getPermissionName(code)`
   - Sửa hardcode description trong permission groups

### 🎯 Kết quả:

#### Trước khi cập nhật:

```typescript
// Hardcode
name: "Truy cập bảng điều khiển";
name: "Tạo người dùng mới";
// ...
```

#### Sau khi cập nhật:

```typescript
// Sử dụng translation
name: getPermissionName("dashboard.access");
name: getPermissionName("users.create");
// ...
```

### 📊 Thống kê cập nhật:

| Category      | Số permissions | Trước (Hardcode) | Sau (Translation) |
| ------------- | -------------- | ---------------- | ----------------- |
| Dashboard     | 1              | ❌ Hardcode      | ✅ Translation    |
| Users         | 6              | ❌ Hardcode      | ✅ Translation    |
| Organizations | 6              | ❌ Hardcode      | ✅ Translation    |
| Departments   | 5              | ❌ Hardcode      | ✅ Translation    |
| Classes       | 5              | ❌ Hardcode      | ✅ Translation    |
| Payments      | 8              | ❌ Hardcode      | ✅ Translation    |
| My Payments   | 4              | ❌ Hardcode      | ✅ Translation    |
| Permissions   | 5              | ❌ Hardcode      | ✅ Translation    |
| **TOTAL**     | **40**         | **❌**           | **✅**            |

### 🌍 Hỗ trợ ngôn ngữ:

- ✅ Tiếng Việt (vi)
- ✅ Tiếng Anh (en)

### 🔧 Cách sử dụng:

1. **Trong component**: Sử dụng hook `usePermissionNameMapper()`
2. **Thêm permission mới**: Chỉ cần thêm vào file translation, không cần sửa code
3. **Đổi ngôn ngữ**: Tự động thay đổi theo ngôn ngữ hiện tại của ứng dụng

### 📝 Ví dụ thêm permission mới:

#### 1. Thêm vào file translation:

```json
// vi/permissions.json
"permissions.definitions": {
  "new-feature.access": "Truy cập tính năng mới"
}

// en/permissions.json
"permissions.definitions": {
  "new-feature.access": "Access new feature"
}
```

#### 2. Sử dụng trong code:

```typescript
const { getPermissionName } = usePermissionNameMapper();
name: getPermissionName("new-feature.access");
```

### 🎉 Lợi ích:

- ✅ Dễ bảo trì và mở rộng
- ✅ Tự động hỗ trợ đa ngôn ngữ
- ✅ Không cần hardcode
- ✅ Centralized translation management
- ✅ Fallback tự động nếu translation không tồn tại
