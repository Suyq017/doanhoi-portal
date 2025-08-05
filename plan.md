# Kế hoạch Bổ sung Phân quyền cho CreateUserModal

- Ý tưởng: Ở CreateUserModal sẽ bổ sung thêm phân quyền chức năng với giao diện diện được phác thảo như này:
Phân quyền chức năng. Một số quyền cho phép phân quyền chi tiết theo danh mục.
(Ở layout sẽ hiển thị phần để có thể bấm vào trang, nếu không có quyền thì sẽ ẩn trang)
- Quyền truy cập vào bảng điều khiển. 
- Quyền truy cập vào trang quản lý người dùng:
    + Chọn tất cả.
    + Cho phép thêm người dùng.
    + Cho phép xuất dữ liệu.
    + Cho phép xem chi tiết (icon con mắt).
    + Cho phép chỉnh sửa.
    + Cho phép xóa.
    + ... 

- Quyền truy cập vào trang tổ chức:
    -- Sẽ có thêm trường chọn tổ chức (dạng combobox, có thể chọn một hoặc nhiều tổ chức và có thêm nút tick chọn tất cả tổ chức)
    + Chọn tất cả.
    + Quyền thêm tổ chức mới.
    + Quyền xem số lượng thành viên.
    + Quyền cho phép truy cập vào tổ chức con (icon con mắt).
    + Quyền chỉnh sửa thông tin của tổ chức.
    + Quyền xóa tổ chức.
    + Quyền xóa thành viên khỏi tổ chức.
    + Quyền thêm thành viên vào tổ chức.
    + ... 

- Quyền truy cập vào trang đơn vị:
    + Chọn tất cả.
    + Quyền thêm đơn vị mới.
    + Quyền xem chi tiết đơn vị.
    + Quyền chỉnh sửa thông tin đơn vị.
    + Quyền xóa đơn vị khỏi tổ chức.
    + ...
- Quyền truy cập vào trang lớp học:
    + Chọn tất cả.
    + Quyền thêm lớp học.
    + Quyền xem chi tiết lớp học.
    + Quyền chỉnh sửa thông tin lớp học.
    + Quyền xóa lớp học đó.
    + ... 

## Lưu ý về UI
Nếu ở trang nào mà người dùng không có quyền gì đến chức năng đó thì sẽ ẩn đi icon hoặc UI liên quan đến chức năng đó (ví dụ: nếu như người dùng không có quyền chỉnh thông tin chi tiết của tổ chức thì trong cây tổ chức sẽ ẩn đi icon đó).

## Cơ chế lưu quyền
- Khi tạo người dùng mới với các quyền chỉ liên quan đến hệ thống (dashboard, đơn vị, lớp học), thì trong bảng `user_permissions` cột `organizationId` sẽ là `null`.
- Khi tạo người dùng mới với các quyền liên quan đến tổ chức, thì trong bảng `user_permissions` sẽ có cột `organizationId` (nếu các `permissionId` đó liên quan đến tổ chức), còn không thì là `null`.

## Ưu điểm thiết kế
- Linh hoạt mở rộng: dễ dàng bổ sung quyền mới cho hệ thống mà không cần thay đổi cấu trúc bảng.
- Hỗ trợ đa tổ chức: user có thể có nhiều quyền ở nhiều tổ chức khác nhau.

## Cách Guard bảo vệ quyền

```typescript
@UseGuards(PermissionGuard)
@RequirePermissions('organization:update')
@Put('/organizations/:organizationId')
async updateOrganization(...) { ... }
```

**Khi API được gọi:**
- Guard lấy danh sách quyền yêu cầu từ decorator: `['organization:update']`
- Lấy thông tin user từ request (đã xác thực)
- Lấy `organizationId` từ params hoặc body của request
- Gọi `PermissionService.hasPermission`

**Service sẽ kiểm tra trong bảng `user_permissions` xem user có quyền `organization:update` với `organizationId` này không.**

**Kết quả:**
- Nếu user có quyền đó với đúng tổ chức, cho phép thực hiện API
- Nếu không, trả về lỗi 403 Forbidden