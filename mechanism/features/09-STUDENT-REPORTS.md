# Feature: Student Reports (Báo cáo cá nhân)

## Tổng quan
Trang hiển thị báo cáo hoạt động Công tác xã hội của sinh viên, bao gồm thông tin cá nhân, tổng số ngày CTXH đã tích lũy (từ hệ thống mới và cũ), và danh sách hoạt động đã tham gia.

**Lưu ý**: Tất cả sinh viên đều có thể xem báo cáo cá nhân của mình, không cần permission đặc biệt.

## Đường dẫn
```
frontend/src/features/student-reports/
├── components/
│   ├── StudentInfoCard.tsx               # Card thông tin sinh viên
│   ├── CTXHSummaryCards.tsx              # Cards tổng hợp kết quả
│   ├── ActivityTable.tsx                 # Bảng danh sách hoạt động
│   └── ReportHeader.tsx                  # Header trang
├── pages/
│   └── StudentReportsPage.tsx            # Trang chính
└── types/
    └── index.ts                          # Type definitions
```

## Chức năng chính

### 1. Hiển thị thông tin sinh viên
- Họ và tên
- Mã số sinh viên (MSSV)
- Email
- Tổng số ngày CTXH

### 2. Tổng hợp kết quả
- **Ngày hoạt động đã hoàn thành**: Số ngày CTXH từ hệ thống mới đã được chấm
- **Ngày hoạt động trên hệ thống cũ**: Số ngày CTXH được import từ hệ thống cũ
- **Tổng số ngày hoạt động CTXH**: Tổng cộng từ cả 2 nguồn
- **Trạng thái**: Đạt/Chưa đạt dựa trên yêu cầu của trường

### 3. Danh sách hoạt động
- Xem tất cả hoạt động đã tham gia
- Thông tin: Tên hoạt động, danh mục, số ngày, trạng thái

## Types

```typescript
interface StudentReportData {
  // Thông tin sinh viên
  studentCode: string;
  fullName: string;
  email: string;
  
  // Thống kê
  totalDays: number;                    // Tổng số ngày CTXH
  completedDays: number;                // Ngày đã hoàn thành (hệ thống mới)
  oldSystemDays: number;                // Ngày từ hệ thống cũ
  requiredDays: number;                 // Số ngày yêu cầu
  status: '達成' | 'CHƯA_ĐẠT';         // Trạng thái
  
  // Danh sách hoạt động
  activities: ActivityRecord[];
}

interface ActivityRecord {
  id: string;
  activityName: string;
  categoryName: string;
  actualDays: number;                   // Số ngày được chấm
  status: ParticipationStatus;
  completedAt?: string;
}

type ParticipationStatus = 'REGISTERED' | 'COMPLETED' | 'CANCELLED';
```

## Components

### ReportHeader
- Tiêu đề: "Báo cáo cá nhân"
- Mô tả: "Dữ liệu CTXH của sinh viên"

### StudentInfoCard
Card hiển thị thông tin sinh viên:
- **Họ và tên**: Tên đầy đủ
- **Mã số sinh viên**: MSSV
- **Email**: Email liên hệ
- **Tổng số ngày CTXH**: Số ngày tích lũy (màu xanh lá)

### CTXHSummaryCards
Grid 4 thẻ thống kê:
1. **Ngày hoạt động đã hoàn thành** (màu xanh lá)
   - Số ngày từ hệ thống mới đã được chấm
2. **Ngày hoạt động trên hệ thống cũ** (màu cam)
   - Số ngày được import từ hệ thống cũ
3. **Tổng số ngày hoạt động CTXH** (màu xanh dương)
   - Tổng cộng = hoàn thành + hệ thống cũ
4. **Trạng thái** (màu đỏ nếu chưa đạt, xanh nếu đạt)
   - Hiển thị "Đạt" hoặc "Chưa đạt"

### ActivityTable
Bảng danh sách hoạt động với các cột:
- **STT**: Số thứ tự
- **Tên hoạt động**: Tên và mô tả
- **Danh mục**: Category của hoạt động
- **Số ngày**: Số ngày CTXH được chấm
- **Trạng thái**: Badge trạng thái (Đã hoàn thành / Đã đăng ký / Đã hủy)

**Empty state**: "Chưa có hoạt động nào" khi danh sách rỗng

## API Endpoints

| Method | Endpoint | Mô tả |
|--------|----------|-------|
| GET | `/ctxh/reports/student/:studentCode` | Lấy báo cáo CTXH của sinh viên |

**Lưu ý**: Endpoint này không yêu cầu permission. Sinh viên chỉ có thể xem báo cáo của chính mình.

### Response Example
```json
{
  "studentCode": "SUPERADMIN001",
  "fullName": "Super Admin",
  "email": "admin@doanhoi.com",
  "totalDays": 0,
  "completedDays": 0,
  "oldSystemDays": 0,
  "requiredDays": 20,
  "status": "CHƯA_ĐẠT",
  "activities": []
}
```

## Permissions
**Không có permission** - Tất cả sinh viên đều có thể xem báo cáo cá nhân của mình.

## UI States

### Loading State
- Skeleton cho info card
- Skeleton cho summary cards
- Skeleton cho table

### Empty State  
- Hiển thị "Danh sách hoạt động (0)"
- Message: Chưa có hoạt động nào

### Error State
- Message lỗi
- Nút "Thử lại"

## Lưu ý kỹ thuật
- Đơn vị tính: **Ngày** (không phải giờ)
- Dữ liệu gồm 2 nguồn: Hệ thống mới + Hệ thống cũ (import)
- Responsive design cho mobile
- Không cache (luôn fetch mới để có dữ liệu real-time)
