import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, CreateDateColumn, UpdateDateColumn } from 'typeorm';
import { PaymentAssignment } from './payment-assignment.entity';

export enum PaymentTransactionStatus {
  PENDING = 'PENDING',
  PAID = 'PAID',
  FAILED = 'FAILED',
  CANCELLED = 'CANCELLED'
}

@Entity('payment_transactions')
export class PaymentTransaction {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'assignment_id' })
  assignmentId: string;

  @ManyToOne(() => PaymentAssignment, assignment => assignment.transactions, { eager: true })
  @JoinColumn({ name: 'assignment_id' })
  assignment: PaymentAssignment;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  amount: number;

  @Column({
    type: 'enum',
    enum: PaymentTransactionStatus,
    default: PaymentTransactionStatus.PENDING
  })
  status: PaymentTransactionStatus;

  @Column({ name: 'payos_order_code', type: 'bigint', unique: true })
  payosOrderCode: number;

  @Column({ name: 'payos_payment_link_id', length: 255, nullable: true })
  payosPaymentLinkId: string;

  @Column({ name: 'checkout_url', type: 'text', nullable: true })
  checkoutUrl: string;

  @Column({ name: 'qr_code', type: 'text', nullable: true })
  qrCode: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ name: 'paid_at', type: 'timestamp', nullable: true })
  paidAt: Date;

  @Column({ name: 'payos_webhook_data', type: 'text', nullable: true })
  payosWebhookData: string;

  @Column({ name: 'signature_verified', type: 'boolean', default: false })
  signatureVerified: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
