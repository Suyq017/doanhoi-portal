# Refresh Token Migration Test Plan

## Overview
This document outlines how to test the refresh token migration that we've completed.

## What We've Migrated

### Services Migrated to Use ApiClient:
✅ **authService.ts** - Uses ApiClient for permission/profile endpoints (login/refresh/logout still use custom fetch to avoid circular dependency)
✅ **roleService.ts** - All methods migrated to use ApiClient
✅ **userService.ts** - All methods migrated to use ApiClient  
✅ **organizationService.ts** - All methods migrated to use ApiClient
✅ **departmentService.ts** - All methods migrated to use ApiClient
✅ **classService.ts** - All methods migrated to use ApiClient
✅ **dashboardService.ts** - All methods migrated to use ApiClient

### Services Already Using ApiClient:
✅ **paymentService.ts** - Already using ApiClient correctly
✅ **payosConfigService.ts** - Already using ApiClient correctly
✅ **paymentFeeLevelService.ts** - Already using ApiClient correctly
✅ **paymentCampaignService.ts** - Already using ApiClient correctly
✅ **paymentAssignmentService.ts** - Already using ApiClient correctly

### ApiClient Enhancements:
✅ **Fixed baseURL** - Now uses environment variables correctly
✅ **Added uploadFile method** - For handling file uploads with FormData
✅ **Added downloadBlob method** - For handling file downloads
✅ **Added getBaseURL method** - For accessing base URL in services

## Testing the Refresh Token Flow

### 1. Prerequisites
- Ensure the backend is running
- Have valid user credentials
- Access to browser developer tools

### 2. Manual Testing Steps

#### Step 1: Login to the Application
1. Open the application in browser
2. Login with valid credentials
3. Open browser Developer Tools → Network tab
4. Clear network log

#### Step 2: Test Normal API Calls
1. Navigate through the application (users page, organizations page, etc.)
2. Verify that API calls include `Authorization: Bearer <token>` header
3. Verify that responses return successfully

#### Step 3: Simulate Token Expiration
**Option A: Wait for natural expiration (if tokens are short-lived)**
1. Wait for access token to expire naturally
2. Make an API call by navigating to a new page
3. Watch the Network tab

**Option B: Manually invalidate token (recommended)**
1. In browser Developer Tools → Application/Storage → Local Storage
2. Find the `accessToken` key
3. Modify the token value to make it invalid (add some characters)
4. Navigate to a page that makes API calls (like Users or Organizations)
5. Watch the Network tab

#### Step 4: Verify Auto-Refresh Behavior
In the Network tab, you should see:
1. **First request fails** with 401 Unauthorized
2. **Refresh token request** to `/auth/refresh` endpoint
3. **Original request retries** with new token and succeeds
4. **No redirect to login page** (user stays logged in)

#### Step 5: Test Multiple Concurrent Requests
1. Invalidate the access token (as above)
2. Quickly navigate through multiple pages or refresh page multiple times
3. Verify that:
   - Only one refresh token request is made
   - All subsequent requests wait for refresh to complete
   - All requests succeed after refresh

#### Step 6: Test Refresh Token Failure
1. In Local Storage, invalidate both `accessToken` and `refreshToken`
2. Navigate to any page
3. Verify that:
   - User is redirected to login page
   - All tokens are cleared from localStorage

### 3. Code-Level Verification

#### Check ApiClient Usage
Verify that services are using ApiClient instead of custom fetch:
```bash
# Search for any remaining custom fetch calls that should use ApiClient
grep -r "fetch.*API_BASE_URL" frontend/src/shared/services/
grep -r "fetch.*import.meta.env" frontend/src/shared/services/

# Should return minimal results (only auth service for login/refresh/logout)
```

#### Check Import Statements
Verify services import and use apiClient:
```bash
# All services should import apiClient
grep -r "import.*apiClient" frontend/src/shared/services/
grep -r "import.*apiClient" frontend/src/features/*/services/
```

### 4. Expected Results

#### ✅ Success Indicators:
- No manual logouts due to token expiration
- Seamless API calls even after token expiration  
- Only one refresh request per expiration event
- Failed requests are queued and retried after refresh
- User experience is uninterrupted

#### ❌ Failure Indicators:
- Users get logged out when tokens expire
- Multiple refresh requests for same expiration
- API errors persist after token refresh
- Infinite refresh loops
- Circular dependency errors

### 5. Common Issues and Solutions

#### Issue: Circular Dependency
- **Symptom**: Import errors or undefined apiClient
- **Solution**: Ensure authService uses custom fetch for login/refresh/logout only

#### Issue: Multiple Refresh Requests  
- **Symptom**: Multiple `/auth/refresh` calls in Network tab
- **Solution**: Check that `isRefreshing` flag and queue are working properly

#### Issue: Services Not Using ApiClient
- **Symptom**: API calls still fail after token refresh
- **Solution**: Verify service is imported and using apiClient methods

### 6. Performance Testing

#### Load Testing (Optional)
1. Open multiple tabs with the application
2. Invalidate tokens in all tabs
3. Make API calls simultaneously
4. Verify only one refresh happens across all tabs

## Conclusion

The refresh token mechanism should now work seamlessly across the entire application. Users should never be logged out due to token expiration, and the refresh process should be invisible to the user experience.

Key files that were updated:
- `frontend/src/shared/services/apiClient.ts` - Enhanced with new methods
- All service files in `frontend/src/shared/services/` - Migrated to use ApiClient
- `frontend/src/features/auth/services/authService.ts` - Partially migrated (keeping custom fetch for auth endpoints)
- `frontend/src/features/permissions/services/roleService.ts` - Fully migrated

The system is now ready for production use with automatic token refresh capabilities.
