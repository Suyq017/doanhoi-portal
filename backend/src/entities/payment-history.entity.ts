import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, CreateDateColumn, UpdateDateColumn } from 'typeorm';
import { PaymentAssignment } from './payment-assignment.entity';

export enum PaymentHistoryStatus {
  PENDING = 'PENDING',
  PAID = 'PAID',
  CANCELLED = 'CANCELLED',
  EXPIRED = 'EXPIRED'
}

@Entity('payment_history')
export class PaymentHistory {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid')
  assignment_id: string;

  @Column('decimal', { precision: 10, scale: 2 })
  amount: number;

  @Column({
    type: 'enum',
    enum: PaymentHistoryStatus,
    default: PaymentHistoryStatus.PENDING
  })
  status: PaymentHistoryStatus;

  @Column('bigint', { unique: true })
  order_code: number;

  @Column('timestamp', { nullable: true })
  paid_at: Date;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;

  // Relations
  @ManyToOne(() => PaymentAssignment, { eager: true })
  @JoinColumn({ name: 'assignment_id' })
  assignment: PaymentAssignment;
}
