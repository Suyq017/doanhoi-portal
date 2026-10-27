# Feature: Dashboard

## Tổng quan
Trang tổng quan hiển thị các số liệu thống kê chính của hệ thống Đoàn Hội Portal, bao gồm thống kê người dùng, tổ chức và dung lượng lưu trữ S3.

## Đường dẫn
```
frontend/src/features/dashboard/
├── components/
│   ├── DashboardHeader.tsx        # Header với tiêu đề
│   ├── StatsGrid.tsx              # Grid hiển thị các stat cards
│   ├── StatCard.tsx               # Card thống kê đơn lẻ
│   ├── S3StorageChart.tsx         # Biểu đồ dung lượng S3
│   ├── S3TrendChart.tsx           # Biểu đồ xu hướng sử dụng S3
│   └── AwsS3ConfigSection.tsx     # Section cấu hình AWS S3
├── hooks/
│   ├── useDashboardData.ts        # Hook tổng hợp dữ liệu dashboard
│   ├── useDashboardStats.ts       # Hook thống kê
│   └── useDashboardPermission.ts  # Hook kiểm tra quyền
├── pages/
│   └── DashboardPage.tsx          # Trang dashboard chính
├── services/                      # API services
└── types/
    └── index.ts                   # Type definitions
```

## Chức năng chính

### 1. Thống kê người dùng
- Tổng số người dùng
- Số Đoàn viên
- Số Hội viên
- Tỷ lệ tăng trưởng theo tháng

### 2. Thống kê tổ chức
- Tổng số tổ chức
- Phân loại: Đoàn / Hội / CLB
- Tổng số thành viên

### 3. S3 Storage Statistics
- Tổng dung lượng sử dụng
- Số lượng objects
- Phân bổ theo folder (avatars, documents, images, others)
- Biểu đồ xu hướng theo tháng

## Types

```typescript
interface DashboardStats {
  totalUsers: number;
  doanVienCount: number;
  hoiVienCount: number;
  organizationCount: number;
  totalUserGrowth: string;
  doanVienGrowth: string;
  hoiVienGrowth: string;
  organizationGrowth: string;
}

interface S3Statistics {
  bucketName: string;
  totalSize: number;
  totalObjects: number;
  folderStats: S3FolderStats;
  monthlyStats: S3MonthlyStat[];
}
```

## Components

### DashboardHeader
- Tiêu đề "Tổng quan"
- Subtitle mô tả

### StatsGrid
- Grid responsive 4 cột
- Hiển thị các StatCard

### StatCard
- Icon với màu sắc
- Giá trị số
- Label
- Badge tăng trưởng (%)

### S3StorageChart
- Pie/Doughnut chart phân bổ dung lượng
- Legend cho từng folder
- Tooltip hiển thị chi tiết

### S3TrendChart
- Line/Bar chart xu hướng theo tháng
- Trục X: Tháng
- Trục Y: Dung lượng (MB/GB)

## API Endpoints

| Method | Endpoint | Mô tả |
|--------|----------|-------|
| GET | `/dashboard/stats` | Thống kê tổng quan |
| GET | `/dashboard/organization-stats` | Thống kê tổ chức |
| GET | `/dashboard/s3-statistics` | Thống kê S3 storage |

## Permissions
```
dashboard.access    # Truy cập trang dashboard
dashboard.view      # Xem thống kê
```

## Layout
```
┌─────────────────────────────────────────────────┐
│                Dashboard Header                  │
├──────────┬──────────┬──────────┬────────────────┤
│  Users   │  Đoàn    │   Hội    │  Organizations │
│   Card   │  viên    │  viên    │     Card       │
├──────────┴──────────┴──────────┴────────────────┤
│                                                  │
│  ┌──────────────────┐  ┌──────────────────────┐ │
│  │  S3 Storage      │  │  S3 Trend Chart      │ │
│  │  Pie Chart       │  │  Line Chart          │ │
│  └──────────────────┘  └──────────────────────┘ │
│                                                  │
└─────────────────────────────────────────────────┘
```

## Lưu ý kỹ thuật
- Sử dụng TanStack Query để cache data
- Auto refetch mỗi 5 phút
- Loading state với skeleton
- Error handling với retry button
- Responsive cho mobile/tablet
