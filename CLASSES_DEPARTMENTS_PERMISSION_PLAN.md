# Permission System Implementation Plan - ClassesPage & DepartmentsPage

## Tổng quan (Overview)
Kế hoạch triển khai hệ thống phân quyền cho ClassesPage và DepartmentsPage theo mô hình của UsersPage, đảm bảo tính bảo mật và trải nghiệm người dùng nhất quán.

## 1. Cấu trúc Files đã tạo/cập nhật

### A. Custom Permission Hooks
- ✅ `src/features/classes/hooks/useClassPagePermissions.ts`
- ✅ `src/features/departments/hooks/useDepartmentPagePermissions.ts`

### B. Updated Utility Functions
- ✅ `src/shared/utils/permissionUtils.ts` - Added createClassPagePermissions & createDepartmentPagePermissions
- ✅ `src/shared/hooks/usePermissions.ts` - Added canExportClasses & canExportDepartments

### C. Updated Pages with Permission Guards
- ✅ `src/features/classes/ClassesPage.tsx`
- ✅ `src/features/departments/DepartmentsPage.tsx`

## 2. Permission Requirements

### A. Classes Permissions
```typescript
- classes.create     -> Tạo lớp học mới, import từ file
- classes.view_details -> Xem chi tiết lớp học
- classes.update     -> Chỉnh sửa lớp học
- classes.delete     -> Xóa lớp học (single & bulk)
- classes.export     -> Xuất danh sách lớp học
```

### B. Departments Permissions
```typescript
- departments.create     -> Tạo phòng ban mới, import từ file
- departments.view_details -> Xem chi tiết phòng ban
- departments.update     -> Chỉnh sửa phòng ban
- departments.delete     -> Xóa phòng ban
- departments.export     -> Xuất danh sách phòng ban
```

## 3. UI Components Permission Integration

### A. Header Actions
- ✅ **AddDropdownButton**: Chỉ hiển thị khi có quyền `create` hoặc `import`
- ✅ **Dropdown Options**: Lọc theo permission requirements
  - Single Create: requires `create` permission
  - Import from File: requires `create` permission

### B. Table Components
- ✅ **Action Column Header**: Chỉ hiển thị khi `showActionColumn = true`
- ✅ **Action Buttons**:
  - View: requires `canView` permission
  - Edit: requires `canEdit` permission  
  - Delete: requires `canDelete` permission
- ✅ **Bulk Actions**: Hiển thị khi `showBulkActions = true` (cần delete permission)

### C. Empty States
- ✅ **Permission-based Messages**:
  - No view permission: "Bạn không có quyền xem danh sách [entity]"
  - No create permission: "Không có [entity] nào. Liên hệ quản trị viên để thêm [entity]."
  - Has create permission: "Không có [entity] nào. Hãy tạo [entity] đầu tiên."

## 4. Backend Integration Requirements

### A. API Endpoints cần Permission Guards
```typescript
// Classes API
GET    /api/classes              -> classes.access
POST   /api/classes              -> classes.create
GET    /api/classes/:id          -> classes.view_details
PUT    /api/classes/:id          -> classes.update
DELETE /api/classes/:id          -> classes.delete
DELETE /api/classes/bulk         -> classes.delete
GET    /api/classes/export       -> classes.export
POST   /api/classes/import       -> classes.create

// Departments API
GET    /api/departments          -> departments.access
POST   /api/departments          -> departments.create
GET    /api/departments/:id      -> departments.view_details
PUT    /api/departments/:id      -> departments.update
DELETE /api/departments/:id      -> departments.delete
GET    /api/departments/export   -> departments.export
POST   /api/departments/import   -> departments.create
```

### B. Backend Guard Implementation
- ✅ Sử dụng `@UseGuards(PermissionGuard)` decorator
- ✅ Áp dụng `@RequirePermissions()` decorator cho từng endpoint
- ✅ Validate organization context cho permissions

## 5. Testing Scenarios

### A. Permission Test Cases

#### Classes Page Test Cases
1. **No Permissions**:
   - Không hiển thị Add button
   - Không hiển thị Action column
   - Empty state: "Bạn không có quyền xem danh sách lớp học"

2. **View Only Permission**:
   - Hiển thị View button only
   - Không hiển thị Add button
   - Empty state: "Không có lớp học nào. Liên hệ quản trị viên để thêm lớp học."

3. **Create Only Permission**:
   - Hiển thị Add dropdown với các tùy chọn create
   - Không hiển thị Edit/Delete buttons
   - Empty state: "Không có lớp học nào. Hãy tạo lớp học đầu tiên."

4. **Full Permissions**:
   - Hiển thị tất cả buttons và actions
   - Có thể thực hiện mọi thao tác
   - Bulk actions available

#### Departments Page Test Cases
1. **No Permissions**:
   - Tương tự classes với entity "phòng ban"

2. **View Only Permission**:
   - Tương tự classes với entity "phòng ban"

3. **Create Only Permission**:
   - Tương tự classes với entity "phòng ban"

4. **Full Permissions**:
   - Tương tự classes với entity "phòng ban"

### B. Edge Cases
1. **Permission Revocation**: Xử lý khi permission bị thu hồi trong khi sử dụng
2. **Role Change**: Xử lý khi role thay đổi realtime
3. **Organization Switch**: Permission validation theo organization context
4. **Network Issues**: Graceful handling khi không load được permissions

## 6. Performance Considerations

### A. Permission Caching
- ✅ Sử dụng `useMemo` trong custom hooks
- ✅ Cache permissions theo organization context
- ⏳ Implement permission refresh on role/organization change

### B. Component Optimization
- ✅ `ConditionalRender` & `PermissionGuard` để tránh render không cần thiết
- ✅ Lazy loading components based on permissions
- ⏳ Memoize permission calculations

## 7. Documentation Requirements

### A. Developer Documentation
- ⏳ API endpoint permission requirements
- ⏳ Frontend permission hook usage
- ⏳ Testing guidelines for permissions

### B. User Documentation
- ⏳ Permission roles and capabilities matrix
- ⏳ Troubleshooting permission issues
- ⏳ Admin guide for permission management

## 8. Deployment Checklist

### A. Frontend Deployment
- ✅ Custom hooks deployed and tested
- ✅ Updated pages with permission guards
- ⏳ Integration tests passed
- ⏳ Performance tests completed

### B. Backend Deployment
- ⏳ Permission guards implemented on all endpoints
- ⏳ Database migrations for new permissions
- ⏳ Seed data for default roles updated
- ⏳ API tests with permission scenarios

### C. Production Validation
- ⏳ Permission matrix validation
- ⏳ Role-based access testing
- ⏳ Performance monitoring
- ⏳ User acceptance testing

## 9. Rollback Plan

### A. Frontend Rollback
- ⏳ Remove permission checks (fallback to previous behavior)
- ⏳ Restore original page components
- ⏳ Maintain data integrity

### B. Backend Rollback
- ⏳ Disable permission guards temporarily
- ⏳ Revert to previous authorization logic
- ⏳ Database rollback if needed

## 10. Next Steps

### Immediate (This Sprint)
1. ✅ Complete frontend permission implementation
2. ⏳ Add backend permission guards
3. ⏳ Write unit tests for permission hooks
4. ⏳ Integration testing

### Near-term (Next Sprint)
1. ⏳ Performance optimization
2. ⏳ Documentation completion
3. ⏳ User acceptance testing
4. ⏳ Production deployment

### Long-term
1. ⏳ Advanced permission features (conditional permissions)
2. ⏳ Permission analytics and monitoring
3. ⏳ Role templates and bulk assignment
4. ⏳ Permission audit trail

## Status Legend
- ✅ Completed
- ⏳ Pending/In Progress
- ❌ Not Started/Blocked

---

**Last Updated**: December 30, 2024
**Reviewed By**: Development Team
**Next Review**: January 6, 2025
