# 🧪 Hướng Dẫn Testing TanStack Query Cache - Users Page

## ✅ Implementation Status

### Phase 1-3: HOÀN THÀNH ✅
- ✅ `useUserQueries.ts` - Query hooks với cache keys, mutations, optimistic updates
- ✅ `useUserList.ts` - Migrated sang React Query (backward compatible)
- ✅ `useUserManagement.ts` - Integrated mutations với optimistic updates
- ✅ No TypeScript errors
- ✅ Backward compatible (components không cần sửa code)

### Phase 4: Testing & Verification

---

## 🧪 Testing Checklist

### 1️⃣ Pagination Cache (CRITICAL)

**Mục tiêu:** Verify cache hit khi quay lại trang đã visit

**Test Steps:**
1. ✅ Mở Users Page
2. ✅ Load page 1 → Ghi nhận thời gian load
3. ✅ Click page 2 → Wait for load
4. ✅ Click back to page 1
5. ✅ **Expected:** Load ngay lập tức (< 10ms) từ cache
6. ✅ Check Network tab → No API call to `/users?page=1`

**Verify:**
- [ ] Page 1 load instantly (no loading spinner)
- [ ] Network tab shows cache hit (no new request)
- [ ] Data hiển thị chính xác

**React Query DevTools:**
```
Check cache keys:
✅ ['users', 'list', { page: 1, limit: 10, ... }] - Status: fresh/stale
✅ ['users', 'list', { page: 2, limit: 10, ... }] - Status: fresh/stale
```

---

### 2️⃣ Smooth Pagination (keepPreviousData) (CRITICAL)

**Mục tiêu:** Verify không có loading spinner khi chuyển page

**Test Steps:**
1. ✅ Ở page 1, có data hiển thị
2. ✅ Click page 2
3. ✅ **Expected:** 
   - Page 1 data vẫn hiển thị (grayed out hoặc unchanged)
   - Smooth transition sang page 2 data
   - **KHÔNG có loading spinner**

**Verify:**
- [ ] No loading spinner during pagination
- [ ] Smooth transition between pages
- [ ] Page 2 data replaces page 1 data smoothly

**Code to verify:**
```typescript
// In useUserListQuery:
placeholderData: keepPreviousData // Must be set!
```

---

### 3️⃣ Filter Cache

**Mục tiêu:** Cache hit khi apply cùng filter combination

**Test Steps:**
1. ✅ Apply filter: search="nguyen" + userType="student"
2. ✅ Wait for load → Ghi nhận kết quả
3. ✅ Clear filter → search="" + userType="all"
4. ✅ Re-apply: search="nguyen" + userType="student"
5. ✅ **Expected:** Load instantly từ cache

**Verify:**
- [ ] Filter combination cached correctly
- [ ] Instant load when re-applying same filters
- [ ] Network tab shows cache hit

**React Query DevTools:**
```
✅ ['users', 'list', { page: 1, search: 'nguyen', userType: 'student' }]
✅ ['users', 'list', { page: 1, search: '', userType: 'all' }]
```

---

### 4️⃣ Optimistic Updates - Delete (CRITICAL)

**Mục tiêu:** UI cập nhật ngay lập tức khi delete

**Test Steps:**
1. ✅ Ở page 2, select 1 user
2. ✅ Click delete
3. ✅ **Expected:**
   - User biến mất NGAY LẬP TỨC (before API response)
   - Loading state shows (if any)
   - Success toast after API confirms
4. ✅ If API fails → User reappears (rollback)

**Verify:**
- [ ] User removed instantly from UI
- [ ] No delay waiting for API
- [ ] Rollback works if API fails
- [ ] Total count decreases by 1

**Network tab:**
- Request to DELETE /users/:id should be in progress
- UI already updated before response

---

### 5️⃣ Optimistic Updates - Create

**Mục tiêu:** List invalidate sau khi create

**Test Steps:**
1. ✅ Ở page 1
2. ✅ Click "Create User"
3. ✅ Fill form và submit
4. ✅ **Expected:**
   - Success toast
   - Page 1 refetch automatically
   - New user appears (if on correct page)

**Verify:**
- [ ] All list queries invalidated
- [ ] Current page refetches automatically
- [ ] New user visible (if matches filters)

---

### 6️⃣ Optimistic Updates - Update

**Mục tiêu:** UI cập nhật ngay lập tức

**Test Steps:**
1. ✅ Select user "Nguyen Van A"
2. ✅ Edit name → "Nguyen Van B"
3. ✅ Submit
4. ✅ **Expected:**
   - Name changes to "Nguyen Van B" INSTANTLY
   - API call in background
   - If fail → Rollback to "Nguyen Van A"

**Verify:**
- [ ] Name updates instantly in list
- [ ] Optimistic update works
- [ ] Rollback on error
- [ ] Final sync with server data

---

### 7️⃣ Background Refetch (staleTime = 2 minutes)

**Mục tiêu:** Auto-refresh khi data becomes stale

**Test Steps:**
1. ✅ Load page 1
2. ✅ Wait 2 minutes (or reduce staleTime to 10s for testing)
3. ✅ Switch to another tab → Come back
4. ✅ **Expected:**
   - Background refetch triggered
   - UI updates với fresh data
   - NO loading spinner (background)

**Verify:**
- [ ] Background refetch after staleTime
- [ ] No loading spinner
- [ ] Data updates in background

**React Query DevTools:**
- Status: fresh (green) → stale (yellow) after 2 min
- Auto refetch on window focus

---

### 8️⃣ Multiple Pages Cached Simultaneously

**Mục tiêu:** Cache nhiều pages cùng lúc

**Test Steps:**
1. ✅ Visit pages: 1 → 2 → 3 → 4 → 5
2. ✅ Navigate back: 4 → 3 → 2 → 1
3. ✅ **Expected:** All pages load instantly from cache

**Verify:**
- [ ] All visited pages cached
- [ ] Can navigate back instantly
- [ ] gcTime = 10 minutes keeps cache alive

**React Query DevTools:**
```
✅ ['users', 'list', { page: 1, ... }] - Cached
✅ ['users', 'list', { page: 2, ... }] - Cached
✅ ['users', 'list', { page: 3, ... }] - Cached
✅ ['users', 'list', { page: 4, ... }] - Cached
✅ ['users', 'list', { page: 5, ... }] - Cached
```

---

### 9️⃣ Bulk Delete Optimistic Update

**Mục tiêu:** Remove multiple users instantly

**Test Steps:**
1. ✅ Select 3 users
2. ✅ Click "Bulk Delete"
3. ✅ **Expected:**
   - All 3 users removed INSTANTLY
   - API call in background
   - Total count decreases by 3
   - Rollback if API fails

**Verify:**
- [ ] All selected users removed instantly
- [ ] Total count updates correctly
- [ ] Rollback on error
- [ ] List refetches after success

---

### 🔟 Search Debounce + Cache

**Mục tiêu:** Search term debounced, then cached

**Test Steps:**
1. ✅ Type "nguyen" (wait 500ms)
2. ✅ Results load
3. ✅ Clear search → ""
4. ✅ Type "nguyen" again
5. ✅ **Expected:** Load instantly from cache

**Verify:**
- [ ] Search debounced (500ms)
- [ ] Results cached per search term
- [ ] Instant load on re-search

---

## 📊 Performance Metrics

### Expected Improvements

| Metric | Before | After | Target |
|--------|--------|-------|--------|
| **First Load** | 300-500ms | 300-500ms | Same (no improvement) |
| **Revisit Page** | 300-500ms | **< 10ms** | **30x faster** ⚡ |
| **Pagination** | 300ms + spinner | **< 10ms, no spinner** | **30x + UX** |
| **Filter Re-apply** | 300ms | **< 10ms** | **30x faster** |
| **Delete (optimistic)** | 300ms wait | **0ms instant** | **∞ faster** 🚀 |
| **Cache Hit Rate** | 0% | **> 80%** | 80%+ |
| **API Calls (10 pages)** | 10 requests | **1-2 requests** | **-80% to -90%** |

### How to Measure

**Chrome DevTools - Network Tab:**
1. Open Network tab
2. Navigate through pages
3. Count:
   - Total requests to `/users`
   - Cache hits (no request)
   - Time to display data

**React Query DevTools:**
1. Open DevTools (bottom-right)
2. Check:
   - Number of cached queries
   - Status: fresh (green) / stale (yellow) / inactive (gray)
   - Fetch count per query

---

## 🐛 Common Issues & Debugging

### Issue 1: Data không cache

**Symptoms:**
- Every page navigation triggers API call
- No cache hits in DevTools

**Debug:**
1. Check `useUserListQuery` has correct cache keys
2. Verify `queryParams` includes all filters
3. Check `staleTime` and `gcTime` config

**Fix:**
```typescript
// Ensure cache keys include all params:
queryKey: userKeys.list(params),
// params must include: { page, limit, search, userType, membershipStatus }
```

---

### Issue 2: Loading spinner vẫn hiện khi chuyển page

**Symptoms:**
- See loading spinner when clicking next page
- Not smooth transition

**Debug:**
1. Check `placeholderData: keepPreviousData` is set
2. Verify using `isLoading` not `isFetching` for spinner

**Fix:**
```typescript
// In useUserListQuery:
placeholderData: keepPreviousData, // MUST HAVE!

// In component:
{isLoading && <LoadingSpinner />} // Use isLoading, not isFetching
```

---

### Issue 3: Optimistic update không work

**Symptoms:**
- Delete button click → Wait → Then UI updates
- No instant feedback

**Debug:**
1. Check `onMutate` is implemented in mutation
2. Verify `queryClient.setQueriesData` is called
3. Check rollback in `onError`

**Fix:**
```typescript
// In useDeleteUserMutation:
onMutate: async (userId) => {
  // Cancel outgoing queries
  await queryClient.cancelQueries({ queryKey: userKeys.lists() });
  
  // Snapshot previous
  const previousLists = queryClient.getQueriesData({ queryKey: userKeys.lists() });
  
  // Optimistically update
  queryClient.setQueriesData({ queryKey: userKeys.lists() }, (old) => {
    // Remove user from cache
  });
  
  return { previousLists };
},
```

---

### Issue 4: Data không fresh sau Create/Update

**Symptoms:**
- Create user → User không xuất hiện
- Update user → Data cũ vẫn hiển thị

**Debug:**
1. Check `invalidateQueries` is called in mutation
2. Verify cache keys match

**Fix:**
```typescript
onSuccess: () => {
  queryClient.invalidateQueries({ queryKey: userKeys.lists() });
}
```

---

## 🎯 Success Criteria

### Minimum Requirements ✅

- [ ] **Cache hit rate > 80%** (8 out of 10 navigations use cache)
- [ ] **Pagination smooth** (no loading spinner with keepPreviousData)
- [ ] **Optimistic delete < 50ms** (instant UI update)
- [ ] **API calls reduced > 85%** (from 10 requests to 1-2)
- [ ] **All TypeScript errors = 0**
- [ ] **No breaking changes** (components still work)

### Ideal Goals 🌟

- [ ] Cache hit rate > 90%
- [ ] Average load time < 10ms (from cache)
- [ ] Zero loading spinners on cached pages
- [ ] Background refetch working perfectly
- [ ] All optimistic updates instant

---

## 🚀 Next Steps After Testing

### If All Tests Pass ✅

1. **Monitor in Production**
   - Track cache hit rate over 1 week
   - Measure performance improvements
   - Collect user feedback on UX

2. **Optimize Further**
   - Add prefetching for next page
   - Implement infinite scroll (optional)
   - Fine-tune staleTime/gcTime based on usage

3. **Document**
   - Update team wiki
   - Add comments in code
   - Create video demo

### If Tests Fail ❌

1. **Debug Issues**
   - Use React Query DevTools
   - Check Network tab
   - Review code implementation

2. **Fix Problems**
   - Follow "Common Issues" section
   - Re-test after fix
   - Verify no regressions

3. **Re-run Tests**
   - Start from Test #1
   - Document what was fixed

---

## 📚 Testing Resources

### Tools
- **React Query DevTools**: Built-in cache inspector
- **Chrome DevTools - Network**: Monitor API calls
- **Chrome DevTools - Performance**: Measure render times
- **React DevTools - Profiler**: Measure component renders

### Documentation
- [TanStack Query DevTools](https://tanstack.com/query/latest/docs/react/devtools)
- [Optimistic Updates Guide](https://tanstack.com/query/latest/docs/react/guides/optimistic-updates)
- [Pagination Guide](https://tanstack.com/query/latest/docs/react/guides/paginated-queries)

---

## ✅ Final Checklist

### Before Deployment
- [ ] All 10 tests passed
- [ ] No TypeScript errors
- [ ] No console errors/warnings
- [ ] Performance metrics meet targets
- [ ] Backward compatibility verified
- [ ] React Query DevTools shows correct cache structure

### After Deployment
- [ ] Monitor cache hit rate (> 80%)
- [ ] Track API call reduction (> 85%)
- [ ] User feedback positive (faster, smoother)
- [ ] No performance regressions
- [ ] Ready for next feature (Organizations, Classes, etc.)

---

## 🎉 Conclusion

**Implementation Complete:** 3 phases (6-8 hours)
**Testing Required:** Phase 4 (1-2 hours)
**Total Effort:** ~8-10 hours
**Expected ROI:** 30-500x performance improvement + Better UX

**Let's test it! 🚀**

---

## 📝 Test Report Template

```markdown
## Test Report - Users Page Cache

**Date:** ___________
**Tester:** ___________
**Environment:** Dev / Staging / Production

### Test Results

| Test # | Test Name | Status | Notes |
|--------|-----------|--------|-------|
| 1 | Pagination Cache | ✅ / ❌ | |
| 2 | Smooth Pagination | ✅ / ❌ | |
| 3 | Filter Cache | ✅ / ❌ | |
| 4 | Optimistic Delete | ✅ / ❌ | |
| 5 | Optimistic Create | ✅ / ❌ | |
| 6 | Optimistic Update | ✅ / ❌ | |
| 7 | Background Refetch | ✅ / ❌ | |
| 8 | Multiple Pages Cache | ✅ / ❌ | |
| 9 | Bulk Delete | ✅ / ❌ | |
| 10 | Search + Cache | ✅ / ❌ | |

### Performance Metrics

- Cache Hit Rate: ____%
- Average Load Time (cached): _____ms
- API Call Reduction: ____%
- Optimistic Delete Time: _____ms

### Issues Found

1. _____________________
2. _____________________

### Recommendations

1. _____________________
2. _____________________

**Overall Status:** ✅ PASS / ❌ FAIL / ⚠️ PARTIAL
```
