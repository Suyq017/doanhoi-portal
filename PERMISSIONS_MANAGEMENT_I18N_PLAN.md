# KẾ HOẠCH QUỐC TẾ HÓA (I18N) - TRANG PERMISSIONS MANAGEMENT

## Tổng quan

Kế hoạch bổ sung và hoàn thiện hệ thống đa ngôn ngữ Vi/En cho trang "Permissions Management" (Quản lý Phân quyền) - thay thế các hardcode strings còn thiếu và bổ sung các key i18n chưa có.

## Phân tích hardcode hiện tại

### 1. Hardcode Strings cần thay thế

| Vị trí                   | Hardcode Text (Vietnamese)           | Key i18n đề xuất                         | English Translation     | Trạng thái |
| ------------------------ | ------------------------------------ | ---------------------------------------- | ----------------------- | ---------- |
| **RolesTable.tsx**       |
| System Role Label        | "Vai trò hệ thống"                   | `labels.systemRole`                      | "System Role"           | ✅ Đã có   |
| Permission Count         | "{{count}} quyền"                    | `labels.permissionCountLabel`            | "{{count}} permissions" | ❌ Thiếu   |
| Active Status            | "Hoạt động"                          | `labels.active`                          | "Active"                | ✅ Đã có   |
| Inactive Status          | "Không hoạt động"                    | `labels.inactive`                        | "Inactive"              | ✅ Đã có   |
| **EditRoleModal.tsx**    |
| Group Name Format        | `group.name.replace('Quản lý ', '')` | `permissions.categories.{category}Short` | Short category names    | ❌ Thiếu   |
| My-payments Category     | "Đóng phí của tôi"                   | `permissions.categories.myPayments`      | "My Payments"           | ❌ Thiếu   |
| **CreateRoleModal.tsx**  |
| Group Name Format        | `group.name.replace('Quản lý ', '')` | `permissions.categories.{category}Short` | Short category names    | ❌ Thiếu   |
| My-payments Category     | "Đóng phí của tôi"                   | `permissions.categories.myPayments`      | "My Payments"           | ❌ Thiếu   |
| **Permission Mock Data** |
| Permission Names         | Various hardcoded permission names   | `permissions.definitions.{code}`         | Permission translations | ❌ Thiếu   |

### 2. Missing i18n Keys cần bổ sung

| Key đề xuất                                 | Vietnamese         | English                 | Mô tả                          |
| ------------------------------------------- | ------------------ | ----------------------- | ------------------------------ |
| `labels.permissionCountLabel`               | "{{count}} quyền"  | "{{count}} permissions" | Format hiển thị số lượng quyền |
| `permissions.categories.myPayments`         | "Đóng phí của tôi" | "My Payments"           | Category cho my-payments       |
| `permissions.categories.dashboardShort`     | "Dashboard"        | "Dashboard"             | Tên ngắn cho dashboard         |
| `permissions.categories.usersShort`         | "Người dùng"       | "Users"                 | Tên ngắn cho users             |
| `permissions.categories.organizationsShort` | "Tổ chức"          | "Organizations"         | Tên ngắn cho organizations     |
| `permissions.categories.departmentsShort`   | "Đơn vị"           | "Departments"           | Tên ngắn cho departments       |
| `permissions.categories.classesShort`       | "Lớp học"          | "Classes"               | Tên ngắn cho classes           |
| `permissions.categories.permissionsShort`   | "Phân quyền"       | "Permissions"           | Tên ngắn cho permissions       |
| `permissions.categories.paymentsShort`      | "Đóng phí"         | "Payments"              | Tên ngắn cho payments          |
| `permissions.categories.myPaymentsShort`    | "Đóng phí của tôi" | "My Payments"           | Tên ngắn cho my-payments       |

### 3. Permission Definitions cần i18n

| Permission Code                        | Vietnamese                              | English                          |
| -------------------------------------- | --------------------------------------- | -------------------------------- |
| `users.access`                         | "Truy cập trang người dùng"             | "Access users page"              |
| `users.create`                         | "Tạo người dùng mới"                    | "Create new user"                |
| `users.view_details`                   | "Xem chi tiết người dùng"               | "View user details"              |
| `users.update`                         | "Cập nhật người dùng"                   | "Update user"                    |
| `users.delete`                         | "Xóa người dùng"                        | "Delete user"                    |
| `users.export`                         | "Xuất dữ liệu người dùng"               | "Export user data"               |
| `organizations.access`                 | "Truy cập trang tổ chức"                | "Access organizations page"      |
| `organizations.create`                 | "Tạo tổ chức mới"                       | "Create new organization"        |
| `organizations.read`                   | "Xem thông tin tổ chức"                 | "View organization details"      |
| `organizations.update`                 | "Cập nhật tổ chức"                      | "Update organization"            |
| `organizations.delete`                 | "Xóa tổ chức"                           | "Delete organization"            |
| `departments.access`                   | "Truy cập trang đơn vị"                 | "Access departments page"        |
| `departments.create`                   | "Tạo đơn vị mới"                        | "Create new department"          |
| `departments.view_details`             | "Xem chi tiết đơn vị"                   | "View department details"        |
| `departments.update`                   | "Cập nhật đơn vị"                       | "Update department"              |
| `departments.delete`                   | "Xóa đơn vị"                            | "Delete department"              |
| `classes.access`                       | "Truy cập trang lớp học"                | "Access classes page"            |
| `classes.create`                       | "Tạo lớp học mới"                       | "Create new class"               |
| `classes.view_details`                 | "Xem chi tiết lớp học"                  | "View class details"             |
| `classes.update`                       | "Cập nhật lớp học"                      | "Update class"                   |
| `classes.delete`                       | "Xóa lớp học"                           | "Delete class"                   |
| `payment-campaigns.access`             | "Truy cập trang quản lý đóng phí"       | "Access payment management page" |
| `payment-campaigns.create`             | "Tạo đợt đóng phí mới"                  | "Create new payment campaign"    |
| `payment-campaigns.read`               | "Xem thông tin đợt đóng phí"            | "View payment campaign details"  |
| `payment-campaigns.update`             | "Cập nhật đợt đóng phí"                 | "Update payment campaign"        |
| `payment-campaigns.delete`             | "Xóa đợt đóng phí"                      | "Delete payment campaign"        |
| `payment-campaigns.manage_assignments` | "Quản lý phân công thanh toán"          | "Manage payment assignments"     |
| `payment-campaigns.view_reports`       | "Xem báo cáo đóng phí"                  | "View payment reports"           |
| `payment-campaigns.export`             | "Xuất dữ liệu đóng phí"                 | "Export payment data"            |
| `my-payments.access`                   | "Truy cập trang đóng phí của tôi"       | "Access my payments page"        |
| `my-payments.view`                     | "Xem thông tin đóng phí được phân công" | "View assigned payment details"  |
| `my-payments.pay`                      | "Thực hiện thanh toán"                  | "Make payment"                   |
| `my-payments.history`                  | "Xem lịch sử thanh toán"                | "View payment history"           |
| `permissions.access`                   | "Truy cập trang phân quyền"             | "Access permissions page"        |
| `permissions.create`                   | "Tạo vai trò mới"                       | "Create new role"                |
| `permissions.view_details`             | "Xem chi tiết vai trò"                  | "View role details"              |
| `permissions.update`                   | "Cập nhật vai trò"                      | "Update role"                    |
| `permissions.delete`                   | "Xóa vai trò"                           | "Delete role"                    |

## Cấu trúc file i18n cần cập nhật

### `frontend/public/locales/vi/permissions.json` - Bổ sung keys

```json
{
  // ... existing content ...
  "labels": {
    // ... existing labels ...
    "permissionCountLabel": "{{count}} quyền"
  },
  "permissions": {
    "categories": {
      // ... existing categories ...
      "myPayments": "Đóng phí của tôi",
      "dashboardShort": "Dashboard",
      "usersShort": "Người dùng",
      "organizationsShort": "Tổ chức",
      "departmentsShort": "Đơn vị",
      "classesShort": "Lớp học",
      "permissionsShort": "Phân quyền",
      "paymentsShort": "Đóng phí",
      "myPaymentsShort": "Đóng phí của tôi"
    },
    "definitions": {
      "users.access": "Truy cập trang người dùng",
      "users.create": "Tạo người dùng mới",
      "users.view_details": "Xem chi tiết người dùng",
      "users.update": "Cập nhật người dùng",
      "users.delete": "Xóa người dùng",
      "users.export": "Xuất dữ liệu người dùng",
      "organizations.access": "Truy cập trang tổ chức",
      "organizations.create": "Tạo tổ chức mới",
      "organizations.read": "Xem thông tin tổ chức",
      "organizations.update": "Cập nhật tổ chức",
      "organizations.delete": "Xóa tổ chức",
      "departments.access": "Truy cập trang đơn vị",
      "departments.create": "Tạo đơn vị mới",
      "departments.view_details": "Xem chi tiết đơn vị",
      "departments.update": "Cập nhật đơn vị",
      "departments.delete": "Xóa đơn vị",
      "classes.access": "Truy cập trang lớp học",
      "classes.create": "Tạo lớp học mới",
      "classes.view_details": "Xem chi tiết lớp học",
      "classes.update": "Cập nhật lớp học",
      "classes.delete": "Xóa lớp học",
      "payment-campaigns.access": "Truy cập trang quản lý đóng phí",
      "payment-campaigns.create": "Tạo đợt đóng phí mới",
      "payment-campaigns.read": "Xem thông tin đợt đóng phí",
      "payment-campaigns.update": "Cập nhật đợt đóng phí",
      "payment-campaigns.delete": "Xóa đợt đóng phí",
      "payment-campaigns.manage_assignments": "Quản lý phân công thanh toán",
      "payment-campaigns.view_reports": "Xem báo cáo đóng phí",
      "payment-campaigns.export": "Xuất dữ liệu đóng phí",
      "my-payments.access": "Truy cập trang đóng phí của tôi",
      "my-payments.view": "Xem thông tin đóng phí được phân công",
      "my-payments.pay": "Thực hiện thanh toán",
      "my-payments.history": "Xem lịch sử thanh toán",
      "permissions.access": "Truy cập trang phân quyền",
      "permissions.create": "Tạo vai trò mới",
      "permissions.view_details": "Xem chi tiết vai trò",
      "permissions.update": "Cập nhật vai trò",
      "permissions.delete": "Xóa vai trò"
    }
  }
}
```

### `frontend/public/locales/en/permissions.json` - Bổ sung keys

```json
{
  // ... existing content ...
  "labels": {
    // ... existing labels ...
    "permissionCountLabel": "{{count}} permissions"
  },
  "permissions": {
    "categories": {
      // ... existing categories ...
      "myPayments": "My Payments",
      "dashboardShort": "Dashboard",
      "usersShort": "Users",
      "organizationsShort": "Organizations",
      "departmentsShort": "Departments",
      "classesShort": "Classes",
      "permissionsShort": "Permissions",
      "paymentsShort": "Payments",
      "myPaymentsShort": "My Payments"
    },
    "definitions": {
      "users.access": "Access users page",
      "users.create": "Create new user",
      "users.view_details": "View user details",
      "users.update": "Update user",
      "users.delete": "Delete user",
      "users.export": "Export user data",
      "organizations.access": "Access organizations page",
      "organizations.create": "Create new organization",
      "organizations.read": "View organization details",
      "organizations.update": "Update organization",
      "organizations.delete": "Delete organization",
      "departments.access": "Access departments page",
      "departments.create": "Create new department",
      "departments.view_details": "View department details",
      "departments.update": "Update department",
      "departments.delete": "Delete department",
      "classes.access": "Access classes page",
      "classes.create": "Create new class",
      "classes.view_details": "View class details",
      "classes.update": "Update class",
      "classes.delete": "Delete class",
      "payment-campaigns.access": "Access payment management page",
      "payment-campaigns.create": "Create new payment campaign",
      "payment-campaigns.read": "View payment campaign details",
      "payment-campaigns.update": "Update payment campaign",
      "payment-campaigns.delete": "Delete payment campaign",
      "payment-campaigns.manage_assignments": "Manage payment assignments",
      "payment-campaigns.view_reports": "View payment reports",
      "payment-campaigns.export": "Export payment data",
      "my-payments.access": "Access my payments page",
      "my-payments.view": "View assigned payment details",
      "my-payments.pay": "Make payment",
      "my-payments.history": "View payment history",
      "permissions.access": "Access permissions page",
      "permissions.create": "Create new role",
      "permissions.view_details": "View role details",
      "permissions.update": "Update role",
      "permissions.delete": "Delete role"
    }
  }
}
```

## Kế hoạch triển khai

### Bước 1: Bổ sung keys i18n (20 phút)

1. Cập nhật `vi/permissions.json` với keys mới
2. Cập nhật `en/permissions.json` với keys mới
3. Test import để đảm bảo không lỗi syntax

### Bước 2: Thay thế hardcode trong RolesTable.tsx (15 phút)

1. Thay thế "{{count}} quyền" bằng `t('labels.permissionCountLabel', {count})`
2. Verify display vẫn đúng định dạng

### Bước 3: Cải thiện Categories trong Modals (30 phút)

1. Thay thế `group.name.replace('Quản lý ', '')` bằng short category names
2. Thêm "My Payments" category translation
3. Sử dụng `t('permissions.categories.{category}Short')`

### Bước 4: Áp dụng Permission Definitions (45 phút)

1. Cập nhật mock data trong CreateRoleModal và EditRoleModal
2. Sử dụng `t('permissions.definitions.{code}')` cho tên permissions
3. Kiểm tra hiển thị permissions trong ViewRoleModal

### Bước 5: Test chức năng (30 phút)

1. Test chuyển đổi ngôn ngữ vi/en
2. Kiểm tra tất cả text hiển thị đúng
3. Verify modal functionality không bị ảnh hưởng
4. Test responsive design

## Components cần cập nhật

### 1. RolesTable.tsx

- Thay thế hardcode "{{count}} quyền"
- Sử dụng i18n cho permission count display

### 2. CreateRoleModal.tsx & EditRoleModal.tsx

- Thay thế group name formatting logic
- Áp dụng short category names
- Thêm my-payments category support
- Sử dụng permission definitions

### 3. ViewRoleModal.tsx

- Áp dụng permission definitions cho hiển thị
- Sử dụng category translations

## Lợi ích sau khi triển khai

1. **Hoàn thiện i18n**: 100% text được translate
2. **Consistency**: Đồng nhất naming conventions
3. **Maintainability**: Dễ dàng cập nhật permission names
4. **Scalability**: Dễ thêm permissions/categories mới
5. **User Experience**: UX tốt hơn cho người dùng quốc tế

## Estimated Time: 2.5 giờ

## Dependencies

- react-i18next đã được setup
- Permission system structure đã có
- Mock data structure hiện tại

## Risk Assessment

- **Low risk**: Chỉ bổ sung keys và thay hardcode
- **Testing needed**: Cần test kỹ permission display
- **Backward compatibility**: Đảm bảo không ảnh hưởng logic hiện tại

## Verification Checklist

- [ ] Tất cả hardcode strings được thay thế
- [ ] Permission count hiển thị đúng format
- [ ] Category names hiển thị đúng (full & short)
- [ ] Permission definitions hiển thị đúng
- [ ] My-payments category hoạt động
- [ ] Chuyển đổi ngôn ngữ hoạt động
- [ ] Modal functionality không bị ảnh hưởng
- [ ] Responsive design không bị broken
