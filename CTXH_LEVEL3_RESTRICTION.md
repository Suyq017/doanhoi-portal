# Hạn chế Tạo Hoạt động CTXH cho Tổ chức Level 3

## Tổng quan

Đã implement tính năng ẩn nút "Tạo hoạt động" trong module Công tác xã hội (CTXH) đối với người dùng thuộc tổ chức Level 3.

## Logic nghiệp vụ

### Phân cấp tổ chức
- **Level 1**: Đoàn trường / Hội Sinh viên trường / CLB trường
- **Level 2**: Đoàn cơ sở / Liên chi hội / CLB khoa  
- **Level 3**: Chi đoàn / Chi hội

### Quy tắc quyền tạo hoạt động
- **Level 1 & Level 2**: Có thể tạo hoạt động CTXH → Hiển thị nút "Tạo hoạt động"
- **Level 3**: KHÔNG thể tạo hoạt động CTXH → Ẩn nút "Tạo hoạt động"

## Cơ chế hoạt động

### Backend API
API endpoint: `GET /organizations/ctxh-activity-accessible`

Response:
```typescript
{
  organizations: Organization[];
  canSelectMultiple: boolean;
  fixedOrganization: Organization | null; // Null cho Level 3
}
```

**Quan trọng**: 
- `fixedOrganization !== null` → User thuộc Level 2 → Có thể tạo
- `fixedOrganization === null` → User thuộc Level 3 → KHÔNG thể tạo

### Frontend Implementation

#### File: `ActivityManagement.tsx`

**1. Import thêm dependencies:**
```typescript
import { useState, useEffect } from 'react';
import { organizationService } from '../../../shared/services';
```

**2. State management:**
```typescript
const [canCreateActivity, setCanCreateActivity] = useState(true);
const [checkingPermissions, setCheckingPermissions] = useState(true);
```

**3. Effect hook kiểm tra quyền:**
```typescript
useEffect(() => {
  const checkCreatePermission = async () => {
    try {
      setCheckingPermissions(true);
      const response = await organizationService.getCtxhActivityAccessibleOrganizations();
      
      // fixedOrganization === null → Level 3 → Không thể tạo
      setCanCreateActivity(response.fixedOrganization !== null);
      
    } catch (error) {
      console.error('Failed to check create permission:', error);
      setCanCreateActivity(false); // Default to false for safety
    } finally {
      setCheckingPermissions(false);
    }
  };

  checkCreatePermission();
}, []);
```

**4. Conditional rendering:**
```typescript
{!checkingPermissions && canCreateActivity && (
  <div className="mt-4 sm:mt-0">
    <button onClick={handleCreateActivity}>
      <Plus className="mr-2 h-4 w-4" />
      {t('activity.create')}
    </button>
  </div>
)}
```

## User Experience

### Level 2 User (Có quyền tạo)
- Hiển thị nút "Tạo hoạt động" ở góc phải header
- Click nút → Mở modal ActivityForm
- Có thể chọn tổ chức để tạo hoạt động (hoặc bị fix vào tổ chức Level 2)

### Level 3 User (Không có quyền tạo)
- **Nút "Tạo hoạt động" bị ẩn hoàn toàn**
- Chỉ có thể xem danh sách hoạt động
- Chỉ có thể xem chi tiết, sửa, xóa các hoạt động đã tạo (nếu có quyền)

## Testing Guide

### Test Case 1: Level 2 User
```
1. Đăng nhập với user thuộc Đoàn cơ sở/Liên chi hội
2. Vào trang /ctxh/activities
3. Kỳ vọng: Hiển thị nút "Tạo hoạt động"
4. Click nút → Modal mở ra
```

### Test Case 2: Level 3 User
```
1. Đăng nhập với user thuộc Chi đoàn/Chi hội
2. Vào trang /ctxh/activities
3. Kỳ vọng: KHÔNG hiển thị nút "Tạo hoạt động"
4. Vẫn có thể xem danh sách hoạt động
```

### Test Case 3: Permission Loading
```
1. Đăng nhập bất kỳ user nào
2. Vào trang /ctxh/activities
3. Kỳ vọng: Nút không hiển thị trong lúc loading (checkingPermissions = true)
4. Sau khi load xong → Hiển thị hoặc ẩn dựa trên level
```

## Technical Details

### State Flow
```
Component Mount
    ↓
useEffect triggers
    ↓
setCheckingPermissions(true)
    ↓
Call API: getCtxhActivityAccessibleOrganizations()
    ↓
Check response.fixedOrganization
    ↓
fixedOrganization !== null → setCanCreateActivity(true)
fixedOrganization === null → setCanCreateActivity(false)
    ↓
setCheckingPermissions(false)
    ↓
Render: Show/Hide button based on canCreateActivity
```

### Performance Considerations
- API call chỉ thực hiện 1 lần khi component mount
- Không re-fetch khi không cần thiết
- Loading state prevents flickering of button

## Security Notes

### Defense in Depth
1. **Frontend**: Ẩn nút tạo → UX tốt hơn
2. **Backend**: Vẫn validate quyền ở controller
3. **Database**: Permission system enforcement

**Không chỉ dựa vào frontend để security!** Backend luôn phải validate.

## Related Files

```
frontend/
  src/
    features/
      ctxh/
        pages/
          ActivityManagement.tsx           ← MODIFIED
        components/
          ActivityForm.tsx                 ← Uses same API
    shared/
      services/
        organizationService.ts             ← API method
      types/
        organization.ts                    ← Type definitions

backend/
  src/
    organizations/
      organizations.controller.ts          ← API endpoint
      organizations.service.ts             ← Business logic
    ctxh/
      activity/
        activities.controller.ts           ← Permission enforcement
```

## Future Enhancements

### Possible improvements:
1. **Show tooltip** khi hover vào vị trí nút (cho Level 3 users)
   - "Bạn không có quyền tạo hoạt động ở cấp Chi đoàn/Chi hội"
   
2. **Cache permission result** in AuthContext
   - Tránh gọi API nhiều lần không cần thiết
   
3. **More granular permissions**
   - Có thể cho phép Level 3 tạo một số loại hoạt động nhất định

## Change History

| Date | Version | Changes |
|------|---------|---------|
| 2025-10-14 | 1.0 | Initial implementation - Hide create button for Level 3 users |

## Contact & Support

Nếu có vấn đề với tính năng này, kiểm tra:
1. Console logs: `[ActivityManagement] Create permission check:`
2. Network tab: Request to `/organizations/ctxh-activity-accessible`
3. Response data: `fixedOrganization` field value
