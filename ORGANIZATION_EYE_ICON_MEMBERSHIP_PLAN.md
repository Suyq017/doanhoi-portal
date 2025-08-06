# Kế hoạch điều chỉnh Icon con mắt trên trang Tổ chức

## 🎯 Mục tiêu
Điều chỉnh logic hiển thị icon con mắt (Eye icon) trên `OrganizationTreeItem` để chỉ hiển thị khi người dùng có trong bảng `user_organization` cho tổ chức đó.

## 📋 Phân tích hiện tại

### Vị trí icon con mắt
- **File**: `frontend/src/features/organizations/components/OrganizationTreeItem.tsx`
- **Dòng**: 204-210
- **Component**: `<Eye className="w-4 h-4" />`
- **Logic hiện tại**: Dựa trên `shouldShowDetailLink()` function

### Logic hiện tại `shouldShowDetailLink()`
```typescript
const shouldShowDetailLink = () => {
    if (level === 1 && !isInSubDetailPage) {
        return true;
    }
    if (level === 2 && isInDetailPage) {
        return true;
    }
    return false;
};
```

### Vấn đề
- Logic hiện tại chỉ dựa trên cấp độ tổ chức (level) và page context
- Không kiểm tra user có trong `user_organization` của tổ chức đó hay không
- Cần thay đổi để kiểm tra user có tồn tại trong bảng `user_organization` của organization

## 🔧 Giải pháp

### Phương pháp đơn giản: Kiểm tra user có trong user_organization
Thay vì dùng hook phức tạp, chỉ cần kiểm tra trực tiếp user có trong `user_organization` table:

```typescript
const isUserMemberOfOrganization = (organizationId: string): boolean => {
    const { auth } = useAuth();
    
    if (!auth.user) return false;
    
    // Kiểm tra từ user.organizations (user_organization table)
    return auth.user.organizations?.some(userOrg => 
        userOrg.organizationId === organizationId && userOrg.isActive
    ) || false;
};
```
```

### 2. Đảm bảo AuthContext có user organizations data
```typescript
// File: frontend/src/features/auth/context/AuthContext.tsx
// Đảm bảo khi login hoặc load user data, user.organizations được load đầy đủ

// Trong hàm login hoặc loadUserData
const login = async (credentials: LoginRequest) => {
    try {
        const response = await authService.login(credentials);
  ### Cập nhật OrganizationTreeItem
```typescript
// File: frontend/src/features/organizations/components/OrganizationTreeItem.tsx

import { useAuth } from '../../../features/auth/context/AuthContext';

// Trong component OrganizationTreeItem
const OrganizationTreeItem: React.FC<OrganizationTreeItemProps> = ({
    org,
    level = 0,
    // ...other props
}) => {
    // ...existing code...
    
    const { auth } = useAuth();
    
    // Hàm kiểm tra user có trong user_organization không
    const isUserMemberOfOrganization = (organizationId: string): boolean => {
        if (!auth.user) return false;
        
        return auth.user.organizations?.some(userOrg => 
            userOrg.organizationId === organizationId && userOrg.isActive
        ) || false;
    };

    // Thay đổi logic shouldShowDetailLink  
    const shouldShowDetailLink = () => {
        // Kiểm tra user có trong user_organization của tổ chức này không
        if (!isUserMemberOfOrganization(org.id)) {
            return false; // Không hiển thị eye icon nếu user không thuộc tổ chức này
        }

        // Giữ nguyên logic level và page context cho các trường hợp khác
        if (level === 1 && !isInSubDetailPage) {
            return true;
        }
        if (level === 2 && isInDetailPage) {
            return true;
        }
        return false;
    };

    // ...rest of component remains the same...
};
```

```typescript
// File: frontend/src/features/organizations/components/OrganizationTreeItem.tsx

// Thêm helper function trong component
const isUserInOrganization = (organizationId: string): boolean => {
    const { auth } = useAuth();
    
    if (!auth.user) return false;
    
    // Kiểm tra user có trong user_organization table của tổ chức này
    return auth.user.organizations?.some(userOrg => 
        userOrg.organizationId === organizationId && userOrg.isActive
    ) || false;
};

```typescript
// File: frontend/src/features/organizations/components/OrganizationTreeItem.tsx

const OrganizationTreeItem: React.FC<OrganizationTreeItemProps> = ({
    org,
    level = 0,
    // ...other props
}) => {
    const { auth } = useAuth();

    // Helper function kiểm tra user có trong user_organization không
    const isUserInOrganization = (organizationId: string): boolean => {
        if (!auth.user?.organizations) return false;
        
        return auth.user.organizations.some(userOrg => 
            userOrg.organizationId === organizationId && userOrg.isActive
        );
    };

    const shouldShowDetailLink = () => {
        // ĐIỀU KIỆN DUY NHẤT: User có trong user_organization của tổ chức này
        return isUserInOrganization(org.id);
    };

    // ...rest of component remains the same...
};
```

## 📝 Implementation Steps

### Phase 1: Kiểm tra Backend API
1. Đảm bảo API login trả về đầy đủ `user.organizations` data từ bảng `user_organization`
2. Verify structure data có đúng format không

### Phase 2: Frontend Implementation  
1. **Update OrganizationTreeItem.tsx**
   - Thêm helper function `isUserInOrganization`
   - Thay đổi logic `shouldShowDetailLink()` 
   - Remove logic cũ về level và page context

### Phase 3: Testing
1. **Test với các scenarios:**
   - User có trong user_organization → hiển thị eye icon
   - User không có trong user_organization → không hiển thị eye icon
   - User có multiple organizations → hiển thị đúng cho từng org

## 🎯 Expected Behavior

**Logic đơn giản:** Eye icon chỉ hiển thị khi user có trong bảng `user_organization` cho tổ chức đó.

Không cần kiểm tra:
- User roles
- Permissions  
- Level hay page context
- Hierarchical organization structure

Chỉ cần: `user_organization.organizationId === org.id && user_organization.isActive === true`
- User không có trong user_organization nào → không hiển thị eye icon nào
- User có trong user_organization nhưng isActive = false → không hiển thị eye icon
- User logout/login → user.organizations data được refresh

## 🔄 Rollback Plan
Nếu có issues, có thể easily rollback bằng cách revert lại logic cũ trong `shouldShowDetailLink()`:
```typescript
const shouldShowDetailLink = () => {
    if (level === 1 && !isInSubDetailPage) {
        return true;
    }
    if (level === 2 && isInDetailPage) {
        return true;
    }
    return false;
};
```

## 📊 Performance Notes
- Kiểm tra `user.organizations` là operation synchronous (data đã có trong memory)
- Không cần additional API calls hay complex caching
- Performance impact minimal vì chỉ là array filter operation

## 🚀 Benefits
1. **Bảo mật**: Chỉ hiển thị eye icon cho organizations mà user thực sự thuộc về
2. **UX**: User chỉ thấy eye icon cho orgs mà họ có quyền access
3. **Đơn giản**: Logic straightforward - chỉ check user_organization table
4. **Performance**: Không cần thêm API calls

## 📚 Files to Modify

**Chỉ cần modify 1 file:**
- `frontend/src/features/organizations/components/OrganizationTreeItem.tsx`

**Không cần:**
- Tạo hooks mới  
- Modify AuthContext
- Additional API calls
- New type definitions
