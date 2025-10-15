# CTXH Activities Organization-Based Filtering

## 📋 Tổng quan

Đã implement tính năng lọc danh sách hoạt động CTXH dựa trên quyền truy cập tổ chức của người dùng. Hệ thống sẽ:
- Chỉ hiển thị hoạt động thuộc các tổ chức mà user có quyền truy cập
- **Tự động bao gồm hoạt động của các tổ chức con** (children organizations)

## 🎯 Yêu cầu

**Vấn đề:** Trước đây, API `GET /ctxh/activities` trả về TẤT CẢ hoạt động trong hệ thống, không phân biệt quyền truy cập của user.

**Giải pháp:** Filter activities dựa trên organization hierarchy:
1. Lấy danh sách organizations mà user có quyền truy cập
2. Tìm tất cả children organizations (sử dụng closure table)
3. Chỉ trả về activities thuộc các organizations này

## 🔧 Implementation

### 1. Backend Controller

**File: `activities.controller.ts`**

```typescript
@Get()
@RequirePermissions('ctxh.activities.view')
findAll(
  @Request() req,  // ← Thêm request để lấy user ID
  @Query('page') page?: number,
  @Query('limit') limit?: number,
  // ... other params
) {
  return this.activitiesService.findAll({
    page: page || 1,
    limit: limit || 10,
    // ... other options
    user_id: req.user.id,  // ← Truyền user ID xuống service
  });
}
```

**Thay đổi:**
- ✅ Thêm `@Request() req` parameter (đặt TRƯỚC các optional params)
- ✅ Truyền `user_id: req.user.id` vào service options

### 2. Backend Service

**File: `activities.service.ts`**

**A. Interface Update:**
```typescript
interface FindAllOptions {
  // ... existing fields
  user_id?: string;  // ← Thêm user_id
}
```

**B. Import Dependencies:**
```typescript
import { In } from 'typeorm';  // ← Thêm In operator
import { OrganizationsService } from '../../organizations/organizations.service';
```

**C. Constructor Injection:**
```typescript
constructor(
  // ... existing repositories
  private organizationsService: OrganizationsService,  // ← Inject service
) { }
```

**D. Filter Logic:**
```typescript
async findAll(options: FindAllOptions) {
  // ... setup queryBuilder
  
  // NEW: Filter by accessible organizations
  if (user_id) {
    // 1. Get user's accessible organizations
    const accessibleOrgs = await this.organizationsService
      .getAccessibleOrganizations(user_id);
    const accessibleOrgIds = accessibleOrgs.map(org => org.id);
    
    if (accessibleOrgIds.length > 0) {
      // 2. Get ALL children using closure table
      const childrenOrgs = await this.organizationRepository
        .createQueryBuilder('org')
        .innerJoin('organization_closure', 'closure', 
                   'closure.descendant_id = org.id')
        .where('closure.ancestor_id IN (:...ancestorIds)', 
               { ancestorIds: accessibleOrgIds })
        .getMany();
      
      // 3. Combine parent + children IDs
      const allAccessibleOrgIds = [
        ...accessibleOrgIds,
        ...childrenOrgs.map(org => org.id)
      ];
      
      // 4. Remove duplicates
      const uniqueOrgIds = [...new Set(allAccessibleOrgIds)];
      
      // 5. Filter activities
      queryBuilder.andWhere('activity.organization_id IN (:...orgIds)', 
                            { orgIds: uniqueOrgIds });
    } else {
      // No accessible orgs → empty result
      queryBuilder.andWhere('1 = 0');
    }
  }
  
  // ... rest of filtering logic
}
```

### 3. Module Configuration

**File: `activities.module.ts`**

```typescript
import { OrganizationsModule } from '../../organizations/organizations.module';

@Module({
  imports: [
    // ... existing imports
    OrganizationsModule,  // ← Thêm module
  ],
  // ...
})
```

## 📊 Data Flow

```
Frontend: GET /ctxh/activities
    ↓
Controller: Lấy req.user.id
    ↓
Service.findAll({ user_id })
    ↓
┌─────────────────────────────────────────────┐
│ 1. getAccessibleOrganizations(user_id)      │
│    → [Org A, Org B]                         │
└─────────────────────────────────────────────┘
    ↓
┌─────────────────────────────────────────────┐
│ 2. Query closure table for children         │
│    SELECT * FROM organization_closure        │
│    WHERE ancestor_id IN (A, B)              │
│    → [Child1, Child2, Child3]               │
└─────────────────────────────────────────────┘
    ↓
┌─────────────────────────────────────────────┐
│ 3. Combine: [A, B, Child1, Child2, Child3]  │
│    Remove duplicates                         │
└─────────────────────────────────────────────┘
    ↓
┌─────────────────────────────────────────────┐
│ 4. Filter activities:                        │
│    WHERE organization_id IN (A, B, C1, C2, C3) │
└─────────────────────────────────────────────┘
    ↓
Return filtered activities
```

## 🌳 Organization Hierarchy Example

```
Đoàn Trường (Level 1)
├── Đoàn Khoa A (Level 2)
│   ├── Chi đoàn A1 (Level 3)
│   └── Chi đoàn A2 (Level 3)
└── Đoàn Khoa B (Level 2)
    ├── Chi đoàn B1 (Level 3)
    └── Chi đoàn B2 (Level 3)
```

**Scenario 1: User có quyền ở "Đoàn Khoa A"**
- Accessible orgs: `[Đoàn Khoa A]`
- Children: `[Chi đoàn A1, Chi đoàn A2]`
- **Activities hiển thị:** Từ Đoàn Khoa A + A1 + A2

**Scenario 2: User có quyền ở "Chi đoàn A1"**
- Accessible orgs: `[Chi đoàn A1]`
- Children: `[]` (Level 3 không có children)
- **Activities hiển thị:** Chỉ từ Chi đoàn A1

**Scenario 3: User có quyền ở "Đoàn Trường"**
- Accessible orgs: `[Đoàn Trường]`
- Children: `[Đoàn Khoa A, Đoàn Khoa B, Chi đoàn A1, A2, B1, B2]`
- **Activities hiển thị:** TẤT CẢ activities trong hệ thống

## 🔍 Closure Table Query

**Cách thức hoạt động:**

```sql
-- Closure table structure
CREATE TABLE organization_closure (
  ancestor_id UUID,     -- Parent organization
  descendant_id UUID,   -- Child organization (including self)
  depth INT            -- Distance (0 = self, 1 = direct child, etc.)
);

-- Example data for "Đoàn Khoa A"
| ancestor_id | descendant_id | depth |
|-------------|---------------|-------|
| A           | A             | 0     |  -- Self
| A           | A1            | 1     |  -- Direct child
| A           | A2            | 1     |  -- Direct child
```

**Query để lấy tất cả children:**
```sql
SELECT org.* 
FROM organizations org
INNER JOIN organization_closure closure 
  ON closure.descendant_id = org.id
WHERE closure.ancestor_id IN ('org-A-id', 'org-B-id')
```

## 🧪 Testing

### Test Case 1: User Level 2 (Đoàn Khoa)
```
1. Đăng nhập user thuộc "Đoàn Khoa A"
2. GET /ctxh/activities
3. Kỳ vọng: Chỉ activities từ:
   - Đoàn Khoa A
   - Chi đoàn A1
   - Chi đoàn A2
4. KHÔNG hiển thị activities từ Đoàn Khoa B hoặc children của B
```

### Test Case 2: User Level 3 (Chi đoàn)
```
1. Đăng nhập user thuộc "Chi đoàn A1"
2. GET /ctxh/activities
3. Kỳ vọng: CHỈ activities từ Chi đoàn A1
4. KHÔNG hiển thị activities từ Đoàn Khoa A hoặc Chi đoàn A2
```

### Test Case 3: Multiple Organizations
```
1. User có quyền ở cả "Đoàn Khoa A" VÀ "Đoàn Khoa B"
2. GET /ctxh/activities
3. Kỳ vọng: Activities từ:
   - Đoàn Khoa A + children (A1, A2)
   - Đoàn Khoa B + children (B1, B2)
```

### Test Case 4: Organization Filter Parameter
```
1. User có quyền ở "Đoàn Khoa A" (có children A1, A2)
2. GET /ctxh/activities?organization_id=A1
3. Kỳ vọng: CHỈ activities từ A1 (filter specific org)
4. Vẫn phải pass accessibility check (A1 trong accessible orgs)
```

### Test Case 5: No Accessible Organizations
```
1. User mới không thuộc tổ chức nào
2. GET /ctxh/activities
3. Kỳ vọng: Empty array []
4. Console log: "User has no accessible organizations"
```

## 📝 Console Logs

**Log output khi filter:**
```
[ActivitiesService] Filtering by accessible organizations: {
  userId: 'user-123-uuid',
  parentOrgs: 2,           // User accessible orgs
  childrenOrgs: 4,         // Total children found
  totalAccessible: 6       // Unique org IDs (parent + children)
}
```

**Log khi user không có quyền:**
```
[ActivitiesService] User has no accessible organizations
```

## 🔒 Security

### Authorization Layers

1. **Permission Check** (`@RequirePermissions('ctxh.activities.view')`)
   - User phải có permission `ctxh.activities.view`
   
2. **Organization Filter** (Service layer)
   - Chỉ trả về activities từ accessible organizations
   
3. **Hierarchy Respect** (Closure table)
   - Children organizations tự động included
   - Parent organizations KHÔNG tự động included (one-way)

### Important Notes

⚠️ **User chỉ thấy activities từ:**
- Organizations họ TRỰC TIẾP có quyền
- Children organizations (tất cả levels)

⚠️ **User KHÔNG thấy activities từ:**
- Organizations họ KHÔNG có quyền
- Parent organizations (nếu chỉ có quyền ở child)
- Sibling organizations (nếu chỉ có quyền ở 1 branch)

## 🚀 Performance Considerations

### Query Optimization

1. **Closure Table Index:**
```sql
CREATE INDEX idx_closure_ancestor ON organization_closure(ancestor_id);
CREATE INDEX idx_closure_descendant ON organization_closure(descendant_id);
```

2. **Activity Organization Index:**
```sql
CREATE INDEX idx_activity_org ON ctxh_activities(organization_id);
```

3. **IN Clause Performance:**
- TypeORM converts `IN (:...ids)` to parameterized query
- Efficient for up to ~1000 IDs
- For larger orgs, consider pagination at org level

### Caching Opportunities

```typescript
// Future enhancement: Cache accessible org IDs per user
const cacheKey = `user:${userId}:accessible-orgs`;
const cachedOrgIds = await cache.get(cacheKey);

if (!cachedOrgIds) {
  // Calculate and cache for 5 minutes
  await cache.set(cacheKey, orgIds, 300);
}
```

## 📂 Files Changed

```
backend/
├── src/
│   └── ctxh/
│       └── activity/
│           ├── activities.controller.ts    ✏️ MODIFIED
│           │   - Thêm @Request() req parameter
│           │   - Truyền user_id vào service
│           │
│           ├── activities.service.ts       ✏️ MODIFIED
│           │   - Import OrganizationsService
│           │   - Thêm user_id vào FindAllOptions
│           │   - Implement organization filtering logic
│           │   - Query closure table for children
│           │
│           └── activities.module.ts        ✏️ MODIFIED
│               - Import OrganizationsModule

docs/
└── CTXH_ACTIVITY_ORGANIZATION_FILTER.md  ✨ NEW (this file)
```

## 🐛 Troubleshooting

### Issue: Activities không được filter
**Check:**
1. Console log có hiện số lượng accessible orgs?
2. Closure table có data không?
   ```sql
   SELECT COUNT(*) FROM organization_closure;
   ```
3. User có user_organizations records không?

### Issue: Không thấy activities của children orgs
**Check:**
1. Closure table có entries cho children không?
   ```sql
   SELECT * FROM organization_closure 
   WHERE ancestor_id = 'your-org-id';
   ```
2. Activities có `organization_id` hợp lệ không?

### Issue: Performance chậm
**Check:**
1. Indexes đã được tạo chưa?
2. Số lượng accessible orgs quá lớn (>100)?
3. Consider adding pagination hoặc caching

## 🔄 Future Enhancements

1. **Redis Caching:**
   - Cache accessible org IDs per user
   - TTL: 5 minutes (refresh when org membership changes)

2. **Pagination at Org Level:**
   - Nếu user có >100 accessible orgs
   - Load activities incrementally

3. **Real-time Updates:**
   - WebSocket notification khi org membership thay đổi
   - Invalidate cache và re-fetch

4. **Query Optimization:**
   - Use materialized view cho frequently accessed hierarchies
   - Pre-calculate accessible org lists

## ✅ Completion Checklist

- [x] Controller updated với @Request() parameter
- [x] Service inject OrganizationsService
- [x] Implement closure table query
- [x] Combine parent + children org IDs
- [x] Filter activities by org IDs
- [x] Module import OrganizationsModule
- [x] No TypeScript errors
- [x] Console logging added
- [x] Documentation created
- [ ] Manual testing với different user levels
- [ ] Performance testing với large org hierarchies

## 📞 Support

**Debug Commands:**
```typescript
// Check accessible orgs for user
const orgs = await organizationsService.getAccessibleOrganizations(userId);
console.log('Accessible orgs:', orgs.map(o => o.name));

// Check closure table
const children = await organizationRepository
  .query('SELECT * FROM organization_closure WHERE ancestor_id = $1', [orgId]);
console.log('Children:', children);
```

**Related Documentation:**
- `CTXH_LEVEL3_RESTRICTION.md` - Create permission restriction
- `PERMISSION_GUIDE.md` - Permission system overview
- `database.dbml` - Organization schema
