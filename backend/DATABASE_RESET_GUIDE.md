# Database Reset Guide

## 📋 Overview

Script `npm run db:reset` sẽ **XÓA HOÀN TOÀN** database hiện tại và tạo lại từ đầu với dữ liệu mặc định.

## ⚠️ WARNING

**CẢNH BÁO:** Script này sẽ:
- ✅ DROP tất cả tables
- ✅ DROP tất cả sequences
- ✅ Tạo lại schema từ đầu
- ✅ Seed dữ liệu mặc định (permissions, roles, users)
- ❌ **MẤT TẤT CẢ** dữ liệu cũ (organizations, departments, classes, ctxh activities, etc.)

**CHỈ SỬ DỤNG KHI:**
- Muốn reset database về trạng thái ban đầu
- Development/Testing environment
- **KHÔNG BAO GIỜ** chạy trên Production có dữ liệu thật!

## 🚀 Usage

### Development Environment

```bash
# Full reset: Drop all tables + Create schema + Seed data
npm run db:reset

# Or step by step:
npm run db:drop    # Chỉ drop tables
npm run seed       # Chỉ seed data (sau khi đã có schema)
```

### Production Environment (⚠️ CẨN THẬN!)

```bash
# Backup database trước khi reset!
pg_dump -U postgres -d doanhoi > backup_$(date +%Y%m%d_%H%M%S).sql

# Sau đó mới reset
npm run db:reset
```

## 📦 What Gets Seeded

Sau khi reset, database sẽ có:

### 1. Permissions (~150+ permissions)
- **users.*** - Quản lý người dùng
- **organizations.*** - Quản lý tổ chức
- **departments.*** - Quản lý khoa
- **classes.*** - Quản lý lớp
- **roles.*** - Quản lý vai trò
- **permissions.*** - Quản lý quyền
- **ctxh.*** - Quản lý hoạt động cộng đồng (CTXH)
  - `ctxh.access` - Truy cập CTXH module
  - `ctxh.categories.*` - CRUD categories
  - `ctxh.activities.*` - CRUD activities
  - `ctxh.participants.*` - Quản lý sinh viên tham gia
  - `ctxh.limits.*` - Cấu hình giới hạn điểm

### 2. Roles (3 roles)
- **super_admin** - Có TẤT CẢ permissions
- **admin** - Có hầu hết permissions (trừ system-level)
- **user** - Chỉ có quyền xem cơ bản

### 3. Default Users (3 users)

| Username | Password | Role | Email |
|----------|----------|------|-------|
| superadmin | Admin@123 | super_admin | superadmin@doanhoi.edu.vn |
| admin | Admin@123 | admin | admin@doanhoi.edu.vn |
| user | User@123 | user | user@doanhoi.edu.vn |

## 🔍 Script Details

### `npm run db:reset`
Chạy 2 scripts liên tiếp:
1. `ts-node src/database/reset-database.ts` - DROP + CREATE schema
2. `ts-node src/database/seeds/index.ts` - Seed data

### `reset-database.ts` Flow

```typescript
1. Connect to database
2. Drop all tables (CASCADE)
   ├── organizations
   ├── departments
   ├── classes
   ├── users
   ├── roles
   ├── permissions
   ├── ctxh_activities
   ├── ctxh_categories
   └── ... (all tables)
3. Drop all sequences
4. Synchronize schema (create fresh tables)
5. Show created tables
```

### `seeds/index.ts` Flow

```typescript
1. seedPermissions() - Tạo ~150 permissions
2. seedRoles() - Tạo 3 roles + gán permissions
3. seedDefaultUsers() - Tạo 3 default users
```

## 📊 Expected Output

### Successful Reset

```bash
$ npm run db:reset

🔄 Connecting to database...
📡 Host: 127.0.0.1:9000
🗄️  Database: doanhoi
✅ Connected to database

🗑️  Dropping all existing tables...
   Found 25 tables to drop:
   - classes
   - ctxh_activities
   - ctxh_categories
   - ctxh_participants
   - departments
   - organizations
   - permissions
   - roles
   - users
   ...
   ✓ Dropped: classes
   ✓ Dropped: ctxh_activities
   ...
✅ All tables dropped successfully

🗑️  Dropping all sequences...
   Found 15 sequences to drop
   ✓ Dropped: classes_id_seq
   ✓ Dropped: ctxh_activities_id_seq
   ...
✅ All sequences dropped successfully

🔨 Creating fresh database schema...
✅ Fresh schema created successfully

📋 New tables created:
  ✓ classes
  ✓ ctxh_activities
  ✓ ctxh_categories
  ✓ ctxh_limit_configs
  ✓ ctxh_participants
  ✓ departments
  ✓ organizations
  ✓ permissions
  ✓ role_permissions
  ✓ roles
  ✓ user_organizations
  ✓ user_roles
  ✓ users

✅ Database reset completed successfully!
📝 Next step: Run "npm run seed" to populate initial data

Database connection established
1. Starting permissions seeding...
   Creating permission: users.view
   Creating permission: users.create
   ...
   Creating permission: ctxh.access
   Creating permission: ctxh.activities.view
   ...
✅ Permissions seeding completed! Total: 150 permissions

2. Starting roles seeding...
   Creating role: super_admin with ALL permissions
   Creating role: admin with 120 permissions
   Creating role: user with 15 permissions
✅ Roles seeding completed!

3. Starting default users seeding...
   Creating user: superadmin (super_admin@doanhoi.edu.vn)
   Creating user: admin (admin@doanhoi.edu.vn)
   Creating user: user (user@doanhoi.edu.vn)
✅ Default users created!

🎉 All seeding completed successfully!
You can now login with the default credentials shown above.
```

## 🛠️ Troubleshooting

### Error: "Cannot connect to database"

```bash
# Check if PostgreSQL is running
docker-compose ps

# Start PostgreSQL if not running
docker-compose up -d postgres

# Check logs
docker-compose logs postgres
```

### Error: "Permission denied to drop table"

```bash
# Ensure you're using correct database user
# Check .env file:
DB_USERNAME=postgres
DB_PASSWORD=your_password
```

### Error: "Database does not exist"

```bash
# Create database first
docker-compose exec postgres psql -U postgres -c "CREATE DATABASE doanhoi;"

# Then run reset
npm run db:reset
```

## 📝 Notes

### For Development
- ✅ Chạy `npm run db:reset` bất cứ khi nào cần
- ✅ Dữ liệu test sẽ mất nhưng có thể tạo lại dễ dàng

### For Production
- ❌ **KHÔNG BAO GIỜ** chạy `npm run db:reset` trên Production
- ✅ Dùng migrations thay vì reset
- ✅ Backup database trước khi thay đổi schema
- ✅ Dùng `npm run db:create-schema` (không drop tables)

## 🔄 Alternative: Migrations (Recommended for Production)

Thay vì reset, nên dùng migrations:

```bash
# Generate migration from entity changes
npm run typeorm migration:generate -- -n AddCTXHPermissions

# Run pending migrations
npm run typeorm migration:run

# Revert last migration
npm run typeorm migration:revert
```

## 📚 Related Scripts

| Script | Purpose | Destructive? |
|--------|---------|--------------|
| `npm run db:reset` | Drop all + Create + Seed | ✅ YES |
| `npm run db:drop` | Drop all tables only | ✅ YES |
| `npm run db:create-schema` | Sync schema (no drop) | ❌ NO |
| `npm run seed` | Seed data only | ❌ NO |
| `npm run seed:permissions` | Seed permissions only | ❌ NO |
| `npm run seed:roles` | Seed roles only | ❌ NO |
| `npm run seed:users` | Seed users only | ❌ NO |

## 🎯 Use Cases

### 1. Fresh Start Development
```bash
npm run db:reset
# Database now has clean structure + default data
```

### 2. Update Permissions Schema
```bash
# Edit src/database/seeds/permissions.seed.ts
# Add new CTXH permissions
npm run db:reset
# All permissions updated
```

### 3. Fix Corrupted Database
```bash
npm run db:reset
# Database restored to known good state
```

### 4. Testing
```bash
# Before each test suite
npm run db:reset
# Run tests on clean database
npm test
```

## ⚡ Quick Reference

```bash
# Full reset (development)
npm run db:reset

# Check database after reset
docker-compose exec postgres psql -U postgres -d doanhoi -c "\dt"

# Login with default credentials
curl -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"superadmin","password":"Admin@123"}'
```
