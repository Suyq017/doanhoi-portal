import { 
  Controller, 
  Post, 
  Body, 
  HttpCode, 
  HttpStatus,
  BadRequestException,
  Logger,
  Headers,
  Param
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { PayosService } from '../services/payos.service';
import { PaymentTransactionService } from '../services/payment-transaction.service';
import { PaymentAssignmentService } from '../services/payment-assignment.service';

export interface PayOSWebhookData {
  code: string;
  desc: string;
  success: boolean;
  data: {
    orderCode: number;
    amount: number;
    description: string;
    accountNumber: string;
    reference: string;
    transactionDateTime: string;
    currency: string;
    paymentLinkId: string;
    code: string;
    desc: string;
    counterAccountBankId?: string;
    counterAccountBankName?: string;
    counterAccountName?: string;
    counterAccountNumber?: string;
    virtualAccountName?: string;
    virtualAccountNumber?: string;
  };
  signature: string;
}

@ApiTags('Payment Webhooks')
@Controller('webhooks')
export class PaymentWebhookController {
  private readonly logger = new Logger(PaymentWebhookController.name);

  constructor(
    private readonly payosService: PayosService,
    private readonly paymentTransactionService: PaymentTransactionService,
    private readonly paymentAssignmentService: PaymentAssignmentService,
  ) {}

  @Post('payos')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Handle PayOS payment webhook' })
  @ApiResponse({ status: 200, description: 'Webhook processed successfully' })
  @ApiResponse({ status: 400, description: 'Invalid webhook data' })
  async handlePayOSWebhook(
    @Body() webhookData: PayOSWebhookData,
    @Headers() headers: Record<string, string>
  ) {
    this.logger.log('Received PayOS webhook', JSON.stringify(webhookData, null, 2));

    try {
      // Get transaction from database to determine organization
      const orderCode = webhookData.data?.orderCode;
      if (!orderCode) {
        throw new BadRequestException('Missing order code in webhook data');
      }

      const transaction = await this.paymentTransactionService.findByOrderCode(orderCode);
      if (!transaction) {
        this.logger.warn(`Transaction not found for order code: ${orderCode}`);
        throw new BadRequestException('Transaction not found');
      }

      // Get organization ID from transaction
      const assignment = await this.paymentAssignmentService.findOne(transaction.assignmentId);
      if (!assignment) {
        this.logger.warn(`Assignment not found for transaction: ${transaction.id}`);
        throw new BadRequestException('Assignment not found');
      }

      const organizationId = assignment.campaign.organizationId;

      // Process webhook with organization-specific PayOS config
      const result = await this.payosService.processWebhookData(webhookData, organizationId);

      if (!result.isValid) {
        this.logger.warn('Invalid webhook signature');
        throw new BadRequestException('Invalid webhook signature');
      }

      // Update transaction status
      const updateData: any = {
        status: this.mapPayOSStatusToTransactionStatus(result.status),
        payosWebhookData: JSON.stringify(webhookData),
        signatureVerified: true
      };

      if (result.status === 'PAID') {
        updateData.paidAt = new Date();
      }

      await this.paymentTransactionService.updateOrderStatus(orderCode, updateData);

      // No need to update assignment separately - updateOrderStatus handles it

      this.logger.log(`Successfully processed webhook for order ${orderCode}`);

      return {
        success: true,
        message: 'Webhook processed successfully',
        data: {
          orderCode: result.orderCode,
          status: result.status,
          processedAt: new Date().toISOString()
        }
      };

    } catch (error) {
      this.logger.error(`Webhook processing failed: ${error.message}`, error.stack);
      
      // Don't throw error to PayOS - acknowledge receipt but log the issue
      return {
        success: false,
        message: error.message,
        error: 'Webhook processing failed'
      };
    }
  }

  @Post('payos/:organizationId')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Handle PayOS payment webhook for specific organization' })
  @ApiResponse({ status: 200, description: 'Webhook processed successfully' })
  @ApiResponse({ status: 400, description: 'Invalid webhook data' })
  async handlePayOSWebhookForOrganization(
    @Param('organizationId') organizationId: string,
    @Body() webhookData: PayOSWebhookData,
    @Headers() headers: Record<string, string>
  ) {
    this.logger.log(`Received PayOS webhook for organization ${organizationId}`, JSON.stringify(webhookData, null, 2));

    try {
      // Process webhook with specific organization PayOS config
      const result = await this.payosService.processWebhookData(webhookData, organizationId);

      if (!result.isValid) {
        this.logger.warn('Invalid webhook signature');
        throw new BadRequestException('Invalid webhook signature');
      }

      const orderCode = result.orderCode;
      if (!orderCode) {
        throw new BadRequestException('Missing order code in webhook data');
      }

      // Find and update transaction
      const transaction = await this.paymentTransactionService.findByOrderCode(orderCode);
      if (!transaction) {
        this.logger.warn(`Transaction not found for order code: ${orderCode}`);
        throw new BadRequestException('Transaction not found');
      }

      // Update transaction status
      const updateData: any = {
        status: this.mapPayOSStatusToTransactionStatus(result.status),
        payos_webhook_data: JSON.stringify(webhookData),
        signatureVerified: true
      };

      if (result.status === 'PAID') {
        updateData.paidAt = new Date();
      }

      await this.paymentTransactionService.updateOrderStatus(orderCode, updateData);

      // Update assignment status if payment is completed
      if (result.status === 'PAID') {
        const assignment = await this.paymentAssignmentService.findOne(transaction.assignmentId);
        if (assignment) {
          // Assignment will be updated automatically by updateOrderStatus
          this.logger.log(`Assignment ${assignment.id} marked as paid via updateOrderStatus`);
        }
      }

      this.logger.log(`Successfully processed webhook for organization ${organizationId}, order ${orderCode}`);

      return {
        success: true,
        message: 'Webhook processed successfully',
        data: {
          organizationId,
          orderCode: result.orderCode,
          status: result.status,
          amount: result.amount,
          processedAt: new Date().toISOString()
        }
      };

    } catch (error) {
      this.logger.error(`Webhook processing failed for organization ${organizationId}: ${error.message}`, error.stack);
      
      // Don't throw error to PayOS - acknowledge receipt but log the issue
      return {
        success: false,
        message: error.message,
        error: 'Webhook processing failed'
      };
    }
  }

  @Post('payos/test')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Test PayOS webhook endpoint' })
  @ApiResponse({ status: 200, description: 'Test webhook received' })
  async testWebhook(@Body() testData: any) {
    this.logger.log('Received test webhook', JSON.stringify(testData, null, 2));

    return {
      success: true,
      message: 'Test webhook received successfully',
      data: {
        receivedAt: new Date().toISOString(),
        testData
      }
    };
  }

  /**
   * Map PayOS status to internal transaction status
   */
  private mapPayOSStatusToTransactionStatus(payosStatus: string): string {
    switch (payosStatus?.toUpperCase()) {
      case 'PAID':
        return 'PAID';
      case 'PENDING':
        return 'PENDING';
      case 'PROCESSING':
        return 'PENDING';
      case 'CANCELLED':
        return 'CANCELLED';
      case 'FAILED':
        return 'FAILED';
      default:
        return 'PENDING';
    }
  }

  /**
   * Validate webhook request headers
   */
  private validateWebhookHeaders(headers: Record<string, string>): boolean {
    // Add any specific header validation if required by PayOS
    return true;
  }

  /**
   * Log webhook statistics
   */
  private logWebhookStats(orderCode: number, status: string, amount: number): void {
    this.logger.log(`Webhook Stats - Order: ${orderCode}, Status: ${status}, Amount: ${amount}`);
  }
}
