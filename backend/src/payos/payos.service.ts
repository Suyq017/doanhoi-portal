import { Injectable } from "@nestjs/common";
import { PaymentCampaignPayosConfigService } from "../payment/services/payment-campaign-payos-config.service";
import { PaymentHistoryService } from "../payment/services/payment-history.service";
import { PaymentAssignmentService } from "../payment/services/payment-assignment.service";
import { PaymentHistoryStatus } from "../entities/payment-history.entity";
import PayOS = require("@payos/node");

@Injectable()
export class SimplePayosService {
  constructor(
    private payosConfigService: PaymentCampaignPayosConfigService,
    private paymentHistoryService: PaymentHistoryService,
    private paymentAssignmentService: PaymentAssignmentService,
  ) { }

  /**
   * Get PayOS configuration for a campaign
   * @param campaignId - Campaign ID to get config for
   * @returns PayOS configuration
   */
  async getPayOSConfig(campaignId: string) {
    return await this.payosConfigService.getEffectiveConfig(campaignId);
  }

  /**
   * Gọi SDK để tạo link thanh toán mới.
   * @param orderData - Đối tượng chứa thông tin đơn hàng (amount, description, orderCode, returnUrl, cancelUrl, campaignId).
   * @returns Promise chứa đối tượng link thanh toán từ PayOS.
   */
  async createPaymentLink(orderData: any) {
    try {
      // Lấy config từ database theo campaignId với fallback hierarchy
      const config = await this.payosConfigService.getEffectiveConfig(
        orderData.campaignId,
      );

      // Tạo PayOS instance với config động từ database
      const payos = new PayOS(
        config.clientId,
        config.apiKey,
        config.checksumKey,
      );
      // Xóa campaignId khỏi orderData trước khi gửi đến PayOS
      const { campaignId: _campaignId, ...payosOrderData } = orderData;
      return payos.createPaymentLink(payosOrderData);
    } catch (error) {
      console.error(
        `❌ createPaymentLink failed for campaignId ${orderData.campaignId}:`,
        error.message,
      );
      throw error;
    }
  }

  /**
   * Gọi SDK để lấy thông tin của một link thanh toán đã tạo và cập nhật trạng thái.
   * @param orderCode - Mã đơn hàng cần kiểm tra.
   * @param campaignId - ID campaign để lấy config PayOS.
   * @returns Promise chứa thông tin chi tiết của link thanh toán.
   */
  async getPaymentLinkInformation(orderCode: number, campaignId: string) {
    try {
      // Lấy config từ database theo campaignId với fallback hierarchy
      const config =
        await this.payosConfigService.getEffectiveConfig(campaignId);

      // Tạo PayOS instance với config động từ database
      const payos = new PayOS(
        config.clientId,
        config.apiKey,
        config.checksumKey,
      );

      // Lấy thông tin thanh toán từ PayOS
      const paymentLinkInfo = await payos.getPaymentLinkInformation(orderCode);

      // Lấy payment history từ database
      const paymentHistory =
        await this.paymentHistoryService.findByOrderCode(orderCode);
      if (!paymentHistory) {
        throw new Error("Payment history not found");
      }

      // Cập nhật status nếu có thay đổi từ PayOS
      if (paymentHistory.status !== paymentLinkInfo.status) {
        let paidAt: Date | undefined;

        if (
          paymentLinkInfo.status === "PAID" &&
          paymentLinkInfo.transactions?.length > 0
        ) {
          paidAt = new Date(
            paymentLinkInfo.transactions[0].transactionDateTime,
          );

          // Cập nhật assignment status thành PAID
          await this.updateAssignmentOnPaymentSuccess(
            paymentHistory.assignment_id,
            paidAt,
          );
        }

        // Map PayOS status to our enum
        let mappedStatus: PaymentHistoryStatus;
        switch (paymentLinkInfo.status) {
          case "PAID":
            break;
          case "CANCELLED":
            mappedStatus = PaymentHistoryStatus.CANCELLED;
            break;
          case "EXPIRED":
            mappedStatus = PaymentHistoryStatus.EXPIRED;
            break;
          default:
            mappedStatus = PaymentHistoryStatus.PENDING;
        }

        // Cập nhật payment history
        await this.paymentHistoryService.updatePaymentStatus(
          orderCode,
          mappedStatus,
          paidAt,
        );
      }

      return {
        success: true,
        data: {
          ...paymentLinkInfo,
          paymentHistoryId: paymentHistory.id,
          assignmentId: paymentHistory.assignment_id,
        },
      };
    } catch (error) {
      console.error(
        `❌ getPaymentLinkInformation failed for orderCode ${orderCode}, campaignId ${campaignId}:`,
        error.message,
      );
      return {
        success: false,
        message: error.message || "Failed to get payment information",
      };
    }
  }

  /**
   * Xử lý webhook payload từ PayOS.
   * Xác thực chữ ký bằng credentials được lưu trong payment_history (per-campaign isolation),
   * sau đó cập nhật trạng thái thanh toán nếu thành công.
   * @param body - Raw request body nhận từ PayOS webhook
   */
  async processWebhookPayload(body: any): Promise<void> {
    const orderCode = Number(body?.data?.orderCode);
    if (!orderCode || isNaN(orderCode)) {
      throw new Error('Invalid webhook payload: missing or invalid orderCode');
    }

    // Lấy payment_history để dùng credentials đã lưu (tránh query config table)
    const paymentHistory =
      await this.paymentHistoryService.findByOrderCode(orderCode);
    if (!paymentHistory) {
      throw new Error(`No payment history found for orderCode: ${orderCode}`);
    }

    // Tạo PayOS instance với credentials của campaign cụ thể này
    const payos = new PayOS(
      paymentHistory.client_id,
      paymentHistory.api_key,
      paymentHistory.checksum_key,
    );

    // verifyPaymentWebhookData throw nếu signature không hợp lệ
    const webhookData = payos.verifyPaymentWebhookData(body);

    // Idempotency: bỏ qua nếu đã PAID
    if (paymentHistory.status === PaymentHistoryStatus.PAID) {
      return;
    }

    // Chỉ xử lý khi thanh toán thành công
    if (body.success === true && body.code === '00') {
      const paidAt = webhookData?.transactionDateTime
        ? new Date(webhookData.transactionDateTime)
        : new Date();

      await this.updateAssignmentOnPaymentSuccess(
        paymentHistory.assignment_id,
        paidAt,
      );
      await this.paymentHistoryService.updatePaymentStatus(
        orderCode,
        PaymentHistoryStatus.PAID,
        paidAt,
      );
    }
  }

  /**
   * Private method để cập nhật assignment status khi thanh toán thành công
   */
  private async updateAssignmentOnPaymentSuccess(
    assignmentId: string,
    _paidAt: Date,
  ): Promise<void> {
    try {
      await this.paymentAssignmentService.markAsPaid(assignmentId, true);
    } catch (error) {
      console.error(
        `❌ Failed to mark assignment ${assignmentId} as paid:`,
        error.message,
      );
      // Log error nhưng không throw để không block việc cập nhật payment history
      // Trong trường hợp này, payment history vẫn được cập nhật nhưng assignment status có thể cần được xử lý thủ công
    }
  }
}
