import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, CreateDateColumn, UpdateDateColumn } from 'typeorm';
import { PaymentCampaign } from './payment-campaign.entity';
import { PaymentFeeLevel } from './payment-fee-level.entity';
import { User } from './user.entity';

export enum PaymentAssignmentStatus {
  PENDING = 'PENDING',
  PAID = 'PAID',
  OVERDUE = 'OVERDUE',
  EXEMPTED = 'EXEMPTED'
}

@Entity('payment_assignments')
export class PaymentAssignment {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'campaign_id' })
  campaignId: string;

  @ManyToOne(() => PaymentCampaign, campaign => campaign.assignments, { eager: true })
  @JoinColumn({ name: 'campaign_id' })
  campaign: PaymentCampaign;

  @Column({ name: 'user_id' })
  userId: string;

  @ManyToOne(() => User, { eager: true })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column({ name: 'fee_level_id', nullable: true })
  feeLevelId: string;

  @ManyToOne(() => PaymentFeeLevel, feeLevel => feeLevel.assignments, { eager: true })
  @JoinColumn({ name: 'fee_level_id' })
  feeLevel: PaymentFeeLevel;

  @Column({ name: 'custom_amount', type: 'decimal', precision: 10, scale: 2, nullable: true })
  customAmount: number;

  @Column({ type: 'text', nullable: true })
  note: string;

  @Column({
    type: 'enum',
    enum: PaymentAssignmentStatus,
    default: PaymentAssignmentStatus.PENDING
  })
  status: PaymentAssignmentStatus;

  @Column({ name: 'due_date', type: 'timestamp', nullable: true })
  dueDate: Date;

  @Column({ name: 'assigned_at', type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  assignedAt: Date;

  @Column({ name: 'paid_at', type: 'timestamp', nullable: true })
  paidAt: Date;

  @Column({ name: 'assigned_by' })
  assignedById: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'assigned_by' })
  assignedByUser: User;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
