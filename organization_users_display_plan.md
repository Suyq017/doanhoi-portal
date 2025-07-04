# Kế hoạch triển khai hiển thị danh sách người dùng trong trang tổ chức

## 📋 Tổng quan dự án

### Yêu cầu
- Tự động hiển thị danh sách người dùng khi tổ chức được chọn là tổ chức con cuối cùng (leaf node)
- Giao diện giống như UserPage
- Tái sử dụng tối đa các component và logic đã có
- Không thay đổi code hiện tại, chỉ bổ sung thêm

### Phạm vi ảnh hưởng
- `OrganizationsDetailPage.tsx`
- `OrganizationsSubDetailPage.tsx`
- Các component liên quan đến hiển thị người dùng

## 🏗️ Kiến trúc hiện tại

### Cấu trúc trang tổ chức
```
OrganizationsPage.tsx                    (Level 2 - Trang chính)
├── OrganizationsDetailPage.tsx          (Level 2 - Chi tiết tổ chức cha)
└── OrganizationsSubDetailPage.tsx       (Level 3 - Chi tiết tổ chức con)
```

### Components tái sử dụng từ UserPage
```
frontend/src/features/users/
├── UsersPage.tsx                        (Template chính)
├── components/
│   ├── CreateUserModal.tsx
│   ├── EditUserModal.tsx
│   ├── ViewUserModal.tsx
│   └── DeleteConfirmModal.tsx
```

### Shared components có sẵn
```
frontend/src/shared/
├── components/
│   ├── Select.tsx                       (Dropdown filter)
│   ├── Toast.tsx                        (Thông báo)
│   └── ImportModal.tsx                  (Import Excel)
├── services/
│   └── userService.ts                   (API calls)
├── hooks/
│   └── useToast.ts
└── utils/
    └── importColumns.ts
```

## 🎯 Kế hoạch triển khai

### Phase 1: Tạo shared components cho User List

#### 1.1 Tạo UserListTable component
**File**: `frontend/src/shared/components/UserListTable.tsx`
```typescript
// Component bảng hiển thị danh sách người dùng có thể tái sử dụng
interface UserListTableProps {
  users: User[];
  loading: boolean;
  onViewUser: (user: User) => void;
  onEditUser: (user: User) => void;
  onDeleteUser: (user: User) => void;
  showActions?: boolean;
  organizationContext?: boolean; // Để điều chỉnh hiển thị khi dùng trong context tổ chức
}
```

**Nội dung chính:**
- Tái sử dụng table structure từ `UsersPage.tsx`
- Các cột: Thông tin, Liên hệ, Loại, Trạng thái, Ngày tạo, Hành động
- Hỗ trợ responsive design
- Tích hợp dark mode

#### 1.2 Tạo UserListFilters component
**File**: `frontend/src/shared/components/UserListFilters.tsx`
```typescript
interface UserListFiltersProps {
  searchTerm: string;
  filterType: string;
  filterStatus: string;
  onSearchChange: (value: string) => void;
  onTypeChange: (value: string) => void;
  onStatusChange: (value: string) => void;
  organizationId?: string; // Filter theo tổ chức cụ thể
}
```

**Nội dung chính:**
- Tái sử dụng filter logic từ `UsersPage.tsx`
- Search box với debounce
- Dropdown filters cho user type và membership status
- Responsive grid layout

#### 1.3 Tạo UserListPagination component
**File**: `frontend/src/shared/components/UserListPagination.tsx`
```typescript
interface UserListPaginationProps {
  currentPage: number;
  totalPages: number;
  total: number;
  limit: number;
  onPageChange: (page: number) => void;
}
```

**Nội dung chính:**
- Tái sử dụng pagination logic từ `UsersPage.tsx`
- Previous/Next buttons
- Page info display
- Responsive design

### Phase 2: Tạo hook quản lý User List

#### 2.1 Tạo useUserList hook
**File**: `frontend/src/shared/hooks/useUserList.ts`
```typescript
interface UseUserListOptions {
  organizationId?: string;
  autoLoad?: boolean;
  initialFilters?: {
    userType?: string;
    membershipStatus?: string;
  };
}

interface UseUserListReturn {
  users: User[];
  loading: boolean;
  error: string | null;
  total: number;
  currentPage: number;
  searchTerm: string;
  filterType: string;
  filterStatus: string;
  
  // Actions
  loadUsers: () => Promise<void>;
  setCurrentPage: (page: number) => void;
  setSearchTerm: (term: string) => void;
  setFilterType: (type: string) => void;
  setFilterStatus: (status: string) => void;
  
  // User actions
  handleCreateUser: (userData: CreateUserRequest) => Promise<void>;
  handleUpdateUser: (id: string, userData: CreateUserRequest) => Promise<void>;
  handleDeleteUser: (id: string) => Promise<void>;
}
```

**Nội dung chính:**
- Tái sử dụng logic từ `UsersPage.tsx`
- Tích hợp API calls với `userService`
- Hỗ trợ filter theo organizationId
- Auto-refresh sau CRUD operations
- Error handling và loading states

### Phase 3: Tạo OrganizationUsersList component

#### 3.1 Tạo component chính
**File**: `frontend/src/features/organizations/components/OrganizationUsersList.tsx`
```typescript
interface OrganizationUsersListProps {
  organizationId: string;
  organizationName: string;
  showHeader?: boolean;
  showImport?: boolean;
  showCreate?: boolean;
}
```

**Nội dung chính:**
- Sử dụng `useUserList` hook với organizationId
- Tích hợp `UserListTable`, `UserListFilters`, `UserListPagination`
- Tái sử dụng các modal từ `features/users/components/`
- Hỗ trợ import Excel với config phù hợp
- Toast notifications
- Responsive layout

#### 3.2 Tích hợp User Modals
```typescript
// Tái sử dụng từ features/users/components/
import CreateUserModal from '../../users/components/CreateUserModal';
import ViewUserModal from '../../users/components/ViewUserModal';
import EditUserModal from '../../users/components/EditUserModal';
import DeleteConfirmModal from '../../users/components/DeleteConfirmModal';
```

### Phase 4: Tạo logic detect leaf organization

#### 4.1 Tạo utility function
**File**: `frontend/src/features/organizations/utils/organizationDetection.ts`
```typescript
export const isLeafOrganization = (organization: Organization): boolean => {
  return !organization.children || organization.children.length === 0;
};

export const shouldShowUsersList = (
  organizations: Organization[],
  currentPath: string
): { show: boolean; organization?: Organization } => {
  // Logic xác định có nên hiển thị user list không
  // Dựa trên cấu trúc organizations và current path
};

export const getCurrentOrganizationFromPath = (
  organizations: Organization[],
  type: string,
  code: string
): Organization | null => {
  // Tìm organization hiện tại từ path parameters
};
```

### Phase 5: Cập nhật các trang Detail

#### 5.1 Cập nhật OrganizationsDetailPage
**File**: `frontend/src/features/organizations/OrganizationsDetailPage.tsx`

**Bổ sung:**
```typescript
import { isLeafOrganization, getCurrentOrganizationFromPath } from './utils/organizationDetection';
import OrganizationUsersList from './components/OrganizationUsersList';

// Trong component:
const currentOrg = getCurrentOrganizationFromPath(organizations, type, code);
const showUsersList = currentOrg && isLeafOrganization(currentOrg);
```

**Render logic:**
```typescript
return (
  <OrganizationPageLayout>
    {showUsersList ? (
      <OrganizationUsersList 
        organizationId={currentOrg.id}
        organizationName={currentOrg.name}
        showHeader={true}
        showImport={true}
        showCreate={true}
      />
    ) : (
      <OrganizationTreeContainer>
        {/* Existing tree rendering */}
      </OrganizationTreeContainer>
    )}
  </OrganizationPageLayout>
);
```

#### 5.2 Cập nhật OrganizationsSubDetailPage
**File**: `frontend/src/features/organizations/OrganizationsSubDetailPage.tsx`

**Tương tự như DetailPage nhưng:**
- Sử dụng filteredOrg thay vì organizations
- Logic detect leaf dựa trên filteredOrg[0]
- Import config level 3

### Phase 6: Tạo API enhancements

#### 6.1 Cập nhật userService
**File**: `frontend/src/shared/services/userService.ts`

**Bổ sung method:**
```typescript
getUsersByOrganization: async (
  organizationId: string, 
  params?: UserQueryParams
): Promise<UsersResponse> => {
  // API call lấy users theo organization
  // Combine organizationId với existing params
}
```

#### 6.2 Backend API endpoint (nếu chưa có)
**File**: `backend/src/users/users.controller.ts`
```typescript
@Get('by-organization/:organizationId')
async getUsersByOrganization(
  @Param('organizationId') organizationId: string,
  @Query() params: UserQueryParams
) {
  // Implementation
}
```

### Phase 7: Cập nhật routing và navigation

#### 7.1 Cập nhật breadcrumb
**File**: `frontend/src/features/organizations/components/OrganizationPageLayout.tsx`

**Bổ sung:**
- Breadcrumb hiển thị "Users" khi ở mode user list
- Back button về organization tree view

#### 7.2 Cập nhật navigation logic
**File**: `frontend/src/features/organizations/hooks/useOrganizationPage.ts`

**Bổ sung:**
- State management cho view mode (tree vs users)
- Toggle function giữa tree view và user list view

### Phase 8: Styling và UI/UX

#### 8.1 Consistent styling
- Đảm bảo user list trong organization context có styling nhất quán
- Dark mode support
- Responsive design
- Loading states và error handling

#### 8.2 Animation và transitions
- Smooth transition khi switch giữa tree view và user list
- Loading skeletons
- Empty states

### Phase 9: Translation và i18n

#### 9.1 Cập nhật translation files
**Files**: 
- `frontend/public/locales/vi/organizations.json`
- `frontend/public/locales/en/organizations.json`

**Bổ sung keys:**
```json
{
  "usersList": {
    "title": "Danh sách thành viên",
    "subtitle": "Quản lý thành viên trong tổ chức",
    "emptyState": "Chưa có thành viên nào trong tổ chức này",
    "backToTree": "Quay lại cây tổ chức"
  }
}
```

### Phase 10: Testing và optimization

#### 10.1 Unit tests
- Test các utility functions
- Test useUserList hook
- Test OrganizationUsersList component

#### 10.2 Integration tests
- Test flow từ organization tree đến user list
- Test CRUD operations trong context organization
- Test filtering và pagination

#### 10.3 Performance optimization
- Lazy loading cho user list
- Memoization cho expensive operations
- Debounced search
- Virtual scrolling nếu danh sách lớn

## 📁 Cấu trúc file mới

```
frontend/src/
├── shared/
│   ├── components/
│   │   ├── UserListTable.tsx          (Mới)
│   │   ├── UserListFilters.tsx        (Mới)
│   │   └── UserListPagination.tsx     (Mới)
│   ├── hooks/
│   │   └── useUserList.ts             (Mới)
│   └── services/
│       └── userService.ts             (Cập nhật)
├── features/
│   ├── organizations/
│   │   ├── components/
│   │   │   └── OrganizationUsersList.tsx  (Mới)
│   │   ├── utils/
│   │   │   └── organizationDetection.ts   (Mới)
│   │   ├── OrganizationsDetailPage.tsx    (Cập nhật)
│   │   └── OrganizationsSubDetailPage.tsx (Cập nhật)
│   └── users/
│       └── components/                     (Tái sử dụng)
```

## 🚀 Lộ trình triển khai

### Tuần 1: Shared Components
- [ ] Tạo UserListTable component
- [ ] Tạo UserListFilters component  
- [ ] Tạo UserListPagination component
- [ ] Test các component riêng lẻ

### Tuần 2: Logic và Hooks
- [ ] Tạo useUserList hook
- [ ] Tạo utility functions cho organization detection
- [ ] Cập nhật userService API
- [ ] Unit testing

### Tuần 3: Integration
- [ ] Tạo OrganizationUsersList component
- [ ] Cập nhật OrganizationsDetailPage
- [ ] Cập nhật OrganizationsSubDetailPage
- [ ] Integration testing

### Tuần 4: Polish và Deploy
- [ ] UI/UX refinements
- [ ] Translation updates
- [ ] Performance optimization
- [ ] End-to-end testing
- [ ] Deploy và monitor

## 🔧 Lưu ý kỹ thuật

### Compatibility
- Đảm bảo backward compatibility với code hiện tại
- Không breaking changes
- Progressive enhancement approach

### Performance
- Lazy loading cho user data
- Efficient re-rendering với React.memo
- Debounced search và filtering
- Optimistic UI updates

### Error Handling
- Graceful degradation khi API fails
- User-friendly error messages
- Retry mechanisms
- Loading states

### Accessibility
- Keyboard navigation
- Screen reader support
- ARIA labels
- Focus management

## 📊 Success Metrics

### Functional
- [ ] User list hiển thị chính xác khi organization là leaf node
- [ ] Tất cả CRUD operations hoạt động bình thường
- [ ] Search và filter hoạt động như mong đợi
- [ ] Pagination hoạt động chính xác
- [ ] Import Excel hoạt động trong context organization

### Performance
- [ ] Initial load time < 2s
- [ ] Search response time < 500ms
- [ ] Smooth transitions và animations
- [ ] No memory leaks

### UX
- [ ] Intuitive navigation
- [ ] Consistent UI với phần còn lại của app
- [ ] Responsive trên tất cả devices
- [ ] Accessible cho tất cả users

Kế hoạch này đảm bảo tái sử dụng tối đa code hiện có, không breaking changes, và cung cấp trải nghiệm người dùng nhất quán trong toàn bộ application.
