import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  UpdateDateColumn,
} from "typeorm";
import { PaymentCampaign } from "./payment-campaign.entity";
import { Organization } from "./organization.entity";
import { User } from "./user.entity";

@Entity("payment_campaign_payos_configs")
export class PaymentCampaignPayosConfig {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @Column({ name: "campaign_id" })
  campaignId: string;

  @ManyToOne(() => PaymentCampaign, { eager: true })
  @JoinColumn({ name: "campaign_id" })
  campaign: PaymentCampaign;

  @Column({ name: "organization_id" })
  organizationId: string;

  @ManyToOne(() => Organization, { eager: true })
  @JoinColumn({ name: "organization_id" })
  organization: Organization;

  @Column({ name: "user_id" })
  userId: string;

  @ManyToOne(() => User, { eager: true })
  @JoinColumn({ name: "user_id" })
  user: User;

  @Column({ name: "client_id", length: 255 })
  clientId: string;

  @Column({ name: "api_key", length: 255 })
  apiKey: string;

  @Column({ name: "checksum_key", length: 255 })
  checksumKey: string;

  @Column({ name: "is_active", type: "boolean", default: true })
  isActive: boolean;

  @CreateDateColumn({ name: "created_at" })
  createdAt: Date;

  @UpdateDateColumn({ name: "updated_at" })
  updatedAt: Date;
}
