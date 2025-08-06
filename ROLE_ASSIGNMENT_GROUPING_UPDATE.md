# Role Assignment Grouping Update

## Mô tả thay đổi

Đã cập nhật logic phần "Gán vai trò và tổ chức" trong EditUserModal để group theo vai trò thay vì theo cặp 1-1:

### Trước đây:
- Mỗi hàng hiển thị: [Nhiều vai trò] -> [1 tổ chức]
- Logic group theo tổ chức
- Có thể có nhiều vai trò trong 1 hàng

### Bây giờ:
- Mỗi hàng hiển thị: [1 vai trò] -> [Nhiều tổ chức]
- Logic group theo vai trò
- Mỗi hàng chỉ có 1 vai trò, nhưng có thể có nhiều tổ chức

## Files đã thay đổi

### 1. EditUserModal.tsx
- **convertUserRolesToAssignments()**: Thay đổi logic group từ theo tổ chức sang theo vai trò
- Xử lý trường hợp 1 vai trò vừa có global assignment và specific organization assignment
- Tạo separate assignments cho global và specific organizations

### 2. RolesOrganizationRow.tsx  
- **handleRoleChange()**: Giới hạn chỉ cho phép chọn 1 role
- Cập nhật label: "Vai trò (chọn 1)"
- Thêm comments giải thích logic mới

### 3. MultiSelectRoleCombobox.tsx
- **handleRoleToggle()**: Chỉ cho phép chọn 1 role tại 1 thời điểm
- Tự động đóng dropdown sau khi chọn role
- Khi chọn role mới, thay thế role cũ thay vì thêm vào

### 4. RolesOrganizationManager.tsx
- Cập nhật button text: "Thêm vai trò khác"
- Thêm comments giải thích logic mới
- Cập nhật interface comments

## Behavior mới

### Khi load user data:
1. Lấy tất cả userRoles của user
2. Group theo roleId 
3. Với mỗi role:
   - Nếu có global assignment → tạo 1 assignment row với isGlobal=true
   - Nếu có specific organization assignments → tạo 1 assignment row với list organizations
   - Nếu có cả global và specific → tạo 2 separate rows

### Khi user interaction:
1. **Chọn role**: Chỉ cho phép chọn 1 role per row, replace nếu chọn role khác
2. **Chọn organization**: Cho phép chọn nhiều organizations cho role đó
3. **Thêm row**: Tạo row mới để gán role khác
4. **Global assignment**: Để trống organizations để gán toàn hệ thống

### Khi save:
1. Validate: mỗi assignment phải có ít nhất 1 role
2. Clean payload: remove frontend properties
3. Gửi API với format: `{ roleIds: [singleRoleId], organizationIds: [], isGlobal: boolean }`

## Ví dụ

### User có assignments:
- super_admin role → global (toàn hệ thống)  
- manager role → [org1, org2, org3]
- admin role → [org4]

### Sẽ hiển thị:
```
Row 1: [super_admin] → [Toàn hệ thống - để trống]
Row 2: [manager] → [org1, org2, org3] 
Row 3: [admin] → [org4]
```

### Thay vì trước đây:
```
Row 1: [super_admin] → [global]
Row 2: [manager] → [org1] 
Row 3: [manager] → [org2]
Row 4: [manager] → [org3]
Row 5: [admin] → [org4]
```

## Testing

Để test các thay đổi:

1. **Load user có nhiều role assignments**
   - Kiểm tra xem có group đúng theo role không
   - Mỗi role chỉ xuất hiện 1 lần
   - Organizations được group đúng cho từng role

2. **Chọn/thay đổi role** 
   - Chỉ cho phép chọn 1 role per row
   - Dropdown đóng sau khi chọn
   - Replace role cũ khi chọn role mới

3. **Chọn organizations**
   - Cho phép multi-select organizations
   - Global assignment (để trống orgs)

4. **Save assignments**
   - Payload đúng format
   - Backend tạo đúng user_roles records

## Notes

- Giao diện input tags vẫn giữ nguyên như yêu cầu
- Logic backend không thay đổi, chỉ thay đổi frontend grouping
- Backward compatible với data hiện tại
- Performance tốt hơn vì ít rows hơn khi user có nhiều role assignments
