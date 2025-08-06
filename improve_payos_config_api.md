Tôi sẽ lập kế hoạch để chuyển đổi hệ thống cấu hình PayOS từ theo tổ chức sang theo đợt thanh toán (payment campaign). Đây là kế hoạch chi tiết:

## Kế Hoạch Chuyển Đổi Cấu Hình PayOS

### **Bước 1: Tạo Entity Mới**
- Tạo `payment-campaign-payos-config.entity.ts` thay thế cho `organization-payos-config.entity.ts`
- Các trường của entity mới:
  - `id` (PrimaryGeneratedColumn)
  - `campaignId` (string, foreign key to payment_campaigns)
  - `organizationId` (string, foreign key to organizations, không unique)
  - `userId` (string, foreign key to users - người tạo cấu hình)
  - `clientId` (string)
  - `apiKey` (string)
  - `checksumKey` (string)
  - `isActive` (boolean)
  - `createdAt` (Date)
  - `updatedAt` (Date)
- Thêm relations với PaymentCampaign, Organization, User

### **Bước 2: Cập Nhật Service Layer**
- Chỉnh sửa `payos-config.service.ts`:
  - Đổi tên thành `payment-campaign-payos-config.service.ts`
  - Thay đổi repository injection từ OrganizationPayosConfig sang PaymentCampaignPayosConfig
  - Cập nhật tất cả các method để làm việc với campaignId thay vì organizationId
  - **Giữ lại logic inheritance từ parent organization** cho endpoint `/effective`
  - Thêm logic tìm kiếm config theo hierarchy:
    - **Campaign cấp 3**: Tìm config của campaign → nếu không có tìm config của organization cấp 2 → nếu không có tìm config của organization cấp 1
    - **Campaign cấp 2**: Tìm config của campaign → nếu không có tìm config của organization cấp 1
    - **Campaign cấp 1**: Tìm config của campaign → nếu không có báo lỗi (không tìm thấy)
  - Thêm validation để kiểm tra campaign tồn tại
  - Cập nhật DTOs: `CreatePayOSConfigDto`, `UpdatePayOSConfigDto`

### **Bước 3: Cập Nhật Controller Layer**
- Chỉnh sửa `organization-payos-config.controller.ts`:
  - Đổi tên thành `payment-campaign-payos-config.controller.ts`
  - Thay đổi route từ `organizations/:id/payos-config` sang `payment-campaigns/:id/payos-config`
  - Cập nhật tất cả endpoints để nhận `campaignId` thay vì `organizationId`
  - **Giữ lại endpoint `/effective`** với logic tìm kiếm theo hierarchy:
    - **Cho campaign cấp 3**: Tìm config của campaign trước → nếu không có, tìm config của organization cấp 2 → cuối cùng tìm config của organization cấp 1
    - **Cho campaign cấp 2**: Tìm config của campaign trước → nếu không có, tìm config của organization cấp 1
    - **Cho campaign cấp 1**: Tìm config của campaign → nếu không có báo lỗi (không tìm thấy config nào)
  - Cập nhật tất cả API responses và documentation

### **Bước 4: Migration Database**
- Tạo migration để:
  - Tạo bảng `payment_campaign_payos_configs`
  - Migrate dữ liệu từ `organization_payos_configs` (nếu có)
  - Xóa bảng `organization_payos_configs` cũ
  - Thêm foreign key constraints với payment_campaigns, organizations, users

### **Bước 5: Cập Nhật Module Configuration**
- Cập nhật `payment.module.ts`:
  - Thay đổi imports từ OrganizationPayosConfig sang PaymentCampaignPayosConfig
  - Cập nhật controller và service registration
  - Thêm dependencies cần thiết (PaymentCampaign, User entities)

### **Bước 6: Cập Nhật Related Services**
- Tìm và cập nhật tất cả services sử dụng PayOS config:
  - Payment processing services
  - Webhook handlers
  - Transaction services
- Thay đổi logic để lấy config theo campaignId thay vì organizationId
- **Sử dụng endpoint `/effective`** để đảm bảo luôn có config (fallback từ organization hierarchy)
- Cập nhật logic xử lý payment để ưu tiên config của campaign, fallback về organization

### **Bước 7: Cập Nhật Frontend Integration**
- Cập nhật `payosConfigService` trong frontend:
  - Thay đổi API endpoints từ organizations sang payment-campaigns
  - Cập nhật tất cả API calls
  - Cập nhật type definitions

## Các Entity Mới Cần Tạo/Cập Nhật:

1. **PaymentCampaignPayosConfig** (entity mới)
   - Thay thế OrganizationPayosConfig
   - Liên kết với PaymentCampaign, Organization, User

2. **PaymentCampaignPayosConfigService** (service mới)
   - Logic xử lý cấu hình theo campaign
   - Validation campaign existence
   - CRUD operations

3. **PaymentCampaignPayosConfigController** (controller mới)
   - API endpoints cho campaign config
   - Route: `/payment-campaigns/:id/payos-config`
   - **Endpoint `/effective` với logic inheritance**: `/payment-campaigns/:id/payos-config/effective`

4. **Migration Files**
   - CreatePaymentCampaignPayosConfigTable
   - MigrateOrganizationPayosConfigData (nếu cần)
   - DropOrganizationPayosConfigTable

Kế hoạch này đảm bảo chuyển đổi hoàn toàn từ model dựa trên organization sang model dựa trên payment campaign, phù hợp với yêu cầu business logic mới, đồng thời **giữ lại tính năng inheritance** để hỗ trợ cấu trúc tổ chức 3 cấp trong thực tế:

- **Cấp 1 (Tổ chức gốc)**: Thường có 1 API key chung
- **Cấp 2 (Tổ chức con)**: Có thể có API key riêng hoặc dùng của cấp 1  
- **Cấp 3 (Tổ chức lá)**: Có nhiều API key khác nhau cho từng campaign
- **Logic fallback theo cấp tổ chức**:
  - **Campaign cấp 3**: Campaign → Org cấp 2 → Org cấp 1
  - **Campaign cấp 2**: Campaign → Org cấp 1  
  - **Campaign cấp 1**: Campaign → Báo lỗi (nếu không có)