# Tổ chức - Hệ thống Phân quyền dựa trên User Role

## Tổng quan

Tính năng phân quyền đã được bổ sung vào cây tổ chức (Organization Tree) để kiểm soát quyền truy cập của người dùng dựa trên các role và permissions được gán cho họ.

## Cơ chế hoạt động

### 1. Cơ chế hiện tại (giữ nguyên)
- **Icon con mắt (Eye Icon)**: Hiển thị dựa trên việc user có thuộc vào tổ chức đó hay không (kiểm tra trong bảng `user_organization`)
- Cơ chế này được giữ nguyên và không thay đổi

### 2. Cơ chế mới (phân quyền cho các icon khác)

#### Icon Users (Danh sách thành viên)
- **Quyền cần thiết**: `organizations.view_member_count` HOẶC `organizations.add_member` HOẶC `organizations.remove_member`
- **Hành vi**: 
  - Nếu có quyền: Icon có thể click và dẫn đến trang danh sách thành viên
  - Nếu không có quyền: Icon vẫn hiển thị nhưng không thể click

#### Icon UserPlus (Thêm thành viên)
- **Quyền cần thiết**: `organizations.add_member`
- **Hành vi**:
  - Nếu có quyền: Button có màu xanh, có thể click để mở modal thêm thành viên
  - Nếu không có quyền: Button màu xám, không thể click, có tooltip thông báo

#### Icon Edit (Chỉnh sửa tổ chức)
- **Quyền cần thiết**: `organizations.update`
- **Hành vi**:
  - Nếu có quyền: Button có màu vàng, có thể click để mở modal chỉnh sửa
  - Nếu không có quyền: Button màu xám, không thể click, có tooltip thông báo

#### Icon Delete (Xóa tổ chức)
- **Quyền cần thiết**: `organizations.delete`
- **Hành vi**:
  - Nếu có quyền: Button có màu đỏ, có thể click để mở modal xác nhận xóa
  - Nếu không có quyền: Button màu xám, không thể click, có tooltip thông báo

## Implementation Details

### 1. Permissions Hook
Tạo hook chuyên dụng `useOrganizationPagePermissions` để:
- Tập trung quản lý tất cả permissions liên quan đến tổ chức
- Cung cấp interface rõ ràng cho component
- Dễ dàng maintain và extend

### 2. Component Updates
Cập nhật `OrganizationTreeItem` để:
- Sử dụng permission checks trước khi hiển thị action buttons
- Hiển thị disabled state thay vì ẩn hoàn toàn (để user biết tính năng tồn tại)
- Cung cấp tooltip phù hợp cho trường hợp không có quyền

### 3. Permission Constants
Mở rộng `ORGANIZATION_PERMISSIONS` để bao gồm:
- `ADD_MEMBER`: Thêm thành viên
- `REMOVE_MEMBER`: Xóa thành viên
- `VIEW_MEMBER_COUNT`: Xem số lượng thành viên
- `ACCESS_CHILDREN`: Truy cập tổ chức con

## User Experience

### Với quyền đầy đủ:
- User thấy tất cả icons với màu sắc bình thường
- Có thể thực hiện tất cả các actions

### Với quyền hạn chế:
- User vẫn thấy tất cả icons nhưng một số có màu xám (disabled)
- Khi hover vào icon disabled, hiển thị tooltip giải thích tại sao không thể sử dụng
- User hiểu được quyền hạn của mình mà không bị confused

### Không có quyền gì:
- User vẫn thấy cấu trúc tổ chức
- Tất cả action icons đều disabled với tooltip thông báo

## Debug và Monitoring

Thêm console logging để:
- Theo dõi permission evaluation cho mỗi tổ chức
- Debug issues liên quan đến permissions
- Hiển thị thông tin user roles và organization context

## Ví dụ Permissions

```json
{
  "canAddMember": true,
  "canEdit": false,
  "canDelete": false,
  "canShowUsersIcon": true,
  "hasAnyManagementAction": true,
  "currentUser": "admin@example.com",
  "userRoles": [
    {
      "name": "Organization Member Manager",
      "orgId": "org-123"
    }
  ]
}
```

## Testing

Để test hệ thống phân quyền:

1. **Tạo user với role khác nhau**
2. **Assign permissions khác nhau cho từng role**
3. **Verify behavior của icons**:
   - Màu sắc đúng (enabled/disabled)
   - Tooltip hiển thị đúng
   - Actions hoạt động đúng khi có quyền
   - Actions bị block khi không có quyền

## Notes

- Hệ thống phân quyền này mở rộng được - có thể dễ dàng thêm permissions mới
- Tương thích với hệ thống organization context hiện tại
- Không ảnh hưởng đến cơ chế eye icon hiện tại
- Performance tốt nhờ sử dụng useMemo trong permission hooks
