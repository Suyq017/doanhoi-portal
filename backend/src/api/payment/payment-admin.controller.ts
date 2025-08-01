import { Controller, Post, Param, HttpException, HttpStatus } from '@nestjs/common';
import { PaymentHistoryService } from '../../payment/services/payment-history.service';
import { PaymentAssignmentService } from '../../payment/services/payment-assignment.service';

@Controller('api/payment-admin')
export class PaymentAdminController {
  constructor(
    private readonly paymentHistoryService: PaymentHistoryService,
    private readonly paymentAssignmentService: PaymentAssignmentService
  ) {}

  /**
   * Manual endpoint để sync lại assignment status từ payment history
   * Chỉ dùng trong trường hợp emergency hoặc data inconsistency
   */
  @Post('sync-assignment-status/:orderCode')
  async syncAssignmentStatus(@Param('orderCode') orderCode: string) {
    try {
      const orderNumber = parseInt(orderCode, 10);
      if (isNaN(orderNumber)) {
        throw new HttpException('Invalid Order Code', HttpStatus.BAD_REQUEST);
      }

      // Lấy payment history
      const paymentHistory = await this.paymentHistoryService.findByOrderCode(orderNumber);
      if (!paymentHistory) {
        throw new HttpException('Payment history not found', HttpStatus.NOT_FOUND);
      }

      // Nếu payment history đã PAID nhưng assignment chưa được mark
      if (paymentHistory.status === 'PAID' && paymentHistory.paid_at) {
        await this.paymentAssignmentService.markAsPaid(paymentHistory.assignment_id);
        
        return {
          success: true,
          message: `Assignment ${paymentHistory.assignment_id} has been marked as paid`,
          data: {
            orderCode: orderNumber,
            assignmentId: paymentHistory.assignment_id,
            paidAt: paymentHistory.paid_at
          }
        };
      }

      return {
        success: false,
        message: 'Payment is not in PAID status or already synced'
      };
    } catch (error) {
      console.error(`Error syncing assignment status for order ${orderCode}:`, error);
      throw new HttpException(
        error.message || 'Failed to sync assignment status', 
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  /**
   * Endpoint để kiểm tra trạng thái sync giữa payment history và assignment
   */
  @Post('check-sync-status/:orderCode')
  async checkSyncStatus(@Param('orderCode') orderCode: string) {
    try {
      const orderNumber = parseInt(orderCode, 10);
      if (isNaN(orderNumber)) {
        throw new HttpException('Invalid Order Code', HttpStatus.BAD_REQUEST);
      }

      const paymentHistory = await this.paymentHistoryService.findByOrderCode(orderNumber);
      if (!paymentHistory) {
        throw new HttpException('Payment history not found', HttpStatus.NOT_FOUND);
      }

      const assignment = paymentHistory.assignment;
      
      return {
        success: true,
        data: {
          orderCode: orderNumber,
          paymentHistory: {
            status: paymentHistory.status,
            paidAt: paymentHistory.paid_at
          },
          assignment: {
            status: assignment?.status,
            paidAt: assignment?.paidAt
          },
          isInSync: paymentHistory.status === 'PAID' ? assignment?.status === 'PAID' : true
        }
      };
    } catch (error) {
      console.error(`Error checking sync status for order ${orderCode}:`, error);
      throw new HttpException(
        error.message || 'Failed to check sync status', 
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  /**
   * Endpoint để kiểm tra xem assignment có thể xóa được không
   */
  @Post('check-can-delete-assignment/:assignmentId')
  async checkCanDeleteAssignment(@Param('assignmentId') assignmentId: string) {
    try {
      const deleteCheck = await this.paymentAssignmentService.canDelete(assignmentId);
      
      return {
        success: true,
        data: deleteCheck
      };
    } catch (error) {
      console.error(`Error checking delete status for assignment ${assignmentId}:`, error);
      throw new HttpException(
        error.message || 'Failed to check delete status', 
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }
}
