import {
  Controller,
  Get,
  Post,
  Patch,
  Param,
  Body,
  Query,
  HttpCode,
  HttpStatus,
  Headers,
  Logger
} from '@nestjs/common';
import { PaymentTransactionService } from './services/payment-transaction.service';
import { CreatePaymentTransactionDto } from './dto/create-payment-transaction.dto';

@Controller('payment/transactions')
export class PaymentTransactionController {
  private readonly logger = new Logger(PaymentTransactionController.name);

  constructor(
    private readonly transactionService: PaymentTransactionService
  ) {}

  /**
   * Create new payment transaction
   * POST /payment/transactions
   */
  @Post()
  async create(@Body() createDto: CreatePaymentTransactionDto) {
    this.logger.log(`Creating payment transaction for assignment ${createDto.assignmentId}`);
    
    const transaction = await this.transactionService.create(createDto);
    
    return {
      success: true,
      message: 'Payment transaction created successfully',
      data: transaction
    };
  }

  /**
   * Get transaction by ID
   * GET /payment/transactions/:id
   */
  @Get(':id')
  async findOne(@Param('id') id: string) {
    const transaction = await this.transactionService.findOne(id);
    
    return {
      success: true,
      data: transaction
    };
  }

  /**
   * Get transaction by order code
   * GET /payment/transactions/order/:orderCode
   */
  @Get('order/:orderCode')
  async findByOrderCode(@Param('orderCode') orderCode: string) {
    const transaction = await this.transactionService.findByOrderCode(Number(orderCode));
    
    return {
      success: true,
      data: transaction
    };
  }

  /**
   * Check payment status via PayOS
   * GET /payment/transactions/:orderCode/status
   */
  @Get(':orderCode/status')
  async checkStatus(@Param('orderCode') orderCode: string) {
    const result = await this.transactionService.checkPaymentStatus(Number(orderCode));
    
    return {
      success: true,
      message: 'Payment status checked successfully',
      data: result
    };
  }

  /**
   * Cancel payment transaction
   * PATCH /payment/transactions/:orderCode/cancel
   */
  @Patch(':orderCode/cancel')
  async cancel(
    @Param('orderCode') orderCode: string,
    @Body('reason') reason?: string
  ) {
    this.logger.log(`Cancelling payment transaction with order code ${orderCode}`);
    
    const transaction = await this.transactionService.cancel(Number(orderCode), reason);
    
    return {
      success: true,
      message: 'Payment transaction cancelled successfully',
      data: transaction
    };
  }

  /**
   * Get transactions by assignment
   * GET /payment/transactions/assignment/:assignmentId
   */
  @Get('assignment/:assignmentId')
  async findByAssignment(@Param('assignmentId') assignmentId: string) {
    const transactions = await this.transactionService.findByAssignment(assignmentId);
    
    return {
      success: true,
      data: transactions
    };
  }

  /**
   * Get transaction statistics
   * GET /payment/transactions/statistics
   */
  @Get('statistics')
  async getStatistics(
    @Query('campaignId') campaignId?: string,
    @Query('organizationId') organizationId?: string
  ) {
    const stats = await this.transactionService.getStatistics(campaignId, organizationId);
    
    return {
      success: true,
      data: stats
    };
  }

  /**
   * PayOS webhook endpoint
   * POST /payment/transactions/webhook
   */
  @Post('webhook')
  @HttpCode(HttpStatus.OK)
  async webhook(
    @Body() webhookData: any,
    @Headers('x-payos-signature') signature: string
  ) {
    this.logger.log('Received PayOS webhook');
    
    try {
      await this.transactionService.processWebhook(webhookData);
      
      return {
        success: true,
        message: 'Webhook processed successfully'
      };
    } catch (error) {
      this.logger.error('Error processing webhook:', error);
      
      return {
        success: false,
        message: 'Webhook processing failed',
        error: error.message
      };
    }
  }
}
