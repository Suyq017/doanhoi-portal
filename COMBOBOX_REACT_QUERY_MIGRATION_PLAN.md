# Kế Hoạch Migration: Combobox Search → TanStack Query

## 📋 Tổng Quan

Migration các combobox search (User Search, Organization Search) từ manual state management sang TanStack Query để có:
- ⚡ Better caching & deduplication
- 🔄 Auto-refetch & stale data management
- 🎯 Optimized debouncing & cancellation
- 📊 Loading & error states management
- 🚀 Better performance với large datasets

---

## 🎯 Scope

### **Components cần migrate:**

1. **UserSearchCombobox** ✅
   - File: `frontend/src/features/users/components/UserSearchCombobox.tsx`
   - Used in: User management, Add member modal
   - Current: Manual fetch với `userService.getUsers()`

2. **AddMemberModal (inline search)** ✅
   - File: `frontend/src/features/organizations/components/AddMemberModal.tsx`
   - Current: Manual search trong component

3. **MultiSelectOrganizationCombobox** ✅
   - File: `frontend/src/features/users/components/MultiSelectOrganizationCombobox.tsx`
   - Current: Manual fetch organizations

4. **RoleCombobox** (Optional - P2)
   - File: `frontend/src/features/users/components/RoleCombobox.tsx`
   - Current: Static data (roles), không cần query

---

## 📊 Current State Analysis

### **1. UserSearchCombobox - Current Implementation**

```tsx
// ❌ BEFORE: Manual state management
const UserSearchCombobox: React.FC<Props> = ({ users, onUserSelect, ... }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  
  // ❌ Manual filtering in component
  const filteredUsers = users.filter(user => {
    // Filter logic...
  });
  
  // ❌ Users passed as prop - parent must fetch
  return (/* JSX */);
};
```

**Problems:**
- ❌ Parent component must handle fetching
- ❌ No caching - refetch mỗi lần search
- ❌ Filtering chạy trên client (slow với large datasets)
- ❌ No debouncing optimization
- ❌ No request cancellation

---

### **2. AddMemberModal - Current Implementation**

```tsx
// ❌ BEFORE: Manual debouncing + fetch
const AddMemberModal: React.FC<Props> = ({ ... }) => {
  const [searchResults, setSearchResults] = useState<User[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  
  const searchUsers = useCallback(async (searchTerm: string) => {
    setIsSearching(true);
    try {
      const response = await userService.getUsers({
        search: searchTerm,
        limit: 10
      });
      setSearchResults(response.users);
    } catch (err) {
      // Error handling
    } finally {
      setIsSearching(false);
    }
  }, []);
  
  // ❌ Manual debounce
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (userCode && !selectedUser) {
        searchUsers(userCode);
      }
    }, 300);
    return () => clearTimeout(timeoutId);
  }, [userCode]);
  
  return (/* JSX */);
};
```

**Problems:**
- ❌ Manual debouncing logic
- ❌ No caching between searches
- ❌ Duplicate loading state management
- ❌ No request cancellation (race conditions possible)
- ❌ Code duplication across components

---

### **3. MultiSelectOrganizationCombobox - Current Implementation**

```tsx
// ❌ BEFORE: Similar issues như UserSearchCombobox
const MultiSelectOrganizationCombobox: React.FC<Props> = ({ 
  organizations, 
  onOrganizationsChange,
  ...
}) => {
  // ❌ Organizations passed as prop
  // ❌ Parent must handle fetching
  // ❌ No search optimization
  
  return (/* JSX */);
};
```

**Problems:** Tương tự UserSearchCombobox

---

## ⚡ Solution: TanStack Query Migration

### **Architecture Overview**

```
┌─────────────────────────────────────────────────────────────┐
│                     Query Hooks Layer                        │
│  (Centralized data fetching với caching & optimization)     │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  useUserSearch(searchTerm, options)                         │
│  useOrganizationSearch(searchTerm, options)                 │
│  useRolesList()                                              │
│                                                              │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│                   Combobox Components                        │
│         (Focus on UI/UX, delegate fetching to hooks)        │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  UserSearchCombobox                                          │
│  MultiSelectOrganizationCombobox                            │
│  AddMemberModal (with inline search)                        │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

---

## 🎯 Phase 1: Create Query Hooks (P0 - Critical)

### **Step 1.1: Create User Search Hook**

**File**: `frontend/src/shared/hooks/queries/useUserQueries.ts` (NEW)

```typescript
import { useQuery } from '@tanstack/react-query';
import { userService } from '../../services/userService';
import { CACHE_CONFIG } from '../../config/queryClient';

/**
 * Query keys for user-related queries
 */
export const userKeys = {
  all: ['users'] as const,
  lists: () => [...userKeys.all, 'list'] as const,
  list: (filters: string) => [...userKeys.lists(), { filters }] as const,
  search: (searchTerm: string, limit?: number) => 
    [...userKeys.all, 'search', searchTerm, { limit }] as const,
};

/**
 * Hook for searching users
 * Auto-debounces, caches results, cancels outdated requests
 * 
 * @param searchTerm - Search query
 * @param options - Query options
 */
export const useUserSearch = (
  searchTerm: string,
  options?: {
    limit?: number;
    enabled?: boolean; // Allow manual control
  }
) => {
  const { limit = 10, enabled = true } = options || {};
  
  return useQuery({
    queryKey: userKeys.search(searchTerm, limit),
    queryFn: async ({ signal }) => {
      // ✅ Automatic request cancellation
      const response = await userService.getUsers({
        search: searchTerm,
        limit,
      }, signal); // Pass abort signal
      
      return response.users;
    },
    
    // ✅ Only fetch if searchTerm has min length
    enabled: enabled && searchTerm.length >= 2,
    
    // ✅ Cache for 2 minutes (users don't change frequently)
    staleTime: 2 * 60 * 1000,
    gcTime: 5 * 60 * 1000,
    
    // ✅ Don't refetch on window focus (search results are ephemeral)
    refetchOnWindowFocus: false,
    
    // ✅ Keep previous data while fetching new results (smooth UX)
    placeholderData: (previousData) => previousData,
  });
};

/**
 * Hook for getting user by code (for validation)
 */
export const useUserByCode = (code: string) => {
  return useQuery({
    queryKey: [...userKeys.all, 'byCode', code],
    queryFn: async () => {
      const response = await userService.getUsers({
        search: code,
        limit: 1,
      });
      return response.users[0] || null;
    },
    enabled: code.length >= 2,
    staleTime: 2 * 60 * 1000,
  });
};
```

**Key Features:**
- ✅ **Auto caching**: Same search → instant results from cache
- ✅ **Auto cancellation**: New search → cancel old request
- ✅ **Enabled control**: Only fetch when searchTerm.length >= 2
- ✅ **Placeholder data**: Keep old results while loading new (no flicker)
- ✅ **Optimized refetch**: Don't refetch on window focus (not needed for search)

---

### **Step 1.2: Create Organization Search Hook**

**File**: `frontend/src/shared/hooks/queries/useOrganizationQueries.ts` (UPDATE)

```typescript
// Add to existing file

/**
 * Hook for searching organizations
 * Similar to useUserSearch but for organizations
 */
export const useOrganizationSearch = (
  searchTerm: string,
  options?: {
    limit?: number;
    type?: string; // Filter by org type
    enabled?: boolean;
  }
) => {
  const { limit = 20, type, enabled = true } = options || {};
  
  return useQuery({
    queryKey: [
      ...organizationKeys.all, 
      'search', 
      searchTerm, 
      { limit, type }
    ],
    queryFn: async ({ signal }) => {
      const response = await organizationService.searchOrganizations({
        search: searchTerm,
        limit,
        type,
      }, signal);
      
      return response.organizations;
    },
    
    enabled: enabled && searchTerm.length >= 1, // Orgs: min 1 char
    staleTime: 3 * 60 * 1000, // 3 minutes
    gcTime: 10 * 60 * 1000,
    refetchOnWindowFocus: false,
    placeholderData: (previousData) => previousData,
  });
};

/**
 * Hook for getting all organizations (for combobox with full list)
 * Used when we want to show all orgs initially
 */
export const useOrganizationsList = (
  filters?: {
    type?: string;
    isActive?: boolean;
  }
) => {
  return useQuery({
    queryKey: [...organizationKeys.all, 'listForCombobox', filters],
    queryFn: async () => {
      const response = await organizationService.getOrganizations(filters);
      return response.organizations;
    },
    staleTime: 5 * 60 * 1000,
    gcTime: 15 * 60 * 1000,
  });
};
```

---

### **Step 1.3: Update Services to Support AbortSignal**

**File**: `frontend/src/shared/services/userService.ts` (UPDATE)

```typescript
class UserService {
  // ✅ Add optional signal parameter
  async getUsers(
    params: {
      search?: string;
      limit?: number;
      offset?: number;
      // ... other params
    },
    signal?: AbortSignal // ✅ NEW: For request cancellation
  ): Promise<{ users: User[]; total: number }> {
    const queryParams = new URLSearchParams();
    
    if (params.search) queryParams.append('search', params.search);
    if (params.limit) queryParams.append('limit', params.limit.toString());
    // ... other params
    
    // ✅ Pass signal to apiClient
    return apiClient.get<{ users: User[]; total: number }>(
      `/users?${queryParams}`,
      { signal } // ✅ NEW
    );
  }
}
```

**File**: `frontend/src/shared/services/apiClient.ts` (UPDATE)

```typescript
class ApiClient {
  async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${this.baseURL}${endpoint}`;
    
    // ... existing code ...
    
    // ✅ Signal is already supported by fetch API
    const response = await fetch(url, {
      ...options, // Contains signal if provided
      headers,
    });
    
    // ... existing code ...
  }
}
```

---

## 🎯 Phase 2: Migrate Components (P0)

### **Step 2.1: Migrate UserSearchCombobox**

**File**: `frontend/src/features/users/components/UserSearchCombobox.tsx` (UPDATE)

```typescript
import React, { useState, useRef, useEffect } from 'react';
import { useUserSearch } from '../../../shared/hooks/queries/useUserQueries';
// ... other imports

interface UserSearchComboboxProps {
  selectedUser: User | null;
  onUserSelect: (user: User | null) => void;
  disabled?: boolean;
  placeholder?: string;
  error?: string;
  className?: string;
  // ✅ REMOVED: users prop (fetching internally now)
  // ✅ REMOVED: loading prop (query handles it)
}

const UserSearchCombobox: React.FC<UserSearchComboboxProps> = ({
  selectedUser,
  onUserSelect,
  disabled = false,
  placeholder,
  error,
  className = '',
}) => {
  const { t } = useTranslation(['users']);
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  
  // ✅ TanStack Query hook
  const { 
    data: users = [], 
    isLoading, 
    isFetching,
  } = useUserSearch(debouncedSearch, {
    limit: 10,
    enabled: isOpen, // ✅ Only fetch when dropdown is open
  });
  
  // ✅ Client-side debounce (very fast, no request spam)
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchTerm);
    }, 300);
    
    return () => clearTimeout(timer);
  }, [searchTerm]);
  
  // ... rest of component logic (keyboard nav, rendering, etc.)
  
  return (
    <div className={`relative ${className}`} ref={comboboxRef}>
      <input
        ref={inputRef}
        type="text"
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
        onFocus={() => setIsOpen(true)}
        disabled={disabled}
        placeholder={placeholder}
        // ... other props
      />
      
      {/* Loading indicator */}
      {isFetching && (
        <div className="absolute right-3 top-3">
          <Loader className="animate-spin" />
        </div>
      )}
      
      {/* Dropdown with results */}
      {isOpen && (
        <ul>
          {isLoading ? (
            <li>Loading...</li>
          ) : users.length === 0 ? (
            <li>No results</li>
          ) : (
            users.map(user => (
              <li key={user.id} onClick={() => onUserSelect(user)}>
                {user.familyName} {user.givenName}
              </li>
            ))
          )}
        </ul>
      )}
    </div>
  );
};

export default UserSearchCombobox;
```

**Changes:**
- ✅ Removed `users` and `loading` props
- ✅ Use `useUserSearch` hook internally
- ✅ `enabled: isOpen` → only fetch when dropdown open
- ✅ Client debouncing (300ms) + Query caching
- ✅ Auto request cancellation (built-in)

---

### **Step 2.2: Migrate AddMemberModal**

**File**: `frontend/src/features/organizations/components/AddMemberModal.tsx` (UPDATE)

```typescript
import { useUserSearch } from '../../../shared/hooks/queries/useUserQueries';

const AddMemberModal: React.FC<Props> = ({ ... }) => {
  const [userCode, setUserCode] = useState('');
  const [debouncedCode, setDebouncedCode] = useState('');
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [showDropdown, setShowDropdown] = useState(false);
  
  // ✅ Use React Query hook
  const { 
    data: searchResults = [], 
    isLoading: isSearching 
  } = useUserSearch(debouncedCode, {
    limit: 10,
    enabled: showDropdown && !selectedUser, // Only when needed
  });
  
  // ✅ Client-side debounce
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedCode(userCode);
    }, 300);
    return () => clearTimeout(timer);
  }, [userCode]);
  
  // ✅ Auto show/hide dropdown based on search
  useEffect(() => {
    if (userCode.length >= 2 && !selectedUser) {
      setShowDropdown(true);
    } else {
      setShowDropdown(false);
    }
  }, [userCode, selectedUser]);
  
  // ❌ REMOVED: searchUsers callback
  // ❌ REMOVED: manual debounce useEffect
  // ❌ REMOVED: setIsSearching, setSearchResults
  
  const handleSelectUser = (user: User) => {
    setSelectedUser(user);
    setUserCode(`${user.familyName} ${user.givenName} (${user.code})`);
    setShowDropdown(false);
  };
  
  // ... rest of component
};
```

**Changes:**
- ✅ Removed manual `searchUsers` callback
- ✅ Removed manual debounce logic
- ✅ Use `useUserSearch` hook
- ✅ Simplified state management
- ✅ Auto caching & cancellation

---

### **Step 2.3: Migrate MultiSelectOrganizationCombobox**

**File**: `frontend/src/features/users/components/MultiSelectOrganizationCombobox.tsx` (UPDATE)

```typescript
import { useOrganizationSearch } from '../../../shared/hooks/queries/useOrganizationQueries';

interface Props {
  selectedOrganizations: Organization[];
  onOrganizationsChange: (orgs: Organization[]) => void;
  // ✅ REMOVED: organizations prop
  // ✅ REMOVED: loading prop
  // ... other props
}

const MultiSelectOrganizationCombobox: React.FC<Props> = ({
  selectedOrganizations,
  onOrganizationsChange,
  ...
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  
  // ✅ Use React Query hook
  const { 
    data: organizations = [], 
    isLoading 
  } = useOrganizationSearch(debouncedSearch, {
    limit: 20,
    enabled: isOpen,
  });
  
  // ✅ Debounce
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchTerm);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchTerm]);
  
  // Filter out already selected orgs
  const availableOrgs = organizations.filter(
    org => !selectedOrganizations.some(selected => selected.id === org.id)
  );
  
  // ... rest of component
};
```

---

## 🎯 Phase 3: Advanced Optimizations (P1)

### **Step 3.1: Prefetching Common Searches**

```typescript
// frontend/src/features/organizations/hooks/useOrganizationPage.ts

import { useQueryClient } from '@tanstack/react-query';
import { userKeys } from '../../../shared/hooks/queries/useUserQueries';

export const useOrganizationPage = () => {
  const queryClient = useQueryClient();
  
  // ✅ Prefetch common searches when page loads
  useEffect(() => {
    // Prefetch empty search (all users) for faster dropdown open
    queryClient.prefetchQuery({
      queryKey: userKeys.search('', 10),
      queryFn: () => userService.getUsers({ search: '', limit: 10 }),
    });
  }, [queryClient]);
  
  // ... rest of hook
};
```

---

### **Step 3.2: Infinite Scroll for Large Datasets**

```typescript
// frontend/src/shared/hooks/queries/useUserQueries.ts

import { useInfiniteQuery } from '@tanstack/react-query';

/**
 * Hook for infinite scroll user search
 * Loads more results as user scrolls
 */
export const useUserSearchInfinite = (searchTerm: string) => {
  return useInfiniteQuery({
    queryKey: [...userKeys.all, 'searchInfinite', searchTerm],
    queryFn: async ({ pageParam = 0 }) => {
      const response = await userService.getUsers({
        search: searchTerm,
        limit: 20,
        offset: pageParam,
      });
      return {
        users: response.users,
        nextOffset: response.users.length === 20 ? pageParam + 20 : undefined,
      };
    },
    initialPageParam: 0,
    getNextPageParam: (lastPage) => lastPage.nextOffset,
    enabled: searchTerm.length >= 2,
  });
};
```

---

### **Step 3.3: Smart Cache Invalidation**

```typescript
// Invalidate user search cache when user is added/updated
const addMemberMutation = useMutation({
  mutationFn: (data) => organizationService.addMember(data),
  onSuccess: () => {
    // ✅ Invalidate user search cache (user might have new org)
    queryClient.invalidateQueries({ 
      queryKey: userKeys.all 
    });
    
    // ✅ Also invalidate org stats
    queryClient.invalidateQueries({ 
      queryKey: organizationKeys.stats() 
    });
  },
});
```

---

## 🧪 Testing Strategy

### **Manual Testing Checklist:**

**UserSearchCombobox:**
- [ ] Open dropdown → Should NOT fetch until user types
- [ ] Type "a" → Should NOT fetch (min 2 chars)
- [ ] Type "ab" → Should fetch after 300ms debounce
- [ ] Type "abc" quickly → Should cancel "ab" request, only fetch "abc"
- [ ] Search "John" → Close dropdown → Re-open → Should use cache (instant)
- [ ] Wait 2 minutes → Search "John" again → Should refetch (stale)
- [ ] Type "xyz" → No results → Should show "No results"
- [ ] Network error → Should show error message

**AddMemberModal:**
- [ ] Similar tests như UserSearchCombobox
- [ ] Select user → Dropdown closes → Code fills in correctly
- [ ] Clear selection → Can search again

**MultiSelectOrganizationCombobox:**
- [ ] Can select multiple orgs
- [ ] Selected orgs are filtered out from search results
- [ ] Removing selected org → It appears in search again

**Performance:**
- [ ] Open DevTools → React Query tab
- [ ] Check cache entries are created correctly
- [ ] Check stale time works (green → grey after 2min)
- [ ] Check garbage collection (cache cleared after gcTime)
- [ ] No memory leaks (cache doesn't grow infinitely)

---

### **Load Testing:**

```typescript
// Test với 10,000 users
const mockUsers = Array.from({ length: 10000 }, (_, i) => ({
  id: `user-${i}`,
  code: `USER${i}`,
  familyName: `Family${i}`,
  givenName: `Given${i}`,
  email: `user${i}@example.com`,
}));

// Expected:
// - Search results return < 100ms (with backend optimization)
// - Cache hit return < 1ms
// - No UI lag when scrolling results
```

---

## 📊 Expected Results

### **Before Migration:**

```
User Search Performance:
├─ First search: 200-500ms (network + render)
├─ Re-search same term: 200-500ms (no cache)
├─ Type quickly: Multiple requests (race conditions)
├─ Memory: Growing (no cleanup)
└─ UX: ❌ Slow, flickering

Organization Search Performance:
├─ Similar issues
└─ Parent must manage state
```

### **After Migration:**

```
User Search Performance:
├─ First search: 200-500ms (network + render)
├─ Re-search same term: <1ms ⚡ (cache hit)
├─ Type quickly: 1 request (auto cancellation)
├─ Memory: Stable (auto cleanup after 5min)
└─ UX: ✅ Fast, smooth

Organization Search Performance:
├─ First search: 150-300ms
├─ Re-search: <1ms ⚡
├─ Cache shared across components
└─ UX: ✅ Instant
```

**Improvements:**
- 🚀 **200-500x faster** for cached searches
- 🎯 **Zero race conditions** (auto cancellation)
- 💾 **Smart caching** (2-5min stale time)
- 🧹 **Auto cleanup** (no memory leaks)
- 📉 **~50% less code** (removed manual logic)

---

## 📝 Implementation Roadmap

### **Week 1: Query Hooks Setup**
- [ ] Day 1-2: Create `useUserQueries.ts` với `useUserSearch`
- [ ] Day 2-3: Update `useOrganizationQueries.ts` với `useOrganizationSearch`
- [ ] Day 3: Update services to support AbortSignal
- [ ] Day 4: Test hooks independently với mock data
- [ ] Day 5: Code review + adjustments

### **Week 2: Component Migration**
- [ ] Day 1-2: Migrate `UserSearchCombobox`
- [ ] Day 2-3: Migrate `AddMemberModal`
- [ ] Day 3-4: Migrate `MultiSelectOrganizationCombobox`
- [ ] Day 4-5: Update all usage sites
- [ ] Day 5: Integration testing

### **Week 3: Optimization & Testing**
- [ ] Day 1-2: Implement prefetching
- [ ] Day 2-3: Add infinite scroll (if needed)
- [ ] Day 3-4: Performance testing & tuning
- [ ] Day 4-5: User acceptance testing
- [ ] Day 5: Documentation + deployment

---

## 🚀 Quick Start Guide

### **For Developers:**

**1. Install dependencies (already done):**
```bash
# Already installed in previous step
npm install @tanstack/react-query @tanstack/react-query-devtools
```

**2. Create query hooks:**
```bash
# Create new file
touch frontend/src/shared/hooks/queries/useUserQueries.ts

# Copy implementation từ Phase 1
```

**3. Migrate one component:**
```typescript
// Open UserSearchCombobox.tsx
// Remove: users prop, loading prop, manual fetch logic
// Add: useUserSearch hook
// Test in isolation
```

**4. Test with DevTools:**
```typescript
// Open React Query DevTools (bottom right)
// Search for "users" queries
// Check cache behavior
```

**5. Repeat for other components**

---

## 📚 Additional Resources

- TanStack Query Docs: https://tanstack.com/query/latest
- Best Practices: https://tkdodo.eu/blog/practical-react-query
- Debouncing Guide: https://tanstack.com/query/latest/docs/react/guides/filters#debouncing

---

## 🎯 Success Metrics

**Technical:**
- ✅ Cache hit rate > 80% (for repeated searches)
- ✅ Search latency < 50ms (cached), < 500ms (fresh)
- ✅ Zero race conditions
- ✅ Memory stable (no leaks)
- ✅ Code reduction: ~40-50%

**User Experience:**
- ✅ Search feels instant for repeated queries
- ✅ No flickering/jumping
- ✅ Smooth scrolling with large datasets
- ✅ Clear loading states

---

*Kế hoạch được tạo ngày: 3 tháng 11, 2025*
*Estimated effort: 3 weeks (1 developer)*
*Priority: P1 (High impact, medium effort)*
