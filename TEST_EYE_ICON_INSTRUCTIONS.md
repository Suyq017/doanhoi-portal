# 🧪 TEST INSTRUCTIONS - Eye Icon Debug

## 🎯 Mục đích
Test xem eye icon có hiển thị đúng logic hay không và debug user organizations data.

## 📋 Steps để test:

### 1. Mở Browser và Developer Tools
- Mở http://localhost:9100 
- Mở DevTools (F12)
- Chọn tab **Console**

### 2. Login và xem Debug Logs
- Login với account 
- Trong console sẽ thấy debug logs:
  ```
  🔍 Login response user: {user data}
  🔍 Full user details from /auth/me: {full user data}
  ```

### 3. Navigate tới Organizations Page
- Đi tới trang Organizations
- Trong console sẽ thấy debug logs cho mỗi organization:
  ```
  🔍 Debugging Eye Icon Logic: {organization info}
  🔍 Checking membership: {membership check}
  👁️ Eye icon should SHOW/HIDE for {org name}
  ```

### 4. Quan sát Expected vs Actual
**Expected behavior:**
- Eye icon chỉ hiển thị cho organizations mà user có membership (isActive = true)
- Không hiển thị cho organizations mà user không thuộc hoặc isActive = false

**Debug points:**
- ✅ `user.organizations` array có data không?
- ✅ `userOrg.organizationId` có match với `org.id` không?
- ✅ `userOrg.isActive` có = true không?

### 5. Possible Issues và Solutions

#### Issue A: user.organizations = null/undefined
**Symptoms:** Console log shows `❌ No user organizations found`
**Cause:** API `/auth/me` không trả về organizations data
**Solution:** Backend cần fix API để include organizations

#### Issue B: user.organizations = [] (empty)
**Symptoms:** Console log shows `organizationsLength: 0`
**Cause:** User chưa được assign vào organization nào
**Solution:** Assign user vào organizations trong database

#### Issue C: organizationId không match
**Symptoms:** Console shows `matches: false` cho tất cả
**Cause:** `userOrg.organizationId` format khác với `org.id`
**Solution:** Check API response format consistency

#### Issue D: isActive = false
**Symptoms:** Console shows `isActive: false, bothActiveAndMatches: false`
**Cause:** User membership bị disabled
**Solution:** Update database: `user_organization.isActive = true`

### 6. Quick Fix Test
Nếu muốn test nhanh, có thể tạm thời hardcode trong browser console:
```javascript
// Inject mock organizations data
const authContext = window.auth || {};
if (authContext.user) {
    authContext.user.organizations = [
        { organizationId: 'org-id-here', isActive: true }
    ];
}
```

### 7. Report Results
Sau khi test, báo cáo:
- ✅/❌ Eye icon có hiển thị đúng không?
- ✅/❌ Console logs cho thấy user có organizations data không?
- ✅/❌ organizationId matching có chính xác không?
- 📸 Screenshot console logs nếu có issues

---
**Next Steps:** Dựa vào kết quả test để quyết định fix ở đâu (frontend logic, backend API, hoặc database data).
