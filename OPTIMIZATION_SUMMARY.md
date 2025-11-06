# 🚀 Tóm Tắt Tối Ưu Trang Organizations

## 📊 Vấn Đề Hiện Tại

### Main Page `/organizations`
- ❌ **Duplicate fetch**: `fetchOrganizationTree()` + `fetchAllLevel1Children()`
- ❌ **Load toàn bộ tree**: Level 1, 2, 3+ (2-5 MB)
- ❌ **5-10 API calls**: 1 tree + 1 per level 1 org
- ⏱️ **Load time**: 8-12 giây

### Detail Page `/organizations/dai-hoc/dhbk`
- ❌ **Load full subtree**: All descendants (1-2 MB)
- ❌ **No depth limit**: Level 2, 3, 4, 5+
- ⏱️ **Load time**: 5-8 giây

### Sub-Detail Page `/organizations/dai-hoc/dhbk/khoa/ktmt`
- ❌ **Load parent tree**: Load Đại học Bách Khoa + ALL Khoa
- ❌ **Frontend filter**: `organizations[0]?.children?.filter(...)`
- ❌ **Waste bandwidth**: Load siblings không cần thiết (1-2 MB)
- ⏱️ **Load time**: 5-8 giây

---

## ✅ Giải Pháp

### 1. Main Page - Loại Bỏ Duplicate Fetch
```typescript
// ❌ BEFORE (2+ API calls)
const orgs = await fetchOrganizationTree();      // Load all levels
await fetchAllLevel1Children(orgs);               // Load again!

// ✅ AFTER (1 API call)
await fetchOrganizationTreeMainPage();            // maxDepth: 2
```

**Kết quả:**
- ✅ 1 API call (giảm 80-90%)
- ✅ 500 KB - 1 MB (giảm 75%)
- ✅ 2-3 giây (giảm 70%)

### 2. Detail Page - Depth Limit
```typescript
// ❌ BEFORE
await fetchOrganizationDetail(type, code);        // Full subtree

// ✅ AFTER
await fetchOrganizationDetailPage(type, code);    // maxDepth: 2
```

**Kết quả:**
- ✅ 300-500 KB (giảm 75%)
- ✅ 1-2 giây (giảm 75%)

### 3. Sub-Detail Page - Direct Load
```typescript
// ❌ BEFORE
await fetchOrganizationSubDetail(parentType, parentCode);
const filtered = organizations[0]?.children?.filter(...);

// ✅ AFTER
await fetchOrganizationSubDetailPage(type, code); // Direct!
const org = organizations[0];                     // No filter!
```

**Kết quả:**
- ✅ 100-200 KB (giảm 90%)
- ✅ 0.5-1 giây (giảm 85%)
- ✅ Không frontend filter

---

## 🔧 Implementation Steps

### Phase 1: Backend (2-3 ngày) ⚠️ CRITICAL

#### Day 1-2: Service Methods
```typescript
// organizations.service.ts

// NEW: Load tree với depth limit
async findTreeWithDepth(maxDepth: number = 2) {
  const roots = await this.organizationsRepository.find({
    where: { parent: IsNull() }
  });
  
  return Promise.all(
    roots.map(root => this.buildTreeWithDepth(root, maxDepth, 1))
  );
}

// NEW: Recursive build với depth limit
private async buildTreeWithDepth(
  org: Organization,
  maxDepth: number,
  currentDepth: number
) {
  if (currentDepth >= maxDepth) {
    const childrenCount = await this.organizationsRepository.count({
      where: { parent: { id: org.id } }
    });
    
    return {
      ...org,
      children: [],
      hasChildren: childrenCount > 0  // ← Important!
    };
  }
  
  const children = await this.organizationsRepository.find({
    where: { parent: { id: org.id } }
  });
  
  return {
    ...org,
    children: await Promise.all(
      children.map(child => 
        this.buildTreeWithDepth(child, maxDepth, currentDepth + 1)
      )
    )
  };
}

// NEW: Load specific org với depth
async findTreeByTypeCode(type: string, code: string, maxDepth: number = 2) {
  const org = await this.organizationsRepository.findOne({
    where: { type, code }
  });
  
  if (!org) throw new NotFoundException();
  
  return this.buildTreeWithDepth(org, maxDepth, 1);
}

// NEW: Direct load by type/code
async findByTypeCodeWithChildren(
  type: string,
  code: string,
  includeChildren: boolean = true,
  maxDepth: number = 1
) {
  const org = await this.organizationsRepository.findOne({
    where: { type, code }
  });
  
  if (!org) throw new NotFoundException();
  
  if (!includeChildren) {
    return { ...org, children: [], hasChildren: false };
  }
  
  return this.buildTreeWithDepth(org, maxDepth, 1);
}
```

#### Day 2-3: Controller
```typescript
// organizations.controller.ts

@Get('tree')
async getOrganizationTree(
  @Query('maxDepth') maxDepth?: number,
  @Query('type') type?: string,
  @Query('code') code?: string,
) {
  if (type && code) {
    return this.organizationsService.findTreeByTypeCode(
      type, 
      code, 
      maxDepth || 2
    );
  }
  return this.organizationsService.findTreeWithDepth(maxDepth || 2);
}

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
```

### Phase 2: Frontend Service (1 ngày)

```typescript
// organizationService.ts

export const organizationService = {
  // NEW: Get tree với depth
  async getOrganizationTreeWithDepth(maxDepth: number = 2) {
    const response = await api.get<Organization[]>('/organizations/tree', {
      params: { maxDepth }
    });
    return response.data;
  },
  
  // NEW: Get specific org tree
  async getOrganizationTreeByTypeCode(
    type: string,
    code: string,
    maxDepth: number = 2
  ) {
    const response = await api.get<Organization>('/organizations/tree', {
      params: { type, code, maxDepth }
    });
    return response.data;
  },
  
  // NEW: Direct load by type/code
  async getOrganizationByTypeCode(
    type: string,
    code: string,
    options: { includeChildren?: boolean; maxDepth?: number } = {}
  ) {
    const response = await api.get<Organization>(
      `/organizations/by-type-code/${type}/${code}`,
      { params: options }
    );
    return response.data;
  },
};
```

### Phase 3: Frontend Hooks (2 ngày) ⚠️ CRITICAL

#### useOrganizationTree.ts
```typescript
export const useOrganizationTree = () => {
  // ✅ NEW: Main page
  const fetchOrganizationTreeMainPage = useCallback(async () => {
    const treeData = await organizationService.getOrganizationTreeWithDepth(2);
    
    const orgsWithExpanded = treeData.map(org => ({
      ...org,
      isExpanded: true,
      children: org.children?.map(child => ({
        ...child,
        isExpanded: false
      }))
    }));
    
    setOrganizations(orgsWithExpanded);
  }, []);
  
  // ✅ NEW: Detail page
  const fetchOrganizationDetailPage = useCallback(async (
    type: string,
    code: string
  ) => {
    const orgTree = await organizationService.getOrganizationTreeByTypeCode(
      type,
      code,
      2
    );
    setOrganizations([{ ...orgTree, isExpanded: true }]);
  }, []);
  
  // ✅ NEW: Sub-detail page
  const fetchOrganizationSubDetailPage = useCallback(async (
    type: string,
    code: string
  ) => {
    const org = await organizationService.getOrganizationByTypeCode(
      type,
      code,
      { includeChildren: true, maxDepth: 1 }
    );
    setOrganizations([{ ...org, isExpanded: true }]);
  }, []);
  
  // ❌ REMOVE: fetchOrganizationTree()
  // ❌ REMOVE: fetchAllLevel1Children()
  // ❌ REMOVE: fetchOrganizationDetail()
  // ❌ REMOVE: fetchOrganizationSubDetail()
  
  return {
    organizations,
    loading,
    error,
    fetchOrganizationTreeMainPage,
    fetchOrganizationDetailPage,
    fetchOrganizationSubDetailPage,
    toggleOrgExpanded,
  };
};
```

#### useOrganizationPage.ts
```typescript
const fetchData = useCallback(async () => {
  setLoading(true);
  try {
    if (isSubDetailPage && type && code) {
      // ✅ Direct load
      await fetchOrganizationSubDetailPage(type, code);
      
    } else if (isDetailPage && type && code) {
      // ✅ Depth-limited
      await fetchOrganizationDetailPage(type, code);
      
    } else {
      // ✅ No duplicate fetch!
      await fetchOrganizationTreeMainPage();
      // ❌ REMOVED: await fetchAllLevel1Children(orgs);
    }
    
    await fetchStats();
  } finally {
    setLoading(false);
  }
}, [isDetailPage, isSubDetailPage, type, code]);
```

### Phase 4: Components (1 ngày)

#### OrganizationsSubDetailPage.tsx
```typescript
// ❌ BEFORE
const { parentType, parentCode, type, code } = useParams();

const { organizations } = useOrganizationPage({
  type: parentType,
  code: parentCode,
  isSubDetailPage: true
});

const filteredOrg = useMemo(() => {
  return organizations[0]?.children?.filter(child => {
    return child.type === type && child.code === code;
  }) || [];
}, [organizations, type, code]);

// ✅ AFTER
const { type, code } = useParams();

const { organizations } = useOrganizationPage({
  type,      // ← Direct!
  code,      // ← No parent!
  isSubDetailPage: true
});

const displayOrganization = organizations[0]; // ← No filter!
```

---

## 📈 Expected Results

| Page | Before | After | Improvement |
|------|--------|-------|-------------|
| **Main** | 8-12s, 2-5 MB | 2-3s, 0.5-1 MB | **-70% time, -75% data** |
| **Detail** | 5-8s, 1-2 MB | 1-2s, 0.3-0.5 MB | **-75% time, -75% data** |
| **Sub-Detail** | 5-8s, 1-2 MB | 0.5-1s, 0.1-0.2 MB | **-85% time, -90% data** |

### API Calls
- **Main Page**: 5-10 calls → **1 call** (-80% to -90%)
- **Detail Page**: 1 call → 1 call (same, but smaller)
- **Sub-Detail Page**: 1 call → 1 call (same, but smaller)

---

## ⚠️ Critical Points

### 1. Backend MUST come first
- Frontend optimization won't work without backend depth limit
- Deploy backend → Test → Deploy frontend

### 2. Test with real data
- Dev data might be too small
- Production could have 100+ orgs per level

### 3. Remove duplicate fetch
- Main page: Single biggest win (80% API call reduction)
- Check Network tab carefully

### 4. Update TypeScript types
```typescript
export interface Organization {
  id: string;
  name: string;
  type: string;
  code: string;
  children?: Organization[];
  hasChildren?: boolean;  // ← Add this!
  // ... other fields
}
```

### 5. Database indexes
```sql
CREATE INDEX idx_organizations_parent_id ON organizations(parent_id);
CREATE INDEX idx_organizations_type_code ON organizations(type, code);
```

---

## 🧪 Testing Checklist

### Backend Testing
- [ ] `GET /organizations/tree?maxDepth=2` returns level 1+2 only
- [ ] `hasChildren` flag is accurate
- [ ] `GET /organizations/tree?type=X&code=Y&maxDepth=2` works
- [ ] `GET /organizations/by-type-code/khoa/ktmt?includeChildren=true` works
- [ ] Query performance < 1s with 1000+ orgs

### Frontend Testing
- [ ] Main page loads in 2-3s
- [ ] Only 1 API call on main page (Network tab)
- [ ] Detail page loads in 1-2s
- [ ] Sub-detail page loads in 0.5-1s
- [ ] No frontend filter logic in sub-detail page
- [ ] Navigation between pages works
- [ ] Stats still load correctly
- [ ] Error handling works

### Performance Testing
```typescript
// Add to console
console.time('Load Organizations');
await fetchData();
console.timeEnd('Load Organizations');

const dataSize = JSON.stringify(organizations).length;
console.log(`Data size: ${(dataSize / 1024).toFixed(2)} KB`);
```

---

## 🚀 Quick Start

### 1. Backend (Week 1)
```bash
# 1. Implement service methods
# 2. Update controller
# 3. Test with Postman

curl "http://localhost:3000/organizations/tree?maxDepth=2"
curl "http://localhost:3000/organizations/by-type-code/khoa/ktmt?includeChildren=true"
```

### 2. Frontend (Week 2)
```bash
# 1. Update service
# 2. Update hooks
# 3. Update components
# 4. Test in browser

# Check Network tab: Should see only 1 API call
```

### 3. Deploy (Week 3)
```bash
# 1. Deploy backend first
# 2. Test backend endpoints
# 3. Deploy frontend
# 4. Monitor performance
```

---

## 📚 Related Documents

- **LOAD_STRATEGY_BY_PAGE.md** - Chi tiết implementation
- **CACHE_IMPLEMENTATION_STRATEGY.md** - React Query caching (Phase 2)
- **ORGANIZATION_PERFORMANCE_ANALYSIS.md** - Performance analysis

---

**Version:** 1.0  
**Date:** 2025-11-03  
**Status:** 🟢 READY TO IMPLEMENT  
**Priority:** 🔴 HIGH  
**Estimated Time:** 7-10 days  
**Expected Improvement:** 70-85% faster, 75-90% less data
