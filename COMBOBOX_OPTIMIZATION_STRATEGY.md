# Chiến Lược Tối Ưu ComboBox & Trang Tổ Chức

## 🎯 Mục Tiêu

Tối ưu hóa hiệu năng cho:
1. **Trang tổ chức chính** (Organization Tree) - Hiển thị cây phân cấp
2. **ComboBox search** (User Role Assignment, Forms, etc.) - Dropdown tìm kiếm

**Vấn đề hiện tại:**
- Cả 2 đều gọi `getOrganizations()` → Lấy TOÀN BỘ data
- Không có caching → Mỗi lần mở modal/form fetch lại
- Data không phù hợp với use case (Tree view vs Flat list)

---

## 🔍 Phân Tích Use Cases

### Use Case 1: Trang Tổ Chức (Tree View)
**Yêu cầu:**
- ✅ Cần cấu trúc cây (parent-child hierarchy)
- ✅ Cần memberCount, hasChildren
- ✅ Lazy loading (expand/collapse)
- ✅ Visual representation

**Data cần:**
```typescript
{
  id: string,
  name: string,
  code: string,
  type: string,
  parent: { id, name },
  children: Organization[], // Nested
  memberCount: number,
  hasChildren: boolean
}
```

### Use Case 2: ComboBox Search (Flat List)
**Yêu cầu:**
- ✅ Search/filter nhanh
- ✅ Danh sách phẳng (flat list)
- ✅ Chỉ cần: id, name, code, type
- ❌ KHÔNG cần children, memberCount
- ✅ Có thể cache lâu dài

**Data cần:**
```typescript
{
  id: string,
  name: string,
  code: string,
  type: string,
  // Không cần parent, children, memberCount
}
```

---

## 💡 Giải Pháp Tổng Thể: DUAL API STRATEGY

### Chiến Lược: Tách Biệt 2 API Khác Nhau

```
┌─────────────────────────────────────────┐
│     Organization Data Sources           │
├─────────────────────────────────────────┤
│                                          │
│  1. Tree API (Tree View)                │
│     → /organizations/tree                │
│     → Lazy loading với children          │
│     → MemberCount, hasChildren           │
│                                          │
│  2. Flat API (ComboBox)                 │
│     → /organizations/flat                │
│     → Simple list, no relations          │
│     → Cache-friendly                     │
│     → Filter by permission (optional)    │
│                                          │
└─────────────────────────────────────────┘
```

---

## 🚀 Implementation Plan

## Phase 1: Backend - Tạo API Flat (PRIORITY HIGH)

### 1.1 Controller - Thêm Endpoint Mới

**File:** `backend/src/organizations/organizations.controller.ts`

```typescript
@Get('flat')
@ApiOperation({ 
  summary: 'Lấy danh sách tổ chức dạng flat (không có cấu trúc cây)',
  description: 'Sử dụng cho dropdown/combobox, trả về danh sách phẳng không có children/memberCount để tối ưu performance'
})
@ApiQuery({ name: 'search', required: false, description: 'Tìm kiếm theo tên hoặc code' })
@ApiQuery({ name: 'type', required: false, enum: OrganizationType, description: 'Lọc theo loại tổ chức' })
@ApiQuery({ name: 'limit', required: false, type: Number, description: 'Giới hạn số lượng kết quả' })
@ApiResponse({ 
  status: 200, 
  description: 'Danh sách tổ chức flat',
  schema: {
    type: 'array',
    items: {
      type: 'object',
      properties: {
        id: { type: 'string' },
        name: { type: 'string' },
        code: { type: 'string' },
        type: { type: 'string' },
        level: { type: 'number' }
      }
    }
  }
})
async findFlat(
  @Query('search') search?: string,
  @Query('type') type?: OrganizationType,
  @Query('limit') limit?: number
) {
  return this.organizationsService.findFlat({ search, type, limit });
}

@Get('accessible-flat')
@UseGuards(JwtAuthGuard)
@ApiOperation({ 
  summary: 'Lấy danh sách tổ chức flat mà user có quyền truy cập',
  description: 'Tương tự /flat nhưng filter theo permissions của user'
})
async getAccessibleFlat(@Request() req: any) {
  const userId = req.user.id;
  return this.organizationsService.getAccessibleFlat(userId);
}
```

### 1.2 Service - Implement Logic

**File:** `backend/src/organizations/organizations.service.ts`

```typescript
/**
 * Lấy danh sách tổ chức dạng flat (không có cấu trúc cây)
 * Tối ưu cho dropdown/combobox
 */
async findFlat(options: {
  search?: string;
  type?: OrganizationType;
  limit?: number;
}): Promise<Array<{
  id: string;
  name: string;
  code: string;
  type: OrganizationType;
  level: number;
}>> {
  const { search, type, limit } = options;
  
  const queryBuilder = this.organizationsRepository
    .createQueryBuilder('org')
    .select([
      'org.id',
      'org.name', 
      'org.code',
      'org.type',
      'org.level'
    ]); // Chỉ select những field cần thiết
  
  // Filter by search
  if (search && search.trim()) {
    queryBuilder.andWhere(
      '(LOWER(org.name) LIKE LOWER(:search) OR LOWER(org.code) LIKE LOWER(:search))',
      { search: `%${search.trim()}%` }
    );
  }
  
  // Filter by type
  if (type) {
    queryBuilder.andWhere('org.type = :type', { type });
  }
  
  // Order by name for better UX
  queryBuilder.orderBy('org.name', 'ASC');
  
  // Limit results
  if (limit && limit > 0) {
    queryBuilder.take(limit);
  }
  
  const organizations = await queryBuilder.getMany();
  
  // Return flat structure
  return organizations.map(org => ({
    id: org.id,
    name: org.name,
    code: org.code,
    type: org.type,
    level: org.level || 0
  }));
}

/**
 * Lấy danh sách tổ chức flat mà user có quyền truy cập
 * Dùng cho combobox trong các form cần permission check
 */
async getAccessibleFlat(userId: string): Promise<Array<{
  id: string;
  name: string;
  code: string;
  type: OrganizationType;
  level: number;
}>> {
  // Check if super admin
  const superAdminQuery = `
    SELECT ur.id
    FROM user_roles ur
    JOIN roles r ON ur."roleId" = r.id
    JOIN role_permissions rp ON r.id = rp."roleId"
    JOIN permissions p ON rp."permissionId" = p.id
    WHERE ur."userId" = $1 
    AND ur."organizationId" IS NULL
    AND ur."isActive" = true
    AND (p.code = 'system.access_admin' OR r.name = 'super_admin')
    AND p."isActive" = true
    LIMIT 1
  `;
  
  const superAdminResult = await this.organizationsRepository.query(superAdminQuery, [userId]);
  
  if (superAdminResult.length > 0) {
    // Super admin can see all - use findFlat
    return this.findFlat({});
  }
  
  // Get user's accessible organizations
  const accessibleOrgIds = await this.getUserAccessibleOrganizationIds(userId);
  
  if (accessibleOrgIds.length === 0) {
    return [];
  }
  
  // Query organizations by accessible IDs
  const organizations = await this.organizationsRepository
    .createQueryBuilder('org')
    .select([
      'org.id',
      'org.name',
      'org.code',
      'org.type',
      'org.level'
    ])
    .where('org.id IN (:...ids)', { ids: accessibleOrgIds })
    .orderBy('org.name', 'ASC')
    .getMany();
  
  return organizations.map(org => ({
    id: org.id,
    name: org.name,
    code: org.code,
    type: org.type,
    level: org.level || 0
  }));
}

/**
 * Helper: Get organization IDs user has access to
 */
private async getUserAccessibleOrganizationIds(userId: string): Promise<string[]> {
  const userOrgsQuery = `
    SELECT DISTINCT uo."organizationId"
    FROM user_organizations uo
    WHERE uo."userId" = $1 AND uo."isActive" = true
  `;
  
  const results = await this.organizationsRepository.query(userOrgsQuery, [userId]);
  return results.map((r: any) => r.organizationId);
}
```

---

## Phase 2: Frontend - Tách Service Methods

### 2.1 Update Organization Service

**File:** `frontend/src/shared/services/organizationService.ts`

```typescript
class OrganizationService {
  // ... existing methods ...
  
  /**
   * Get flat list of organizations (for combobox/dropdown)
   * No tree structure, no memberCount - optimized for search
   */
  async getOrganizationsFlat(options?: {
    search?: string;
    type?: string;
    limit?: number;
  }): Promise<Array<{
    id: string;
    name: string;
    code: string;
    type: string;
    level: number;
  }>> {
    const params = new URLSearchParams();
    if (options?.search) params.append('search', options.search);
    if (options?.type) params.append('type', options.type);
    if (options?.limit) params.append('limit', options.limit.toString());
    
    const queryString = params.toString();
    const url = `/organizations/flat${queryString ? `?${queryString}` : ''}`;
    
    return apiClient.get(url);
  }
  
  /**
   * Get accessible flat organizations (with permission check)
   * Use this for forms that need permission-based filtering
   */
  async getAccessibleOrganizationsFlat(): Promise<Array<{
    id: string;
    name: string;
    code: string;
    type: string;
    level: number;
  }>> {
    return apiClient.get('/organizations/accessible-flat');
  }
}

export const organizationService = new OrganizationService();
```

---

## Phase 3: React Query Integration (CACHING)

### 3.1 Setup React Query (Nếu chưa có)

**File:** `frontend/src/main.tsx` hoặc `App.tsx`

```typescript
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';

// Create query client with optimized settings
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 phút - data considered fresh
      cacheTime: 10 * 60 * 1000, // 10 phút - cache retained
      refetchOnWindowFocus: false,
      refetchOnMount: false,
      retry: 1,
    },
  },
});

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      {/* Your app */}
      <ReactQueryDevtools initialIsOpen={false} />
    </QueryClientProvider>
  );
}
```

### 3.2 Create Custom Hooks với Caching

**File:** `frontend/src/shared/hooks/useOrganizations.ts`

```typescript
import { useQuery, UseQueryResult } from '@tanstack/react-query';
import { organizationService } from '../services/organizationService';

/**
 * Hook để lấy flat organizations với caching
 * Dùng cho ComboBox, Dropdown, Search
 */
export const useOrganizationsFlat = (options?: {
  search?: string;
  type?: string;
  limit?: number;
  enabled?: boolean;
}): UseQueryResult<Array<{
  id: string;
  name: string;
  code: string;
  type: string;
  level: number;
}>> => {
  const { search, type, limit, enabled = true } = options || {};
  
  return useQuery({
    queryKey: ['organizations', 'flat', { search, type, limit }],
    queryFn: () => organizationService.getOrganizationsFlat({ search, type, limit }),
    enabled,
    staleTime: 5 * 60 * 1000, // Cache 5 phút
    cacheTime: 10 * 60 * 1000,
  });
};

/**
 * Hook để lấy accessible flat organizations (với permission check)
 * Dùng cho forms cần filter theo permissions
 */
export const useAccessibleOrganizationsFlat = (
  enabled: boolean = true
): UseQueryResult<Array<{
  id: string;
  name: string;
  code: string;
  type: string;
  level: number;
}>> => {
  return useQuery({
    queryKey: ['organizations', 'accessible-flat'],
    queryFn: () => organizationService.getAccessibleOrganizationsFlat(),
    enabled,
    staleTime: 5 * 60 * 1000,
    cacheTime: 10 * 60 * 1000,
  });
};

/**
 * Hook để lấy organization tree (cho trang tổ chức chính)
 * Với lazy loading children
 */
export const useOrganizationTree = () => {
  return useQuery({
    queryKey: ['organizations', 'tree'],
    queryFn: () => organizationService.getOrganizationTree(),
    staleTime: 3 * 60 * 1000, // Tree có thể cần refresh thường xuyên hơn
    cacheTime: 10 * 60 * 1000,
  });
};

/**
 * Hook để lấy children của 1 organization (lazy loading)
 */
export const useOrganizationChildren = (
  orgId: string,
  enabled: boolean = false
) => {
  return useQuery({
    queryKey: ['organizations', orgId, 'children'],
    queryFn: () => organizationService.getOrganizationChildren(orgId),
    enabled, // Chỉ fetch khi user expand
    staleTime: 5 * 60 * 1000,
  });
};
```

---

## Phase 4: Update ComboBox Components

### 4.1 Reusable OrganizationComboBox Component

**File:** `frontend/src/shared/components/OrganizationComboBox.tsx`

```tsx
import React, { useState, useMemo } from 'react';
import { useOrganizationsFlat } from '../hooks/useOrganizations';

interface OrganizationComboBoxProps {
  value: string;
  onChange: (orgId: string) => void;
  placeholder?: string;
  disabled?: boolean;
  error?: string;
  className?: string;
  filterType?: string; // Filter by org type
}

export const OrganizationComboBox: React.FC<OrganizationComboBoxProps> = ({
  value,
  onChange,
  placeholder = 'Chọn tổ chức...',
  disabled = false,
  error,
  className = '',
  filterType
}) => {
  const [search, setSearch] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  
  // Fetch organizations với caching
  const { data: organizations, isLoading } = useOrganizationsFlat({
    type: filterType,
    limit: 200 // Limit để tránh quá nhiều data
  });
  
  // Client-side filter (vì đã cache)
  const filteredOrgs = useMemo(() => {
    if (!organizations) return [];
    if (!search.trim()) return organizations;
    
    const searchLower = search.toLowerCase();
    return organizations.filter(org => 
      org.name.toLowerCase().includes(searchLower) ||
      org.code.toLowerCase().includes(searchLower)
    );
  }, [organizations, search]);
  
  // Get selected org name
  const selectedOrg = organizations?.find(o => o.id === value);
  const displayValue = isOpen ? search : (selectedOrg?.name || '');
  
  return (
    <div className="relative">
      <input
        type="text"
        value={displayValue}
        onChange={(e) => setSearch(e.target.value)}
        onFocus={() => {
          setIsOpen(true);
          setSearch('');
        }}
        onBlur={() => {
          setTimeout(() => setIsOpen(false), 200);
        }}
        placeholder={isLoading ? 'Đang tải...' : placeholder}
        disabled={disabled || isLoading}
        className={`w-full border rounded-md px-3 py-2 ${
          error ? 'border-red-500' : 'border-gray-300'
        } ${className}`}
      />
      
      {isOpen && (
        <div className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-auto">
          {filteredOrgs.length > 0 ? (
            filteredOrgs.map((org) => (
              <button
                key={org.id}
                type="button"
                onClick={() => {
                  onChange(org.id);
                  setIsOpen(false);
                  setSearch('');
                }}
                className={`w-full text-left px-3 py-2 hover:bg-gray-100 ${
                  value === org.id ? 'bg-blue-50 text-blue-700' : 'text-gray-900'
                }`}
              >
                <div className="font-medium">{org.name}</div>
                <div className="text-xs text-gray-500">{org.code}</div>
              </button>
            ))
          ) : (
            <div className="px-3 py-2 text-gray-500 text-sm">
              {isLoading ? 'Đang tải...' : 'Không tìm thấy kết quả'}
            </div>
          )}
        </div>
      )}
      
      {error && (
        <p className="mt-1 text-sm text-red-600">{error}</p>
      )}
    </div>
  );
};
```

### 4.2 Update UserRoleAssignmentModal

**File:** `frontend/src/features/users/components/UserRoleAssignmentModal.tsx`

```tsx
import { useOrganizationsFlat } from '../../../shared/hooks/useOrganizations';
import { OrganizationComboBox } from '../../../shared/components/OrganizationComboBox';

const UserRoleAssignmentModal: React.FC<UserRoleAssignmentModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
}) => {
  // ... existing state ...
  
  // ❌ XÓA: const [loadingOrganizations, setLoadingOrganizations] = useState(false);
  // ❌ XÓA: const loadOrganizations = async () => { ... }
  
  // ✅ THAY BẰNG: React Query hook với caching
  const { 
    data: organizations = [], 
    isLoading: loadingOrganizations 
  } = useOrganizationsFlat({
    enabled: isOpen // Chỉ fetch khi modal open
  });
  
  // ❌ XÓA: useEffect loadOrganizations
  
  // ... rest of component ...
  
  return (
    <div>
      {/* ... */}
      
      {/* Sử dụng reusable component */}
      <OrganizationComboBox
        value={assignment.organizationId || ''}
        onChange={(orgId) => handleOrganizationChange(assignment.id, orgId)}
        placeholder="Chọn tổ chức..."
        disabled={loadingOrganizations}
        error={assignment.error}
      />
      
      {/* ... */}
    </div>
  );
};
```

---

## Phase 5: Update Trang Tổ Chức (Tree View)

### 5.1 Fix Duplicate Fetch (CRITICAL)

**File:** `frontend/src/features/organizations/hooks/useOrganizationPage.ts`

```typescript
const fetchData = useCallback(async () => {
  setLoading(true);
  setError(null);
  try {
    if (!isDetailPage && !isSubDetailPage) {
      // Case: Main page
      const orgs = await fetchOrganizationTree();
      
      // ❌ XÓA DÒNG NÀY - Duplicate fetch!
      // await fetchAllLevel1Children(orgs);
      
      // ✅ Children đã có trong response của findTrees()
      // Không cần fetch lại!
    }
    
    await fetchStats();
  } catch (err) {
    setError(err instanceof Error ? err.message : 'Có lỗi xảy ra');
  } finally {
    setLoading(false);
  }
}, [isDetailPage, isSubDetailPage]);
```

### 5.2 Implement Lazy Loading Children

**File:** `frontend/src/features/organizations/components/OrganizationTreeItem.tsx`

```tsx
import { useOrganizationChildren } from '../../../shared/hooks/useOrganizations';

const OrganizationTreeItem: React.FC<Props> = ({ org, level, ... }) => {
  const [isExpanded, setIsExpanded] = useState(org.isExpanded || false);
  
  // Lazy load children when expanded
  const { 
    data: children, 
    isLoading: loadingChildren 
  } = useOrganizationChildren(
    org.id,
    isExpanded && org.hasChildren // Chỉ fetch khi expanded và có children
  );
  
  const handleToggleExpand = () => {
    setIsExpanded(!isExpanded);
    // Children sẽ tự động fetch bởi useOrganizationChildren
  };
  
  return (
    <div>
      {/* Expand button */}
      {org.hasChildren && (
        <button onClick={handleToggleExpand}>
          {loadingChildren ? '⏳' : isExpanded ? '▼' : '▶'}
        </button>
      )}
      
      {/* Org info */}
      <div>{org.name}</div>
      
      {/* Children */}
      {isExpanded && children && (
        <div className="ml-4">
          {children.map(child => (
            <OrganizationTreeItem key={child.id} org={child} level={level + 1} />
          ))}
        </div>
      )}
    </div>
  );
};
```

---

## 📊 So Sánh Performance

### Before Optimization:

**ComboBox (UserRoleAssignmentModal):**
```
Mở modal
  ↓
loadOrganizations() - No cache
  ↓
GET /organizations (ALL data: ~2MB)
  ↓
Parse children, memberCount (không cần)
  ↓
⏱️ 2-3 giây
```

**Trang Tổ Chức:**
```
Load page
  ↓
GET /organizations/tree (ALL: ~2MB)
  ↓
Fetch children lại (duplicate!)
  ↓
GET /organizations/:id/children (x10 orgs)
  ↓
⏱️ 8-12 giây
```

### After Optimization:

**ComboBox (với Flat API + Cache):**
```
Mở modal lần 1
  ↓
GET /organizations/flat (~100KB)
  ↓
Cache 5 phút
  ↓
⏱️ 0.5 giây

Mở modal lần 2-N (trong 5 phút)
  ↓
Dùng cache (0ms)
  ↓
⏱️ 0ms (instant!)
```

**Trang Tổ Chức (với Lazy Loading):**
```
Load page
  ↓
GET /organizations/tree (level 1 only: ~200KB)
  ↓
⏱️ 1-2 giây

User click expand
  ↓
GET /organizations/:id/children (cached)
  ↓
⏱️ 0.3 giây
```

---

## 🎯 Migration Checklist

### Priority 1: CRITICAL (Làm ngay)

- [ ] **Backend: Tạo `/organizations/flat` endpoint**
  - [ ] Controller method
  - [ ] Service method `findFlat()`
  - [ ] Test API với Postman/Swagger

- [ ] **Backend: Tạo `/organizations/accessible-flat` endpoint**
  - [ ] Controller method
  - [ ] Service method `getAccessibleFlat()`
  - [ ] Test với user có permissions

- [ ] **Fix duplicate fetch trong trang tổ chức**
  - [ ] Comment/xóa `fetchAllLevel1Children()`
  - [ ] Test xem có lỗi gì không

### Priority 2: HIGH (Tuần này)

- [ ] **Setup React Query**
  - [ ] Install `@tanstack/react-query`
  - [ ] Setup QueryClient trong App.tsx
  - [ ] Test basic query

- [ ] **Tạo custom hooks**
  - [ ] `useOrganizationsFlat()`
  - [ ] `useAccessibleOrganizationsFlat()`
  - [ ] `useOrganizationChildren()`

- [ ] **Tạo OrganizationComboBox component**
  - [ ] Reusable component
  - [ ] With search
  - [ ] With caching

### Priority 3: MEDIUM (Tuần sau)

- [ ] **Migrate các modal/form sang dùng flat API**
  - [ ] UserRoleAssignmentModal
  - [ ] CreateUserModal
  - [ ] EditUserModal
  - [ ] ActivityForm (CTXH)
  - [ ] PaymentCampaignForm

- [ ] **Implement lazy loading cho tree**
  - [ ] Update OrganizationTreeItem
  - [ ] Test expand/collapse

### Priority 4: NICE TO HAVE

- [ ] **Database indexes**
  ```sql
  CREATE INDEX idx_org_name ON organizations(LOWER(name));
  CREATE INDEX idx_org_code ON organizations(LOWER(code));
  ```

- [ ] **React Query Devtools**
  - Setup devtools để monitor cache

---

## 📈 Kết Quả Kỳ Vọng

| Metric | Before | After | Improvement |
|--------|--------|-------|-------------|
| **ComboBox Load Time (1st)** | 2-3s | 0.5s | **80% faster** |
| **ComboBox Load Time (cached)** | 2-3s | 0ms | **Instant** |
| **Tree Page Initial Load** | 8-12s | 1-2s | **85% faster** |
| **Data Transfer (ComboBox)** | 2 MB | 100 KB | **95% less** |
| **Data Transfer (Tree)** | 5 MB | 500 KB | **90% less** |
| **API Calls (Tree)** | 15-20 | 1-2 | **90% less** |

---

## 🔥 Quick Start Guide

### Bắt đầu ngay hôm nay:

1. **Backend:**
   ```bash
   # Mở file organizations.controller.ts
   # Copy code từ Phase 1.1 vào
   # Mở file organizations.service.ts
   # Copy code từ Phase 1.2 vào
   # Test với Swagger
   ```

2. **Frontend:**
   ```bash
   # Install React Query
   npm install @tanstack/react-query @tanstack/react-query-devtools
   
   # Setup QueryClient trong App.tsx
   # Tạo file hooks/useOrganizations.ts
   # Test với 1 component đơn giản
   ```

3. **Migrate 1 component để test:**
   ```bash
   # Chọn UserRoleAssignmentModal
   # Replace loadOrganizations với useOrganizationsFlat
   # Test và so sánh performance
   ```

---

## 💡 Best Practices

### DO's ✅

- ✅ Dùng `/flat` API cho tất cả ComboBox/Dropdown
- ✅ Dùng React Query để cache
- ✅ Lazy load children trong tree view
- ✅ Filter trên client-side khi đã có cache
- ✅ Set staleTime hợp lý (5 phút cho flat data)

### DON'Ts ❌

- ❌ Dùng `/organizations` cho ComboBox (quá nhiều data)
- ❌ Dùng `/tree` cho Dropdown (sai use case)
- ❌ Fetch lại data mỗi lần mở modal (waste!)
- ❌ Load toàn bộ tree ngay từ đầu
- ❌ Quên cleanup cache khi data thay đổi

---

## 🐛 Troubleshooting

**Q: Cache không update khi tạo org mới?**
A: Invalidate cache sau mutation:
```typescript
const queryClient = useQueryClient();
await createOrganization(data);
queryClient.invalidateQueries(['organizations']);
```

**Q: Search chậm khi có nhiều results?**
A: Limit results hoặc dùng virtualization:
```typescript
useOrganizationsFlat({ limit: 100 })
```

**Q: Tree không hiện children?**
A: Check `hasChildren` flag và lazy loading logic

---

**Version:** 1.0  
**Date:** 3/11/2025  
**Status:** 🚀 READY TO IMPLEMENT
