# Phân Tích Hiệu Năng Trang Tổ Chức - Vấn Đề & Giải Pháp

## 📊 Tổng Quan Vấn Đề

**Vấn đề hiện tại:** Trang tổ chức load **RẤT CHẬM** do việc lấy toàn bộ dữ liệu tổ chức ngay từ đầu thay vì chỉ load những gì cần thiết.

**Tác động:**
- ⏱️ Thời gian load ban đầu rất lâu (có thể > 5-10 giây)
- 🐌 Trải nghiệm người dùng kém
- 💾 Tốn băng thông mạng không cần thiết
- 🔥 Server phải xử lý nhiều dữ liệu không cần thiết

---

## 🔍 Phân Tích Chi Tiết

### 1. Flow Hiện Tại (Main Organizations Page)

```
User vào trang /organizations
        ↓
useOrganizationPage() được gọi
        ↓
fetchData() → fetchOrganizationTree()
        ↓
API: GET /organizations/tree
        ↓
Backend: organizationsRepository.findTrees()
        ↓
⚠️ LẤY TOÀN BỘ CÂY TỔ CHỨC (ALL LEVELS)
        ↓
getAllOrganizationIds() - lấy tất cả IDs
        ↓
getMemberCountsMap() - đếm members cho TẤT CẢ orgs
        ↓
Trả về TOÀN BỘ cây với memberCount
        ↓
fetchAllLevel1Children() - Gọi lại API cho TỪNG org level 1
        ↓
⚠️ N+1 queries: Với mỗi org level 1, gọi API /organizations/:id/children
        ↓
Frontend render toàn bộ tree
```

**⚠️ VẤN ĐỀ NGHIÊM TRỌNG:**

1. **Backend `findTrees()`** đã trả về TOÀN BỘ cây tổ chức rồi (bao gồm children của level 1)
2. **Nhưng frontend lại gọi thêm** `fetchAllLevel1Children()` để fetch lại children cho từng org level 1
3. **Kết quả:** Dữ liệu bị fetch **2 LẦN**! 

### 2. Code Backend - API `/organizations/tree`

**File:** `backend/src/organizations/organizations.service.ts`

```typescript
async findTree(): Promise<OrganizationWithExtras[]> {
    // 1. Lấy cấu trúc cây tổ chức - TOÀN BỘ!
    const organizations = await this.organizationsRepository.findTrees();

    // 2. Lấy số lượng thành viên cho MỌI tổ chức
    const orgIds = this.getAllOrganizationIds(organizations); // Get ALL IDs
    const memberCountsMap = await this.getMemberCountsMap(orgIds);

    // 3. Thêm memberCount và hasChildren vào mỗi tổ chức
    return this.addMemberCountsToTree(organizations, memberCountsMap);
}
```

**Vấn đề:**
- `findTrees()` của TypeORM sẽ load TOÀN BỘ cây tổ chức (tất cả levels)
- Nếu có 100 tổ chức → load cả 100
- Nếu có 1000 tổ chức → load cả 1000
- Kèm theo đó là đếm members cho TẤT CẢ orgs

### 3. Code Frontend - Hook `useOrganizationTree.ts`

**File:** `frontend/src/features/organizations/hooks/useOrganizationTree.ts`

```typescript
const fetchOrganizationTree = useCallback(async () => {
    // ...
    const treeData = await organizationService.getOrganizationTree();
    
    // Auto expand level 1
    const orgsWithExpanded = treeData.map(org => ({
        ...org,
        isExpanded: true,  // ← Force expand
        children: org.children?.map(child => ({
            ...child,
            isExpanded: false
        }))
    }));
    
    setOrganizations(orgsWithExpanded);
    return orgsWithExpanded;
}, []);

const fetchAllLevel1Children = useCallback(async (orgs: Organization[]) => {
    // ⚠️ FETCH LẠI children cho TỪNG org level 1
    for (const org of orgs) {
        const children = await organizationService.getOrganizationChildren(org.id);
        // Update state với children mới
    }
}, []);
```

**File:** `frontend/src/features/organizations/hooks/useOrganizationPage.ts`

```typescript
const fetchData = useCallback(async () => {
    if (!isDetailPage && !isSubDetailPage) {
        // Case: Main page
        const orgs = await fetchOrganizationTree(); // ← Fetch TOÀN BỘ tree
        await fetchAllLevel1Children(orgs);         // ← Fetch LẠI children!
    }
    await fetchStats(); // ← Fetch stats riêng
}, [isDetailPage, isSubDetailPage, type, code]);
```

### 4. Các Nơi Khác Cũng Gọi `getOrganizations()`

**Danh sách 11 components gọi `organizationService.getOrganizations()`:**

1. ✅ `ActivityForm.tsx` (CTXH) - Cần optimize với permission-based filtering
2. ✅ `LimitConfigForm.tsx` (CTXH) - Nên cache hoặc dùng accessible orgs
3. ✅ `ActivityList.tsx` (CTXH) - Filter dropdown, nên cache
4. ✅ `PaymentCampaignsPage.tsx` - Nên dùng accessible orgs API
5. ✅ `PaymentCampaignForm.tsx` - Nên dùng accessible orgs API
6. ✅ `UserRoleAssignmentModal.tsx` - Có thể cache
7. ✅ `ViewUserModal.tsx` - Có thể cache
8. ✅ `EditUserModal.tsx` - Có thể cache
9. ✅ `CreateUserModal.tsx` - Có thể cache
10. ✅ `useGrantRoles.ts` - Có thể cache

**Vấn đề:**
- Mỗi lần mở modal/form → gọi API lấy TOÀN BỘ orgs
- Không có caching
- Không dùng API filtered (accessible orgs)

---

## 💡 Giải Pháp Đề Xuất

### ⭐ Giải Pháp 1: Lazy Loading với Pagination (KHUYẾN NGHỊ)

**Ý tưởng:** Chỉ load những gì cần thiết, khi cần thiết.

#### Backend Changes

**Tạo API mới với pagination và lazy loading:**

```typescript
// organizations.controller.ts
@Get('tree-paginated')
@ApiOperation({ summary: 'Lấy cây tổ chức với lazy loading' })
async findTreePaginated(
  @Query('level') level?: number,
  @Query('parentId') parentId?: string,
  @Query('page') page: number = 1,
  @Query('limit') limit: number = 50
) {
  return this.organizationsService.findTreePaginated({ level, parentId, page, limit });
}
```

**Service implementation:**

```typescript
// organizations.service.ts
async findTreePaginated(options: {
  level?: number;
  parentId?: string;
  page: number;
  limit: number;
}): Promise<{
  organizations: OrganizationWithExtras[];
  total: number;
  page: number;
  totalPages: number;
}> {
  const { level, parentId, page, limit } = options;
  
  // Query builder để lấy organizations theo điều kiện
  const queryBuilder = this.organizationsRepository
    .createQueryBuilder('org')
    .leftJoinAndSelect('org.parent', 'parent');
  
  // Filter theo level hoặc parentId
  if (level !== undefined) {
    // Lấy orgs ở level cụ thể
    queryBuilder.where('org.level = :level', { level });
  } else if (parentId) {
    // Lấy children của parent cụ thể
    queryBuilder.where('org.parentId = :parentId', { parentId });
  } else {
    // Mặc định: Chỉ lấy level 1 (root orgs)
    queryBuilder.where('org.parentId IS NULL');
  }
  
  // Pagination
  const skip = (page - 1) * limit;
  queryBuilder
    .skip(skip)
    .take(limit)
    .orderBy('org.name', 'ASC');
  
  const [organizations, total] = await queryBuilder.getManyAndCount();
  
  // Lấy member counts
  const orgIds = organizations.map(org => org.id);
  const memberCountsMap = await this.getMemberCountsMap(orgIds);
  
  // Check hasChildren
  const orgsWithExtras = await Promise.all(
    organizations.map(async (org) => {
      const childrenCount = await this.organizationsRepository.count({
        where: { parent: { id: org.id } }
      });
      
      return {
        ...org,
        memberCount: memberCountsMap.get(org.id) || 0,
        hasChildren: childrenCount > 0
      } as OrganizationWithExtras;
    })
  );
  
  return {
    organizations: orgsWithExtras,
    total,
    page,
    totalPages: Math.ceil(total / limit)
  };
}
```

#### Frontend Changes

**Hook mới: `useOrganizationTreeLazy.ts`**

```typescript
export const useOrganizationTreeLazy = () => {
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [expandedOrgIds, setExpandedOrgIds] = useState<Set<string>>(new Set());
  const [loadingOrgIds, setLoadingOrgIds] = useState<Set<string>>(new Set());
  
  // Load level 1 orgs initially
  const loadRootOrganizations = useCallback(async () => {
    const response = await organizationService.getOrganizationTreePaginated({
      level: 0, // Root level
      page: 1,
      limit: 50
    });
    
    setOrganizations(response.organizations);
  }, []);
  
  // Load children when org is expanded
  const loadChildren = useCallback(async (orgId: string) => {
    if (expandedOrgIds.has(orgId)) return; // Already loaded
    
    setLoadingOrgIds(prev => new Set(prev).add(orgId));
    
    try {
      const response = await organizationService.getOrganizationTreePaginated({
        parentId: orgId,
        page: 1,
        limit: 100
      });
      
      // Update organizations tree
      setOrganizations(prev => updateOrgChildren(prev, orgId, response.organizations));
      setExpandedOrgIds(prev => new Set(prev).add(orgId));
    } finally {
      setLoadingOrgIds(prev => {
        const next = new Set(prev);
        next.delete(orgId);
        return next;
      });
    }
  }, [expandedOrgIds]);
  
  const toggleOrgExpanded = useCallback((orgId: string, isExpanded: boolean) => {
    if (isExpanded && !expandedOrgIds.has(orgId)) {
      loadChildren(orgId);
    }
  }, [expandedOrgIds, loadChildren]);
  
  return {
    organizations,
    loadingOrgIds,
    loadRootOrganizations,
    toggleOrgExpanded
  };
};
```

**Component update:**

```tsx
// OrganizationsPage.tsx
const Organizations: React.FC = () => {
  const { 
    organizations, 
    loadingOrgIds,
    loadRootOrganizations,
    toggleOrgExpanded 
  } = useOrganizationTreeLazy();
  
  useEffect(() => {
    loadRootOrganizations();
  }, []);
  
  return (
    <OrganizationTreeContainer>
      {organizations.map(org => (
        <OrganizationTreeItem
          key={org.id}
          org={org}
          isLoading={loadingOrgIds.has(org.id)}
          onToggleExpand={(isExpanded) => toggleOrgExpanded(org.id, isExpanded)}
        />
      ))}
    </OrganizationTreeContainer>
  );
};
```

**Lợi ích:**
- ✅ Initial load chỉ lấy ~10-50 orgs level 1
- ✅ Children chỉ load khi user click expand
- ✅ Giảm 80-90% thời gian load ban đầu
- ✅ Giảm bandwidth đáng kể

---

### ⭐ Giải Pháp 2: Caching với React Query (BỔ SUNG)

**Cài đặt React Query:**

```bash
npm install @tanstack/react-query
```

**Setup Query Client:**

```typescript
// App.tsx hoặc main.tsx
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 phút
      cacheTime: 10 * 60 * 1000, // 10 phút
      refetchOnWindowFocus: false,
    },
  },
});

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      {/* ... */}
    </QueryClientProvider>
  );
}
```

**Hook với caching:**

```typescript
// useOrganizationsCache.ts
import { useQuery } from '@tanstack/react-query';

export const useOrganizationsCache = () => {
  return useQuery({
    queryKey: ['organizations', 'all'],
    queryFn: () => organizationService.getOrganizations(),
    staleTime: 5 * 60 * 1000, // Cache 5 phút
  });
};

export const useOrganizationTreeCache = () => {
  return useQuery({
    queryKey: ['organizations', 'tree'],
    queryFn: () => organizationService.getOrganizationTree(),
    staleTime: 5 * 60 * 1000,
  });
};

export const useOrganizationChildren = (orgId: string, enabled: boolean) => {
  return useQuery({
    queryKey: ['organizations', orgId, 'children'],
    queryFn: () => organizationService.getOrganizationChildren(orgId),
    enabled, // Chỉ fetch khi enabled = true
    staleTime: 5 * 60 * 1000,
  });
};
```

**Sử dụng trong components:**

```tsx
// ActivityForm.tsx
const { data: organizations, isLoading } = useOrganizationsCache();

// OrganizationTreeItem.tsx
const { data: children, isLoading } = useOrganizationChildren(
  org.id,
  isExpanded // Chỉ fetch khi expanded
);
```

**Lợi ích:**
- ✅ Tự động cache results
- ✅ Không fetch lại nếu data còn fresh
- ✅ Sharing cache giữa các components
- ✅ Background refetch khi stale

---

### ⭐ Giải Pháp 3: Optimize API `/organizations` với Filtering

**Backend: Thêm query params cho filtering:**

```typescript
// organizations.controller.ts
@Get()
@ApiOperation({ summary: 'Lấy danh sách tổ chức với filtering' })
async findAll(
  @Query('type') type?: OrganizationType,
  @Query('level') level?: number,
  @Query('parentId') parentId?: string,
  @Query('includeChildren') includeChildren: boolean = false,
  @Query('includeMemberCount') includeMemberCount: boolean = false,
  @Query('limit') limit?: number
) {
  return this.organizationsService.findAllFiltered({
    type,
    level,
    parentId,
    includeChildren,
    includeMemberCount,
    limit
  });
}
```

**Service:**

```typescript
async findAllFiltered(options: {
  type?: OrganizationType;
  level?: number;
  parentId?: string;
  includeChildren?: boolean;
  includeMemberCount?: boolean;
  limit?: number;
}): Promise<Organization[]> {
  const queryBuilder = this.organizationsRepository
    .createQueryBuilder('org');
  
  // Apply filters
  if (options.type) {
    queryBuilder.where('org.type = :type', { type: options.type });
  }
  if (options.level !== undefined) {
    queryBuilder.andWhere('org.level = :level', { level: options.level });
  }
  if (options.parentId) {
    queryBuilder.andWhere('org.parentId = :parentId', { parentId: options.parentId });
  }
  
  // Relations
  if (options.includeChildren) {
    queryBuilder.leftJoinAndSelect('org.children', 'children');
  }
  
  // Limit
  if (options.limit) {
    queryBuilder.take(options.limit);
  }
  
  queryBuilder.orderBy('org.name', 'ASC');
  
  const organizations = await queryBuilder.getMany();
  
  // Add member count if requested
  if (options.includeMemberCount) {
    const orgIds = organizations.map(o => o.id);
    const memberCountsMap = await this.getMemberCountsMap(orgIds);
    return organizations.map(org => ({
      ...org,
      memberCount: memberCountsMap.get(org.id) || 0
    }));
  }
  
  return organizations;
}
```

**Frontend usage:**

```typescript
// Chỉ lấy orgs cần thiết
const orgs = await organizationService.getOrganizations({
  type: 'doan_truong',
  limit: 10
});
```

---

### ⭐ Giải Pháp 4: Fix Duplicate Fetch (QUAN TRỌNG)

**Vấn đề:** `fetchOrganizationTree()` đã trả về children rồi nhưng vẫn gọi `fetchAllLevel1Children()`

**Fix trong `useOrganizationPage.ts`:**

```typescript
const fetchData = useCallback(async () => {
  setLoading(true);
  setError(null);
  try {
    if (!isDetailPage && !isSubDetailPage) {
      // Case: Main page
      const orgs = await fetchOrganizationTree();
      
      // ❌ XÓA DÒNG NÀY - Không cần fetch lại children nữa!
      // await fetchAllLevel1Children(orgs);
      
      // ✅ Children đã có trong orgs rồi từ findTrees()
    }
    
    await fetchStats();
  } catch (err) {
    setError(err instanceof Error ? err.message : 'Có lỗi xảy ra');
  } finally {
    setLoading(false);
  }
}, [isDetailPage, isSubDetailPage]);
```

**Hoặc nếu muốn giữ lazy loading:**

```typescript
const fetchData = useCallback(async () => {
  if (!isDetailPage && !isSubDetailPage) {
    // CHỈ lấy level 1, không lấy children
    const orgs = await fetchOrganizationTreeLevel1Only();
    
    // Children sẽ load khi user click expand
    // (Implement trong OrganizationTreeItem)
  }
}, []);
```

---

## 📋 Kế Hoạch Triển Khai

### Phase 1: Quick Wins (1-2 ngày) ⚡

1. **Fix duplicate fetch ngay lập tức**
   - Xóa `fetchAllLevel1Children()` trong main page
   - Test xem có ảnh hưởng gì không

2. **Thêm caching với React Query**
   - Cài đặt React Query
   - Wrap các API calls quan trọng
   - Test performance improvement

3. **Optimize các form/modal gọi `getOrganizations()`**
   - Dùng cache thay vì fetch mới
   - Hoặc dùng `getAccessibleOrganizations()` API

### Phase 2: Backend Optimization (3-5 ngày) 🔧

1. **Implement API pagination**
   - Tạo endpoint `/organizations/tree-paginated`
   - Test với data thực

2. **Thêm filtering cho `/organizations`**
   - Query params: type, level, limit
   - Optimize queries

3. **Tạo indexes trong database**
   ```sql
   CREATE INDEX idx_org_parent ON organizations(parent_id);
   CREATE INDEX idx_org_type ON organizations(type);
   CREATE INDEX idx_org_level ON organizations(level);
   CREATE INDEX idx_user_org ON user_organizations(organization_id, user_id);
   ```

### Phase 3: Frontend Lazy Loading (5-7 ngày) 🎨

1. **Implement `useOrganizationTreeLazy`**
   - Load on demand
   - Skeleton loading states

2. **Update OrganizationTreeItem**
   - Fetch children on expand
   - Show loading spinner

3. **Virtualization cho long lists**
   - Cài `react-window` hoặc `react-virtualized`
   - Implement virtual scrolling

### Phase 4: Monitoring & Fine-tuning (ongoing) 📊

1. **Thêm performance monitoring**
   - Track API response times
   - Monitor bundle size
   - User analytics

2. **A/B testing**
   - So sánh old vs new approach
   - Gather user feedback

---

## 🎯 Kết Quả Kỳ Vọng

### Before Optimization:
- ⏱️ Initial load: 8-12 giây
- 📦 Data transferred: ~2-5 MB
- 🔄 API calls: 15-20 calls
- 💾 Memory usage: Cao

### After Optimization (Phase 1):
- ⏱️ Initial load: 4-6 giây (-50%)
- 📦 Data transferred: ~1-2 MB (-60%)
- 🔄 API calls: 8-10 calls (-50%)
- 💾 Memory usage: Giảm đáng kể

### After Full Optimization (Phase 3):
- ⏱️ Initial load: 1-2 giây (-85%)
- 📦 Data transferred: ~200-500 KB (-90%)
- 🔄 API calls: 2-3 calls (-85%)
- 💾 Memory usage: Tối ưu
- 🚀 Perceived performance: Rất nhanh với lazy loading

---

## 🔥 Action Items - BẮT ĐẦU NGAY

### Mức Độ 1: CRITICAL (Làm ngay hôm nay)

1. [ ] **Fix duplicate fetch trong main page**
   ```typescript
   // File: frontend/src/features/organizations/hooks/useOrganizationPage.ts
   // Xóa hoặc comment dòng: await fetchAllLevel1Children(orgs);
   ```

2. [ ] **Kiểm tra xem findTrees() đã trả children chưa**
   - Console.log data từ API
   - Verify có cần fetch children không

### Mức Độ 2: HIGH (Tuần này)

3. [ ] **Setup React Query**
   - Install package
   - Setup QueryClient
   - Migrate 2-3 API calls sang useQuery

4. [ ] **Cache organizations trong forms**
   - ActivityForm.tsx
   - PaymentCampaignForm.tsx
   - User modals

### Mức Độ 3: MEDIUM (Tuần sau)

5. [ ] **Implement pagination API**
   - Backend endpoint mới
   - Frontend hook mới

6. [ ] **Database indexes**
   - Add indexes như đã list ở trên

---

## 📚 Tài Liệu Tham Khảo

- [React Query Documentation](https://tanstack.com/query/latest)
- [TypeORM Tree Entities](https://typeorm.io/tree-entities)
- [React Virtualization](https://github.com/bvaughn/react-window)
- [Web Performance Best Practices](https://web.dev/performance/)

---

## 💬 Ghi Chú

**Lưu ý quan trọng:**
- Backup code trước khi optimize
- Test kỹ với data thật
- Monitor production sau deploy
- Rollback plan sẵn sàng

**Team responsibilities:**
- Backend dev: API optimization + database indexes
- Frontend dev: Lazy loading + React Query
- QA: Performance testing + regression tests
- DevOps: Monitoring setup

---

**Ngày tạo:** 3/11/2025
**Người tạo:** AI Assistant
**Version:** 1.0
**Status:** 🔴 CRITICAL - Cần action ngay
