# Grant Roles Modal - Kế hoạch thực hiện

## 📋 Mô tả tính năng
Tạo modal "Cấp vai trò cho người dùng" với giao diện và chức năng tương tự như modal "Thêm người dùng".

## 🎯 Yêu cầu chi tiết

### 1. **Nút Grant Roles**
- Màu sắc: Giống với nút "Thêm người dùng" (AddDropdownButton)
- Vị trí: Bên phải nút "Add User" 
- Icon: Shield
- Text: "Cấp vai trò"

### 2. **Grant Roles Modal Structure**
```
┌─────────────────────────────────────────────┐
│ [X] Cấp vai trò cho người dùng              │
├─────────────────────────────────────────────┤
│ 1. User Search Combobox                     │
│    [🔍 Tìm kiếm người dùng...]              │
│                                             │
│ 2. Checkbox Option                          │
│    ☐ Áp dụng cho những tổ chức mà người     │
│       dùng thuộc                            │
│                                             │
│ 3. Role & Organizations Rows                │
│    ┌─────────────────┬─────────────────────┬─┐│
│    │ Vai trò        │ Tổ chức (tùy chọn)  │+││
│    │ [Combobox]      │ [Combobox] (có thể  │ ││
│    │                 │  để trống)          │ ││
│    └─────────────────┴─────────────────────┴─┘│
│    ┌─────────────────┬─────────────────────┬─┐│
│    │ Vai trò 2      │ Tổ chức 2           │-││
│    │ [Combobox]      │ [Combobox]          │ ││
│    └─────────────────┴─────────────────────┴─┘│
│    [+ Thêm vai trò khác]                    │
│                                             │
│ [Hủy] [Cấp vai trò]                         │
└─────────────────────────────────────────────┘
```

### 3. **Chức năng các thành phần**

#### **User Search Combobox**
- Tìm kiếm người dùng theo tên, email, code
- Hiển thị dropdown với search
- Style giống OrganizationCombobox

#### **Apply to User Organizations Checkbox**
- Khi tick: Tự động load các tổ chức mà user thuộc vào ô "Tổ chức"
- Sắp xếp từ tổ chức cha → con
- Disable ô "Tổ chức" khi checkbox được tick

#### **Roles & Organizations Rows (Dynamic Multiple Rows)**
- **Multiple Rows**: Có thể thêm/xóa nhiều row để cấp nhiều vai trò khác nhau
- **Cột 1 - Vai trò**: Combobox chọn vai trò (bắt buộc)
  - Dropdown hiển thị tất cả vai trò có sẵn
  - Mỗi row chỉ chọn được 1 vai trò
- **Cột 2 - Tổ chức**: Combobox chọn tổ chức (tùy chọn)
  - Có thể để trống nếu vai trò không liên quan đến tổ chức cụ thể
  - Khi có tổ chức: vai trò chỉ áp dụng cho tổ chức đó
  - Khi để trống: vai trò áp dụng global (toàn hệ thống)
- **Cột 3 - Actions**: Nút xóa row (-) và thêm row (+)
- **Add Row Button**: Nút "Thêm vai trò khác" để thêm row mới
- **Auto-populate Organizations**: Khi checkbox "Áp dụng cho user orgs" được tick:
  - Tất cả các row sẽ tự động điền tổ chức của user vào cột "Tổ chức"
  - User có thể override bằng cách chọn tổ chức khác hoặc để trống

## 🏗️ Cấu trúc file cần tạo

### 1. **Components**
```
frontend/src/features/users/components/
├── GrantRolesModal.tsx                    # Main modal component
├── UserSearchCombobox.tsx                 # User search dropdown
├── RolesOrganizationRow.tsx               # Single role + organization row
└── RolesOrganizationManager.tsx           # Manager for multiple rows
```

### 2. **Hooks**
```
frontend/src/features/users/hooks/
└── useGrantRoles.ts                       # Logic xử lý grant roles
```

### 3. **Services** 
```
backend/src/users/
├── dto/grant-roles.dto.ts                 # DTO cho grant roles
└── users.controller.ts                    # Endpoint POST /users/grant-roles
```

### 4. **Translation Keys**
```
frontend/public/locales/*/users.json
└── grantRoles: {
     title: "Cấp vai trò cho người dùng",
     userSearch: "Tìm kiếm người dùng...",
     applyToUserOrgs: "Áp dụng cho những tổ chức mà người dùng thuộc", 
     roles: "Vai trò",
     organizations: "Tổ chức (tùy chọn)",
     addRoleRow: "Thêm vai trò khác",
     removeRow: "Xóa",
     submitButton: "Cấp vai trò",
     globalRole: "Vai trò toàn hệ thống",
     organizationRole: "Vai trò theo tổ chức"
   }
```

## 🎨 Style và màu sắc

### 1. **Nút Grant Roles** 
- Copy exact styling từ `AddDropdownButton`
- Primary color: `bg-doan-600 text-white hover:bg-doan-700`

### 2. **Modal Styling**
- Copy exact structure từ `CreateUserModal.tsx`
- Header, body, footer layout giống hệt
- Form spacing và responsive design

### 3. **Form Components**
- `UserSearchCombobox`: Base on `OrganizationCombobox`
- `RolesOrganizationRow`: Single row component với 3 cột (Role, Organization, Actions)
- `RolesOrganizationManager`: Manager component cho multiple rows
- Dynamic row layout: Có thể thêm/xóa rows
- Organization field: Optional, có thể để trống

## 🔄 Data Flow

### 1. **User Selection**
```typescript
const [selectedUser, setSelectedUser] = useState<User | null>(null);
const [userOrganizations, setUserOrganizations] = useState<Organization[]>([]);
```

### 2. **Roles & Organizations Rows**
```typescript
interface RoleAssignment {
  id: string;                    // Unique ID cho mỗi row
  roleId: string;                // ID của vai trò được chọn
  organizationId?: string;       // ID tổ chức (optional)
  isGlobal: boolean;            // True nếu là vai trò toàn hệ thống
}

const [roleAssignments, setRoleAssignments] = useState<RoleAssignment[]>([
  { id: '1', roleId: '', organizationId: '', isGlobal: false }
]);
const [applyToUserOrgs, setApplyToUserOrgs] = useState(false);
```

### 3. **Submit Logic**
```typescript
interface GrantRolesRequest {
  userId: string;
  roleAssignments: {
    roleId: string;
    organizationId?: string;     // Optional - null/undefined for global roles
    isGlobal: boolean;          // True for system-wide roles
  }[];
}

// Row management functions
const addRoleRow = () => {
  const newRow: RoleAssignment = {
    id: Date.now().toString(),
    roleId: '',
    organizationId: '',
    isGlobal: false
  };
  setRoleAssignments([...roleAssignments, newRow]);
};

const removeRoleRow = (id: string) => {
  setRoleAssignments(roleAssignments.filter(row => row.id !== id));
};

const updateRoleRow = (id: string, updates: Partial<RoleAssignment>) => {
  setRoleAssignments(roleAssignments.map(row => 
    row.id === id ? { ...row, ...updates } : row
  ));
};
```

## 🚀 Implementation Steps

### Phase 1: UI Components (Frontend)
1. ✅ Update button styling to match AddDropdownButton
2. ✅ Create `GrantRolesModal.tsx` base structure
3. ✅ Create `UserSearchCombobox.tsx` 
4. ✅ Create `RolesOrganizationRow.tsx` (single row)
5. ✅ Create `RolesOrganizationManager.tsx` (multiple rows manager)
6. ✅ Add translation keys
7. ✅ Integrate modal into UsersPage

### Phase 2: Logic & Hooks
1. ✅ Create `useGrantRoles.ts` hook
2. ✅ Implement user search logic
3. ✅ Implement user organizations fetching
4. ✅ Implement dynamic rows management (add/remove/update)
5. ✅ Implement roles & organizations selection logic
6. ✅ Handle global vs organization-specific roles

### Phase 3: Backend Integration
1. 🔲 Create `grant-roles.dto.ts` với support cho optional organizationId
2. 🔲 Add endpoint in `users.controller.ts`
3. 🔲 Implement grant roles logic in `users.service.ts`
4. 🔲 Handle both global và organization-specific roles
5. 🔲 Validation logic cho role-organization combinations

### Phase 4: Testing & Polish
1. 🔲 Test user search functionality
2. 🔲 Test checkbox auto-populate organizations
3. 🔲 Test dynamic rows (add/remove/update)
4. 🔲 Test global vs organization-specific roles
5. 🔲 Test roles assignment validation
6. 🔲 Error handling & validation
7. 🔲 Responsive design testing

## 🎛️ Technical Details

### 1. **Color Matching AddDropdownButton**
```typescript
// From AddDropdownButton analysis:
const buttonClasses = "inline-flex items-center px-4 py-2 bg-doan-600 text-white rounded-md hover:bg-doan-700 focus:outline-none focus:ring-2 focus:ring-doan-500 focus:ring-offset-2 transition-colors duration-200";
```

### 2. **Modal Props Structure**
```typescript
interface GrantRolesModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  loading?: boolean;
}

interface RolesOrganizationRowProps {
  assignment: RoleAssignment;
  roles: Role[];
  organizations: Organization[];
  onUpdate: (updates: Partial<RoleAssignment>) => void;
  onRemove: () => void;
  canRemove: boolean;
  disabled?: boolean;
}
```

### 3. **User Organizations Auto-populate**
```typescript
// When checkbox is checked, fetch and set user's organizations for all rows
const handleApplyToUserOrgs = (checked: boolean) => {
  setApplyToUserOrgs(checked);
  if (checked && selectedUser) {
    const userOrgs = getUserOrganizations(selectedUser.id);    // Apply first organization to all existing rows, user can override
    setRoleAssignments(prev => 
      prev.map(assignment => ({
        ...assignment,
        organizationId: userOrgs[0]?.id || '',
        isGlobal: false
      }))
    );
  } else {
    // Clear organization assignments when unchecked
    setRoleAssignments(prev => 
      prev.map(assignment => ({
        ...assignment,
        organizationId: '',
        isGlobal: false
      }))
    );
  }
};

// Row operations
const addRow = () => {
  const newAssignment: RoleAssignment = {
    id: Date.now().toString(),
    roleId: '',
    organizationId: applyToUserOrgs && selectedUser ? userOrganizations[0]?.id || '' : '',
    isGlobal: false
  };
  setRoleAssignments([...roleAssignments, newAssignment]);
};
```

## 🎯 Success Criteria
- ✅ Nút Grant Roles có màu giống AddDropdownButton
- ✅ Modal có style và layout giống CreateUserModal 
- ✅ User search combobox hoạt động mượt mà
- ✅ Checkbox auto-populate organizations theo đúng hierarchy
- ✅ Dynamic multiple rows cho roles + organizations
- ✅ Organization field có thể để trống (global roles)
- ✅ Add/remove rows functionality
- ✅ Form validation và error handling
- ✅ Translation đầy đủ vi/en
- ✅ Backend API hỗ trợ global và organization-specific roles

## 📝 Notes
- Sử dụng existing components: `ConditionalRender`, form components
- Follow existing patterns: `CreateUserModal`, `UserRoleAssignmentModal`
- Maintain consistency với design system hiện tại
- Ensure accessibility và responsive design
- Support both global roles (no organization) và organization-specific roles
- Dynamic rows management cho flexibility trong cấp vai trò
- Validation: Không cho phép duplicate role trong cùng 1 organization
