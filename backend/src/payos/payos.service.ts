import { Injectable } from '@nestjs/common';
import { PayosConfigService } from '../payment/services/payos-config.service';
import { PaymentHistoryService } from '../payment/services/payment-history.service';
import { PaymentAssignmentService } from '../payment/services/payment-assignment.service';
import { PaymentHistoryStatus } from '../entities/payment-history.entity';
import PayOS = require('@payos/node');

@Injectable()
export class SimplePayosService {

  constructor(
    private payosConfigService: PayosConfigService,
    private paymentHistoryService: PaymentHistoryService,
    private paymentAssignmentService: PaymentAssignmentService
  ) {}

  /**
   * Gọi SDK để tạo link thanh toán mới.
   * @param orderData - Đối tượng chứa thông tin đơn hàng (amount, description, orderCode, returnUrl, cancelUrl, organizationId).
   * @returns Promise chứa đối tượng link thanh toán từ PayOS.
   */
  async createPaymentLink(orderData: any) {
    // Lấy config từ database theo organizationId
    const config = await this.payosConfigService.getEffectiveConfig(orderData.organizationId);
    
    // Tạo PayOS instance với config động từ database
    const payos = new PayOS(
      config.clientId,
      config.apiKey,
      config.checksumKey
    );
    // Xóa organizationId khỏi orderData trước khi gửi đến PayOS
    // const { organizationId, ...payosOrderData } = orderData;
    
    return payos.createPaymentLink(orderData);
  }

  /**
   * Gọi SDK để lấy thông tin của một link thanh toán đã tạo và cập nhật trạng thái.
   * @param orderCode - Mã đơn hàng cần kiểm tra.
   * @param organizationId - ID tổ chức để lấy config PayOS.
   * @returns Promise chứa thông tin chi tiết của link thanh toán.
   */
  async getPaymentLinkInformation(orderCode: number, organizationId: string) {
    try {
      // Lấy config từ database theo organizationId
      const config = await this.payosConfigService.getEffectiveConfig(organizationId);
      
      // Tạo PayOS instance với config động từ database
      const payos = new PayOS(
        config.clientId,
        config.apiKey,
        config.checksumKey
      );

      // Lấy thông tin thanh toán từ PayOS
      const paymentLinkInfo = await payos.getPaymentLinkInformation(orderCode);
      
      // Lấy payment history từ database
      const paymentHistory = await this.paymentHistoryService.findByOrderCode(orderCode);
      if (!paymentHistory) {
        throw new Error('Payment history not found');
      }

      // Cập nhật status nếu có thay đổi từ PayOS
      if (paymentHistory.status !== paymentLinkInfo.status) {
        let paidAt: Date | undefined;
        
        if (paymentLinkInfo.status === 'PAID' && paymentLinkInfo.transactions?.length > 0) {
          paidAt = new Date(paymentLinkInfo.transactions[0].transactionDateTime);
          
          // Cập nhật assignment status thành PAID
          await this.updateAssignmentOnPaymentSuccess(paymentHistory.assignment_id, paidAt);
        }

        // Map PayOS status to our enum
        let mappedStatus: PaymentHistoryStatus;
        switch (paymentLinkInfo.status) {
          case 'PAID':
            mappedStatus = PaymentHistoryStatus.PAID;
            break;
          case 'CANCELLED':
            mappedStatus = PaymentHistoryStatus.CANCELLED;
            break;
          case 'EXPIRED':
            mappedStatus = PaymentHistoryStatus.EXPIRED;
            break;
          default:
            mappedStatus = PaymentHistoryStatus.PENDING;
        }

        // Cập nhật payment history
        await this.paymentHistoryService.updatePaymentStatus(
          orderCode, 
          mappedStatus,
          paidAt
        );
      }

      return {
        success: true,
        data: {
          ...paymentLinkInfo,
          paymentHistoryId: paymentHistory.id,
          assignmentId: paymentHistory.assignment_id
        }
      };
    } catch (error) {
      console.error('Error getting payment link information:', error);
      return {
        success: false,
        message: error.message || 'Failed to get payment information'
      };
    }
  }

  /**
   * Private method để cập nhật assignment status khi thanh toán thành công
   */
  private async updateAssignmentOnPaymentSuccess(assignmentId: string, paidAt: Date): Promise<void> {
    try {
      await this.paymentAssignmentService.markAsPaid(assignmentId);
    } catch (error) {
      console.error(`❌ Failed to mark assignment ${assignmentId} as paid:`, error.message);
      // Log error nhưng không throw để không block việc cập nhật payment history
      // Trong trường hợp này, payment history vẫn được cập nhật nhưng assignment status có thể cần được xử lý thủ công
    }
  }
}
