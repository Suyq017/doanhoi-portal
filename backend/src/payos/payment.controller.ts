import { Controller, Post, Get, Param, Body, Query, HttpException, HttpStatus } from '@nestjs/common';
import { SimplePayosService } from './payos.service';
import { PaymentHistoryService } from '../payment/services/payment-history.service';

@Controller('api/payment')
export class PaymentController {
  constructor(
    private readonly payosService: SimplePayosService,
    private readonly paymentHistoryService: PaymentHistoryService
  ) {}

  /**
   * API endpoint để tạo link thanh toán.
   * Khi được gọi, sẽ tạo một đơn hàng và chuyển hướng người dùng đến trang checkout của PayOS.
   */
  @Post('create-payment-link')
  async createPaymentLink(@Body() requestBody: any) {
    try {
      const YOUR_DOMAIN = process.env.FRONTEND_URL;
      const orderCode = Number(String(Date.now()).slice(-6));

      // Tạo payment history record trước
      const paymentHistory = await this.paymentHistoryService.createPaymentRecord({
        assignmentId: requestBody.assignmentId,
        amount: requestBody.amount,
        orderCode: orderCode
      });

      const order = {
        amount: requestBody.amount || 20000,
        description: `Thanh toán mã ${orderCode}`,
        orderCode: orderCode,
        returnUrl: `${YOUR_DOMAIN}/payment-result/${orderCode}`,
        cancelUrl: `${YOUR_DOMAIN}/payment-result/${orderCode}`,
        organizationId: requestBody.organizationId
      };

      const paymentLink = await this.payosService.createPaymentLink(order);

      return {
        success: true,
        data: {
          orderCode: orderCode,
          checkoutUrl: paymentLink.checkoutUrl,
          qrCode: paymentLink.qrCode,
          amount: order.amount,
          description: order.description,
          paymentHistoryId: paymentHistory.id
        }
      };
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
      const orderNumber = parseInt(orderCode);
      if (isNaN(orderNumber)) {
        throw new HttpException('Invalid Order Code', HttpStatus.BAD_REQUEST);
      }

      // Lấy payment history từ orderCode
      const paymentHistory = await this.paymentHistoryService.findByOrderCode(orderNumber);
      if (!paymentHistory) {
        throw new HttpException('Payment history not found', HttpStatus.NOT_FOUND);
      }

      // Lấy organizationId từ assignment → campaign → organization
      const organizationId = paymentHistory.assignment?.campaign?.organization?.id;
      if (!organizationId) {
        throw new HttpException('Organization not found for this payment', HttpStatus.NOT_FOUND);
      }

      // Gọi PayOS để check status và cập nhật database
      const paymentInfo = await this.payosService.getPaymentLinkInformation(orderNumber, organizationId);
      return paymentInfo;
    } catch (error) {
      console.error(`Error checking status for order ${orderCode}:`, error);
      throw new HttpException('Order not found or failed to check status', HttpStatus.NOT_FOUND);
    }
  }
}
