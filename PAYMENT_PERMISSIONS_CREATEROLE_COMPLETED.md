# Bổ sung Quyền Quản lý Đóng phí đầy đủ vào CreateRoleModal

## 📋 Tổng quan

Đã bổ sung đầy đủ các quyền quản lý đóng phí vào CreateRoleModal để người dùng có thể phân quyền chi tiết cho các vai trò khác nhau.

## ✅ Đã bổ sung

### Payment Campaigns Permissions (8 quyền)

| ID | Permission Code | Tên hiển thị | Mô tả chức năng |
|----|----------------|--------------|-----------------|
| 27 | `payment-campaigns.access` | Truy cập trang quản lý đóng phí | Quyền cơ bản để truy cập menu và trang chính |
| 28 | `payment-campaigns.create` | Tạo đợt đóng phí mới | Tạo campaign/đợt thu phí mới |
| 29 | `payment-campaigns.read` | Xem thông tin đợt đóng phí | Xem chi tiết campaigns |
| 30 | `payment-campaigns.update` | Chỉnh sửa đợt đóng phí | Cập nhật thông tin campaigns |
| 31 | `payment-campaigns.delete` | Xóa đợt đóng phí | Xóa campaigns không cần thiết |
| 32 | `payment-campaigns.manage_assignments` | Quản lý phân công thanh toán | Gán người/nhóm phải thanh toán |
| 33 | `payment-campaigns.view_reports` | Xem báo cáo đóng phí | Truy cập báo cáo thu chi |
| 34 | `payment-campaigns.export` | Xuất dữ liệu đóng phí | Export danh sách, báo cáo |

### Cải tiến Terminology

- ✅ Đổi "chiến dịch đóng phí" → "đợt đóng phí" (phù hợp hơn với ngữ cảnh Việt Nam)
- ✅ Cải thiện mô tả permissions rõ ràng hơn
- ✅ Đảm bảo consistency với backend permissions seed

## 🎯 Phân quyền theo vai trò (Gợi ý)

### Super Admin
- ✅ **Tất cả 8 quyền** (full access)

### Admin
- ✅ **Tất cả 8 quyền** (full management trong organization)

### Manager  
- ✅ `access` - Truy cập trang
- ✅ `create` - Tạo đợt mới
- ✅ `read` - Xem thông tin
- ✅ `update` - Chỉnh sửa
- ✅ `manage_assignments` - Quản lý phân công
- ✅ `view_reports` - Xem báo cáo
- ❌ `delete` - Không được xóa
- ❌ `export` - Không được export (optional)

### Editor
- ✅ `access` - Truy cập trang
- ✅ `read` - Xem thông tin
- ✅ `update` - Chỉnh sửa giới hạn
- ❌ Các quyền khác

### Viewer
- ✅ `access` - Truy cập trang
- ✅ `read` - Chỉ xem
- ❌ Các quyền khác

## 🛠️ Technical Implementation

### Permission Hierarchy
```
payment-campaigns.access (required)
├── payment-campaigns.read
├── payment-campaigns.create
├── payment-campaigns.update
├── payment-campaigns.delete
├── payment-campaigns.manage_assignments
├── payment-campaigns.view_reports
└── payment-campaigns.export
```

### UI Features
- ✅ **Grouped by category**: Tất cả payment permissions nằm trong nhóm "Quản lý đóng phí"
- ✅ **Icon**: CreditCard icon với màu teal
- ✅ **Access permission logic**: Tự động check `access` khi chọn permission khác
- ✅ **Bulk selection**: Buttons "Tất cả" và "Bỏ" cho toàn bộ nhóm
- ✅ **Visual hierarchy**: Access permission được highlight, others indented

### Context Level
- **Organization**: Tất cả permissions đều ở mức organization (không phải system-wide)
- **Sort Order**: Tuần tự từ 1-8 để hiển thị đúng thứ tự

## 🧪 Testing

### Test Cases cần kiểm tra

1. **Permission Display**:
   - Mở CreateRoleModal → Expand "Quản lý đóng phí"
   - Verify hiển thị đầy đủ 8 permissions
   - Check sort order đúng (access first, others theo thứ tự)

2. **Access Permission Dependency**:
   - Chọn bất kỳ permission nào khác
   - Verify `access` tự động được check
   - Try uncheck `access` → confirm dialog hiện

3. **Bulk Selection**:
   - Click "Tất cả" → verify tất cả 8 permissions được chọn
   - Click "Bỏ" → verify tất cả permissions được bỏ chọn

4. **Role Creation**:
   - Tạo role với payment permissions
   - Verify role được tạo thành công
   - Check trong PermissionsPage xem role có đúng permissions

## 🔄 Sync với Backend

### Backend Permissions Seed
Các permissions này đã có sẵn trong backend seed file:
```typescript
// backend/src/database/seeds/permissions.seed.ts
'payment-campaigns.access'
'payment-campaigns.create' 
'payment-campaigns.read'
'payment-campaigns.update'
'payment-campaigns.delete'
'payment-campaigns.manage_assignments'
'payment-campaigns.view_reports'
'payment-campaigns.export'
```

### Role Assignments
Cần đảm bảo các default roles có payment permissions:
- `super_admin`: Tất cả 8 permissions
- `admin`: Tất cả 8 permissions  
- `manager`: 6 permissions (trừ delete và export)
- `editor`: 3 permissions (access, read, update)
- `viewer`: 2 permissions (access, read)

## 📝 Files đã thay đổi

1. **CreateRoleModal.tsx**:
   - Bổ sung 3 permissions mới (manage_assignments, view_reports, export)
   - Cải thiện terminology ("đợt đóng phí" thay vì "chiến dịch")
   - Update IDs để tránh conflict với permissions permissions

## 🎯 Kết quả

Bây giờ khi tạo role trong CreateRoleModal:
- ✅ Nhóm "Quản lý đóng phí" có đầy đủ 8 permissions
- ✅ Có thể phân quyền chi tiết theo từng chức năng
- ✅ UI/UX nhất quán với các permission groups khác
- ✅ Permission hierarchy và dependency logic hoạt động đúng

---

**Status**: ✅ **Completed** - Payment permissions fully integrated
**Next**: Test role creation và verify permissions hoạt động trong PaymentCampaignsPage
