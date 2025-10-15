# CTXH Activity Organization Filter - Implementation Summary

## 🎯 Yêu cầu
Ở trang quản lý hoạt động CTXH, chỉ hiển thị những hoạt động mà người dùng có quyền xem đối với tổ chức. Với những tổ chức có con thì hiển thị luôn danh sách hoạt động của những tổ chức con.

## ✅ Đã hoàn thành

### 1. Controller Update
**File: `activities.controller.ts`**
```typescript
@Get()
@RequirePermissions('ctxh.activities.view')
findAll(
  @Request() req,  // ← THÊM: Lấy user ID
  @Query('page') page?: number,
  // ... other params
) {
  return this.activitiesService.findAll({
    // ... other options
    user_id: req.user.id,  // ← THÊM: Truyền user ID
  });
}
```

### 2. Service Update
**File: `activities.service.ts`**

**A. Inject OrganizationsService:**
```typescript
constructor(
  // ... existing
  private organizationsService: OrganizationsService,
) { }
```

**B. Filter Logic:**
```typescript
if (user_id) {
  // 1. Lấy accessible organizations
  const accessibleOrgs = await this.organizationsService
    .getAccessibleOrganizations(user_id);
  
  // 2. Lấy children qua closure table
  const childrenOrgs = await this.organizationRepository
    .createQueryBuilder('org')
    .innerJoin('organization_closure', 'closure', 
               'closure.descendant_id = org.id')
    .where('closure.ancestor_id IN (:...ids)', 
           { ids: accessibleOrgIds })
    .getMany();
  
  // 3. Combine + remove duplicates
  const allOrgIds = [...new Set([
    ...accessibleOrgIds,
    ...childrenOrgs.map(o => o.id)
  ])];
  
  // 4. Filter activities
  queryBuilder.andWhere('organization_id IN (:...orgIds)', 
                        { orgIds: allOrgIds });
}
```

### 3. Module Configuration
**File: `activities.module.ts`**
```typescript
import { OrganizationsModule } from '../../organizations/organizations.module';

@Module({
  imports: [
    // ...
    OrganizationsModule,  // ← THÊM
  ],
})
```

## 📊 Cách hoạt động

```
User request
    ↓
Get accessible organizations (parent orgs)
    ↓
Query closure table for ALL children
    ↓
Combine: [Parents] + [Children]
    ↓
Filter activities: WHERE org_id IN (combined list)
    ↓
Return filtered activities
```

## 🌳 Ví dụ

**Hierarchy:**
```
Đoàn Trường
├── Đoàn Khoa A
│   ├── Chi đoàn A1
│   └── Chi đoàn A2
└── Đoàn Khoa B
```

**User có quyền ở "Đoàn Khoa A":**
- Accessible: `[Đoàn Khoa A]`
- Children: `[Chi đoàn A1, Chi đoàn A2]`
- **Hiển thị:** Activities từ A + A1 + A2 ✅
- **KHÔNG hiển thị:** Activities từ B ❌

## 🧪 Test Cases

| User Level | Accessible Org | Hiển thị Activities Từ |
|------------|----------------|------------------------|
| Level 2 (Đoàn Khoa A) | [A] | A + A1 + A2 |
| Level 3 (Chi đoàn A1) | [A1] | Chỉ A1 |
| Multiple (A + B) | [A, B] | A + A1 + A2 + B + B1 + B2 |

## 📝 Files Changed

```
backend/src/ctxh/activity/
├── activities.controller.ts    ✏️ Thêm @Request() req, truyền user_id
├── activities.service.ts       ✏️ Inject OrganizationsService, filter logic
└── activities.module.ts        ✏️ Import OrganizationsModule

docs/
├── CTXH_ACTIVITY_ORGANIZATION_FILTER.md        ✨ Chi tiết đầy đủ
└── CTXH_ACTIVITY_ORGANIZATION_FILTER_SUMMARY.md ✨ Tóm tắt (file này)
```

## 🔍 Debug

**Console log:**
```
[ActivitiesService] Filtering by accessible organizations: {
  userId: 'xxx',
  parentOrgs: 2,        // Số org user có quyền
  childrenOrgs: 4,      // Số children tìm được
  totalAccessible: 6    // Tổng unique IDs
}
```

## 🚀 Deployment

- ✅ No breaking changes
- ✅ Backward compatible
- ✅ No database migration needed
- ✅ Uses existing closure_table

## 📖 Full Documentation

Xem file `CTXH_ACTIVITY_ORGANIZATION_FILTER.md` để biết:
- Data flow chi tiết
- Closure table queries
- Security considerations
- Performance optimization
- Troubleshooting guide
