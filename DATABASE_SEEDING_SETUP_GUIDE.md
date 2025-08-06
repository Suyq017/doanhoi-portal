# Database Seeding Setup Guide

## Tóm tắt

Đã tạo hoàn chỉnh hệ thống seeding database với:
- ✅ **Payment Permissions**: 8 quyền mới cho quản lý đóng phí
- ✅ **Enhanced Roles**: Cập nhật tất cả roles với payment permissions
- ✅ **Default Users**: 3 users mặc định với các roles khác nhau
- ✅ **Super Admin**: User có toàn quyền trong hệ thống
- ✅ **Automated Scripts**: Scripts để chạy seeding dễ dàng

## Database Structure

### Permissions Added (8 new payment permissions)
```typescript
'payment-campaigns.access'          // Truy cập quản lý đóng phí
'payment-campaigns.create'          // Tạo chiến dịch đóng phí
'payment-campaigns.read'            // Xem thông tin chiến dịch đóng phí  
'payment-campaigns.update'          // Cập nhật chiến dịch đóng phí
'payment-campaigns.delete'          // Xóa chiến dịch đóng phí
'payment-campaigns.manage_assignments' // Quản lý phân công đóng phí
'payment-campaigns.view_reports'    // Xem báo cáo đóng phí
'payment-campaigns.export'          // Xuất báo cáo đóng phí
```

### Roles & Their Payment Permissions

| Role | Payment Permissions | Description |
|------|-------------------|-------------|
| **super_admin** | ALL payment permissions | System-wide access, toàn quyền |
| **admin** | ALL payment permissions | Organization admin, full access |
| **manager** | access, create, read, update, manage_assignments, view_reports | Limited management |
| **editor** | read only | Chỉ xem được |
| **viewer** | read only | Chỉ xem được |

### Default Users Created

| User | Email | Password | Role | Access Level |
|------|-------|----------|------|-------------|
| **Super Admin** | superadmin@doanhoi.com | SuperAdmin@123 | super_admin | System-wide |
| **Admin** | admin@doanhoi.com | Admin@123 | admin | Organization |
| **Manager** | manager@doanhoi.com | Manager@123 | manager | Limited |

## How to Run Seeding

### Option 1: Quick Setup (Recommended)
```bash
# Windows
cd backend
npm run db:setup

# Or run PowerShell script directly
cd backend/scripts
./seed-database.ps1
```

### Option 2: Manual Steps
```bash
cd backend

# Run all seeders at once
npm run seed

# Or run individually
npm run seed:permissions
npm run seed:roles  
npm run seed:users
```

### Option 3: Direct TypeScript
```bash
cd backend
npx ts-node src/database/seeds/index.ts
```

## Verification Steps

### 1. Check Database Tables
```sql
-- Check permissions count (should be ~30+)
SELECT COUNT(*) FROM permissions;

-- Check payment permissions
SELECT * FROM permissions WHERE category = 'payments';

-- Check roles and their permissions
SELECT r.name, r.display_name, COUNT(rp.permission_id) as permission_count
FROM roles r
LEFT JOIN role_permissions rp ON r.id = rp.role_id  
GROUP BY r.id, r.name, r.display_name;

-- Check users created
SELECT code, email, family_name, given_name FROM users;

-- Check user roles
SELECT u.email, r.name as role_name, ur.organization_id
FROM users u
JOIN user_roles ur ON u.id = ur.user_id
JOIN roles r ON ur.role_id = r.id;
```

### 2. Test Login & Permissions

1. **Start Backend**:
   ```bash
   cd backend
   npm run start:dev
   ```

2. **Start Frontend**:
   ```bash
   cd frontend  
   npm run dev
   ```

3. **Test Login**:
   - Login with `superadmin@doanhoi.com` / `SuperAdmin@123`
   - Should see ALL navigation items including payment management
   - Go to Permissions page and create a new role
   - Should see "Quản lý đóng phí" group with 8 permissions

### 3. Test CreateRoleModal
- Navigate to `/permissions`
- Click "Tạo vai trò mới"
- Look for "Quản lý đóng phí" section with CreditCard icon
- Expand and verify 8 payment permissions are listed
- Test select all/deselect all functionality

## File Structure

```
backend/
├── src/
│   └── database/
│       └── seeds/
│           ├── index.ts                    # Main seeding orchestrator
│           ├── permissions.seed.ts         # Updated with payment permissions
│           ├── roles.seed.ts              # Updated with payment permissions
│           └── default-users.seed.ts      # NEW: Creates default users
├── scripts/
│   ├── seed-database.js                   # Node.js seeding script
│   └── seed-database.ps1                  # PowerShell seeding script
└── package.json                           # Updated with seeding scripts
```

## Seeding Process Flow

1. **Permissions Seeding**: Creates all permissions including 8 new payment permissions
2. **Roles Seeding**: Creates 5 roles with appropriate permissions assigned
3. **Users Seeding**: Creates 3 default users with role assignments
4. **Organization Setup**: Creates ROOT organization for context

## Permission Categories

```typescript
// All permission categories now include:
'dashboard'     // Dashboard access
'users'         // User management  
'organizations' // Organization management
'departments'   // Department management
'classes'       // Class management
'permissions'   // Permission management
'payments'      // NEW: Payment management
```

## Security Features

- ✅ **Hashed Passwords**: All passwords are bcrypt hashed
- ✅ **Email Verification**: Default users have emailVerified=true
- ✅ **Role Context**: System roles (super_admin) don't need organization context
- ✅ **Permission Hierarchy**: Access permissions are required for other permissions
- ✅ **Unique Constraints**: Email and user codes are unique

## Troubleshooting

### Common Issues:

1. **"Permission already exists" errors**:
   - Normal behavior, seeder checks for existing records
   - Safe to re-run multiple times

2. **Database connection errors**:
   - Check `.env` file configuration
   - Ensure PostgreSQL is running
   - Verify database exists

3. **TypeScript compilation errors**:
   - Run `npm install` to ensure dependencies
   - Check if bcrypt is properly installed

4. **"Role not found" errors**:
   - Run permissions seeding before roles seeding
   - Use main seeder (`npm run seed`) which runs in correct order

### Reset Everything:
```bash
# If you need to start fresh
npm run db:reset
```

## Next Steps After Seeding

1. ✅ **Login Testing**: Test login with all 3 default users
2. 🔄 **Navigation Testing**: Verify payment menus show/hide based on permissions  
3. 🔄 **CreateRoleModal Testing**: Test creating roles with payment permissions
4. 🔄 **Payment Pages**: Create actual payment management pages
5. 🔄 **Route Guards**: Implement route-level permission checking

---

**Status**: ✅ Database seeding completed successfully  
**Ready for**: Full application testing with proper permissions
