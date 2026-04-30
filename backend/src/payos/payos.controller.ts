import {
  Controller,
  Post,
  Get,
  Param,
  Body,
  HttpException,
  HttpStatus,
} from "@nestjs/common";
import { SimplePayosService } from "./payos.service";
import { PaymentHistoryService } from "../payment/services/payment-history.service";

@Controller("payment")
export class PayOSController {
  constructor(
    private readonly payosService: SimplePayosService,
    private readonly paymentHistoryService: PaymentHistoryService,
  ) { }

  /**
   * API endpoint để tạo link thanh toán.
   * Khi được gọi, sẽ tạo một đơn hàng và chuyển hướng người dùng đến trang checkout của PayOS.
   */
  @Post("create-payment-link")
  async createPaymentLink(@Body() requestBody: any) {
    try {
      const YOUR_DOMAIN = process.env.FRONTEND_URL;
      const orderCode = Math.floor(Math.random() * 900000) + 100000;

      // Lấy PayOS config để lưu vào payment history
      const config = await this.payosService.getPayOSConfig(
        requestBody.campaignId,
      );

      // Tạo payment history record trước
      const paymentHistory =
        await this.paymentHistoryService.createPaymentRecord({
          assignmentId: requestBody.assignmentId,
          amount: requestBody.amount,
          orderCode: orderCode,
          clientId: config.clientId,
          apiKey: config.apiKey,
          checksumKey: config.checksumKey,
        });

      const order = {
        amount: requestBody.amount,
        description: `Thanh toan ma ${orderCode}`,
        orderCode: orderCode,
        returnUrl: `${YOUR_DOMAIN}/portal/payment-result/${orderCode}`,
        cancelUrl: `${YOUR_DOMAIN}/portal/payment-result/${orderCode}`,
        campaignId: requestBody.campaignId
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
          paymentHistoryId: paymentHistory.id,
        },
      };
    } catch (error) {
      console.error("Error creating payment link:", error);
      throw new HttpException(
        "Failed to create payment link",
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * API endpoint để kiểm tra trạng thái thanh toán của một đơn hàng.
   * @param orderCode - Mã đơn hàng được truyền qua URL parameter.
   * @returns Đối tượng JSON chứa thông tin trạng thái của đơn hàng.
   */
  @Get("check-status/:orderCode")
  async checkPaymentStatus(@Param("orderCode") orderCode: string) {
    try {
      const orderNumber = parseInt(orderCode);
      if (isNaN(orderNumber)) {
        throw new HttpException("Invalid Order Code", HttpStatus.BAD_REQUEST);
      }

      // Lấy payment history từ orderCode
      const paymentHistory =
        await this.paymentHistoryService.findByOrderCode(orderNumber);
      if (!paymentHistory) {
        console.error(
          `❌ Payment history not found for orderCode: ${orderCode}`,
        );
        throw new HttpException(
          "Payment history not found",
          HttpStatus.NOT_FOUND,
        );
      }

      // Lấy campaignId từ assignment → campaign
      const campaignId = paymentHistory.assignment?.campaign?.id;
      if (!campaignId) {
        console.error(
          `❌ Campaign not found for payment history. Assignment: ${paymentHistory.assignment ? "exists" : "null"}, Campaign: ${paymentHistory.assignment?.campaign ? "exists" : "null"}`,
        );
        throw new HttpException(
          "Campaign not found for this payment",
          HttpStatus.NOT_FOUND,
        );
      }

      // Gọi PayOS để check status và cập nhật database (sử dụng effective config với fallback)
      const paymentInfo = await this.payosService.getPaymentLinkInformation(
        orderNumber,
        campaignId,
      );
      return paymentInfo;
    } catch (error) {
      console.error(
        `❌ Error checking status for order ${orderCode}:`,
        error.message,
      );
      throw new HttpException(
        "Order not found or failed to check status",
        HttpStatus.NOT_FOUND,
      );
    }
  }

  /**
   * Webhook endpoint được PayOS gọi sau khi thanh toán hoàn tất.
   * Endpoint này không cần xác thực JWT — chữ ký trong payload đóng vai trò xác thực.
   * PayOS yêu cầu response HTTP 200; nếu không nhận được, PayOS sẽ retry.
   */
  @Post("webhook")
  async handleWebhook(@Body() body: any) {
    try {
      await this.payosService.processWebhookPayload(body);
      console.log(
        `✅ Webhook processed successfully for orderCode: ${body?.data?.orderCode}`,
      );
    } catch (error) {
      const isSignatureError =
        error.message?.includes("signature") ||
        error.message?.includes("SIGNATURE") ||
        error.message?.includes("integrity") ||
        error.message?.includes("INTEGRITY");

      if (isSignatureError) {
        console.warn(`⚠️ Invalid webhook signature: ${error.message}`);
        throw new HttpException(
          "Invalid webhook signature",
          HttpStatus.BAD_REQUEST,
        );
      }

      // Lỗi không phải signature (DB, logic) → log nhưng vẫn trả 200
      // để PayOS không retry vô hạn với cùng payload hợp lệ
      console.error(
        `❌ Webhook processing error (non-signature): ${error.message}`,
      );
    }
    return { success: true };
  }
}
