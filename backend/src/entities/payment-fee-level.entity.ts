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
import { PaymentCampaign } from "./payment-campaign.entity";
import { PaymentAssignment } from "./payment-assignment.entity";

@Entity("payment_fee_levels")
export class PaymentFeeLevel {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @Column({ name: "campaign_id" })
  campaignId: string;

  @ManyToOne(() => PaymentCampaign, (campaign) => campaign.feeLevels, {
    onDelete: "CASCADE",
  })
  @JoinColumn({ name: "campaign_id" })
  campaign: PaymentCampaign;

  @Column({ name: "level_name", length: 255 })
  levelName: string;

  @Column({ type: "int" })
  amount: number;

  @Column({ type: "text", nullable: true })
  description: string;

  @OneToMany(() => PaymentAssignment, (assignment) => assignment.feeLevel)
  assignments: PaymentAssignment[];

  @CreateDateColumn({ name: "created_at" })
  createdAt: Date;

  @UpdateDateColumn({ name: "updated_at" })
  updatedAt: Date;
}
