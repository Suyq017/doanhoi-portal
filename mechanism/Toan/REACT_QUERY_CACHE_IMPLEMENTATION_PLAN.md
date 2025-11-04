# Kế Hoạch Triển Khai React Query Cache cho Organizations & Users

## 📋 Tổng Quan

### Mục Tiêu
Áp dụng React Query để cache data cho 2 trang chính:
1. **Organizations Page** - Tree structure với stats
2. **Users Page** - Paginated list với filters

### Lợi Ích Mong Đợi
- ⚡ Load tức thì khi quay lại page (0ms vs 2-3s)
- 🔄 Background refetch tự động (UX smooth)
- 💾 Giảm 80-90% API calls
- 🎯 Smart invalidation (chỉ refetch khi cần)
- 🐛 Better error handling & retry

---

## 🏗️ Phân Tích Cấu Trúc Hiện Tại

### 1. Organizations Page Structure

#### Current Data Flow
```
OrganizationsPage.tsx
  ↓
useOrganizationPage hook
  ↓
├─ useOrganizationTree (tree data)
│  ├─ fetchOrganizationTreeMainPage() → GET /organizations/tree?maxDepth=2
│  ├─ fetchOrganizationDetailPage() → GET /organizations/tree?type={type}&code={code}
│  └─ fetchOrganizationSubDetailPage() → GET /organizations/by-type-code/{type}/{code}
│
└─ useOrganizationStatsContext (stats data)
   └─ fetchStats() → GET /organizations/stats
```

#### Key Features
- **3 loại tree load**: Main (depth 2), Detail (depth 2), SubDetail (depth 1)
- **Optimistic updates**: `updateOrganizationInTree()` - instant UI update
- **Multiple pages**: Main, Detail, SubDetail, Members
- **Shared stats**: Stats được dùng ở tất cả các pages

#### Current State Management
```typescript
// useOrganizationTree.ts
const [organizations, setOrganizations] = useState<Organization[]>([]);
const [loading, setLoading] = useState<boolean>(true);
const [error, setError] = useState<string | null>(null);

// Manual state updates
setOrganizations(treeData);
```

#### Current Performance Issues
1. ❌ Reload data khi navigate giữa các pages (Main ↔ Detail)
2. ❌ Không cache stats (fetch lại mỗi page)
3. ❌ Không background refetch (data có thể outdated)
4. ❌ Phải manual invalidation (dễ quên)

---

### 2. Users Page Structure

#### Current Data Flow
```
UsersPage.tsx
  ↓
useUserList hook (from shared/hooks)
  ↓
userService.getUsers(params)
  ↓
GET /users?page={page}&limit={limit}&search={search}&userType={type}&membershipStatus={status}
```

#### Key Features
- **Pagination**: 10 users/page (fast!)
- **Filters**: search, userType, membershipStatus
- **CRUD operations**: Create, Update, Delete, Bulk Delete
- **Auto-load**: Load on mount + page change
- **Debounced search**: 500ms delay

#### Current State Management
```typescript
// useUserList.ts
const [users, setUsers] = useState<User[]>([]);
const [total, setTotal] = useState(0);
const [loading, setLoading] = useState(false);
const [error, setError] = useState<string | null>(null);

// Filters
const [currentPage, setCurrentPage] = useState(1);
const [searchTerm, setSearchTerm] = useState('');
const [filterType, setFilterType] = useState('all');
const [filterStatus, setFilterStatus] = useState('all');
```

#### Current Performance Issues
1. ❌ Reload toàn bộ list khi navigate back (page 1 → page 2 → page 1)
2. ❌ Không cache theo page/filter combination
3. ❌ Không optimistic updates cho CRUD
4. ❌ Refresh entire list after create/update/delete (lãng phí)

---

## 🎯 React Query Strategy

### Cache Keys Design

#### Organizations Cache Keys
```typescript
export const organizationKeys = {
  // Base key
  all: ['organizations'] as const,
  
  // Tree queries (separate by depth & type/code)
  trees: () => [...organizationKeys.all, 'tree'] as const,
  treeMain: (maxDepth: number) => [...organizationKeys.trees(), 'main', { maxDepth }] as const,
  treeDetail: (type: string, code: string, maxDepth: number) => 
    [...organizationKeys.trees(), 'detail', type, code, { maxDepth }] as const,
  treeSubDetail: (type: string, code: string, maxDepth: number) => 
    [...organizationKeys.trees(), 'subdetail', type, code, { maxDepth }] as const,
  
  // Stats query (shared across all pages)
  stats: () => [...organizationKeys.all, 'stats'] as const,
  
  // Specific org queries
  detail: (type: string, code: string) => 
    [...organizationKeys.all, 'detail', type, code] as const,
};

// Example cache keys:
// ['organizations', 'tree', 'main', { maxDepth: 2 }]
// ['organizations', 'tree', 'detail', 'department', 'CS', { maxDepth: 2 }]
// ['organizations', 'stats']
```

#### Users Cache Keys
```typescript
export const userKeys = {
  // Base key
  all: ['users'] as const,
  
  // List queries (separate by page + filters)
  lists: () => [...userKeys.all, 'list'] as const,
  list: (params: UserQueryParams) => [...userKeys.lists(), params] as const,
  
  // Detail queries
  details: () => [...userKeys.all, 'detail'] as const,
  detail: (userId: string) => [...userKeys.details(), userId] as const,
};

// Example cache keys:
// ['users', 'list', { page: 1, limit: 10, search: '', userType: 'all', membershipStatus: 'all' }]
// ['users', 'list', { page: 2, limit: 10, search: 'nguyen', userType: 'student', membershipStatus: 'active' }]
// ['users', 'detail', 'user-123']
```

### Stale Time Configuration

```typescript
// Organizations
const ORGANIZATION_CONFIG = {
  // Tree: Medium stale time (structure ít thay đổi)
  treeStaleTime: 5 * 60 * 1000, // 5 minutes
  treeCacheTime: 30 * 60 * 1000, // 30 minutes
  
  // Stats: Medium stale time (global data)
  statsStaleTime: 5 * 60 * 1000, // 5 minutes
  statsCacheTime: 60 * 60 * 1000, // 1 hour
};

// Users
const USER_CONFIG = {
  // List: Short stale time (data thay đổi thường xuyên)
  listStaleTime: 3 * 60 * 1000, // 3 minutes
  listCacheTime: 10 * 60 * 1000, // 10 minutes
  
  // Detail: Very short stale time
  detailStaleTime: 1 * 60 * 1000, // 1 minute
  detailCacheTime: 5 * 60 * 1000, // 5 minutes
};
```

---

## 📁 File Structure

```
frontend/src/
├── shared/
│   ├── hooks/
│   │   ├── queries/
│   │   │   ├── useOrganizationQueries.ts  ← NEW: Organization React Query hooks
│   │   │   ├── useUserQueries.ts          ← NEW: User React Query hooks
│   │   │   └── index.ts
│   │   ├── useUserList.ts                 ← MODIFY: Migrate to React Query
│   │   └── index.ts
│   ├── services/
│   │   ├── organizationService.ts         ← KEEP: Already optimized
│   │   └── userService.ts                 ← KEEP: Already optimized
│   └── config/
│       └── queryClient.ts                 ← NEW: React Query config
├── features/
│   ├── organizations/
│   │   ├── hooks/
│   │   │   ├── useOrganizationTree.ts     ← MODIFY: Use React Query
│   │   │   ├── useOrganizationPage.ts     ← MODIFY: Use React Query
│   │   │   └── useOrganizationStats.ts    ← MODIFY: Use React Query
│   │   └── OrganizationsPage.tsx          ← MINIMAL CHANGE
│   └── users/
│       ├── hooks/
│       │   └── useUserActions.ts          ← MODIFY: Add optimistic updates
│       └── UsersPage.tsx                  ← MINIMAL CHANGE
└── main.tsx                               ← MODIFY: Add QueryClientProvider
```

---

## 🚀 Implementation Plan

### Phase 1: Setup React Query (Day 1)

#### 1.1 Install Dependencies

```bash
npm install @tanstack/react-query@^5.0.0
npm install @tanstack/react-query-devtools@^5.0.0
```

#### 1.2 Create Query Client Config

**File: `frontend/src/shared/config/queryClient.ts`**

```typescript
import { QueryClient } from '@tanstack/react-query';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Global defaults
      staleTime: 5 * 60 * 1000, // 5 minutes
      cacheTime: 10 * 60 * 1000, // 10 minutes
      
      // Error handling
      retry: 2,
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
      
      // Performance
      refetchOnWindowFocus: false, // Don't refetch on tab switch (can be annoying)
      refetchOnReconnect: true, // Refetch when internet reconnects
      refetchOnMount: true, // Refetch when component mounts if data is stale
      
      // Network mode
      networkMode: 'online', // Only fetch when online
    },
    mutations: {
      // Mutation defaults
      retry: 1,
      networkMode: 'online',
    },
  },
});

// Export separate configs for different data types
export const CACHE_CONFIG = {
  organizations: {
    tree: {
      staleTime: 5 * 60 * 1000, // 5 min
      cacheTime: 30 * 60 * 1000, // 30 min
    },
    stats: {
      staleTime: 5 * 60 * 1000, // 5 min
      cacheTime: 60 * 60 * 1000, // 1 hour
    },
  },
  users: {
    list: {
      staleTime: 3 * 60 * 1000, // 3 min
      cacheTime: 10 * 60 * 1000, // 10 min
    },
    detail: {
      staleTime: 1 * 60 * 1000, // 1 min
      cacheTime: 5 * 60 * 1000, // 5 min
    },
  },
} as const;
```

#### 1.3 Setup Provider in main.tsx

**File: `frontend/src/main.tsx`**

```typescript
import React from 'react';
import ReactDOM from 'react-dom/client';
import { QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { queryClient } from './shared/config/queryClient';
import App from './App';
import './globals.css';
import './i18n/config';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <App />
      {/* DevTools - only in development */}
      {import.meta.env.DEV && (
        <ReactQueryDevtools 
          initialIsOpen={false}
          position="bottom-right"
          buttonPosition="bottom-right"
        />
      )}
    </QueryClientProvider>
  </React.StrictMode>
);
```

---

### Phase 2: Organizations - Query Hooks (Day 2-3)

#### 2.1 Create Organization Query Hooks

**File: `frontend/src/shared/hooks/queries/useOrganizationQueries.ts`**

```typescript
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { organizationService } from '../../services/organizationService';
import { Organization, OrganizationStats } from '../../types/organization';
import { CACHE_CONFIG } from '../../config/queryClient';

/**
 * ========================
 * QUERY KEYS
 * ========================
 */
export const organizationKeys = {
  all: ['organizations'] as const,
  
  // Tree queries
  trees: () => [...organizationKeys.all, 'tree'] as const,
  treeMain: (maxDepth: number) => [...organizationKeys.trees(), 'main', { maxDepth }] as const,
  treeDetail: (type: string, code: string, maxDepth: number) => 
    [...organizationKeys.trees(), 'detail', type, code, { maxDepth }] as const,
  treeSubDetail: (type: string, code: string, maxDepth: number) => 
    [...organizationKeys.trees(), 'subdetail', type, code, { maxDepth }] as const,
  
  // Stats query
  stats: () => [...organizationKeys.all, 'stats'] as const,
  
  // Detail query
  detail: (type: string, code: string) => 
    [...organizationKeys.all, 'detail', type, code] as const,
};

/**
 * ========================
 * QUERY HOOKS
 * ========================
 */

/**
 * Hook for Main Page - Tree with depth limit
 * Cache key: ['organizations', 'tree', 'main', { maxDepth: 2 }]
 */
export const useOrganizationTreeMain = (maxDepth: number = 2) => {
  return useQuery({
    queryKey: organizationKeys.treeMain(maxDepth),
    queryFn: () => organizationService.getOrganizationTreeWithDepth(maxDepth),
    ...CACHE_CONFIG.organizations.tree,
    
    // Transform response - auto-expand level 1
    select: (data: Organization[]) => {
      return data.map(org => ({
        ...org,
        isExpanded: true,
        children: org.children?.map(child => ({
          ...child,
          isExpanded: false
        }))
      }));
    },
  });
};

/**
 * Hook for Detail Page - Specific org tree
 * Cache key: ['organizations', 'tree', 'detail', type, code, { maxDepth: 2 }]
 */
export const useOrganizationTreeDetail = (
  type: string,
  code: string,
  maxDepth: number = 2,
  options?: { enabled?: boolean }
) => {
  return useQuery({
    queryKey: organizationKeys.treeDetail(type, code, maxDepth),
    queryFn: () => organizationService.getOrganizationTreeByTypeCode(type, code, maxDepth),
    ...CACHE_CONFIG.organizations.tree,
    enabled: !!(type && code) && (options?.enabled !== false),
    
    // Transform to array for consistent structure
    select: (data: Organization) => {
      return [{
        ...data,
        isExpanded: true
      }];
    },
  });
};

/**
 * Hook for SubDetail Page - Direct org load
 * Cache key: ['organizations', 'tree', 'subdetail', type, code, { maxDepth: 1 }]
 */
export const useOrganizationTreeSubDetail = (
  type: string,
  code: string,
  maxDepth: number = 1,
  options?: { enabled?: boolean }
) => {
  return useQuery({
    queryKey: organizationKeys.treeSubDetail(type, code, maxDepth),
    queryFn: () => organizationService.getOrganizationByTypeCode(type, code, {
      includeChildren: true,
      maxDepth
    }),
    ...CACHE_CONFIG.organizations.tree,
    enabled: !!(type && code) && (options?.enabled !== false),
    
    // Transform to array
    select: (data: Organization) => {
      return [{
        ...data,
        isExpanded: true
      }];
    },
  });
};

/**
 * Hook for Stats - Shared across all pages
 * Cache key: ['organizations', 'stats']
 */
export const useOrganizationStats = () => {
  return useQuery({
    queryKey: organizationKeys.stats(),
    queryFn: () => organizationService.getOrganizationStats(),
    ...CACHE_CONFIG.organizations.stats,
    refetchOnMount: false, // Don't refetch if cache is still fresh
  });
};

/**
 * ========================
 * MUTATION HOOKS
 * ========================
 */

/**
 * Hook for creating organization
 */
export const useCreateOrganization = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: organizationService.createOrganization.bind(organizationService),
    
    onSuccess: () => {
      // Invalidate all tree queries (new org added)
      queryClient.invalidateQueries({ queryKey: organizationKeys.trees() });
      // Invalidate stats (count changed)
      queryClient.invalidateQueries({ queryKey: organizationKeys.stats() });
    },
  });
};

/**
 * Hook for updating organization
 * Supports optimistic updates
 */
export const useUpdateOrganization = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => 
      organizationService.updateOrganization(id, data),
    
    // Optimistic update
    onMutate: async ({ id, data }) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: organizationKeys.trees() });
      
      // Snapshot previous value
      const previousTrees = queryClient.getQueriesData({ 
        queryKey: organizationKeys.trees() 
      });
      
      // Optimistically update all tree caches
      queryClient.setQueriesData(
        { queryKey: organizationKeys.trees() },
        (old: any) => {
          if (!old) return old;
          
          const updateRecursive = (orgs: Organization[]): Organization[] => {
            return orgs.map(org => {
              if (org.id === id) {
                return { ...org, ...data };
              }
              if (org.children?.length > 0) {
                return { ...org, children: updateRecursive(org.children) };
              }
              return org;
            });
          };
          
          return Array.isArray(old) ? updateRecursive(old) : old;
        }
      );
      
      return { previousTrees };
    },
    
    // Rollback on error
    onError: (_err, _variables, context) => {
      if (context?.previousTrees) {
        context.previousTrees.forEach(([queryKey, data]) => {
          queryClient.setQueryData(queryKey, data);
        });
      }
    },
    
    // Always refetch after success or error
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: organizationKeys.trees() });
    },
  });
};

/**
 * Hook for deleting organization
 */
export const useDeleteOrganization = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (id: string) => organizationService.deleteOrganization(id),
    
    onSuccess: () => {
      // Invalidate all (org no longer exists)
      queryClient.invalidateQueries({ queryKey: organizationKeys.all });
    },
  });
};

/**
 * Hook for adding member to organization
 */
export const useAddMember = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ orgId, userId, role }: { orgId: string; userId: string; role?: string }) =>
      organizationService.addUserToOrganization(orgId, userId, role),
    
    onSuccess: () => {
      // Only invalidate stats (member count changed)
      queryClient.invalidateQueries({ queryKey: organizationKeys.stats() });
    },
  });
};

/**
 * Hook for removing member from organization
 */
export const useRemoveMember = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ orgId, userId }: { orgId: string; userId: string }) =>
      organizationService.removeUserFromOrganizationSafely(orgId, userId),
    
    onSuccess: () => {
      // Only invalidate stats (member count changed)
      queryClient.invalidateQueries({ queryKey: organizationKeys.stats() });
    },
  });
};

/**
 * ========================
 * UTILITY HOOKS
 * ========================
 */

/**
 * Hook to manually invalidate caches
 */
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
    
    invalidateTreeMain: (maxDepth: number = 2) => {
      queryClient.invalidateQueries({ queryKey: organizationKeys.treeMain(maxDepth) });
    },
  };
};
```

#### 2.2 Update useOrganizationTree Hook

**File: `frontend/src/features/organizations/hooks/useOrganizationTree.ts`**

```typescript
import { useState, useCallback } from 'react';
import { Organization } from '../../../shared/types/organization';
import { toggleExpanded } from '../utils/organizationUtils';
import {
  useOrganizationTreeMain,
  useOrganizationTreeDetail,
  useOrganizationTreeSubDetail,
} from '../../../shared/hooks/queries/useOrganizationQueries';

interface UseOrganizationTreeOptions {
  type?: 'main' | 'detail' | 'subdetail';
  organizationType?: string;
  organizationCode?: string;
  maxDepth?: number;
}

export const useOrganizationTree = (options: UseOrganizationTreeOptions = {}) => {
  const { 
    type = 'main', 
    organizationType, 
    organizationCode, 
    maxDepth = 2 
  } = options;

  // Local state for expand/collapse (not cached)
  const [organizations, setOrganizations] = useState<Organization[]>([]);

  // Select the appropriate query based on type
  const mainQuery = useOrganizationTreeMain(maxDepth);
  const detailQuery = useOrganizationTreeDetail(
    organizationType || '',
    organizationCode || '',
    maxDepth,
    { enabled: type === 'detail' && !!(organizationType && organizationCode) }
  );
  const subDetailQuery = useOrganizationTreeSubDetail(
    organizationType || '',
    organizationCode || '',
    1,
    { enabled: type === 'subdetail' && !!(organizationType && organizationCode) }
  );

  // Select active query
  let activeQuery;
  if (type === 'detail') {
    activeQuery = detailQuery;
  } else if (type === 'subdetail') {
    activeQuery = subDetailQuery;
  } else {
    activeQuery = mainQuery;
  }

  const { data, isLoading, error, refetch } = activeQuery;

  // Update local state when data changes (for expand/collapse)
  React.useEffect(() => {
    if (data) {
      setOrganizations(data);
    }
  }, [data]);

  /**
   * Toggle organization expanded state (local only)
   */
  const toggleOrgExpanded = useCallback((id: string) => {
    setOrganizations(prev => toggleExpanded(id, prev));
  }, []);

  /**
   * Update organization in tree (for optimistic updates)
   * This merges the updated org with existing local state
   */
  const updateOrganizationInTree = useCallback((updatedOrg: Organization) => {
    setOrganizations(prev => {
      const updateRecursive = (orgs: Organization[]): Organization[] => {
        return orgs.map(org => {
          if (org.id === updatedOrg.id) {
            return {
              ...org,
              ...updatedOrg,
              children: org.children,
              isExpanded: org.isExpanded
            };
          }
          
          if (org.children && org.children.length > 0) {
            return {
              ...org,
              children: updateRecursive(org.children)
            };
          }
          
          return org;
        });
      };
      
      return updateRecursive(prev);
    });
  }, []);

  return {
    organizations,
    loading: isLoading,
    error: error?.message || null,
    refetch,
    toggleOrgExpanded,
    updateOrganizationInTree,
  };
};
```

#### 2.3 Update useOrganizationPage Hook

**File: `frontend/src/features/organizations/hooks/useOrganizationPage.ts`**

```typescript
import { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { Organization } from '../../../shared/types/organization';
import { useOrganizationTree } from './useOrganizationTree';
import { 
  useOrganizationStats,
  useUpdateOrganization,
  useDeleteOrganization,
  useAddMember,
  useRemoveMember,
  useInvalidateOrganizations,
} from '../../../shared/hooks/queries/useOrganizationQueries';
import { useToast } from '../../../shared';

interface UseOrganizationPageOptions {
  type?: string;
  code?: string;
  isDetailPage?: boolean;
  isSubDetailPage?: boolean;
}

export const useOrganizationPage = (options: UseOrganizationPageOptions = {}) => {
  const { type, code, isDetailPage = false, isSubDetailPage = false } = options;
  const { t } = useTranslation(['organizations', 'common']);
  const { toasts, hideToast, showSuccess, showError } = useToast();

  // Determine tree type
  let treeType: 'main' | 'detail' | 'subdetail' = 'main';
  if (isSubDetailPage) treeType = 'subdetail';
  else if (isDetailPage) treeType = 'detail';

  // React Query hooks
  const {
    organizations,
    loading: loadingTree,
    error: treeError,
    toggleOrgExpanded,
    updateOrganizationInTree,
    refetch: refetchTree,
  } = useOrganizationTree({
    type: treeType,
    organizationType: type,
    organizationCode: code,
    maxDepth: isSubDetailPage ? 1 : 2,
  });

  const {
    data: stats,
    isLoading: loadingStats,
    error: statsError,
    refetch: refetchStats,
  } = useOrganizationStats();

  // Mutations
  const updateOrgMutation = useUpdateOrganization();
  const deleteOrgMutation = useDeleteOrganization();
  const addMemberMutation = useAddMember();
  const removeMemberMutation = useRemoveMember();
  const { invalidateStats, invalidateTrees } = useInvalidateOrganizations();

  // Combined loading & error states
  const loading = loadingTree || loadingStats;
  const error = treeError || statsError?.message || null;

  // Refetch all data
  const fetchData = useCallback(async () => {
    await Promise.all([refetchTree(), refetchStats()]);
  }, [refetchTree, refetchStats]);

  // ========================
  // EVENT HANDLERS
  // ========================

  /**
   * Handle member added
   */
  const handleMemberAdded = useCallback(async () => {
    showSuccess(t('common:messages.success.add'));
    
    // Only invalidate stats (tree doesn't change)
    setTimeout(() => {
      invalidateStats();
    }, 150);
  }, [invalidateStats, showSuccess, t]);

  /**
   * Handle member delete
   */
  const handleMemberDelete = useCallback(async () => {
    showSuccess(t('common:messages.success.delete'));
    
    // Only invalidate stats (tree doesn't change)
    setTimeout(() => {
      invalidateStats();
    }, 150);
  }, [invalidateStats, showSuccess, t]);

  const handleMemberAddError = useCallback((error: string) => {
    showError(error);
  }, [showError]);

  /**
   * ✅ OPTIMIZED: Update organization with optimistic update
   * React Query handles cache update automatically
   */
  const handleOrganizationUpdated = useCallback(async (updatedOrg?: Organization) => {
    try {
      if (updatedOrg) {
        // Update local state immediately (optimistic)
        updateOrganizationInTree(updatedOrg);
        
        // Backend update (React Query handles cache)
        await updateOrgMutation.mutateAsync({
          id: updatedOrg.id,
          data: updatedOrg,
        });
        
        showSuccess(t('common:messages.success.update'));
      } else {
        // Fallback: refetch
        await fetchData();
        showSuccess(t('common:messages.success.update'));
      }
    } catch (error) {
      showError(t('common:messages.error.update'));
    }
  }, [updateOrganizationInTree, updateOrgMutation, fetchData, showSuccess, showError, t]);

  /**
   * Handle organization deleted
   */
  const handleOrganizationDeleted = useCallback(async () => {
    try {
      showSuccess(t('common:messages.success.delete'));
      
      // Invalidate all (org structure changed)
      setTimeout(() => {
        invalidateTrees();
        invalidateStats();
      }, 150);
    } catch (error) {
      showError(t('common:messages.error.delete'));
    }
  }, [invalidateTrees, invalidateStats, showSuccess, showError, t]);

  const handleDeleteError = useCallback((error: string) => {
    showError(error);
  }, [showError]);

  const handleBulkDeleteSuccess = useCallback((message: string) => {
    showSuccess(message);
    setTimeout(() => {
      invalidateStats();
    }, 150);
  }, [invalidateStats, showSuccess]);

  const handleBulkDeleteError = useCallback((error: string) => {
    showError(error);
  }, [showError]);

  /**
   * Handle organization created
   */
  const handleOrganizationCreated = useCallback(async (message?: string) => {
    showSuccess(message || t('organizations:messages.createSuccess'));
    
    // Invalidate all (new org added)
    setTimeout(() => {
      invalidateTrees();
      invalidateStats();
    }, 150);
  }, [invalidateTrees, invalidateStats, showSuccess, t]);

  const handleOrganizationCreateError = useCallback((error: string) => {
    showError(error);
  }, [showError]);

  // ========================
  // UTILITY FUNCTIONS
  // ========================

  const getPageTitle = useCallback((customName?: string) => {
    if (isSubDetailPage) {
      return `${t('organizations:title')} › ${organizations[0]?.name || ''} › ${customName}`;
    } else if (isDetailPage) {
      return `${t('organizations:title')} › ${organizations[0]?.name || ''}`;
    }
    return t('organizations:title');
  }, [t, organizations, isDetailPage, isSubDetailPage]);

  const renderOrganization = useCallback(() => {
    return null;
  }, []);

  return {
    organizations,
    stats,
    loading,
    error,
    toggleOrgExpanded,
    fetchData,
    handleMemberAdded,
    handleMemberDelete,
    handleMemberAddError,
    handleOrganizationUpdated,
    handleOrganizationDeleted,
    handleDeleteError,
    handleBulkDeleteSuccess,
    handleBulkDeleteError,
    handleOrganizationCreated,
    handleOrganizationCreateError,
    toasts,
    hideToast,
    showSuccess,
    showError,
    getPageTitle,
    renderOrganization
  };
};
```

---

### Phase 3: Users - Query Hooks (Day 4-5)

#### 3.1 Create User Query Hooks

**File: `frontend/src/shared/hooks/queries/useUserQueries.ts`**

```typescript
import { useQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query';
import { userService } from '../../services/userService';
import { User, UserQueryParams, CreateUserRequest, UpdateUserRequest } from '../../types/user';
import { CACHE_CONFIG } from '../../config/queryClient';

/**
 * ========================
 * QUERY KEYS
 * ========================
 */
export const userKeys = {
  all: ['users'] as const,
  
  // List queries
  lists: () => [...userKeys.all, 'list'] as const,
  list: (params: UserQueryParams) => [...userKeys.lists(), params] as const,
  
  // Detail queries
  details: () => [...userKeys.all, 'detail'] as const,
  detail: (userId: string) => [...userKeys.details(), userId] as const,
};

/**
 * ========================
 * QUERY HOOKS
 * ========================
 */

/**
 * Hook for user list with pagination & filters
 * Cache key: ['users', 'list', { page, limit, search, userType, membershipStatus }]
 */
export const useUserList = (params: UserQueryParams = {}) => {
  return useQuery({
    queryKey: userKeys.list(params),
    queryFn: () => userService.getUsers(params),
    ...CACHE_CONFIG.users.list,
    
    // Keep previous data while fetching new page (smooth UX)
    placeholderData: keepPreviousData,
  });
};

/**
 * Hook for single user detail
 * Cache key: ['users', 'detail', userId]
 */
export const useUserDetail = (userId: string, options?: { enabled?: boolean }) => {
  return useQuery({
    queryKey: userKeys.detail(userId),
    queryFn: () => userService.getUserById(userId),
    ...CACHE_CONFIG.users.detail,
    enabled: !!userId && (options?.enabled !== false),
  });
};

/**
 * ========================
 * MUTATION HOOKS
 * ========================
 */

/**
 * Hook for creating user
 */
export const useCreateUser = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (userData: CreateUserRequest) => userService.createUser(userData),
    
    onSuccess: () => {
      // Invalidate all list queries (new user added)
      queryClient.invalidateQueries({ queryKey: userKeys.lists() });
    },
  });
};

/**
 * Hook for updating user
 * Supports optimistic updates
 */
export const useUpdateUser = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ userId, userData }: { userId: string; userData: UpdateUserRequest }) =>
      userService.updateUser(userId, userData),
    
    // Optimistic update for detail view
    onMutate: async ({ userId, userData }) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: userKeys.detail(userId) });
      
      // Snapshot previous value
      const previousUser = queryClient.getQueryData(userKeys.detail(userId));
      
      // Optimistically update detail
      queryClient.setQueryData(userKeys.detail(userId), (old: User | undefined) => {
        if (!old) return old;
        return { ...old, ...userData };
      });
      
      return { previousUser };
    },
    
    // Rollback on error
    onError: (_err, { userId }, context) => {
      if (context?.previousUser) {
        queryClient.setQueryData(userKeys.detail(userId), context.previousUser);
      }
    },
    
    // Always refetch after success or error
    onSettled: (_data, _error, { userId }) => {
      queryClient.invalidateQueries({ queryKey: userKeys.detail(userId) });
      queryClient.invalidateQueries({ queryKey: userKeys.lists() });
    },
  });
};

/**
 * Hook for deleting user
 */
export const useDeleteUser = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (userId: string) => userService.deleteUser(userId),
    
    // Optimistic update - remove from list immediately
    onMutate: async (userId) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: userKeys.lists() });
      
      // Snapshot previous values
      const previousLists = queryClient.getQueriesData({ queryKey: userKeys.lists() });
      
      // Optimistically remove from all lists
      queryClient.setQueriesData(
        { queryKey: userKeys.lists() },
        (old: any) => {
          if (!old?.users) return old;
          
          return {
            ...old,
            users: old.users.filter((user: User) => user.id !== userId),
            total: old.total - 1,
          };
        }
      );
      
      return { previousLists };
    },
    
    // Rollback on error
    onError: (_err, _userId, context) => {
      if (context?.previousLists) {
        context.previousLists.forEach(([queryKey, data]) => {
          queryClient.setQueryData(queryKey, data);
        });
      }
    },
    
    // Always refetch after success or error
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: userKeys.lists() });
    },
  });
};

/**
 * Hook for bulk delete users
 */
export const useBulkDeleteUsers = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (userIds: string[]) => userService.deleteUsers(userIds),
    
    onSuccess: () => {
      // Invalidate all list queries
      queryClient.invalidateQueries({ queryKey: userKeys.lists() });
    },
  });
};

/**
 * ========================
 * UTILITY HOOKS
 * ========================
 */

/**
 * Hook to manually invalidate caches
 */
export const useInvalidateUsers = () => {
  const queryClient = useQueryClient();
  
  return {
    invalidateAll: () => {
      queryClient.invalidateQueries({ queryKey: userKeys.all });
    },
    
    invalidateLists: () => {
      queryClient.invalidateQueries({ queryKey: userKeys.lists() });
    },
    
    invalidateDetail: (userId: string) => {
      queryClient.invalidateQueries({ queryKey: userKeys.detail(userId) });
    },
  };
};
```

#### 3.2 Migrate useUserList Hook

**File: `frontend/src/shared/hooks/useUserList.ts`**

```typescript
import { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { UserQueryParams, CreateUserRequest, UpdateUserRequest } from '../types/user';
import { User } from '../types/user';
import {
  useUserList as useUserListQuery,
  useCreateUser,
  useUpdateUser,
  useDeleteUser,
} from './queries/useUserQueries';

export interface UseUserListOptions {
  initialLimit?: number;
  organizationId?: string;
  autoLoad?: boolean; // Not used anymore (React Query handles it)
}

export interface UseUserListReturn {
  // Data
  users: User[];
  total: number;
  loading: boolean;
  error: string | null;

  // Pagination
  currentPage: number;
  limit: number;
  totalPages: number;

  // Filters
  searchTerm: string;
  filterType: string;
  filterStatus: string;

  // Actions
  setSearchTerm: (term: string) => void;
  setFilterType: (type: string) => void;
  setFilterStatus: (status: string) => void;
  setCurrentPage: (page: number) => void;
  loadUsers: () => Promise<void>;
  refreshUsers: () => Promise<void>;

  // CRUD Operations
  createUser: (userData: CreateUserRequest) => Promise<void>;
  updateUser: (userId: string, userData: UpdateUserRequest) => Promise<void>;
  deleteUser: (userId: string) => Promise<void>;

  // UI States
  isCreating: boolean;
  isUpdating: boolean;
  isDeleting: boolean;
}

export const useUserList = (options: UseUserListOptions = {}): UseUserListReturn => {
  const { initialLimit = 10, organizationId } = options;
  const { t } = useTranslation(['users', 'common']);

  // Filter states (local)
  const [currentPage, setCurrentPage] = useState(1);
  const [limit] = useState(initialLimit);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');

  // Build query params
  const queryParams: UserQueryParams = {
    page: currentPage,
    limit: limit,
    ...(searchTerm && { search: searchTerm }),
    ...(filterType !== 'all' && { userType: filterType as 'student' | 'staff' }),
    ...(filterStatus !== 'all' && { membershipStatus: filterStatus as any }),
    ...(organizationId && { organizationId }),
  };

  // React Query hooks
  const {
    data: response,
    isLoading: loading,
    error: queryError,
    refetch,
  } = useUserListQuery(queryParams);

  const createUserMutation = useCreateUser();
  const updateUserMutation = useUpdateUser();
  const deleteUserMutation = useDeleteUser();

  // Extract data from response
  const users = response?.users || [];
  const total = response?.total || 0;
  const totalPages = Math.ceil(total / limit);
  const error = queryError?.message || null;

  // ========================
  // ACTIONS
  // ========================

  const loadUsers = useCallback(async () => {
    await refetch();
  }, [refetch]);

  const refreshUsers = useCallback(() => {
    return loadUsers();
  }, [loadUsers]);

  const createUser = useCallback(async (userData: CreateUserRequest) => {
    try {
      await createUserMutation.mutateAsync(userData);
      // React Query automatically refetches list
    } catch (error) {
      console.error('Error creating user:', error);
      throw error;
    }
  }, [createUserMutation]);

  const updateUser = useCallback(async (userId: string, userData: UpdateUserRequest) => {
    try {
      await updateUserMutation.mutateAsync({ userId, userData });
      // React Query automatically updates cache + refetches list
    } catch (error) {
      console.error('Error updating user:', error);
      throw error;
    }
  }, [updateUserMutation]);

  const deleteUser = useCallback(async (userId: string) => {
    try {
      await deleteUserMutation.mutateAsync(userId);
      // React Query automatically removes from cache + refetches list
    } catch (error) {
      console.error('Error deleting user:', error);
      throw error;
    }
  }, [deleteUserMutation]);

  // ========================
  // EFFECTS
  // ========================

  // Reset to first page when search term changes (debounced)
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      setCurrentPage(1);
    }, 500);

    return () => clearTimeout(timeoutId);
  }, [searchTerm]);

  // Reset to first page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [filterType, filterStatus]);

  return {
    // Data
    users,
    total,
    loading,
    error,

    // Pagination
    currentPage,
    limit,
    totalPages,

    // Filters
    searchTerm,
    filterType,
    filterStatus,

    // Actions
    setSearchTerm,
    setFilterType,
    setFilterStatus,
    setCurrentPage,
    loadUsers,
    refreshUsers,

    // CRUD Operations
    createUser,
    updateUser,
    deleteUser,

    // UI States
    isCreating: createUserMutation.isPending,
    isUpdating: updateUserMutation.isPending,
    isDeleting: deleteUserMutation.isPending,
  };
};
```

---

### Phase 4: Testing & Documentation (Day 6-7)

#### 4.1 Testing Checklist

**Organizations Page**

- [ ] **Main Page**
  - [ ] First load: Fetch tree (2-3s)
  - [ ] Second load: Instant from cache (0ms)
  - [ ] Stats: Instant from cache on all pages
  - [ ] Navigate to Detail → Back to Main: Instant
  - [ ] Create org: Tree + stats refetch automatically
  - [ ] Update org: Optimistic update + background refetch
  - [ ] Delete org: All caches invalidate

- [ ] **Detail Page**
  - [ ] Load specific org tree (1-2s first time)
  - [ ] Cache hit when revisit (0ms)
  - [ ] Stats shared from main page (0ms)
  - [ ] Update org: Optimistic + cache sync

- [ ] **SubDetail Page**
  - [ ] Direct load by type/code (0.5-1s first time)
  - [ ] Cache hit on revisit (0ms)

- [ ] **Network Tab**
  - [ ] Check API calls are cached
  - [ ] Check background refetch after stale time
  - [ ] Check no duplicate requests

**Users Page**

- [ ] **List View**
  - [ ] First load page 1: Fetch (0.3-0.5s)
  - [ ] Revisit page 1: Instant from cache (0ms)
  - [ ] Navigate page 1 → page 2 → page 1: Instant
  - [ ] Search: New query, fetch data
  - [ ] Filter: New query, fetch data
  - [ ] Same search/filter: Cache hit

- [ ] **CRUD Operations**
  - [ ] Create user: Optimistic update in list
  - [ ] Update user: Detail view updates instantly
  - [ ] Delete user: Removed from list instantly
  - [ ] Bulk delete: Multiple users removed instantly

- [ ] **Network Tab**
  - [ ] Each page+filter combination cached separately
  - [ ] PlaceholderData: Old data shown while fetching
  - [ ] No duplicate requests

#### 4.2 React Query DevTools Usage

```typescript
// Open DevTools (bottom-right corner)
// Check:
// 1. Active queries (green = fresh, yellow = stale)
// 2. Query keys structure
// 3. Cache invalidation
// 4. Background refetch
// 5. Optimistic updates
```

#### 4.3 Performance Metrics

**Expected Improvements:**

| Action | Before | After (Cache Hit) | Improvement |
|--------|--------|-------------------|-------------|
| Load Org Main Page | 2-3s | **0ms** | **100%** |
| Load Org Stats | 0.3-0.5s | **0ms** | **100%** |
| Navigate Org pages | 2-3s | **0ms** | **100%** |
| Edit org (optimistic) | 2.3s | **0.3s** | **87%** |
| Load Users Page 1 | 0.3-0.5s | **0ms** | **100%** |
| Revisit Users Page | 0.3-0.5s | **0ms** | **100%** |
| Delete user (optimistic) | 0.5s | **0ms** | **100%** |

**API Call Reduction:**

- Organizations: **-80%** (no refetch on revisit)
- Users: **-90%** (each page cached)
- Stats: **-95%** (shared cache, long stale time)

---

## 🎓 Key Concepts & Best Practices

### 1. Query Keys Design

```typescript
// ✅ GOOD: Hierarchical keys
['organizations', 'tree', 'main', { maxDepth: 2 }]
['organizations', 'tree', 'detail', 'department', 'CS', { maxDepth: 2 }]
['organizations', 'stats']

// ✅ GOOD: Include all params that affect data
['users', 'list', { page: 1, search: 'nguyen', userType: 'student' }]

// ❌ BAD: Too generic (can't invalidate selectively)
['organizations']
['users']
```

### 2. Stale Time vs Cache Time

```typescript
// staleTime: How long until data is considered "stale"
// - Stale data = will refetch on next mount
// - Fresh data = use cache, no refetch

// cacheTime: How long to keep unused data in cache
// - After cacheTime, data is garbage collected

// Example:
{
  staleTime: 5 * 60 * 1000, // 5 min - data fresh for 5 min
  cacheTime: 30 * 60 * 1000, // 30 min - keep in cache for 30 min
}

// Timeline:
// t=0: Fetch data → Cache (fresh)
// t=3min: Revisit → Use cache (still fresh, no refetch)
// t=6min: Revisit → Use cache but STALE (show old, refetch background)
// t=35min: Data removed from cache (no component using it for 30min)
```

### 3. Optimistic Updates

```typescript
// ✅ GOOD: Update cache immediately, rollback on error
onMutate: async (variables) => {
  // 1. Cancel ongoing requests
  await queryClient.cancelQueries({ queryKey: ['key'] });
  
  // 2. Snapshot previous state
  const previous = queryClient.getQueryData(['key']);
  
  // 3. Update cache optimistically
  queryClient.setQueryData(['key'], newData);
  
  // 4. Return context for rollback
  return { previous };
},

onError: (err, variables, context) => {
  // Rollback on error
  queryClient.setQueryData(['key'], context.previous);
},

onSettled: () => {
  // Always refetch to sync with server
  queryClient.invalidateQueries({ queryKey: ['key'] });
},
```

### 4. PlaceholderData (Smooth Pagination)

```typescript
// Show previous page data while fetching next page
{
  placeholderData: keepPreviousData,
}

// User clicks page 2:
// 1. Show page 1 data (placeholder)
// 2. Fetch page 2 in background
// 3. Replace with page 2 data when ready
// Result: No loading spinner!
```

### 5. Selective Invalidation

```typescript
// ✅ GOOD: Invalidate only what changed
const handleUpdateOrgName = async () => {
  await updateOrganization({ name: 'New Name' });
  
  // Only name changed, tree structure same
  queryClient.invalidateQueries({ 
    queryKey: ['organizations', 'tree'] 
  });
  
  // Stats not affected (don't invalidate)
};

// ✅ GOOD: Invalidate all when structure changed
const handleDeleteOrg = async () => {
  await deleteOrganization(id);
  
  // Org deleted = everything affected
  queryClient.invalidateQueries({ 
    queryKey: ['organizations'] 
  });
};
```

---

## 📊 Cache Strategy Summary

### Organizations

| Data Type | Stale Time | Cache Time | Invalidate On |
|-----------|-----------|------------|---------------|
| **Tree (main)** | 5 min | 30 min | Create/Delete org |
| **Tree (detail)** | 5 min | 30 min | Create/Delete org |
| **Tree (subdetail)** | 5 min | 30 min | Create/Delete org |
| **Stats** | 5 min | 1 hour | Create/Delete org, Add/Remove member |

### Users

| Data Type | Stale Time | Cache Time | Invalidate On |
|-----------|-----------|------------|---------------|
| **List (any page)** | 3 min | 10 min | Create/Update/Delete user |
| **Detail** | 1 min | 5 min | Update user |

---

## 🚨 Common Pitfalls & Solutions

### 1. Cache Not Updating After Mutation

```typescript
// ❌ PROBLEM: Forgot to invalidate
const { mutate } = useUpdateUser();
mutate({ userId, data }); // Cache not updated!

// ✅ SOLUTION: Add invalidation in mutation hook
onSuccess: () => {
  queryClient.invalidateQueries({ queryKey: userKeys.lists() });
}
```

### 2. Stale Data Showing

```typescript
// ❌ PROBLEM: Stale time too long
{
  staleTime: 60 * 60 * 1000, // 1 hour - too long!
}

// ✅ SOLUTION: Adjust stale time based on data frequency
{
  staleTime: 3 * 60 * 1000, // 3 min - reasonable
}
```

### 3. Optimistic Update Race Condition

```typescript
// ❌ PROBLEM: Forgot to cancel ongoing queries
onMutate: (variables) => {
  queryClient.setQueryData(['key'], newData); // Race condition!
}

// ✅ SOLUTION: Always cancel first
onMutate: async (variables) => {
  await queryClient.cancelQueries({ queryKey: ['key'] }); // Cancel first!
  queryClient.setQueryData(['key'], newData);
}
```

### 4. Memory Leak from Unused Caches

```typescript
// ❌ PROBLEM: cacheTime too long
{
  cacheTime: Infinity, // Never garbage collected!
}

// ✅ SOLUTION: Reasonable cache time
{
  cacheTime: 30 * 60 * 1000, // 30 min - will be cleaned up
}
```

---

## 📈 Migration Checklist

### Week 1: Foundation
- [x] Install React Query & DevTools
- [x] Create queryClient config
- [x] Setup QueryClientProvider in main.tsx
- [x] Test DevTools working

### Week 2: Organizations
- [ ] Create useOrganizationQueries.ts
- [ ] Migrate useOrganizationTree to React Query
- [ ] Migrate useOrganizationPage to React Query
- [ ] Test all organization pages (main, detail, subdetail)
- [ ] Test optimistic updates
- [ ] Test cache invalidation

### Week 3: Users
- [ ] Create useUserQueries.ts
- [ ] Migrate useUserList to React Query
- [ ] Test pagination with cache
- [ ] Test filters with cache
- [ ] Test CRUD operations
- [ ] Test optimistic updates

### Week 4: Polish & Documentation
- [ ] Performance benchmarking
- [ ] Fix any edge cases
- [ ] Document cache strategy
- [ ] Train team on React Query
- [ ] Monitor production

---

## 🎯 Expected Results

### Performance
- **90% faster** page revisits (0ms vs 2-3s)
- **80-90% fewer** API calls
- **Instant UX** with optimistic updates
- **Smooth pagination** with placeholderData

### Developer Experience
- **Less boilerplate** (no manual loading/error states)
- **Better debugging** (DevTools)
- **Automatic retries** (no manual retry logic)
- **Type-safe** (full TypeScript support)

### User Experience
- **No loading spinners** on cache hits
- **Instant feedback** on mutations
- **Background updates** (fresh data without blocking UI)
- **Better error handling** (automatic retries)

---

## 📚 Resources

- [React Query Documentation](https://tanstack.com/query/latest/docs/react/overview)
- [React Query DevTools](https://tanstack.com/query/latest/docs/react/devtools)
- [Query Keys Best Practices](https://tkdodo.eu/blog/effective-react-query-keys)
- [Optimistic Updates Guide](https://tanstack.com/query/latest/docs/react/guides/optimistic-updates)

---

**Version:** 1.0  
**Date:** November 3, 2025  
**Status:** 🟢 READY TO IMPLEMENT  
**Priority:** 🔴 HIGH  
**Estimated Time:** 7-10 days  
**Expected ROI:** 🔥 EXCELLENT (90% performance improvement)
