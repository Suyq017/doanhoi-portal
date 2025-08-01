import { Injectable, BadRequestException, Logger } from '@nestjs/common';
import PayOS from '@payos/node';
import { PayosConfigService } from './payos-config.service';
import { PayOSConfig, validatePayOSConfig } from '../config/payos.config';

export interface CreatePaymentLinkRequest {
  orderCode: number;
  amount: number;
  description: string;
  organizationId: string;
  buyerName?: string;
  buyerEmail?: string;
  buyerPhone?: string;
  buyerAddress?: string;
  items?: Array<{
    name: string;
    quantity: number;
    price: number;
  }>;
  returnUrl?: string;
  cancelUrl?: string;
  expiredAt?: number;
}

export interface PaymentLinkResponse {
  bin: string;
  accountNumber: string;
  accountName: string;
  amount: number;
  description: string;
  orderCode: number;
  currency: string;
  paymentLinkId: string;
  status: string;
  checkoutUrl: string;
  qrCode: string;
}

export interface PaymentStatusResponse {
  id: string;
  orderCode: number;
  amount: number;
  amountPaid: number;
  amountRemaining: number;
  status: 'PENDING' | 'PROCESSING' | 'PAID' | 'CANCELLED';
  createdAt: string;
  transactions: Array<{
    reference: string;
    amount: number;
    accountNumber: string;
    description: string;
    transactionDateTime: string;
    virtualAccountName?: string;
    virtualAccountNumber?: string;
    counterAccountBankId?: string;
    counterAccountBankName?: string;
    counterAccountName?: string;
    counterAccountNumber?: string;
  }>;
}

@Injectable()
export class PayosService {
  private readonly logger = new Logger(PayosService.name);

  constructor(
    private readonly payosConfigService: PayosConfigService,
  ) {}

  /**
   * Create payment link using PayOS SDK
   */
  async createPaymentLink(request: CreatePaymentLinkRequest): Promise<PaymentLinkResponse> {
    try {
      const payOS = await this.payosConfigService.createPayOSInstance(request.organizationId);
      
      const body = {
        orderCode: request.orderCode,
        amount: request.amount,
        description: request.description,
        items: request.items || [
          {
            name: request.description,
            quantity: 1,
            price: request.amount
          }
        ],
        returnUrl: request.returnUrl || `${process.env.FRONTEND_URL}/payment-result/${request.orderCode}`,
        cancelUrl: request.cancelUrl || `${process.env.FRONTEND_URL}/payment-result/${request.orderCode}`,
      };

      // Add optional buyer information if provided
      if (request.buyerName) body['buyerName'] = request.buyerName;
      if (request.buyerEmail) body['buyerEmail'] = request.buyerEmail;
      if (request.buyerPhone) body['buyerPhone'] = request.buyerPhone;
      if (request.buyerAddress) body['buyerAddress'] = request.buyerAddress;

      this.logger.log(`Creating payment link for order ${request.orderCode}`);
      
      const paymentLinkResponse = await payOS.createPaymentLink(body);
      
      return {
        bin: paymentLinkResponse.bin || '',
        accountNumber: paymentLinkResponse.accountNumber || '',
        accountName: paymentLinkResponse.accountName || '',
        amount: paymentLinkResponse.amount || request.amount,
        description: paymentLinkResponse.description || request.description,
        orderCode: request.orderCode,
        currency: paymentLinkResponse.currency || 'VND',
        paymentLinkId: paymentLinkResponse.paymentLinkId,
        status: paymentLinkResponse.status,
        checkoutUrl: paymentLinkResponse.checkoutUrl,
        qrCode: paymentLinkResponse.qrCode
      };
    } catch (error) {
      this.logger.error('Error creating payment link:', error);
      throw new BadRequestException('Không thể tạo liên kết thanh toán: ' + error.message);
    }
  }

  /**
   * Get payment information by order code
   */
  async getPaymentInfo(orderCode: number, organizationId: string) {
    try {
      const payOS = await this.payosConfigService.createPayOSInstance(organizationId);
      
      this.logger.log(`Getting payment info for order ${orderCode}`);
      
      const paymentInfo = await payOS.getPaymentLinkInformation(orderCode);
      return paymentInfo;
    } catch (error) {
      this.logger.error('Error getting payment info:', error);
      throw new BadRequestException('Không thể lấy thông tin thanh toán: ' + error.message);
    }
  }

  /**
   * Cancel payment link
   */
  async cancelPaymentLink(orderCode: number, organizationId: string, reason?: string) {
    try {
      const payOS = await this.payosConfigService.createPayOSInstance(organizationId);
      
      this.logger.log(`Cancelling payment for order ${orderCode}`);
      
      const result = await payOS.cancelPaymentLink(orderCode, reason);
      return result;
    } catch (error) {
      this.logger.error('Error cancelling payment:', error);
      throw new BadRequestException('Không thể hủy thanh toán: ' + error.message);
    }
  }

  /**
   * Verify webhook data signature
   */
  async verifyWebhookSignature(webhookData: any, organizationId: string): Promise<any> {
    try {
      const payOS = await this.payosConfigService.createPayOSInstance(organizationId);
      
      // PayOS verification returns the verified data if valid, null if invalid
      const verificationResult = payOS.verifyPaymentWebhookData(webhookData);
      
      this.logger.log(`Webhook signature verification result: ${!!verificationResult}`);
      
      return verificationResult;
    } catch (error) {
      this.logger.error('Error verifying webhook signature:', error);
      return null;
    }
  }

  /**
   * Get QR code for payment
   */
  async getPaymentQRCode(orderCode: number, organizationId: string): Promise<string> {
    try {
      const paymentInfo = await this.getPaymentInfo(orderCode, organizationId);
      // PayOS may not have qrCode in response, check if property exists
      return (paymentInfo as any).qrCode || '';
    } catch (error) {
      this.logger.error(`Failed to get QR code for order ${orderCode}:`, error);
      throw new BadRequestException('Không thể lấy mã QR thanh toán');
    }
  }

  /**
   * Check payment status and return formatted response
   */
  async checkPaymentStatus(orderCode: number, organizationId: string): Promise<PaymentStatusResponse> {
    try {
      const payOS = await this.payosConfigService.createPayOSInstance(organizationId);
      
      this.logger.log(`Checking payment status for order ${orderCode}`);
      
      const paymentStatusResponse = await payOS.getPaymentLinkInformation(orderCode);
      
      if (!paymentStatusResponse) {
        throw new BadRequestException('Cannot get payment status');
      }
      
      // Validate and map status to expected values
      const validStatuses: PaymentStatusResponse['status'][] = ['PENDING', 'PROCESSING', 'PAID', 'CANCELLED'];
      const status = validStatuses.includes(paymentStatusResponse.status as any) 
        ? paymentStatusResponse.status as PaymentStatusResponse['status']
        : 'PENDING';
      
      return {
        id: paymentStatusResponse.id || '',
        orderCode: paymentStatusResponse.orderCode,
        amount: paymentStatusResponse.amount,
        amountPaid: paymentStatusResponse.amountPaid || 0,
        amountRemaining: paymentStatusResponse.amountRemaining || paymentStatusResponse.amount,
        status: status,
        createdAt: paymentStatusResponse.createdAt || new Date().toISOString(),
        transactions: paymentStatusResponse.transactions || []
      };
    } catch (error) {
      this.logger.error(`Failed to check payment status for order ${orderCode}:`, error);
      throw new BadRequestException('Không thể kiểm tra trạng thái thanh toán: ' + error.message);
    }
  }

  /**
   * Process webhook data and extract payment information
   */
  async processWebhookData(webhookData: any, organizationId: string): Promise<{
    isValid: boolean;
    orderCode?: number;
    status?: string;
    amount?: number;
    transactionData?: any;
  }> {
    try {
      const verificationResult = await this.verifyWebhookSignature(webhookData, organizationId);
      
      if (!verificationResult) {
        this.logger.warn('Invalid webhook signature received');
        return { isValid: false };
      }

      // verificationResult contains the verified payment data
      const paymentData = verificationResult;
      
      return {
        isValid: true,
        orderCode: paymentData.orderCode,
        status: paymentData.status,
        amount: paymentData.amount,
        transactionData: paymentData
      };
    } catch (error) {
      this.logger.error('Error processing webhook data:', error);
      return { isValid: false };
    }
  }

  /**
   * Generate unique order code
   */
  generateOrderCode(): number {
    // Generate a unique order code using timestamp
    // PayOS requires order codes to be unique across all payments
    return Date.now();
  }

  /**
   * Format amount for PayOS (remove decimals, convert to VND)
   */
  formatAmount(amount: number): number {
    // PayOS requires amount in VND without decimals
    return Math.round(amount);
  }

  /**
   * Validate order code format
   */
  validateOrderCode(orderCode: number): boolean {
    // PayOS order code should be a positive integer
    return Number.isInteger(orderCode) && orderCode > 0;
  }

  /**
   * Check if payment is completed
   */
  isPaymentCompleted(status: string): boolean {
    return status === 'PAID';
  }

  /**
   * Check if payment is pending
   */
  isPaymentPending(status: string): boolean {
    return status === 'PENDING' || status === 'PROCESSING';
  }

  /**
   * Check if payment is cancelled
   */
  isPaymentCancelled(status: string): boolean {
    return status === 'CANCELLED';
  }

  /**
   * Get payment status display text in Vietnamese
   */
  getPaymentStatusText(status: string): string {
    switch (status) {
      case 'PENDING':
        return 'Chờ thanh toán';
      case 'PROCESSING':
        return 'Đang xử lý';
      case 'PAID':
        return 'Đã thanh toán';
      case 'CANCELLED':
        return 'Đã hủy';
      default:
        return 'Không xác định';
    }
  }
}
