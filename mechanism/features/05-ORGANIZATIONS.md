# Feature: Organizations (Quản lý tổ chức)

## Tổng quan
Module quản lý cấu trúc tổ chức của Đoàn - Hội theo cấu trúc cây phân cấp, từ cấp trường đến cấp lớp/chi đoàn.

## Đường dẫn
```
frontend/src/features/organizations/
├── components/
│   ├── OrganizationTreeItem.tsx       # Item trong cây tổ chức
│   ├── OrganizationTreeContainer.tsx  # Container cho tree
│   ├── OrganizationPageLayout.tsx     # Layout chung cho pages
│   ├── OrganizationDetailHeader.tsx   # Header trang chi tiết
│   ├── OrganizationMemberTable.tsx    # Bảng thành viên
│   ├── CreateOrganizationModal.tsx    # Modal tạo tổ chức
│   ├── EditOrganizationModal.tsx      # Modal chỉnh sửa
│   ├── ImportMembersModal.tsx         # Import thành viên
│   └── MemberStatsCard.tsx            # Card thống kê thành viên
├── context/
│   └── OrganizationContext.tsx        # Context quản lý state
├── hooks/
│   ├── useOrganizationPageState.ts    # Hook state tổng hợp
│   └── useOrganizationTree.ts         # Hook xử lý tree
├── pages/
│   ├── OrganizationsPage.tsx          # Trang danh sách chính
│   ├── DoanKhoaDetailPage.tsx         # Chi tiết Đoàn Khoa
│   ├── HoiDetailPage.tsx              # Chi tiết Hội
│   └── ChiDoanDetailPage.tsx          # Chi tiết Chi Đoàn
├── types/
│   └── index.ts                       # Type definitions
└── utils/
    └── organizationHelpers.ts         # Helper functions
```

## Cấu trúc tổ chức

```
Đoàn Trường / Hội Sinh viên Trường
├── Đoàn Khoa / Chi Hội Khoa
│   ├── Chi Đoàn / Chi Hội Lớp
│   │   └── Thành viên
│   └── ...
├── CLB / Đội nhóm
│   └── Thành viên
└── ...
```

## Chức năng chính

### 1. Quản lý cấu trúc cây
- Hiển thị tree view các tổ chức
- Expand/Collapse nodes
- Navigate theo breadcrumb

### 2. CRUD Tổ chức
- Tạo tổ chức con
- Chỉnh sửa thông tin
- Xóa tổ chức (với cascade)

### 3. Quản lý thành viên
- Danh sách thành viên của tổ chức
- Thêm thành viên
- Import hàng loạt
- Xóa thành viên

### 4. Thống kê
- Số Đoàn viên
- Số Hội viên
- Số thành viên cả hai
- Số thành viên chưa thuộc loại nào

## Types

```typescript
interface Organization {
  id: string;
  name: string;
  code: string;
  type: OrganizationType;
  level: number;
  parentId?: string;
  description?: string;
  isActive: boolean;
  children?: Organization[];
  _count?: {
    members: number;
    children: number;
  };
}

type OrganizationType = 
  | 'DOAN_TRUONG' 
  | 'DOAN_KHOA' 
  | 'CHI_DOAN'
  | 'HOI_TRUONG'
  | 'HOI_KHOA'
  | 'CHI_HOI'
  | 'CLB'
  | 'DOI_NHOM';

interface OrganizationStats {
  doanVienCount: number;
  hoiVienCount: number;
  bothMemberCount: number;
  nonMemberCount: number;
  totalMembers: number;
}
```

## Components

### OrganizationTreeItem
- Icon theo loại tổ chức
- Tên tổ chức + Badge số thành viên
- Expand/Collapse button
- Actions menu (Edit/Delete/View)
- Nested children

### OrganizationPageLayout
- Header với breadcrumb
- Stats cards
- Dropdown button (Add org, Add member, Import)
- Children content area

### MemberStatsCard
- 4 stats: Đoàn viên, Hội viên, Cả hai, Chưa phân loại
- Color-coded icons

### ImportMembersModal
- Upload file Excel
- Preview data trước khi import
- Validation errors display
- Progress indicator

## API Endpoints

| Method | Endpoint | Mô tả |
|--------|----------|-------|
| GET | `/organizations` | Danh sách tổ chức (tree) |
| GET | `/organizations/:id` | Chi tiết tổ chức |
| POST | `/organizations` | Tạo tổ chức |
| PATCH | `/organizations/:id` | Cập nhật tổ chức |
| DELETE | `/organizations/:id` | Xóa tổ chức |
| GET | `/organizations/:id/members` | Danh sách thành viên |
| POST | `/organizations/:id/members` | Thêm thành viên |
| DELETE | `/organizations/:id/members/:userId` | Xóa thành viên |
| POST | `/organizations/:id/members/import` | Import thành viên |
| GET | `/organizations/:id/stats` | Thống kê tổ chức |

## Permissions
```
organizations.access        # Truy cập module
organizations.create        # Tạo tổ chức
organizations.view          # Xem tổ chức
organizations.update        # Sửa tổ chức
organizations.delete        # Xóa tổ chức
organizations.manage-members # Quản lý thành viên
organizations.import        # Import thành viên
```

## Routing Structure

```
/portal/organizations                    # Danh sách chính
/portal/organizations/:type/:code        # Chi tiết cấp 1 (Đoàn Khoa, Hội)
/portal/organizations/:type/:code/:subType/:subCode  # Chi tiết cấp 2
```

## Tree Levels

| Level | Type | Example |
|-------|------|---------|
| 1 | Trường | Đoàn ĐHBK, Hội SV ĐHBK |
| 2 | Khoa | Đoàn Khoa CNTT, Chi Hội Khoa CNTT |
| 3 | Lớp/CLB | Chi Đoàn MT2020, CLB Lập trình |

## Import Template (Members)

| Column | Mô tả | Bắt buộc |
|--------|-------|----------|
| code | Mã sinh viên | ✓ |
| role | Vai trò (member/leader/secretary) | |

## Lưu ý kỹ thuật
- Tree data được load lazy (expand on click)
- Cache với TanStack Query
- Optimistic updates khi thêm/xóa thành viên
- Breadcrumb tự động generate từ path
- Hỗ trợ deep linking đến bất kỳ node nào
- Responsive cho mobile (tree collapse)
