# CTXH Activity Organization Permission Implementation Plan

## 📋 Overview

Implement organization selection restrictions in CTXH Activity creation based on user permissions and organization hierarchy levels.

**Requirements:**
1. Check `ctxh.activities.create` permission for user
2. Filter organization dropdown based on user's role-organization relationship:
   - **Level 2 Organization (e.g., Đoàn Khoa)**: User can ONLY select that specific organization (disabled dropdown, display only)
   - **Level 1 Organization (e.g., Đoàn Trường)**: User can select the organization AND all its children
   - **Super Admin**: Can select ALL organizations in the system

---

## 🏗️ Architecture Analysis

### Current Structure

**Frontend:**
- `ActivityForm.tsx`: Activity creation/edit modal
- `useAuth()`: Authentication context with permissions
- `organizationService`: API calls for organizations

**Backend:**
- `activities.controller.ts`: Activity CRUD endpoints
- `organizations.service.ts`: Has `getAccessibleOrganizations()` method
- `auth.service.ts`: Has `getUserPermissions()` method
- **Entities:**
  - `user-role.entity.ts`: Links User → Role → Organization
  - `organization.entity.ts`: Tree structure with parent/children
  - `permission.entity.ts`: Has `code`, `name`, `category`

### Key Findings

1. **Organization Tree Structure**: Uses TypeORM `@Tree("closure-table")` for hierarchy
2. **Permission System**: Role-based with organization context (`user_roles` table has `organizationId`)
3. **Existing Method**: `getAccessibleOrganizations()` already filters by permission (currently `payment-campaigns.create`)
4. **No Explicit Level Field**: Organization level is determined by parent-child relationships

---

## 🎯 Implementation Plan

### Phase 1: Backend - Create Organization Hierarchy Helper

**File:** `backend/src/organizations/organizations.service.ts`

#### 1.1 Add Method: `getOrganizationLevel(organizationId: string): Promise<number>`

```typescript
/**
 * Calculate organization level in hierarchy
 * Level 1: Root organizations (no parent)
 * Level 2: Organizations with 1 parent
 * Level 3+: Deeper nested organizations
 */
async getOrganizationLevel(organizationId: string): Promise<number> {
  const org = await this.organizationsRepository.findOne({
    where: { id: organizationId },
    relations: ['parent']
  });
  
  if (!org) return 0;
  
  let level = 1;
  let current = org;
  
  while (current.parent) {
    level++;
    current = await this.organizationsRepository.findOne({
      where: { id: current.parent.id },
      relations: ['parent']
    });
    if (!current) break;
  }
  
  return level;
}
```

#### 1.2 Add Method: `getAllDescendants(organizationId: string): Promise<Organization[]>`

```typescript
/**
 * Get all child organizations (recursively)
 */
async getAllDescendants(organizationId: string): Promise<Organization[]> {
  const treeRepo = this.organizationsRepository.manager.getTreeRepository(Organization);
  const organization = await treeRepo.findOne({ 
    where: { id: organizationId } 
  });
  
  if (!organization) return [];
  
  const descendants = await treeRepo.findDescendants(organization);
  // Remove the parent organization itself from the result
  return descendants.filter(d => d.id !== organizationId);
}
```

---

### Phase 2: Backend - Create New Endpoint for Activity Organizations

**File:** `backend/src/organizations/organizations.controller.ts`

#### 2.1 Add Endpoint: `GET /organizations/ctxh-activity-accessible`

```typescript
@Get('ctxh-activity-accessible')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
@ApiOperation({ 
  summary: 'Get organizations user can use for CTXH activity creation',
  description: 'Returns organizations based on ctxh.activities.create permission and hierarchy level'
})
@ApiResponse({ 
  status: 200, 
  description: 'Organizations retrieved successfully',
  schema: {
    type: 'object',
    properties: {
      organizations: { 
        type: 'array', 
        items: { type: 'object' } 
      },
      canSelectMultiple: { 
        type: 'boolean',
        description: 'Whether user can choose from multiple organizations'
      },
      fixedOrganization: {
        type: 'object',
        nullable: true,
        description: 'If user is restricted to single org (level 2), this is set'
      }
    }
  }
})
async getCtxhActivityAccessibleOrganizations(@Request() req: any) {
  const userId = req.user.id;
  return this.organizationsService.getCtxhActivityAccessibleOrganizations(userId);
}
```

---

### Phase 3: Backend - Implement Service Logic

**File:** `backend/src/organizations/organizations.service.ts`

#### 3.1 Add Method: `getCtxhActivityAccessibleOrganizations(userId: string)`

```typescript
async getCtxhActivityAccessibleOrganizations(userId: string): Promise<{
  organizations: Organization[];
  canSelectMultiple: boolean;
  fixedOrganization: Organization | null;
}> {
  console.log(`[OrganizationsService] Getting CTXH activity organizations for user: ${userId}`);

  // 1. Check if user is super admin
  const superAdminQuery = `
    SELECT ur.id
    FROM user_roles ur
    JOIN roles r ON ur."roleId" = r.id
    JOIN role_permissions rp ON r.id = rp."roleId"
    JOIN permissions p ON rp."permissionId" = p.id
    WHERE ur."userId" = $1 
    AND ur."organizationId" IS NULL
    AND ur."isActive" = true
    AND r.name = 'super_admin'
    AND p."isActive" = true
    LIMIT 1
  `;

  const superAdminResult = await this.organizationsRepository.query(superAdminQuery, [userId]);

  if (superAdminResult.length > 0) {
    console.log(`[OrganizationsService] User is super_admin - can access all organizations`);
    
    const allOrgs = await this.organizationsRepository.find({
      where: { isActive: true },
      relations: ['parent'],
      order: { name: 'ASC' }
    });

    return {
      organizations: allOrgs,
      canSelectMultiple: true,
      fixedOrganization: null
    };
  }

  // 2. Get organizations where user has ctxh.activities.create permission
  const accessibleOrgsQuery = `
    SELECT DISTINCT 
      o.id, o.name, o.code, o.type, o."parentId", 
      o."createdAt", o."updatedAt", o."isActive",
      o.description
    FROM user_roles ur
    JOIN roles r ON ur."roleId" = r.id
    JOIN role_permissions rp ON r.id = rp."roleId"
    JOIN permissions p ON rp."permissionId" = p.id
    JOIN organizations o ON ur."organizationId" = o.id
    WHERE ur."userId" = $1 
    AND ur."isActive" = true
    AND p.code = 'ctxh.activities.create'
    AND p."isActive" = true
    AND o."isActive" = true
    ORDER BY o.name ASC
  `;

  const accessibleOrganizations = await this.organizationsRepository.query(
    accessibleOrgsQuery, 
    [userId]
  );

  console.log(`[OrganizationsService] Found ${accessibleOrganizations.length} organizations with ctxh.activities.create`);

  if (accessibleOrganizations.length === 0) {
    return {
      organizations: [],
      canSelectMultiple: false,
      fixedOrganization: null
    };
  }

  // 3. Analyze organization levels and build accessible list
  const organizationsWithLevel = await Promise.all(
    accessibleOrganizations.map(async (org) => {
      const level = await this.getOrganizationLevel(org.id);
      return { ...org, level };
    })
  );

  // 4. Determine selection behavior based on levels
  const hasLevel1 = organizationsWithLevel.some(o => o.level === 1);
  const hasLevel2Only = organizationsWithLevel.every(o => o.level === 2) && 
                        organizationsWithLevel.length === 1;

  if (hasLevel2Only) {
    // User has permission only on a single Level 2 organization
    // They can ONLY select this organization (fixed/disabled dropdown)
    const fixedOrg = await this.organizationsRepository.findOne({
      where: { id: organizationsWithLevel[0].id },
      relations: ['parent']
    });

    console.log(`[OrganizationsService] User restricted to Level 2 org: ${fixedOrg.name}`);

    return {
      organizations: [fixedOrg],
      canSelectMultiple: false,
      fixedOrganization: fixedOrg
    };
  }

  // 5. Build full accessible list (Level 1 + descendants)
  const allAccessibleOrgs: Organization[] = [];
  const processedIds = new Set<string>();

  for (const orgData of organizationsWithLevel) {
    const org = await this.organizationsRepository.findOne({
      where: { id: orgData.id },
      relations: ['parent']
    });

    if (!org || processedIds.has(org.id)) continue;

    allAccessibleOrgs.push(org);
    processedIds.add(org.id);

    // If Level 1, add all descendants
    if (orgData.level === 1) {
      const descendants = await this.getAllDescendants(org.id);
      descendants.forEach(desc => {
        if (!processedIds.has(desc.id)) {
          allAccessibleOrgs.push(desc);
          processedIds.add(desc.id);
        }
      });
    }
  }

  console.log(`[OrganizationsService] Total accessible organizations: ${allAccessibleOrgs.length}`);

  return {
    organizations: allAccessibleOrgs.sort((a, b) => a.name.localeCompare(b.name)),
    canSelectMultiple: true,
    fixedOrganization: null
  };
}
```

---

### Phase 4: Frontend - Create Organization Service Method

**File:** `frontend/src/shared/services/organizationService.ts`

#### 4.1 Add Method: `getCtxhActivityAccessibleOrganizations()`

```typescript
/**
 * Get organizations user can access for CTXH activity creation
 * Based on ctxh.activities.create permission and hierarchy level
 */
async getCtxhActivityAccessibleOrganizations(): Promise<{
  organizations: Organization[];
  canSelectMultiple: boolean;
  fixedOrganization: Organization | null;
}> {
  const response = await apiClient.get('/organizations/ctxh-activity-accessible');
  return response.data;
}
```

---

### Phase 5: Frontend - Update ActivityForm Component

**File:** `frontend/src/features/ctxh/components/ActivityForm.tsx`

#### 5.1 Add State for Organization Constraints

```typescript
// Add to existing state declarations (around line 50)
const [organizationConstraints, setOrganizationConstraints] = useState<{
  canSelectMultiple: boolean;
  fixedOrganization: any | null;
}>({
  canSelectMultiple: true,
  fixedOrganization: null
});
```

#### 5.2 Update `loadOrganizations()` Method

```typescript
const loadOrganizations = async () => {
  try {
    setOrganizationsLoading(true);
    
    // Use new endpoint for CTXH activity organizations
    const response = await organizationService.getCtxhActivityAccessibleOrganizations();
    
    setOrganizations(response.organizations);
    setOrganizationConstraints({
      canSelectMultiple: response.canSelectMultiple,
      fixedOrganization: response.fixedOrganization
    });

    // If fixed organization (Level 2 restriction), auto-set it
    if (response.fixedOrganization && !activity) {
      setFormData(prev => ({
        ...prev,
        organizationId: response.fixedOrganization.id
      }));
    }

    console.log('[ActivityForm] Loaded organizations:', {
      count: response.organizations.length,
      canSelectMultiple: response.canSelectMultiple,
      fixed: response.fixedOrganization?.name || 'none'
    });
  } catch (error) {
    console.error('Failed to load organizations:', error);
    setOrganizations([]);
  } finally {
    setOrganizationsLoading(false);
  }
};
```

#### 5.3 Update Organization Combobox Rendering

```typescript
// Replace the existing Organization combobox section (around line 700-800)

{/* Organization Field */}
<div>
  <label className="block mb-2 text-sm font-medium text-gray-900 dark:text-white">
    {t('activity.form.organization')} 
    <span className="text-red-500">*</span>
  </label>
  
  {organizationConstraints.fixedOrganization ? (
    // FIXED ORGANIZATION - Display only, no selection
    <div className="relative">
      <input
        type="text"
        value={organizationConstraints.fixedOrganization.name}
        disabled
        className="w-full py-2 px-3 pr-10 border border-gray-300 rounded-md 
                   bg-gray-100 dark:bg-gray-700 dark:border-gray-600 
                   text-gray-700 dark:text-gray-300 cursor-not-allowed"
      />
      <div className="absolute inset-y-0 right-0 flex items-center px-3 text-gray-400">
        <ChevronDown className="w-4 h-4" />
      </div>
    </div>
  ) : (
    // NORMAL COMBOBOX - User can select
    <div className="relative organization-combobox">
      <div className="relative">
        <input
          type="text"
          placeholder={t('activity.form.selectOrganization')}
          value={organizationDropdownOpen ? organizationSearch : getSelectedOrganizationName()}
          onChange={(e) => {
            setOrganizationSearch(e.target.value);
            if (!organizationDropdownOpen) setOrganizationDropdownOpen(true);
          }}
          onFocus={() => {
            setOrganizationDropdownOpen(true);
            setOrganizationSearch('');
          }}
          onBlur={() => {
            setTimeout(() => setOrganizationDropdownOpen(false), 200);
          }}
          className={`w-full py-2 px-3 pr-10 border rounded-md 
                     dark:bg-gray-700 dark:text-white
                     focus:ring-2 focus:ring-doan-500 focus:border-transparent
                     ${!fieldValidation.organizationId.isValid 
                       ? 'border-red-500 dark:border-red-500' 
                       : 'border-gray-300 dark:border-gray-600'}`}
        />
        <button
          type="button"
          onClick={() => setOrganizationDropdownOpen(!organizationDropdownOpen)}
          className="absolute inset-y-0 right-0 flex items-center px-3 
                     text-gray-400 hover:text-gray-600 
                     dark:text-gray-400 dark:hover:text-gray-300"
        >
          <ChevronDown className="w-4 h-4" />
        </button>
        
        {organizationDropdownOpen && (
          <div className="absolute z-50 w-full mt-1 bg-white border border-gray-300 
                         rounded-md shadow-lg dark:bg-gray-700 dark:border-gray-600 
                         max-h-60 overflow-auto">
            {filteredOrganizations.length > 0 ? (
              filteredOrganizations.map((org) => (
                <button
                  key={org.id}
                  type="button"
                  onClick={() => {
                    setFormData({ ...formData, organizationId: org.id });
                    setOrganizationDropdownOpen(false);
                    setOrganizationSearch('');
                    setFieldValidation({
                      ...fieldValidation,
                      organizationId: { isValid: true, message: '' }
                    });
                  }}
                  className={`w-full text-left px-3 py-2 hover:bg-gray-100 
                             dark:hover:bg-gray-600 focus:bg-gray-100 
                             dark:focus:bg-gray-600 focus:outline-none ${
                    formData.organizationId === org.id 
                      ? 'bg-blue-50 text-blue-700 dark:bg-blue-900 dark:text-blue-300' 
                      : 'text-gray-900 dark:text-white'
                  }`}
                >
                  {org.name}
                </button>
              ))
            ) : (
              <div className="px-3 py-2 text-sm text-gray-500 dark:text-gray-400">
                {organizationsLoading 
                  ? t('activity.form.loading') 
                  : t('activity.form.noResults')}
              </div>
            )}
          </div>
        )}
      </div>
      
      {!fieldValidation.organizationId.isValid && (
        <p className="mt-1 text-sm text-red-600 dark:text-red-400">
          {fieldValidation.organizationId.message}
        </p>
      )}
    </div>
  )}
  
  {/* Helper text for restricted users */}
  {organizationConstraints.fixedOrganization && (
    <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
      {t('activity.form.organizationRestricted')}
    </p>
  )}
</div>
```

---

### Phase 6: Frontend - Add Translation Keys

**File:** `frontend/public/locales/vi/ctxh.json`

Add to `activity.form` section:

```json
{
  "activity": {
    "form": {
      // ... existing keys
      "selectOrganization": "Chọn tổ chức",
      "organizationRestricted": "Bạn chỉ có thể tạo hoạt động cho tổ chức này"
    }
  }
}
```

**File:** `frontend/public/locales/en/ctxh.json`

```json
{
  "activity": {
    "form": {
      // ... existing keys
      "selectOrganization": "Select organization",
      "organizationRestricted": "You can only create activities for this organization"
    }
  }
}
```

---

### Phase 7: Backend - Add Permission Check to Activity Creation

**File:** `backend/src/ctxh/activity/activities.controller.ts`

#### 7.1 Update `create()` Endpoint

```typescript
@Post()
@ApiOperation({ 
  summary: 'Tạo hoạt động CTXH mới',
  description: 'Tạo hoạt động mới với thông tin chi tiết, danh mục và tổ chức. Kiểm tra quyền ctxh.activities.create'
})
@UseGuards(JwtAuthGuard, PermissionGuard)
@RequirePermissions('ctxh.activities.create')  // Enable permission check
create(@Body() createActivityDto: CreateActivityDto, @Request() req) {
  return this.activitiesService.create(createActivityDto, req.user.id);
}
```

#### 7.2 Add Validation in Service

**File:** `backend/src/ctxh/activity/activities.service.ts`

Add validation before creating activity:

```typescript
async create(createActivityDto: CreateActivityDto, userId: string) {
  // 1. Validate organization access
  const hasAccess = await this.validateUserOrganizationAccess(
    userId, 
    createActivityDto.organizationId
  );

  if (!hasAccess) {
    throw new ForbiddenException(
      'You do not have permission to create activities for this organization'
    );
  }

  // ... rest of existing create logic
}

// Add helper method
private async validateUserOrganizationAccess(
  userId: string, 
  organizationId: string
): Promise<boolean> {
  // Check if user has ctxh.activities.create permission for this organization
  const query = `
    SELECT ur.id
    FROM user_roles ur
    JOIN roles r ON ur."roleId" = r.id
    JOIN role_permissions rp ON r.id = rp."roleId"
    JOIN permissions p ON rp."permissionId" = p.id
    WHERE ur."userId" = $1 
    AND ur."isActive" = true
    AND p.code = 'ctxh.activities.create'
    AND p."isActive" = true
    AND (
      -- Super admin (no org restriction)
      ur."organizationId" IS NULL
      OR 
      -- Has permission for this specific org
      ur."organizationId" = $2
      OR
      -- Has permission for parent org (check hierarchy)
      ur."organizationId" IN (
        SELECT DISTINCT ancestor."parentId"
        FROM organizations ancestor
        WHERE ancestor.id = $2
      )
    )
    LIMIT 1
  `;

  const result = await this.activityRepository.query(query, [userId, organizationId]);
  return result.length > 0;
}
```

---

## 🧪 Testing Plan

### Test Cases

#### Backend Tests

1. **Super Admin**:
   - ✅ Should return all organizations
   - ✅ `canSelectMultiple` = true
   - ✅ `fixedOrganization` = null

2. **User with Level 1 Permission** (e.g., Đoàn Trường):
   - ✅ Should return Level 1 org + all children
   - ✅ `canSelectMultiple` = true
   - ✅ `fixedOrganization` = null

3. **User with Level 2 Permission** (e.g., Đoàn Khoa):
   - ✅ Should return only that organization
   - ✅ `canSelectMultiple` = false
   - ✅ `fixedOrganization` = {organization object}

4. **User with No Permission**:
   - ✅ Should return empty array
   - ✅ `canSelectMultiple` = false

#### Frontend Tests

1. **Fixed Organization Display**:
   - ✅ Dropdown is disabled
   - ✅ Shows helper text
   - ✅ Organization name is displayed
   - ✅ Form auto-populates organizationId

2. **Multiple Selection**:
   - ✅ Dropdown is enabled
   - ✅ Shows search functionality
   - ✅ Can filter organizations
   - ✅ Shows all accessible orgs

3. **Permission Validation**:
   - ✅ Cannot create activity for unauthorized org
   - ✅ API returns 403 error
   - ✅ Error message displayed to user

---

## 📝 Implementation Checklist

### Backend
- [ ] Add `getOrganizationLevel()` helper method
- [ ] Add `getAllDescendants()` helper method
- [ ] Add `getCtxhActivityAccessibleOrganizations()` service method
- [ ] Add `GET /organizations/ctxh-activity-accessible` endpoint
- [ ] Add `validateUserOrganizationAccess()` validation method
- [ ] Enable `PermissionGuard` on activity create endpoint
- [ ] Update Swagger documentation
- [ ] Write unit tests for organization service methods
- [ ] Write integration tests for API endpoint

### Frontend
- [ ] Add `getCtxhActivityAccessibleOrganizations()` to organizationService
- [ ] Add `organizationConstraints` state to ActivityForm
- [ ] Update `loadOrganizations()` to use new endpoint
- [ ] Implement fixed organization display UI
- [ ] Implement conditional combobox rendering
- [ ] Add translation keys (vi + en)
- [ ] Test with different user permission levels
- [ ] Add error handling for API failures
- [ ] Update ActivityForm component tests

### Documentation
- [ ] Update API documentation
- [ ] Add user guide for organization permissions
- [ ] Document permission matrix
- [ ] Add troubleshooting guide

---

## 🚀 Deployment Notes

1. **Database Migration**: No schema changes required
2. **Seed Data**: Ensure `ctxh.activities.create` permission exists
3. **Role Assignment**: Verify users have proper role-organization assignments
4. **Testing**: Test with real user accounts at different hierarchy levels
5. **Rollback Plan**: Feature can be disabled by reverting frontend changes

---

## 🔍 Key Technical Decisions

1. **Why not add `level` column to `organizations` table?**
   - TypeORM `closure-table` already tracks hierarchy
   - Dynamic calculation is more flexible
   - Avoids data synchronization issues

2. **Why create separate endpoint instead of modifying `getAccessibleOrganizations()`?**
   - Separation of concerns (payment vs CTXH)
   - Different permission codes
   - Allows independent evolution

3. **Why validate on both frontend and backend?**
   - Frontend: Better UX (prevent invalid selections)
   - Backend: Security (enforce permissions)

---

## 📚 Related Files Reference

**Entities:**
- `backend/src/entities/organization.entity.ts`
- `backend/src/entities/user-role.entity.ts`
- `backend/src/entities/permission.entity.ts`

**Services:**
- `backend/src/organizations/organizations.service.ts`
- `backend/src/auth/auth.service.ts`
- `frontend/src/shared/services/organizationService.ts`

**Components:**
- `frontend/src/features/ctxh/components/ActivityForm.tsx`
- `frontend/src/features/ctxh/components/activity/ActivityList.tsx`

**Guards:**
- `backend/src/auth/guards/permission.guard.ts`
- `backend/src/auth/decorators/permissions.decorator.ts`

---

## ✅ Success Criteria

1. ✅ Super admin can select any organization
2. ✅ Level 1 users can select their org + children
3. ✅ Level 2 users see disabled dropdown with their org
4. ✅ Unauthorized users cannot create activities
5. ✅ API returns 403 for invalid organization selections
6. ✅ UI provides clear feedback about restrictions
7. ✅ All translations are complete
8. ✅ Tests pass for all scenarios

---

**End of Implementation Plan**
