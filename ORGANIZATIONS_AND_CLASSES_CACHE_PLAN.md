# 📋 Kế Hoạch Áp Dụng TanStack Query Cache - Organizations & Classes Pages

## 🎯 Tổng Quan

### Mục Tiêu
Áp dụng TanStack Query cache cho **2 trang**:
1. **Organizations Page** (Đơn vị) - Tree structure với nested children
2. **Classes Page** (Quản lý Lớp học) - Paginated list với filters

### Đặc Điểm Riêng

#### Organizations Page
- ✅ **ĐÃ CÓ CACHE** - Đã sử dụng React Query hooks
- 🎯 Cần tối ưu: Organization tree loading strategy
- 📊 Tree structure với expand/collapse
- 🔄 Real-time stats updates
- 👥 Member management per organization

#### Classes Page  
- ❌ **CHƯA CÓ CACHE** - Đang dùng manual state management
- 🎯 Tương tự Users Page: Pagination + Filters + CRUD
- 📄 Paginated list (10 items/page)
- 🔍 Multiple filters (search, year, department, status)
- 🗑️ Bulk delete support
- 📤 Import from Excel

---

## 📊 Phân Tích Chi Tiết

### 1️⃣ Organizations Page - CURRENT STATE (ĐÃ CÓ CACHE)

#### ✅ Đã Sử Dụng React Query

**File:** `useOrganizationPage.ts`
```typescript
// Already using React Query hooks:
const { organizations, loading, error, refetch } = useOrganizationTree({
  type: treeType,
  maxDepth: isSubDetailPage ? 1 : 2,
});

const { data: stats, refetch: refetchStats } = useOrganizationStats();
const updateOrgMutation = useUpdateOrganization();
const { invalidateStats, invalidateTrees } = useInvalidateOrganizations();
```

**Đã implement:**
- ✅ `useOrganizationTree` - Load tree structure với cache
- ✅ `useOrganizationStats` - Stats cache
- ✅ `useUpdateOrganization` - Mutation với optimistic updates
- ✅ `invalidateOrganizations` - Smart invalidation

#### 🎯 Cần Tối Ưu

1. **Tree Loading Strategy**
   - Hiện tại: Load tree với `maxDepth` cố định
   - Vấn đề: Load too much nếu user chỉ xem 1-2 levels
   - Giải pháp: Load on-demand khi expand

2. **Member Stats Cache**
   - Hiện tại: Invalidate toàn bộ stats sau member add/remove
   - Vấn đề: Unnecessary refetch
   - Giải pháp: Optimistic update cho stats

3. **Expand/Collapse State**
   - Hiện tại: Stored locally, lost on navigation
   - Giải pháp: Persist trong URL hoặc cache

**Status:** ✅ Đã có cache cơ bản, cần optimize advanced features

---

### 2️⃣ Classes Page - CURRENT STATE (CHƯA CÓ CACHE)

#### ❌ Đang Dùng Manual State Management

**File:** `ClassesPage.tsx`
```typescript
// Manual state management:
const [classes, setClasses] = useState<Class[]>([]);
const [total, setTotal] = useState(0);
const [loading, setLoading] = useState(true);
const [error, setError] = useState<string | null>(null);

// Manual fetch with useEffect:
useEffect(() => {
  loadClasses();
}, [currentPage, yearFilter, departmentFilter, statusFilter]);

const loadClasses = async () => {
  setLoading(true);
  const response = await classService.getClasses(params);
  setClasses(response.classes);
  setTotal(response.total);
  setLoading(false);
};

// Manual CRUD:
const handleCreateSuccess = async () => {
  await loadClasses(); // Refetch toàn bộ
  showSuccess('Created!');
};
```

#### ❌ Các Vấn Đề (Giống Users Page)

1. **Không cache data theo page/filter**
   - Page 1 → 2 → 1: Fetch lại page 1
   - Apply filter → Clear → Re-apply: Fetch lại

2. **Không có smooth pagination**
   - Loading spinner mỗi lần chuyển page
   - Jarring UX

3. **Không optimistic updates**
   - Delete class → Wait API → Then UI updates
   - Slow, không smooth

4. **Refetch toàn bộ sau CRUD**
   - Create → Refetch all pages
   - Update → Refetch all pages
   - Delete → Refetch all pages

5. **Lost state on navigation**
   - Navigate away → Come back: Reset về page 1

**Status:** ❌ Cần migrate hoàn toàn sang React Query (giống Users Page)

---

## 🏗️ Implementation Plan

### PHASE A: Organizations Page Optimization (2-3 hours)

**Mục tiêu:** Optimize existing React Query implementation

#### A1: Lazy Load Children (1 hour)

**Problem:** Load quá nhiều levels cùng lúc

**Solution:** Load children on-demand khi user expands

```typescript
// File: useOrganizationQueries.ts

/**
 * Hook to fetch organization children on-demand
 */
export const useOrganizationChildren = (
  organizationId: string,
  options?: { enabled?: boolean }
) => {
  return useQuery({
    queryKey: organizationKeys.children(organizationId),
    queryFn: async () => {
      const children = await organizationService.getOrganizationChildren(organizationId);
      return children;
    },
    staleTime: 5 * 60 * 1000,      // 5 minutes
    gcTime: 10 * 60 * 1000,         // 10 minutes
    enabled: options?.enabled ?? true,
  });
};
```

**Usage in OrganizationTreeItem:**
```typescript
// Only fetch children when expanded
const { data: children, isLoading } = useOrganizationChildren(org.id, {
  enabled: isExpanded,
});
```

**Benefits:**
- ✅ Faster initial load (only load root level)
- ✅ Cache children separately (don't refetch if already loaded)
- ✅ Better performance for large trees

---

#### A2: Optimistic Stats Update (1 hour)

**Problem:** Invalidate toàn bộ stats mỗi khi add/remove member

**Solution:** Update stats cache directly

```typescript
// In useOrganizationQueries.ts

export const useAddMemberMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ orgId, userId }: { orgId: string; userId: string }) => 
      organizationService.addUserToOrganization(orgId, userId),
    
    // Optimistic update
    onMutate: async ({ orgId }) => {
      await queryClient.cancelQueries({ queryKey: organizationKeys.stats() });

      const previousStats = queryClient.getQueryData(organizationKeys.stats());

      // Optimistically update stats
      queryClient.setQueryData(
        organizationKeys.stats(),
        (old: OrganizationStats | undefined) => {
          if (!old) return old;
          return {
            ...old,
            totalMembers: old.totalMembers + 1,
            organizationStats: old.organizationStats.map(stat => 
              stat.organizationId === orgId
                ? { ...stat, memberCount: stat.memberCount + 1 }
                : stat
            ),
          };
        }
      );

      return { previousStats };
    },

    onError: (_err, _vars, context) => {
      // Rollback on error
      if (context?.previousStats) {
        queryClient.setQueryData(
          organizationKeys.stats(),
          context.previousStats
        );
      }
    },

    onSettled: () => {
      // Background refetch to sync
      queryClient.invalidateQueries({ queryKey: organizationKeys.stats() });
    },
  });
};
```

**Benefits:**
- ✅ Instant stats update (no loading)
- ✅ Rollback on error
- ✅ Background sync with server

---

#### A3: Prefetch Siblings (30 minutes)

**Problem:** User expands org → Wait for children to load

**Solution:** Prefetch likely children

```typescript
export const usePrefetchOrganizationChildren = () => {
  const queryClient = useQueryClient();

  return {
    prefetchChildren: (organizationId: string) => {
      queryClient.prefetchQuery({
        queryKey: organizationKeys.children(organizationId),
        queryFn: () => organizationService.getOrganizationChildren(organizationId),
        staleTime: 5 * 60 * 1000,
      });
    },
  };
};

// Usage: Prefetch on hover
<OrganizationTreeItem
  onMouseEnter={() => {
    if (!isExpanded) {
      prefetchChildren(org.id);
    }
  }}
/>
```

**Benefits:**
- ✅ Children loaded before user clicks expand
- ✅ Instant expand (data already in cache)

---

### PHASE B: Classes Page Migration (4-5 hours)

**Mục tiêu:** Migrate từ manual state sang React Query (giống Users Page)

#### B1: Create Query Hooks (1.5 hours)

**File:** `frontend/src/shared/hooks/queries/useClassQueries.ts`

```typescript
import { useQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query';
import { classService } from '../../services/classService';
import { Class, ClassQueryParams, CreateClassRequest, UpdateClassRequest, ClassesResponse } from '../../types/class';

/**
 * ========================
 * CACHE KEYS
 * ========================
 */
export const classKeys = {
  all: ['classes'] as const,
  lists: () => [...classKeys.all, 'list'] as const,
  list: (filters: ClassQueryParams) => [...classKeys.lists(), filters] as const,
  details: () => [...classKeys.all, 'detail'] as const,
  detail: (classId: string) => [...classKeys.details(), classId] as const,
};

/**
 * ========================
 * CACHE CONFIGURATION
 * ========================
 */
const CLASS_CACHE_CONFIG = {
  list: {
    staleTime: 2 * 60 * 1000,      // 2 minutes
    gcTime: 10 * 60 * 1000,         // 10 minutes
    refetchOnWindowFocus: true,
    refetchOnMount: false,
  },
  detail: {
    staleTime: 5 * 60 * 1000,      // 5 minutes
    gcTime: 10 * 60 * 1000,         // 10 minutes
    refetchOnWindowFocus: true,
    refetchOnMount: false,
  },
};

/**
 * ========================
 * QUERY HOOKS
 * ========================
 */

/**
 * Hook to fetch paginated class list with filters
 * 
 * Features:
 * - Automatic caching per page + filter combination
 * - keepPreviousData for smooth pagination
 * - Background refetch when data becomes stale
 */
export const useClassListQuery = (params: ClassQueryParams = {}) => {
  return useQuery({
    queryKey: classKeys.list(params),
    queryFn: async () => {
      const response = await classService.getClasses(params);
      return response;
    },
    ...CLASS_CACHE_CONFIG.list,
    placeholderData: keepPreviousData, // CRITICAL: Smooth pagination
  });
};

/**
 * Hook to fetch single class detail
 */
export const useClassDetailQuery = (classId: string, options?: { enabled?: boolean }) => {
  return useQuery({
    queryKey: classKeys.detail(classId),
    queryFn: async () => {
      const classData = await classService.getClass(classId);
      return classData;
    },
    ...CLASS_CACHE_CONFIG.detail,
    enabled: options?.enabled ?? !!classId,
  });
};

/**
 * ========================
 * MUTATION HOOKS
 * ========================
 */

/**
 * Hook to create new class
 */
export const useCreateClassMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (classData: CreateClassRequest) => 
      classService.createClass(classData),
    
    onSuccess: () => {
      // Invalidate all list queries
      queryClient.invalidateQueries({ 
        queryKey: classKeys.lists() 
      });
    },
    
    onError: (error) => {
      console.error('Failed to create class:', error);
    },
  });
};

/**
 * Hook to update class
 * 
 * Features:
 * - Optimistic update: Update cache immediately
 * - Rollback if API fails
 */
export const useUpdateClassMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateClassRequest }) => 
      classService.updateClass(id, data),
    
    // Optimistic update
    onMutate: async ({ id, data }) => {
      await queryClient.cancelQueries({ 
        queryKey: classKeys.detail(id) 
      });

      const previousClass = queryClient.getQueryData(classKeys.detail(id));

      // Optimistically update detail cache
      queryClient.setQueryData(
        classKeys.detail(id),
        (old: Class | undefined) => {
          if (!old) return old;
          return { ...old, ...data };
        }
      );

      // Optimistically update in list caches
      queryClient.setQueriesData(
        { queryKey: classKeys.lists() },
        (old: ClassesResponse | undefined) => {
          if (!old) return old;
          return {
            ...old,
            classes: old.classes.map(cls => 
              cls.id === id ? { ...cls, ...data } : cls
            )
          };
        }
      );

      return { previousClass };
    },

    onError: (_err, { id }, context) => {
      if (context?.previousClass) {
        queryClient.setQueryData(
          classKeys.detail(id),
          context.previousClass
        );
      }
      console.error('Failed to update class:', _err);
    },

    onSettled: (_data, _error, { id }) => {
      queryClient.invalidateQueries({ 
        queryKey: classKeys.detail(id) 
      });
      queryClient.invalidateQueries({ 
        queryKey: classKeys.lists() 
      });
    },
  });
};

/**
 * Hook to delete class
 * 
 * Features:
 * - Optimistic update: Remove from cache immediately
 * - Rollback if API fails
 */
export const useDeleteClassMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (classId: string) => classService.deleteClass(classId),
    
    onMutate: async (classId) => {
      await queryClient.cancelQueries({ 
        queryKey: classKeys.lists() 
      });

      const previousLists = queryClient.getQueriesData({ 
        queryKey: classKeys.lists() 
      });

      // Optimistically remove from all list caches
      queryClient.setQueriesData(
        { queryKey: classKeys.lists() },
        (old: ClassesResponse | undefined) => {
          if (!old) return old;
          return {
            ...old,
            classes: old.classes.filter(cls => cls.id !== classId),
            total: old.total - 1,
          };
        }
      );

      return { previousLists };
    },

    onError: (_err, _classId, context) => {
      if (context?.previousLists) {
        context.previousLists.forEach(([queryKey, data]) => {
          queryClient.setQueryData(queryKey, data);
        });
      }
      console.error('Failed to delete class:', _err);
    },

    onSettled: () => {
      queryClient.invalidateQueries({ 
        queryKey: classKeys.lists() 
      });
    },
  });
};

/**
 * Hook to bulk delete classes
 */
export const useBulkDeleteClassesMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (classIds: string[]) => classService.bulkDeleteClasses(classIds),
    
    onMutate: async (classIds) => {
      await queryClient.cancelQueries({ 
        queryKey: classKeys.lists() 
      });

      const previousLists = queryClient.getQueriesData({ 
        queryKey: classKeys.lists() 
      });

      // Remove all selected classes from caches
      queryClient.setQueriesData(
        { queryKey: classKeys.lists() },
        (old: ClassesResponse | undefined) => {
          if (!old) return old;
          return {
            ...old,
            classes: old.classes.filter(cls => !classIds.includes(cls.id)),
            total: old.total - classIds.length,
          };
        }
      );

      return { previousLists };
    },

    onError: (_err, _classIds, context) => {
      if (context?.previousLists) {
        context.previousLists.forEach(([queryKey, data]) => {
          queryClient.setQueryData(queryKey, data);
        });
      }
      console.error('Failed to bulk delete classes:', _err);
    },

    onSettled: () => {
      queryClient.invalidateQueries({ 
        queryKey: classKeys.lists() 
      });
    },
  });
};

/**
 * ========================
 * UTILITY HOOKS
 * ========================
 */

/**
 * Hook to manually invalidate class caches
 */
export const useInvalidateClasses = () => {
  const queryClient = useQueryClient();

  return {
    invalidateAll: () => {
      queryClient.invalidateQueries({ 
        queryKey: classKeys.all 
      });
    },

    invalidateLists: () => {
      queryClient.invalidateQueries({ 
        queryKey: classKeys.lists() 
      });
    },

    invalidateDetail: (classId: string) => {
      queryClient.invalidateQueries({ 
        queryKey: classKeys.detail(classId) 
      });
    },

    refetchLists: () => {
      queryClient.refetchQueries({ 
        queryKey: classKeys.lists() 
      });
    },
  };
};

/**
 * Hook to prefetch next page
 */
export const usePrefetchClasses = () => {
  const queryClient = useQueryClient();

  return {
    prefetchNextPage: (params: ClassQueryParams) => {
      queryClient.prefetchQuery({
        queryKey: classKeys.list(params),
        queryFn: () => classService.getClasses(params),
        staleTime: CLASS_CACHE_CONFIG.list.staleTime,
      });
    },
  };
};
```

---

#### B2: Create useClassList Hook (1.5 hours)

**File:** `frontend/src/shared/hooks/useClassList.ts`

```typescript
import { useState, useEffect, useCallback, useMemo } from 'react';
import { ClassQueryParams, CreateClassRequest, UpdateClassRequest } from '../types/class';
import { Class } from '../types/class';
import {
  useClassListQuery,
  useCreateClassMutation,
  useUpdateClassMutation,
  useDeleteClassMutation,
  useBulkDeleteClassesMutation,
  useInvalidateClasses,
} from './queries/useClassQueries';

export interface UseClassListOptions {
  initialLimit?: number;
}

export interface UseClassListReturn {
  // Data
  classes: Class[];
  total: number;
  loading: boolean;
  error: string | null;

  // Pagination
  currentPage: number;
  limit: number;
  totalPages: number;

  // Filters
  searchTerm: string;
  yearFilter: number | '';
  departmentFilter: string;
  statusFilter: boolean | '';

  // Actions
  setSearchTerm: (term: string) => void;
  setYearFilter: (year: number | '') => void;
  setDepartmentFilter: (dept: string) => void;
  setStatusFilter: (status: boolean | '') => void;
  setCurrentPage: (page: number) => void;
  loadClasses: () => Promise<void>;
  refreshClasses: () => Promise<void>;

  // CRUD Operations
  createClass: (classData: CreateClassRequest) => Promise<void>;
  updateClass: (classId: string, classData: UpdateClassRequest) => Promise<void>;
  deleteClass: (classId: string) => Promise<void>;
  bulkDeleteClasses: (classIds: string[]) => Promise<void>;

  // UI States
  isCreating: boolean;
  isUpdating: boolean;
  isDeleting: boolean;
  isBulkDeleting: boolean;
}

export const useClassList = (options: UseClassListOptions = {}): UseClassListReturn => {
  const { initialLimit = 10 } = options;

  // Local state for filters (UI state, not cached)
  const [currentPage, setCurrentPage] = useState(1);
  const [limit] = useState(initialLimit);
  const [searchTerm, setSearchTerm] = useState('');
  const [yearFilter, setYearFilter] = useState<number | ''>('');
  const [departmentFilter, setDepartmentFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState<boolean | ''>('');

  // Build query params from filters
  const queryParams = useMemo<ClassQueryParams>(() => ({
    page: currentPage,
    limit: limit,
    ...(searchTerm && { search: searchTerm }),
    ...(yearFilter && { year: Number(yearFilter) }),
    ...(departmentFilter && { departmentId: departmentFilter }),
    ...(statusFilter !== '' && { isActive: Boolean(statusFilter) }),
  }), [currentPage, limit, searchTerm, yearFilter, departmentFilter, statusFilter]);

  // ===================================
  // REACT QUERY: Replace manual state management
  // ===================================
  const {
    data: queryData,
    isLoading,
    error: queryError,
    refetch,
  } = useClassListQuery(queryParams);

  const createMutation = useCreateClassMutation();
  const updateMutation = useUpdateClassMutation();
  const deleteMutation = useDeleteClassMutation();
  const bulkDeleteMutation = useBulkDeleteClassesMutation();
  const { invalidateLists } = useInvalidateClasses();

  // Extract data from React Query response
  const classes = queryData?.classes ?? [];
  const total = queryData?.total ?? 0;
  const totalPages = Math.ceil(total / limit);

  // Convert React Query states to interface
  const loading = isLoading;
  const error = queryError ? (queryError as Error).message : null;

  // CRUD operations - Wrap mutations to match interface
  const createClass = useCallback(async (classData: CreateClassRequest) => {
    return new Promise<void>((resolve, reject) => {
      createMutation.mutate(classData, {
        onSuccess: () => resolve(),
        onError: (error) => reject(error),
      });
    });
  }, [createMutation]);

  const updateClass = useCallback(async (classId: string, classData: UpdateClassRequest) => {
    return new Promise<void>((resolve, reject) => {
      updateMutation.mutate({ id: classId, data: classData }, {
        onSuccess: () => resolve(),
        onError: (error) => reject(error),
      });
    });
  }, [updateMutation]);

  const deleteClass = useCallback(async (classId: string) => {
    return new Promise<void>((resolve, reject) => {
      deleteMutation.mutate(classId, {
        onSuccess: () => resolve(),
        onError: (error) => reject(error),
      });
    });
  }, [deleteMutation]);

  const bulkDeleteClasses = useCallback(async (classIds: string[]) => {
    return new Promise<void>((resolve, reject) => {
      bulkDeleteMutation.mutate(classIds, {
        onSuccess: () => resolve(),
        onError: (error) => reject(error),
      });
    });
  }, [bulkDeleteMutation]);

  // Manual refresh
  const loadClasses = useCallback(async () => {
    await refetch();
  }, [refetch]);

  const refreshClasses = useCallback(async () => {
    invalidateLists();
  }, [invalidateLists]);

  // Reset to page 1 when search term changes (debounced)
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      setCurrentPage(1);
    }, 500);

    return () => clearTimeout(timeoutId);
  }, [searchTerm]);

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [yearFilter, departmentFilter, statusFilter]);

  return {
    // Data
    classes,
    total,
    loading,
    error,

    // Pagination
    currentPage,
    limit,
    totalPages,

    // Filters
    searchTerm,
    yearFilter,
    departmentFilter,
    statusFilter,

    // Actions
    setSearchTerm,
    setYearFilter,
    setDepartmentFilter,
    setStatusFilter,
    setCurrentPage,
    loadClasses,
    refreshClasses,

    // CRUD Operations
    createClass,
    updateClass,
    deleteClass,
    bulkDeleteClasses,

    // UI States
    isCreating: createMutation.isPending,
    isUpdating: updateMutation.isPending,
    isDeleting: deleteMutation.isPending,
    isBulkDeleting: bulkDeleteMutation.isPending,
  };
};
```

---

#### B3: Migrate ClassesPage.tsx (1 hour)

**Changes:**
```typescript
// Before:
const [classes, setClasses] = useState<Class[]>([]);
const [loading, setLoading] = useState(true);
useEffect(() => {
  loadClasses();
}, [currentPage, yearFilter]);

// After:
const {
  classes,
  total,
  loading,
  currentPage,
  setCurrentPage,
  createClass,
  deleteClass,
  // ... all other methods
} = useClassList({ initialLimit: 10 });

// Remove all manual state management!
```

**Result:** Component code giảm ~50%, automatic cache management

---

#### B4: Testing & Documentation (1 hour)

- Create `CLASSES_CACHE_TESTING_GUIDE.md`
- Test 10 scenarios (giống Users Page)
- Verify performance improvements

---

## 📊 Expected Performance Improvements

### Organizations Page Optimization

| Metric | Before | After | Improvement |
|--------|--------|-------|-------------|
| **Initial tree load** | 500-800ms | 200-300ms | **2-3x faster** ⚡ |
| **Expand organization** | 200-300ms | **< 10ms** (cached) | **20-30x faster** |
| **Member add (stats)** | Refetch all stats | Optimistic update | **∞ faster** 🚀 |
| **Hover prefetch** | N/A | **0ms** (instant) | **New feature** ✨ |

### Classes Page Migration

| Metric | Before (Manual) | After (React Query) | Improvement |
|--------|----------------|---------------------|-------------|
| **First load** | 300-500ms | 300-500ms | Same |
| **Revisit page** | 300-500ms | **< 10ms** | **30-50x faster** ⚡ |
| **Pagination** | Loading spinner | Smooth fade | **Perfect UX** ✨ |
| **Delete (optimistic)** | 300ms wait | **0ms instant** | **∞ faster** 🚀 |
| **API calls (10 pages)** | 10 requests | 1-2 requests | **-80% to -90%** 💰 |

---

## 📝 Implementation Timeline

### Week 1: Organizations Optimization

**Day 1-2:** Phase A1 - Lazy load children (2 hours)
- Create `useOrganizationChildren` hook
- Update `OrganizationTreeItem` to use on-demand loading
- Test expand/collapse performance

**Day 3:** Phase A2 - Optimistic stats update (1.5 hours)
- Create `useAddMemberMutation` với optimistic update
- Create `useRemoveMemberMutation` với optimistic update
- Test stats instant update

**Day 4:** Phase A3 - Prefetch siblings (1 hour)
- Create `usePrefetchOrganizationChildren`
- Add hover prefetch to tree items
- Test instant expand

**Day 5:** Testing & Documentation (1 hour)
- Test all optimizations
- Document changes
- Create PR

---

### Week 2: Classes Page Migration

**Day 1-2:** Phase B1 - Create query hooks (3 hours)
- Create `useClassQueries.ts` (queries + mutations)
- Add cache keys, config
- Add optimistic updates

**Day 3:** Phase B2 - Create useClassList (2 hours)
- Create `useClassList.ts`
- Wrap mutations
- Match old interface

**Day 4:** Phase B3 - Migrate ClassesPage (2 hours)
- Replace manual state với `useClassList`
- Remove `useState`, `useEffect`
- Test all features

**Day 5:** Phase B4 - Testing & Docs (2 hours)
- Create testing guide
- Run 10 test scenarios
- Verify performance metrics

---

## 🎯 Success Criteria

### Organizations Page
- [ ] Tree loads in < 300ms (from 500-800ms)
- [ ] Expand organization instant (< 10ms)
- [ ] Member add shows instant stats update
- [ ] Prefetch works on hover
- [ ] No breaking changes

### Classes Page
- [ ] Cache hit rate > 80%
- [ ] Pagination smooth (no loading spinner)
- [ ] Optimistic delete < 50ms
- [ ] API calls reduced > 85%
- [ ] All TypeScript errors = 0
- [ ] Backward compatible

---

## 🚀 Quick Start

### Organizations Page

1. **Check current cache status**
   ```typescript
   // Already using React Query!
   // Just add optimizations
   ```

2. **Add lazy loading**
   ```bash
   # Edit: useOrganizationQueries.ts
   # Add: useOrganizationChildren hook
   ```

3. **Add optimistic updates**
   ```bash
   # Edit: useOrganizationQueries.ts
   # Update: useAddMemberMutation
   ```

### Classes Page

1. **Create query hooks**
   ```bash
   # Create: frontend/src/shared/hooks/queries/useClassQueries.ts
   # Copy pattern from useUserQueries.ts
   ```

2. **Create useClassList**
   ```bash
   # Create: frontend/src/shared/hooks/useClassList.ts
   # Copy pattern from useUserList.ts
   ```

3. **Migrate ClassesPage**
   ```bash
   # Edit: frontend/src/features/classes/ClassesPage.tsx
   # Replace manual state with useClassList
   ```

---

## 📚 References

### Internal
- ✅ `USERS_PAGE_TANSTACK_QUERY_PLAN.md` - Pattern reference
- ✅ `USERS_CACHE_IMPLEMENTATION_SUMMARY.md` - Implementation guide
- ✅ `useUserQueries.ts` - Query hooks pattern
- ✅ `useOrganizationQueries.ts` - Existing org cache

### External
- [TanStack Query - Dependent Queries](https://tanstack.com/query/latest/docs/react/guides/dependent-queries)
- [TanStack Query - Prefetching](https://tanstack.com/query/latest/docs/react/guides/prefetching)
- [Tree Loading Strategies](https://github.com/TanStack/query/discussions/1177)

---

## 🎉 Summary

### Organizations Page
**Status:** ✅ Đã có cache cơ bản
**Action:** Optimize với lazy loading, optimistic updates, prefetch
**Effort:** 4-5 hours
**Impact:** 2-3x faster tree, instant stats updates

### Classes Page
**Status:** ❌ Chưa có cache
**Action:** Full migration sang React Query (giống Users Page)
**Effort:** 8-10 hours
**Impact:** 30-50x faster revisit, 85% less API calls

### Total
**Effort:** 12-15 hours (1.5-2 weeks)
**ROI:** Massive performance boost + Better UX

**Let's implement! 🚀**
