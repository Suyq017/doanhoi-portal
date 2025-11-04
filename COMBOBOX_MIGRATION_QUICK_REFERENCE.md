# Quick Reference: Combobox Migration to TanStack Query

## 🎯 TL;DR

**Goal**: Migrate User/Organization search comboboxes từ manual state → TanStack Query

**Benefits**: 
- ⚡ 200-500x faster (cached searches)
- 🎯 Auto debounce + cancellation
- 💾 Smart caching (no refetch unnecessarily)
- 🧹 Auto cleanup (no memory leaks)

---

## 📋 Quick Checklist

### **Phase 1: Setup Query Hooks** (2-3 days)

```typescript
// ✅ File: frontend/src/shared/hooks/queries/useUserQueries.ts (NEW)
export const useUserSearch = (searchTerm: string, options?) => {
  return useQuery({
    queryKey: ['users', 'search', searchTerm, options],
    queryFn: () => userService.getUsers({ search: searchTerm, ...options }),
    enabled: searchTerm.length >= 2,
    staleTime: 2 * 60 * 1000, // 2 minutes
    placeholderData: (prev) => prev, // Keep old data while loading
  });
};
```

```typescript
// ✅ File: frontend/src/shared/hooks/queries/useOrganizationQueries.ts (UPDATE)
export const useOrganizationSearch = (searchTerm: string, options?) => {
  return useQuery({
    queryKey: ['organizations', 'search', searchTerm, options],
    queryFn: () => orgService.searchOrganizations({ search: searchTerm }),
    enabled: searchTerm.length >= 1,
    staleTime: 3 * 60 * 1000,
    placeholderData: (prev) => prev,
  });
};
```

---

### **Phase 2: Migrate Components** (3-4 days)

#### **Before:**
```typescript
// ❌ Manual fetching
const Component = ({ users, loading, onSearch }) => {
  const [searchTerm, setSearchTerm] = useState('');
  
  useEffect(() => {
    const timer = setTimeout(() => {
      onSearch(searchTerm); // Parent must handle
    }, 300);
    return () => clearTimeout(timer);
  }, [searchTerm]);
  
  return <input onChange={e => setSearchTerm(e.target.value)} />;
};
```

#### **After:**
```typescript
// ✅ TanStack Query
const Component = ({ onSelect }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  
  // Client-side debounce (fast, no request spam)
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(searchTerm), 300);
    return () => clearTimeout(timer);
  }, [searchTerm]);
  
  // React Query handles fetching, caching, cancellation
  const { data: users = [], isLoading } = useUserSearch(debouncedSearch);
  
  return (
    <>
      <input onChange={e => setSearchTerm(e.target.value)} />
      {isLoading && <Spinner />}
      <Results users={users} onSelect={onSelect} />
    </>
  );
};
```

---

## 🚀 Migration Steps

### **Step 1: Create useUserQueries.ts**
```bash
# Create file
touch frontend/src/shared/hooks/queries/useUserQueries.ts

# Copy template từ COMBOBOX_REACT_QUERY_MIGRATION_PLAN.md Phase 1.1
```

### **Step 2: Update apiClient.ts**
```typescript
// Add signal support
async get<T>(url: string, options?: { signal?: AbortSignal }) {
  return this.request<T>(url, { ...options, method: 'GET' });
}
```

### **Step 3: Update userService.ts**
```typescript
async getUsers(params, signal?: AbortSignal) {
  return apiClient.get(`/users?${params}`, { signal });
}
```

### **Step 4: Migrate UserSearchCombobox**
```typescript
// Remove props: users, loading
// Add: useUserSearch hook
// Remove: manual fetch logic
// Keep: UI/UX logic (keyboard nav, dropdown, etc.)
```

### **Step 5: Migrate AddMemberModal**
```typescript
// Remove: searchUsers callback
// Remove: manual debounce
// Add: useUserSearch hook
// Simplify state management
```

### **Step 6: Test**
```bash
# Open React Query DevTools
# Search for "John" → Check cache
# Search for "Jane" → Check new query
# Search for "John" again → Check cache hit (instant!)
```

---

## 📊 Key Patterns

### **Pattern 1: Debouncing**
```typescript
// Client-side debounce (300ms)
const [searchTerm, setSearchTerm] = useState('');
const [debouncedSearch, setDebouncedSearch] = useState('');

useEffect(() => {
  const timer = setTimeout(() => setDebouncedSearch(searchTerm), 300);
  return () => clearTimeout(timer);
}, [searchTerm]);

// Use debouncedSearch in query
const { data } = useUserSearch(debouncedSearch);
```

### **Pattern 2: Conditional Fetching**
```typescript
// Only fetch when dropdown is open AND min length
const { data } = useUserSearch(searchTerm, {
  enabled: isOpen && searchTerm.length >= 2,
});
```

### **Pattern 3: Placeholder Data**
```typescript
// Keep old results while loading new (no flicker)
const { data } = useUserSearch(searchTerm, {
  placeholderData: (previousData) => previousData,
});
```

### **Pattern 4: Auto Cancellation**
```typescript
// TanStack Query auto-cancels old requests
// Just use the hook normally, no manual cancellation needed!
```

---

## 🎯 Testing Checklist

- [ ] Type fast → Only 1 request (last one)
- [ ] Search "John" → Close → Re-open → Instant (cache hit)
- [ ] Wait 2 minutes → Search "John" → Refetch (stale)
- [ ] Network error → Show error message
- [ ] No results → Show "No results"
- [ ] Open DevTools → Check cache entries
- [ ] Memory stable (no leaks)

---

## 🐛 Common Issues

**Issue 1: Too many requests**
```typescript
// ❌ Wrong: Triggers on every keystroke
const { data } = useUserSearch(searchTerm);

// ✅ Right: Add debouncing
const [debouncedSearch, setDebouncedSearch] = useState('');
useEffect(() => {
  const timer = setTimeout(() => setDebouncedSearch(searchTerm), 300);
  return () => clearTimeout(timer);
}, [searchTerm]);
const { data } = useUserSearch(debouncedSearch);
```

**Issue 2: Fetching when not needed**
```typescript
// ❌ Wrong: Fetches even when dropdown closed
const { data } = useUserSearch(searchTerm);

// ✅ Right: Use enabled option
const { data } = useUserSearch(searchTerm, {
  enabled: isOpen && searchTerm.length >= 2,
});
```

**Issue 3: Flickering during search**
```typescript
// ❌ Wrong: Results disappear while loading
const { data = [] } = useUserSearch(searchTerm);

// ✅ Right: Keep previous data
const { data = [] } = useUserSearch(searchTerm, {
  placeholderData: (prev) => prev,
});
```

---

## 💡 Pro Tips

1. **Use React Query DevTools**: Mở để debug cache behavior
2. **Start simple**: Migrate 1 component trước, test kỹ, rồi mới migrate tiếp
3. **Keep UI logic**: Chỉ thay fetching logic, giữ nguyên UI/UX
4. **Test edge cases**: Empty search, network error, no results
5. **Monitor performance**: Check cache hit rate trong DevTools

---

## 📚 Files to Modify

```
frontend/src/
├── shared/
│   ├── hooks/queries/
│   │   ├── useUserQueries.ts         (NEW) ⭐
│   │   └── useOrganizationQueries.ts (UPDATE)
│   └── services/
│       ├── userService.ts             (UPDATE - add signal)
│       └── apiClient.ts               (UPDATE - ensure signal support)
└── features/
    ├── users/components/
    │   ├── UserSearchCombobox.tsx           (UPDATE) ⭐
    │   └── MultiSelectOrganizationCombobox.tsx (UPDATE)
    └── organizations/components/
        └── AddMemberModal.tsx               (UPDATE) ⭐
```

---

## 🎉 Expected Results

**Before:**
```
Search "John":
  ├─ Request: 500ms
  └─ Total: 500ms

Re-search "John":
  ├─ Request: 500ms (no cache!)
  └─ Total: 500ms

Type "abc" fast:
  ├─ Request "a": 500ms
  ├─ Request "ab": 500ms
  ├─ Request "abc": 500ms (race condition!)
  └─ Total: 3 requests
```

**After:**
```
Search "John":
  ├─ Request: 500ms
  └─ Total: 500ms

Re-search "John":
  ├─ Cache hit! ⚡
  └─ Total: <1ms (500x faster!)

Type "abc" fast:
  ├─ Debounced + auto-cancel
  ├─ Request "abc": 500ms (only 1 request!)
  └─ Total: 1 request ✅
```

---

*Quick reference - Last updated: November 3, 2025*
