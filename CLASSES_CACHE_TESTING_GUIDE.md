# 🧪 Classes Page Cache Testing Guide

## 📋 Overview

Guide để test TanStack Query cache implementation cho **Classes Page**. Migration này đã thay thế manual state management bằng React Query cache system.

### 🎯 Testing Goals

1. ✅ Verify cache hit rate > 80%
2. ✅ Smooth pagination (no loading spinner)
3. ✅ Optimistic updates instant (< 50ms)
4. ✅ API calls reduced > 85%
5. ✅ All features working correctly

---

## 🚀 Quick Start (5 phút)

### Prerequisites
```bash
# Start dev server
cd frontend
npm run dev
```

### Open React Query DevTools
- Navigate to: `http://localhost:5173/classes`
- Look for **React Query DevTools** icon (bottom-right corner)
- Click to open DevTools panel

---

## 📝 Test Scenarios

### ✅ Test 1: Cache Hit - Pagination

**Objective:** Verify data cached per page

**Steps:**
1. Navigate to Classes page
2. Click page 2 button
3. Wait for data to load
4. Click page 1 button
5. **Expected:** Page 1 loads instantly (< 10ms, no loading spinner)

**DevTools Check:**
- Open React Query DevTools
- Look for query: `["classes", "list", { page: 1, ... }]`
- Status should be: `fresh` or `stale` (not `fetching`)

**Success Criteria:**
- ✅ Page 1 loads instantly
- ✅ No loading spinner
- ✅ Cache status: `fresh` or `stale`

---

### ✅ Test 2: Smooth Pagination (keepPreviousData)

**Objective:** Verify no jarring loading spinner during pagination

**Steps:**
1. Navigate to Classes page (page 1)
2. Click page 2 button
3. **Expected:** Old data remains visible while new data loads
4. After load: Data smoothly transitions to new page

**What to Watch:**
- ❌ BAD: Blank screen or loading spinner replaces data
- ✅ GOOD: Old data visible, smooth fade to new data

**Success Criteria:**
- ✅ No blank loading state
- ✅ Smooth transition between pages
- ✅ User can still see data while fetching

---

### ✅ Test 3: Optimistic Delete

**Objective:** Verify instant UI update on delete

**Steps:**
1. Navigate to Classes page
2. Note the current total count
3. Click delete button on any class
4. Confirm deletion
5. **Expected:** Class disappears from UI **immediately** (< 50ms)
6. **Expected:** Total count decreases by 1 instantly

**DevTools Check:**
- Open Network tab (F12)
- Click delete button
- UI should update BEFORE API call completes

**Success Criteria:**
- ✅ Class removed instantly from UI
- ✅ Total count updated instantly
- ✅ No waiting for API response
- ✅ If API fails, class reappears (rollback)

---

### ✅ Test 4: Filter Cache Isolation

**Objective:** Verify filters create separate cache entries

**Steps:**
1. Navigate to Classes page (no filters)
2. Select year filter: "2024"
3. Wait for data to load
4. Clear filters (click "Lọc" button)
5. **Expected:** Original data (no filters) loads instantly from cache

**DevTools Check:**
- Query 1: `["classes", "list", { page: 1, limit: 10 }]`
- Query 2: `["classes", "list", { page: 1, limit: 10, year: 2024 }]`
- Both should exist in cache

**Success Criteria:**
- ✅ Filtered data cached separately
- ✅ Clearing filter loads original data instantly
- ✅ Multiple cache entries for different filters

---

### ✅ Test 5: Search Debouncing

**Objective:** Verify search doesn't trigger excessive API calls

**Steps:**
1. Open Network tab (F12)
2. Clear network log
3. Type "IT" in search box (3 characters)
4. **Expected:** Only 1 API call after 500ms delay

**What to Watch:**
- ❌ BAD: 3 API calls (one per keystroke)
- ✅ GOOD: 1 API call (after debounce)

**Success Criteria:**
- ✅ Debounced to 500ms
- ✅ Only 1 API call for "IT"
- ✅ No excessive API calls

---

### ✅ Test 6: Bulk Delete Optimistic Update

**Objective:** Verify multiple classes deleted instantly

**Steps:**
1. Select 3 classes (checkboxes)
2. Click bulk delete button
3. Confirm deletion
4. **Expected:** All 3 classes disappear instantly
5. **Expected:** Total count decreases by 3 instantly

**DevTools Check:**
- Network tab shows delete request in progress
- But UI already updated

**Success Criteria:**
- ✅ All selected classes removed instantly
- ✅ Total count updated instantly
- ✅ Selection cleared
- ✅ Rollback if API fails

---

### ✅ Test 7: Background Refetch

**Objective:** Verify stale data refetched in background

**Steps:**
1. Navigate to Classes page
2. Wait 2 minutes (staleTime = 2min)
3. Click to another tab (browser window)
4. Click back to Classes tab
5. **Expected:** Data refetches in background (refetchOnWindowFocus: true)

**DevTools Check:**
- Query status transitions: `stale` → `fetching` → `fresh`
- User sees old data while refetch happens

**Success Criteria:**
- ✅ Data refetches on window focus
- ✅ Old data visible during refetch
- ✅ Smooth transition to new data

---

### ✅ Test 8: Cache Persistence on Navigation

**Objective:** Verify cache survives page navigation

**Steps:**
1. Navigate to Classes page (page 1)
2. Click to page 2
3. Navigate to another page (e.g., Users)
4. Come back to Classes page
5. **Expected:** Page 2 data still in cache (gcTime = 10min)

**DevTools Check:**
- Query `["classes", "list", { page: 2, ... }]` still in cache
- Status: `stale` but data available

**Success Criteria:**
- ✅ Cache survives navigation
- ✅ Data available for 10 minutes after last use
- ✅ No refetch until next interaction

---

### ✅ Test 9: Filter Change Resets Page

**Objective:** Verify page resets to 1 when filter changes

**Steps:**
1. Navigate to page 3 of Classes
2. Change year filter to "2024"
3. **Expected:** Page resets to 1 automatically

**Success Criteria:**
- ✅ Page resets to 1 on filter change
- ✅ No "page 3 of 2024" error
- ✅ Smooth UX

---

### ✅ Test 10: Import Refresh

**Objective:** Verify cache invalidated after import

**Steps:**
1. Navigate to Classes page
2. Note current total count
3. Click "Import từ file Excel" button
4. Upload Excel file with 5 classes
5. Complete import
6. **Expected:** Page refetches automatically
7. **Expected:** Total count increases by 5

**Success Criteria:**
- ✅ Cache invalidated on import success
- ✅ New data fetched automatically
- ✅ Total count updated
- ✅ New classes visible

---

## 📊 Performance Metrics

### Expected Improvements

| Metric | Before (Manual) | After (React Query) | Target |
|--------|----------------|---------------------|--------|
| **First load** | 300-500ms | 300-500ms | Same |
| **Revisit page** | 300-500ms | **< 10ms** | ✅ 30-50x faster |
| **Pagination click** | Loading spinner | Smooth fade | ✅ Perfect UX |
| **Delete (optimistic)** | 300ms wait | **< 50ms** | ✅ Instant |
| **Filter change** | 300ms | 300ms (first time) | ✅ Cache subsequent |
| **API calls (10 pages)** | 10 requests | 1-2 requests | ✅ -80% to -90% |
| **Cache hit rate** | 0% | **80-90%** | ✅ Goal: > 80% |

### How to Measure

**Network Tab:**
```
1. Open DevTools → Network tab
2. Filter: XHR
3. Navigate through pages
4. Count API calls to /classes endpoint
```

**React Query DevTools:**
```
1. Open React Query DevTools
2. Look at query status: fresh/stale/fetching
3. Count cache hits vs fetches
4. Cache hit rate = (cache hits) / (total queries) * 100%
```

**Performance Timing:**
```javascript
// Add to component
const startTime = performance.now();
// ... after data loads
const endTime = performance.now();
console.log(`Load time: ${endTime - startTime}ms`);
```

---

## 🐛 Common Issues & Debugging

### Issue 1: Data not loading

**Symptoms:**
- Loading spinner forever
- No data visible

**Check:**
1. Open React Query DevTools
2. Look for query status: `error`
3. Click query to see error details

**Solution:**
- Check API endpoint working
- Check network connectivity
- Check console for errors

---

### Issue 2: Cache not working

**Symptoms:**
- Every navigation triggers API call
- No performance improvement

**Check:**
1. Open React Query DevTools
2. Verify cache entries exist
3. Check `staleTime` and `gcTime` config

**Solution:**
```typescript
// In useClassQueries.ts
const CLASS_CACHE_CONFIG = {
  staleTime: 2 * 60 * 1000,  // ← Should be 2 minutes
  gcTime: 10 * 60 * 1000,     // ← Should be 10 minutes
};
```

---

### Issue 3: Optimistic update not rolling back

**Symptoms:**
- Delete fails but class still removed from UI
- Data inconsistent with server

**Check:**
1. Open Network tab
2. Look for failed DELETE request
3. Check console for rollback errors

**Solution:**
```typescript
// In useClassQueries.ts
onError: (_err, _classId, context) => {
  // This should restore previous data
  if (context?.previousLists) {
    context.previousLists.forEach(([queryKey, data]) => {
      queryClient.setQueryData(queryKey, data);
    });
  }
};
```

---

### Issue 4: Search triggering too many API calls

**Symptoms:**
- Every keystroke = 1 API call
- Network tab flooded with requests

**Check:**
1. Open Network tab
2. Type slowly in search box
3. Count API calls

**Solution:**
```typescript
// In useClassList.ts
useEffect(() => {
  const timeoutId = setTimeout(() => {
    setCurrentPage(1);
  }, 500); // ← Should be 500ms debounce

  return () => clearTimeout(timeoutId);
}, [searchTerm]);
```

---

## ✅ Final Checklist

Before considering migration complete:

### Functionality
- [ ] All CRUD operations working
- [ ] Pagination working correctly
- [ ] Filters working correctly
- [ ] Search working correctly
- [ ] Bulk delete working correctly
- [ ] Import working correctly
- [ ] No console errors
- [ ] No TypeScript errors

### Performance
- [ ] Cache hit rate > 80%
- [ ] Pagination instant (< 10ms)
- [ ] Optimistic delete instant (< 50ms)
- [ ] API calls reduced > 85%
- [ ] Smooth pagination (no loading spinner)

### Code Quality
- [ ] All unused code removed
- [ ] No manual state management left
- [ ] DevTools working correctly
- [ ] Documentation updated
- [ ] Tests passing (if applicable)

---

## 📚 References

### Internal
- ✅ `ORGANIZATIONS_AND_CLASSES_CACHE_PLAN.md` - Original plan
- ✅ `useClassQueries.ts` - Query hooks implementation
- ✅ `useClassList.ts` - Wrapper hook
- ✅ `USERS_CACHE_TESTING_GUIDE.md` - Similar testing guide

### External
- [TanStack Query DevTools](https://tanstack.com/query/latest/docs/react/devtools)
- [Performance Monitoring](https://tanstack.com/query/latest/docs/react/guides/performance)
- [Optimistic Updates](https://tanstack.com/query/latest/docs/react/guides/optimistic-updates)

---

## 🎉 Summary

### Migration Complete When:
- ✅ All 10 test scenarios passing
- ✅ Performance metrics meeting targets
- ✅ No TypeScript errors
- ✅ React Query DevTools showing cache working
- ✅ Cache hit rate > 80%

### Expected Results:
- 🚀 30-50x faster page revisit
- ⚡ Instant optimistic updates
- 💰 85% reduction in API calls
- ✨ Smooth, polished UX
- 🎯 Perfect backward compatibility

**Total effort: ~5 hours**
**Total value: Massive performance boost + Better UX**

**Let's test! 🧪**
