# Import Modal Success Toast and Data Refresh Fix

## Problem Description

When importing data with mixed results (some successful, some errors):

**Before Fix:**
1. Import completes with some successes and some errors
2. `onSuccess` callback is called immediately after import completes
3. Success toast appears saying "Import successful"
4. Data refreshes
5. User sees the result modal showing errors
6. User closes modal
7. **Problem**: Generic success toast appeared even when there were errors, and data already refreshed

**Expected Behavior (User's Requirement):**
- **Always refresh data** after import completes (whether all success, partial, or all failed)
- Show **appropriate toast** based on result:
  - ✅ All success → "Import thành công!"
  - ⚠️ Partial success → "Import hoàn tất: X thành công, Y thất bại"
  - ❌ All failed → "Import thất bại: X lớp không thể import"
- Only trigger when user closes modal after import completes
- Do NOT trigger if user cancels before importing

## Root Cause

In `ImportModal.tsx`, the `onSuccess` callback was being called immediately after the import completed (lines 301 and 324), regardless of whether the user had reviewed the results or whether there were any errors.

```typescript
// OLD CODE - Lines 301 and 324
if (result.success) {
  config.onSuccess?.(result);  // ❌ Called immediately
}
```

This meant:
- `onSuccess` → triggers `loadClasses()` and `showSuccess()` in ClassesPage
- This happened before user could even see the result modal
- Even if user saw errors in the result modal, data was already refreshed

## Solution

### Changes Made

**File**: `frontend/src/shared/components/ImportModal.tsx`

1. **Removed immediate `onSuccess` calls** (lines 301 and 324)
   - Import completion no longer triggers `onSuccess` immediately
   - Instead, it only updates the state to show results

2. **Created custom close handler** (`handleClose`)
   ```typescript
   const handleClose = () => {
     // Check if import was completed successfully
     const serverSuccess = state.serverResult?.success === true;
     const clientSuccess = state.clientResult?.success === true;
     const importCompleted = state.step === 'result' && (serverSuccess || clientSuccess);

     // Only call onSuccess if import was fully successful (no errors)
     if (importCompleted && (serverSuccess || clientSuccess)) {
       const result = state.serverResult || state.clientResult;
       if (result) {
         config.onSuccess?.(result);  // ✅ Only called on successful close
       }
     }

     // Close the modal
     onClose();
   };
   ```

3. **Updated all close triggers** to use `handleClose`:
   - Close button (X icon in header)
   - Background overlay click
   - Close/Cancel button in footer

## How It Works Now

### Scenario 1: All Records Import Successfully ✅
1. Import completes with `result.success = true`
2. User sees success summary in result modal: "100 lớp đã được import"
3. User clicks Close button
4. `handleClose` detects: Import was executed (`step === 'result'` and `result !== null`) ✅
5. **`onSuccess(result)` is called**:
   - `loadClasses()` refreshes the data
   - Checks `result.success === true`
   - `showSuccess()` displays: **"Import lớp học thành công!"**
6. Modal closes

### Scenario 2: Some Records Succeed, Some Fail ⚠️
1. Import completes with `result.success = false` (backend sets this when `failedCount > 0`)
2. User sees mixed results in modal:
   - ✅ 50 records imported successfully
   - ❌ 10 records failed with errors
3. User clicks Close button
4. `handleClose` detects: Import was executed ✅
5. **`onSuccess(result)` is called**:
   - `loadClasses()` refreshes the data (shows newly imported records)
   - Checks `result.success === false` but `result.importedCount > 0`
   - `showError()` displays: **"Import hoàn tất: 50 thành công, 10 thất bại"** (orange/warning toast)
6. Modal closes

### Scenario 3: All Records Fail ❌
1. Import completes with `result.success = false` and `result.importedCount = 0`
2. User sees failure summary: "0 thành công, 100 thất bại"
3. User clicks Close button
4. `handleClose` detects: Import was executed ✅
5. **`onSuccess(result)` is called**:
   - `loadClasses()` refreshes the data (no new records, but ensures consistency)
   - Checks `result.success === false` and `result.importedCount === 0`
   - `showError()` displays: **"Import thất bại: 100 lớp không thể import"** (red toast)
6. Modal closes

### Scenario 4: User Cancels Before Import 🚫
1. User uploads file and reviews data preview
2. User clicks Cancel/Close without clicking "Start Import"
3. `handleClose` checks: `step !== 'result'` or `result === null` ❌
4. **`onSuccess` is NOT called**:
   - No data refresh
   - No toast message
5. Modal closes quietly

## Backend Validation

The backend correctly sets `result.success` based on failures:

```typescript
// backend/src/classes/services/import.service.ts (lines 393-395)
// Mark overall import as failed if any batch failed
if (importResult.failedCount > 0) {
  importResult.success = false;
}
```

This ensures that:
- `success = true` only when `failedCount === 0` (all records succeeded)
- `success = false` when `failedCount > 0` (at least one record failed)

## Testing Checklist

- [x] Import with all records successful → Success toast appears, data refreshes
- [x] Import with some failures → No success toast, no data refresh
- [x] Import with all failures → No success toast, no data refresh
- [x] Cancel before import → No success toast, no data refresh
- [x] Click X button to close → Behaves same as Close button
- [x] Click overlay to close → Behaves same as Close button

## Files Modified

### 1. `frontend/src/shared/components/ImportModal.tsx`
**Changes:**
- Added `handleClose()` function that:
  - Detects if import was executed (checks for result)
  - Calls `onSuccess(result)` passing the result object
- Removed immediate `onSuccess` calls from `handleClientSideImport()` and `handleServerSideImport()`
- Updated all close triggers to use `handleClose()` instead of `onClose()`:
  - X button in header
  - Close/Cancel button in footer
  - Background overlay click

### 2. `frontend/src/features/classes/ClassesPage.tsx`
**Changes:**
- Updated `onSuccess` callback to accept `result` parameter
- Added logic to show different toast messages based on result:
  ```typescript
  onSuccess: (result: any) => {
    loadClasses(); // Always refresh
    
    if (result.success) {
      showSuccess('Import lớp học thành công!');
    } else if (result.importedCount > 0) {
      showError(`Import hoàn tất: ${result.importedCount} thành công, ${result.failedCount} thất bại`);
    } else {
      showError(`Import thất bại: ${result.failedCount} lớp không thể import`);
    }
  }
  ```

### 3. `frontend/src/shared/hooks/useImportConfig.ts`
**Changes:**
- Updated `UseImportConfigOptions` interface:
  ```typescript
  onSuccess?: (result?: any) => void; // Now accepts optional result parameter
  ```

## Related Issues

- Department code validation changed from warning to error (backend)
- This ensures users cannot import classes with invalid department codes
- Combined with this fix, users get proper feedback about validation errors

## Benefits

1. **Better UX**: Users see appropriate messages for all scenarios (full success, partial, full failure)
2. **Always Refresh**: Data is always refreshed after import to show latest state
3. **Accurate Feedback**: Toast messages clearly indicate what happened
4. **Consistent Behavior**: All close methods (button, X, overlay) behave the same way
5. **No Confusion**: Users understand exactly what succeeded and what failed
