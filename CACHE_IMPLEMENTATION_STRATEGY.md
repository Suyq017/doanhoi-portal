# Chiến Lược Implementation: Cache vs API Optimization

## 🤔 Câu Hỏi Quan Trọng

**User's Question:**
> "Trang quản lý tổ chức và combobox đều lấy danh sách tổ chức. Nếu đã gọi API ở đâu rồi thì lấy cache. Nên chỉnh lại cách gọi API phía tổ chức trước hay áp dụng cache trước? Và nếu truy cập combobox lấy tổ chức trước rồi, ở trang quản lý tổ chức muốn lấy lại thì cơ chế cache áp dụng như nào?"

---

## 🎯 TL;DR - Khuyến Nghị

### ✅ LÀM TRƯỚC (Week 1-2): FIX API STRUCTURE
**Tại sao?**
- Combobox và Tree view cần **DATA KHÁC NHAU**
- Cache cái gì cũng không giúp nếu data không đúng
- API optimization là **foundation**, cache là **enhancement**

### ✅ LÀM SAU (Week 3-4): ADD CACHING
**Tại sao?**
- Cache chỉ hiệu quả khi data đã được tối ưu
- React Query sẽ tự động cache 2 APIs riêng biệt
- Không xảy ra conflict giữa tree và flat data

---

## 📊 Phân Tích Tình Huống

### Scenario 1: User Vào ComboBox Trước

#### ❌ WRONG: Single API + Cache
```typescript
// User mở Create User Modal
ComboBox → getOrganizations() 
  ↓
  Fetch: 2-5 MB (FULL TREE với children, memberCount)
  ↓
  Cache: organizations = [full tree data]
  
// User vào Organizations Page
Tree View → getOrganizations() 
  ↓
  ✅ Cache HIT! (nhanh)
  ↓
  ❌ Problem: Đã có data nên không fetch lại
  ↓
  ❌ Problem: Đã load TOÀN BỘ tree từ combobox
  ↓
  Result: Lãng phí 2-5 MB cho combobox chỉ cần 100 KB
```

**Vấn đề:**
1. ComboBox không cần tree structure → Lãng phí bandwidth
2. Cache hit nhưng data không tối ưu cho từng use case
3. Không thể invalidate riêng từng loại data

#### ✅ CORRECT: Dual API + Separate Cache
```typescript
// User mở Create User Modal
ComboBox → getOrganizationsFlat() 
  ↓
  Fetch: 100-200 KB (FLAT LIST - id, name, code only)
  ↓
  Cache Key: "organizations-flat"
  ↓
  ⚡ Fast! Chỉ 0.5s

// User vào Organizations Page
Tree View → getOrganizationTree({ maxDepth: 2 }) 
  ↓
  Fetch: 500 KB - 1 MB (TREE STRUCTURE with level 1 & 2)
  ↓
  Cache Key: "organizations-tree-depth-2"
  ↓
  ⚡ Fast! Chỉ 2-3s
  ↓
  ✅ 2 caches độc lập, không conflict
```

**Lợi ích:**
1. Mỗi use case có data tối ưu riêng
2. Cache keys khác nhau → Không conflict
3. Có thể invalidate riêng từng loại
4. Total data transfer giảm 70-80%

---

### Scenario 2: User Vào Organizations Page Trước

#### ❌ WRONG: Single API + Cache
```typescript
// User vào Organizations Page
Tree View → getOrganizations()
  ↓
  Fetch: 2-5 MB (FULL TREE)
  ↓
  Cache: organizations = [full tree with all levels]
  ↓
  Load time: 8-12s

// User mở Create User Modal
ComboBox → getOrganizations()
  ↓
  ✅ Cache HIT!
  ↓
  ❌ Problem: Nhận full tree data
  ↓
  ❌ Problem: Phải flatten tree để hiển thị combobox
  ↓
  ❌ Problem: Dropdown render 500+ items với nested data
  ↓
  Result: ComboBox lag, memory usage cao
```

#### ✅ CORRECT: Dual API + Separate Cache
```typescript
// User vào Organizations Page
Tree View → getOrganizationTree({ maxDepth: 2 })
  ↓
  Fetch: 500 KB - 1 MB (Only level 1 & 2)
  ↓
  Cache Key: "organizations-tree-depth-2"
  ↓
  Load time: 2-3s

// User mở Create User Modal
ComboBox → getOrganizationsFlat()
  ↓
  Fetch: 100-200 KB (Flat list)
  ↓
  Cache Key: "organizations-flat"
  ↓
  ⚡ Instant! Chỉ 0.3s
  ↓
  ComboBox render smooth
```

---

## 🔧 Implementation Order

### Phase 1: API Optimization (PRIORITY 🔴 HIGH)

**Timeline:** Week 1-2 (7-10 ngày)

#### Backend Changes

**File:** `backend/src/organizations/organizations.controller.ts`

```typescript
@Controller('organizations')
export class OrganizationsController {
  
  // ✅ NEW API 1: Flat list cho ComboBox
  @Get('flat')
  async getOrganizationsFlat(
    @Query('search') search?: string,
    @Query('type') type?: OrganizationType,
    @Query('limit') limit?: number,
  ) {
    return this.organizationsService.findAllFlat({
      search,
      type,
      limit: limit || 1000 // Default 1000 orgs
    });
  }
  
  // ✅ NEW API 2: Tree với depth limit cho Tree View
  @Get('tree')
  async getOrganizationTree(
    @Query('maxDepth') maxDepth?: number,
    @Query('type') type?: string,
    @Query('code') code?: string,
  ) {
    if (type && code) {
      return this.organizationsService.findTreeByTypeCode(type, code, maxDepth || 2);
    }
    return this.organizationsService.findTreeWithDepth(maxDepth || 2);
  }
  
  // ✅ NEW API 3: Specific org cho Sub-Detail Page
  @Get('by-type-code/:type/:code')
  async getByTypeCode(
    @Param('type') type: string,
    @Param('code') code: string,
    @Query('includeChildren') includeChildren?: boolean,
    @Query('maxDepth') maxDepth?: number,
  ) {
    return this.organizationsService.findByTypeCodeWithChildren(
      type,
      code,
      includeChildren === 'true',
      maxDepth ? parseInt(maxDepth) : 1
    );
  }
}
```

**File:** `backend/src/organizations/organizations.service.ts`

```typescript
@Injectable()
export class OrganizationsService {
  
  /**
   * Find all organizations as FLAT LIST (cho ComboBox)
   * Không có children, memberCount, parent relations
   */
  async findAllFlat(options: {
    search?: string;
    type?: OrganizationType;
    limit?: number;
  }): Promise<OrganizationFlatDto[]> {
    const { search, type, limit } = options;
    
    const queryBuilder = this.organizationsRepository
      .createQueryBuilder('org')
      .select([
        'org.id',
        'org.name',
        'org.code',
        'org.type',
        'org.fullName' // Optional
      ]);
    
    // Search
    if (search) {
      queryBuilder.where(
        '(LOWER(org.name) LIKE LOWER(:search) OR LOWER(org.code) LIKE LOWER(:search))',
        { search: `%${search}%` }
      );
    }
    
    // Filter by type
    if (type) {
      queryBuilder.andWhere('org.type = :type', { type });
    }
    
    // Order by name
    queryBuilder.orderBy('org.name', 'ASC');
    
    // Limit results
    if (limit) {
      queryBuilder.limit(limit);
    }
    
    const results = await queryBuilder.getMany();
    
    // Return flat list (no processing needed)
    return results.map(org => ({
      id: org.id,
      name: org.name,
      code: org.code,
      type: org.type,
      fullName: org.fullName
    }));
  }
  
  /**
   * Find tree with depth limit (cho Tree View)
   * Đã implement trong LOAD_STRATEGY_BY_PAGE.md
   */
  async findTreeWithDepth(maxDepth: number = 2): Promise<OrganizationWithExtras[]> {
    // Implementation đã có trong file LOAD_STRATEGY_BY_PAGE.md
    // ...
  }
}
```

#### Frontend Service Updates

**File:** `frontend/src/shared/services/organizationService.ts`

```typescript
// DTO for flat list
export interface OrganizationFlat {
  id: string;
  name: string;
  code: string;
  type: string;
  fullName?: string;
}

export const organizationService = {
  
  // ✅ API 1: Flat list (cho ComboBox)
  async getOrganizationsFlat(params?: {
    search?: string;
    type?: string;
    limit?: number;
  }): Promise<OrganizationFlat[]> {
    const response = await api.get<OrganizationFlat[]>('/organizations/flat', {
      params
    });
    return response.data;
  },
  
  // ✅ API 2: Tree with depth (cho Tree View)
  async getOrganizationTreeWithDepth(maxDepth: number = 2): Promise<Organization[]> {
    const response = await api.get<Organization[]>('/organizations/tree', {
      params: { maxDepth }
    });
    return response.data;
  },
  
  // ✅ API 3: Specific org by type/code (cho Detail/SubDetail)
  async getOrganizationByTypeCode(
    type: string,
    code: string,
    options: {
      includeChildren?: boolean;
      maxDepth?: number;
    } = {}
  ): Promise<Organization> {
    const response = await api.get<Organization>(
      `/organizations/by-type-code/${type}/${code}`,
      { params: options }
    );
    return response.data;
  },
  
  // ❌ DEPRECATED: Old API (giữ lại cho backward compatibility)
  async getOrganizations(): Promise<Organization[]> {
    console.warn('⚠️ getOrganizations() is deprecated. Use getOrganizationsFlat() or getOrganizationTreeWithDepth() instead');
    const response = await api.get<Organization[]>('/organizations/tree');
    return response.data;
  }
};
```

---

### Phase 2: React Query Caching (Week 3-4)

**Timeline:** 5-7 ngày

#### Setup React Query

**File:** `frontend/src/main.tsx`

```typescript
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';

// Create Query Client với config tối ưu
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutes
      cacheTime: 30 * 60 * 1000, // 30 minutes
      refetchOnWindowFocus: false,
      refetchOnMount: false,
      retry: 1
    }
  }
});

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <YourApp />
      <ReactQueryDevtools initialIsOpen={false} />
    </QueryClientProvider>
  );
}
```

#### Query Hooks

**File:** `frontend/src/shared/hooks/useOrganizationQueries.ts`

```typescript
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { organizationService } from '../services/organizationService';

// Query Keys (central management)
export const organizationKeys = {
  all: ['organizations'] as const,
  flat: () => [...organizationKeys.all, 'flat'] as const,
  tree: () => [...organizationKeys.all, 'tree'] as const,
  treeWithDepth: (depth: number) => [...organizationKeys.tree(), { depth }] as const,
  detail: (type: string, code: string) => [...organizationKeys.all, 'detail', type, code] as const,
  stats: () => [...organizationKeys.all, 'stats'] as const, // ← Stats cache
};

/**
 * Hook cho ComboBox - Flat list
 * Cache key: ['organizations', 'flat']
 */
export const useOrganizationsFlat = (params?: {
  search?: string;
  type?: string;
  limit?: number;
}) => {
  return useQuery({
    queryKey: [...organizationKeys.flat(), params],
    queryFn: () => organizationService.getOrganizationsFlat(params),
    staleTime: 10 * 60 * 1000, // 10 minutes (flat list ít thay đổi)
    cacheTime: 60 * 60 * 1000, // 1 hour
  });
};

/**
 * Hook cho Tree View - Tree with depth
 * Cache key: ['organizations', 'tree', { depth: 2 }]
 */
export const useOrganizationTree = (maxDepth: number = 2) => {
  return useQuery({
    queryKey: organizationKeys.treeWithDepth(maxDepth),
    queryFn: () => organizationService.getOrganizationTreeWithDepth(maxDepth),
    staleTime: 5 * 60 * 1000, // 5 minutes
    cacheTime: 30 * 60 * 1000, // 30 minutes
  });
};
/**
 * Hook cho Detail/SubDetail Page
 * Cache key: ['organizations', 'detail', type, code]
 */
export const useOrganizationDetail = (
  type: string,
  code: string,
  options?: {
    includeChildren?: boolean;
    maxDepth?: number;
  }
) => {
  return useQuery({
    queryKey: [...organizationKeys.detail(type, code), options],
    queryFn: () => organizationService.getOrganizationByTypeCode(type, code, options),
    staleTime: 5 * 60 * 1000,
    enabled: !!(type && code), // Only fetch if type/code provided
  });
};

/**
 * Hook cho Stats - Shared across ALL pages
 * Cache key: ['organizations', 'stats']
 * 
 * Stats là global data (tổng hợp toàn hệ thống):
 * - Không phụ thuộc vào page nào
 * - Mọi page dùng chung 1 cache
 * - Stale time dài (stats ít thay đổi)
 */
export const useOrganizationStats = () => {
  return useQuery({
    queryKey: organizationKeys.stats(),
    queryFn: () => organizationService.getOrganizationStats(),
    staleTime: 5 * 60 * 1000, // 5 minutes (stats ít thay đổi)
    cacheTime: 30 * 60 * 1000, // 30 minutes
    refetchOnMount: false, // Không refetch nếu cache còn fresh
  });
};});
};

/**
 * Hook để invalidate caches
 */
    // Invalidate specific detail
    invalidateDetail: (type: string, code: string) => {
      queryClient.invalidateQueries({ queryKey: organizationKeys.detail(type, code) });
    },
    
    // Invalidate stats (sau khi create/delete organization)
    invalidateStats: () => {
      queryClient.invalidateQueries({ queryKey: organizationKeys.stats() });
    }
  };
};  invalidateAll: () => {
      queryClient.invalidateQueries({ queryKey: organizationKeys.all });
    },
    
    // Invalidate chỉ flat list (sau khi create/update org)
    invalidateFlat: () => {
      queryClient.invalidateQueries({ queryKey: organizationKeys.flat() });
    },
    
    // Invalidate chỉ tree (sau khi thay đổi structure)
    invalidateTree: () => {
      queryClient.invalidateQueries({ queryKey: organizationKeys.tree() });
    },
    
    // Invalidate specific detail
    invalidateDetail: (type: string, code: string) => {
      queryClient.invalidateQueries({ queryKey: organizationKeys.detail(type, code) });
    }
  };
};
```

---

## 🎯 Cơ Chế Cache Hoạt Động

### Case 1: User Mở ComboBox Trước

```typescript
// Step 1: User mở Create User Modal
const ComboBox = () => {
  const { data: organizations, isLoading } = useOrganizationsFlat();
  
  // First time:
  // - Fetch: GET /organizations/flat
  // - Cache: ['organizations', 'flat'] = [...flat data]
  // - Time: 0.5s
  
  // Second time (same component):
  // - Cache HIT! Instant (0ms)
  
  return <Combobox options={organizations} />;
};

// Step 2: User vào Organizations Page
const OrganizationsPage = () => {
  const { data: organizations, isLoading: loadingOrgs } = useOrganizationTree(2);
  const { data: stats, isLoading: loadingStats } = useOrganizationStats();
  
  // Organizations:
  // - Cache MISS (different key: ['organizations', 'tree', { depth: 2 }])
  // - Fetch: GET /organizations/tree?maxDepth=2
  // - Time: 2-3s
  
  // Stats:
  // - Cache MISS (first time loading stats)
  // - Fetch: GET /organizations/stats
  // - Cache: ['organizations', 'stats'] = {...stats}
  // - Time: 0.3-0.5s
  
  // ✅ 2 caches độc lập + 1 stats cache shared
  
  return <Tree data={organizations} stats={stats} />;
};

// Step 3: User mở ComboBox lần 2
// - Cache HIT! ['organizations', 'flat'] still valid
// - Time: 0ms (instant)
### Case 2: User Tạo Organization Mới

```typescript
const CreateOrgButton = () => {
  const { invalidateAll, invalidateStats } = useInvalidateOrganizations();
  
  const handleCreate = async () => {
    await organizationService.createOrganization(data);
    
    // Option 1: Invalidate ALL (simple, comprehensive)
    invalidateAll();
    // ↓
    // Refetch:
    // - useOrganizationsFlat() → Refetch flat list
    // - useOrganizationTree() → Refetch tree
    // - useOrganizationStats() → Refetch stats
    
    // Option 2: Invalidate chỉ cái cần (optimal)
    invalidateFlat(); // ComboBox needs new org
    invalidateStats(); // Stats count changed
    // Tree có thể chờ đến khi user vào page mới refetch
  };
};

// Khuyến nghị: Invalidate theo impact
const handleCreateOrg = async () => {
  await createOrganization(data);
### Case 3: Stale Time & Background Refetch

```typescript
// User mở ComboBox lần 1
t = 0s: 
  - Fetch flat list → Cache (fresh)
  - Fetch stats → Cache (fresh)

t = 3min: User mở ComboBox lần 2 
  - Flat: Cache HIT (still fresh, staleTime: 10min)
  - Stats: Cache HIT (still fresh, staleTime: 5min)

t = 6min: User vào Org Page
  - Tree: Fetch (first time)
  - Stats: Cache HIT but STALE (staleTime: 5min expired)
    ↓
    Background refetch stats (không block UI)
    ↓
    UI shows old stats instantly
    ↓
    New stats arrives → Update UI smoothly
    ↓
    Cache refreshed

t = 12min: User mở ComboBox lần 3
  - Flat: Cache HIT but STALE (staleTime: 10min expired)
    ↓
    Background refetch flat (không block UI)
    ↓
    Same smooth update
```

**Stale Time Tuning:**

```typescript
// ComboBox: Flat list ít thay đổi → Long stale time
useOrganizationsFlat({
  staleTime: 10 * 60 * 1000, // 10 minutes
});

// Tree: Structure có thể thay đổi → Medium stale time
useOrganizationTree({
  staleTime: 5 * 60 * 1000, // 5 minutes
});

// Stats: Global data ít thay đổi → Medium stale time
useOrganizationStats({
  staleTime: 5 * 60 * 1000, // 5 minutes
  refetchOnMount: false, // Không refetch nếu cache còn fresh
});

// Detail: Specific org có thể cập nhật → Short stale time
useOrganizationDetail({
  staleTime: 3 * 60 * 1000, // 3 minutes
});
```
  // ❌ KHÔNG cần:
  // invalidateStats(); // Chỉ đổi tên, không ảnh hưởng count
};

const handleDeleteOrg = async () => {
  await deleteOrganization(id);
  
  // ✅ Must invalidate ALL:
  invalidateAll(); // Org không còn tồn tại → Refetch everything
};  invalidateAll();
    
    // React Query sẽ tự động refetch các hooks đang active:
    // - useOrganizationsFlat() → Refetch flat list
    // - useOrganizationTree() → Refetch tree
    // - useOrganizationDetail() → Refetch detail nếu đang active
  };
};
```

### Case 3: Stale Time & Background Refetch

```typescript
// User mở ComboBox lần 1
t = 0s: Fetch flat list → Cache (fresh)
t = 3min: User mở ComboBox lần 2 → Cache HIT (still fresh)
t = 6min: User mở ComboBox lần 3 → Cache HIT (now stale)
  ↓
  Background refetch starts (không block UI)
  ↓
  UI shows old data instantly
  ↓
  New data arrives → Update UI
  ↓
  Cache refreshed
```

---

## 📊 Performance Comparison

### Before Optimization (Single API, No Cache)

| Action | API | Data Size | Time | Cache |
|--------|-----|-----------|------|-------|
| Mở ComboBox lần 1 | `/organizations/tree` | 2-5 MB | 5-8s | ❌ |
| Mở ComboBox lần 2 | `/organizations/tree` | 2-5 MB | 5-8s | ❌ |
| Vào Org Page | `/organizations/tree` | 2-5 MB | 8-12s | ❌ |
| Vào Org Page lần 2 | `/organizations/tree` | 2-5 MB | 8-12s | ❌ |

**Total:** 20-33s, 8-20 MB transferred

---

### After API Optimization (Dual API, No Cache Yet)

| Action | API | Data Size | Time | Cache |
|--------|-----|-----------|------|-------|
| Mở ComboBox lần 1 | `/organizations/flat` | 100-200 KB | 0.5s | ❌ |
| Mở ComboBox lần 2 | `/organizations/flat` | 100-200 KB | 0.5s | ❌ |
| Vào Org Page | `/organizations/tree?maxDepth=2` | 500 KB - 1 MB | 2-3s | ❌ |
| Vào Org Page lần 2 | `/organizations/tree?maxDepth=2` | 500 KB - 1 MB | 2-3s | ❌ |

**Total:** 5.5-7s, 1.2-2.4 MB transferred

**Improvement:** 70% faster, 80% less data ✅

---

### After Full Implementation (Dual API + React Query Cache)

| Action | API | Data Size | Time | Cache |
|--------|-----|-----------|------|-------|
| Mở ComboBox lần 1 | `/organizations/flat` | 100-200 KB | 0.5s | Store |
| Mở ComboBox lần 2 | - | 0 KB | **0ms** | ✅ HIT |
| Vào Org Page | `/organizations/tree?maxDepth=2` | 500 KB - 1 MB | 2-3s | Store |
| Vào Org Page lần 2 | - | 0 KB | **0ms** | ✅ HIT |

**Total:** 2.5-3.5s (first load), 0ms (subsequent), 600 KB - 1.2 MB transferred

**Improvement:** 90% faster, 90% less data ✅✅

---

## 🎓 Key Learnings

### ✅ Tại Sao Phải Fix API Trước?

1. **Foundation First**
   - API structure là foundation
   - Cache chỉ là enhancement
   - Cache cái gì sai vẫn sai

2. **Prevent Conflicts**
   - Single API → Single cache → Conflict giữa use cases
   - Dual API → Separate caches → No conflict

3. **Right Data for Right Job**
   - ComboBox cần flat list → Không lãng phí bandwidth
   - Tree View cần tree structure → Không cần flatten

4. **Easier to Maintain**
   - Clear separation of concerns
   - Easy to invalidate specific cache
   - Easy to add new use cases

### ✅ Tại Sao React Query Cache Đơn Giản?

1. **Automatic Key Management**
   ```typescript
   // Không cần lo cache keys conflict
   useOrganizationsFlat() // ['organizations', 'flat']
   useOrganizationTree(2) // ['organizations', 'tree', { depth: 2 }]
   ```

2. **Smart Invalidation**
   ```typescript
   // Invalidate tất cả
   invalidateQueries({ queryKey: ['organizations'] });
   
   // Invalidate chỉ flat
   invalidateQueries({ queryKey: ['organizations', 'flat'] });
   ```

3. **Background Refetch**
   - Stale data → Show old + fetch new in background
   - User không thấy loading spinner
   - UX smooth

4. **DevTools**
   - See all cached queries
   - See when they refetch
   - Easy debugging

---

## 🚀 Implementation Checklist

### Week 1: Backend API (Phase 1)

- [ ] **Day 1-2: Flat API**
  - [ ] Create `findAllFlat()` service method
  - [ ] Create `GET /organizations/flat` endpoint
  - [ ] Add search, type, limit params
  - [ ] Test with Postman

- [ ] **Day 3-4: Tree API với Depth**
  - [ ] Implement `findTreeWithDepth()` (từ LOAD_STRATEGY_BY_PAGE.md)
  - [ ] Update `GET /organizations/tree` endpoint
  - [ ] Add maxDepth param
  - [ ] Test with Postman

- [ ] **Day 5: Specific Org API**
  - [ ] Implement `findByTypeCodeWithChildren()`
  - [ ] Create `GET /organizations/by-type-code/:type/:code` endpoint
  - [ ] Test with Postman

### Week 2: Frontend Service (Phase 1)

- [ ] **Day 1: Service Methods**
  - [ ] Add `getOrganizationsFlat()` method
  - [ ] Add `getOrganizationTreeWithDepth()` method
  - [ ] Add `getOrganizationByTypeCode()` method
  - [ ] Update TypeScript types

- [ ] **Day 2-3: Update Components**
  - [ ] Update ComboBox to use `getOrganizationsFlat()`
  - [ ] Update OrganizationsPage to use `getOrganizationTreeWithDepth(2)`
  - [ ] Update DetailPage to use depth-limited API
  - [ ] Update SubDetailPage to use `getOrganizationByTypeCode()`

- [ ] **Day 4-5: Testing**
  - [ ] Test all pages load correctly
  - [ ] Check Network tab for correct APIs
  - [ ] Measure performance improvement
  - [ ] Fix any bugs

### Week 3: React Query Setup (Phase 2)

- [ ] **Day 1: Installation & Setup**
  - [ ] `npm install @tanstack/react-query @tanstack/react-query-devtools`
  - [ ] Setup QueryClient in main.tsx
  - [ ] Add QueryClientProvider
  - [ ] Add ReactQueryDevtools

- [ ] **Day 2-3: Query Hooks**
  - [ ] Create `useOrganizationQueries.ts`
  - [ ] Implement `useOrganizationsFlat()` hook
  - [ ] Implement `useOrganizationTree()` hook
  - [ ] Implement `useOrganizationDetail()` hook
  - [ ] Implement `useInvalidateOrganizations()` hook

- [ ] **Day 4-5: Integration**
  - [ ] Update ComboBox to use `useOrganizationsFlat()`
  - [ ] Update OrganizationsPage to use `useOrganizationTree()`
  - [ ] Update DetailPage to use `useOrganizationDetail()`
  - [ ] Test cache behavior

### Week 4: Cache Invalidation & Polish (Phase 2)

- [ ] **Day 1-2: Invalidation**
  - [ ] Add invalidation after create organization
  - [ ] Add invalidation after update organization
  - [ ] Add invalidation after delete organization
  - [ ] Test refetch behavior

- [ ] **Day 3: Optimistic Updates (Optional)**
  - [ ] Implement optimistic create
  - [ ] Implement optimistic update
  - [ ] Rollback on error

- [ ] **Day 4-5: Testing & Documentation**
  - [ ] Full integration testing
  - [ ] Performance benchmarking
  - [ ] Document cache strategy
  - [ ] Update README

---

## 💡 Best Practices

### 1. Cache Invalidation Strategy

```typescript
// ✅ GOOD: Invalidate chỉ những gì cần
const handleCreateOrg = async () => {
  await createOrganization(data);
  
  // Chỉ invalidate flat list (combobox cần update)
  invalidateFlat();
  
  // Invalidate stats (count thay đổi)
  invalidateStats();
  
  // Tree có thể chờ đến khi user vào page mới refetch
};

// ❌ BAD: Invalidate tất cả mọi lúc
const handleUpdateOrgName = async () => {
  await updateOrganization(id, { name });
  
  // Không cần invalidate tree nếu chỉ đổi tên
  invalidateAll(); // ← Overkill!
};
```

### 2. Stale Time Configuration

```typescript
// ComboBox: Flat list ít thay đổi → Stale time dài
useOrganizationsFlat({
  staleTime: 10 * 60 * 1000, // 10 minutes
});

// Tree View: Structure có thể thay đổi → Stale time ngắn hơn
useOrganizationTree({
  staleTime: 5 * 60 * 1000, // 5 minutes
### 4. Loading States

```typescript
const ComboBox = () => {
  const { data, isLoading, isFetching } = useOrganizationsFlat();
  const { data: stats } = useOrganizationStats();
  
  // isLoading: Lần đầu load (chưa có cache)
  // isFetching: Đang refetch (có cache, update background)
  
  if (isLoading) return <Spinner />; // Block UI
  if (isFetching) return <>{data}<Badge>Updating...</Badge></>; // Show old data
  
  return (
    <div>
      <Combobox options={data} />
      <Stats data={stats} /> {/* Stats always available từ cache */}
    </div>
  );
};
```

### 5. Error Handling với Stats

```typescript
const OrganizationsPage = () => {
  const { 
    data: organizations, 
    isLoading: loadingOrgs,
    error: errorOrgs 
  } = useOrganizationTree(2);
  
  const { 
    data: stats, 
    isLoading: loadingStats,
    error: errorStats 
  } = useOrganizationStats();
  
  // Show partial UI if one fails
  if (errorOrgs && !errorStats) {
    return (
      <div>
        <Header stats={stats} /> {/* Stats OK */}
        <Error>Failed to load organizations</Error>
      </div>
    );
  }
  
  if (errorStats && !errorOrgs) {
    return (
      <div>
        <Header /> {/* No stats, but tree OK */}
        <Tree data={organizations} />
      </div>
    );
  }
  
  if (errorOrgs && errorStats) {
    return <Error>System error</Error>;
  }
  
  return (
    <div>
      <Header stats={stats} />
      <Tree data={organizations} />
    </div>
  );
};
```✅ GOOD: Share stats cache across pages
const OrganizationsPage = () => {
  const { data: stats } = useOrganizationStats();
  return <Header stats={stats} />;
};

const OrganizationsDetailPage = () => {
  const { data: stats } = useOrganizationStats(); // ← Same cache!
  return <Breadcrumb stats={stats} />;
};

// ✅ GOOD: Invalidate stats only when counts change
const handleCreateOrg = async () => {
  await createOrganization(data);
  invalidateStats(); // ← Count increased
};

const handleDeleteOrg = async () => {
  await deleteOrganization(id);
  invalidateStats(); // ← Count decreased
};

// ❌ BAD: Invalidate stats when only updating properties
const handleUpdateOrgName = async () => {
  await updateOrganization(id, { name: newName });
  // KHÔNG cần invalidateStats() vì count không đổi
};
## 🎯 Final Recommendation

### DO THIS (Priority Order):

1. ✅ **Week 1-2: Fix API Structure**
   - Implement flat API for ComboBox
   - Implement depth-limited tree API
   - Update frontend services
   - **Keep stats API as-is** ← Already optimal

2. ✅ **Week 3-4: Add React Query Caching**
   - Setup React Query
   - Create query hooks (flat, tree, detail, **stats**)
   - Implement cache invalidation
   - **Stats cache shared across all pages**

### WHY THIS ORDER?

1. **API First = Foundation**
   - Giải quyết root cause (data không tối ưu)
   - Có thể test improvement ngay lập tức
   - Không phụ thuộc vào cache

2. **Cache Second = Enhancement**
   - Build trên foundation đã tối ưu
   - Maximize cache effectiveness
   - Separate caches cho separate use cases
   - **Stats cache = bonus win (0ms loads)**

3. **Result = Compound Benefits**
   - API optimization: 70% improvement
   - + Caching: thêm 20% improvement
   - **+ Stats caching: instant loads (0ms)**
   - = **90% total improvement**

---

## 📊 Final Performance Summary

### Organizations Data

| Metric | Before | After API | After + Cache | Total Improvement |
|--------|--------|-----------|---------------|-------------------|
| ComboBox | 5-8s | 0.5s | **0ms** | **99%** faster |
| Org Page | 8-12s | 2-3s | **0ms** | **99%** faster |
| Data Transfer | 8-20 MB | 1.2-2.4 MB | 600 KB - 1.2 MB | **90%** less |

### Stats Data

| Metric | Before | After Cache | Improvement |
|--------|--------|-------------|-------------|
| **Every Page Load** | 0.3-0.5s | **0ms** (cached) | **99%** faster |
| **Data Size** | ~5 KB | ~5 KB | Same |
| **API Calls** | Every time | Once per 5 min | **90%** reduction |
| **Shared Cache** | ❌ No | ✅ Yes | All pages benefit |

### Combined Impact

```
User journey example:

1. Mở ComboBox (Create User Modal)
   - Before: 5-8s
   - After: 0.5s (first) / 0ms (cached)
   
2. Vào Organizations Page
   - Before: 8-12s + 0.5s stats = 8.5-12.5s total
   - After: 2-3s + 0ms stats (cached) = 2-3s total
   - Improvement: 75% faster
   
3. Vào Organizations Page again
   - Before: 8-12s + 0.5s stats = 8.5-12.5s
   - After: 0ms + 0ms = 0ms (both cached)
   - Improvement: 100% (instant!)

Total time for 3 actions:
- Before: ~25-30 seconds
- After: 2.5-3.5 seconds (first load) → 0ms (subsequent)
- Improvement: 90% average
```

---

## 🎓 Key Takeaways About Stats

### ✅ Stats Special Characteristics:

1. **Global Data**
   - Stats là tổng hợp toàn hệ thống
   - Không thể "load từng phần" theo page
   - Phải load full stats mọi lúc

2. **Already Optimized**
   - Single COUNT query
   - Không load full org data
   - Fast response (< 0.5s)
   - Only returns numbers (~5 KB)

3. **Perfect for Caching**
   - Data thay đổi ít (chỉ khi create/delete org)
   - Có thể cache 5-10 minutes
   - All pages share same cache
   - Huge cache hit rate

4. **Simple Invalidation**
   - Invalidate khi create org (count++)
   - Invalidate khi delete org (count--)
   - KHÔNG invalidate khi update name/code
   - KHÔNG invalidate khi add/remove members

### ✅ Implementation Strategy:

```typescript
// Backend: Keep as-is ✅
@Get('stats')
async getStats() {
  return this.organizationsService.getStats();
}

// Frontend: Add React Query ✅
export const useOrganizationStats = () => {
  return useQuery({
    queryKey: ['organizations', 'stats'],
    queryFn: () => organizationService.getOrganizationStats(),
    staleTime: 5 * 60 * 1000,
    refetchOnMount: false,
  });
};

// Usage: Same across all pages ✅
const AnyPage = () => {
  const { data: stats } = useOrganizationStats(); // ← Instant from cache
  return <Header stats={stats} />;
};
```

---

**Version:** 1.0  
**Date:** 3/11/2025  
**Status:** 🟢 READY TO IMPLEMENT  
**Priority:** 🔴 CRITICAL  
**Recommendation:** API OPTIMIZATION FIRST, CACHE SECOND, **STATS CACHE = FREE WIN**hed) | **90%** faster |
| Org Page Load | 8-12s | **2-3s** (first) / **0ms** (cached) | **85%** faster |
| Data Transfer | 8-20 MB | **600 KB - 1.2 MB** | **90%** less |
| User Satisfaction | 😢 Slow | 😊 Fast | ⭐⭐⭐⭐⭐ |

### Cost-Benefit

- **Cost:** 2-3 weeks development
- **Benefit:** 
  - 90% faster loading
  - 90% less bandwidth
  - Better UX
  - Scalable architecture
  - Easy to maintain

**ROI:** 🔥 EXCELLENT

---

## 🎯 Final Recommendation

### DO THIS (Priority Order):

1. ✅ **Week 1-2: Fix API Structure**
   - Implement flat API for ComboBox
   - Implement depth-limited tree API
   - Update frontend services

2. ✅ **Week 3-4: Add React Query Caching**
   - Setup React Query
   - Create query hooks
   - Implement cache invalidation

### WHY THIS ORDER?

1. **API First = Foundation**
   - Giải quyết root cause (data không tối ưu)
   - Có thể test improvement ngay lập tức
   - Không phụ thuộc vào cache

2. **Cache Second = Enhancement**
   - Build trên foundation đã tối ưu
   - Maximize cache effectiveness
   - Separate caches cho separate use cases

3. **Result = Compound Benefits**
   - API optimization: 70% improvement
   - + Caching: thêm 20% improvement
   - = 90% total improvement

---

**Version:** 1.0  
**Date:** 3/11/2025  
**Status:** 🟢 READY TO IMPLEMENT  
**Priority:** 🔴 CRITICAL  
**Recommendation:** API OPTIMIZATION FIRST, CACHE SECOND
