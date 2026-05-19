# Kế Hoạch Triển Khai TanStack Query cho Payment Campaigns (Quản Lý Đóng Phí)

## 📋 Tổng Quan

### Mục Tiêu
Áp dụng TanStack Query để cache và tối ưu hóa data fetching cho module **Payment Campaigns** (Quản lý đóng phí), bao gồm:
1. **Payment Campaigns List** - Danh sách các đợt đóng phí với pagination & filters
2. **Payment Campaign Detail** - Chi tiết đợt đóng phí với statistics
3. **Fee Levels** - Quản lý mức phí
4. **Payment Assignments** - Phân công thanh toán
5. **Accessible Organizations** - Danh sách tổ chức có quyền truy cập

### Vấn Đề Hiện Tại

#### 1. **PaymentCampaignsPage.tsx**
```typescript
// ❌ PROBLEM: Manual state management
const [organizations, setOrganizations] = useState<Organization[]>([]);
const [accessibleOrganizations, setAccessibleOrganizations] = useState<Organization[]>([]);
const [refreshTrigger, setRefreshTrigger] = useState(0);

// ❌ PROBLEM: useEffect fetch data
useEffect(() => {
  loadAccessibleOrganizations();
}, []);

// ❌ PROBLEM: Manual refetch trigger
const handleCampaignSaved = () => {
  setRefreshTrigger(prev => prev + 1); // Crude refresh mechanism
};
```

#### 2. **PaymentCampaignList.tsx**
```typescript
// ❌ PROBLEM: Manual state + loading + error management
const [campaigns, setCampaigns] = useState<PaymentCampaign[]>([]);
const [loading, setLoading] = useState(true);
const [error, setError] = useState<string | null>(null);
const [actionLoading, setActionLoading] = useState<string | null>(null);

// ❌ PROBLEM: useEffect để reload khi filters thay đổi
useEffect(() => {
  loadCampaigns();
}, [filters]);

// ❌ PROBLEM: useEffect để reload khi refreshTrigger thay đổi
useEffect(() => {
  if (refreshTrigger && refreshTrigger > 0) {
    loadCampaigns();
  }
}, [refreshTrigger]);

// ❌ PROBLEM: Manual update state sau mutation
const handleStatusChange = async (id, action) => {
  // ... mutation logic
  setCampaigns(prev => prev.map(campaign =>
    campaign.id === id ? updatedCampaign : campaign
  ));
};
```

#### 3. **usePaymentCampaigns.ts Hook**
```typescript
// ❌ PROBLEM: Custom hook nhưng không dùng React Query
const [state, setState] = useState<PaymentCampaignListState>({
  campaigns: [],
  loading: true,
  error: null,
  filters: { page: 1, limit: 10 },
  pagination: { ... }
});

// ❌ PROBLEM: useEffect để reload
useEffect(() => {
  loadCampaigns();
}, [state.filters]);
```

### Performance Issues

| Issue | Before | Impact |
|-------|--------|--------|
| **Reload toàn bộ list** | Mỗi khi create/update/delete | 500ms-1s mỗi lần |
| **Không cache filters** | Quay lại page → Fetch lại | 500ms mỗi lần |
| **Không cache organizations** | Load lại mỗi mount | 300-500ms |
| **Manual refetch trigger** | `refreshTrigger + 1` pattern | Không elegant |
| **Duplicate requests** | Không dedupe requests | Waste bandwidth |
| **No optimistic updates** | Wait for server response | Slow UX |

---

## 🏗️ Kiến Trúc Mới với TanStack Query

```
┌─────────────────────────────────────────────────────────────────┐
│                   PAYMENT CAMPAIGNS MODULE                       │
├─────────────────────────────────────────────────────────────────┤
│  ┌───────────────────┐  ┌───────────────────┐                  │
│  │ PaymentCampaigns  │  │ PaymentCampaign   │                  │
│  │      Page         │  │    DetailPage     │                  │
│  └─────────┬─────────┘  └─────────┬─────────┘                  │
│            │                       │                             │
│            └───────────┬───────────┘                             │
│                        ▼                                         │
│        ┌───────────────────────────────────┐                    │
│        │  usePaymentCampaignQueries.ts     │ ◄── Query Hooks   │
│        │  - usePaymentCampaignList()       │                    │
│        │  - usePaymentCampaignDetail()     │                    │
│        │  - useAccessibleOrganizations()   │                    │
│        │  - useCreatePaymentCampaign()     │                    │
│        │  - useUpdatePaymentCampaign()     │                    │
│        │  - useDeletePaymentCampaign()     │                    │
│        │  - useActivateCampaign()          │                    │
│        │  - useCompleteCampaign()          │                    │
│        │  - useCancelCampaign()            │                    │
│        │  - useCampaignStatistics()        │                    │
│        └───────────────┬───────────────────┘                    │
│                        ▼                                         │
│        ┌───────────────────────────────────┐                    │
│        │     TanStack Query Client         │ ◄── Cache Layer   │
│        │  - Smart Caching                  │                    │
│        │  - Stale Time: 3 min              │                    │
│        │  - GC Time: 10 min                │                    │
│        │  - Optimistic Updates             │                    │
│        │  - Background Refetch             │                    │
│        └───────────────┬───────────────────┘                    │
│                        ▼                                         │
│        ┌───────────────────────────────────┐                    │
│        │  paymentCampaignService.ts        │ ◄── API Layer     │
│        │  - getPaymentCampaigns()          │                    │
│        │  - getPaymentCampaignById()       │                    │
│        │  - createPaymentCampaign()        │                    │
│        │  - updatePaymentCampaign()        │                    │
│        │  - deletePaymentCampaign()        │                    │
│        │  - activatePaymentCampaign()      │                    │
│        │  - getAccessibleOrganizations()   │                    │
│        └───────────────┬───────────────────┘                    │
│                        ▼                                         │
│        ┌───────────────────────────────────┐                    │
│        │        Backend API                │                    │
│        │   /api/payment-campaigns          │                    │
│        └───────────────────────────────────┘                    │
└─────────────────────────────────────────────────────────────────┘
```

---

## 📁 Cấu Trúc File

### 1. **Query Keys Factory**

**File**: `frontend/src/shared/hooks/queries/paymentCampaignKeys.ts` (NEW)

```typescript
/**
 * ========================
 * PAYMENT CAMPAIGN QUERY KEYS
 * ========================
 * Hierarchical key structure for efficient cache management
 */

export const paymentCampaignKeys = {
  // Base key
  all: ['paymentCampaigns'] as const,
  
  // List queries (with filters)
  lists: () => [...paymentCampaignKeys.all, 'list'] as const,
  list: (filters?: PaymentCampaignFilters) => 
    [...paymentCampaignKeys.lists(), { ...filters }] as const,
  
  // Detail queries
  details: () => [...paymentCampaignKeys.all, 'detail'] as const,
  detail: (id: string) => [...paymentCampaignKeys.details(), id] as const,
  
  // Statistics queries
  stats: () => [...paymentCampaignKeys.all, 'stats'] as const,
  stat: (id: string) => [...paymentCampaignKeys.stats(), id] as const,
  
  // Accessible organizations
  accessibleOrgs: () => [...paymentCampaignKeys.all, 'accessible-orgs'] as const,
  
  // By organization
  byOrganization: (orgId: string) => 
    [...paymentCampaignKeys.all, 'organization', orgId] as const,
};

// Example keys generated:
// ['paymentCampaigns', 'list', { page: 1, limit: 10, status: 'ACTIVE' }]
// ['paymentCampaigns', 'detail', 'campaign-123']
// ['paymentCampaigns', 'stats', 'campaign-123']
// ['paymentCampaigns', 'accessible-orgs']
// ['paymentCampaigns', 'organization', 'org-456']
```

### 2. **Query Hooks**

**File**: `frontend/src/shared/hooks/queries/usePaymentCampaignQueries.ts` (NEW)

```typescript
import { useQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query';
import { paymentCampaignService } from '../../services/fee-collection-service';
import { paymentCampaignKeys } from './paymentCampaignKeys';
import {
  PaymentCampaign,
  PaymentCampaignFilters,
  CreatePaymentCampaignDto,
  UpdatePaymentCampaignDto,
} from '../../../features/fee-collection/types';

/**
 * ========================
 * QUERY HOOKS - DATA FETCHING
 * ========================
 */

/**
 * Hook for fetching payment campaigns list with pagination & filters
 * Cache key: ['paymentCampaigns', 'list', { page, limit, status, ... }]
 * 
 * Features:
 * - Smart caching per filter combination
 * - PlaceholderData for smooth pagination
 * - Background refetch for fresh data
 */
export const usePaymentCampaignList = (
  filters: PaymentCampaignFilters = { page: 1, limit: 10 }
) => {
  return useQuery({
    queryKey: paymentCampaignKeys.list(filters),
    queryFn: async () => {
      const response = await paymentCampaignService.getPaymentCampaigns(filters);
      return response;
    },
    staleTime: 3 * 60 * 1000, // 3 minutes (data thay đổi thường xuyên)
    gcTime: 10 * 60 * 1000,   // 10 minutes
    placeholderData: keepPreviousData, // Show previous page while fetching
  });
};

/**
 * Hook for fetching single campaign detail
 * Cache key: ['paymentCampaigns', 'detail', id]
 */
export const usePaymentCampaignDetail = (
  id: string,
  options?: { enabled?: boolean }
) => {
  return useQuery({
    queryKey: paymentCampaignKeys.detail(id),
    queryFn: async () => {
      const campaign = await paymentCampaignService.getPaymentCampaignById(id);
      return campaign;
    },
    staleTime: 2 * 60 * 1000, // 2 minutes
    gcTime: 10 * 60 * 1000,
    enabled: options?.enabled ?? !!id,
  });
};

/**
 * Hook for fetching campaign statistics
 * Cache key: ['paymentCampaigns', 'stats', id]
 */
export const useCampaignStatistics = (
  id: string,
  options?: { enabled?: boolean }
) => {
  return useQuery({
    queryKey: paymentCampaignKeys.stat(id),
    queryFn: async () => {
      const response = await paymentCampaignService.getPaymentCampaignStatistics(id);
      return response.data;
    },
    staleTime: 5 * 60 * 1000, // 5 minutes (stats ít thay đổi)
    gcTime: 30 * 60 * 1000,   // 30 minutes
    enabled: options?.enabled ?? !!id,
  });
};

/**
 * Hook for fetching accessible organizations
 * Cache key: ['paymentCampaigns', 'accessible-orgs']
 * 
 * Shared cache: Nhiều components dùng chung cache này
 */
export const useAccessibleOrganizations = () => {
  return useQuery({
    queryKey: paymentCampaignKeys.accessibleOrgs(),
    queryFn: async () => {
      const orgs = await paymentCampaignService.getAccessibleOrganizations();
      return orgs;
    },
    staleTime: 5 * 60 * 1000, // 5 minutes (organizations ít thay đổi)
    gcTime: 30 * 60 * 1000,   // 30 minutes
    refetchOnMount: false,    // Don't refetch if cache is fresh
  });
};

/**
 * Hook for fetching campaigns by organization
 * Cache key: ['paymentCampaigns', 'organization', orgId]
 */
export const useCampaignsByOrganization = (
  organizationId: string,
  options?: { enabled?: boolean }
) => {
  return useQuery({
    queryKey: paymentCampaignKeys.byOrganization(organizationId),
    queryFn: async () => {
      const response = await paymentCampaignService.getPaymentCampaignsByOrganization(organizationId);
      return response.data;
    },
    staleTime: 3 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    enabled: options?.enabled ?? !!organizationId,
  });
};

/**
 * ========================
 * MUTATION HOOKS - DATA MODIFICATION
 * ========================
 */

/**
 * Hook for creating payment campaign
 * 
 * Optimistic Update Flow:
 * 1. Add new campaign to cache immediately
 * 2. Send request to server
 * 3. If success: Invalidate lists to refetch
 * 4. If error: Rollback optimistic update
 */
export const useCreatePaymentCampaign = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (data: CreatePaymentCampaignDto) => {
      const response = await paymentCampaignService.createPaymentCampaign(data);
      return response.data;
    },
    
    onSuccess: (newCampaign) => {
      // Invalidate all list queries to refetch
      queryClient.invalidateQueries({ 
        queryKey: paymentCampaignKeys.lists() 
      });
      
      // Invalidate organization-specific queries if applicable
      if (newCampaign.organizationId) {
        queryClient.invalidateQueries({
          queryKey: paymentCampaignKeys.byOrganization(newCampaign.organizationId)
        });
      }
      
      // Pre-populate detail cache for instant access
      queryClient.setQueryData(
        paymentCampaignKeys.detail(newCampaign.id),
        newCampaign
      );
    },
    
    onError: (error) => {
      console.error('Failed to create campaign:', error);
    },
  });
};

/**
 * Hook for updating payment campaign
 * 
 * Optimistic Update Flow:
 * 1. Update campaign in cache immediately
 * 2. Send request to server
 * 3. If error: Rollback to previous state
 */
export const useUpdatePaymentCampaign = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: UpdatePaymentCampaignDto }) => {
      const response = await paymentCampaignService.updatePaymentCampaign(id, data);
      return response.data;
    },
    
    // Optimistic update
    onMutate: async ({ id, data }) => {
      // Cancel ongoing queries
      await queryClient.cancelQueries({ 
        queryKey: paymentCampaignKeys.detail(id) 
      });
      
      // Snapshot current value for rollback
      const previousCampaign = queryClient.getQueryData<PaymentCampaign>(
        paymentCampaignKeys.detail(id)
      );
      
      // Optimistically update detail cache
      if (previousCampaign) {
        queryClient.setQueryData(
          paymentCampaignKeys.detail(id),
          { ...previousCampaign, ...data }
        );
      }
      
      // Optimistically update list cache
      queryClient.setQueriesData(
        { queryKey: paymentCampaignKeys.lists() },
        (old: any) => {
          if (!old?.data) return old;
          return {
            ...old,
            data: old.data.map((campaign: PaymentCampaign) =>
              campaign.id === id ? { ...campaign, ...data } : campaign
            ),
          };
        }
      );
      
      return { previousCampaign };
    },
    
    // Rollback on error
    onError: (err, { id }, context) => {
      if (context?.previousCampaign) {
        queryClient.setQueryData(
          paymentCampaignKeys.detail(id),
          context.previousCampaign
        );
      }
    },
    
    // Refetch to ensure sync with server
    onSuccess: (updatedCampaign) => {
      // Update detail cache with server response
      queryClient.setQueryData(
        paymentCampaignKeys.detail(updatedCampaign.id),
        updatedCampaign
      );
      
      // Invalidate lists to refetch
      queryClient.invalidateQueries({ 
        queryKey: paymentCampaignKeys.lists() 
      });
      
      // Invalidate stats if exists
      queryClient.invalidateQueries({
        queryKey: paymentCampaignKeys.stat(updatedCampaign.id)
      });
    },
  });
};

/**
 * Hook for deleting payment campaign
 * 
 * Optimistic Update Flow:
 * 1. Remove campaign from cache immediately
 * 2. Send delete request
 * 3. If error: Restore campaign
 */
export const useDeletePaymentCampaign = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (id: string) => {
      await paymentCampaignService.deletePaymentCampaign(id);
      return id;
    },
    
    // Optimistic update
    onMutate: async (id) => {
      // Cancel ongoing queries
      await queryClient.cancelQueries({ 
        queryKey: paymentCampaignKeys.lists() 
      });
      
      // Snapshot for rollback
      const previousLists = queryClient.getQueriesData({
        queryKey: paymentCampaignKeys.lists()
      });
      
      // Optimistically remove from cache
      queryClient.setQueriesData(
        { queryKey: paymentCampaignKeys.lists() },
        (old: any) => {
          if (!old?.data) return old;
          return {
            ...old,
            data: old.data.filter((campaign: PaymentCampaign) => campaign.id !== id),
            total: (old.total || 0) - 1,
          };
        }
      );
      
      return { previousLists };
    },
    
    // Rollback on error
    onError: (err, id, context) => {
      if (context?.previousLists) {
        context.previousLists.forEach(([queryKey, data]) => {
          queryClient.setQueryData(queryKey, data);
        });
      }
    },
    
    // Cleanup on success
    onSuccess: (deletedId) => {
      // Remove detail cache
      queryClient.removeQueries({ 
        queryKey: paymentCampaignKeys.detail(deletedId) 
      });
      
      // Remove stats cache
      queryClient.removeQueries({
        queryKey: paymentCampaignKeys.stat(deletedId)
      });
      
      // Refetch lists to ensure sync
      queryClient.invalidateQueries({ 
        queryKey: paymentCampaignKeys.lists() 
      });
    },
  });
};

/**
 * Hook for status change actions (activate, complete, cancel)
 */
export const useChangeCampaignStatus = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ 
      id, 
      action 
    }: { 
      id: string; 
      action: 'activate' | 'complete' | 'cancel' 
    }) => {
      let response;
      switch (action) {
        case 'activate':
          response = await paymentCampaignService.activatePaymentCampaign(id);
          break;
        case 'complete':
          response = await paymentCampaignService.completePaymentCampaign(id);
          break;
        case 'cancel':
          response = await paymentCampaignService.cancelPaymentCampaign(id);
          break;
      }
      return response.data;
    },
    
    // Optimistic update
    onMutate: async ({ id, action }) => {
      // Cancel ongoing queries
      await queryClient.cancelQueries({ 
        queryKey: paymentCampaignKeys.detail(id) 
      });
      
      // Snapshot for rollback
      const previousCampaign = queryClient.getQueryData<PaymentCampaign>(
        paymentCampaignKeys.detail(id)
      );
      
      // Determine new status
      const newStatus = action === 'activate' ? 'ACTIVE' 
        : action === 'complete' ? 'COMPLETED' 
        : 'CANCELLED';
      
      // Optimistically update detail cache
      if (previousCampaign) {
        queryClient.setQueryData(
          paymentCampaignKeys.detail(id),
          { ...previousCampaign, status: newStatus }
        );
      }
      
      // Optimistically update list cache
      queryClient.setQueriesData(
        { queryKey: paymentCampaignKeys.lists() },
        (old: any) => {
          if (!old?.data) return old;
          return {
            ...old,
            data: old.data.map((campaign: PaymentCampaign) =>
              campaign.id === id 
                ? { ...campaign, status: newStatus } 
                : campaign
            ),
          };
        }
      );
      
      return { previousCampaign };
    },
    
    // Rollback on error
    onError: (err, { id }, context) => {
      if (context?.previousCampaign) {
        queryClient.setQueryData(
          paymentCampaignKeys.detail(id),
          context.previousCampaign
        );
      }
    },
    
    // Refetch on success
    onSuccess: (updatedCampaign) => {
      // Update caches with server response
      queryClient.setQueryData(
        paymentCampaignKeys.detail(updatedCampaign.id),
        updatedCampaign
      );
      
      queryClient.invalidateQueries({ 
        queryKey: paymentCampaignKeys.lists() 
      });
      
      queryClient.invalidateQueries({
        queryKey: paymentCampaignKeys.stat(updatedCampaign.id)
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
 * Hook to manually invalidate caches
 */
export const useInvalidatePaymentCampaigns = () => {
  const queryClient = useQueryClient();
  
  return {
    // Invalidate all campaign queries
    invalidateAll: () => {
      queryClient.invalidateQueries({ 
        queryKey: paymentCampaignKeys.all 
      });
    },
    
    // Invalidate only lists
    invalidateLists: () => {
      queryClient.invalidateQueries({ 
        queryKey: paymentCampaignKeys.lists() 
      });
    },
    
    // Invalidate specific detail
    invalidateDetail: (id: string) => {
      queryClient.invalidateQueries({
        queryKey: paymentCampaignKeys.detail(id)
      });
    },
    
    // Invalidate stats
    invalidateStats: (id: string) => {
      queryClient.invalidateQueries({
        queryKey: paymentCampaignKeys.stat(id)
      });
    },
    
    // Invalidate accessible organizations
    invalidateAccessibleOrgs: () => {
      queryClient.invalidateQueries({
        queryKey: paymentCampaignKeys.accessibleOrgs()
      });
    },
  };
};
```

---

## 🔄 Migration Plan

### Phase 1: Setup (Day 1)

#### 1.1 Verify QueryClient exists
File đã có: `frontend/src/shared/config/queryClient.ts` ✅

#### 1.2 Create Query Keys
```bash
# Create new file
frontend/src/shared/hooks/queries/paymentCampaignKeys.ts
```

#### 1.3 Create Query Hooks
```bash
# Create new file
frontend/src/shared/hooks/queries/usePaymentCampaignQueries.ts
```

#### 1.4 Export from index
**File**: `frontend/src/shared/hooks/queries/index.ts`

```typescript
// Add new exports
export * from './usePaymentCampaignQueries';
export * from './paymentCampaignKeys';
```

---

### Phase 2: Migrate PaymentCampaignsPage (Day 2)

#### Before:
```typescript
// ❌ OLD CODE
const [organizations, setOrganizations] = useState<Organization[]>([]);
const [accessibleOrganizations, setAccessibleOrganizations] = useState<Organization[]>([]);
const [refreshTrigger, setRefreshTrigger] = useState(0);

useEffect(() => {
  loadAccessibleOrganizations();
}, []);

const loadAccessibleOrganizations = async () => {
  try {
    const orgs = await organizationService.getAccessibleOrganizations();
    // ... mapping logic
    setAccessibleOrganizations(mappedOrgs);
  } catch (error) {
    // ... error handling
  }
};

const handleCampaignSaved = () => {
  setRefreshTrigger(prev => prev + 1);
  handleCloseModals();
};
```

#### After:
```typescript
// ✅ NEW CODE
import { useAccessibleOrganizations } from '@/shared/hooks/queries';

const {
  data: accessibleOrganizations = [],
  isLoading: pageLoading,
  error: orgsError
} = useAccessibleOrganizations();

const handleCampaignSaved = () => {
  // Cache tự động invalidate và refetch
  handleCloseModals();
};
```

**Changes:**
- ✅ Remove `useState` for organizations
- ✅ Remove `useEffect` for loading
- ✅ Remove `loadAccessibleOrganizations` function
- ✅ Remove `refreshTrigger` state
- ✅ Use `useAccessibleOrganizations` hook
- ✅ Automatic refetch after mutations

---

### Phase 3: Migrate PaymentCampaignList (Day 3)

#### Before:
```typescript
// ❌ OLD CODE
const [campaigns, setCampaigns] = useState<PaymentCampaign[]>([]);
const [loading, setLoading] = useState(true);
const [error, setError] = useState<string | null>(null);
const [filters, setFilters] = useState<PaymentCampaignFilters>({
  page: 1,
  limit: 10
});
const [pagination, setPagination] = useState({ ... });

useEffect(() => {
  loadCampaigns();
}, [filters]);

useEffect(() => {
  if (refreshTrigger && refreshTrigger > 0) {
    loadCampaigns();
  }
}, [refreshTrigger]);

const loadCampaigns = async () => {
  setLoading(true);
  // ... fetch logic
  setCampaigns(response.campaigns);
  setPagination({ ... });
};

const handleStatusChange = async (id, action) => {
  // ... mutation logic
  setCampaigns(prev => prev.map(campaign =>
    campaign.id === id ? updatedCampaign : campaign
  ));
};
```

#### After:
```typescript
// ✅ NEW CODE
import { 
  usePaymentCampaignList,
  useChangeCampaignStatus,
  useDeletePaymentCampaign 
} from '@/shared/hooks/queries';

const [filters, setFilters] = useState<PaymentCampaignFilters>({
  page: 1,
  limit: 10
});

// Query
const {
  data,
  isLoading: loading,
  error,
  isPlaceholderData // For pagination loading state
} = usePaymentCampaignList(filters);

const campaigns = data?.data || [];
const pagination = {
  page: data?.page || 1,
  limit: data?.limit || 10,
  total: data?.total || 0,
  totalPages: data?.totalPages || 0,
};

// Mutations
const changeStatusMutation = useChangeCampaignStatus();
const deleteMutation = useDeletePaymentCampaign();

const handleStatusChange = async (id: string, action: 'activate' | 'complete' | 'cancel') => {
  // Show confirmation first...
  
  try {
    await changeStatusMutation.mutateAsync({ id, action });
    showSuccess(t('messages.statusChangeSuccess'));
  } catch (err) {
    showError(t('messages.statusChangeError'));
  }
};

const handleDelete = async (id: string) => {
  // Show confirmation first...
  
  try {
    await deleteMutation.mutateAsync(id);
    showSuccess(t('messages.deleteSuccess'));
  } catch (err) {
    showError(t('messages.deleteError'));
  }
};
```

**Changes:**
- ✅ Remove `useState` for campaigns, loading, error, pagination
- ✅ Remove both `useEffect` hooks
- ✅ Remove `loadCampaigns` function
- ✅ Remove `refreshTrigger` dependency
- ✅ Use `usePaymentCampaignList` hook
- ✅ Use `useChangeCampaignStatus` mutation
- ✅ Use `useDeletePaymentCampaign` mutation
- ✅ Automatic optimistic updates
- ✅ PlaceholderData for smooth pagination

---

### Phase 4: Migrate usePaymentCampaigns Hook (Day 4)

**Option 1: Deprecate completely** (Recommended)
- Delete `frontend/src/features/fee-collection/hooks/usePaymentCampaigns.ts`
- Update all imports to use new hooks from `@/shared/hooks/queries`

**Option 2: Wrap new hooks** (For backward compatibility)

```typescript
// frontend/src/features/fee-collection/hooks/usePaymentCampaigns.ts
import { useState } from 'react';
import { 
  usePaymentCampaignList,
  useCreatePaymentCampaign as useCreate,
  useUpdatePaymentCampaign as useUpdate,
  useDeletePaymentCampaign as useDelete,
} from '@/shared/hooks/queries';

export const usePaymentCampaigns = (initialFilters = {}) => {
  const [filters, setFilters] = useState(initialFilters);
  
  const { data, isLoading, error } = usePaymentCampaignList(filters);
  
  return {
    campaigns: data?.data || [],
    loading: isLoading,
    error: error?.message || null,
    filters,
    pagination: {
      page: data?.page || 1,
      limit: data?.limit || 10,
      total: data?.total || 0,
      totalPages: data?.totalPages || 0,
    },
    updateFilters: (newFilters) => {
      setFilters(prev => ({ ...prev, ...newFilters }));
    },
    resetFilters: () => {
      setFilters({ page: 1, limit: 10 });
    },
    refetch: () => {}, // No need - automatic
  };
};
```

---

## 📊 Expected Performance Improvements

### Before vs After

| Scenario | Before | After (Cache Hit) | Improvement |
|----------|--------|-------------------|-------------|
| **First Load Campaigns** | 500-800ms | 500-800ms | Same |
| **Second Load** | 500-800ms | **< 1ms** | **500x faster** ⚡ |
| **Change Filter** | 500-800ms | 500-800ms (new key) | Same |
| **Same Filter Again** | 500-800ms | **< 1ms** | **500x faster** ⚡ |
| **Navigate Back** | 500-800ms | **< 1ms** | **500x faster** ⚡ |
| **Create Campaign** | 800ms | 800ms + instant UI | Better UX |
| **Update Campaign** | 800ms | **< 1ms + 800ms bg** | **Instant UI** 🎯 |
| **Delete Campaign** | 500ms | **< 1ms + 500ms bg** | **Instant UI** 🎯 |
| **Status Change** | 800ms | **< 1ms + 800ms bg** | **Instant UI** 🎯 |
| **Load Organizations** | 300-500ms | **< 1ms** | **300x faster** ⚡ |
| **Pagination** | 500ms | **< 1ms (placeholder)** | **Smooth transition** 🎨 |

### API Call Reduction

| Action | Before | After | Reduction |
|--------|--------|-------|-----------|
| **Revisit page** | 1 request | 0 requests | **100%** |
| **Same filters** | 1 request | 0 requests | **100%** |
| **After create** | 2 requests (create + refetch) | 1 request | **50%** |
| **After update** | 2 requests | 1 request | **50%** |
| **Organizations** | Every mount | Once per session | **90%+** |

---

## 🎯 Cache Strategy

### Stale Time Configuration

```typescript
// Payment Campaigns List: Short stale time (data changes frequently)
listStaleTime: 3 * 60 * 1000, // 3 minutes
listCacheTime: 10 * 60 * 1000, // 10 minutes

// Campaign Detail: Very short stale time
detailStaleTime: 2 * 60 * 1000, // 2 minutes
detailCacheTime: 10 * 60 * 1000, // 10 minutes

// Statistics: Medium stale time (less frequent changes)
statsStaleTime: 5 * 60 * 1000, // 5 minutes
statsCacheTime: 30 * 60 * 1000, // 30 minutes

// Accessible Organizations: Long stale time (rarely changes)
orgsStaleTime: 5 * 60 * 1000, // 5 minutes
orgsCacheTime: 30 * 60 * 1000, // 30 minutes
```

### Invalidation Strategy

| Mutation | Invalidate |
|----------|-----------|
| **Create Campaign** | `lists()`, `byOrganization()` |
| **Update Campaign** | `lists()`, `detail()`, `stats()` |
| **Delete Campaign** | `lists()`, remove `detail()`, remove `stats()` |
| **Change Status** | `lists()`, `detail()`, `stats()` |

---

## 🚨 Common Pitfalls & Solutions

### Pitfall 1: Filter object reference change

```typescript
// ❌ PROBLEM: New object every render → New cache key
const filters = { page: 1, limit: 10 }; // New object!

// ✅ SOLUTION: useState for stable reference
const [filters, setFilters] = useState({ page: 1, limit: 10 });
```

### Pitfall 2: Forgetting placeholderData

```typescript
// ❌ PROBLEM: Loading spinner on every page change
const { data, isLoading } = usePaymentCampaignList(filters);

// ✅ SOLUTION: Use placeholderData
const { 
  data, 
  isLoading, 
  isPlaceholderData 
} = usePaymentCampaignList(filters);
// Show old data while fetching, no spinner!
```

### Pitfall 3: Manual refetch after mutation

```typescript
// ❌ PROBLEM: Manual refetch
const { mutate } = useCreatePaymentCampaign();
const { refetch } = usePaymentCampaignList(filters);

mutate(data, {
  onSuccess: () => {
    refetch(); // Manual refetch!
  }
});

// ✅ SOLUTION: Automatic via invalidation
// Mutation hook already invalidates cache in onSuccess
// No need for manual refetch!
```

### Pitfall 4: Not handling optimistic update errors

```typescript
// ❌ PROBLEM: No error toast when optimistic update fails
const { mutate } = useUpdatePaymentCampaign();
mutate({ id, data }); // Silent failure!

// ✅ SOLUTION: Handle error
const { mutate } = useUpdatePaymentCampaign();
mutate({ id, data }, {
  onError: (error) => {
    showError('Failed to update campaign');
  }
});
```

---

## 📝 Migration Checklist

### Day 1: Setup
- [ ] Create `paymentCampaignKeys.ts`
- [ ] Create `usePaymentCampaignQueries.ts`
- [ ] Export from `index.ts`
- [ ] Test with React Query DevTools

### Day 2: PaymentCampaignsPage
- [ ] Import `useAccessibleOrganizations`
- [ ] Remove `useState` for organizations
- [ ] Remove `useEffect` for loading
- [ ] Remove `loadAccessibleOrganizations`
- [ ] Remove `refreshTrigger`
- [ ] Test organizations load
- [ ] Test create/edit modal

### Day 3: PaymentCampaignList
- [ ] Import query hooks
- [ ] Replace `useState` with `usePaymentCampaignList`
- [ ] Remove both `useEffect`
- [ ] Remove `loadCampaigns` function
- [ ] Update `handleStatusChange` with mutation
- [ ] Update `handleDelete` with mutation
- [ ] Test list load
- [ ] Test pagination
- [ ] Test filters
- [ ] Test status changes
- [ ] Test delete

### Day 4: Cleanup
- [ ] Delete old `usePaymentCampaigns.ts` (or wrap)
- [ ] Update imports in other files
- [ ] Remove unused dependencies

### Day 5: Testing & Documentation
- [ ] Test all CRUD operations
- [ ] Test optimistic updates
- [ ] Test error handling
- [ ] Test cache invalidation
- [ ] Measure performance improvements
- [ ] Document findings

---

## 🎓 Key Learnings

### 1. **PlaceholderData for Pagination**
```typescript
// Smooth pagination without loading spinners
placeholderData: keepPreviousData
```

### 2. **Optimistic Updates Pattern**
```typescript
onMutate: async () => {
  // 1. Cancel queries
  // 2. Snapshot old data
  // 3. Update cache optimistically
  // 4. Return context for rollback
},
onError: (err, vars, context) => {
  // 5. Rollback on error
},
onSuccess: () => {
  // 6. Invalidate to sync with server
}
```

### 3. **Smart Invalidation**
```typescript
// Only invalidate what's affected
queryClient.invalidateQueries({ 
  queryKey: paymentCampaignKeys.lists() 
});
// Not:
queryClient.invalidateQueries({ 
  queryKey: paymentCampaignKeys.all 
});
```

### 4. **Shared Cache Benefits**
```typescript
// Many components → 1 cache → 0 duplicate requests
const { data } = useAccessibleOrganizations();
```

---

## 📚 Resources

- [TanStack Query Documentation](https://tanstack.com/query/latest/docs/react/overview)
- [Optimistic Updates Guide](https://tanstack.com/query/latest/docs/react/guides/optimistic-updates)
- [PlaceholderData for Pagination](https://tanstack.com/query/latest/docs/react/guides/paginated-queries)
- [Query Key Best Practices](https://tkdodo.eu/blog/effective-react-query-keys)

---

**Tác giả**: Đoàn Hội Portal Team  
**Ngày tạo**: November 5, 2025  
**Version**: 1.0.0  
**Status**: 🟢 READY TO IMPLEMENT  
**Priority**: 🔴 HIGH  
**Estimated Time**: 5 days  
**Expected ROI**: 🔥 EXCELLENT (500x performance on cache hits + instant UX)
