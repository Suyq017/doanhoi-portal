import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  UpdateDateColumn,
  DeleteDateColumn,
} from "typeorm";
import { User } from "./user.entity";
import { Organization } from "./organization.entity";

export enum LimitConfigStatus {
  ACTIVE = "ACTIVE",
  INACTIVE = "INACTIVE",
  DRAFT = "DRAFT",
}

@Entity("ctxh_limit_config")
export class CtxhLimitConfig {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @Column({ type: "uuid" })
  organization_id: string;

  @Column({
    type: "decimal",
    precision: 5,
    scale: 1,
    default: 50.0,
    comment: "Số ngày CTXH tối đa mà tổ chức có thể cấp trong 1 học kỳ",
  })
  max_days: number;

  @Column({
    type: "enum",
    enum: LimitConfigStatus,
    default: LimitConfigStatus.ACTIVE,
  })
  status: LimitConfigStatus;

  @Column({ type: "text", nullable: true })
  description: string;

  // Audit fields
  @Column({ type: "uuid" })
  created_by: string;

  @CreateDateColumn()
  created_at: Date;

  @Column({ type: "uuid", nullable: true })
  updated_by: string;

  @UpdateDateColumn()
  updated_at: Date;

  @Column({ type: "uuid", nullable: true })
  deleted_by: string;

  @DeleteDateColumn()
  deleted_at: Date;

  // Relations
  @ManyToOne(() => Organization)
  @JoinColumn({ name: "organization_id" })
  organization: Organization;

  @ManyToOne(() => User)
  @JoinColumn({ name: "created_by" })
  creator: User;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: "updated_by" })
  updater: User;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: "deleted_by" })
  deleter: User;
}
