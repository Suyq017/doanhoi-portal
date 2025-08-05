Chắc chắn rồi. Dưới đây là kế hoạch chỉ tập trung vào việc hiện thực hóa các API backend trong NestJS để tích hợp PayOS.

---

### Kế hoạch hiện thực Backend API tích hợp PayOS

#### Bước 1: Hiện thực Lớp Logic (PayOS Service)

Service này đóng vai trò là lớp trung gian, chịu trách nhiệm cho mọi tương tác với PayOS SDK.

1.  **Tạo file `src/payos/payos.service.ts`:**
    ```typescript
    import { Injectable } from '@nestjs/common';
    import { ConfigService } from '@nestjs/config';
    import PayOS from '@payos/node';

    @Injectable()
    export class PayosService {
      private payos: PayOS;

      constructor(private configService: ConfigService) {
        // Khởi tạo PayOS SDK với các key được lấy từ biến môi trường
        this.payos = new PayOS(
          this.configService.get<string>('PAYOS_CLIENT_ID'),
          this.configService.get<string>('PAYOS_API_KEY'),
          this.configService.get<string>('PAYOS_CHECKSUM_KEY'),
        );
      }

      /**
       * Gọi SDK để tạo link thanh toán mới.
       * @param orderData - Đối tượng chứa thông tin đơn hàng (amount, description, orderCode, returnUrl, cancelUrl).
       * @returns Promise chứa đối tượng link thanh toán từ PayOS.
       */
      async createPaymentLink(orderData: any) {
        return this.payos.createPaymentLink(orderData);
      }

      /**
       * Gọi SDK để lấy thông tin của một link thanh toán đã tạo.
       * @param orderCode - Mã đơn hàng cần kiểm tra.
       * @returns Promise chứa thông tin chi tiết của link thanh toán.
       */
      async getPaymentLinkInformation(orderCode: number) {
        return this.payos.getPaymentLinkInformation(orderCode);
      }
    }
    ```

#### Bước 2: Hiện thực Lớp Giao tiếp API (Payment Controller)

Controller này sẽ định nghĩa các endpoint mà phía client có thể gọi, sau đó ủy quyền xử lý cho `PayosService`.

1.  **Tạo file `src/api/payment/payment.controller.ts`:**
    ```typescript
    import { Controller, Post, Get, Param, Res, HttpException, HttpStatus } from '@nestjs/common';
    import { PayosService } from 'src/payos/payos.service';
    import { Response } from 'express';

    @Controller('api/payment')
    export class PaymentController {
      constructor(private readonly payosService: PayosService) {}

      /**
       * API endpoint để tạo link thanh toán.
       * Khi được gọi, sẽ tạo một đơn hàng và chuyển hướng người dùng đến trang checkout của PayOS.
       */
      @Post('create-payment-link')
      async createPaymentLink(@Res() res: Response) {
        // Tên miền của ứng dụng, dùng để xây dựng returnUrl và cancelUrl
        const YOUR_DOMAIN = 'http://localhost:3000'; 
        
        // Tạo mã đơn hàng duy nhất, ví dụ sử dụng timestamp
        const orderCode = Number(String(Date.now()).slice(-6));

        const order = {
          amount: 20000,
          description: 'Thanh toán phí dịch vụ',
          orderCode: orderCode,
          returnUrl: `${YOUR_DOMAIN}/payment-result.html`,
          cancelUrl: `${YOUR_DOMAIN}/payment-result.html`,
        };

        try {
          const paymentLink = await this.payosService.createPaymentLink(order);
          // Chuyển hướng người dùng đến URL checkout
          return res.redirect(paymentLink.checkoutUrl);
        } catch (error) {
          console.error('Error creating payment link:', error);
          throw new HttpException('Failed to create payment link', HttpStatus.INTERNAL_SERVER_ERROR);
        }
      }

      /**
       * API endpoint để kiểm tra trạng thái thanh toán của một đơn hàng.
       * @param orderCode - Mã đơn hàng được truyền qua URL parameter.
       * @returns Đối tượng JSON chứa thông tin trạng thái của đơn hàng.
       */
      @Get('check-status/:orderCode')
      async checkPaymentStatus(@Param('orderCode') orderCode: string) {
        try {
          const orderNumber = parseInt(orderCode, 10);
          if (isNaN(orderNumber)) {
            throw new HttpException('Invalid Order Code', HttpStatus.BAD_REQUEST);
          }
          
          const paymentInfo = await this.payosService.getPaymentLinkInformation(orderNumber);
          return paymentInfo;
        } catch (error) {
          console.error(`Error checking status for order ${orderCode}:`, error);
          throw new HttpException('Order not found or failed to check status', HttpStatus.NOT_FOUND);
        }
      }
    }
    ```

#### Bước 3: Đăng ký các Thành phần trong Module

Đây là bước cuối cùng để hệ thống NestJS nhận biết và kết nối `Controller` với `Service`.

1.  **Cập nhật `src/payos/payos.module.ts`:**
    *   Đảm bảo `PayosService` được khai báo trong `providers` và `exports` để các module khác có thể sử dụng.
    ```typescript
    import { Module } from '@nestjs/common';
    import { PayosService } from './payos.service';

    @Module({
      providers: [PayosService],
      exports: [PayosService],
    })
    export class PayosModule {}
    ```

2.  **Cập nhật `src/app.module.ts`:**
    *   Import `PayosModule` và đăng ký `PaymentController`.
    ```typescript
    import { Module } from '@nestjs/common';
    import { ConfigModule } from '@nestjs/config';
    import { PayosModule } from './payos/payos.module';
    import { PaymentController } from './api/payment/payment.controller';
    
    @Module({
      imports: [
        // Module để đọc biến môi trường
        ConfigModule.forRoot({ isGlobal: true }), 
        // Import module PayOS của chúng ta
        PayosModule, 
      ],
      controllers: [PaymentController],
      providers: [],
    })
    export class AppModule {}
    ```

    // src/interfaces/payos-return-data.interface.ts

/**
 * Định nghĩa cấu trúc dữ liệu mà PayOS trả về qua Query Parameters trên returnUrl.
 * Dữ liệu này được gửi đến trình duyệt của người dùng sau khi họ hoàn tất (hoặc hủy) thanh toán.
 */
export interface PayosReturnData {
  /**
   * Mã lỗi của giao dịch. Giá trị "00" có nghĩa là thành công.
   * @example "00"
   */
  code: string;

  /**
   * Mã định danh của link thanh toán (paymentLinkId).
   * @example "c789b1b519e44b92b6a782a8561d3319"
   */
  id: string;

  /**
   * Trạng thái hủy giao dịch. `true` nếu người dùng chủ động hủy.
   * @example true
   */
  cancel: boolean;

  /**
   * Trạng thái của link thanh toán.
   */
  status: 'PAID' | 'CANCELLED' | 'EXPIRED' | 'PENDING';

  /**
   * Mã đơn hàng do bạn cung cấp khi tạo link.
   * @example 123456
   */
  orderCode: number;

  /**
   * Chữ ký bảo mật để xác thực tính toàn vẹn của dữ liệu trả về.
   * Bạn cần tự tạo lại chữ ký từ các tham số và so sánh với giá trị này.
   * Công thức: HMAC_SHA256(data, checksumKey)
   * với data = "code=<code>&id=<id>&cancel=<cancel>&status=<status>&orderCode=<orderCode>"
   */
  signature: string;
}