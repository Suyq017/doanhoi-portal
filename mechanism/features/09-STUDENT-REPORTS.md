# Feature: Student Reports (Báo cáo CTXH sinh viên)

## Tổng quan
Module hiển thị báo cáo hoạt động Công tác xã hội của sinh viên, bao gồm thống kê số giờ, danh sách hoạt động đã tham gia, và tiến độ hoàn thành theo năm học.

## Đường dẫn
```
frontend/src/features/student-reports/
├── components/
│   ├── ActivityHistoryTable.tsx          # Bảng lịch sử hoạt động
│   ├── CTXHLimitCard.tsx                 # Card hiển thị limit CTXH
│   ├── CTXHStatisticsPanel.tsx           # Panel thống kê
│   ├── FilterBar.tsx                     # Thanh filter
│   ├── NavigationBreadcrumb.tsx          # Breadcrumb
│   ├── StatCard.tsx                      # Card thống kê đơn
│   ├── StatCards.tsx                     # Grid các stat cards
│   ├── StudentReportHeader.tsx           # Header trang
│   └── YearSelector.tsx                  # Dropdown chọn năm học
├── hooks/
│   ├── useStudentReportStats.ts          # Hook lấy thống kê
│   ├── useActivityHistory.ts             # Hook lấy lịch sử
│   └── useAcademicYear.ts                # Hook năm học
├── pages/
│   └── StudentReportsPage.tsx            # Trang chính
├── types/
│   └── hooks.types.ts                    # Type definitions
└── utils/
    ├── calculations.ts                   # Tính toán thống kê
    └── formatters.ts                     # Format dữ liệu
```

## Chức năng chính

### 1. Xem thống kê CTXH
- Tổng số giờ CTXH đã tích lũy
- Số hoạt động đã tham gia
- Tiến độ hoàn thành (% so với yêu cầu)

### 2. Lịch sử hoạt động
- Danh sách hoạt động đã đăng ký
- Trạng thái: Đã duyệt, Chờ duyệt, Từ chối
- Số giờ của mỗi hoạt động

### 3. Filter theo năm học
- Chọn năm học để xem báo cáo
- So sánh giữa các năm học

### 4. Limit CTXH
- Hiển thị giới hạn CTXH theo cấu hình
- Cảnh báo khi gần đạt/vượt limit

## Types

```typescript
// Hook result type
interface UseStudentReportStatsResult {
  stats: StudentReportStats | null;
  isLoading: boolean;
  error: Error | null;
  refetch: () => void;
}

interface StudentReportStats {
  totalHours: number;
  totalActivities: number;
  approvedActivities: number;
  pendingActivities: number;
  rejectedActivities: number;
  limit: CTXHLimit | null;
  progress: number; // percentage
}

interface CTXHLimit {
  id: string;
  academicYear: string;
  minHours: number;
  maxHours: number;
  description?: string;
}

interface ActivityHistoryItem {
  id: string;
  activityId: string;
  activityName: string;
  category: string;
  hours: number;
  status: ParticipantStatus;
  registeredAt: string;
  approvedAt?: string;
  notes?: string;
}

type ParticipantStatus = 'PENDING' | 'APPROVED' | 'REJECTED';

interface AcademicYear {
  value: string;  // e.g., "2024-2025"
  label: string;  // e.g., "Năm học 2024-2025"
}
```

## Components

### StudentReportsPage
- Layout chính của trang
- Fetch data qua hooks
- Render các sub-components

### StatCards
Grid 4 thẻ thống kê:
- **Tổng số giờ**: Số giờ CTXH đã tích lũy
- **Tổng hoạt động**: Số hoạt động đã tham gia
- **Đã duyệt**: Số hoạt động được duyệt
- **Chờ duyệt**: Số hoạt động đang chờ

### CTXHStatisticsPanel
- Progress bar tiến độ
- So sánh với limit năm học
- Màu sắc theo mức độ hoàn thành

### ActivityHistoryTable
| Column | Description |
|--------|-------------|
| Tên hoạt động | Tên và category |
| Số giờ | Số giờ CTXH |
| Trạng thái | Badge trạng thái |
| Ngày đăng ký | Thời gian đăng ký |
| Ghi chú | Notes (nếu có) |

### YearSelector
- Dropdown chọn năm học
- Default: Năm học hiện tại
- Trigger refetch khi thay đổi

### CTXHLimitCard
- Min/Max giờ yêu cầu
- Số giờ hiện tại
- Progress visualization
- Warning khi chưa đạt

### FilterBar
- Filter theo năm học
- Filter theo trạng thái
- Search theo tên hoạt động

## API Endpoints

| Method | Endpoint | Mô tả |
|--------|----------|-------|
| GET | `/ctxh/my-statistics` | Thống kê CTXH của user |
| GET | `/ctxh/my-activities` | Danh sách hoạt động đã đăng ký |
| GET | `/ctxh/limits/:academicYear` | Giới hạn CTXH theo năm học |

### Response Example
```json
// GET /ctxh/my-statistics?academicYear=2024-2025
{
  "totalHours": 50,
  "totalActivities": 8,
  "approvedActivities": 6,
  "pendingActivities": 1,
  "rejectedActivities": 1,
  "limit": {
    "minHours": 60,
    "maxHours": 100
  }
}

// GET /ctxh/my-activities
{
  "data": [
    {
      "id": "act-1",
      "activityName": "Hiến máu nhân đạo",
      "category": "Xã hội",
      "hours": 8,
      "status": "APPROVED",
      "registeredAt": "2024-03-15T10:00:00Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 8
  }
}
```

## Permissions
```
student-reports.view  # Xem báo cáo CTXH cá nhân
```

**Note**: Feature này chủ yếu dành cho sinh viên xem thông tin của bản thân, không cần nhiều permissions phức tạp.

## Utility Functions

### calculations.ts
```typescript
// Tính tiến độ hoàn thành
export const calculateProgress = (
  currentHours: number, 
  minHours: number
): number => {
  if (minHours <= 0) return 100;
  return Math.min(100, (currentHours / minHours) * 100);
};

// Xác định màu progress
export const getProgressColor = (progress: number): string => {
  if (progress >= 100) return 'green';
  if (progress >= 70) return 'blue';
  if (progress >= 40) return 'yellow';
  return 'red';
};
```

### formatters.ts
```typescript
// Format số giờ
export const formatHours = (hours: number): string => {
  return `${hours} giờ`;
};

// Format năm học
export const formatAcademicYear = (year: string): string => {
  return `Năm học ${year}`;
};

// Format trạng thái
export const formatStatus = (status: ParticipantStatus): string => {
  const statusMap = {
    PENDING: 'Chờ duyệt',
    APPROVED: 'Đã duyệt',
    REJECTED: 'Từ chối',
  };
  return statusMap[status];
};
```

## UI States

### Loading State
- Skeleton cho stat cards
- Skeleton cho table
- Spinner cho filters

### Empty State
- Không có hoạt động nào
- Hướng dẫn đăng ký hoạt động

### Error State
- Retry button
- Error message

## Progress Visualization

```
Tiến độ CTXH: 50/60 giờ (83.3%)

[████████████████████░░░░░░░░░░] 83%
         Đã hoàn thành: 50 giờ
         Yêu cầu tối thiểu: 60 giờ
         Còn thiếu: 10 giờ
```

## Lưu ý kỹ thuật
- Sử dụng TanStack Query cho caching
- Academic year từ system config
- Responsive design cho mobile
- Export PDF báo cáo (future)
- Share báo cáo (future)
