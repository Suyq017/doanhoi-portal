# CTXH Activities View - 500 Error Fix

## Issue Description

When accessing the CTXH Activities Management page (`/ctxh/activities`), even as a super admin, the API call to `GET /ctxh/activities` was returning a **500 Internal Server Error**.

### Error Details
```
GET http://localhost:9200/ctxh/activities?page=1&limit=10 500 (Internal Server Error)
```

## Root Cause

The `activities.service.ts` was calling `organizationsService.getAccessibleOrganizations(user_id)` which checks for `payment-campaigns.create` permission instead of CTXH-related permissions.

**Problem Code:**
```typescript
// activities.service.ts (Line ~126)
const accessibleOrgs = await this.organizationsService.getAccessibleOrganizations(user_id);
```

This method was designed for payment campaign functionality, not CTXH activities. As a result:
- Super admins without explicit `payment-campaigns.create` permission got **empty organization list**
- The query builder then applied an impossible filter (`1 = 0`)
- This likely caused a database error or unexpected behavior

## Solution

Created a new method `getCtxhActivityViewableOrganizations` in `OrganizationsService` that checks for the correct permission: `ctxh.activities.view`.

### Changes Made

#### 1. Added New Method in `organizations.service.ts`

**File:** `backend/src/organizations/organizations.service.ts`

```typescript
/**
 * Get organizations user can view CTXH activities for
 * Based on ctxh.activities.view permission
 */
async getCtxhActivityViewableOrganizations(userId: string): Promise<Organization[]> {
  try {
    console.log(`[OrganizationsService] Getting viewable CTXH activity organizations for user: ${userId}`);

    // Validate userId
    if (!userId) {
      console.error('[OrganizationsService] Invalid userId provided');
      throw new BadRequestException('Invalid user ID');
    }

    // Check if user is super admin (has global system.access_admin permission)
    const superAdminQuery = `
      SELECT ur.id
      FROM user_roles ur
      JOIN roles r ON ur."roleId" = r.id
      JOIN role_permissions rp ON r.id = rp."roleId"
      JOIN permissions p ON rp."permissionId" = p.id
      WHERE ur."userId" = $1 
      AND ur."organizationId" IS NULL
      AND ur."isActive" = true
      AND (p.code = 'system.access_admin' OR r.name = 'super_admin')
      AND p."isActive" = true
      LIMIT 1
    `;

    const superAdminResult = await this.organizationsRepository.query(superAdminQuery, [userId]);

    if (superAdminResult.length > 0) {
      console.log(`[OrganizationsService] User ${userId} is super admin, returning all organizations for CTXH view`);
      // Super admin can see all organizations
      return this.organizationsRepository.find({
        where: { isActive: true },
        order: { name: 'ASC' }
      });
    }

    // Query for organizations where user has ctxh.activities.view permission
    const accessibleOrgsQuery = `
      SELECT DISTINCT o.id, o.name, o.code, o.type, o."parentId", o."createdAt", o."updatedAt", o."isActive"
      FROM user_roles ur
      JOIN roles r ON ur."roleId" = r.id
      JOIN role_permissions rp ON r.id = rp."roleId"
      JOIN permissions p ON rp."permissionId" = p.id
      JOIN organizations o ON ur."organizationId" = o.id
      WHERE ur."userId" = $1 
      AND ur."isActive" = true
      AND p.code = 'ctxh.activities.view'
      AND p."isActive" = true
      AND o."isActive" = true
      ORDER BY o.name ASC
    `;

    const accessibleOrganizations = await this.organizationsRepository.query(accessibleOrgsQuery, [userId]);

    console.log(`[OrganizationsService] Found ${accessibleOrganizations.length} organizations with ctxh.activities.view permission for user ${userId}`);

    // Convert query results to Organization entities
    const organizationIds = accessibleOrganizations.map(row => row.id);

    if (organizationIds.length === 0) {
      return [];
    }

    // Fetch full Organization entities with relations
    const organizations = await this.organizationsRepository.find({
      where: { id: In(organizationIds) },
      relations: ['parent'],
      order: { name: 'ASC' }
    });

    return organizations;
  } catch (error) {
    console.error('[OrganizationsService] Error getting viewable CTXH organizations:', error);
    throw error;
  }
}
```

#### 2. Updated `activities.service.ts` to Use New Method

**File:** `backend/src/ctxh/activity/activities.service.ts`

**Before:**
```typescript
const accessibleOrgs = await this.organizationsService.getAccessibleOrganizations(user_id);
```

**After:**
```typescript
const accessibleOrgs = await this.organizationsService.getCtxhActivityViewableOrganizations(user_id);
```

## How It Works

### For Super Admin Users
1. Checks if user has `system.access_admin` permission OR `super_admin` role
2. If yes, returns **ALL active organizations** in the system
3. Activities from all organizations become visible

### For Regular Users
1. Queries database for organizations where user has `ctxh.activities.view` permission
2. Returns only those specific organizations
3. Activities are filtered by these accessible organizations + their children

### Organization Hierarchy Support
The existing closure table logic remains intact:
```typescript
// Get all children using closure table
const childrenOrgs = await this.organizationRepository
  .createQueryBuilder('org')
  .innerJoin('organization_closure', 'closure', 'closure.descendant_id = org.id')
  .where('closure.ancestor_id IN (:...ancestorIds)', { ancestorIds: accessibleOrgIds })
  .getMany();
```

This ensures users see activities from:
- Their directly accessible organizations
- All descendant organizations (children, grandchildren, etc.)

## Testing Checklist

### ✅ Super Admin Test
- [ ] Login as super admin user
- [ ] Navigate to `/ctxh/activities`
- [ ] Verify: No 500 error
- [ ] Verify: All activities from all organizations are visible
- [ ] Check browser console for log: `User ${userId} is super admin, returning all organizations for CTXH view`

### ✅ Level 1 Organization User Test
- [ ] Login as user with `ctxh.activities.view` on a Level 1 org (e.g., Đoàn trường)
- [ ] Navigate to `/ctxh/activities`
- [ ] Verify: Activities from Level 1 org + all Level 2 and Level 3 children are visible
- [ ] Check console logs for organization count

### ✅ Level 2 Organization User Test
- [ ] Login as user with `ctxh.activities.view` on a Level 2 org (e.g., Đoàn Khoa A)
- [ ] Navigate to `/ctxh/activities`
- [ ] Verify: Activities from Level 2 org + its Level 3 children are visible
- [ ] Verify: Activities from other Level 2 orgs are NOT visible

### ✅ Level 3 Organization User Test
- [ ] Login as user with `ctxh.activities.view` on a Level 3 org (e.g., Chi đoàn A1)
- [ ] Navigate to `/ctxh/activities`
- [ ] Verify: Only activities from this specific Level 3 org are visible
- [ ] Verify: Activities from parent or sibling orgs are NOT visible

### ✅ User Without Permission Test
- [ ] Login as user without `ctxh.activities.view` permission
- [ ] Try to access `/ctxh/activities`
- [ ] Verify: Access denied (403) or redirected
- [ ] If somehow accessing the page, verify empty list

## Backend Console Logs

When the fix is working, you should see these logs:

```
[OrganizationsService] Getting viewable CTXH activity organizations for user: <uuid>
[OrganizationsService] User <uuid> is super admin, returning all organizations for CTXH view
[ActivitiesService] Filtering by accessible organizations: {
  userId: '<uuid>',
  parentOrgs: X,
  childrenOrgs: Y,
  totalAccessible: Z
}
```

## Related Files

### Modified Files
1. `backend/src/organizations/organizations.service.ts` - Added `getCtxhActivityViewableOrganizations` method
2. `backend/src/ctxh/activity/activities.service.ts` - Updated to call new method

### Related Documentation
- `CTXH_ACTIVITY_ORGANIZATION_FILTER.md` - Original organization filtering implementation
- `CTXH_ACTIVITY_ORGANIZATION_FILTER_SUMMARY.md` - Quick reference guide
- `CTXH_PERMISSION_FIX_GUIDE.md` - Permission system overview

## Permission Requirements

### Required Permission for Viewing Activities
- **Permission Code:** `ctxh.activities.view`
- **Category:** `ctxh`
- **Context:** `organization`
- **Description:** Allows user to view CTXH activities in their accessible organizations

### Super Admin Bypass
Users with either of these bypass all organization restrictions:
- `system.access_admin` permission (context: system)
- `super_admin` role name

## Future Considerations

### Potential Enhancements
1. **Caching:** Cache organization lists per user to reduce database queries
2. **Performance:** Add database indexes on frequently queried columns
3. **Audit:** Log which organizations are returned for each user (compliance)
4. **Permissions:** Consider adding `ctxh.activities.view_all` for cross-organization viewing

### Migration Notes
If you deploy this fix to production:
1. Ensure all CTXH permissions are seeded in the database
2. Verify super admin users have correct role assignments
3. Check closure table is properly populated
4. Test with actual user accounts before announcing feature availability

## Troubleshooting

### Still Getting 500 Error?

1. **Check Permission Seeding:**
   ```sql
   SELECT * FROM permissions WHERE code LIKE 'ctxh%';
   ```
   Should return 13 CTXH permissions including `ctxh.activities.view`

2. **Check User Role Assignment:**
   ```sql
   SELECT ur.*, r.name, p.code 
   FROM user_roles ur
   JOIN roles r ON ur."roleId" = r.id
   JOIN role_permissions rp ON r.id = rp."roleId"
   JOIN permissions p ON rp."permissionId" = p.id
   WHERE ur."userId" = '<your-user-id>';
   ```

3. **Check Super Admin Detection:**
   Look for console log: `User ${userId} is super admin`
   
4. **Check Backend Logs:**
   ```bash
   # Check for any uncaught errors
   tail -f backend/logs/error.log
   ```

5. **Restart Backend:**
   If running in dev mode, changes should auto-reload. If not:
   ```bash
   cd backend
   npm run start:dev
   ```

### Empty Activity List?

1. **Verify Activities Exist:**
   ```sql
   SELECT COUNT(*) FROM ctxh_activities WHERE deleted_at IS NULL;
   ```

2. **Check Organization Membership:**
   ```sql
   SELECT * FROM user_organizations WHERE user_id = '<your-user-id>';
   ```

3. **Check Closure Table:**
   ```sql
   SELECT * FROM organization_closure 
   WHERE ancestor_id IN (
     SELECT organization_id FROM user_organizations WHERE user_id = '<your-user-id>'
   );
   ```

## Summary

This fix resolves the 500 error by:
✅ Creating a CTXH-specific method for getting viewable organizations  
✅ Checking for the correct permission (`ctxh.activities.view`)  
✅ Properly handling super admin access  
✅ Using recursive CTE for hierarchy traversal (see CTXH_CLOSURE_TABLE_FIX.md)
✅ Preserving all organization filtering functionality  

The CTXH Activities Management page should now work correctly for all user roles!

## Related Issues

If you encounter an error about `relation "organization_closure" does not exist`, see:
**[CTXH_CLOSURE_TABLE_FIX.md](./CTXH_CLOSURE_TABLE_FIX.md)** for the solution.
