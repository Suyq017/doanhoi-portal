# So Sánh Hiệu Năng: Trang Users vs Trang Organizations

## 🔍 Phân Tích Tại Sao Trang Users Nhanh Hơn

### TL;DR:
**Trang Users nhanh vì:**
- ✅ Pagination ngay từ đầu (chỉ load 10 users/lần)
- ✅ Data đơn giản (flat list)
- ✅ Không có nested relationships
- ✅ Debounced search

**Trang Organizations chậm vì:**
- ❌ Load TOÀN BỘ tree (100+ orgs)
- ❌ Nested data (children, memberCount)
- ❌ Duplicate fetch
- ❌ Không có pagination

---

## 📊 So Sánh Chi Tiết

### Trang Users - Cơ Chế Hiện Tại

**File:** `frontend/src/shared/hooks/useUserList.ts`

```typescript
// ✅ PAGINATION NGAY TỪ ĐẦU
const loadUsers = async () => {
  const params: UserQueryParams = {
    page: currentPage,      // ← Page 1
    limit: limit,           // ← Limit 10
    search: searchTerm,
    userType: filterType,
    membershipStatus: filterStatus,
  };
  
  // Chỉ load 10 users cho trang hiện tại
  const response = await userService.getUsers(params);
  setUsers(response.users);  // ← 10 users only!
  setTotal(response.total);  // ← Total count từ backend
};
```

**Backend API:**
```typescript
// Backend trả về có pagination
GET /users?page=1&limit=10
→ Response: {
  users: [...10 users...],
  total: 1234
}
```

**Flow:**
```
User vào trang /users
  ↓
Load 10 users (page 1)
  ↓
API: GET /users?page=1&limit=10
  ↓
Backend query: SELECT * FROM users LIMIT 10 OFFSET 0
  ↓
⏱️ 0.2-0.5 giây (nhanh!)
  ↓
User click page 2
  ↓
Load 10 users tiếp (page 2)
  ↓
⏱️ 0.2-0.5 giây
```

---

### Trang Organizations - Cơ Chế Hiện Tại

**File:** `frontend/src/features/organizations/hooks/useOrganizationTree.ts`

```typescript
// ❌ LOAD TOÀN BỘ TREE
const fetchOrganizationTree = async () => {
  // Lấy TẤT CẢ organizations
  const treeData = await organizationService.getOrganizationTree();
  
  // Backend trả về TOÀN BỘ cây (100+ orgs)
  setOrganizations(treeData); // ← ALL organizations!
  return treeData;
};

// ❌ FETCH LẠI CHILDREN (DUPLICATE!)
const fetchAllLevel1Children = async (orgs: Organization[]) => {
  for (const org of orgs) {
    const children = await organizationService.getOrganizationChildren(org.id);
    // Update state
  }
};
```

**Backend API:**
```typescript
// Backend trả về TOÀN BỘ tree
GET /organizations/tree
→ Response: {
  organizations: [
    {
      id: '1',
      name: 'Org 1',
      children: [
        { id: '2', name: 'Child 1', children: [...] },
        { id: '3', name: 'Child 2', children: [...] }
      ],
      memberCount: 150
    },
    // ... 99 more orgs with nested children
  ]
}
```

**Flow:**
```
User vào trang /organizations
  ↓
Load TOÀN BỘ tree (100+ orgs)
  ↓
API: GET /organizations/tree
  ↓
Backend: findTrees() → Load ALL orgs with children
  ↓
Calculate memberCount cho TẤT CẢ orgs
  ↓
Trả về ~2-5 MB data
  ↓
⏱️ 3-5 giây (chậm!)
  ↓
Fetch lại children cho từng level 1 org (DUPLICATE!)
  ↓
N+1 queries: GET /organizations/:id/children × 10
  ↓
⏱️ Thêm 3-5 giây (rất chậm!)
  ↓
Total: 8-12 giây 💀
```

---

## 🔥 Nguyên Nhân Chính

### 1. Pagination vs Load All

| Feature | Users Page | Organizations Page |
|---------|------------|-------------------|
| **Load strategy** | Pagination ✅ | Load all ❌ |
| **Initial load** | 10 records | 100+ records |
| **Data size** | ~50 KB | ~2-5 MB |
| **Load time** | 0.5s | 8-12s |

### 2. Data Complexity

| Feature | Users Page | Organizations Page |
|---------|------------|-------------------|
| **Structure** | Flat list ✅ | Nested tree ❌ |
| **Relations** | None | Children + memberCount |
| **Processing** | Simple | Recursive + calculation |

### 3. Debounced Search

**Users Page:**
```typescript
// ✅ Debounced search - Chờ user ngừng gõ
useEffect(() => {
  const timeoutId = setTimeout(() => {
    setCurrentPage(1); // Reset về page 1
  }, 500); // Chờ 500ms
  
  return () => clearTimeout(timeoutId);
}, [searchTerm]);
```

**Organizations Page:**
```typescript
// ❌ Không có debounce
// Mỗi lần user gõ → render lại toàn bộ tree
```

### 4. Backend Query Efficiency

**Users:**
```sql
-- Simple query với LIMIT
SELECT * FROM users 
WHERE name LIKE '%search%'
LIMIT 10 OFFSET 0;

-- ⏱️ 0.1-0.2 giây
```

**Organizations:**
```typescript
// TypeORM findTrees() - Recursive queries
// Lấy toàn bộ cây với closure table
SELECT * FROM organizations_closure;
SELECT * FROM organizations WHERE id IN (...);
-- Sau đó đếm members cho MỌI org
SELECT COUNT(*) FROM user_organizations WHERE org_id = '1';
SELECT COUNT(*) FROM user_organizations WHERE org_id = '2';
// ... × 100 orgs

-- ⏱️ 3-5 giây
```

---

## 💡 Giải Pháp: Áp Dụng Cơ Chế của Users Page

### Solution 1: Pagination cho Organizations (Dễ implement)

**Concept:** Load từng "trang" organizations thay vì toàn bộ tree

#### Backend Changes

```typescript
// organizations.controller.ts
@Get('paginated')
async findPaginated(
  @Query('page') page: number = 1,
  @Query('limit') limit: number = 20,
  @Query('parentId') parentId?: string
) {
  return this.organizationsService.findPaginated({ page, limit, parentId });
}
```

```typescript
// organizations.service.ts
async findPaginated(options: {
  page: number;
  limit: number;
  parentId?: string;
}): Promise<{
  organizations: Organization[];
  total: number;
  page: number;
  totalPages: number;
}> {
  const { page, limit, parentId } = options;
  
  const queryBuilder = this.organizationsRepository
    .createQueryBuilder('org');
  
  // Nếu có parentId → load children
  // Nếu không → load root orgs (level 0)
  if (parentId) {
    queryBuilder.where('org.parentId = :parentId', { parentId });
  } else {
    queryBuilder.where('org.parentId IS NULL');
  }
  
  const skip = (page - 1) * limit;
  queryBuilder
    .skip(skip)
    .take(limit)
    .orderBy('org.name', 'ASC');
  
  const [organizations, total] = await queryBuilder.getManyAndCount();
  
  // Add member counts
  const orgIds = organizations.map(o => o.id);
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
      };
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

**Hook mới: `useOrganizationList.ts` (giống useUserList)**

```typescript
import { useState, useEffect, useCallback } from 'react';
import { organizationService } from '../services/organizationService';

export const useOrganizationList = () => {
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [limit] = useState(20); // 20 orgs per page
  
  const totalPages = Math.ceil(total / limit);
  
  const loadOrganizations = useCallback(async () => {
    setLoading(true);
    try {
      const response = await organizationService.getOrganizationsPaginated({
        page: currentPage,
        limit
      });
      
      setOrganizations(response.organizations);
      setTotal(response.total);
    } catch (error) {
      console.error('Error loading organizations:', error);
    } finally {
      setLoading(false);
    }
  }, [currentPage, limit]);
  
  useEffect(() => {
    loadOrganizations();
  }, [currentPage, loadOrganizations]);
  
  return {
    organizations,
    total,
    loading,
    currentPage,
    totalPages,
    setCurrentPage,
    refreshOrganizations: loadOrganizations
  };
};
```

**Component với Pagination:**

```tsx
const OrganizationsPage: React.FC = () => {
  const { 
    organizations, 
    loading,
    currentPage,
    totalPages,
    setCurrentPage 
  } = useOrganizationList();
  
  return (
    <div>
      {/* Organizations List */}
      {organizations.map(org => (
        <OrganizationCard key={org.id} org={org} />
      ))}
      
      {/* Pagination */}
      <Pagination
        currentPage={currentPage}
        totalPages={totalPages}
        onPageChange={setCurrentPage}
      />
    </div>
  );
};
```

---

### Solution 2: Lazy Loading với Virtual Scrolling (Nâng cao)

**Concept:** Load organizations on-demand khi user scroll

#### Install react-window

```bash
npm install react-window
```

#### Implementation

```tsx
import { FixedSizeList } from 'react-window';
import InfiniteLoader from 'react-window-infinite-loader';

const OrganizationsVirtualList: React.FC = () => {
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [hasNextPage, setHasNextPage] = useState(true);
  const [isNextPageLoading, setIsNextPageLoading] = useState(false);
  
  const loadMoreItems = async (startIndex: number, stopIndex: number) => {
    setIsNextPageLoading(true);
    
    const page = Math.floor(startIndex / 20) + 1;
    const response = await organizationService.getOrganizationsPaginated({
      page,
      limit: 20
    });
    
    setOrganizations(prev => [...prev, ...response.organizations]);
    setHasNextPage(response.page < response.totalPages);
    setIsNextPageLoading(false);
  };
  
  const itemCount = hasNextPage ? organizations.length + 1 : organizations.length;
  
  return (
    <InfiniteLoader
      isItemLoaded={index => index < organizations.length}
      itemCount={itemCount}
      loadMoreItems={loadMoreItems}
    >
      {({ onItemsRendered, ref }) => (
        <FixedSizeList
          height={600}
          itemCount={itemCount}
          itemSize={80}
          onItemsRendered={onItemsRendered}
          ref={ref}
          width="100%"
        >
          {({ index, style }) => {
            const org = organizations[index];
            return org ? (
              <div style={style}>
                <OrganizationCard org={org} />
              </div>
            ) : (
              <div style={style}>Loading...</div>
            );
          }}
        </FixedSizeList>
      )}
    </InfiniteLoader>
  );
};
```

---

### Solution 3: Hybrid Approach (KHUYẾN NGHỊ) ⭐

**Concept:** Kết hợp pagination + lazy loading children + caching

#### Frontend Hook

```typescript
export const useOrganizationTreeOptimized = () => {
  const [rootOrgs, setRootOrgs] = useState<Organization[]>([]);
  const [expandedOrgIds, setExpandedOrgIds] = useState<Set<string>>(new Set());
  const [childrenCache, setChildrenCache] = useState<Map<string, Organization[]>>(new Map());
  
  // Load root organizations với pagination
  const loadRootOrganizations = useCallback(async (page: number) => {
    const response = await organizationService.getOrganizationsPaginated({
      page,
      limit: 20,
      parentId: null // Root orgs only
    });
    
    setRootOrgs(response.organizations);
  }, []);
  
  // Lazy load children khi expand
  const loadChildren = useCallback(async (orgId: string) => {
    // Check cache first
    if (childrenCache.has(orgId)) {
      return childrenCache.get(orgId)!;
    }
    
    // Fetch from API
    const children = await organizationService.getOrganizationChildren(orgId);
    
    // Update cache
    setChildrenCache(prev => new Map(prev).set(orgId, children));
    
    return children;
  }, [childrenCache]);
  
  const toggleExpand = useCallback(async (orgId: string) => {
    if (expandedOrgIds.has(orgId)) {
      // Collapse
      setExpandedOrgIds(prev => {
        const next = new Set(prev);
        next.delete(orgId);
        return next;
      });
    } else {
      // Expand - load children if not cached
      await loadChildren(orgId);
      setExpandedOrgIds(prev => new Set(prev).add(orgId));
    }
  }, [expandedOrgIds, loadChildren]);
  
  return {
    rootOrgs,
    expandedOrgIds,
    childrenCache,
    loadRootOrganizations,
    toggleExpand
  };
};
```

#### Component

```tsx
const OrganizationTreeOptimized: React.FC = () => {
  const { 
    rootOrgs, 
    expandedOrgIds,
    childrenCache,
    toggleExpand 
  } = useOrganizationTreeOptimized();
  
  const renderOrg = (org: Organization, level: number = 0) => {
    const isExpanded = expandedOrgIds.has(org.id);
    const children = childrenCache.get(org.id) || [];
    
    return (
      <div key={org.id} style={{ marginLeft: level * 20 }}>
        {/* Org header */}
        <div onClick={() => toggleExpand(org.id)}>
          {org.hasChildren && (isExpanded ? '▼' : '▶')}
          {org.name}
        </div>
        
        {/* Children (chỉ render khi expanded) */}
        {isExpanded && children.map(child => 
          renderOrg(child, level + 1)
        )}
      </div>
    );
  };
  
  return (
    <div>
      {rootOrgs.map(org => renderOrg(org))}
    </div>
  );
};
```

---

## 📋 Implementation Checklist

### Phase 1: Quick Wins (1-2 ngày)

- [ ] **Fix duplicate fetch**
  ```typescript
  // useOrganizationPage.ts
  // ❌ XÓA dòng này:
  await fetchAllLevel1Children(orgs);
  ```

- [ ] **Add debounced search**
  ```typescript
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      // Trigger search
    }, 500);
    return () => clearTimeout(timeoutId);
  }, [searchTerm]);
  ```

- [ ] **Optimize backend query**
  - Select only needed columns
  - Add database indexes
  - Limit initial query results

### Phase 2: Pagination (3-5 ngày)

- [ ] **Backend API**
  - [ ] Create `/organizations/paginated` endpoint
  - [ ] Implement `findPaginated()` method
  - [ ] Add hasChildren check

- [ ] **Frontend Hook**
  - [ ] Create `useOrganizationList` (similar to useUserList)
  - [ ] Implement pagination state
  - [ ] Add loading states

- [ ] **UI Components**
  - [ ] Add pagination controls
  - [ ] Update OrganizationTreeItem
  - [ ] Test with real data

### Phase 3: Lazy Loading + Caching (5-7 ngày)

- [ ] **React Query Setup**
  - [ ] Install @tanstack/react-query
  - [ ] Setup QueryClient
  - [ ] Create cached hooks

- [ ] **Lazy Loading**
  - [ ] Load children on expand
  - [ ] Cache children data
  - [ ] Show loading states

- [ ] **Virtual Scrolling (Optional)**
  - [ ] Install react-window
  - [ ] Implement InfiniteLoader
  - [ ] Test performance

---

## 🎯 Kết Quả Kỳ Vọng

### Before Optimization:

| Metric | Organizations Page |
|--------|-------------------|
| Initial load | 8-12 giây |
| Data transferred | 2-5 MB |
| Records loaded | 100+ orgs |
| API calls | 15-20 |
| Memory usage | High |

### After Phase 1 (Fix duplicate):

| Metric | Organizations Page |
|--------|-------------------|
| Initial load | 4-6 giây (-50%) |
| Data transferred | 1-2 MB (-60%) |
| Records loaded | 100+ orgs |
| API calls | 1-2 (-90%) |
| Memory usage | Medium |

### After Phase 2 (Pagination):

| Metric | Organizations Page |
|--------|-------------------|
| Initial load | **1-2 giây (-85%)** |
| Data transferred | **200-500 KB (-90%)** |
| Records loaded | **20 orgs only** |
| API calls | **1-2** |
| Memory usage | **Low** |

### After Phase 3 (Full optimization):

| Metric | Organizations Page |
|--------|-------------------|
| Initial load | **0.5-1 giây (-90%)** |
| Cached load | **0ms (instant)** |
| Data transferred | **100-200 KB (-95%)** |
| Records loaded | **20 root + on-demand children** |
| API calls | **1 (root) + n (children)** |
| Memory usage | **Very Low** |

---

## 💡 Key Takeaways

### Tại Sao Users Page Nhanh:

1. ✅ **Pagination** - Chỉ load 10 users/lần
2. ✅ **Simple data** - Flat structure, no nesting
3. ✅ **Debounced search** - Không spam API
4. ✅ **Efficient query** - SELECT với LIMIT

### Để Organizations Page Nhanh Tương Tự:

1. ✅ **Áp dụng pagination** - Load 20 orgs/page
2. ✅ **Lazy load children** - Chỉ load khi expand
3. ✅ **Add caching** - React Query
4. ✅ **Fix duplicate fetch** - Ngay lập tức
5. ✅ **Debounced search** - Copy từ Users page

### Pattern để học:

```typescript
// ✅ GOOD PATTERN (như Users Page)
const loadData = async () => {
  const response = await service.getData({
    page: currentPage,
    limit: 20,
    ...filters
  });
  
  setData(response.data); // Chỉ 20 records
  setTotal(response.total);
};

// ❌ BAD PATTERN (Organizations hiện tại)
const loadData = async () => {
  const response = await service.getAll(); // ALL data!
  setData(response); // 100+ records
};
```

---

## 🚀 Quick Start

### Bắt đầu ngay hôm nay:

1. **Fix duplicate fetch (5 phút)**
   ```typescript
   // File: useOrganizationPage.ts
   // Comment dòng này:
   // await fetchAllLevel1Children(orgs);
   ```

2. **Test performance**
   - Network tab: API calls giảm từ 15 → 1
   - Load time giảm từ 8s → 4s
   - Success! 🎉

3. **Plan Phase 2**
   - Backend: Tạo pagination API
   - Frontend: Hook useOrganizationList
   - Target: 1-2 giây load time

---

**Version:** 1.0  
**Date:** 3/11/2025  
**Status:** 🔴 URGENT - Cần implement pagination như Users Page
