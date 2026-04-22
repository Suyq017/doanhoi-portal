# Feature: Fee Collection (Thu phí)

## Tổng quan
Module quản lý các đợt thu phí (Đoàn phí, Hội phí, phí hoạt động) với tích hợp cổng thanh toán PayOS, hỗ trợ quản lý từ cấp trường đến từng sinh viên.

## Đường dẫn
```
frontend/src/features/fee-collection/
├── components/
│   ├── admin/
│   │   ├── PaymentCampaignList.tsx       # Danh sách đợt thu
│   │   ├── PaymentCampaignForm.tsx       # Form tạo/sửa đợt
│   │   ├── PaymentCampaignDetail.tsx     # Chi tiết đợt thu
│   │   ├── FeeLevelManager.tsx           # Quản lý mức phí
│   │   ├── PaymentFeeLevelForm.tsx       # Form mức phí
│   │   ├── OrganizationSelector.tsx      # Chọn tổ chức
│   │   ├── UserPermissionInfo.tsx        # Thông tin quyền
│   │   ├── assignment/
│   │   │   ├── AssignmentList.tsx        # Danh sách phân công
│   │   │   ├── MemberSelector.tsx        # Chọn thành viên
│   │   │   └── BulkAssignModal.tsx       # Phân công hàng loạt
│   │   └── tabs/
│   │       ├── CampaignOverviewTab.tsx   # Tab tổng quan
│   │       ├── AssignmentsTab.tsx        # Tab phân công
│   │       └── PaymentHistoryTab.tsx     # Tab lịch sử thanh toán
│   ├── member/
│   │   └── PaymentCard.tsx               # Card thanh toán cho user
│   └── shared/
│       ├── PageHeader.tsx                # Header chung
│       ├── LoadingState.tsx              # Loading state
│       ├── ErrorState.tsx                # Error state
│       └── ToastContainer.tsx            # Toast notifications
├── hooks/
│   ├── usePaymentCampaignsPage.ts        # Hook trang campaigns
│   ├── usePaymentCampaignDetail.ts       # Hook chi tiết
│   ├── usePaymentAssignments.ts          # Hook phân công
│   └── usePaymentHistory.ts              # Hook lịch sử
├── page/
│   ├── admin/
│   │   ├── PaymentCampaignsPage.tsx      # Trang danh sách đợt thu
│   │   └── PaymentCampaignDetailPage.tsx # Trang chi tiết
│   └── member/
│       ├── MyPaymentsPage.tsx            # Trang thanh toán của user
│       └── PaymentResultPage.tsx         # Trang kết quả thanh toán
└── types/
    └── index.ts                          # Type definitions
```

## Chức năng chính

### 1. Quản lý đợt thu phí (Payment Campaigns)
- Tạo đợt thu phí mới
- Cấu hình thời gian, mô tả
- Gán cho tổ chức cụ thể
- Thay đổi trạng thái (Draft → Active → Completed)

### 2. Quản lý mức phí (Fee Levels)
- Nhiều mức phí trong 1 đợt thu
- Ví dụ: Đoàn phí, Hội phí, Phí hoạt động
- Cấu hình số tiền cho mỗi mức

### 3. Phân công thu phí (Assignments)
- Gán người cần nộp phí
- Chọn mức phí áp dụng
- Theo dõi trạng thái thanh toán
- Ghi chú cho từng assignment

### 4. Thanh toán online (PayOS)
- Tích hợp cổng thanh toán PayOS
- Tạo link thanh toán
- Callback xử lý kết quả
- Webhook update trạng thái

### 5. Lịch sử thanh toán
- Xem tất cả giao dịch
- Filter theo trạng thái, thời gian
- Export báo cáo

### 6. Trang thanh toán (Member)
- Xem các khoản cần nộp
- Nộp phí online
- Xem lịch sử thanh toán cá nhân

## Types

```typescript
interface PaymentCampaign {
  id: string;
  organizationId: string;
  name: string;
  description: string;
  startDate: string;
  endDate: string;
  status: CampaignStatus;
  organization?: Organization;
  feeLevels?: PaymentFeeLevel[];
  assignments?: PaymentAssignment[];
  createdBy: string;
  createdAt: string;
}

type CampaignStatus = 'DRAFT' | 'ACTIVE' | 'COMPLETED' | 'CANCELLED';

interface PaymentFeeLevel {
  id: string;
  campaignId: string;
  levelName: string;
  amount: number;
  description: string;
}

interface PaymentAssignment {
  id: string;
  campaignId: string;
  userId: string;
  feeLevelId?: string;
  note: string;
  status: AssignmentStatus;
  dueDate?: string;
  assignedAt: string;
  paidAt?: string;
  user?: User;
  feeLevel?: PaymentFeeLevel;
}

type AssignmentStatus = 'PENDING' | 'PAID' | 'OVERDUE';

interface PaymentTransaction {
  id: string;
  assignmentId: string;
  amount: number;
  orderCode: string;
  payosTransactionId?: string;
  status: TransactionStatus;
  paidAt?: string;
  createdAt: string;
}

type TransactionStatus = 'PENDING' | 'PAID' | 'CANCELLED' | 'FAILED';
```

## Components

### Admin - PaymentCampaignList
- Bảng danh sách đợt thu
- Filter theo tổ chức, trạng thái
- Actions: View, Edit, Delete

### Admin - PaymentCampaignDetail
Tabs:
- **Overview**: Thông tin chung, thống kê
- **Assignments**: Danh sách phân công
- **Payment History**: Lịch sử thanh toán

### Admin - FeeLevelManager
- Danh sách mức phí
- Add/Edit/Delete mức phí
- Tổng số tiền dự kiến

### Admin - AssignmentList
- Bảng phân công
- Filter: Trạng thái, Tên, MSSV
- Bulk actions
- Status badges

### Member - PaymentCard
- Tên đợt thu
- Số tiền
- Deadline
- Trạng thái
- Nút "Thanh toán"

### Member - PaymentResultPage
- Kết quả thanh toán từ PayOS
- Success/Failed state
- Button quay về

## API Endpoints

### Campaign APIs
| Method | Endpoint | Mô tả |
|--------|----------|-------|
| GET | `/payment-campaigns` | Danh sách đợt thu |
| GET | `/payment-campaigns/:id` | Chi tiết đợt thu |
| POST | `/payment-campaigns` | Tạo đợt thu |
| PATCH | `/payment-campaigns/:id` | Cập nhật đợt thu |
| DELETE | `/payment-campaigns/:id` | Xóa đợt thu |

### Fee Level APIs
| Method | Endpoint | Mô tả |
|--------|----------|-------|
| GET | `/payment-campaigns/:id/fee-levels` | Danh sách mức phí |
| POST | `/payment-campaigns/:id/fee-levels` | Tạo mức phí |
| PATCH | `/fee-levels/:id` | Cập nhật mức phí |
| DELETE | `/fee-levels/:id` | Xóa mức phí |

### Assignment APIs
| Method | Endpoint | Mô tả |
|--------|----------|-------|
| GET | `/payment-campaigns/:id/assignments` | Danh sách phân công |
| POST | `/payment-campaigns/:id/assignments` | Tạo phân công |
| POST | `/payment-campaigns/:id/assignments/bulk` | Phân công hàng loạt |
| DELETE | `/assignments/:id` | Xóa phân công |

### Payment APIs
| Method | Endpoint | Mô tả |
|--------|----------|-------|
| POST | `/payments/create-link` | Tạo link thanh toán PayOS |
| GET | `/payments/my-payments` | Danh sách cần thanh toán |
| POST | `/payments/webhook` | Webhook từ PayOS |

## Permissions
```
payment-campaigns.access    # Truy cập module
payment-campaigns.create    # Tạo đợt thu
payment-campaigns.update    # Cập nhật đợt thu
payment-campaigns.delete    # Xóa đợt thu
payment-campaigns.manage-assignments # Quản lý phân công
payment-campaigns.view-history # Xem lịch sử thanh toán
```

## PayOS Integration

### Create Payment Link
```typescript
const createPaymentLink = async (assignmentId: string) => {
  const response = await api.post('/payments/create-link', {
    assignmentId,
    returnUrl: `${window.location.origin}/portal/payment-result`,
    cancelUrl: `${window.location.origin}/portal/my-payments`,
  });
  
  // Redirect to PayOS checkout
  window.location.href = response.data.checkoutUrl;
};
```

### Webhook Handler
```typescript
// Backend receives webhook from PayOS
POST /payments/webhook
{
  "orderCode": "ORD123456",
  "status": "PAID",
  "amount": 50000,
  "transactionId": "TRX789"
}

// Update assignment status to PAID
```

## Payment Flow

```
User clicks "Thanh toán"
        ↓
Frontend calls /payments/create-link
        ↓
Backend creates PayOS payment link
        ↓
User redirected to PayOS checkout
        ↓
User completes payment on PayOS
        ↓
PayOS sends webhook to backend
        ↓
Backend updates assignment status
        ↓
User redirected to /payment-result
        ↓
Show success/failed message
```

## Lưu ý kỹ thuật
- PayOS sandbox mode cho development
- Webhook cần verify signature
- Handle concurrent payments
- Transaction logs cho audit
- Email notification sau khi thanh toán
- Deadline reminder emails
- Support multiple payment methods (future)
