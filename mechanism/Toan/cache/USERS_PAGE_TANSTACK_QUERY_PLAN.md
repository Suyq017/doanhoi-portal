# 📋 Kế Hoạch Áp Dụng TanStack Query Cache cho Trang Quản Lý Người Dùng

## 🎯 Tổng Quan

### Mục tiêu
Áp dụng TanStack Query để cache data cho **Users Page** với đặc điểm:
- ✅ Pagination (10 users/page)
- ✅ Multiple filters (search, userType, membershipStatus)
- ✅ CRUD operations (Create, Update, Delete, Bulk Delete)
- ✅ Import/Export functionality
- ✅ Role assignment
- ✅ Organization membership

### Lợi ích mong đợi
- ⚡ **Load tức thì** khi quay lại page (0ms vs 300-500ms)
- 🔄 **Background refetch** tự động (data luôn fresh)
- 💾 **Giảm 90%** API calls (mỗi page+filter combination được cache)
- 🎯 **Smart invalidation** (chỉ refetch page bị ảnh hưởng)
- 🚀 **Optimistic updates** (UI phản hồi ngay lập tức)
- 📄 **Pagination cache** (giữ data của nhiều pages cùng lúc)

---

## 📊 Phân Tích Hiện Trạng

### 1. Data Flow Hiện Tại

```
UsersPage.tsx
  ↓
useUserList (shared/hooks)
  ↓
├─ useState: users, total, loading, error
├─ useState: currentPage, searchTerm, filterType, filterStatus
├─ useEffect: Load users khi page/filters thay đổi
└─ Manual refresh sau CRUD operations
  ↓
userService.getUsers(params)
  ↓
GET /users?page={page}&limit={limit}&search={search}&userType={type}&membershipStatus={status}
```

### 2. Các Vấn Đề Hiện Tại

#### ❌ Problem 1: Không cache data theo page
```typescript
// User: Page 1 → Page 2 → Back to Page 1
// Kết quả: Fetch lại page 1 (đã fetch trước đó)
// Lý do: Không có cache mechanism
```

#### ❌ Problem 2: Không cache theo filter combination
```typescript
// User: search="nguyen" + type="student" → Xóa filter → Apply lại
// Kết quả: Fetch lại cùng data
// Lý do: Mỗi lần thay đổi filter đều reset state
```

#### ❌ Problem 3: Refresh toàn bộ list sau CRUD
```typescript
// User: Delete 1 user ở page 3
// Kết quả: Refetch toàn bộ list (pages 1, 2, 3 nếu đã visit)
// Lý do: refreshUsers() không biết page nào bị ảnh hưởng
```

#### ❌ Problem 4: Không optimistic updates
```typescript
// User: Click delete
// Kết quả: Đợi API response (300-500ms) → UI update
// UX: Chậm, không smooth
```

#### ❌ Problem 5: Lost state khi navigate
```typescript
// User: UsersPage (page 2, search="nguyen") → Navigate away → Back
// Kết quả: Reset về page 1, mất search term
// Lý do: State không được persist
```

---

## 🏗️ Kiến Trúc Mới với TanStack Query

### 1. Cache Keys Strategy

```typescript
export const userKeys = {
  // Base key cho tất cả user-related queries
  all: ['users'] as const,
  
  // Lists - Hierarchical structure
  lists: () => [...userKeys.all, 'list'] as const,
  list: (filters: UserQueryParams) => [...userKeys.lists(), filters] as const,
  
  // Details
  details: () => [...userKeys.all, 'detail'] as const,
  detail: (userId: string) => [...userKeys.details(), userId] as const,
  
  // Stats (nếu có)
  stats: () => [...userKeys.all, 'stats'] as const,
};

// Example cache keys sẽ được tạo:
// ['users', 'list', { page: 1, limit: 10, search: '', userType: 'all', membershipStatus: 'all' }]
// ['users', 'list', { page: 2, limit: 10, search: '', userType: 'all', membershipStatus: 'all' }]
// ['users', 'list', { page: 1, limit: 10, search: 'nguyen', userType: 'student', membershipStatus: 'active' }]
// ['users', 'detail', 'user-123']
```

**Lợi ích của cache key strategy này:**
- ✅ Mỗi page + filter combination = 1 cache entry riêng
- ✅ Navigate qua lại giữa các pages → Instant load
- ✅ Thay đổi filter → Cache hit nếu đã fetch combo đó
- ✅ Có thể invalidate selective (chỉ page bị ảnh hưởng)

---

### 2. Cache Configuration

```typescript
const USER_CACHE_CONFIG = {
  // List queries
  list: {
    staleTime: 2 * 60 * 1000,      // 2 minutes (data thay đổi thường xuyên)
    cacheTime: 10 * 60 * 1000,     // 10 minutes (giữ nhiều pages trong cache)
    refetchOnWindowFocus: true,     // Auto-refresh khi user quay lại tab
    refetchOnMount: false,          // Dùng cache nếu còn fresh
    keepPreviousData: true,         // QUAN TRỌNG: Smooth pagination
  },
  
  // Detail queries
  detail: {
    staleTime: 5 * 60 * 1000,      // 5 minutes
    cacheTime: 10 * 60 * 1000,     // 10 minutes
    refetchOnWindowFocus: true,
    refetchOnMount: false,
  },
};
```

**Giải thích:**
- **staleTime**: 2 phút → Data được coi là "fresh" trong 2 phút
- **cacheTime**: 10 phút → Giữ cache của nhiều pages (pages 1-5 cùng lúc)
- **keepPreviousData**: **CỰC KỲ QUAN TRỌNG** - Hiển thị data page cũ trong khi fetch page mới → Không có loading spinner khi chuyển page!

---

## 📝 Implementation Plan

### Phase 1: Setup Infrastructure (30 phút)

#### File 1: Create Query Hooks
**Path:** `frontend/src/shared/hooks/queries/useUserQueries.ts`

```typescript
import { useQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query';
import { userService } from '../../services/userService';
import { User, UserQueryParams, CreateUserRequest, UpdateUserRequest, UsersResponse } from '../../types/user';

/**
 * ========================
 * CACHE KEYS
 * ========================
 */
export const userKeys = {
  all: ['users'] as const,
  lists: () => [...userKeys.all, 'list'] as const,
  list: (filters: UserQueryParams) => [...userKeys.lists(), filters] as const,
  details: () => [...userKeys.all, 'detail'] as const,
  detail: (userId: string) => [...userKeys.details(), userId] as const,
};

/**
 * ========================
 * CACHE CONFIGURATION
 * ========================
 */
const USER_CACHE_CONFIG = {
  list: {
    staleTime: 2 * 60 * 1000,      // 2 minutes
    cacheTime: 10 * 60 * 1000,     // 10 minutes
    refetchOnWindowFocus: true,
    refetchOnMount: false,
  },
  detail: {
    staleTime: 5 * 60 * 1000,      // 5 minutes
    cacheTime: 10 * 60 * 1000,     // 10 minutes
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
 * Hook to fetch paginated user list with filters
 * 
 * Features:
 * - Automatic caching per page + filter combination
 * - keepPreviousData for smooth pagination (no loading spinner)
 * - Background refetch when data becomes stale
 * 
 * Usage:
 * const { data, isLoading, isFetching } = useUserListQuery({
 *   page: 1,
 *   limit: 10,
 *   search: 'nguyen',
 *   userType: 'student'
 * });
 */
export const useUserListQuery = (params: UserQueryParams = {}) => {
  return useQuery({
    queryKey: userKeys.list(params),
    queryFn: async () => {
      const response = await userService.getUsers(params);
      return response;
    },
    ...USER_CACHE_CONFIG.list,
    placeholderData: keepPreviousData, // CRITICAL: Smooth pagination
  });
};

/**
 * Hook to fetch single user detail
 * 
 * Features:
 * - Separate cache from list
 * - Longer stale time (user detail ít thay đổi)
 * 
 * Usage:
 * const { data: user, isLoading } = useUserDetailQuery(userId);
 */
export const useUserDetailQuery = (userId: string, options?: { enabled?: boolean }) => {
  return useQuery({
    queryKey: userKeys.detail(userId),
    queryFn: async () => {
      const user = await userService.getUserById(userId);
      return user;
    },
    ...USER_CACHE_CONFIG.detail,
    enabled: options?.enabled ?? !!userId,
  });
};

/**
 * ========================
 * MUTATION HOOKS
 * ========================
 */

/**
 * Hook to create new user
 * 
 * Features:
 * - Invalidate all list queries (user có thể xuất hiện ở nhiều pages)
 * - Refetch current page to show new user
 * 
 * Usage:
 * const { mutate: createUser, isPending } = useCreateUserMutation();
 * createUser(userData, {
 *   onSuccess: () => toast.success('Created!'),
 *   onError: (error) => toast.error(error.message)
 * });
 */
export const useCreateUserMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (userData: CreateUserRequest) => 
      userService.createUser(userData),
    
    onSuccess: () => {
      // Invalidate all list queries
      // Lý do: User mới có thể xuất hiện ở bất kỳ page nào (search, filter)
      queryClient.invalidateQueries({ 
        queryKey: userKeys.lists() 
      });
    },
    
    onError: (error) => {
      console.error('Failed to create user:', error);
    },
  });
};

/**
 * Hook to update user
 * 
 * Features:
 * - Optimistic update: Update cache immediately
 * - Rollback if API fails
 * - Invalidate affected list queries
 * 
 * Usage:
 * const { mutate: updateUser } = useUpdateUserMutation();
 * updateUser({ id: 'user-123', data: { name: 'New Name' } });
 */
export const useUpdateUserMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateUserRequest }) => 
      userService.updateUser(id, data),
    
    // Optimistic update
    onMutate: async ({ id, data }) => {
      // Cancel outgoing refetches (tránh overwrite optimistic update)
      await queryClient.cancelQueries({ 
        queryKey: userKeys.detail(id) 
      });

      // Snapshot previous value (để rollback nếu fail)
      const previousUser = queryClient.getQueryData(userKeys.detail(id));

      // Optimistically update detail cache
      queryClient.setQueryData(
        userKeys.detail(id),
        (old: User | undefined) => {
          if (!old) return old;
          return { ...old, ...data };
        }
      );

      // Optimistically update in list caches
      queryClient.setQueriesData(
        { queryKey: userKeys.lists() },
        (old: UsersResponse | undefined) => {
          if (!old) return old;
          return {
            ...old,
            users: old.users.map(user => 
              user.id === id ? { ...user, ...data } : user
            )
          };
        }
      );

      return { previousUser };
    },

    onError: (_err, { id }, context) => {
      // Rollback on error
      if (context?.previousUser) {
        queryClient.setQueryData(
          userKeys.detail(id),
          context.previousUser
        );
      }
      console.error('Failed to update user:', _err);
    },

    onSettled: (_data, _error, { id }) => {
      // Always refetch to sync với server
      queryClient.invalidateQueries({ 
        queryKey: userKeys.detail(id) 
      });
      queryClient.invalidateQueries({ 
        queryKey: userKeys.lists() 
      });
    },
  });
};

/**
 * Hook to delete user
 * 
 * Features:
 * - Optimistic update: Remove from cache immediately
 * - Rollback if API fails
 * - Smart invalidation: Only refetch affected pages
 * 
 * Usage:
 * const { mutate: deleteUser } = useDeleteUserMutation();
 * deleteUser('user-123');
 */
export const useDeleteUserMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (userId: string) => userService.deleteUser(userId),
    
    // Optimistic update
    onMutate: async (userId) => {
      // Cancel outgoing queries
      await queryClient.cancelQueries({ 
        queryKey: userKeys.lists() 
      });

      // Snapshot previous lists
      const previousLists = queryClient.getQueriesData({ 
        queryKey: userKeys.lists() 
      });

      // Optimistically remove from all list caches
      queryClient.setQueriesData(
        { queryKey: userKeys.lists() },
        (old: UsersResponse | undefined) => {
          if (!old) return old;
          return {
            ...old,
            users: old.users.filter(user => user.id !== userId),
            total: old.total - 1,
          };
        }
      );

      return { previousLists };
    },

    onError: (_err, _userId, context) => {
      // Rollback on error
      if (context?.previousLists) {
        context.previousLists.forEach(([queryKey, data]) => {
          queryClient.setQueryData(queryKey, data);
        });
      }
      console.error('Failed to delete user:', _err);
    },

    onSettled: () => {
      // Refetch all lists to sync with server
      queryClient.invalidateQueries({ 
        queryKey: userKeys.lists() 
      });
    },
  });
};

/**
 * Hook to bulk delete users
 * 
 * Features:
 * - Remove multiple users from cache
 * - Refetch all affected pages
 * 
 * Usage:
 * const { mutate: bulkDelete } = useBulkDeleteUsersMutation();
 * bulkDelete(['user-1', 'user-2', 'user-3']);
 */
export const useBulkDeleteUsersMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (userIds: string[]) => userService.deleteUsers(userIds),
    
    onMutate: async (userIds) => {
      await queryClient.cancelQueries({ 
        queryKey: userKeys.lists() 
      });

      const previousLists = queryClient.getQueriesData({ 
        queryKey: userKeys.lists() 
      });

      // Remove all selected users from caches
      queryClient.setQueriesData(
        { queryKey: userKeys.lists() },
        (old: UsersResponse | undefined) => {
          if (!old) return old;
          return {
            ...old,
            users: old.users.filter(user => !userIds.includes(user.id)),
            total: old.total - userIds.length,
          };
        }
      );

      return { previousLists };
    },

    onError: (_err, _userIds, context) => {
      if (context?.previousLists) {
        context.previousLists.forEach(([queryKey, data]) => {
          queryClient.setQueryData(queryKey, data);
        });
      }
      console.error('Failed to bulk delete users:', _err);
    },

    onSettled: () => {
      queryClient.invalidateQueries({ 
        queryKey: userKeys.lists() 
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
 * Hook to manually invalidate user caches
 * 
 * Usage:
 * const { invalidateAll, invalidateLists } = useInvalidateUsers();
 * 
 * // After import users
 * invalidateLists();
 * 
 * // After role assignment (có thể ảnh hưởng tất cả)
 * invalidateAll();
 */
export const useInvalidateUsers = () => {
  const queryClient = useQueryClient();

  return {
    // Invalidate all user-related queries
    invalidateAll: () => {
      queryClient.invalidateQueries({ 
        queryKey: userKeys.all 
      });
    },

    // Invalidate only list queries
    invalidateLists: () => {
      queryClient.invalidateQueries({ 
        queryKey: userKeys.lists() 
      });
    },

    // Invalidate specific user detail
    invalidateDetail: (userId: string) => {
      queryClient.invalidateQueries({ 
        queryKey: userKeys.detail(userId) 
      });
    },

    // Force refetch (bypass cache)
    refetchLists: () => {
      queryClient.refetchQueries({ 
        queryKey: userKeys.lists() 
      });
    },
  };
};

/**
 * Hook to prefetch next page (optional optimization)
 * 
 * Usage:
 * const { prefetchNextPage } = usePrefetchUsers();
 * 
 * // When user is on page 2, prefetch page 3
 * prefetchNextPage({ page: 3, limit: 10 });
 */
export const usePrefetchUsers = () => {
  const queryClient = useQueryClient();

  return {
    prefetchNextPage: (params: UserQueryParams) => {
      queryClient.prefetchQuery({
        queryKey: userKeys.list(params),
        queryFn: () => userService.getUsers(params),
        staleTime: USER_CACHE_CONFIG.list.staleTime,
      });
    },
  };
};
```

---

### Phase 2: Migrate useUserList Hook (45 phút)

#### File: `frontend/src/shared/hooks/useUserList.ts`

**Chiến lược:**
- ✅ Giữ nguyên interface (UseUserListReturn)
- ✅ Thay thế implementation bên trong
- ✅ Component không cần thay đổi code

```typescript
import { useState, useEffect, useCallback, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { UserQueryParams, CreateUserRequest, UpdateUserRequest } from '../types/user';
import { User } from '../types/user';
import {
  useUserListQuery,
  useCreateUserMutation,
  useUpdateUserMutation,
  useDeleteUserMutation,
  useInvalidateUsers,
} from './queries/useUserQueries';

export interface UseUserListOptions {
  initialLimit?: number;
  organizationId?: string;
  autoLoad?: boolean; // Deprecated (React Query handles this)
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

  // Local state for filters (không cache, chỉ là UI state)
  const [currentPage, setCurrentPage] = useState(1);
  const [limit] = useState(initialLimit);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');

  // Build query params from filters
  const queryParams = useMemo<UserQueryParams>(() => ({
    page: currentPage,
    limit: limit,
    ...(searchTerm && { search: searchTerm }),
    ...(filterType !== 'all' && { userType: filterType as 'student' | 'staff' }),
    ...(filterStatus !== 'all' && { membershipStatus: filterStatus as any }),
    ...(organizationId && { organizationId }),
  }), [currentPage, limit, searchTerm, filterType, filterStatus, organizationId]);

  // ===================================
  // REACT QUERY: Replace manual state management
  // ===================================
  const {
    data: queryData,
    isLoading,
    isFetching,
    error: queryError,
    refetch,
  } = useUserListQuery(queryParams);

  const createMutation = useCreateUserMutation();
  const updateMutation = useUpdateUserMutation();
  const deleteMutation = useDeleteUserMutation();
  const { invalidateLists } = useInvalidateUsers();

  // Extract data from React Query response
  const users = queryData?.users ?? [];
  const total = queryData?.total ?? 0;
  const totalPages = Math.ceil(total / limit);

  // Convert React Query states to old interface
  const loading = isLoading;
  const error = queryError ? (queryError as Error).message : null;

  // CRUD operations - Wrap mutations to match old interface
  const createUser = useCallback(async (userData: CreateUserRequest) => {
    return new Promise<void>((resolve, reject) => {
      createMutation.mutate(userData, {
        onSuccess: () => resolve(),
        onError: (error) => reject(error),
      });
    });
  }, [createMutation]);

  const updateUser = useCallback(async (userId: string, userData: UpdateUserRequest) => {
    return new Promise<void>((resolve, reject) => {
      updateMutation.mutate({ id: userId, data: userData }, {
        onSuccess: () => resolve(),
        onError: (error) => reject(error),
      });
    });
  }, [updateMutation]);

  const deleteUser = useCallback(async (userId: string) => {
    return new Promise<void>((resolve, reject) => {
      deleteMutation.mutate(userId, {
        onSuccess: () => resolve(),
        onError: (error) => reject(error),
      });
    });
  }, [deleteMutation]);

  // Manual refresh - Trigger refetch
  const loadUsers = useCallback(async () => {
    await refetch();
  }, [refetch]);

  const refreshUsers = useCallback(async () => {
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
    isCreating: createMutation.isPending,
    isUpdating: updateMutation.isPending,
    isDeleting: deleteMutation.isPending,
  };
};
```

**Những thay đổi chính:**
1. ✅ Thay `useState` bằng `useUserListQuery`
2. ✅ Thay manual `useEffect` fetch bằng automatic React Query
3. ✅ Wrap mutations để match interface cũ
4. ✅ Component không cần sửa code!

---

### Phase 3: Update useUserManagement (30 phút)

#### File: `frontend/src/shared/hooks/useUserManagement.ts`

**Mục tiêu:** Thêm optimistic updates cho modals

```typescript
import { useState, useCallback } from 'react';
import { User } from '../types/user';
import { CreateUserRequest } from '../types/user';
import {
  useCreateUserMutation,
  useUpdateUserMutation,
  useDeleteUserMutation,
} from './queries/useUserQueries';

// ... (giữ nguyên interface)

export const useUserManagement = (options: UseUserManagementOptions) => {
  const { showSuccess, showError, onRefreshData } = options;

  // Use React Query mutations instead of custom service calls
  const createMutation = useCreateUserMutation();
  const updateMutation = useUpdateUserMutation();
  const deleteMutation = useDeleteUserMutation();

  // ... (modal states giữ nguyên)

  const handleCreateUser = useCallback(async (userData: CreateUserRequest) => {
    createMutation.mutate(userData, {
      onSuccess: () => {
        showSuccess(t('users:messages.createSuccess'));
        closeModal();
        onRefreshData?.();
      },
      onError: (error: any) => {
        showError(error.response?.data?.message || t('users:messages.createError'));
      }
    });
  }, [createMutation, showSuccess, showError, closeModal, onRefreshData, t]);

  // Similar updates for handleUpdateUser, confirmDeleteUser...

  return {
    // ... (trả về như cũ)
    isCreating: createMutation.isPending,
    isUpdating: updateMutation.isPending,
    isDeleting: deleteMutation.isPending,
  };
};
```

---

### Phase 4: Testing & Optimization (1 giờ)

#### 4.1 Testing Checklist

**Pagination Cache**
- [ ] Load page 1 → Load page 2 → Back to page 1 (should be instant)
- [ ] Check Network tab: No API call when back to page 1
- [ ] Verify: isFetching = false (using cache)

**Filter Cache**
- [ ] Apply filter: search="nguyen" (fetch)
- [ ] Clear filter (fetch)
- [ ] Apply same filter again: search="nguyen" (cache hit!)

**Smooth Pagination (keepPreviousData)**
- [ ] On page 2, click page 3
- [ ] Should see: Page 2 data → Smooth transition → Page 3 data
- [ ] Should NOT see: Loading spinner

**Optimistic Updates**
- [ ] Delete user → UI updates immediately (before API response)
- [ ] Check: User removed from list instantly
- [ ] If error: User reappears (rollback)

**Background Refetch**
- [ ] Stay on page for 2+ minutes
- [ ] Data becomes stale → Background refetch (no loading spinner)
- [ ] UI updates with fresh data

**Create User**
- [ ] Create new user
- [ ] Check: All cached pages invalidated
- [ ] Navigate to page where user should appear → See new user

#### 4.2 React Query DevTools

```typescript
// Mở DevTools (bottom-right)
// Kiểm tra:
// 1. Cache keys: ['users', 'list', {...filters}]
// 2. Multiple pages cached simultaneously
// 3. Status: fresh (green) → stale (yellow) → inactive (gray)
// 4. Background refetch behavior
```

---

## 📊 Expected Performance Improvements

| Metric | Before (Manual State) | After (React Query) | Improvement |
|--------|----------------------|---------------------|-------------|
| **First page load** | 300-500ms | 300-500ms | Same |
| **Revisit page 1** | 300-500ms | **< 1ms** | **500x faster** ⚡ |
| **Navigate pages** | 300ms each | **< 1ms** (cache) | **300x faster** |
| **Filter cache hit** | 300ms | **< 1ms** | **300x faster** |
| **Delete (optimistic)** | 300ms (wait API) | **0ms** (instant) | **∞ faster** 🚀 |
| **Page transition** | Loading spinner | Smooth (keepPreviousData) | **Perfect UX** |
| **API calls (10 pages)** | 10 requests | 1 request + 9 cache | **-90%** |

---

## 🎓 Key Learnings

### 1. keepPreviousData là Game Changer

```typescript
// Without keepPreviousData:
// User clicks page 2 → Loading spinner → Show page 2

// With keepPreviousData:
// User clicks page 2 → Show page 1 (placeholder) → Smooth fade to page 2
// Result: NO LOADING SPINNER! 🎉
```

### 2. Cache Keys Phải Include Tất Cả Params

```typescript
// ❌ BAD: Thiếu filters
['users', 'list', { page: 1 }]

// ✅ GOOD: Full params
['users', 'list', { page: 1, limit: 10, search: 'nguyen', userType: 'student' }]

// Lý do: 
// - Search "nguyen" page 1 và search "" page 1 là 2 datasets khác nhau
// - Phải có 2 cache entries riêng
```

### 3. Optimistic Updates = Instant UX

```typescript
// User delete → Instant UI update → API call background
// Nếu API fail → Rollback → Show error
// User không phải đợi → Smooth experience
```

### 4. Smart Invalidation

```typescript
// Create user → Invalidate ALL lists (user có thể ở bất kỳ đâu)
queryClient.invalidateQueries({ queryKey: userKeys.lists() });

// Update user detail → Invalidate detail + lists
queryClient.invalidateQueries({ queryKey: userKeys.detail(id) });
queryClient.invalidateQueries({ queryKey: userKeys.lists() });

// Delete user → Optimistic remove + invalidate
```

---

## 🚀 Rollout Plan

### Week 1: Implementation
- **Day 1-2**: Create useUserQueries.ts (2 hours)
- **Day 3**: Migrate useUserList.ts (1 hour)
- **Day 4**: Update useUserManagement.ts (1 hour)
- **Day 5**: Testing & bug fixes (2 hours)

### Week 2: Monitoring & Optimization
- **Day 1**: Monitor cache hit rate (React Query DevTools)
- **Day 2**: A/B test performance (before/after metrics)
- **Day 3**: Optimize staleTime/cacheTime based on usage
- **Day 4**: Add prefetching for next page (optional)
- **Day 5**: Document & knowledge sharing

---

## 🎯 Success Criteria

### Performance Metrics
- ✅ Cache hit rate: > 80% (10 navigation actions → 8 cache hits)
- ✅ Average page load: < 50ms (from cache)
- ✅ API calls reduction: > 85%
- ✅ Delete operation: < 50ms (optimistic)

### User Experience
- ✅ No loading spinners when navigating cached pages
- ✅ Smooth pagination transitions (keepPreviousData)
- ✅ Instant delete feedback (optimistic updates)
- ✅ Auto-refresh stale data in background

### Code Quality
- ✅ Type-safe cache keys
- ✅ Proper error handling with rollback
- ✅ Clean separation: UI state vs Server state
- ✅ No breaking changes to components

---

## 📚 References

1. **TanStack Query Docs**: https://tanstack.com/query/latest
2. **Pagination Guide**: https://tanstack.com/query/latest/docs/react/guides/paginated-queries
3. **Optimistic Updates**: https://tanstack.com/query/latest/docs/react/guides/optimistic-updates
4. **Internal Docs**: 
   - `TANSTACK_QUERY_IMPLEMENTATION_GUIDE.md`
   - `REACT_QUERY_CACHE_IMPLEMENTATION_PLAN.md`

---

## ✅ Checklist Summary

### Setup
- [ ] Install @tanstack/react-query
- [ ] Setup QueryClient in main.tsx
- [ ] Install React Query DevTools

### Implementation
- [ ] Create useUserQueries.ts (query hooks)
- [ ] Migrate useUserList.ts (use React Query)
- [ ] Update useUserManagement.ts (optimistic updates)
- [ ] Test pagination cache
- [ ] Test filter combinations
- [ ] Test optimistic updates
- [ ] Test background refetch

### Verification
- [ ] Cache hit rate > 80%
- [ ] No loading spinners on cached pages
- [ ] Smooth pagination (keepPreviousData)
- [ ] Instant delete (optimistic)
- [ ] API calls reduced by 85%+

---

## 🎉 Conclusion

Việc áp dụng TanStack Query cho Users Page sẽ mang lại:

1. **Performance**: 300-500x faster với cache hits
2. **UX**: Smooth pagination, instant updates, no loading spinners
3. **DX**: Cleaner code, automatic cache management
4. **Maintainability**: Easier to debug với DevTools
5. **Scalability**: Ready cho thêm features (prefetch, infinite scroll)

**Total effort**: ~6-8 hours
**Expected ROI**: Massive performance boost + Better UX

Let's implement it! 🚀
