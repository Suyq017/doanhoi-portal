import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PaymentHistory, PaymentHistoryStatus } from '../../entities/payment-history.entity';

@Injectable()
export class PaymentHistoryService {
  constructor(
    @InjectRepository(PaymentHistory)
    private paymentHistoryRepository: Repository<PaymentHistory>
  ) {}

  async createPaymentRecord(data: {
    assignmentId: string;
    amount: number;
    orderCode: number;
  }): Promise<PaymentHistory> {
    const paymentHistory = this.paymentHistoryRepository.create({
      assignment_id: data.assignmentId,
      amount: data.amount,
      order_code: data.orderCode,
      status: PaymentHistoryStatus.PENDING
    });

    return await this.paymentHistoryRepository.save(paymentHistory);
  }

  async findByOrderCode(orderCode: number): Promise<PaymentHistory | null> {
    return await this.paymentHistoryRepository.findOne({
      where: { order_code: orderCode },
      relations: ['assignment', 'assignment.campaign', 'assignment.campaign.organization']
    });
  }

  async updatePaymentStatus(
    orderCode: number, 
    status: PaymentHistoryStatus,
    paidAt?: Date
  ): Promise<PaymentHistory> {
    const paymentHistory = await this.findByOrderCode(orderCode);
    if (!paymentHistory) {
      throw new Error('Payment history not found');
    }

    paymentHistory.status = status;
    if (status === PaymentHistoryStatus.PAID && paidAt) {
      paymentHistory.paid_at = paidAt;
    }

    return await this.paymentHistoryRepository.save(paymentHistory);
  }

  async findByAssignmentId(assignmentId: string): Promise<PaymentHistory[]> {
    return await this.paymentHistoryRepository.find({
      where: { assignment_id: assignmentId },
      order: { created_at: 'DESC' }
    });
  }

  async findById(id: string): Promise<PaymentHistory | null> {
    return await this.paymentHistoryRepository.findOne({
      where: { id },
      relations: ['assignment', 'assignment.campaign', 'assignment.campaign.organization']
    });
  }

  async findAll(): Promise<PaymentHistory[]> {
    return await this.paymentHistoryRepository.find({
      relations: ['assignment', 'assignment.campaign', 'assignment.campaign.organization'],
      order: { created_at: 'DESC' }
    });
  }
}
