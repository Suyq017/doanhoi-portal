# 🚀 Quick Fix: Update Super Admin Permissions on Server

## ⚡ Fast Track (Recommended)

**On Production Server:**

```bash
cd backend

# Option 1: Using production script (will prompt for password)
chmod +x update-permissions-prod.sh
./update-permissions-prod.sh

# Option 2: Set env vars and run
export NODE_ENV=production
export DB_HOST=doanhoi-postgres-prod
export DB_PORT=5432
export DB_PASSWORD=your_password

npm run update:permissions
npm run update:super-admin

# Verify the fix
npm run verify:super-admin
```

## 📋 What Was Fixed

### Missing Permissions Added:
1. ✅ **`system-config.access`** - Access system configuration (AWS S3, PayOS, etc.)
2. ✅ **`ctxh.import.old_system`** - Import CTXH data from old system

### Files Updated:
- `src/database/scripts/update-super-admin-role.ts` - Added missing permissions
- `src/database/seeds/roles.seed.ts` - Updated Super Admin permissions list

### New Tool Added:
- `npm run verify:super-admin` - Verify super_admin has all expected permissions

## 🔍 Verification

After running the update, verify with:

```bash
npm run verify:super-admin
```

**Expected Output:**
```
✅ ALL EXPECTED PERMISSIONS ARE PRESENT!
   Expected: 54 permissions
   Actual: 54 permissions
   Missing: 0
   Extra: 0
```

## 🐛 If Still Having Issues

### Issue: Permission not showing in UI

**Cause:** Frontend cache or token needs refresh

**Fix:**
```bash
# Backend: Restart server
pm2 restart doanhoi-backend

# Frontend: Clear cache
# In browser: Ctrl+Shift+Delete → Clear cache
# Or: Logout and login again (gets new JWT token with updated permissions)
```

### Issue: Database connection error

**Fix:**
```bash
# Run from inside Docker container
docker exec -it doanhoi-backend bash
cd /app
npm run update:super-admin
exit
```

## 📊 Complete Permission List

Super Admin now has **54 permissions**:

### System (1)
- `system-config.access`

### Dashboard (1)
- `dashboard.access`

### Users (6)
- `users.access`, `users.create`, `users.view_details`
- `users.update`, `users.delete`, `users.export`

### Organizations (8)
- `organizations.access`, `organizations.create`
- `organizations.view_member_count`, `organizations.access_children`
- `organizations.update`, `organizations.delete`
- `organizations.add_member`, `organizations.remove_member`

### Departments (5)
- `departments.access`, `departments.create`, `departments.view_details`
- `departments.update`, `departments.delete`

### Classes (5)
- `classes.access`, `classes.create`, `classes.view_details`
- `classes.update`, `classes.delete`

### Permissions (5)
- `permissions.access`, `permissions.create`, `permissions.update`
- `permissions.delete`, `permissions.view_details`

### CTXH (14)
- `ctxh.access`
- Categories: `view`, `create`, `update`, `delete`
- Activities: `view`, `create`, `update`, `delete`, `manage_participants`
- Reports: `view`, `export`
- Config: `manage`
- Import: `import.old_system` ⭐ **NEW**

### Payments (9)
- `payment-campaigns.access`, `payment-campaigns.create`
- `payment-campaigns.read`, `payment-campaigns.update`
- `payment-campaigns.delete`, `payment-campaigns.manage_assignments`
- `payment-campaigns.view_reports`, `payment-campaigns.export`
- `my-payments.access`

---

**Last Updated:** November 9, 2025
**Version:** 1.1.0
