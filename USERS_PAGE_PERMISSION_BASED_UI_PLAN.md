# Users Page Permission-Based UI Implementation Plan

## ✅ IMPLEMENTATION COMPLETED

**Status**: All phases completed successfully
**Date**: December 2024
**Documentation**: See `PERMISSION_BASED_UI_DOCUMENTATION.md` for comprehensive details

## ✅ IMPLEMENTATION SUMMARY

### Completed Features:
1. **Custom Permission Hook** (`useUserPagePermissions`)
   - Centralizes all permission logic for Users page
   - Returns structured permission object with computed flags
   - Uses utility functions for consistent permission handling

2. **Users Page Integration**
   - AddDropdownButton options filtered based on permissions
   - ConditionalRender wrapper for permission-based visibility
   - Permission props passed to table components

3. **Table Component Updates**
   - UserTableWithFilter accepts and forwards permission props
   - UserTable supports granular action control via `actions` prop
   - Conditional rendering of all UI elements (buttons, checkboxes, columns)

4. **Utility Functions and Constants**
   - Permission constants (`shared/constants/permissions.ts`)
   - Utility functions (`shared/utils/permissionUtils.ts`)
   - Helper functions for dropdown filtering and component permissions
   - Type-safe interfaces for all permission-related props

5. **Testing and Validation**
   - Comprehensive test suite (`test-permission-system.js`)
   - Permission scenario validation
   - Consistency checks across components
   - Documentation and usage examples

### Files Created/Modified:
- ✅ `frontend/src/features/users/hooks/useUserPagePermissions.ts` (created)
- ✅ `frontend/src/features/users/UsersPage.tsx` (updated)
- ✅ `frontend/src/shared/components/UserTable/UserTableWithFilter.tsx` (updated)
- ✅ `frontend/src/shared/components/UserTable/UserTable.tsx` (updated)
- ✅ `frontend/src/shared/constants/permissions.ts` (created)
- ✅ `frontend/src/shared/utils/permissionUtils.ts` (created)
- ✅ `frontend/src/shared/index.ts` (updated)
- ✅ `test-permission-system.js` (created)
- ✅ `PERMISSION_BASED_UI_DOCUMENTATION.md` (created)

### Key Achievements:
- ✅ Type-safe permission system with TypeScript
- ✅ Centralized permission logic preventing code duplication
- ✅ Consistent UI behavior across all permission scenarios
- ✅ Backward compatibility maintained
- ✅ Comprehensive testing and validation
- ✅ Performance optimized with memoization
- ✅ Extensible architecture for other entity types

---

## Mục tiêu (ACHIEVED)
✅ Ẩn/hiện các tính năng trong trang Users và UserTable dựa trên quyền của người dùng hiện tại.

## Phạm vi thực hiện (COMPLETED)

### 1. Trang Users (UsersPage.tsx)
#### A. Header Actions
- **Nút "Thêm người dùng"** → Ẩn nếu không có quyền `users.create`
- **Dropdown "Import từ file Excel"** → Ẩn nếu không có quyền `users.create`  
- **Dropdown "Xuất dữ liệu"** → Ẩn nếu không có quyền `users.export`

#### B. Table Actions (UserTableWithFilter)
- **Icon "Xem chi tiết" (Eye)** → Ẩn nếu không có quyền `users.view_details`
- **Icon "Chỉnh sửa" (Edit)** → Ẩn nếu không có quyền `users.update`
- **Icon "Xóa" (Delete)** → Ẩn nếu không có quyền `users.delete`
- **Checkbox selection** → Ẩn nếu không có quyền `users.delete` (bulk delete)
- **Bulk delete actions** → Ẩn nếu không có quyền `users.delete`

### 2. Components cần cập nhật

#### A. UserTableWithFilter Component
**File:** `frontend/src/shared/components/tables/UserTableWithFilter.tsx`
- Thêm prop `permissions` để truyền permission context
- Conditional rendering cho các action buttons
- Ẩn/hiện selection checkboxes dựa trên permissions

#### B. UserTable Component  
**File:** `frontend/src/shared/components/tables/UserTable.tsx`
- Thêm props để control hiển thị các actions
- Implement conditional rendering cho action columns

#### C. AddDropdownButton Component
**File:** `frontend/src/shared/components/buttons/AddDropdownButton.tsx`
- Filter options dựa trên permissions trước khi render

### 3. Permission Mapping

#### Permissions cần kiểm tra:
```typescript
interface UserPagePermissions {
  canCreate: boolean;        // users.create
  canView: boolean;          // users.view_details  
  canUpdate: boolean;        // users.update
  canDelete: boolean;        // users.delete
  canExport: boolean;        // users.export
  canImport: boolean;        // users.create (same as create)
}
```

## Implementation Steps

### Phase 1: Cập nhật UsersPage.tsx
1. **Filter AddDropdownButton options** dựa trên permissions
2. **Wrap action buttons** với ConditionalRender components
3. **Pass permission props** xuống UserTableWithFilter

### Phase 2: Cập nhật UserTableWithFilter Component
1. **Thêm interface** cho permission props
2. **Pass permissions** xuống UserTable component
3. **Conditional rendering** cho bulk selection features

### Phase 3: Cập nhật UserTable Component
1. **Thêm permission props** vào interface
2. **Conditional rendering** cho action column icons
3. **Hide entire action column** nếu không có permissions nào
4. **Conditional rendering** cho selection checkboxes

### Phase 4: Helper Functions
1. **Tạo custom hook** `useUserPagePermissions()` để centralize permission logic
2. **Utility functions** để check multiple permissions
3. **Constants** cho permission codes

### Phase 5: Testing & Polish
1. **Test với different user roles** (admin, manager, editor, viewer)
2. **Verify UI consistency** khi các actions bị ẩn
3. **Check responsive design** với reduced actions
4. **Error handling** cho permission changes runtime

## Code Structure

### 1. Custom Hook: useUserPagePermissions
```typescript
// File: frontend/src/features/users/hooks/useUserPagePermissions.ts
export const useUserPagePermissions = () => {
  const permissions = usePermissions();
  
  return {
    canCreate: permissions.canCreateUser(),
    canView: permissions.canViewUserDetails(),
    canUpdate: permissions.canUpdateUser(),
    canDelete: permissions.canDeleteUser(),
    canExport: permissions.canExportUsers(),
    canImport: permissions.canCreateUser(), // Same as create
    
    // Grouped permissions
    hasAnyViewAction: // can view OR edit OR delete
    hasAnyEditAction: // can edit OR delete
    showActionColumn: // has any action permission
    showBulkActions: // can delete (bulk operations)
  };
};
```

### 2. Updated Component Interfaces
```typescript
// UserTableWithFilter props
interface UserTableWithFilterProps {
  // ...existing props
  permissions?: {
    canView: boolean;
    canEdit: boolean;
    canDelete: boolean;
    showBulkActions: boolean;
  };
}

// UserTable props  
interface UserTableProps {
  // ...existing props
  actions?: {
    showView: boolean;
    showEdit: boolean; 
    showDelete: boolean;
    showSelection: boolean;
  };
}
```

### 3. Permission-based AddDropdown Options
```typescript
// In UsersPage.tsx
const getFilteredDropdownOptions = (): DropdownOption[] => {
  const baseOptions = [
    {
      key: 'single',
      label: t('users:addButton.single'),
      icon: <Plus className="w-4 h-4" />,
      onClick: openCreateModal,
      requiredPermission: 'create'
    },
    {
      key: 'fromFile', 
      label: t('users:addButton.fromFile'),
      icon: <Upload className="w-4 h-4" />,
      onClick: () => setIsImportModalOpen(true),
      requiredPermission: 'create'
    },
    {
      key: 'export',
      label: t('users:addButton.export'),
      icon: <Download className="w-4 h-4" />,
      onClick: () => setIsExportModalOpen(true),
      requiredPermission: 'export'
    }
  ];

  return baseOptions.filter(option => {
    if (option.requiredPermission === 'create') return userPermissions.canCreate;
    if (option.requiredPermission === 'export') return userPermissions.canExport;
    return true;
  });
};
```

## Security Considerations

### Frontend Security
- **UI hiding chỉ là UX improvement**, không phải security measure
- **Backend APIs vẫn phải validate permissions** cho mọi operations
- **Permission checks consistent** giữa UI và API

### Error Handling
- **Graceful degradation** khi permissions bị revoke runtime
- **User feedback** khi không có quyền thực hiện action
- **Fallback UI states** khi tất cả actions bị ẩn

## Future Enhancements

### 1. Advanced Permission Features
- **Field-level permissions** (ẩn các columns sensitive)
- **Row-level permissions** (chỉ hiện users thuộc organization)
- **Dynamic permission loading** based on context

### 2. UI/UX Improvements  
- **Permission tooltips** cho disabled actions
- **Empty states** khi không có permissions
- **Progressive disclosure** cho complex permission structures

### 3. Performance Optimizations
- **Memoize permission calculations**
- **Lazy load permission-heavy components**
- **Cache permission results** với proper invalidation

## Dependencies

### Required Components
- `ConditionalRender` component (đã có)
- `PermissionGuard` component (đã có) 
- `usePermissions` hook (đã có)

### New Dependencies
- Custom hook `useUserPagePermissions` (cần tạo)
- Updated component interfaces (cần cập nhật)
- Permission constants (cần define)

## Estimated Timeline
- **Phase 1-2:** 2-3 days (UsersPage và UserTableWithFilter)
- **Phase 3:** 1-2 days (UserTable component) 
- **Phase 4:** 1 day (Helper functions và hooks)
- **Phase 5:** 1-2 days (Testing và polish)

**Total:** 5-8 days development time

## Success Criteria
1. ✅ UI elements ẩn/hiện đúng dựa trên user permissions
2. ✅ Table actions chỉ hiện khi user có quyền tương ứng
3. ✅ Bulk operations ẩn khi không có delete permission
4. ✅ AddDropdown options filtered theo permissions
5. ✅ Consistent behavior across different user roles
6. ✅ No performance regressions
7. ✅ Responsive design maintained với reduced actions
