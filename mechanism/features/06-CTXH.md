# Feature: CTXH (Công tác xã hội)

## Tổng quan
Module quản lý hoạt động Công tác xã hội (CTXH) của sinh viên, bao gồm quản lý danh mục, hoạt động, điểm danh và tính ngày CTXH.

## Đường dẫn
```
frontend/src/features/ctxh/
├── api/
│   └── ctxhApi.ts                     # API client
├── components/
│   ├── activity/
│   │   ├── ActivityList.tsx           # Danh sách hoạt động
│   │   ├── ActivityCard.tsx           # Card hoạt động
│   │   └── ActivityFilters.tsx        # Bộ lọc
│   ├── category/
│   │   ├── CategoryList.tsx           # Danh sách danh mục
│   │   ├── CategoryForm.tsx           # Form tạo/sửa
│   │   └── CategoryDetailModal.tsx    # Modal chi tiết
│   ├── limit-config/
│   │   ├── LimitConfigList.tsx        # Danh sách cấu hình
│   │   └── LimitConfigForm.tsx        # Form cấu hình
│   ├── shared/
│   │   ├── PageStates.tsx             # Loading/Error states
│   │   ├── Statistics.tsx             # Thống kê
│   │   └── ToastContainer.tsx         # Toast notifications
│   ├── ActivityForm.tsx               # Form hoạt động
│   └── ParticipantManagement.tsx      # Quản lý người tham gia
├── config/
│   └── permissions.ts                 # Permission config
├── hooks/
│   ├── useActivityManagement.ts       # Hook quản lý hoạt động
│   ├── useCategoryManagement.ts       # Hook quản lý danh mục
│   ├── useLimitConfigManagement.ts    # Hook cấu hình giới hạn
│   └── useCtxhPermissions.ts          # Hook quyền CTXH
├── pages/
│   ├── ActivityManagement.tsx         # Trang quản lý hoạt động
│   ├── ActivityDetail.tsx             # Chi tiết hoạt động
│   ├── CategoryManagement.tsx         # Trang quản lý danh mục
│   ├── LimitConfigManagement.tsx      # Trang cấu hình giới hạn
│   └── CtxhOldSystemImportPage.tsx    # Import từ hệ thống cũ
├── services/                          # Business logic services
├── types/
│   ├── ctxh.types.ts                  # Type definitions
│   ├── hooks.types.ts                 # Hook types
│   └── components.types.ts            # Component types
└── utils/                             # Helper utilities
```

## Chức năng chính

### 1. Quản lý danh mục (Categories)
- Tạo/sửa/xóa danh mục hoạt động
- Xem danh sách danh mục
- Xem danh sách chi tiết hoạt động của mỗi danh mục

### 2. Quản lý hoạt động (Activities)
- Tạo hoạt động CTXH mới
- Chỉnh sửa thông tin hoạt động
- Thay đổi trạng thái (Draft → Active → Completed)
- Hủy hoạt động

### 3. Quản lý người tham gia (Participants)
- Thêm sinh viên vào hoạt động
- Chấm ngày CTXH thực tế
- Xóa sinh viên khỏi hoạt động
- Import danh sách từ Excel (Thêm sinh viên, chấm ngày CTXH)

### 4. Cấu hình giới hạn (Limit Config)
- Cấu hình số ngày CTXH tối đa của tổ chức có thể cấp cho 1 hoạt động
- Tự động áp dụng cấu hình cho tổ chức con khi tạo hoặc chỉnh sửa

### 5. AI Chat Assistant
- Hỏi đáp về quy định CTXH
- Tra cứu thông tin hoạt động
- Gợi ý hoạt động phù hợp

## Types

```typescript
enum ActivityStatus {
  DRAFT = 'DRAFT',
  ACTIVE = 'ACTIVE',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED'
}

enum ParticipationStatus {
  REGISTERED = 'REGISTERED',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED'
}

interface CtxhActivity {
  id: string;
  name: string;
  description?: string;
  location?: string;
  categoryId: string;
  organizationId: string;
  startDate?: string;
  endDate?: string;
  totalDays?: number;
  status: ActivityStatus;
  category?: CtxhCategory;
  organization?: Organization;
  _count?: { participations: number };
}

interface CtxhParticipation {
  id: string;
  activityId: string;
  studentId: string;
  actualDays?: number;
  status: ParticipationStatus;
  note?: string;
  gradedBy?: string;
  student?: User;
}

interface CtxhLimitConfig {
  id: string;
  academicYear: string;
  minDays: number;
  organizationId?: string;
  isActive: boolean;
}
```

## Components

### ActivityList
- Grid/List view toggle
- Filters: Danh mục, Trạng thái, Tổ chức
- Search
- Pagination

### ActivityCard
- Tên + Danh mục badge
- Ngày diễn ra
- Địa điểm
- Số ngày CTXH
- Trạng thái badge
- Actions menu

### ParticipantManagement
- Bảng danh sách sinh viên
- Search by MSSV
- Thêm sinh viên (lookup by code)
- Chấm ngày CTXH (inline edit)
- Bulk actions

### LimitConfigForm
- Select năm học
- Input số ngày tối thiểu
- Toggle trạng thái
- Select tổ chức (optional)

## API Endpoints

### Categories
| Method | Endpoint | Mô tả |
|--------|----------|-------|
| GET | `/ctxh/categories` | Danh sách danh mục |
| POST | `/ctxh/categories` | Tạo danh mục |
| PATCH | `/ctxh/categories/:id` | Cập nhật danh mục |
| DELETE | `/ctxh/categories/:id` | Xóa danh mục |

### Activities
| Method | Endpoint | Mô tả |
|--------|----------|-------|
| GET | `/ctxh/activities` | Danh sách hoạt động |
| GET | `/ctxh/activities/:id` | Chi tiết hoạt động |
| POST | `/ctxh/activities` | Tạo hoạt động |
| PATCH | `/ctxh/activities/:id` | Cập nhật hoạt động |
| DELETE | `/ctxh/activities/:id` | Xóa hoạt động |

### Participants
| Method | Endpoint | Mô tả |
|--------|----------|-------|
| GET | `/ctxh/activities/:id/participants` | Danh sách tham gia |
| POST | `/ctxh/activities/:id/participants` | Thêm sinh viên |
| PATCH | `/ctxh/participants/:id/grade` | Chấm ngày CTXH |
| DELETE | `/ctxh/participants/:id` | Xóa sinh viên |

### Limit Config
| Method | Endpoint | Mô tả |
|--------|----------|-------|
| GET | `/ctxh/limit-configs` | Danh sách cấu hình |
| POST | `/ctxh/limit-configs` | Tạo cấu hình |
| PATCH | `/ctxh/limit-configs/:id` | Cập nhật |
| DELETE | `/ctxh/limit-configs/:id` | Xóa |

## Permissions
```
ctxh.access                 # Truy cập module CTXH
ctxh.categories.create      # Tạo danh mục
ctxh.categories.update      # Sửa danh mục
ctxh.categories.delete      # Xóa danh mục
ctxh.activities.create      # Tạo hoạt động
ctxh.activities.update      # Sửa hoạt động
ctxh.activities.delete      # Xóa hoạt động
ctxh.participants.manage    # Quản lý người tham gia
ctxh.reports.export         # Xuất file danh sách kết quả của sinh viên thuộc hoạt động
ctxh.limit-configs.manage   # Quản lý cấu hình giới hạn
```

## Activity Workflow

```
DRAFT ──────> ACTIVE ──────> COMPLETED
  │              │
  │              └──────> CANCELLED
  │
  └────────────────────> CANCELLED
```

### Trạng thái và hành động

| Trạng thái | Có thể làm |
|------------|------------|
| DRAFT | Sửa, Xóa, Kích hoạt |
| ACTIVE | Sửa (giới hạn), Thêm/Xóa SV, Chấm điểm, Hoàn thành, Hủy |
| COMPLETED | Xem only |
| CANCELLED | Xem only |

## Lưu ý kỹ thuật
- Ngày CTXH = `totalDays` của hoạt động
- Ngày thực tế = `actualDays` của participation (có thể < totalDays)
- Support import từ hệ thống CTXH cũ
- AI Chat sử dụng RAG với vector database
- Cache categories vì ít thay đổi
- Real-time update participant count
