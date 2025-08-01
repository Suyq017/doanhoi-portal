Tôi sẽ đọc toàn bộ source code hiện tại để hiểu kiến trúc và sau đó lập kế hoạch tích hợp PayOS theo yêu cầu của bạn. Bây giờ tôi đã hiểu rõ cấu trúc source code hiện tại. Dựa trên phân tích, tôi sẽ lập kế hoạch tái cấu trúc tích hợp PayOS theo yêu cầu của bạn.

# Kế hoạch Cải tiến Tích hợp PayOS API

## Phân tích hiện trạng

### Source code hiện tại:
1. **PayOS Service** đã có sẵn tại payos.service.ts
2. **PayOS Config Service** đã có tại payos-config.service.ts 
3. **Controllers** có nhiều file:
   - payment-transaction.controller.ts (webhook handling)
   - organization-payos-config.controller.ts (cấu hình PayOS)
   - payos-config.controller.ts (cấu hình PayOS cũ)
4. **Entity** `OrganizationPayosConfig` đã có sẵn

### Vấn đề cần cải tiến:
1. Code hiện tại **không giống** với mẫu trong payos_integration.md
2. Có **trùng lặp** controller (organization-payos-config.controller.ts và payos-config.controller.ts)
3. PayOS Service hiện tại **phức tạp** hơn mẫu yêu cầu
4. Cần đơn giản hóa theo đúng mẫu trong file payos_integration.md

## Kế hoạch thực hiện

### Bước 1: Xóa các file tích hợp cũ
**Files cần xóa:**
1. payos-config.controller.ts (trùng lặp)
2. organization-payos-config.controller.ts (sẽ thay thế)

### Bước 2: Tạo PayOS Service đơn giản theo mẫu
**Tạo file:** payos.service.ts
- Tuân thủ **chính xác** cấu trúc trong file mẫu payos_integration.md
- Sử dụng `PayosConfigService.createPayOSInstance(organizationId)` để lấy config động từ database
- Thay thế việc đọc từ environment variables

### Bước 3: Tạo Payment Controller theo mẫu  
**Tạo file:** `backend/src/api/payment/payment.controller.ts`
- Tuân thủ **chính xác** structure trong file mẫu
- Endpoints:
  - `POST /api/payment/create-payment-link` 
  - `GET /api/payment/check-status/:orderCode`
- Lấy `organizationId` từ request context hoặc body

### Bước 4: Tạo PayOS Module
**Tạo file:** `backend/src/payos/payos.module.ts`
- Import PayosConfigService từ PaymentModule
- Export PayosService để sử dụng ở nơi khác

### Bước 5: Cập nhật App Module
**Cập nhật:** app.module.ts
- Import PayosModule mới
- Đăng ký PaymentController mới

### Bước 6: Tạo Interface PayOS Return Data
**Tạo file:** `backend/src/interfaces/payos-return-data.interface.ts`
- Tuân thủ chính xác interface trong file mẫu

### Bước 7: Cập nhật Payment Module
**Cập nhật:** payment.module.ts 
- Export PayosConfigService để PayosModule có thể sử dụng
- Loại bỏ các controller cũ

## Chi tiết thay đổi quan trọng

### PayOS Service mới vs cũ:
**Cũ (phức tạp):**
```typescript
// Nhiều methods phức tạp
async createPaymentLink(request: CreatePaymentLinkRequest)
async getPaymentInfo(orderCode, organizationId)
async cancelPaymentLink(orderCode, organizationId, reason)
async verifyWebhookSignature(webhookData, organizationId)
// ... nhiều methods khác
```

**Mới (đơn giản theo mẫu):**
```typescript
// Chỉ 2 methods cơ bản như trong mẫu
async createPaymentLink(orderData: any)
async getPaymentLinkInformation(orderCode: number)
```

### Lấy PayOS config động:
```typescript
constructor(private configService: ConfigService, private payosConfigService: PayosConfigService) {
  // Không khởi tạo PayOS ở constructor nữa
}

async createPaymentLink(orderData: any) {
  // Lấy config từ database theo organizationId
  const config = await this.payosConfigService.getEffectiveConfig(orderData.organizationId);
  
  // Tạo PayOS instance với config động
  const payos = new PayOS(config.clientId, config.apiKey, config.checksumKey);
  
  return payos.createPaymentLink(orderData);
}
```

### Organization ID Context:
- Lấy `organizationId` từ:
  1. Request body khi tạo payment link
  2. JWT token user context  
  3. Assignment/Campaign context từ database

## Lợi ích của cải tiến:

1. **Tuân thủ mẫu:** Code giống hệt file payos_integration.md
2. **Đơn giản hóa:** Loại bỏ complexity không cần thiết
3. **Dynamic config:** Mỗi organization dùng PayOS config riêng từ database
4. **Maintainability:** Code dễ đọc, dễ bảo trì hơn
5. **Consistency:** Cấu trúc nhất quán với mẫu thiết kế

Bạn có muốn tôi triển khai kế hoạch này không? Tôi sẽ bắt đầu từ việc xóa các file cũ và tạo implementation mới theo đúng mẫu.