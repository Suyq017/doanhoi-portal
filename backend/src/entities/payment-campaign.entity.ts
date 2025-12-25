import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  OneToMany,
  JoinColumn,
  CreateDateColumn,
  UpdateDateColumn,
} from "typeorm";
import { Organization } from "./organization.entity";
import { User } from "./user.entity";
import { PaymentFeeLevel } from "./payment-fee-level.entity";
import { PaymentAssignment } from "./payment-assignment.entity";

export enum PaymentCampaignStatus {
  DRAFT = "DRAFT",
  ACTIVE = "ACTIVE",
  COMPLETED = "COMPLETED",
  CANCELLED = "CANCELLED",
}

@Entity("payment_campaigns")
export class PaymentCampaign {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @Column({ name: "organization_id" })
  organizationId: string;

  @ManyToOne(() => Organization, { eager: true })
  @JoinColumn({ name: "organization_id" })
  organization: Organization;

  @Column({ length: 255 })
  name: string;

  @Column({ type: "text", nullable: true })
  description: string;

  @Column({ name: "start_date", type: "timestamp", nullable: true })
  startDate: Date;

  @Column({ name: "end_date", type: "timestamp", nullable: true })
  endDate: Date;

  @Column({
    type: "enum",
    enum: PaymentCampaignStatus,
    default: PaymentCampaignStatus.DRAFT,
  })
  status: PaymentCampaignStatus;

  @Column({ name: "created_by" })
  createdById: string;

  @ManyToOne(() => User, { eager: true })
  @JoinColumn({ name: "created_by" })
  createdByUser: User;

  @OneToMany(() => PaymentFeeLevel, (feeLevel) => feeLevel.campaign, {
    cascade: true,
  })
  feeLevels: PaymentFeeLevel[];

  @OneToMany(() => PaymentAssignment, (assignment) => assignment.campaign, {
    cascade: true,
  })
  assignments: PaymentAssignment[];

  @CreateDateColumn({ name: "created_at" })
  createdAt: Date;

  @UpdateDateColumn({ name: "updated_at" })
  updatedAt: Date;
}
