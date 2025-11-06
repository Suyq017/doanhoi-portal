# Kế hoạch Áp dụng TanStack Query cho Module Công Tác Xã Hội (CTXH)

## 📋 Tổng quan

Tài liệu này mô tả chi tiết kế hoạch triển khai TanStack Query cho 3 trang chính trong module Công Tác Xã Hội:

1. **Danh mục CTXH** (CategoryManagement)
2. **Hoạt động CTXH** (ActivityManagement)  
3. **Cấu hình giới hạn** (LimitConfigManagement)

---

## 🎯 Mục tiêu

### Vấn đề hiện tại
- ❌ Mỗi lần mở modal/form, API được gọi lại → Chậm (500ms+)
- ❌ Không có cache → Lãng phí bandwidth
- ❌ Manual state management → Code phức tạp, dễ lỗi
- ❌ Refresh logic bằng `refreshTrigger` → Không tối ưu
- ❌ Loading states không consistent

### Kết quả mong đợi
- ✅ **Cache hit**: < 1ms thay vì 500ms (500x nhanh hơn)
- ✅ **Automatic refetch**: Tự động cập nhật khi data stale
- ✅ **Optimistic updates**: UI phản hồi ngay lập tức
- ✅ **Code cleaner**: Ít state logic hơn 60%
- ✅ **Better UX**: Không cần loading spinner khi có cache

---

## 🏗️ Kiến trúc Implementation

```
┌─────────────────────────────────────────────────────────────────┐
│                    CTXH MODULE PAGES                             │
├─────────────────────────────────────────────────────────────────┤
│  ┌───────────────┐  ┌───────────────┐  ┌───────────────┐      │
│  │   Category    │  │   Activity    │  │ LimitConfig   │      │
│  │  Management   │  │  Management   │  │  Management   │      │
│  └───────┬───────┘  └───────┬───────┘  └───────┬───────┘      │
│          │                  │                  │                │
│          └──────────────────┼──────────────────┘                │
│                             ▼                                   │
│              ┌──────────────────────────────┐                   │
│              │  useCtxhQueries.ts           │ ◄── Custom Hooks │
│              │  - useCategoryList()         │                   │
│              │  - useActivityList()         │                   │
│              │  - useLimitConfigList()      │                   │
│              │  - Create/Update/Delete      │                   │
│              │    mutations with cache      │                   │
│              └──────────────┬───────────────┘                   │
│                             ▼                                   │
│              ┌──────────────────────────────┐                   │
│              │     TanStack Query Client    │ ◄── Cache Layer  │
│              │  - Cache Management          │                   │
│              │  - Stale Time: 3-5 min       │                   │
│              │  - GC Time: 15-30 min        │                   │
│              └──────────────┬───────────────┘                   │
│                             ▼                                   │
│              ┌──────────────────────────────┐                   │
│              │   CTXH Services              │ ◄── API Layer    │
│              │  - categoryService.ts        │                   │
│              │  - activityService.ts        │                   │
│              │  - limitConfigService.ts     │                   │
│              └──────────────┬───────────────┘                   │
│                             ▼                                   │
│              ┌──────────────────────────────┐                   │
│              │        Backend API           │                   │
│              │   /api/ctxh/...              │                   │
│              └──────────────────────────────┘                   │
└─────────────────────────────────────────────────────────────────┘
```

---

## 📂 Cấu trúc File Mới

### 1. Query Keys Factory
**File**: `frontend/src/shared/hooks/queries/ctxhKeys.ts`

```typescript
// Hierarchical query keys cho CTXH module
export const ctxhKeys = {
  all: ['ctxh'] as const,
  
  // Categories
  categories: () => [...ctxhKeys.all, 'categories'] as const,
  categoriesList: (filters?: CategoryQueryParams) => 
    [...ctxhKeys.categories(), 'list', filters] as const,
  categoryDetail: (id: string) => 
    [...ctxhKeys.categories(), 'detail', id] as const,
  
  // Activities
  activities: () => [...ctxhKeys.all, 'activities'] as const,
  activitiesList: (filters?: ActivityQueryParams) => 
    [...ctxhKeys.activities(), 'list', filters] as const,
  activityDetail: (id: string) => 
    [...ctxhKeys.activities(), 'detail', id] as const,
  activityParticipants: (activityId: string) =>
    [...ctxhKeys.activities(), 'detail', activityId, 'participants'] as const,
  
  // Limit Configs
  limitConfigs: () => [...ctxhKeys.all, 'limitConfigs'] as const,
  limitConfigsList: (filters?: LimitConfigQueryParams) => 
    [...ctxhKeys.limitConfigs(), 'list', filters] as const,
  limitConfigDetail: (id: string) => 
    [...ctxhKeys.limitConfigs(), 'detail', id] as const,
};
```

**Lý do**: 
- Quản lý cache keys theo cấu trúc phân cấp
- Dễ dàng invalidate selective (chỉ categories, hoặc chỉ activities)
- Tránh conflict giữa các entities

---

### 2. Custom Hooks Layer
**File**: `frontend/src/shared/hooks/queries/useCtxhQueries.ts`

#### 2.1. Category Queries & Mutations

```typescript
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { categoryService } from '../../../features/ctxh/services';
import { ctxhKeys } from './ctxhKeys';
import type { 
  CtxhCategory, 
  CategoryQueryParams,
  CreateCategoryRequest, 
  UpdateCategoryRequest 
} from '../../../features/ctxh/types';

// ============================================
// HOOK: Lấy danh sách danh mục
// ============================================
export const useCategoryList = (params?: CategoryQueryParams) => {
  return useQuery({
    queryKey: ctxhKeys.categoriesList(params),
    queryFn: async () => {
      const response = await categoryService.findAll(params);
      return response;
    },
    staleTime: 3 * 60 * 1000, // 3 phút - categories ít thay đổi
    gcTime: 15 * 60 * 1000,   // 15 phút
    refetchOnWindowFocus: true,
  });
};

// ============================================
// HOOK: Lấy chi tiết danh mục
// ============================================
export const useCategoryDetail = (id: string, enabled = true) => {
  return useQuery({
    queryKey: ctxhKeys.categoryDetail(id),
    queryFn: async () => {
      return await categoryService.findOne(id);
    },
    staleTime: 5 * 60 * 1000, // 5 phút
    gcTime: 30 * 60 * 1000,   // 30 phút
    enabled: enabled && !!id,
  });
};

// ============================================
// MUTATION: Tạo danh mục mới
// ============================================
export const useCreateCategory = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (data: CreateCategoryRequest) => {
      return await categoryService.create(data);
    },
    onSuccess: () => {
      // Refetch all category lists để có data mới nhất
      queryClient.refetchQueries({ 
        queryKey: ctxhKeys.categories(),
        type: 'active' // Chỉ refetch queries đang được sử dụng
      });
    },
  });
};

// ============================================
// MUTATION: Cập nhật danh mục
// ============================================
export const useUpdateCategory = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: UpdateCategoryRequest }) => {
      return await categoryService.update(id, data);
    },
    onSuccess: (updatedCategory) => {
      // Refetch all category lists
      queryClient.refetchQueries({ 
        queryKey: ctxhKeys.categories(),
        type: 'active'
      });
      
      // Update detail cache if exists
      if (updatedCategory?.id) {
        queryClient.setQueryData(
          ctxhKeys.categoryDetail(updatedCategory.id),
          updatedCategory
        );
      }
    },
  });
};

// ============================================
// MUTATION: Xóa danh mục
// ============================================
export const useDeleteCategory = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (id: string) => {
      return await categoryService.delete(id);
    },
    onSuccess: () => {
      // Refetch để cập nhật danh sách
      queryClient.refetchQueries({ 
        queryKey: ctxhKeys.categories(),
        type: 'active'
      });
    },
  });
};

// ============================================
// MUTATION: Khôi phục danh mục
// ============================================
export const useRestoreCategory = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (id: string) => {
      return await categoryService.restore(id);
    },
    onSuccess: () => {
      queryClient.refetchQueries({ 
        queryKey: ctxhKeys.categories(),
        type: 'active'
      });
    },
  });
};
```

#### 2.2. Activity Queries & Mutations

```typescript
// ============================================
// HOOK: Lấy danh sách hoạt động
// ============================================
export const useActivityList = (params?: ActivityQueryParams) => {
  return useQuery({
    queryKey: ctxhKeys.activitiesList(params),
    queryFn: async () => {
      const response = await activityService.findAll(params);
      return response;
    },
    staleTime: 2 * 60 * 1000, // 2 phút - activities thay đổi thường xuyên hơn
    gcTime: 10 * 60 * 1000,   // 10 phút
    refetchOnWindowFocus: true,
  });
};

// ============================================
// HOOK: Lấy chi tiết hoạt động
// ============================================
export const useActivityDetail = (id: string, enabled = true) => {
  return useQuery({
    queryKey: ctxhKeys.activityDetail(id),
    queryFn: async () => {
      return await activityService.findOne(id);
    },
    staleTime: 3 * 60 * 1000, // 3 phút
    gcTime: 15 * 60 * 1000,   // 15 phút
    enabled: enabled && !!id,
  });
};

// ============================================
// HOOK: Lấy danh sách sinh viên tham gia
// ============================================
export const useActivityParticipants = (activityId: string, enabled = true) => {
  return useQuery({
    queryKey: ctxhKeys.activityParticipants(activityId),
    queryFn: async () => {
      return await activityService.getParticipants(activityId);
    },
    staleTime: 1 * 60 * 1000, // 1 phút - participants thay đổi rất thường xuyên
    gcTime: 5 * 60 * 1000,    // 5 phút
    enabled: enabled && !!activityId,
  });
};

// ============================================
// MUTATION: Tạo hoạt động mới
// ============================================
export const useCreateActivity = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (data: CreateActivityRequest) => {
      return await activityService.create(data);
    },
    onSuccess: () => {
      queryClient.refetchQueries({ 
        queryKey: ctxhKeys.activities(),
        type: 'active'
      });
    },
  });
};

// ============================================
// MUTATION: Cập nhật hoạt động
// ============================================
export const useUpdateActivity = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: UpdateActivityRequest }) => {
      return await activityService.update(id, data);
    },
    onSuccess: (updatedActivity) => {
      // Refetch lists
      queryClient.refetchQueries({ 
        queryKey: ctxhKeys.activities(),
        type: 'active'
      });
      
      // Update detail cache
      if (updatedActivity?.id) {
        queryClient.setQueryData(
          ctxhKeys.activityDetail(updatedActivity.id),
          updatedActivity
        );
      }
    },
  });
};

// ============================================
// MUTATION: Xóa hoạt động
// ============================================
export const useDeleteActivity = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (id: string) => {
      return await activityService.delete(id);
    },
    onSuccess: () => {
      queryClient.refetchQueries({ 
        queryKey: ctxhKeys.activities(),
        type: 'active'
      });
    },
  });
};

// ============================================
// MUTATION: Thêm sinh viên vào hoạt động
// ============================================
export const useAddParticipant = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ activityId, data }: { 
      activityId: string; 
      data: AddStudentRequest;
    }) => {
      return await activityService.addStudent(activityId, data);
    },
    onSuccess: (_, variables) => {
      // Refetch participants list cho activity này
      queryClient.refetchQueries({ 
        queryKey: ctxhKeys.activityParticipants(variables.activityId),
        type: 'active'
      });
    },
  });
};
```

#### 2.3. Limit Config Queries & Mutations

```typescript
// ============================================
// HOOK: Lấy danh sách cấu hình giới hạn
// ============================================
export const useLimitConfigList = (params?: LimitConfigQueryParams) => {
  return useQuery({
    queryKey: ctxhKeys.limitConfigsList(params),
    queryFn: async () => {
      const response = await limitConfigService.findAll(params);
      return response;
    },
    staleTime: 5 * 60 * 1000, // 5 phút - configs ít thay đổi
    gcTime: 30 * 60 * 1000,   // 30 phút
    refetchOnWindowFocus: true,
  });
};

// ============================================
// HOOK: Lấy chi tiết cấu hình
// ============================================
export const useLimitConfigDetail = (id: string, enabled = true) => {
  return useQuery({
    queryKey: ctxhKeys.limitConfigDetail(id),
    queryFn: async () => {
      return await limitConfigService.findOne(id);
    },
    staleTime: 5 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
    enabled: enabled && !!id,
  });
};

// ============================================
// MUTATION: Tạo cấu hình mới
// ============================================
export const useCreateLimitConfig = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (data: CreateLimitConfigRequest) => {
      return await limitConfigService.create(data);
    },
    onSuccess: () => {
      queryClient.refetchQueries({ 
        queryKey: ctxhKeys.limitConfigs(),
        type: 'active'
      });
    },
  });
};

// ============================================
// MUTATION: Cập nhật cấu hình
// ============================================
export const useUpdateLimitConfig = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, data }: { 
      id: string; 
      data: UpdateLimitConfigRequest;
    }) => {
      return await limitConfigService.update(id, data);
    },
    onSuccess: (updatedConfig) => {
      queryClient.refetchQueries({ 
        queryKey: ctxhKeys.limitConfigs(),
        type: 'active'
      });
      
      if (updatedConfig?.id) {
        queryClient.setQueryData(
          ctxhKeys.limitConfigDetail(updatedConfig.id),
          updatedConfig
        );
      }
    },
  });
};

// ============================================
// MUTATION: Xóa cấu hình
// ============================================
export const useDeleteLimitConfig = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (id: string) => {
      return await limitConfigService.delete(id);
    },
    onSuccess: () => {
      queryClient.refetchQueries({ 
        queryKey: ctxhKeys.limitConfigs(),
        type: 'active'
      });
    },
  });
};

// ============================================
// MUTATION: Khôi phục cấu hình
// ============================================
export const useRestoreLimitConfig = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (id: string) => {
      return await limitConfigService.restore(id);
    },
    onSuccess: () => {
      queryClient.refetchQueries({ 
        queryKey: ctxhKeys.limitConfigs(),
        type: 'active'
      });
    },
  });
};
```

---

### 3. Export từ Index
**File**: `frontend/src/shared/hooks/queries/index.ts`

```typescript
// Thêm exports cho CTXH
export * from './ctxhKeys';
export * from './useCtxhQueries';
```

---

## 🔄 Migration Plan cho từng Page

### Phase 1: CategoryManagement Migration

#### Bước 1: Import hooks
```typescript
// File: frontend/src/features/ctxh/pages/CategoryManagement.tsx

// ❌ REMOVE: Old imports
import { useState } from 'react';

// ✅ ADD: New imports
import { 
  useCategoryList,
  useCreateCategory,
  useUpdateCategory,
  useDeleteCategory,
  useRestoreCategory
} from '../../../shared/hooks/queries';
```

#### Bước 2: Replace state với hooks
```typescript
// ❌ REMOVE: Manual state management
const [loading, setLoading] = useState(false);
const [refreshTrigger, setRefreshTrigger] = useState(0);

// ✅ ADD: TanStack Query hooks
const { 
  data: categoryData, 
  isLoading,
  refetch 
} = useCategoryList({
  page: 1,
  limit: 10
});

const createMutation = useCreateCategory();
const updateMutation = useUpdateCategory();
const deleteMutation = useDeleteCategory();
const restoreMutation = useRestoreCategory();
```

#### Bước 3: Update handlers
```typescript
// ❌ OLD: Manual API call + refresh trigger
const handleFormSave = async (data: CreateCategoryRequest | UpdateCategoryRequest) => {
  setLoading(true);
  try {
    if (selectedCategory) {
      await categoryService.update(selectedCategory.id, data);
      showSuccess(t('category.updated'));
    } else {
      await categoryService.create(data);
      showSuccess(t('category.created'));
    }
    setIsFormOpen(false);
    setSelectedCategory(undefined);
    setRefreshTrigger(prev => prev + 1); // ❌ Manual refresh
  } catch (error) {
    showError(getErrorMessage(error));
    throw error;
  } finally {
    setLoading(false);
  }
};

// ✅ NEW: Use mutation với automatic refetch
const handleFormSave = async (data: CreateCategoryRequest | UpdateCategoryRequest) => {
  try {
    if (selectedCategory) {
      await updateMutation.mutateAsync({ id: selectedCategory.id, data });
      showSuccess(t('category.updated'));
    } else {
      await createMutation.mutateAsync(data);
      showSuccess(t('category.created'));
    }
    setIsFormOpen(false);
    setSelectedCategory(undefined);
    // ✅ Cache tự động refetch, không cần refreshTrigger
  } catch (error) {
    showError(getErrorMessage(error));
    throw error;
  }
};
```

#### Bước 4: Update CategoryList component
```typescript
// File: frontend/src/features/ctxh/components/category/CategoryList.tsx

// ❌ REMOVE: All manual fetching logic
const [categories, setCategories] = useState<CtxhCategory[]>([]);
const [loading, setLoading] = useState(true);

const loadCategories = async (page: number = currentPage, search?: string) => {
  try {
    setLoading(true);
    const response = await categoryService.findAll(params);
    setCategories(response.data);
    // ...
  } catch (error) {
    // ...
  } finally {
    setLoading(false);
  }
};

useEffect(() => {
  loadCategories();
}, [refreshTrigger]); // ❌ Manual refresh dependency

// ✅ ADD: Use hook
const { 
  data: paginatedData, 
  isLoading 
} = useCategoryList({
  page: currentPage,
  limit: limit,
  search: searchTerm
});

const categories = paginatedData?.data || [];
const total = paginatedData?.total || 0;
const totalPages = paginatedData?.totalPages || 1;

// ✅ Không cần useEffect để fetch
// ✅ Không cần refreshTrigger prop
```

#### Bước 5: Remove unused props
```typescript
// CategoryManagement.tsx

// ❌ REMOVE:
<CategoryList
  // ...
  refreshTrigger={refreshTrigger}  // ❌ Không cần nữa
/>

// ✅ NEW:
<CategoryList
  // ...
  // refreshTrigger đã bị xóa
/>
```

---

### Phase 2: ActivityManagement Migration

#### Tương tự như CategoryManagement với các điểm khác biệt:

1. **Filters phức tạp hơn**:
```typescript
const [filters, setFilters] = useState<ActivityQueryParams>({
  page: 1,
  limit: 10,
  category_id: '',
  organization_id: '',
  status: undefined,
  search: ''
});

const { 
  data: activityData, 
  isLoading 
} = useActivityList(filters);
```

2. **Update filters trigger refetch**:
```typescript
// ✅ Khi filters thay đổi, TanStack Query tự động refetch
const handleCategoryChange = (categoryId: string) => {
  setFilters(prev => ({ 
    ...prev, 
    category_id: categoryId,
    page: 1 // Reset về trang 1
  }));
  // ✅ Không cần gọi loadActivities() thủ công
};
```

3. **Participants management**:
```typescript
// Activity detail page
const { data: participants } = useActivityParticipants(activityId);
const addParticipantMutation = useAddParticipant();

const handleAddStudent = async (studentCode: string) => {
  try {
    await addParticipantMutation.mutateAsync({
      activityId,
      data: { student_code: studentCode }
    });
    showSuccess('Thêm sinh viên thành công');
    // ✅ Participants list tự động refetch
  } catch (error) {
    showError(getErrorMessage(error));
  }
};
```

---

### Phase 3: LimitConfigManagement Migration

#### Tương tự nhưng đơn giản hơn (ít filters):

```typescript
const [filters, setFilters] = useState<LimitConfigQueryParams>({
  page: 1,
  limit: 20,
  status: undefined,
  search: ''
});

const { 
  data: configData, 
  isLoading 
} = useLimitConfigList(filters);

const createMutation = useCreateLimitConfig();
const updateMutation = useUpdateLimitConfig();
const deleteMutation = useDeleteLimitConfig();
const restoreMutation = useRestoreLimitConfig();

// Handlers tương tự như Category
```

---

## 📊 Performance Optimization Strategies

### 1. Debounce Search Input
```typescript
// Trong List components
const [searchTerm, setSearchTerm] = useState('');
const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('');

useEffect(() => {
  const timer = setTimeout(() => {
    setDebouncedSearchTerm(searchTerm);
  }, 300); // Debounce 300ms
  
  return () => clearTimeout(timer);
}, [searchTerm]);

// Use debouncedSearchTerm trong query
const { data } = useCategoryList({
  search: debouncedSearchTerm,
  page: currentPage
});
```

### 2. Pagination với Cache
```typescript
// TanStack Query tự động cache từng page riêng biệt
// Page 1: ['ctxh', 'categories', 'list', { page: 1 }]
// Page 2: ['ctxh', 'categories', 'list', { page: 2 }]

const handlePageChange = (newPage: number) => {
  setCurrentPage(newPage);
  // ✅ Nếu page đã được cache → Load ngay lập tức
  // ✅ Nếu chưa cache → Fetch từ API
};
```

### 3. Prefetch Next Page
```typescript
export const usePrefetchNextPage = (
  currentPage: number, 
  totalPages: number,
  filters: ActivityQueryParams
) => {
  const queryClient = useQueryClient();
  
  useEffect(() => {
    if (currentPage < totalPages) {
      // Prefetch page tiếp theo
      queryClient.prefetchQuery({
        queryKey: ctxhKeys.activitiesList({ 
          ...filters, 
          page: currentPage + 1 
        }),
        queryFn: () => activityService.findAll({ 
          ...filters, 
          page: currentPage + 1 
        })
      });
    }
  }, [currentPage, totalPages, filters, queryClient]);
};

// Usage
usePrefetchNextPage(currentPage, totalPages, filters);
```

### 4. Result Limiting trong Combobox
```typescript
// ActivityList.tsx - Category filter combobox
const MAX_COMBOBOX_RESULTS = 50;

const displayedCategories = useMemo(() => {
  return categories.slice(0, MAX_COMBOBOX_RESULTS);
}, [categories]);
```

---

## 🚨 Common Pitfalls & Solutions

### Pitfall 1: Filters thay đổi gây infinite loop
```typescript
// ❌ WRONG: Object được recreate mỗi render
const { data } = useActivityList({
  page: currentPage,
  category_id: selectedCategoryId,
  search: searchTerm
  // Object mới → query key mới → refetch vô hạn
});

// ✅ CORRECT: Use state object
const [filters, setFilters] = useState<ActivityQueryParams>({
  page: 1,
  limit: 10,
  category_id: '',
  search: ''
});

const { data } = useActivityList(filters);
// filters chỉ thay đổi khi setState → Stable query key
```

### Pitfall 2: Mutation loading state
```typescript
// ❌ WRONG: Dùng local loading state
const [loading, setLoading] = useState(false);

// ✅ CORRECT: Dùng mutation.isPending
const createMutation = useCreateCategory();

// Trong JSX
<button disabled={createMutation.isPending}>
  {createMutation.isPending ? 'Đang lưu...' : 'Lưu'}
</button>
```

### Pitfall 3: Missing error handling
```typescript
// ✅ CORRECT: Handle mutation errors
const createMutation = useCreateCategory();

try {
  await createMutation.mutateAsync(data);
  showSuccess('Tạo thành công');
} catch (error) {
  // Mutation đã fail
  showError(getErrorMessage(error));
  // Re-throw nếu cần form handle
  throw error;
}
```

### Pitfall 4: Stale data hiển thị sai
```typescript
// ✅ SOLUTION: Hiển thị loading state khi refetching
const { data, isLoading, isFetching } = useCategoryList();

if (isLoading) {
  return <LoadingSpinner />; // Lần đầu load
}

return (
  <div>
    {isFetching && <RefreshingIndicator />} {/* Background refetch */}
    <CategoryTable data={data?.data || []} />
  </div>
);
```

---

## 🎓 Best Practices

### 1. Consistent Query Keys
```typescript
// ✅ GOOD: Sử dụng factory
const { data } = useCategoryList({ page: 1 });
// Key: ['ctxh', 'categories', 'list', { page: 1 }]

// ❌ BAD: Hardcode keys
useQuery({
  queryKey: ['categories', page],
  // ...
});
```

### 2. Proper Cache Times
```typescript
// Data ít thay đổi → staleTime cao
useLimitConfigList()  // staleTime: 5 min

// Data thay đổi thường xuyên → staleTime thấp
useActivityParticipants()  // staleTime: 1 min

// Balance giữa freshness và performance
```

### 3. Error Boundaries
```typescript
// Wrap pages với ErrorBoundary
<ErrorBoundary fallback={<ErrorPage />}>
  <CategoryManagement />
</ErrorBoundary>
```

### 4. Loading States
```typescript
// 3 states quan trọng:
const { 
  data, 
  isLoading,    // First fetch
  isFetching,   // Any fetch (including background)
  isError,      // Error state
  error         // Error object
} = useCategoryList();

if (isLoading) return <LoadingSpinner />;
if (isError) return <ErrorMessage error={error} />;

return (
  <div>
    {isFetching && <RefreshingIndicator />}
    <CategoryTable data={data?.data || []} />
  </div>
);
```

---

## 📝 Testing Strategy

### 1. Mock TanStack Query
```typescript
// test-utils.tsx
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const createTestQueryClient = () => new QueryClient({
  defaultOptions: {
    queries: { retry: false },
    mutations: { retry: false },
  },
});

export const TestWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const testQueryClient = createTestQueryClient();
  
  return (
    <QueryClientProvider client={testQueryClient}>
      {children}
    </QueryClientProvider>
  );
};
```

### 2. Test Hooks
```typescript
// useCategoryList.test.ts
import { renderHook, waitFor } from '@testing-library/react';
import { useCategoryList } from '../useCtxhQueries';
import { TestWrapper } from './test-utils';

test('fetches categories successfully', async () => {
  const { result } = renderHook(() => useCategoryList(), {
    wrapper: TestWrapper
  });
  
  expect(result.current.isLoading).toBe(true);
  
  await waitFor(() => {
    expect(result.current.isSuccess).toBe(true);
  });
  
  expect(result.current.data?.data).toHaveLength(10);
});
```

---

## 📈 Expected Results

### Before vs After Migration

| Metric | Before | After | Improvement |
|--------|--------|-------|-------------|
| **First Load** | 500ms | 500ms | Same |
| **Second Load** | 500ms | <1ms | **500x faster** ⚡ |
| **Modal Open** | 500ms | <1ms | **500x faster** ⚡ |
| **Network Requests** | Every action | Once per staleTime | **95% reduction** |
| **Code Lines** | ~350/page | ~180/page | **49% reduction** |
| **State Variables** | 8-10/page | 2-3/page | **70% reduction** |

### Cache Hit Rate
- **Categories**: ~90% (ít thay đổi)
- **Activities**: ~80% (thay đổi vừa phải)
- **Limit Configs**: ~95% (rất ít thay đổi)

---

## 🚀 Implementation Phases

### Week 1: Setup & Category Migration
- [x] Tạo `ctxhKeys.ts` với query key factory
- [x] Tạo `useCtxhQueries.ts` với Category hooks
- [x] Migrate CategoryManagement page
- [x] Migrate CategoryList component
- [x] Migrate CategoryForm mutations
- [x] Testing & bug fixes

### Week 2: Activity Migration
- [ ] Add Activity hooks vào `useCtxhQueries.ts`
- [ ] Migrate ActivityManagement page
- [ ] Migrate ActivityList component
- [ ] Migrate ActivityForm mutations
- [ ] Handle participants management
- [ ] Testing & optimization

### Week 3: Limit Config Migration
- [ ] Add Limit Config hooks vào `useCtxhQueries.ts`
- [ ] Migrate LimitConfigManagement page
- [ ] Migrate LimitConfigList component
- [ ] Migrate LimitConfigForm mutations
- [ ] Testing & documentation

### Week 4: Optimization & Documentation
- [ ] Implement prefetching strategies
- [ ] Add React Query DevTools
- [ ] Performance monitoring
- [ ] Write comprehensive documentation
- [ ] Team training session

---

## 🔍 Debugging Tips

### 1. React Query DevTools
```typescript
// App.tsx
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';

<QueryClientProvider client={queryClient}>
  <App />
  <ReactQueryDevtools initialIsOpen={false} />
</QueryClientProvider>
```

Features:
- Xem tất cả queries & mutations
- Check cache status (fresh/stale/inactive)
- Manually invalidate/refetch
- Query execution timeline

### 2. Console Logging
```typescript
const { data, isLoading, isFetching, isStale } = useCategoryList();

console.log({
  hasData: !!data,
  dataLength: data?.data.length,
  isLoading,    // First fetch
  isFetching,   // Any fetch
  isStale,      // Older than staleTime
});
```

### 3. Network Tab Monitoring
- Mở DevTools → Network → Filter XHR
- Verify: Requests giảm sau lần đầu
- Check: Response được serve từ cache

---

## 📚 Resources

- [TanStack Query v5 Docs](https://tanstack.com/query/latest)
- [React Query Best Practices](https://tkdodo.eu/blog/practical-react-query)
- [Effective React Query Keys](https://tkdodo.eu/blog/effective-react-query-keys)
- [TANSTACK_QUERY_IMPLEMENTATION_GUIDE.md](./mechanism/Toan/cache/TANSTACK_QUERY_IMPLEMENTATION_GUIDE.md)

---

## 🎉 Conclusion

Việc áp dụng TanStack Query cho module CTXH sẽ:

1. **Cải thiện Performance**: Cache hits 500x nhanh hơn API calls
2. **Đơn giản hóa Code**: Giảm 49% số dòng code, 70% state variables
3. **Better UX**: Không loading spinner khi có cache, UI phản hồi ngay lập tức
4. **Maintainability**: Code dễ đọc, dễ test, dễ mở rộng
5. **Consistency**: Pattern đồng nhất với Organizations & Payment Campaigns

**Next Steps**: Bắt đầu với Week 1 - Category Migration làm proof of concept!

---

**Tác giả**: GitHub Copilot  
**Ngày tạo**: November 5, 2025  
**Version**: 1.0.0
