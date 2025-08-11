# KẾ HOẠCH QUỐC TẾ HÓA (I18N) - TRANG MY PAYMENTS

## Tổng quan

Kế hoạch chuyển đổi trang "My Payments" (Đóng phí của tôi) từ hardcode string sang hệ thống đa ngôn ngữ Vi/En.

## Phân tích hardcode hiện tại

### 1. UI Text Components cần chuyển đổi

| Vị trí                        | Hardcode Text (Vietnamese)                                                  | Key i18n đề xuất                           | English Translation                                                             |
| ----------------------------- | --------------------------------------------------------------------------- | ------------------------------------------ | ------------------------------------------------------------------------------- |
| **Header Section**            |
| Page Title                    | "Đóng phí của tôi"                                                          | `myPayments.title`                         | "My Payments"                                                                   |
| Page Description              | "Quản lý và thanh toán các khoản phí được phân công"                        | `myPayments.description`                   | "Manage and pay assigned fees"                                                  |
| **Permission Info**           |
| Access Rights                 | "Quyền truy cập"                                                            | `myPayments.accessRights`                  | "Access Rights"                                                                 |
| Organization Access           | "Bạn có thể xem đợt đóng phí từ các tổ chức:"                               | `myPayments.organizationAccess`            | "You can view payment campaigns from organizations:"                            |
| Super Admin Rights            | "Quyền Super Admin"                                                         | `myPayments.superAdminRights`              | "Super Admin Rights"                                                            |
| Super Admin Description       | "Bạn có quyền xem đợt đóng phí từ tất cả các tổ chức"                       | `myPayments.superAdminDescription`         | "You have permission to view payment campaigns from all organizations"          |
| **Summary Stats**             |
| Total                         | "Tổng số"                                                                   | `myPayments.stats.total`                   | "Total"                                                                         |
| Pending                       | "Chờ thanh toán"                                                            | `myPayments.stats.pending`                 | "Pending Payment"                                                               |
| Overdue                       | "Quá hạn"                                                                   | `myPayments.stats.overdue`                 | "Overdue"                                                                       |
| Total Amount                  | "Tổng tiền cần đóng"                                                        | `myPayments.stats.totalAmount`             | "Total Amount Due"                                                              |
| **Search & Filters**          |
| Search Placeholder            | "Tìm kiếm đợt đóng phí..."                                                  | `myPayments.search.placeholder`            | "Search payment campaigns..."                                                   |
| All Status                    | "Tất cả trạng thái"                                                         | `myPayments.filters.allStatus`             | "All Status"                                                                    |
| Due Date Sort                 | "Hạn thanh toán"                                                            | `myPayments.sort.dueDate`                  | "Due Date"                                                                      |
| Assigned Date Sort            | "Ngày phân công"                                                            | `myPayments.sort.assignedAt`               | "Assignment Date"                                                               |
| Amount Sort                   | "Số tiền"                                                                   | `myPayments.sort.amount`                   | "Amount"                                                                        |
| Ascending                     | "Tăng dần"                                                                  | `myPayments.sort.ascending`                | "Ascending"                                                                     |
| Descending                    | "Giảm dần"                                                                  | `myPayments.sort.descending`               | "Descending"                                                                    |
| **Table Headers**             |
| Campaign                      | "Đợt đóng phí"                                                              | `myPayments.table.campaign`                | "Payment Campaign"                                                              |
| Organization                  | "Tổ chức"                                                                   | `myPayments.table.organization`            | "Organization"                                                                  |
| Amount                        | "Số tiền"                                                                   | `myPayments.table.amount`                  | "Amount"                                                                        |
| Start Date                    | "Từ ngày"                                                                   | `myPayments.table.startDate`               | "Start Date"                                                                    |
| End Date                      | "Đến ngày"                                                                  | `myPayments.table.endDate`                 | "End Date"                                                                      |
| Payment                       | "Thanh toán"                                                                | `myPayments.table.payment`                 | "Payment"                                                                       |
| **Action Buttons**            |
| Pay Now                       | "Thanh toán ngay"                                                           | `myPayments.actions.payNow`                | "Pay Now"                                                                       |
| Payment Expired               | "Đã hết hạn thanh toán"                                                     | `myPayments.actions.paymentExpired`        | "Payment Expired"                                                               |
| Already Paid                  | "Đã thanh toán"                                                             | `myPayments.actions.alreadyPaid`           | "Already Paid"                                                                  |
| **Loading States**            |
| Loading List                  | "Đang tải danh sách..."                                                     | `myPayments.loading.list`                  | "Loading list..."                                                               |
| **Error Messages**            |
| Load Error                    | "Không thể tải danh sách đóng phí"                                          | `myPayments.errors.loadError`              | "Cannot load payment list"                                                      |
| Retry                         | "Thử lại"                                                                   | `myPayments.actions.retry`                 | "Retry"                                                                         |
| Assignment Not Found          | "Không tìm thấy thông tin đóng phí"                                         | `myPayments.errors.assignmentNotFound`     | "Payment assignment not found"                                                  |
| Payment Error                 | "Có lỗi xảy ra khi tạo thanh toán. Vui lòng thử lại."                       | `myPayments.errors.paymentError`           | "An error occurred while creating payment. Please try again."                   |
| **Empty States**              |
| No Campaigns                  | "Không có đợt đóng phí nào"                                                 | `myPayments.empty.noCampaigns`             | "No payment campaigns"                                                          |
| No Results                    | "Không tìm thấy đợt đóng phí nào phù hợp với bộ lọc"                        | `myPayments.empty.noResults`               | "No payment campaigns match the filters"                                        |
| No Assignments (Super Admin)  | "Bạn chưa được phân công đóng phí nào"                                      | `myPayments.empty.noAssignmentsSuperAdmin` | "You have not been assigned any payments"                                       |
| No Assignments (Regular User) | "Bạn chưa được phân công đóng phí nào từ các tổ chức bạn có quyền truy cập" | `myPayments.empty.noAssignmentsRegular`    | "You have not been assigned any payments from organizations you have access to" |
| Access Organizations          | "Các tổ chức bạn có quyền truy cập:"                                        | `myPayments.empty.accessOrganizations`     | "Organizations you have access to:"                                             |

### 2. Status Values cần i18n

| Original (Vi) | Key i18n                      | English     |
| ------------- | ----------------------------- | ----------- |
| "PENDING"     | `myPayments.status.pending`   | "Pending"   |
| "OVERDUE"     | `myPayments.status.overdue`   | "Overdue"   |
| "PAID"        | `myPayments.status.paid`      | "Paid"      |
| "ACTIVE"      | `myPayments.status.active`    | "Active"    |
| "CANCELLED"   | `myPayments.status.cancelled` | "Cancelled" |

## Cấu trúc file i18n mới

### `frontend/public/locales/vi/myPayments.json`

```json
{
  "title": "Đóng phí của tôi",
  "description": "Quản lý và thanh toán các khoản phí được phân công",
  "accessRights": "Quyền truy cập",
  "organizationAccess": "Bạn có thể xem đợt đóng phí từ các tổ chức:",
  "superAdminRights": "Quyền Super Admin",
  "superAdminDescription": "Bạn có quyền xem đợt đóng phí từ tất cả các tổ chức",
  "stats": {
    "total": "Tổng số",
    "pending": "Chờ thanh toán",
    "overdue": "Quá hạn",
    "totalAmount": "Tổng tiền cần đóng"
  },
  "search": {
    "placeholder": "Tìm kiếm đợt đóng phí..."
  },
  "filters": {
    "allStatus": "Tất cả trạng thái"
  },
  "sort": {
    "dueDate": "Hạn thanh toán",
    "assignedAt": "Ngày phân công",
    "amount": "Số tiền",
    "ascending": "Tăng dần",
    "descending": "Giảm dần"
  },
  "table": {
    "campaign": "Đợt đóng phí",
    "organization": "Tổ chức",
    "amount": "Số tiền",
    "startDate": "Từ ngày",
    "endDate": "Đến ngày",
    "payment": "Thanh toán"
  },
  "actions": {
    "payNow": "Thanh toán ngay",
    "paymentExpired": "Đã hết hạn thanh toán",
    "alreadyPaid": "Đã thanh toán",
    "retry": "Thử lại"
  },
  "loading": {
    "list": "Đang tải danh sách..."
  },
  "errors": {
    "loadError": "Không thể tải danh sách đóng phí",
    "assignmentNotFound": "Không tìm thấy thông tin đóng phí",
    "paymentError": "Có lỗi xảy ra khi tạo thanh toán. Vui lòng thử lại."
  },
  "empty": {
    "noCampaigns": "Không có đợt đóng phí nào",
    "noResults": "Không tìm thấy đợt đóng phí nào phù hợp với bộ lọc",
    "noAssignmentsSuperAdmin": "Bạn chưa được phân công đóng phí nào",
    "noAssignmentsRegular": "Bạn chưa được phân công đóng phí nào từ các tổ chức bạn có quyền truy cập",
    "accessOrganizations": "Các tổ chức bạn có quyền truy cập:"
  },
  "status": {
    "pending": "Chờ thanh toán",
    "overdue": "Quá hạn",
    "paid": "Đã thanh toán",
    "active": "Hoạt động",
    "cancelled": "Đã hủy"
  }
}
```

### `frontend/public/locales/en/myPayments.json`

```json
{
  "title": "My Payments",
  "description": "Manage and pay assigned fees",
  "accessRights": "Access Rights",
  "organizationAccess": "You can view payment campaigns from organizations:",
  "superAdminRights": "Super Admin Rights",
  "superAdminDescription": "You have permission to view payment campaigns from all organizations",
  "stats": {
    "total": "Total",
    "pending": "Pending Payment",
    "overdue": "Overdue",
    "totalAmount": "Total Amount Due"
  },
  "search": {
    "placeholder": "Search payment campaigns..."
  },
  "filters": {
    "allStatus": "All Status"
  },
  "sort": {
    "dueDate": "Due Date",
    "assignedAt": "Assignment Date",
    "amount": "Amount",
    "ascending": "Ascending",
    "descending": "Descending"
  },
  "table": {
    "campaign": "Payment Campaign",
    "organization": "Organization",
    "amount": "Amount",
    "startDate": "Start Date",
    "endDate": "End Date",
    "payment": "Payment"
  },
  "actions": {
    "payNow": "Pay Now",
    "paymentExpired": "Payment Expired",
    "alreadyPaid": "Already Paid",
    "retry": "Retry"
  },
  "loading": {
    "list": "Loading list..."
  },
  "errors": {
    "loadError": "Cannot load payment list",
    "assignmentNotFound": "Payment assignment not found",
    "paymentError": "An error occurred while creating payment. Please try again."
  },
  "empty": {
    "noCampaigns": "No payment campaigns",
    "noResults": "No payment campaigns match the filters",
    "noAssignmentsSuperAdmin": "You have not been assigned any payments",
    "noAssignmentsRegular": "You have not been assigned any payments from organizations you have access to",
    "accessOrganizations": "Organizations you have access to:"
  },
  "status": {
    "pending": "Pending",
    "overdue": "Overdue",
    "paid": "Paid",
    "active": "Active",
    "cancelled": "Cancelled"
  }
}
```

## Kế hoạch triển khai

### Bước 1: Tạo file i18n (30 phút)

1. Tạo `vi/myPayments.json` với translations tiếng Việt
2. Tạo `en/myPayments.json` với translations tiếng Anh
3. Test import vào component

### Bước 2: Cập nhật MyCampaignsPage component (60 phút)

1. Import `useTranslation` hook từ react-i18next
2. Thay thế tất cả hardcode strings bằng `t()` calls
3. Cập nhật status dropdown options
4. Cập nhật table headers và action buttons

### Bước 3: Test chức năng (30 phút)

1. Test chuyển đổi ngôn ngữ
2. Kiểm tra tất cả text được translate đúng
3. Verify responsive design không bị ảnh hưởng

### Bước 4: Format dates theo locale (30 phút)

1. Cập nhật format date theo locale (vi-VN/en-US)
2. Format currency hiển thị phù hợp với ngôn ngữ

## Lợi ích sau khi triển khai

1. **Đa ngôn ngữ**: Hỗ trợ tiếng Việt và tiếng Anh
2. **Maintainability**: Dễ dàng thêm/sửa text content
3. **Consistency**: Đồng bộ với hệ thống i18n đã có
4. **User Experience**: Cải thiện trải nghiệm người dùng quốc tế
5. **Scalability**: Dễ dàng thêm ngôn ngữ mới trong tương lai

## Estimated Time: 2.5 giờ

## Dependencies

- react-i18next đã được setup trong project
- Locale files structure đã có sẵn (/vi/, /en/)
- useTranslation hook available

## Risk Assessment

- **Low risk**: Chỉ thay đổi content text, không ảnh hưởng logic
- **Testing needed**: Cần test kỹ để đảm bảo không miss text nào
- **Layout considerations**: Một số text tiếng Anh có thể dài hơn tiếng Việt
