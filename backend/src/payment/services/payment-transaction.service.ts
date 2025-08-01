import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PaymentTransaction, PaymentTransactionStatus } from '../../entities/payment-transaction.entity';
import { PaymentAssignment, PaymentAssignmentStatus } from '../../entities/payment-assignment.entity';
import { CreatePaymentTransactionDto } from '../dto/create-payment-transaction.dto';
import { PayosService } from './payos.service';

@Injectable()
export class PaymentTransactionService {
  private readonly logger = new Logger(PaymentTransactionService.name);

  constructor(
    @InjectRepository(PaymentTransaction)
    private readonly transactionRepository: Repository<PaymentTransaction>,
    @InjectRepository(PaymentAssignment)
    private readonly assignmentRepository: Repository<PaymentAssignment>,
    private readonly payosService: PayosService,
  ) {}

  /**
   * Create payment transaction with PayOS integration
   */
  async create(createDto: CreatePaymentTransactionDto): Promise<PaymentTransaction> {
    // Verify assignment exists and is pending
    const assignment = await this.assignmentRepository.findOne({
      where: { id: createDto.assignmentId },
      relations: ['campaign', 'campaign.organization', 'user']
    });

    if (!assignment) {
      throw new NotFoundException('Payment assignment not found');
    }

    if (assignment.status !== PaymentAssignmentStatus.PENDING) {
      throw new BadRequestException('Payment assignment is not in pending status');
    }

    // Check if there's already a pending transaction for this assignment
    const existingTransaction = await this.transactionRepository.findOne({
      where: { 
        assignmentId: createDto.assignmentId,
        status: PaymentTransactionStatus.PENDING
      }
    });

    if (existingTransaction) {
      throw new BadRequestException('There is already a pending transaction for this assignment');
    }

    // Generate unique order code
    const orderCode = this.payosService.generateOrderCode();
    const formattedAmount = this.payosService.formatAmount(createDto.amount);

    // Create transaction record first
    const transaction = this.transactionRepository.create({
      assignmentId: createDto.assignmentId,
      amount: createDto.amount,
      payosOrderCode: orderCode,
      description: createDto.description || `Payment for ${assignment.campaign.name}`,
      status: PaymentTransactionStatus.PENDING
    });

    const savedTransaction = await this.transactionRepository.save(transaction);

    try {
      // Create payment link with PayOS
      const paymentLinkResponse = await this.payosService.createPaymentLink({
        orderCode,
        amount: formattedAmount,
        description: savedTransaction.description,
        organizationId: assignment.campaign.organizationId,
        returnUrl: createDto.returnUrl,
        cancelUrl: createDto.cancelUrl
      });

      // Update transaction with PayOS response
      savedTransaction.payosPaymentLinkId = paymentLinkResponse.paymentLinkId;
      savedTransaction.checkoutUrl = paymentLinkResponse.checkoutUrl;
      savedTransaction.qrCode = paymentLinkResponse.qrCode;

      await this.transactionRepository.save(savedTransaction);

      this.logger.log(`Created payment transaction ${savedTransaction.id} with PayOS order code ${orderCode}`);

      return savedTransaction;
    } catch (error) {
      // If PayOS integration fails, mark transaction as failed
      savedTransaction.status = PaymentTransactionStatus.FAILED;
      await this.transactionRepository.save(savedTransaction);
      
      this.logger.error(`Failed to create PayOS payment link for transaction ${savedTransaction.id}:`, error);
      throw new BadRequestException('Failed to create payment link: ' + error.message);
    }
  }

  /**
   * Get transaction by ID
   */
  async findOne(id: string): Promise<PaymentTransaction> {
    const transaction = await this.transactionRepository.findOne({
      where: { id },
      relations: ['assignment', 'assignment.campaign', 'assignment.user']
    });

    if (!transaction) {
      throw new NotFoundException('Transaction not found');
    }

    return transaction;
  }

  /**
   * Get transaction by order code
   */
  async findByOrderCode(orderCode: number): Promise<PaymentTransaction | null> {
    const transaction = await this.transactionRepository.findOne({
      where: { payosOrderCode: orderCode },
      relations: ['assignment', 'assignment.campaign', 'assignment.user']
    });

    return transaction; // Return null if not found instead of throwing
  }

  /**
   * Check payment status via PayOS
   */
  async checkPaymentStatus(orderCode: number): Promise<any> {
    const transaction = await this.findByOrderCode(orderCode);
    
    if (!transaction) {
      throw new NotFoundException('Transaction not found');
    }
    
    try {
      const paymentInfo = await this.payosService.getPaymentInfo(
        orderCode, 
        transaction.assignment.campaign.organizationId
      );

      // Update transaction status based on PayOS response
      let newStatus = transaction.status;
      
      switch (paymentInfo.status) {
        case 'PAID':
          newStatus = PaymentTransactionStatus.PAID;
          transaction.paidAt = new Date();
          
          // Update assignment status to paid
          await this.assignmentRepository.update(
            transaction.assignmentId,
            { 
              status: PaymentAssignmentStatus.PAID,
              paidAt: new Date()
            }
          );
          break;
        case 'CANCELLED':
          newStatus = PaymentTransactionStatus.CANCELLED;
          break;
        case 'FAILED':
          newStatus = PaymentTransactionStatus.FAILED;
          break;
      }

      if (newStatus !== transaction.status) {
        transaction.status = newStatus;
        await this.transactionRepository.save(transaction);
      }

      return {
        transaction,
        payosInfo: paymentInfo
      };
    } catch (error) {
      this.logger.error(`Failed to check payment status for order ${orderCode}:`, error);
      throw new BadRequestException('Failed to check payment status: ' + error.message);
    }
  }

  /**
   * Cancel payment transaction
   */
  async cancel(orderCode: number, reason?: string): Promise<PaymentTransaction> {
    const transaction = await this.findByOrderCode(orderCode);

    if (!transaction) {
      throw new NotFoundException('Transaction not found');
    }

    if (transaction.status !== PaymentTransactionStatus.PENDING) {
      throw new BadRequestException('Only pending transactions can be cancelled');
    }

    try {
      // Cancel payment link in PayOS
      await this.payosService.cancelPaymentLink(
        orderCode,
        transaction.assignment.campaign.organizationId,
        reason
      );

      // Update transaction status
      transaction.status = PaymentTransactionStatus.CANCELLED;
      await this.transactionRepository.save(transaction);

      this.logger.log(`Cancelled payment transaction ${transaction.id} with order code ${orderCode}`);

      return transaction;
    } catch (error) {
      this.logger.error(`Failed to cancel payment for order ${orderCode}:`, error);
      throw new BadRequestException('Failed to cancel payment: ' + error.message);
    }
  }

  /**
   * Process webhook from PayOS
   */
  async processWebhook(webhookData: any): Promise<void> {
    try {
      const { orderCode, status, amount } = webhookData.data;
      
      // Find transaction by order code
      const transaction = await this.findByOrderCode(orderCode);
      
      if (!transaction) {
        this.logger.warn(`Webhook received for unknown order code: ${orderCode}`);
        return;
      }
      
      // Verify webhook signature
      const isValidSignature = await this.payosService.verifyWebhookSignature(
        webhookData,
        transaction.assignment.campaign.organizationId
      );

      if (!isValidSignature) {
        this.logger.error(`Invalid webhook signature for order ${orderCode}`);
        throw new BadRequestException('Invalid webhook signature');
      }

      // Store webhook data
      transaction.payosWebhookData = JSON.stringify(webhookData);
      transaction.signatureVerified = isValidSignature;

      // Update transaction status
      switch (status) {
        case 'PAID':
          transaction.status = PaymentTransactionStatus.PAID;
          transaction.paidAt = new Date();
          
          // Update assignment status
          await this.assignmentRepository.update(
            transaction.assignmentId,
            {
              status: PaymentAssignmentStatus.PAID,
              paidAt: new Date()
            }
          );
          break;
        case 'CANCELLED':
          transaction.status = PaymentTransactionStatus.CANCELLED;
          break;
        case 'FAILED':
          transaction.status = PaymentTransactionStatus.FAILED;
          break;
      }

      await this.transactionRepository.save(transaction);

      this.logger.log(`Processed webhook for order ${orderCode}, status: ${status}`);
    } catch (error) {
      this.logger.error('Error processing webhook:', error);
      throw error;
    }
  }

  /**
   * Get transactions by assignment
   */
  async findByAssignment(assignmentId: string): Promise<PaymentTransaction[]> {
    return this.transactionRepository.find({
      where: { assignmentId },
      order: { createdAt: 'DESC' }
    });
  }

  /**
   * Get transaction statistics
   */
  async getStatistics(campaignId?: string, organizationId?: string) {
    const queryBuilder = this.transactionRepository
      .createQueryBuilder('transaction')
      .leftJoin('transaction.assignment', 'assignment')
      .leftJoin('assignment.campaign', 'campaign');

    if (campaignId) {
      queryBuilder.where('campaign.id = :campaignId', { campaignId });
    }

    if (organizationId) {
      queryBuilder.andWhere('campaign.organization_id = :organizationId', { organizationId });
    }

    const stats = await queryBuilder
      .select([
        'COUNT(transaction.id) as totalTransactions',
        'COUNT(CASE WHEN transaction.status = \'PAID\' THEN 1 END) as paidCount',
        'COUNT(CASE WHEN transaction.status = \'PENDING\' THEN 1 END) as pendingCount',
        'COUNT(CASE WHEN transaction.status = \'FAILED\' THEN 1 END) as failedCount',
        'COUNT(CASE WHEN transaction.status = \'CANCELLED\' THEN 1 END) as cancelledCount',
        'SUM(CASE WHEN transaction.status = \'PAID\' THEN transaction.amount END) as totalAmount',
        'AVG(CASE WHEN transaction.status = \'PAID\' THEN transaction.amount END) as averageAmount'
      ])
      .getRawOne();

    return {
      totalTransactions: parseInt(stats.totalTransactions) || 0,
      paidCount: parseInt(stats.paidCount) || 0,
      pendingCount: parseInt(stats.pendingCount) || 0,
      failedCount: parseInt(stats.failedCount) || 0,
      cancelledCount: parseInt(stats.cancelledCount) || 0,
      totalAmount: parseFloat(stats.totalAmount) || 0,
      averageAmount: parseFloat(stats.averageAmount) || 0,
      successRate: stats.totalTransactions > 0 ? (stats.paidCount / stats.totalTransactions) * 100 : 0
    };
  }

  /**
   * Update payment status based on PayOS response
   */
  async updatePaymentStatus(transactionId: string, payosStatus: string, payosData: any): Promise<PaymentTransaction> {
    const transaction = await this.findOne(transactionId);
    
    // Map PayOS status to our internal status
    let newStatus = transaction.status;
    let shouldUpdateAssignment = false;
    
    switch (payosStatus) {
      case 'PAID':
        newStatus = PaymentTransactionStatus.PAID;
        transaction.paidAt = new Date();
        shouldUpdateAssignment = true;
        break;
      case 'CANCELLED':
        newStatus = PaymentTransactionStatus.CANCELLED;
        break;
      case 'FAILED':
        newStatus = PaymentTransactionStatus.FAILED;
        break;
      default:
        // Keep current status if unknown
        break;
    }

    // Update transaction if status changed
    if (newStatus !== transaction.status) {
      transaction.status = newStatus;
      transaction.payosWebhookData = JSON.stringify(payosData);
      await this.transactionRepository.save(transaction);

      // Update assignment status if payment is successful
      if (shouldUpdateAssignment) {
        await this.assignmentRepository.update(
          transaction.assignmentId,
          { 
            status: PaymentAssignmentStatus.PAID,
            paidAt: new Date()
          }
        );
        
        this.logger.log(`Updated assignment ${transaction.assignmentId} status to PAID`);
      }

      this.logger.log(`Updated transaction ${transaction.id} status from ${transaction.status} to ${newStatus}`);
    }

    return transaction;
  }

  /**
   * Update order status from webhook
   */
  async updateOrderStatus(orderCode: number, updateData: Partial<PaymentTransaction>): Promise<PaymentTransaction> {
    const transaction = await this.findByOrderCode(orderCode);
    
    if (!transaction) {
      throw new NotFoundException('Transaction not found');
    }
    
    // Update transaction with new data
    Object.assign(transaction, updateData);
    await this.transactionRepository.save(transaction);

    // If status is PAID, update assignment as well
    if (updateData.status === PaymentTransactionStatus.PAID) {
      await this.assignmentRepository.update(
        transaction.assignmentId,
        {
          status: PaymentAssignmentStatus.PAID,
          paidAt: new Date()
        }
      );
    }

    this.logger.log(`Updated transaction ${transaction.id} status to ${updateData.status}`);
    return transaction;
  }
}
