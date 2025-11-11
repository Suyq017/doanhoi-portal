# Hướng dẫn cập nhật Permissions và Roles

## 📋 Tổng quan

Scripts này giúp cập nhật permissions và role super_admin trong database mà không cần reset toàn bộ database.

## 🎯 Khi nào cần chạy?

- Khi thêm permissions mới vào `permissions.seed.ts`
- Khi cập nhật thông tin permissions (name, description, category, etc.)
- Khi cần cập nhật role super_admin với permissions mới
- Sau khi merge code có thay đổi về permissions

## 🚀 Cách sử dụng

### Option 1: Chạy script tổng hợp (Khuyên dùng)

**Windows (PowerShell):**
```powershell
cd backend
.\update-permissions.ps1
```

**Linux/Mac (Bash):**
```bash
cd backend
chmod +x update-permissions.sh
./update-permissions.sh
```

### Option 2: Chạy từng bước riêng lẻ

**Bước 1: Cập nhật permissions**
```bash
cd backend
npm run update:permissions
```

**Bước 2: Cập nhật super_admin role**
```bash
npm run update:super-admin
```

**Bước 3: Verify permissions (Optional)**
```bash
npm run verify:super-admin
```

## 📝 Chi tiết scripts

### 1. `update:permissions`
- File: `src/database/scripts/update-permissions.ts`
- Chức năng:
  - Tạo permissions mới nếu chưa tồn tại
  - Cập nhật thông tin permissions đã tồn tại
  - Giữ nguyên các permissions không có trong seed

### 2. `update:super-admin`
- File: `src/database/scripts/update-super-admin-role.ts`
- Chức năng:
  - Cập nhật role super_admin với tất cả permissions mới
  - Hiển thị danh sách permissions mới được thêm
  - Cảnh báo nếu có permissions bị thiếu trong database

### 3. `verify:super-admin` (Mới)
- File: `src/database/scripts/verify-super-admin-permissions.ts`
- Chức năng:
  - Kiểm tra xem super_admin có đầy đủ permissions không
  - Hiển thị tất cả permissions theo category
  - Phát hiện permissions bị thiếu hoặc thừa
  - Exit code 0 nếu OK, 1 nếu có vấn đề
- Usage:
  ```bash
  npm run verify:super-admin
  ```

## ✅ Những gì đã được sửa

### Permissions đã bổ sung cho super_admin:
- ✅ `system-config.access` - Truy cập cấu hình hệ thống (AWS S3, PayOS, etc.)
- ✅ `ctxh.import.old_system` - Nhập dữ liệu CTXH từ hệ thống cũ
- ✅ `ctxh.reports.view` - Xem báo cáo CTXH
- ✅ `ctxh.reports.export` - Xuất báo cáo CTXH

### Cấu trúc permissions hiện tại:

#### Dashboard (1 permission)
- `dashboard.access`

#### Users (6 permissions)
- `users.access`, `users.create`, `users.view_details`
- `users.update`, `users.delete`, `users.export`

#### Organizations (8 permissions)
- `organizations.access`, `organizations.create`
- `organizations.view_member_count`, `organizations.access_children`
- `organizations.update`, `organizations.delete`
- `organizations.add_member`, `organizations.remove_member`

#### Departments (5 permissions)
- `departments.access`, `departments.create`, `departments.view_details`
- `departments.update`, `departments.delete`

#### Classes (5 permissions)
- `classes.access`, `classes.create`, `classes.view_details`
- `classes.update`, `classes.delete`

#### Permissions Management (5 permissions)
- `permissions.access`, `permissions.create`, `permissions.update`
- `permissions.delete`, `permissions.view_details`

#### System Configuration (1 permission)
- `system-config.access`

#### CTXH (14 permissions)
- `ctxh.access`
- Categories: `view`, `create`, `update`, `delete`
- Activities: `view`, `create`, `update`, `delete`, `manage_participants`
- Reports: `view`, `export`
- Config: `manage`
- Import: `import.old_system`

#### Payment Campaigns (9 permissions)
- `payment-campaigns.access`, `payment-campaigns.create`
- `payment-campaigns.read`, `payment-campaigns.update`
- `payment-campaigns.delete`, `payment-campaigns.manage_assignments`
- `payment-campaigns.view_reports`, `payment-campaigns.export`
- `my-payments.access`

**Tổng cộng: 54 permissions** cho role super_admin

## 🔧 Troubleshooting

### Lỗi: "super_admin role not found"
```bash
# Chạy lại database seeding
npm run seed
```

### Lỗi: "Permission not found in database"
```bash
# Chạy update permissions trước
npm run update:permissions
# Sau đó chạy update super_admin
npm run update:super-admin
```

### Lỗi kết nối database
- Kiểm tra file `.env` có đúng thông tin database không
- Đảm bảo database đang chạy
- Kiểm tra `data-source.ts` configuration

## 📚 Files liên quan

```
backend/
├── src/
│   └── database/
│       ├── scripts/
│       │   ├── update-permissions.ts          # Script cập nhật permissions
│       │   └── update-super-admin-role.ts     # Script cập nhật super_admin
│       └── seeds/
│           ├── permissions.seed.ts             # Định nghĩa permissions
│           └── roles.seed.ts                   # Định nghĩa roles
├── update-permissions.sh                       # Bash script tổng hợp
├── update-permissions.ps1                      # PowerShell script tổng hợp
└── package.json                                # NPM scripts
```

## 💡 Lưu ý

- ⚠️ **Luôn backup database** trước khi chạy scripts
- ✅ Scripts này **KHÔNG xóa** permissions hay roles đã tồn tại
- ✅ Scripts này **CHỈ thêm mới và cập nhật**
- 🔄 An toàn để chạy nhiều lần
- 📊 Hiển thị chi tiết những gì đã được thêm/cập nhật

## 🎯 Best Practices

1. **Sau khi thêm permission mới vào code:**
   ```bash
   # Cập nhật database
   npm run update:permissions
   npm run update:super-admin
   ```

2. **Trước khi deploy lên production:**
   ```bash
   # Chạy trên môi trường staging trước
   ./update-permissions.sh
   # Kiểm tra kỹ logs
   # Sau đó mới chạy trên production
   ```

3. **Khi làm việc nhóm:**
   - Pull code mới về
   - Chạy update scripts để đồng bộ database
   - Tránh conflict về permissions

## 📞 Support

Nếu gặp vấn đề, hãy:
1. Kiểm tra logs chi tiết từ scripts
2. Xem file `UPDATE_PERMISSIONS_GUIDE.md` này
3. Liên hệ team lead hoặc DevOps

---

**Phiên bản:** 1.0.0  
**Cập nhật:** 2025-10-30
