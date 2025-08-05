# Hướng Dẫn Test EditUserModal - Cập Nhật Vai Trò

## Mục đích
Kiểm tra việc cập nhật vai trò và tổ chức cho người dùng thông qua EditUserModal sau khi refactor.

## Các bước test

### 1. Kiểm tra UI Modal
1. Mở trang Users
2. Click "Chỉnh sửa" cho một người dùng bất kỳ
3. Kiểm tra modal mở với thông tin người dùng đã được load
4. Kiểm tra phần "Gán vai trò và tổ chức" hiển thị đúng

### 2. Test Case 1: Thêm vai trò global mới
1. Trong modal EditUser, click "Thêm vai trò"
2. Chọn vai trò từ dropdown (ví dụ: Admin, Manager)
3. Để "Global" được check
4. Click "Cập nhật"
5. **Expected**: Thông báo thành công, modal đóng, dữ liệu refresh

### 3. Test Case 2: Thêm vai trò cho tổ chức cụ thể
1. Mở EditUser modal
2. Click "Thêm vai trò"
3. Chọn vai trò từ dropdown
4. Uncheck "Global"
5. Chọn một hoặc nhiều tổ chức từ dropdown
6. Click "Cập nhật"
7. **Expected**: Thông báo thành công, modal đóng, dữ liệu refresh

### 4. Test Case 3: Cập nhật vai trò hiện có
1. Mở EditUser modal cho user đã có vai trò
2. Thay đổi vai trò hiện có (thêm hoặc bớt)
3. Thay đổi tổ chức (nếu có)
4. Click "Cập nhật"
5. **Expected**: Thông báo thành công, modal đóng, dữ liệu refresh

### 5. Test Case 4: Xóa tất cả vai trò
1. Mở EditUser modal
2. Xóa tất cả các vai trò assignment (click X trên từng dòng)
3. Click "Cập nhật"
4. **Expected**: Thông báo thành công, user không còn vai trò nào

### 6. Test Case 5: Cập nhật thông tin cơ bản + vai trò
1. Mở EditUser modal
2. Thay đổi email hoặc phone
3. Thêm/sửa vai trò
4. Click "Cập nhật"
5. **Expected**: Cả thông tin cơ bản và vai trò đều được cập nhật

## Debug Steps

### Kiểm tra Console Logs
Trong Developer Tools Console, tìm các log:
- "Sending cleaned data for edit:"
- "Updating role assignments:"
- "Role assignments updated successfully"
- "User and role assignments updated successfully"

### Kiểm tra Network Tab
1. Mở Network tab trong DevTools
2. Thực hiện test case
3. Kiểm tra các API calls:
   - `PUT /api/users/{id}` - cập nhật thông tin user
   - `POST /api/roles/grant-roles` - cập nhật vai trò
   - `GET /api/users` - refresh danh sách

### Kiểm tra Response
- Status codes phải là 200/201
- Response body không có error
- Data được trả về đúng format

## Test với Browser Console

Chạy script test trong console:
```javascript
// Load test script
const script = document.createElement('script');
script.src = '/test-edit-user-modal.js';
document.head.appendChild(script);

// Sau khi load, chạy test
window.testEditUserModal();
```

## Các lỗi thường gặp

### 1. Modal đóng ngay nhưng dữ liệu không thay đổi
- **Nguyên nhân**: API grantRoles thất bại sau khi updateUser thành công
- **Kiểm tra**: Console logs và Network tab
- **Fix**: Kiểm tra roleAssignments format và API endpoint

### 2. Thông báo thành công nhưng một phần không cập nhật
- **Nguyên nhân**: updateUser thành công nhưng grantRoles thất bại
- **Kiểm tra**: Console error logs
- **Fix**: Đảm bảo roleAssignments valid và user có quyền

### 3. Loading indicator không hoạt động
- **Nguyên nhân**: isSubmitting state không được update
- **Kiểm tra**: React DevTools state
- **Fix**: Đảm bảo setIsSubmitting được gọi đúng

### 4. Dữ liệu không refresh sau update
- **Nguyên nhân**: onRefreshData không được gọi hoặc thất bại
- **Kiểm tra**: Network tab có request GET /api/users không
- **Fix**: Đảm bảo onRefreshData được truyền và gọi

## Kết quả mong đợi

Sau khi test thành công:
1. Modal EditUser hoạt động mượt mà
2. Cập nhật thông tin cơ bản và vai trò đều thành công
3. UI phản hồi đúng (loading, success message)
4. Dữ liệu được refresh và hiển thị chính xác
5. User experience tutej như GrantRolesModal

## Troubleshooting

Nếu vẫn có vấn đề:
1. Kiểm tra backend logs
2. Kiểm tra database trực tiếp (UserRole table)
3. So sánh với GrantRolesModal (working reference)
4. Kiểm tra permissions của user hiện tại
