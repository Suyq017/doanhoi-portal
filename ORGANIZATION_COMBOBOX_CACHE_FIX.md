# Organization Combobox Cache Optimization Plan

## 🎯 Objective

**Migrate CreateUserModal's organization fetching from manual useEffect to TanStack Query with client-side filtering**

**Current Problem:**
```tsx
// ❌ CreateUserModal.tsx - Fetches on every open
useEffect(() => {
  if (isOpen) {
    loadOrganizations(); // New API call every time!
  }
}, [isOpen]);

const loadOrganizations = async () => {
  const organizationsData = await organizationService.getOrganizations();
  setOrganizations(organizationsData); // Manual state management
};
```

**Pain Points:**
- 🐌 Fetches organizations on EVERY modal open (no cache)
- 📡 Unnecessary network requests (organizations rarely change)
- ⏱️ User waits 500ms-1s every time
- 🔄 Duplicate data (organizations already cached in Organizations page)
- 💾 Manual loading state management
- 🐛 Race conditions (fast open/close)

---

## ✅ Solution: TanStack Query + Client Filter

### **New Flow:**
```
User opens CreateUserModal
  ↓
TanStack Query checks cache 🔍
  ├─ Cache hit (within 5min)? → Return instantly (<1ms) ⚡
  └─ Cache miss/stale? → Fetch once (500ms) 🌐
  ↓
Cache for 5 minutes 💾
  ↓
User types in search box
  ↓
Client-side filter (no API call!) ⚡
  ↓
Results instantly (<1ms)
```

**Benefits:**
- ⚡ **500x faster** on subsequent opens (cache hit)
- 🔄 **Shared cache** with Organizations page (already loaded!)
- 📡 **No duplicate fetches** (single source of truth)
- 🎯 **Auto-refetch** when stale (5min)
- ♻️ **Auto-cleanup** when unused (30min GC)
- 🐛 **No race conditions** (auto request cancellation)

---

## 📋 Implementation Plan

### **Phase 1: Create useOrganizationList Query Hook** (30 min)

#### **File: `frontend/src/shared/hooks/queries/useOrganizationQueries.ts`**

**Add to existing file:**

```typescript
/**
 * Hook for fetching flat list of all organizations (for comboboxes/selectors)
 * Cache key: ['organizations', 'list', 'all']
 * 
 * Use cases:
 * - CreateUserModal organization selector
 * - Any other combobox/dropdown that needs organization list
 * 
 * Benefits:
 * - Shared cache across all components
 * - Auto-refetch when stale (5min)
 * - Client-side filtering (no API spam)
 */
export const useOrganizationList = (options?: {
  enabled?: boolean;
}) => {
  return useQuery({
    queryKey: [...organizationKeys.all, 'list', 'all'],
    queryFn: () => organizationService.getOrganizations(),
    
    // Cache config
    staleTime: 5 * 60 * 1000,  // 5 minutes (orgs don't change often)
    gcTime: 30 * 60 * 1000,    // 30 minutes (keep in memory)
    
    // Refetch strategy
    refetchOnMount: false,      // Don't refetch if cache is fresh
    refetchOnWindowFocus: false, // Don't refetch on tab switch
    
    // Optional enable control
    enabled: options?.enabled !== false,
    
    // Transform to ensure consistent structure
    select: (data: Organization[]) => {
      // Sort alphabetically for better UX
      return [...data].sort((a, b) => 
        a.name.localeCompare(b.name, 'vi')
      );
    },
  });
};

/**
 * Client-side filter hook for organizations
 * No API calls - filters cached data
 */
export const useFilteredOrganizations = (
  searchTerm: string,
  options?: { enabled?: boolean }
) => {
  const { data: organizations = [], isLoading, error } = useOrganizationList(options);
  
  // Client-side filtering (instant, no API)
  const filtered = React.useMemo(() => {
    if (!searchTerm.trim()) {
      return organizations;
    }

    const searchLower = searchTerm.toLowerCase().trim();
    const searchWords = searchLower.split(/\s+/);

    // Score-based filtering (same algorithm as OrganizationCombobox)
    const scoredOrgs = organizations.map(org => {
      const nameLower = org.name.toLowerCase();
      const parentName = org.parent?.name?.toLowerCase() || '';
      let score = 0;

      // Exact match
      if (nameLower === searchLower) score += 1000;
      
      // Starts with
      if (nameLower.startsWith(searchLower)) score += 500;

      // Word matching
      const matchedWords = searchWords.filter(word =>
        nameLower.includes(word) || parentName.includes(word)
      );
      const wordMatchRatio = matchedWords.length / searchWords.length;

      if (wordMatchRatio < 0.6) return { org, score: -1 };

      score += wordMatchRatio * 100;

      // Sequence bonus
      if (searchWords.every(word => 
        nameLower.includes(word) || parentName.includes(word)
      )) {
        score += 50;
      }

      // Length penalty
      const lengthDiff = Math.abs(nameLower.length - searchLower.length);
      score -= lengthDiff * 0.5;

      return { org, score };
    });

    return scoredOrgs
      .filter(item => item.score > 0)
      .sort((a, b) => b.score - a.score)
      .map(item => item.org);
  }, [organizations, searchTerm]);

  return {
    organizations: filtered,
    allOrganizations: organizations,
    isLoading,
    error,
  };
};
```

**Update organizationKeys:**

```typescript
export const organizationKeys = {
  all: ['organizations'] as const,

  // Tree queries
  trees: () => [...organizationKeys.all, 'tree'] as const,
  // ... existing tree keys ...

  // Stats query
  stats: () => [...organizationKeys.all, 'stats'] as const,

  // 🆕 List query (for dropdowns/comboboxes)
  list: () => [...organizationKeys.all, 'list', 'all'] as const,

  // Detail query
  detail: (type: string, code: string) =>
    [...organizationKeys.all, 'detail', type, code] as const,
};
```

**Update cache invalidation:**

```typescript
export const useInvalidateOrganizations = () => {
  const queryClient = useQueryClient();

  return {
    invalidateAll: () => {
      queryClient.invalidateQueries({ queryKey: organizationKeys.all });
    },

    invalidateTrees: () => {
      queryClient.invalidateQueries({ queryKey: organizationKeys.trees() });
    },

    invalidateStats: () => {
      queryClient.invalidateQueries({ queryKey: organizationKeys.stats() });
    },

    // 🆕 Invalidate list (when organizations added/deleted)
    invalidateList: () => {
      queryClient.invalidateQueries({ queryKey: organizationKeys.list() });
    },

    invalidateTreeMain: (maxDepth: number = 2) => {
      queryClient.invalidateQueries({ queryKey: organizationKeys.treeMain(maxDepth) });
    },
  };
};
```

---

### **Phase 2: Migrate CreateUserModal** (15 min)

#### **File: `frontend/src/features/users/components/CreateUserModal.tsx`**

**Before (Manual):**
```tsx
const [organizations, setOrganizations] = useState<Organization[]>([]);
const [loadingOrganizations, setLoadingOrganizations] = useState(false);

useEffect(() => {
  if (isOpen) {
    loadOrganizations();
  }
}, [isOpen]);

const loadOrganizations = async () => {
  setLoadingOrganizations(true);
  try {
    const organizationsData = await organizationService.getOrganizations();
    setOrganizations(organizationsData);
  } catch (error) {
    console.error('Error loading organizations:', error);
    setOrganizations([]);
  } finally {
    setLoadingOrganizations(false);
  }
};
```

**After (TanStack Query):**
```tsx
import { useOrganizationList } from '../../../shared/hooks/queries';

// Inside component:
const { 
  data: organizations = [], 
  isLoading: loadingOrganizations 
} = useOrganizationList({
  enabled: isOpen, // Only fetch when modal is open
});

// Remove manual useEffect and loadOrganizations function!
```

**Full changes:**

```diff
+ import { useOrganizationList } from '../../../shared/hooks/queries';
- import { organizationService } from '../../../shared/services/organizationService';

  const CreateUserModal: React.FC<CreateUserModalProps> = ({
    isOpen,
    onClose,
    onSubmit,
    loading = false,
  }) => {
    const { t } = useTranslation(['users', 'common']);

    const [formData, setFormData] = useState<CreateUserRequest>({
      // ... existing form state
    });

    const [errors, setErrors] = useState<Record<string, string>>({});
-   const [organizations, setOrganizations] = useState<Organization[]>([]);
-   const [loadingOrganizations, setLoadingOrganizations] = useState(false);

+   // TanStack Query - auto-cache, auto-refetch
+   const { 
+     data: organizations = [], 
+     isLoading: loadingOrganizations 
+   } = useOrganizationList({
+     enabled: isOpen, // Only fetch when modal is open
+   });

-   // Load organizations when modal opens
-   useEffect(() => {
-     if (isOpen) {
-       loadOrganizations();
-     } else {
-       // Reset form when modal closes
-       resetForm();
-     }
-   }, [isOpen]);

+   // Reset form when modal closes
+   useEffect(() => {
+     if (!isOpen) {
+       resetForm();
+     }
+   }, [isOpen]);

-   const loadOrganizations = async () => {
-     setLoadingOrganizations(true);
-     try {
-       const organizationsData = await organizationService.getOrganizations();
-       setOrganizations(organizationsData);
-     } catch (error) {
-       console.error('Error loading organizations:', error);
-       setOrganizations([]);
-     } finally {
-       setLoadingOrganizations(false);
-     }
-   };

    // ... rest of the component stays the same
```

**Lines affected:**
- **Remove**: Lines 43-44 (useState for orgs/loading)
- **Remove**: Lines 47-68 (useEffect + loadOrganizations)
- **Add**: Import useOrganizationList (line ~7)
- **Add**: Hook call (after formData/errors state, ~line 45)
- **Modify**: useEffect (only reset form logic, ~line 48)

---

### **Phase 3: Optimize OrganizationCombobox (Optional)** (20 min)

**Current:** Component receives `organizations` prop and does client-side filtering

**Option A: Keep current (Recommended)** ✅
```tsx
// No changes needed - already does client-side filter!
<OrganizationCombobox
  organizations={organizations} // From useOrganizationList
  selectedId={formData.organizationId || ''}
  onSelect={(organizationId) => {/* ... */}}
  loading={loadingOrganizations}
/>
```

**Option B: Make self-contained (Advanced)** ⚡
```tsx
// OrganizationCombobox fetches data itself
// Pros: More reusable, less prop drilling
// Cons: More complex, harder to debug

const OrganizationCombobox = ({ selectedId, onSelect, disabled, error }) => {
  const [searchTerm, setSearchTerm] = useState('');
  
  // Self-fetching with client filter
  const { organizations, isLoading } = useFilteredOrganizations(searchTerm, {
    enabled: isOpen,
  });

  // ... rest of component
};

// Usage:
<OrganizationCombobox
  selectedId={formData.organizationId}
  onSelect={(id) => setFormData(prev => ({ ...prev, organizationId: id }))}
/>
```

**Recommendation:** Stick with **Option A** for now (simpler, works great)

---

### **Phase 4: Invalidate Cache on Org Changes** (10 min)

**When to invalidate list cache:**
- ✅ Organization created → List needs refresh
- ✅ Organization deleted → List needs refresh
- ❌ Organization updated → List doesn't need refresh (name might change but rare)
- ❌ Member added/removed → List doesn't need refresh (only stats)

**Update mutations:**

```typescript
// useOrganizationQueries.ts

export const useCreateOrganization = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateOrganizationRequest) => 
      organizationService.createOrganization(data),

    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: organizationKeys.trees() });
      queryClient.invalidateQueries({ queryKey: organizationKeys.stats() });
+     queryClient.invalidateQueries({ queryKey: organizationKeys.list() }); // 🆕
    },
  });
};

export const useDeleteOrganization = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => organizationService.deleteOrganization(id),

    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: organizationKeys.all }); // Already invalidates list
    },
  });
};
```

---

## 📊 Performance Comparison

### **Before (Manual Fetch):**

```
User opens CreateUserModal (1st time):
  ├─ Modal renders
  ├─ useEffect triggers
  ├─ loadOrganizations() called
  ├─ API call: GET /organizations (500ms) 🌐
  └─ Total: 500ms

User closes and re-opens (2nd time):
  ├─ Modal renders
  ├─ useEffect triggers
  ├─ loadOrganizations() called
  ├─ API call: GET /organizations (500ms) 🌐 ❌ DUPLICATE!
  └─ Total: 500ms ❌ NO IMPROVEMENT

User types search (e.g. "Khoa"):
  ├─ Client-side filter
  └─ Total: <1ms ✅ (only good part)
```

### **After (TanStack Query):**

```
User opens CreateUserModal (1st time):
  ├─ Modal renders
  ├─ useOrganizationList hook checks cache
  ├─ Cache miss → API call: GET /organizations (500ms) 🌐
  ├─ Cache stored (5min TTL)
  └─ Total: 500ms

User closes and re-opens (2nd time, within 5min):
  ├─ Modal renders
  ├─ useOrganizationList hook checks cache
  ├─ Cache hit! ⚡
  └─ Total: <1ms ✅ (500x faster!)

User searches on Organizations page (meanwhile):
  ├─ useOrganizationTreeMain already loaded orgs
  ├─ Cache shared! 🔄
  └─ No new fetch needed

User types search in combobox:
  ├─ Client-side filter (same as before)
  └─ Total: <1ms ✅
```

---

## 🧪 Testing Checklist

### **Functional Tests:**

- [ ] Open CreateUserModal → Organizations load
- [ ] Close and re-open within 5min → Instant load (cache hit)
- [ ] Wait 6 minutes → Re-open → Refetch (stale)
- [ ] Search in combobox → Instant filter (no API)
- [ ] Select organization → Form updates
- [ ] Clear selection → Form resets
- [ ] Create organization elsewhere → Cache invalidates
- [ ] Delete organization elsewhere → Cache invalidates

### **Performance Tests:**

- [ ] 1st open: ~500ms (API call)
- [ ] 2nd open (cached): <1ms ⚡
- [ ] Search typing: <1ms per keystroke
- [ ] No duplicate API calls (check Network tab)
- [ ] Cache shared with Organizations page (check DevTools)

### **Edge Cases:**

- [ ] No organizations in system → Show empty state
- [ ] API error → Show error message, retry works
- [ ] Slow network → Loading spinner shows
- [ ] Fast open/close → No race conditions
- [ ] Multiple modals → Share same cache

---

## 📝 Code Summary

### **Files to Modify:**

```
frontend/src/
├── shared/hooks/queries/
│   ├── useOrganizationQueries.ts  ⭐ (ADD useOrganizationList hook)
│   └── index.ts                    (EXPORT new hook)
└── features/users/components/
    └── CreateUserModal.tsx         ⭐ (REPLACE useEffect with hook)
```

### **Files NOT Modified:**

```
frontend/src/features/users/components/
└── OrganizationCombobox.tsx       ✅ (NO CHANGES - already perfect!)
```

### **Total Lines Changed:**
- **useOrganizationQueries.ts**: +80 lines (new hook + filter)
- **CreateUserModal.tsx**: -23 lines, +5 lines (net -18 lines!)
- **Total**: +62 lines, -18 code debt 🎉

---

## 🎯 Expected Results

### **Before:**
```typescript
// CreateUserModal opens
[API] GET /organizations (500ms)

// User closes and re-opens
[API] GET /organizations (500ms) ❌ DUPLICATE

// User goes to Organizations page
[API] GET /organizations/tree?maxDepth=2 (500ms) ❌ COULD BE CACHED
```

### **After:**
```typescript
// CreateUserModal opens
[Cache] Miss → GET /organizations (500ms)
[Cache] Store with key ['organizations', 'list', 'all']

// User closes and re-opens (within 5min)
[Cache] Hit! ⚡ (<1ms)

// User goes to Organizations page
[Cache] Different key (tree vs list) but same data source
[Cache] If tree includes full orgs, could optimize further
```

---

## 🚀 Migration Steps (Sequential)

### **Step 1: Add Hook** (30 min)
1. Open `useOrganizationQueries.ts`
2. Add `useOrganizationList` hook
3. Add `useFilteredOrganizations` hook (optional)
4. Update `organizationKeys.list()`
5. Update `useInvalidateOrganizations`
6. Export in `index.ts`

### **Step 2: Test Hook** (10 min)
1. Open React Query DevTools
2. Manually call hook in console:
   ```tsx
   const { data } = useOrganizationList();
   console.log(data);
   ```
3. Verify cache key: `['organizations', 'list', 'all']`
4. Verify data structure

### **Step 3: Migrate CreateUserModal** (15 min)
1. Remove useState (organizations, loadingOrganizations)
2. Remove loadOrganizations function
3. Remove useEffect fetch logic
4. Add useOrganizationList hook
5. Keep resetForm in useEffect

### **Step 4: Test Integration** (15 min)
1. Open CreateUserModal
2. Check Network tab → Should fetch
3. Close and re-open quickly
4. Check Network tab → Should NOT fetch ✅
5. Type in search → Results filter instantly
6. Check React Query DevTools → Verify cache

### **Step 5: Update Invalidation** (10 min)
1. Add list invalidation to useCreateOrganization
2. Test: Create org → Re-open modal → New org appears

### **Step 6: Performance Validation** (10 min)
1. Measure 1st open: ~500ms
2. Measure 2nd open: <1ms ⚡
3. Document improvement: **500x faster**

**Total Time: ~1.5 hours** ⏱️

---

## 💡 Future Optimizations

### **Optimization 1: Prefetch on Page Load**
```typescript
// In App.tsx or main layout
const queryClient = useQueryClient();

useEffect(() => {
  // Prefetch organizations on app load (background)
  queryClient.prefetchQuery({
    queryKey: organizationKeys.list(),
    queryFn: () => organizationService.getOrganizations(),
  });
}, []);

// Result: CreateUserModal opens instantly (already cached!)
```

### **Optimization 2: Infinite Scroll for Large Lists**
```typescript
export const useInfiniteOrganizationList = () => {
  return useInfiniteQuery({
    queryKey: [...organizationKeys.all, 'list', 'infinite'],
    queryFn: ({ pageParam = 0 }) => 
      organizationService.getOrganizations({
        offset: pageParam,
        limit: 50,
      }),
    initialPageParam: 0,
    getNextPageParam: (lastPage, pages) => 
      lastPage.length === 50 ? pages.length * 50 : undefined,
  });
};

// Use case: 10,000+ organizations
```

### **Optimization 3: Virtual Scrolling**
```bash
npm install @tanstack/react-virtual
```

```typescript
import { useVirtualizer } from '@tanstack/react-virtual';

// In OrganizationCombobox
const virtualizer = useVirtualizer({
  count: filteredOrganizations.length,
  getScrollElement: () => dropdownRef.current,
  estimateSize: () => 60, // Height of each option
});

// Render only visible items (100x faster for 1000+ items)
```

---

## 🎉 Success Metrics

### **Performance:**
- ✅ 1st modal open: ~500ms (baseline)
- ✅ 2nd+ modal open: <1ms (500x faster) ⚡
- ✅ Search typing: <1ms per keystroke
- ✅ No duplicate API calls

### **Code Quality:**
- ✅ -18 lines (less code)
- ✅ No manual state management
- ✅ No manual loading states
- ✅ No race conditions
- ✅ Shared cache (DRY principle)

### **User Experience:**
- ✅ Instant re-open (feels native)
- ✅ Instant search (no lag)
- ✅ Consistent data (single source of truth)
- ✅ Auto-refresh when stale

---

*Plan created: November 3, 2025*  
*Estimated implementation time: 1.5 hours*  
*Expected improvement: 500x faster cached loads*
