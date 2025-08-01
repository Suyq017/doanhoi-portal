# Kế Hoạch Phát Triển Chức Năng Đóng Phí với PayOS

## 1. Tổng Quan

### 1.1 Mục Tiêu
- Tích hợp cổng thanh toán PayOS cho hệ thống đóng phí
- Tạo hệ thống quản lý đợt đóng phí theo workflow chi tiết
- Hỗ trợ thanh toán qua QR code tự động
- Quản lý API key riêng cho từng đợt đóng phí
- Hỗ trợ nhiều mức phí cho mỗi đợt
- Quản lý thành viên và phân công đóng phí linh hoạt

### 1.2 Tài Liệu Tham Khảo
- PayOS Documentation: https://payos.vn/docs/
- PayOS Node.js SDK: `@payos/node` package

## 2. PayOS Integration

### 2.1 PayOS SDK Setup
- **Package**: `@payos/node` - SDK chính thức cho Node.js
- **Configuration**: Client ID, API Key, Checksum Key cho mỗi tổ chức
- **Webhook**: Endpoint để nhận thông báo thanh toán từ PayOS

### 2.2 Payment Flow
1. Tạo Payment Request qua PayOS SDK
2. PayOS trả về QR code cho thanh toán
3. Người dùng quét QR bằng app ngân hàng
4. PayOS gửi webhook notification
5. Verify signature và cập nhật status

## 3. Workflow Chi Tiết

### 3.1 Admin: Cấu Hình Đợt Đóng Phí
- Chọn tổ chức trên cây tổ chức
- Tạo đợt đóng phí với tên, mô tả, ngày bắt đầu/kết thúc
- Thêm các mức phí (20.000đ, 30.000đ, ...) với mô tả riêng
- Chọn thành viên và phân công mức phí
- Cấu hình PayOS API key cho tổ chức

### 3.2 Member: Thanh Toán
- Vào trang "Đợt đóng phí của tôi"
- Chọn mức phí phù hợp
- Tạo QR code thanh toán qua PayOS
- Quét QR và chuyển khoản
- Hệ thống tự động cập nhật trạng thái

### 3.3 Quản Lý
- Theo dõi trạng thái thanh toán real-time
- Xuất báo cáo đã/chưa đóng phí
- Thống kê theo tổ chức và đợt

## 4. Database Schema

### 4.1 Payment Campaigns (Đợt đóng phí)
- id, organization_id, name, description
- start_date, end_date, status, created_by

### 4.2 Payment Fee Levels (Mức phí)
- id, campaign_id, level_name, amount
- description, note, is_default, order_index

### 4.3 Payment Assignments (Phân công đóng phí)
- id, campaign_id, user_id, fee_level_id
- custom_amount, note, status, due_date
- assigned_at, paid_at, assigned_by

### 4.4 Payment Transactions (Giao dịch PayOS)
- id, assignment_id, amount, status
- payos_order_code, checkout_url, qr_code
- paid_at, payos_webhook_data, signature_verified

### 4.5 Organization PayOS Configs
- id, organization_id, client_id, api_key, checksum_key
- is_active, webhook_url, note

## 5. API Endpoints

### 5.1 Payment Campaigns
- POST/GET/PUT/DELETE `/api/payment-campaigns`
- GET `/api/payment-campaigns/organization/:orgId`
- POST `/api/payment-campaigns/:id/activate`

### 5.2 Fee Levels
- POST/GET/PUT/DELETE `/api/payment-campaigns/:id/fee-levels`
- POST `/api/payment-campaigns/:campaignId/fee-levels/:id/set-default`

### 5.3 Payment Assignments
- POST/GET/PUT/DELETE `/api/payment-assignments`
- POST `/api/payment-assignments/bulk`
- GET `/api/payment-assignments/my-assignments`

### 5.4 PayOS Integration
- POST `/api/payments/create-payment-link`
- GET `/api/payments/transaction/:transactionId/status`
- POST `/api/payments/webhook`

### 5.5 PayOS Configuration
- POST/GET/PUT/DELETE `/api/organizations/:id/payos-config`
- GET `/api/organizations/:id/payos-config/effective`

## 6. PayOS Backend Implementation

### 6.1 SDK Setup
- Install: `npm install @payos/node`
- Configuration: Client ID, API Key, Checksum Key từ environment
- PayOS Service: Wrapper cho PayOS SDK với error handling

### 6.2 Core Services
- **PayOSService**: Tạo payment link, verify webhook, cancel payment
- **PaymentService**: Quản lý transactions và assignments
- **PaymentController**: APIs tạo payment, check status, webhook handler

### 6.3 Webhook Handling
- Verify signature với PayOS SDK
- Cập nhật transaction status
- Mark assignment as paid khi thành công

### 6.4 Rate Limiting
- Throttle guard cho payment endpoints
- Retry logic cho PayOS API calls

## 7. Frontend Components

### 7.1 Admin Components
```
/src/features/fee-collection/components/admin/
├── PaymentCampaignList.tsx          # Danh sách đợt đóng phí
├── PaymentCampaignForm.tsx          # Form tạo/sửa đợt đóng phí
├── FeeLevelManager.tsx              # Quản lý mức phí trong đợt
├── MemberSelector.tsx               # Chọn thành viên cần đóng phí
├── PaymentAssignmentManager.tsx     # Phân công đóng phí cho thành viên
├── OrganizationPayOSConfig.tsx      # Cấu hình PayOS cho tổ chức
└── PaymentStatistics.tsx            # Thống kê và báo cáo
```

### 7.2 Member Components
```
/src/features/fee-collection/components/member/
├── MyPaymentDashboard.tsx           # Trang "Đợt đóng phí của tôi"
├── PaymentCampaignCard.tsx          # Card hiển thị đợt đóng phí
├── FeeLevelSelector.tsx             # Chọn mức phí
├── PaymentQRCode.tsx                # Hiển thị QR code thanh toán
├── PaymentHistory.tsx               # Lịch sử thanh toán của tôi
└── PaymentStatus.tsx                # Trạng thái thanh toán
```

### 7.3 Hooks & Services
```
/src/features/fee-collection/
├── hooks/
│   ├── usePaymentCampaigns.ts       # Hook quản lý đợt đóng phí
│   ├── usePaymentAssignments.ts     # Hook quản lý phân công
│   └── usePaymentProcess.ts         # Hook quy trình thanh toán
└── services/
    ├── paymentCampaignService.ts    # Service API đợt đóng phí
    ├── paymentAssignmentService.ts  # Service API phân công
    └── paymentTransactionService.ts # Service API giao dịch
```

## 8. Timeline Phát Triển

### Tuần 1-2: Frontend Foundation (2 tuần)
- **Tuần 1**: TypeScript interfaces, basic admin components
- **Tuần 2**: Member interface, payment flow components

### Tuần 3-4: Backend Implementation (2 tuần)  
- **Tuần 3**: Database entities, PayOS SDK setup, core services
- **Tuần 4**: Controllers, APIs, webhook handling

### Tuần 5-6: Integration & Polish (2 tuần)
- **Tuần 5**: Frontend-backend integration, real PayOS flow

## 9. Lưu Ý Quan Trọng

### 9.1 Development Principles
- **No Testing**: Bỏ qua tất cả unit tests, integration tests
- **No Production Build**: Không cần kiểm tra build production
- **Development-First**: Tập trung 100% vào phát triển tính năng
- **PayOS SDK Required**: Backend PHẢI sử dụng SDK chính thức `@payos/node`

### 9.2 API Key Management
- Mỗi tổ chức có API key riêng (không dùng chung)
- Tự động kế thừa từ tổ chức cha nếu không có cấu hình
- Bảo mật API key trong database

### 9.3 User Experience
- Không gửi thông báo tự động cho người dùng
- Thành viên tự vào trang "Đợt đóng phí của tôi" để xem
- Hỗ trợ nhiều mức phí và tùy chỉnh số tiền