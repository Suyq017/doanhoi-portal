# Kế Hoạch Phát Triển Chức Năng Đóng Phí với PayOS

## 1. Tổng Quan

### 1.1 Mục Tiêu
- Tích hợp cổng thanh toán PayOS cho hệ thống đóng phí
- Tạo hệ thống quản lý đợt đóng phí theo workflow chi tiết
- Hỗ trợ thanh toán qua QR code tự động
- Quản lý API key riêng cho từng đợt đóng phí
- Hỗ trợ nhiều mức phí cho mỗi đợt
- Quản lý thành viên và phân công đóng phí linh hoạt

### 1.2 Workflow Tham Khảo
Dựa trên "Workflow Chi Tiết Chức Năng Đóng Phí" với các bước chính:
1. Cấu hình đợt đóng phí (Admin)
2. Thiết lập mức phí và phân công thành viên
3. Thành viên vào trang "Đợt đóng phí của tôi" để xem và thanh toán
4. Thực hiện thanh toán qua QR code
5. Quản lý và báo cáo

### 1.3 Development Principles
- **No Testing Required**: Bỏ qua tất cả unit tests, integration tests, e2e tests
- **No Production Build**: Không cần kiểm tra build production hoặc deployment
- **No Notifications**: Hệ thống KHÔNG gửi thông báo tự động cho người dùng
- **User Self-Discovery**: Người dùng tự phát hiện đợt đóng phí mới khi truy cập trang
- **Development-First**: Tập trung 100% vào việc phát triển tính năng

### 1.4 Tài Liệu Tham Khảo
- PayOS Documentation: https://payos.vn/docs/
- PayOS API Reference: https://payos.vn/docs/api

## 2. Phân Tích Yêu Cầu Theo Workflow

### 2.1 Bước 1-3: Cấu Hình Đợt Đóng Phí (Admin)
- Admin truy cập hệ thống quản trị
- Chọn tổ chức trên cây tổ chức (combo box/tree view)
- Tạo đợt đóng phí mới với thông tin cơ bản

### 2.2 Bước 4: Nhập Thông Tin Chi Tiết
- Tên đợt đóng phí
- Mô tả đợt đóng phí  
- Thêm các mức phí áp dụng (20.000đ, 30.000đ, ...)
- Nội dung chi tiết kèm theo cho từng mức phí (note/mô tả riêng)

### 2.3 Bước 5-6: Chọn Thành Viên và Thiết Lập Phí
- Chọn danh sách thành viên thuộc tổ chức cần đóng phí
- Có thể tick chọn từng thành viên hoặc chọn tất cả
- Thiết lập số tiền & nội dung cho từng thành viên hoặc theo nhóm

### 2.4 Bước 7: Quản Lý API Key
- Hệ thống tạo API key riêng cho từng đợt đóng phí
- Không dùng chung API key giữa các đợt
- Nếu tổ chức không có API key, tự động lấy từ tổ chức cha gần nhất

### 2.5 Bước 8-9: Hiển Thị Cho Thành Viên
- Thành viên vào trang "Đợt đóng phí của tôi" để xem
- Hiển thị các đợt phí cần thanh toán
- Chọn mức phí phù hợp hoặc theo mặc định của admin

### 2.6 Bước 10-11: Thực Hiện Thanh Toán
- Sinh mã QR code cho từng mục thanh toán (tương ứng API key của đợt)
- Thành viên quét QR và chuyển khoản qua app ngân hàng
- Hệ thống tự động xác nhận thanh toán hoặc admin duyệt thủ công

### 2.7 Bước 12-13: Quản Lý và Báo Cáo
- Admin/trưởng đơn vị theo dõi trạng thái (chưa đóng, đã đóng, chờ xác nhận)
- Xuất danh sách đã/đang đóng phí theo tổ chức, đợt đóng phí

## 3. Thiết Kế Database

### 3.1 Bảng payment_campaigns (Đợt đóng phí)
```sql
- id: UUID (Primary Key)
- organization_id: UUID (Foreign Key → organizations)
- name: VARCHAR(255) - Tên đợt đóng phí
- description: TEXT - Mô tả đợt đóng phí
- start_date: TIMESTAMP - Ngày bắt đầu
- end_date: TIMESTAMP - Ngày kết thúc
- status: ENUM('DRAFT', 'ACTIVE', 'COMPLETED', 'CANCELLED') - Trạng thái
- payos_api_key: TEXT - API key PayOS riêng cho đợt này
- created_by: UUID (Foreign Key → users) - Người tạo
- created_at: TIMESTAMP
- updated_at: TIMESTAMP
```

### 3.2 Bảng payment_fee_levels (Mức phí)
```sql
- id: UUID (Primary Key)
- campaign_id: UUID (Foreign Key → payment_campaigns)
- level_name: VARCHAR(255) - Tên mức phí (VD: "Sinh viên chính quy", "Thành viên cơ bản")
- amount: DECIMAL(10,2) - Số tiền phải đóng
- description: TEXT - Mô tả chi tiết
- note: TEXT - Nội dung chi tiết kèm theo cho mức phí này
- is_default: BOOLEAN - Có phải mức phí mặc định
- order_index: INTEGER - Thứ tự hiển thị
- created_at: TIMESTAMP
- updated_at: TIMESTAMP
```

### 3.3 Bảng payment_assignments (Phân công đóng phí)
```sql
- id: UUID (Primary Key)
- campaign_id: UUID (Foreign Key → payment_campaigns)
- user_id: UUID (Foreign Key → users)
- fee_level_id: UUID (Foreign Key → payment_fee_levels) - NULL nếu dùng custom_amount
- custom_amount: DECIMAL(10,2) - Số tiền tùy chỉnh (nếu không dùng fee level)
- note: TEXT - Ghi chú khi phân công
- status: ENUM('PENDING', 'PAID', 'OVERDUE', 'EXEMPTED') - Trạng thái
- due_date: TIMESTAMP - Hạn đóng phí (tùy chọn)
- assigned_at: TIMESTAMP - Ngày được phân công
- paid_at: TIMESTAMP - Ngày đóng phí (nếu đã đóng)
- assigned_by: UUID (Foreign Key → users) - Người phân công
- created_at: TIMESTAMP
- updated_at: TIMESTAMP
```

### 3.4 Bảng payment_transactions (Giao dịch thanh toán)
```sql
- id: UUID (Primary Key)
- assignment_id: UUID (Foreign Key → payment_assignments)
- amount: DECIMAL(10,2) - Số tiền giao dịch
- status: ENUM('PENDING', 'PAID', 'FAILED', 'CANCELLED') - Trạng thái
- payos_order_id: VARCHAR(255) - ID order từ PayOS
- payment_url: TEXT - URL thanh toán PayOS
- qr_code_url: TEXT - URL QR code
- description: TEXT - Mô tả giao dịch
- paid_at: TIMESTAMP - Thời gian thanh toán thành công
- payos_response: TEXT - Response từ PayOS (JSON)
- created_at: TIMESTAMP
- updated_at: TIMESTAMP
```

### 3.5 Bảng organization_payos_configs (Cấu hình PayOS theo tổ chức)
```sql
- id: UUID (Primary Key)
- organization_id: UUID (Foreign Key → organizations) - UNIQUE
- client_id: VARCHAR(255) - Client ID PayOS
- api_key: VARCHAR(255) - API key PayOS
- checksum_key: VARCHAR(255) - Checksum key PayOS
- is_active: BOOLEAN - Trạng thái hoạt động
- webhook_url: VARCHAR(255) - URL webhook nhận thông báo từ PayOS
- note: TEXT - Ghi chú
- created_at: TIMESTAMP
- updated_at: TIMESTAMP
```

## 4. API Endpoints Backend

### 4.1 Payment Campaigns Management
```
POST   /api/payment-campaigns                    # Tạo đợt đóng phí mới
GET    /api/payment-campaigns                    # Lấy danh sách đợt đóng phí
GET    /api/payment-campaigns/:id                # Lấy chi tiết đợt đóng phí
PUT    /api/payment-campaigns/:id                # Cập nhật đợt đóng phí
DELETE /api/payment-campaigns/:id                # Xóa đợt đóng phí
GET    /api/payment-campaigns/organization/:orgId # Lấy đợt đóng phí theo tổ chức
POST   /api/payment-campaigns/:id/activate       # Kích hoạt đợt đóng phí
POST   /api/payment-campaigns/:id/complete       # Hoàn thành đợt đóng phí
POST   /api/payment-campaigns/:id/cancel         # Hủy đợt đóng phí
```

### 4.2 Fee Levels Management
```
POST   /api/payment-campaigns/:id/fee-levels     # Thêm mức phí cho đợt
GET    /api/payment-campaigns/:id/fee-levels     # Lấy danh sách mức phí của đợt
GET    /api/payment-campaigns/:campaignId/fee-levels/:id # Lấy chi tiết mức phí
PUT    /api/payment-campaigns/:campaignId/fee-levels/:id # Cập nhật mức phí
DELETE /api/payment-campaigns/:campaignId/fee-levels/:id # Xóa mức phí
POST   /api/payment-campaigns/:campaignId/fee-levels/:id/set-default # Đặt mức phí mặc định
```

### 4.3 Payment Assignments
```
POST   /api/payment-assignments                  # Phân công đóng phí đơn lẻ
POST   /api/payment-assignments/bulk             # Phân công đóng phí hàng loạt  
POST   /api/payment-assignments/multiple         # Phân công với nhiều mức phí khác nhau
GET    /api/payment-assignments/campaign/:campaignId # Lấy danh sách phân công theo đợt
GET    /api/payment-assignments/campaign/:campaignId/stats # Thống kê phân công theo đợt
GET    /api/payment-assignments/user/:userId     # Lấy phân công theo user
GET    /api/payment-assignments/my-assignments   # Lấy phân công của user hiện tại
GET    /api/payment-assignments/organization/:orgId # Lấy phân công theo tổ chức
GET    /api/payment-assignments/:id              # Lấy chi tiết phân công
PUT    /api/payment-assignments/:id              # Cập nhật phân công
DELETE /api/payment-assignments/:id              # Hủy phân công
```

### 4.4 PayOS Integration
```
POST   /api/payments/create-payment-link         # Tạo link thanh toán PayOS
GET    /api/payments/transaction/:transactionId/status # Kiểm tra trạng thái thanh toán
GET    /api/payments/qr-code/:transactionId      # Lấy QR code thanh toán
POST   /api/payments/webhook                     # Webhook nhận thông báo từ PayOS
```

### 4.5 PayOS Configuration
```
POST   /api/organizations/:id/payos-config       # Tạo/cập nhật cấu hình PayOS cho tổ chức
GET    /api/organizations/:id/payos-config       # Lấy cấu hình PayOS
GET    /api/organizations/:id/payos-config/effective # Lấy config hiệu lực (kế thừa từ cha)
PUT    /api/organizations/:id/payos-config       # Cập nhật cấu hình PayOS
DELETE /api/organizations/:id/payos-config       # Xóa cấu hình PayOS
POST   /api/organizations/:id/payos-config/toggle-active # Bật/tắt cấu hình PayOS
```

## 5. Components Frontend

### 5.1 Admin Components (Quản Lý Đợt Đóng Phí)
```
/src/features/fee-collection/
├── components/
│   ├── admin/
│   │   ├── PaymentCampaignList.tsx          # Danh sách đợt đóng phí
│   │   ├── PaymentCampaignForm.tsx          # Form tạo/sửa đợt đóng phí
│   │   ├── PaymentCampaignDetail.tsx        # Chi tiết đợt đóng phí với tabs
│   │   ├── FeeLevelManager.tsx              # Quản lý mức phí trong đợt
│   │   ├── MemberSelector.tsx               # Chọn thành viên cần đóng phí
│   │   ├── PaymentAssignmentManager.tsx     # Phân công đóng phí cho thành viên
│   │   ├── PaymentAssignmentBulkForm.tsx    # Form phân công hàng loạt
│   │   ├── OrganizationPayOSConfig.tsx      # Cấu hình PayOS cho tổ chức  
│   │   ├── PaymentStatistics.tsx            # Thống kê và báo cáo
│   │   └── PaymentReportExport.tsx          # Xuất báo cáo
│   └── member/
│       ├── MyPaymentDashboard.tsx           # Trang "Đợt đóng phí của tôi"
│       ├── PaymentCampaignCard.tsx          # Card hiển thị đợt đóng phí
│       ├── FeeLevelSelector.tsx             # Chọn mức phí
│       ├── PaymentQRCode.tsx                # Hiển thị QR code thanh toán
│       ├── PaymentHistory.tsx               # Lịch sử thanh toán của tôi
│       └── PaymentStatus.tsx                # Trạng thái thanh toán
├── hooks/
│   ├── usePaymentCampaigns.ts               # Hook quản lý đợt đóng phí
│   ├── usePaymentFeeLevels.ts               # Hook quản lý mức phí
│   ├── usePaymentAssignments.ts             # Hook quản lý phân công
│   ├── usePayOSConfig.ts                    # Hook cấu hình PayOS
│   ├── usePaymentProcess.ts                 # Hook quy trình thanh toán
│   └── usePaymentTransactions.ts            # Hook giao dịch
├── services/
│   ├── paymentCampaignService.ts            # Service API đợt đóng phí
│   ├── paymentFeeLevelService.ts            # Service API mức phí
│   ├── paymentAssignmentService.ts          # Service API phân công
│   ├── payosConfigService.ts                # Service API cấu hình PayOS
│   └── paymentTransactionService.ts         # Service API giao dịch
└── types/
    └── index.ts                             # TypeScript interfaces
```

### 5.2 Pages & Routes
```
/src/pages/
├── admin/
│   ├── PaymentCampaignsPage.tsx             # Trang quản lý đợt đóng phí
│   ├── CreatePaymentCampaignPage.tsx        # Trang tạo đợt đóng phí mới
│   ├── PaymentCampaignDetailPage.tsx        # Trang chi tiết đợt đóng phí
│   └── PaymentReportsPage.tsx               # Trang báo cáo và thống kê
└── member/
    ├── MyPaymentCampaignsPage.tsx           # Trang "Đợt đóng phí của tôi"
    ├── PaymentProcessPage.tsx               # Trang thực hiện thanh toán
    └── PaymentHistoryPage.tsx               # Trang lịch sử thanh toán
```

## 6. Quy Trình Thực Hiện Theo Workflow

### 6.1 Phase 1: Cơ Sở Hạ Tầng (1.5 tuần)
1. **Tuần 1:**
   - Thiết kế và tạo database schema theo workflow
   - Tạo entities với đầy đủ quan hệ
   - Setup PayOS SDK cơ bản
   - Tạo DTOs và validation

2. **Nửa tuần 2:**
   - Implement services cho payment campaigns
   - Implement services cho fee levels
   - Tạo service tích hợp PayOS với API key riêng cho từng đợt

### 6.2 Phase 2: Admin Features - Cấu Hình Đợt Đóng Phí (2.5 tuần)
1. **Nửa tuần 2 + Tuần 3:**
   - **Backend:** Controllers cho payment campaigns và fee levels
   - **Frontend:** 
     - Trang chọn tổ chức (combo box/tree view)
     - Form tạo đợt đóng phí mới
     - Component quản lý mức phí với note chi tiết

2. **Tuần 4:**
   - **Backend:** 
     - Logic kế thừa API key từ tổ chức cha
     - API phân công thành viên (đơn lẻ và hàng loạt)
   - **Frontend:**
     - Component chọn thành viên (tick từng người/chọn tất cả)
     - Form thiết lập số tiền cho từng thành viên/nhóm
     - Component cấu hình PayOS

3. **Tuần 5:**
   - **Backend:** Integration với organization tree
   - **Frontend:** 
     - Hiển thị thông tin đợt đóng phí trên cây tổ chức
     - Dashboard admin với thống kê

### 6.3 Phase 3: Member Features - Trang "Đợt Đóng Phí Của Tôi" (1.5 tuần)
1. **Tuần 6:**
   - **Backend:** 
     - API lấy danh sách đợt đóng phí của user
     - API tạo QR code với API key riêng của đợt
   - **Frontend:**
     - Trang "Đợt đóng phí của tôi"
     - Component hiển thị đợt phí cần thanh toán
     - Component chọn mức phí

2. **Nửa tuần 7:**
   - **Backend:** QR code generation với PayOS
   - **Frontend:** 
     - Component hiển thị QR code
     - Tích hợp thanh toán với PayOS

### 6.4 Phase 4: Thanh Toán và Quản Lý (1 tuần)
1. **Nửa tuần 7 + Nửa tuần 8:**
   - **Backend:**
     - Webhook handling từ PayOS  
     - Cập nhật trạng thái thanh toán real-time
     - API báo cáo và thống kê
   - **Frontend:**
     - Tracking trạng thái thanh toán
     - Lịch sử thanh toán
     - Trang quản lý và báo cáo cho admin

### 6.5 Phase 5: Polish và Finalization (0.5 tuần)
1. **Nửa tuần 8:**
   - **KHÔNG testing**: Bỏ qua tất cả testing phases
   - **KHÔNG build production**: Chỉ đảm bảo dev environment hoạt động
   - UI polish cơ bản và bug fixes critical
   - Documentation cơ bản cho sử dụng

## 7. Lưu Ý Đặc Biệt

### 7.1 API Key Management
- Mỗi đợt đóng phí có API key riêng (không dùng chung)
- Tự động kế thừa từ tổ chức cha nếu không có cấu hình
- Bảo mật API key trong database

### 7.2 Không Cần Thông Báo Tự Động
- Thành viên tự vào trang "Đợt đóng phí của tôi" để xem
- Không cần implement notification system
- Focus vào UX của trang member
- Sau khi admin thêm đợt thanh toán, hệ thống KHÔNG hiển thị thông báo cho người dùng
- Người dùng sẽ tự động phát hiện và xem đợt mới khi truy cập trang

### 7.3 Flexibility trong Phân Công
- Hỗ trợ nhiều mức phí cho một đợt
- Cho phép tùy chỉnh số tiền riêng cho từng thành viên
- Ghi chú chi tiết cho mỗi mức phí và phân công

### 7.4 Quy Tắc Phát Triển
- **KHÔNG thực hiện testing**: Bỏ qua tất cả unit tests, integration tests
- **KHÔNG chạy build**: Không cần kiểm tra build production
- **Focus vào development**: Chỉ tập trung vào việc phát triển tính năng
- **Rapid prototyping**: Ưu tiên tốc độ phát triển hơn chất lượng code

### 7.5 Simplified Workflow
- Bỏ qua error handling phức tạp
- Không cần validation chi tiết
- Sử dụng mock data cho PayOS integration khi cần thiết
- UI/UX đơn giản, functional-first approach