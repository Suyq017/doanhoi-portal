# Hướng dẫn cập nhật Permissions và Roles

## 📋 Tổng quan

Bộ script này giúp đồng bộ permissions và role `super_admin` trong database mà không cần reset toàn bộ dữ liệu.

Flow hiện tại đã được gộp:

- `update:permissions` sẽ vừa cập nhật permissions, vừa sync luôn `super_admin`.
- `update:super-admin` vẫn giữ để chạy riêng khi cần re-sync role.
- `verify:super-admin` dùng để kiểm tra sau khi update.

## 🎯 Khi nào cần chạy?

- Khi thêm permission mới vào `permissions.seed.ts`
- Khi chỉnh sửa metadata permission (name, description, category, context, sortOrder)
- Sau khi merge code có thay đổi về permissions/roles
- Khi cần đồng bộ lại quyền `super_admin` trên môi trường đang chạy

## 🚀 Cách sử dụng

### Option 1: Script tổng hợp (khuyên dùng)

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

### Option 2: Dùng npm scripts

**Chạy flow gộp (đủ cho hầu hết trường hợp):**

```bash
cd backend
npm run update:permissions
```

**Verify sau khi cập nhật (khuyến nghị):**

```bash
npm run verify:super-admin
```

**Khi cần chỉ re-sync role `super_admin` mà không seed lại permissions:**

```bash
npm run update:super-admin
```

## 📝 Chi tiết scripts

### 1. `update:permissions`

- File: `src/database/scripts/update-super-admin-role.ts` (mode `--with-seed`)
- Chức năng:
  - Cập nhật permissions theo `permissions.seed.ts` (thêm mới + update metadata)
  - Đồng bộ role `super_admin` theo danh sách chuẩn `SUPER_ADMIN_PERMISSION_CODES`

### 2. `update:super-admin`

- File: `src/database/scripts/update-super-admin-role.ts`
- Chức năng:
  - Chỉ đồng bộ role `super_admin` theo danh sách quyền chuẩn
  - Hữu ích khi permissions đã có sẵn nhưng role đang thiếu quyền

### 3. `verify:super-admin`

- File: `src/database/scripts/verify-super-admin-permissions.ts`
- Chức năng:
  - Kiểm tra role `super_admin` có đủ quyền theo danh sách chuẩn không
  - Hiển thị thiếu/thừa theo category
  - Exit code `0` nếu OK, `1` nếu còn thiếu quyền

## ✅ Nguồn dữ liệu chuẩn

- Danh sách permissions chuẩn: `src/database/seeds/permissions.seed.ts`
- Danh sách quyền gán cho `super_admin`: `SUPER_ADMIN_PERMISSION_CODES` trong `src/database/scripts/update-super-admin-role.ts`

Lưu ý: `verify:super-admin` dùng chung `SUPER_ADMIN_PERMISSION_CODES`, tránh lệch dữ liệu giữa script update và script verify.

## 🔧 Troubleshooting

### Lỗi: `super_admin role not found`

```bash
npm run seed
```

### Lỗi: thiếu permission trong database

```bash
npm run update:permissions
npm run verify:super-admin
```

### Lỗi kết nối database

- Kiểm tra biến môi trường trong `.env`
- Đảm bảo database đang chạy
- Kiểm tra host/port/user/password theo môi trường

## 📚 Files liên quan

```text
backend/
├── src/
│   └── database/
│       ├── scripts/
│       │   ├── update-super-admin-role.ts
│       │   └── verify-super-admin-permissions.ts
│       └── seeds/
│           ├── permissions.seed.ts
│           └── roles.seed.ts
├── update-permissions.sh
├── update-permissions.ps1
└── package.json
```

## 💡 Lưu ý

- ⚠️ Nên backup database trước khi chạy trên production
- ✅ Script update là idempotent, có thể chạy lặp lại an toàn
- ✅ Không reset database, không drop role/permission ngoài phạm vi script

## 🎯 Best Practices

1. Sau khi thêm/chỉnh permission trong code:

```bash
npm run update:permissions
npm run verify:super-admin
```

2. Trước khi deploy production:

```bash
./update-permissions.sh
npm run verify:super-admin
```

3. Khi cần sửa nóng role `super_admin`:

```bash
npm run update:super-admin
npm run verify:super-admin
```

---

**Phiên bản:** 1.1.0
**Cập nhật:** 2026-04-23
